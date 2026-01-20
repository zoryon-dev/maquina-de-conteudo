/**
 * Instagram & Facebook OAuth Callback Endpoint
 *
 * Handles the OAuth callback from Meta.
 * Exchanges authorization code for access token and stores connection.
 *
 * Flow:
 * 1. Receive authorization code from Meta
 * 2. Exchange code for short-lived token
 * 3. Exchange short-lived token for long-lived token (60 days)
 * 4. Get user/page info
 * 5. Store connection in database
 * 6. Redirect to settings page
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { socialConnections } from "@/db/schema"
import { eq } from "drizzle-orm"
import { SocialPlatform, SocialConnectionStatus } from "@/lib/social/types"

// Environment variables
const META_APP_ID = process.env.META_APP_ID
const META_APP_SECRET = process.env.META_APP_SECRET
const META_REDIRECT_URI = process.env.META_REDIRECT_URI

/**
 * GET /api/social/callback
 *
 * Query params:
 * - code: Authorization code from Meta
 * - state: CSRF protection state (format: {uuid}_{platform})
 * - error: Error code if user denied
 *
 * Redirects to /settings?tab=social after processing
 */
export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!META_APP_ID || !META_APP_SECRET || !META_REDIRECT_URI) {
    return new Response("Meta OAuth not configured", { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Handle user denial
  if (error) {
    const errorMessage =
      error === "access_denied"
        ? "Você negou o acesso à conta"
        : `Erro no OAuth: ${error}`

    return NextResponse.redirect(
      new URL(`/settings?tab=social&error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  if (!code || !state) {
    return new Response("Missing required parameters", { status: 400 })
  }

  // Extract platform from state
  const platform = state.split("_").pop()

  try {
    if (platform === "instagram") {
      await handleInstagramCallback(userId, code)
    } else if (platform === "facebook") {
      await handleFacebookCallback(userId, code)
    } else {
      throw new Error("Invalid platform in state")
    }

    // Success - redirect to settings
    return NextResponse.redirect(
      new URL("/settings?tab=social&success=1", request.url)
    )
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Erro ao conectar conta"

    return NextResponse.redirect(
      new URL(`/settings?tab=social&error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}

/**
 * Handle Instagram OAuth callback
 *
 * Flow:
 * 1. Exchange code for short-lived token
 * 2. Exchange for long-lived token (60 days)
 * 3. Get Instagram Business Account info
 * 4. Store connection
 */
async function handleInstagramCallback(userId: string, code: string) {
  // Step 1: Exchange code for short-lived token
  const tokenResponse = await fetch(
    `https://api.instagram.com/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: META_APP_ID!,
        client_secret: META_APP_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: META_REDIRECT_URI!,
        code,
      }),
    }
  )

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(tokenData.error?.message || "Failed to get access token")
  }

  const shortLivedToken = tokenData.access_token
  const igUserId = tokenData.user_id

  // Step 2: Exchange short-lived token for long-lived token (60 days)
  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${META_APP_SECRET}&access_token=${shortLivedToken}`
  )

  const longLivedData = await longLivedResponse.json()

  if (longLivedData.error) {
    throw new Error(
      longLivedData.error?.message || "Failed to exchange for long-lived token"
    )
  }

  const longLivedToken = longLivedData.access_token
  const expiresInSeconds = longLivedData.expires_in // ~60 days

  // Step 3: Get Instagram Business Account info
  // First get user's Instagram Business Accounts
  const accountsResponse = await fetch(
    `https://graph.instagram.com/${igUserId}?fields=id,username,account_type,media_count&access_token=${longLivedToken}`
  )

  const accountsData = await accountsResponse.json()

  if (accountsData.error) {
    throw new Error(
      accountsData.error?.message || "Failed to get account info"
    )
  }

  const username = accountsData.username
  const accountId = accountsData.id // This is the IG User ID (use as account_id)

  // Calculate token expiration
  const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000)

  // Step 4: Store or update connection
  await upsertConnection({
    userId,
    platform: SocialPlatform.INSTAGRAM,
    accountId,
    accountName: username,
    accountUsername: username,
    accessToken: longLivedToken,
    tokenExpiresAt,
    status: SocialConnectionStatus.ACTIVE,
    metadata: {
      igUserId,
      permissions: ["instagram_business_basic", "instagram_business_content_publish"],
    },
  })
}

/**
 * Handle Facebook OAuth callback
 *
 * Flow:
 * 1. Exchange code for user access token
 * 2. Get user's managed pages
 * 3. Get page access token for each page
 * 4. Store connections for each page
 */
async function handleFacebookCallback(userId: string, code: string) {
  // Step 1: Exchange code for user access token
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?` +
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
    `https://graph.facebook.com/v22.0/me/accounts?access_token=${userAccessToken}`
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

  // Step 3 & 4: Store connection for each page
  // In production, you might want to let user select which page(s)
  for (const page of pages) {
    const pageAccessToken = page.access_token
    const pageId = page.id
    const pageName = page.name

    // Get page info
    const pageResponse = await fetch(
      `https://graph.facebook.com/v22.0/${pageId}?fields=name,username,picture&access_token=${pageAccessToken}`
    )

    const pageInfo = await pageResponse.json()

    const accountUsername = pageInfo.username || pageId

    // Calculate token expiration (page access tokens don't expire unless refreshed)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days default

    await upsertConnection({
      userId,
      platform: SocialPlatform.FACEBOOK,
      accountId: pageId,
      accountName: pageName,
      accountUsername,
      accessToken: pageAccessToken,
      tokenExpiresAt,
      status: SocialConnectionStatus.ACTIVE,
      metadata: {
        pageId,
        permissions: page.tasks || ["pages_manage_posts"],
      },
    })
  }
}

/**
 * Upsert social connection
 *
 * Updates existing connection or creates new one.
 * One connection per platform per user.
 */
async function upsertConnection(data: {
  userId: string
  platform: SocialPlatform
  accountId: string
  accountName: string
  accountUsername: string
  accessToken: string
  tokenExpiresAt: Date
  status: SocialConnectionStatus
  metadata: Record<string, unknown>
}) {
  // Check for existing connection
  const existing = await db
    .select()
    .from(socialConnections)
    .where(
      eq(socialConnections.userId, data.userId)
    )

  // Filter by platform (since we can't use multiple eq in Drizzle yet)
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
        status: data.status,
        metadata: data.metadata as any,
        lastVerifiedAt: now,
        updatedAt: now,
        deletedAt: null, // Restore if soft-deleted
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
      status: data.status,
      metadata: data.metadata as any,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }
}
