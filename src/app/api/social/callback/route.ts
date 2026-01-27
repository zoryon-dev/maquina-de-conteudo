/**
 * Instagram & Facebook OAuth Callback Endpoint
 *
 * Handles the OAuth callback from Meta (Facebook/Instagram).
 *
 * IMPORTANT: This implementation uses Facebook OAuth Dialog for BOTH platforms
 * because Instagram Business Accounts are linked to Facebook Pages.
 *
 * NEW FLOW (Database Session Storage):
 * 1. Exchange code for short-lived user access token
 * 2. Exchange short-lived for long-lived token (60 days)
 * 3. Get user's Facebook Pages
 * 4. For each page, check if it has an Instagram Business account linked
 * 5. Save OAuth data to database with 15-minute expiration
 * 6. Redirect with session_id in URL (not cookies - they don't work with Next.js redirects)
 * 7. Frontend fetches pages from API using session_id
 * 8. User selects which page/account to connect
 *
 * Environment variables required:
 * - META_APP_ID: Meta App ID
 * - META_APP_SECRET: Meta App Secret
 * - META_REDIRECT_URI: OAuth redirect URI
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { socialConnections, oauthSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { SocialPlatform, SocialConnectionStatus } from "@/lib/social/types"

/**
 * Decoded OAuth state with type narrowing
 */
interface DecodedOAuthState {
  userId: string
  platform: "instagram" | "facebook"
  stateId: string
}

/**
 * Decodes and validates the OAuth state parameter.
 *
 * State format: {userId}:{platform}:{stateId}
 * - userId: Clerk user ID
 * - platform: "instagram" or "facebook"
 * - stateId: Random UUID for CSRF protection
 *
 * @returns Decoded state or null if invalid
 */
function decodeOAuthState(state: string): DecodedOAuthState | null {
  try {
    const stateData = Buffer.from(state, 'base64').toString('utf-8')
    const parts = stateData.split(":")

    if (parts.length !== 3) {
      console.warn("[OAuth] Invalid state format: expected 3 parts")
      return null
    }

    const [userId, platform, stateId] = parts

    if (!userId || !stateId) {
      console.warn("[OAuth] Missing required state fields")
      return null
    }

    // Type guard - valida platform
    if (platform !== "instagram" && platform !== "facebook") {
      console.warn(`[OAuth] Invalid platform: ${platform}`)
      return null
    }

    return { userId, platform, stateId }
  } catch (e) {
    console.error("[OAuth] Failed to decode state:", e)
    return null
  }
}

// Environment variables
const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const META_REDIRECT_URI = process.env.META_REDIRECT_URI

// Meta Graph API version
const META_API_VERSION = "v21.0"
const META_GRAPH_API_URL = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * Identify Meta token type from prefix
 * Reference: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */
function getTokenTypeFromPrefix(prefix: string): string {
  switch (prefix) {
    case "EAA":
    case "EAAB":
      return "User Access Token (Short-lived)"
    case "EAAE":
      return "User Access Token (Long-lived - Current format)"
    case "EAD":
      return "User Access Token (Long-lived - Legacy format)"
    case "EAF":
      return "Page Access Token"
    default:
      return `Unknown token type (prefix: ${prefix})`
  }
}

/**
 * GET /api/social/callback
 *
 * Query params:
 * - code: Authorization code from Meta
 * - state: CSRF protection state (base64 of {userId}:{platform}:{randomUUID})
 * - error: Error code if user denied
 *
 * Response:
 * - On error: Redirects to /settings?tab=social&error=...
 * - On success: Redirects to /settings?tab=social&action=select-{platform}&session_id={uuid}
 *
 * Note: userId is embedded in state parameter (base64 encoded) to handle cases where
 * Clerk session is not available after OAuth redirect (e.g., when using ngrok or
 * different domains).
 *
 * IMPORTANT: We use database sessions instead of cookies because Next.js redirects
 * do NOT send Set-Cookie headers properly (see GitHub Discussion #48434).
 */
/**
 * Helper function to build a redirect URL with the correct protocol
 * In development, always uses HTTP to avoid SSL errors
 */
