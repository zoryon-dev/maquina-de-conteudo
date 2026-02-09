/**
 * Social Media Token Refresh Cron Endpoint
 *
 * Refreshes long-lived Meta user tokens and updates Page Access Tokens
 * for Instagram connections to avoid disconnects.
 *
 * Recommended schedule: Daily
 *
 * Environment variables:
 * - CRON_SECRET: Secret to authenticate cron calls
 * - META_APP_ID: Meta App ID
 * - META_APP_SECRET: Meta App Secret
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { socialConnections } from "@/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import type { SocialConnectionMetadata } from "@/lib/social/types"
import { safeDecrypt, encryptToken } from "@/lib/encryption"

const CRON_SECRET = process.env.CRON_SECRET

const META_API_VERSION = "v21.0"
const META_GRAPH_API_URL = `https://graph.facebook.com/${META_API_VERSION}`

const REFRESH_WINDOW_DAYS = 7

async function refreshUserToken(userToken: string) {
  const META_APP_ID = process.env.META_APP_ID
  const META_APP_SECRET = process.env.META_APP_SECRET

  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error("Meta OAuth not configured")
  }

  const response = await fetch(
    `${META_GRAPH_API_URL}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: userToken,
      })
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error?.message || "Failed to refresh user token")
  }

  return {
    accessToken: data.access_token as string,
    expiresIn: (data.expires_in as number) || 5184000,
  }
}

async function fetchPageAccessToken(userToken: string, pageId?: string | null) {
  if (!pageId) return null

  const response = await fetch(
    `${META_GRAPH_API_URL}/me/accounts?fields=id,access_token&access_token=${userToken}`
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error?.message || "Failed to fetch page access token")
  }

  const page = (data.data || []).find((item: any) => item.id === pageId)
  return page?.access_token || null
}

function shouldRefreshToken(userTokenExpiresAt?: string | null) {
  if (!userTokenExpiresAt) return true
  const expiresAt = new Date(userTokenExpiresAt)
  const threshold = new Date(Date.now() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return expiresAt <= threshold
}

async function handleRefresh() {
  const connections = await db
    .select()
    .from(socialConnections)
    .where(
      and(
        eq(socialConnections.platform, "instagram"),
        eq(socialConnections.status, "active"),
        isNull(socialConnections.deletedAt)
      )
    )

  const results = {
    processed: connections.length,
    refreshed: 0,
    updatedPageTokens: 0,
    skipped: 0,
    errors: [] as Array<{ connectionId: number; error: string }>,
  }

  for (const connection of connections) {
    try {
      const metadata = (connection.metadata || {}) as SocialConnectionMetadata
      // Decrypt tokens from DB (handles both encrypted and legacy plaintext)
      const decryptedAccessToken = safeDecrypt(connection.accessToken)
      // Prefer decrypted DB token; fall back to legacy metadata token (being phased out)
      const userToken = decryptedAccessToken || metadata.userAccessToken

      if (!userToken) {
        results.skipped += 1
        continue
      }

      if (!shouldRefreshToken(metadata.userTokenExpiresAt)) {
        results.skipped += 1
        continue
      }

      const refreshed = await refreshUserToken(userToken)
      const userTokenExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000)
      const pageAccessToken = await fetchPageAccessToken(
        refreshed.accessToken,
        connection.pageId
      )

      // Encrypt refreshed tokens before saving
      const encryptedAccessToken = encryptToken(refreshed.accessToken)
      const encryptedPageAccessToken = pageAccessToken
        ? encryptToken(pageAccessToken)
        : connection.pageAccessToken

      const updatedMetadata: SocialConnectionMetadata = {
        ...metadata,
        userTokenExpiresAt: userTokenExpiresAt.toISOString(),
        ...(pageAccessToken
          ? { pageAccessTokenLastFetchedAt: new Date().toISOString() }
          : {}),
      }
      // Remove plaintext token from metadata
      delete (updatedMetadata as any).userAccessToken

      await db
        .update(socialConnections)
        .set({
          accessToken: encryptedAccessToken,
          tokenExpiresAt: userTokenExpiresAt,
          pageAccessToken: encryptedPageAccessToken,
          metadata: updatedMetadata as any,
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, connection.id))

      results.refreshed += 1
      if (pageAccessToken) results.updatedPageTokens += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.errors.push({ connectionId: connection.id, error: message })
    }
  }

  return results
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = authHeader?.replace("Bearer ", "")

  const { searchParams } = new URL(request.url)
  const host = request.headers.get("host") || ""
  const isLocalhost =
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  const testMode =
    searchParams.get("test") === "true" &&
    process.env.NODE_ENV === "development" &&
    isLocalhost

  if ((!CRON_SECRET || secret !== CRON_SECRET) && !testMode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await handleRefresh()
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error("Cron social refresh error:", error)
    return NextResponse.json(
      { error: "Cron processing failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = authHeader?.replace("Bearer ", "")

  const { searchParams } = new URL(request.url)
  const host = request.headers.get("host") || ""
  const isLocalhost =
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  const testMode =
    searchParams.get("test") === "true" &&
    process.env.NODE_ENV === "development" &&
    isLocalhost

  if ((!CRON_SECRET || secret !== CRON_SECRET) && !testMode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await handleRefresh()
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error("Cron social refresh error:", error)
    return NextResponse.json(
      { error: "Cron processing failed" },
      { status: 500 }
    )
  }
}
