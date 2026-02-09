/**
 * Save Selected Social Connection Endpoint
 *
 * After the OAuth callback returns a session_id, the user selects which
 * page/account to connect. This endpoint saves that selection.
 *
 * Environment variables required:
 * - META_APP_ID: Meta App ID
 * - META_APP_SECRET: Meta App Secret
 * - META_REDIRECT_URI: OAuth redirect URI
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { socialConnections, oauthSessions } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import { SocialPlatform, SocialConnectionStatus } from "@/lib/social/types"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { encryptToken } from "@/lib/encryption"

/**
 * Page data structure from OAuth session
 */
interface PageWithInstagramData {
  pageId: string
  pageName: string
  username?: string
  picture?: string
  pageAccessToken: string
  instagramBusinessAccount: {
    id: string
    username: string
    followersCount: number
    mediaCount: number
  }
}

interface FacebookPageData {
  pageId: string
  pageName: string
  username?: string
  picture?: string
  category?: string
  pageAccessToken: string
}

// Meta Graph API version
const META_API_VERSION = "v21.0"
const META_GRAPH_API_URL = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * POST /api/social/save-connection
 *
 * Request body:
 * - platform: "instagram" | "facebook"
 * - sessionId: OAuth session ID from callback
 * - pageId: Facebook Page ID to connect
 * - selectionIndex: Index of selected page in the list (alternative to pageId)
 *
 * Flow:
 * 1. Get OAuth session from database using sessionId
 * 2. Validate session expiration and ownership
 * 3. Find selected page/account
 * 4. Save connection to database
 * 5. Delete OAuth session
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in database (handles account recreation scenario)
  const dbUserId = await ensureAuthenticatedUser()

  const body = await request.json()
  const { platform, sessionId, pageId, selectionIndex } = body

  if (platform !== "instagram" && platform !== "facebook") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId é obrigatório. Tente conectar novamente." },
      { status: 400 }
    )
  }

  if (!pageId && typeof selectionIndex !== "number") {
    return NextResponse.json(
      { error: "Either pageId or selectionIndex is required" },
      { status: 400 }
    )
  }

  try {
    if (platform === "instagram") {
      return await saveInstagramConnection(dbUserId, sessionId, pageId, selectionIndex)
    } else {
      return await saveFacebookConnection(dbUserId, sessionId, pageId, selectionIndex)
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Erro ao salvar conexão"

    console.error("[Save Connection] Error:", err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * Save selected Instagram connection
 */
async function saveInstagramConnection(
  userId: string,
  sessionId: string,
  pageId?: string,
  selectionIndex?: number
) {
  // Fetch OAuth session from database
  const sessions = await db
    .select()
    .from(oauthSessions)
    .where(
      and(
        eq(oauthSessions.id, sessionId),
        eq(oauthSessions.userId, userId),
        eq(oauthSessions.platform, "instagram"),
        gt(oauthSessions.expiresAt, new Date()) // Not expired
      )
    )
    .limit(1)

  if (!sessions.length) {
    console.error("[Save Connection] No valid OAuth session found!")
    return NextResponse.json(
      { error: "Sessão OAuth expirada. Tente conectar novamente." },
      { status: 400 }
    )
  }

  const oauthSession = sessions[0]
  const { longLivedToken, tokenExpiresAt, pagesData } = oauthSession
  const pages = (pagesData as { pages: PageWithInstagramData[] }).pages

  // Validate token exists
  if (!longLivedToken) {
    console.error("[Save Connection] No long-lived token in session!")
    return NextResponse.json(
      { error: "Token OAuth não encontrado. Tente conectar novamente." },
      { status: 400 }
    )
  }

  // Find selected page
  let selectedPage: PageWithInstagramData | undefined
  if (pageId) {
    selectedPage = pages.find((p) => p.pageId === pageId)
  } else if (typeof selectionIndex === "number") {
    selectedPage = pages[selectionIndex]
  }

  if (!selectedPage) {
    return NextResponse.json(
      { error: "Página não encontrada na lista de opções" },
      { status: 400 }
    )
  }

  const { pageId: selectedPageId, pageName, pageAccessToken, instagramBusinessAccount } = selectedPage

  // Calculate user token expiration (long-lived user token)
  const userTokenExpiresAt = tokenExpiresAt
    ? new Date(tokenExpiresAt)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  // Encrypt tokens before storage
  const encryptedAccessToken = encryptToken(longLivedToken)
  const encryptedPageAccessToken = pageAccessToken ? encryptToken(pageAccessToken) : undefined

  // Save connection
  await upsertConnection({
    userId,
    platform: SocialPlatform.INSTAGRAM,
    accountId: instagramBusinessAccount.id,
    accountName: `@${instagramBusinessAccount.username}`,
    accountUsername: instagramBusinessAccount.username,
    accessToken: encryptedAccessToken,
    tokenExpiresAt: userTokenExpiresAt,
    pageId: selectedPageId,
    pageAccessToken: encryptedPageAccessToken,
    pageName: pageName,
    status: SocialConnectionStatus.ACTIVE,
    metadata: {
      igUserId: instagramBusinessAccount.id,
      followersCount: instagramBusinessAccount.followersCount,
      mediaCount: instagramBusinessAccount.mediaCount,
      permissions: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
      userTokenExpiresAt: userTokenExpiresAt.toISOString(),
      pageAccessTokenLastFetchedAt: new Date().toISOString(),
    },
  })

  // Delete the OAuth session (cleanup)
  await db.delete(oauthSessions).where(eq(oauthSessions.id, sessionId))

  return NextResponse.json({
    success: true,
    account: {
      username: instagramBusinessAccount.username,
      pageName: pageName,
      followersCount: instagramBusinessAccount.followersCount,
    },
  })
}

/**
 * Save selected Facebook connection
 */
async function saveFacebookConnection(
  userId: string,
  sessionId: string,
  pageId?: string,
  selectionIndex?: number
) {
  // Fetch OAuth session from database
  const sessions = await db
    .select()
    .from(oauthSessions)
    .where(
      and(
        eq(oauthSessions.id, sessionId),
        eq(oauthSessions.userId, userId),
        eq(oauthSessions.platform, "facebook"),
        gt(oauthSessions.expiresAt, new Date()) // Not expired
      )
    )
    .limit(1)

  if (!sessions.length) {
    console.error("[Save Connection] No valid OAuth session found!")
    return NextResponse.json(
      { error: "Sessão OAuth expirada. Tente conectar novamente." },
      { status: 400 }
    )
  }

  const oauthSession = sessions[0]
  const { longLivedToken, pagesData } = oauthSession
  const pages = (pagesData as { pages: FacebookPageData[] }).pages

  // Find selected page
  let selectedPage: FacebookPageData | undefined
  if (pageId) {
    selectedPage = pages.find((p) => p.pageId === pageId)
  } else if (typeof selectionIndex === "number") {
    selectedPage = pages[selectionIndex]
  }

  if (!selectedPage) {
    return NextResponse.json(
      { error: "Página não encontrada na lista de opções" },
      { status: 400 }
    )
  }

  const {
    pageId: selectedPageId,
    pageName,
    username,
    pageAccessToken,
    picture,
  } = selectedPage

  // Encrypt tokens before storage
  const encryptedAccessToken = encryptToken(pageAccessToken)
  const encryptedPageAccessToken = encryptToken(pageAccessToken)

  // Page access tokens don't expire unless revoked
  // Save connection
  await upsertConnection({
    userId,
    platform: SocialPlatform.FACEBOOK,
    accountId: selectedPageId,
    accountName: pageName,
    accountUsername: username || selectedPageId,
    accessToken: encryptedAccessToken,
    tokenExpiresAt: null,
    pageId: selectedPageId,
    pageAccessToken: encryptedPageAccessToken,
    pageName: pageName,
    status: SocialConnectionStatus.ACTIVE,
    metadata: {
      picture,
      permissions: ["pages_manage_posts", "pages_read_engagement"],
      pageAccessTokenLastFetchedAt: new Date().toISOString(),
    },
  })

  // Delete the OAuth session (cleanup)
  await db.delete(oauthSessions).where(eq(oauthSessions.id, sessionId))

  return NextResponse.json({
    success: true,
    account: {
      pageName: pageName,
      username: username,
    },
  })
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
  tokenExpiresAt?: Date | null
  pageId?: string
  pageAccessToken?: string
  pageName?: string
  status: SocialConnectionStatus
  metadata: Record<string, unknown>
}) {
  // Check for existing connection (including soft deleted)
  const existing = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.userId, data.userId))

  // Filter by platform - include soft deleted to handle reconnection
  const existingByPlatform = existing.find(
    (c) => c.platform === data.platform
  )

  const now = new Date()

  if (existingByPlatform) {
    // Update existing connection (reactivate if soft deleted)
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
        deletedAt: null, // Clear soft delete flag
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