function buildRedirectUrl(path: string, requestUrl: string): URL {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL_LOCAL

  // Fallback: use localhost with HTTP in development to avoid SSL errors
  if (!baseUrl && process.env.NODE_ENV === "development") {
    baseUrl = "http://localhost:3000"
  } else if (!baseUrl) {
    // Last resort: use the origin from the request, but force HTTP if needed
    const requestOrigin = new URL(requestUrl).origin
    baseUrl = requestOrigin.replace(/^https:/, "http:")
  }

  return new URL(path, baseUrl)
}

export async function GET(request: Request) {
  // Try to get userId from Clerk auth first
  let userId = (await auth()).userId

  const { searchParams } = new URL(request.url)
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Handle user denial
  if (error) {
    const errorMessage =
      error === "access_denied"
        ? "Você negou o acesso à conta"
        : `Erro no OAuth: ${error}`

    return NextResponse.redirect(
      buildRedirectUrl(`/settings?tab=social&error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  const code = searchParams.get("code")

  if (!code || !state) {
    return new Response("Missing required parameters", { status: 400 })
  }

  // Decode and validate OAuth state
  const decodedState = decodeOAuthState(state)

  if (!decodedState) {
    return NextResponse.redirect(
      buildRedirectUrl(`/settings?tab=social&error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`, request.url)
    )
  }

  // Use userId from decoded state if Clerk auth failed
  const finalUserId = userId || decodedState.userId
  const platform = decodedState.platform

  if (!finalUserId) {
    return new Response("Unauthorized: Unable to verify user session", { status: 401 })
  }

  if (!META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) {
    return new Response("Meta OAuth not configured", { status: 500 })
  }

  try {
    if (platform === "instagram") {
      return await handleInstagramCallback(finalUserId, code, request.url)
    } else if (platform === "facebook") {
      return await handleFacebookCallback(finalUserId, code, request.url)
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Erro ao conectar conta"

    return NextResponse.redirect(
      buildRedirectUrl(`/settings?tab=social&error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}

/**
 * Handle Instagram OAuth callback
 *
 * Instagram Business Login flow using Facebook OAuth:
 * 1. Exchange code for short-lived user access token
 * 2. Exchange short-lived for long-lived token (60 days)
 * 3. Get user's Facebook Pages (from 3 sources)
 * 4. For each page, check if it has Instagram Business linked
 * 5. Save OAuth data to database (oauth_sessions table)
 * 6. Redirect with session_id for frontend to fetch pages
 *
 * Sources for Facebook Pages:
 * - /me/accounts - User's personal pages
 * - /me/businesses - Business Manager businesses
 * - /{business_id}/owned_pages - Pages owned by business
 * - /{business_id}/client_pages - Pages managed by business (client pages)
 */
async function handleInstagramCallback(userId: string, code: string, baseUrl: string) {
  // Step 1: Exchange code for short-lived user access token
  const tokenResponse = await fetch(
    `${META_GRAPH_API_URL}/oauth/access_token?` +
      new URLSearchParams({
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        redirect_uri: META_REDIRECT_URI!,
        code,
      })
  )

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(tokenData.error?.message || tokenData.error_description || "Failed to get access token")
  }

  const shortLivedToken = tokenData.access_token

  // DEBUG: Log short-lived token type
  const shortLivedPrefix = shortLivedToken ? shortLivedToken.substring(0, 4) : "EMPTY"
  console.log("[Instagram OAuth] Short-lived token details:", {
    prefix: shortLivedPrefix,
    length: shortLivedToken?.length || 0,
    type: getTokenTypeFromPrefix(shortLivedPrefix),
  })

  const permissions = await fetchUserPermissions(shortLivedToken)
  const hasPagesReadEngagement = permissions.some(
    (permission) =>
      permission.permission === "pages_read_engagement" &&
      permission.status === "granted"
  )

  // Step 2: Get user's Facebook Pages using SHORT-LIVED token
  // IMPORTANT: Must use short-lived token to get page access tokens
  // Long-lived tokens don't include page access tokens anymore (Facebook API change)
  const cacheKey = `${userId}:instagram-pages`
  const cachedPages = pagesCache.get(cacheKey)
  const now = Date.now()

  const pagesWithInstagram = cachedPages && cachedPages.expiresAt > now
    ? cachedPages.pages
    : await fetchAllPagesWithInstagram(shortLivedToken, {
        includeBusinessPages: true,
        includeClientPages: hasPagesReadEngagement,
      })

  if (!cachedPages || cachedPages.expiresAt <= now) {
    pagesCache.set(cacheKey, {
      expiresAt: now + PAGES_CACHE_TTL_MS,
      pages: pagesWithInstagram,
    })
  }

  console.log(`Total pages with Instagram found: ${pagesWithInstagram.length}`)

  if (pagesWithInstagram.length === 0) {
    throw new Error(
      "Nenhuma página com Instagram Business encontrada. " +
      "Você precisa vincular uma conta Instagram Business a uma página do Facebook."
    )
  }

  // Step 3: Exchange short-lived token for long-lived token (60 days)
  // This long-lived token is for future API calls, not for getting page tokens
  const longLivedResponse = await fetch(
    `${META_GRAPH_API_URL}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        fb_exchange_token: shortLivedToken,
      })
  )

  const longLivedData = await longLivedResponse.json()

  if (longLivedData.error) {
    throw new Error(
      longLivedData.error?.message || "Failed to exchange for long-lived token"
    )
  }

  const longLivedToken = longLivedData.access_token
  const expiresInSeconds = longLivedData.expires_in || 5184000 // ~60 days default

  // DEBUG: Log token type based on prefix
  const tokenPrefix = longLivedToken ? longLivedToken.substring(0, 4) : "EMPTY"
  const tokenLength = longLivedToken?.length || 0
  console.log("[Instagram OAuth] Long-lived token details:", {
    prefix: tokenPrefix,
    length: tokenLength,
    type: getTokenTypeFromPrefix(tokenPrefix),
  })

  // Step 4: Store long-lived token temporarily for final connection
  const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000)

  // Step 5: Save OAuth data to database instead of cookie
  // Cookies don't work with NextResponse.redirect() - see GitHub Discussion #48434
  const sessionId = crypto.randomUUID()
  const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  console.log("[Instagram OAuth] Saving session to database:", {
    sessionId,
    userId,
    pagesCount: pagesWithInstagram.length,
    tokenExpiresAt: tokenExpiresAt.toISOString(),
    firstPage: pagesWithInstagram[0] ? {
      pageId: pagesWithInstagram[0].pageId,
      pageName: pagesWithInstagram[0].pageName,
      igUsername: pagesWithInstagram[0].instagramBusinessAccount?.username,
    } : null,
  })

  await db.insert(oauthSessions).values({
    id: sessionId,
    userId,
    platform: "instagram",
    longLivedToken,
    tokenExpiresAt,
    pagesData: { pages: pagesWithInstagram },
    expiresAt: sessionExpiresAt,
  })

  console.log("[Instagram OAuth] Session saved to database:", sessionId)
  console.log("[Instagram OAuth] Token saved in session:", {
    prefix: longLivedToken?.substring(0, 4),
    firstPageAccessTokenPrefix: pagesWithInstagram[0]?.pageAccessToken?.substring(0, 4),
  })

  // Step 6: Redirect with session_id (not pages data in URL)
  // Frontend will fetch pages using the session_id
  const redirectUrl = buildRedirectUrl(
    `/settings?tab=social&action=select-instagram&session_id=${sessionId}`,
    baseUrl
  )
  console.log("[Instagram OAuth] Redirecting to:", redirectUrl.toString())

  return NextResponse.redirect(redirectUrl)
}

/**
 * Handle Facebook OAuth callback
 *
 * Flow:
 * 1. Exchange code for user access token
 * 2. Get user's managed pages
 * 3. Save OAuth data to database (oauth_sessions table)
 * 4. Redirect with session_id for frontend to fetch pages
 */
async function handleFacebookCallback(userId: string, code: string, baseUrl: string) {
  // Step 1: Exchange code for user access token
  const tokenResponse = await fetch(
    `${META_GRAPH_API_URL}/oauth/access_token?` +
      new URLSearchParams({
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        redirect_uri: META_REDIRECT_URI!,
        code,
      })
  )

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(tokenData.error?.message || "Failed to get access token")
  }

  const userAccessToken = tokenData.access_token

  // Step 2: Get user's managed pages
  const pagesResponse = await fetch(
    `${META_GRAPH_API_URL}/me/accounts?access_token=${userAccessToken}`
  )

  const pagesData = await pagesResponse.json()

  if (pagesData.error) {
    throw new Error(
      pagesData.error?.message || "Failed to get managed pages"
    )
  }

  const pages = pagesData.data || []

  if (pages.length === 0) {
    throw new Error("Nenhuma página encontrada. Você precisa gerenciar pelo menos uma página do Facebook.")
  }

  // Step 3: Fetch additional info for each page
  // Filter out pages without valid access tokens first
  const pagesWithValidTokens = pages.filter((page: any) =>
    page.access_token && page.access_token.length >= 10
  )

  if (pagesWithValidTokens.length === 0) {
    throw new Error("Nenhuma página com token válido encontrada. Verifique se você tem permissão de administrador nas páginas.")
  }

  const pagesWithInfo = await Promise.all(
    pagesWithValidTokens.map(async (page: any) => {
      const pageId = page.id
      const pageAccessToken = page.access_token

      // Get page info with picture
      const pageResponse = await fetch(
        `${META_GRAPH_API_URL}/${pageId}?fields=name,username,picture&access_token=${pageAccessToken}`
      )

      const pageInfo = await pageResponse.json()

      return {
        pageId,
        pageName: pageInfo.name || page.name,
        username: pageInfo.username,
        picture: pageInfo.picture?.data?.url,
        pageAccessToken,
        category: pageInfo.category,
      }
    })
  )

  // Step 3: Save OAuth data to database instead of cookie
  // Cookies don't work with NextResponse.redirect() - see GitHub Discussion #48434
  const sessionId = crypto.randomUUID()
  const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  console.log("[Facebook OAuth] Saving session to database:", {
    sessionId,
    userId,
    pagesCount: pagesWithInfo.length,
  })

  await db.insert(oauthSessions).values({
    id: sessionId,
    userId,
    platform: "facebook",
    longLivedToken: userAccessToken,
    pagesData: { pages: pagesWithInfo },
    expiresAt: sessionExpiresAt,
  })

  console.log("[Facebook OAuth] Session saved to database:", sessionId)

  // Step 4: Redirect with session_id (not pages data in URL)
  // Frontend will fetch pages using the session_id
  const redirectUrl = buildRedirectUrl(
    `/settings?tab=social&action=select-facebook&session_id=${sessionId}`,
    baseUrl
  )
  console.log("[Facebook OAuth] Redirecting to:", redirectUrl.toString())

  return NextResponse.redirect(redirectUrl)
}

interface PageFetchOptions {
  includeBusinessPages: boolean
  includeClientPages: boolean
}

interface UserPermission {
  permission: string
  status: "granted" | "declined" | "expired"
}

interface PageFetchResult {
  pages: PageWithInstagram[]
  rateLimited: boolean
}

const PAGES_CACHE_TTL_MS = 10 * 60 * 1000
const pagesCache = new Map<string, { expiresAt: number; pages: PageWithInstagram[] }>()

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJsonWithRetry(url: string, retries = 3, baseDelayMs = 500) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url)
    const data = await response.json()
    if (!data?.error) {
      return data
    }

    if (data.error?.code === 4 && attempt < retries) {
      const delay = baseDelayMs * Math.pow(2, attempt)
      await sleep(delay)
      continue
    }

    return data
  }

  return { error: { message: "Retry exhausted", code: 4 } }
}

async function fetchUserPermissions(accessToken: string): Promise<UserPermission[]> {
  const url = new URL(`${META_GRAPH_API_URL}/me/permissions`)
  url.searchParams.set("access_token", accessToken)
  const data = await fetchJsonWithRetry(url.toString())
  return data?.data || []
}

/**
 * Fetch all Facebook Pages that have Instagram Business accounts linked
 */
async function fetchAllPagesWithInstagram(
  accessToken: string,
  options: PageFetchOptions
): Promise<PageWithInstagram[]> {
  const pagesWithIg: PageWithInstagram[] = []

  // Source 1: User's personal pages (primary source)
  console.log("Fetching personal pages from /me/accounts...")
  const personalPagesResult = await fetchPages(accessToken, "/me/accounts")
  pagesWithIg.push(...personalPagesResult.pages)

  console.log(`Found ${pagesWithIg.length} pages with Instagram from personal pages`)

  if (!options.includeBusinessPages || personalPagesResult.rateLimited) {
    const uniquePages = Array.from(
      new Map(pagesWithIg.map((page) => [page.pageId, page])).values()
    )
    return uniquePages
  }

  try {
    let rateLimited = false
    const businessesResponse = await fetchJsonWithRetry(
      `${META_GRAPH_API_URL}/me/businesses?access_token=${accessToken}&fields=name,id`
    )

    if (!businessesResponse.error && businessesResponse.data) {
      for (const business of businessesResponse.data) {
        const businessId = business.id

        const ownedPagesResult = await fetchPages(
          accessToken,
          `/${businessId}/owned_pages`,
          business.name
        )
        pagesWithIg.push(...ownedPagesResult.pages)
        rateLimited = ownedPagesResult.rateLimited

        if (rateLimited) {
          console.warn("Rate limit hit. Skipping remaining Business Manager pages.")
          break
        }

        if (options.includeClientPages) {
          const clientPagesResult = await fetchPages(
            accessToken,
            `/${businessId}/client_pages`,
            business.name
          )
          pagesWithIg.push(...clientPagesResult.pages)
          rateLimited = clientPagesResult.rateLimited

          if (rateLimited) {
            console.warn("Rate limit hit while fetching client pages. Skipping remaining Business Manager pages.")
            break
          }
        }
      }
    }
  } catch (e) {
    console.warn("Failed to fetch Business Manager pages:", e)
  }

  // Remove duplicates by page ID
  const uniquePages = Array.from(
    new Map(pagesWithIg.map((page) => [page.pageId, page])).values()
  )

  return uniquePages
}

/**
 * Fetch pages from a specific endpoint and filter for Instagram Business
 */
async function fetchPages(
  accessToken: string,
  endpoint: string,
  businessName?: string
): Promise<PageFetchResult> {
  const pagesWithIg: PageWithInstagram[] = []

  const baseUrl = new URL(`${META_GRAPH_API_URL}${endpoint}`)
  baseUrl.searchParams.set("access_token", accessToken)
  baseUrl.searchParams.set(
    "fields",
    endpoint === "/me/accounts"
      ? "id,name,access_token,category,tasks"
      : "id,name,access_token"
  )
  baseUrl.searchParams.set("limit", "50")

  let url = baseUrl.toString()

  while (url) {
    const data = await fetchJsonWithRetry(url)

    if (data.error) {
      console.warn(`Error fetching pages from ${endpoint}:`, data.error)
      if (data.error?.code === 4) {
        return { pages: pagesWithIg, rateLimited: true }
      }
      break
    }

    const pages = data.data || []

    // Debug: Log first page to see what fields are returned
    if (pages.length > 0 && endpoint === "/me/accounts") {
      console.log("Sample page data from /me/accounts:", JSON.stringify(pages[0], null, 2))
    }

    // Check each page for Instagram Business account
    for (const page of pages) {
      const pageId = page.id
      const pageAccessToken = page.access_token

      // Debug: Log token length for first page
      if (endpoint === "/me/accounts" && pageId === "533347516517806") {
        console.log(`Page ${pageId} token:`, pageAccessToken ? `"${pageAccessToken.substring(0, 20)}..." (length: ${pageAccessToken.length})` : "MISSING")
      }

      // Skip pages without valid access token
      if (!pageAccessToken || pageAccessToken === "" || pageAccessToken.length < 10) {
        console.warn(`Skipping page ${pageId}: No valid access token (token=${pageAccessToken ? `"${pageAccessToken.substring(0, 20)}..." (len=${pageAccessToken.length})` : "null/empty"})`)
        continue
      }

      // Get page details with Instagram Business Account
      const pageDetailsResponse = await fetch(
        `${META_GRAPH_API_URL}/${pageId}?` +
          `fields=id,name,username,picture,instagram_business_account{name,username}&` +
          `access_token=${pageAccessToken}`
      )

      const pageDetails = await pageDetailsResponse.json()

      // Debug: Log page details for Voar Digital
      if (pageId === "533347516517806") {
        console.log(`Page ${pageId} details:`, JSON.stringify(pageDetails, null, 2))
      }

      if (pageDetails.error) {
        console.warn(`Error fetching page ${pageId} details:`, pageDetails.error)
        continue
      }

      const igBusinessAccount = pageDetails.instagram_business_account

      // Debug: Log if IG Business Account exists
      if (pageId === "533347516517806") {
        console.log(`Page ${pageId} instagram_business_account:`, igBusinessAccount ? "FOUND" : "NOT FOUND")
      }

      if (igBusinessAccount) {
        // Get IG user ID (different from IG Business Account ID)
        const igUserResponse = await fetch(
          `${META_GRAPH_API_URL}/${igBusinessAccount.id}?` +
          `fields=id,username,followers_count,media_count&` +
          `access_token=${pageAccessToken}`
        )

        const igUserData = await igUserResponse.json()

        // Debug: Log IG user data for Voar Digital
        if (pageId === "533347516517806") {
          console.log(`Page ${pageId} IG user data:`, JSON.stringify(igUserData, null, 2))
        }

        if (igUserData.error) {
          console.warn(`Error fetching IG user data for ${pageId}:`, igUserData.error)
          // Continue anyway - use basic IG Business Account data
        }

        const finalIgData = igUserData.error ? null : igUserData

        pagesWithIg.push({
          pageId: pageDetails.id,
          pageName: pageDetails.name,
          username: pageDetails.username,
          picture: pageDetails.picture?.data?.url,
          pageAccessToken,
          businessName,
          instagramBusinessAccount: {
            id: finalIgData?.id || igBusinessAccount.id,
            username: finalIgData?.username || igBusinessAccount.username,
            followersCount: finalIgData?.followers_count || 0,
            mediaCount: finalIgData?.media_count || 0,
          },
        })

        // Debug: Log successful page addition
        if (pageId === "533347516517806") {
          console.log(`Page ${pageId} (@${igBusinessAccount.username}) ADDED to pagesWithIg`)
        }
      }
    }

    // Check for pagination
    url = data.paging?.next || null
  }

  return { pages: pagesWithIg, rateLimited: false }
}

/**
 * Upsert social connection
 */
async function upsertConnection(data: {
  userId: string
  platform: SocialPlatform
  accountId: string
  accountName: string
  accountUsername: string
  accessToken: string
  tokenExpiresAt?: Date
  pageId?: string
  pageAccessToken?: string
  pageName?: string
  status: SocialConnectionStatus
  metadata: Record<string, unknown>
}) {
  // Check for existing connection
  const existing = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.userId, data.userId))

  // Filter by platform
  const existingByPlatform = existing.find(
    (c) => c.platform === data.platform && c.deletedAt === null
  )

  const now = new Date()

  if (existingByPlatform) {
    // Update existing connection
    await db
      .update(socialConnections)
      .set({
        accountId: data.accountId,
        accountName: data.accountName,
        accountUsername: data.accountUsername,
        accessToken: data.accessToken,
        tokenExpiresAt: data.tokenExpiresAt,
        pageId: data.pageId,
        pageAccessToken: data.pageAccessToken,
        pageName: data.pageName,
        status: data.status,
        metadata: data.metadata as any,
        lastVerifiedAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .where(eq(socialConnections.id, existingByPlatform.id))
  } else {
    // Create new connection
    await db.insert(socialConnections).values({
      userId: data.userId,
      platform: data.platform,
      accountId: data.accountId,
      accountName: data.accountName,
      accountUsername: data.accountUsername,
      accessToken: data.accessToken,
      tokenExpiresAt: data.tokenExpiresAt,
      pageId: data.pageId,
      pageAccessToken: data.pageAccessToken,
      pageName: data.pageName,
      status: data.status,
      metadata: data.metadata as any,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }
}

/**
 * Page with Instagram Business Account
 */
interface PageWithInstagram {
  pageId: string
  pageName: string
  username?: string
  picture?: string
  pageAccessToken: string
  businessName?: string
  instagramBusinessAccount: {
    id: string
    username: string
    followersCount: number
    mediaCount: number
  }
}
