/**
 * Social Media Publish Endpoint
 *
 * Handles publishing content to Instagram and Facebook.
 * Supports both immediate publishing and scheduling.
 *
 * Flow:
 * 1. Validate library item exists and belongs to user
 * 2. Check for active social connection
 * 3. For immediate posts: publish directly via API
 * 4. For scheduled posts: create record and use platform-specific scheduling
 *    - Facebook: Native scheduling via scheduled_publish_time
 *    - Instagram: Server-side scheduling via cron
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { publishedPosts, libraryItems, socialConnections } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { enqueueJob } from "@/lib/queue/client"
import { createJob } from "@/lib/queue/jobs"
import {
  PublishedPostStatus,
  SocialConnectionStatus,
  SocialErrorCode,
  PublishResult,
} from "@/lib/social/types"
import { getInstagramService, getFacebookService } from "@/lib/social/api"
import { SocialMediaType, SocialApiError } from "@/lib/social/types"

/**
 * Check if a connection's token is expired
 */
function isTokenExpired(tokenExpiresAt: Date | null | undefined): boolean {
  if (!tokenExpiresAt) return false
  // Add 1 day buffer before considering expired
  const bufferTime = 24 * 60 * 60 * 1000
  return new Date(tokenExpiresAt).getTime() < Date.now() - bufferTime
}

/**
 * Debug function to check Instagram token permissions and info
 */
async function debugInstagramTokenPermissions(accessToken: string, igAccountId: string) {
  const META_API_VERSION = "v21.0"
  const GRAPH_API_URL = `https://graph.facebook.com/${META_API_VERSION}`
  const META_APP_ID = process.env.META_APP_ID
  const META_APP_SECRET = process.env.META_APP_SECRET

  console.log("[Instagram Debug] Checking token permissions...")

  // Get App Access Token for debug_token endpoint
  const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`

  // 1. Get token info using debug_token endpoint
  try {
    const debugUrl = `${GRAPH_API_URL}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
    const debugResponse = await fetch(debugUrl)
    const debugData = await debugResponse.json()

    console.log("[Instagram Debug] Token debug info:", JSON.stringify(debugData, null, 2))

    if (debugData.data) {
      console.log("[Instagram Debug] Token is valid:", {
        type: debugData.data.type,
        is_valid: debugData.data.is_valid,
        scopes: debugData.data.scopes,
        granular_scopes: debugData.data.granular_scopes,
        expires_at: debugData.data.expires_at,
      })
    }
  } catch (e) {
    console.error("[Instagram Debug] Failed to debug token:", e)
  }

  // 2. Get IG Business Account info
  try {
    const igUrl = `${GRAPH_API_URL}/${igAccountId}?fields=username,account_type,media_count,followers_count&access_token=${accessToken}`
    const igResponse = await fetch(igUrl)
    const igData = await igResponse.json()

    console.log("[Instagram Debug] IG Business Account info:", JSON.stringify(igData, null, 2))
  } catch (e) {
    console.error("[Instagram Debug] Failed to get IG account info:", e)
  }

  // 3. Check content publishing limit
  try {
    const limitUrl = `${GRAPH_API_URL}/${igAccountId}/content_publishing_limit?access_token=${accessToken}`
    const limitResponse = await fetch(limitUrl)
    const limitData = await limitResponse.json()

    console.log("[Instagram Debug] Content publishing limit:", JSON.stringify(limitData, null, 2))
  } catch (e) {
    console.error("[Instagram Debug] Failed to get publishing limit:", e)
  }
}

/**
 * Mark a connection as expired in the database
 */
async function markConnectionExpired(
  connectionId: number
): Promise<void> {
  await db
    .update(socialConnections)
    .set({
      status: SocialConnectionStatus.EXPIRED,
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, connectionId))
}

/**
 * POST /api/social/publish
 *
 * Body:
 * - libraryItemId: ID of the library item to publish
 * - platform: "instagram" | "facebook"
 * - scheduledFor?: ISO date string for scheduling
 * - caption?: Optional caption override
 *
 * Returns:
 * - success: boolean
 * - publishedPostId: ID of the published post record
 * - platformPostId?: ID from platform (for immediate posts)
 * - scheduled: boolean
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Declare outside try block for error handling
  let connection: typeof socialConnections.$inferSelect | null = null
  let platform: "instagram" | "facebook" | null = null

  try {
    const body = await request.json()
    const { libraryItemId, platform: reqPlatform, scheduledFor, caption } = body
    platform = reqPlatform as "instagram" | "facebook" | null

    // Validate required fields
    if (!libraryItemId || !platform) {
      return NextResponse.json(
        { error: "Missing required fields: libraryItemId, platform" },
        { status: 400 }
      )
    }

    if (platform !== "instagram" && platform !== "facebook") {
      return NextResponse.json(
        { error: "Invalid platform. Must be 'instagram' or 'facebook'" },
        { status: 400 }
      )
    }

    // Get library item
    const [libraryItem] = await db
      .select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.id, libraryItemId),
          eq(libraryItems.userId, userId)
        )
      )

    if (!libraryItem) {
      return NextResponse.json(
        { error: "Library item not found" },
        { status: 404 }
      )
    }

    // Parse media URLs
    const mediaUrls: string[] = libraryItem.mediaUrl
      ? JSON.parse(libraryItem.mediaUrl)
      : []

    if (mediaUrls.length === 0) {
      return NextResponse.json(
        { error: "No media URLs found in library item" },
        { status: 400 }
      )
    }

    // Get active connection
    const connectionResult = await db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, platform)
        )
      )

    connection = connectionResult[0] || null

    if (!connection) {
      return NextResponse.json(
        { error: `No active ${platform} connection. Please connect your account first.` },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (isTokenExpired(connection.tokenExpiresAt)) {
      await markConnectionExpired(connection.id)
      return NextResponse.json(
        {
          error: `Sua conexão com ${platform === "instagram" ? "Instagram" : "Facebook"} expirou. Por favor, reconecte sua conta em Configurações > Redes Sociais.`,
          code: "TOKEN_EXPIRED",
        },
        { status: 400 }
      )
    }

    // DEBUG: Log connection details before using
    const accessTokenPrefix = connection.accessToken ? connection.accessToken.substring(0, 4) : "EMPTY"
    const pageAccessTokenPrefix = connection.pageAccessToken ? connection.pageAccessToken.substring(0, 4) : "EMPTY"
    console.log("[Publish] Connection details from database:", {
      accessTokenPrefix,
      accessTokenLength: connection.accessToken?.length || 0,
      pageAccessTokenPrefix,
      pageAccessTokenLength: connection.pageAccessToken?.length || 0,
      accountId: connection.accountId,
      platform: connection.platform,
    })

    // DEBUG: Check token permissions before publishing
    if (platform === "instagram") {
      console.log("[Publish] Checking permissions for USER token (required for Instagram Graph API)")
      await debugInstagramTokenPermissions(connection.accessToken, connection.accountId)
    }

    // Use caption override or fall back to library item content
    const postCaption = caption || libraryItem.content || undefined

    // Handle scheduled publishing
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor)

      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid scheduledFor date" },
          { status: 400 }
        )
      }

      // Create published post record
      const [publishedPost] = await db
        .insert(publishedPosts)
        .values({
          userId,
          libraryItemId,
          platform: platform as "instagram" | "facebook",
          mediaType: libraryItem.type as any,
          caption: postCaption,
          status: PublishedPostStatus.SCHEDULED,
          scheduledFor: scheduledDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      // For Facebook, we can use native scheduling
      if (platform === "facebook") {
        try {
          const service = getFacebookService(
            connection.accessToken,
            connection.accountId
          )

          // Native scheduling via Facebook API
          const result = await service.publishPhoto({
            imageUrl: mediaUrls[0],
            caption: postCaption,
            mediaType: SocialMediaType.IMAGE,
          }, scheduledDate)

          // Update with platform post ID (Facebook returns this immediately)
          await db
            .update(publishedPosts)
            .set({
              platformPostId: result.platformPostId,
              platformPostUrl: result.platformPostUrl,
            })
            .where(eq(publishedPosts.id, publishedPost.id))
        } catch (error) {
          // If Facebook scheduling fails, fall back to server-side scheduling
          console.error("Facebook native scheduling failed, using cron:", error)
          // The cron system will handle this
        }
      }

      // For Instagram, we rely on the cron system (no native scheduling)
      // The cron endpoint will process scheduled posts and enqueue jobs

      return NextResponse.json({
        success: true,
        publishedPostId: publishedPost.id,
        scheduled: true,
        scheduledFor: scheduledDate.toISOString(),
      })
    }

    // Immediate publishing
    let platformPostId: string
    let platformPostUrl: string

    if (platform === "instagram") {
      // Instagram publishing uses Page Access Token for Content Publishing API
      // Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media

      // Use pageAccessToken as the primary token for Instagram publishing
      const tokenToUse = connection.pageAccessToken || connection.accessToken

      console.log("[Publish] Using Instagram publishing token:", {
        hasPageAccessToken: !!connection.pageAccessToken,
        tokenPrefix: tokenToUse?.substring(0, 4),
        accountId: connection.accountId,
        mediaUrlsCount: mediaUrls.length,
      })

      const service = getInstagramService(
        tokenToUse,
        connection.accountId
      )

      // Detect if this is a carousel (multiple images)
      const isCarousel = mediaUrls.length > 1

      let result: PublishResult

      if (isCarousel) {
        console.log("[Publish] Publishing as CAROUSEL with", mediaUrls.length, "images")

        // Convert media URLs to carousel items
        const carouselItems = mediaUrls.map((url) => ({
          imageUrl: url,
          mediaType: SocialMediaType.IMAGE,
        }))

        result = await service.publishPost(
          {
            imageUrl: mediaUrls[0], // First image as reference
            caption: postCaption,
            mediaType: SocialMediaType.IMAGE,
          },
          true, // isCarousel
          carouselItems
        )
      } else {
        console.log("[Publish] Publishing as SINGLE image")

        result = await service.publishPost({
          imageUrl: mediaUrls[0],
          caption: postCaption,
          mediaType: SocialMediaType.IMAGE,
        })
      }

      platformPostId = typeof result === "string" ? result : result.platformPostId
      platformPostUrl = typeof result === "string"
        ? `https://www.instagram.com/p/${result}/`
        : result.platformPostUrl
    } else {
      // Facebook publishing
      const service = getFacebookService(
        connection.accessToken,
        connection.accountId
      )
      const result = await service.publishPhoto({
        imageUrl: mediaUrls[0],
        caption: postCaption,
        mediaType: SocialMediaType.IMAGE,
      })

      platformPostId = result.platformPostId
      platformPostUrl = result.platformPostUrl
    }

    // Create published post record
    const [publishedPost] = await db
      .insert(publishedPosts)
      .values({
        userId,
        libraryItemId,
        platform: platform as "instagram" | "facebook",
        platformPostId,
        platformPostUrl,
        mediaType: libraryItem.type as any,
        caption: postCaption,
        status: PublishedPostStatus.PUBLISHED,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Update library item status
    await db
      .update(libraryItems)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(libraryItems.id, libraryItemId))

    return NextResponse.json({
      success: true,
      publishedPostId: publishedPost.id,
      platformPostId,
      platformPostUrl,
      scheduled: false,
    })
  } catch (error) {
    console.error("Social publish error:", error)

    // Handle SocialApiError with token errors
    if (error instanceof SocialApiError) {
      const isTokenError =
        error.code === SocialErrorCode.TOKEN_EXPIRED ||
        error.code === SocialErrorCode.AUTH_FAILED ||
        error.message.includes("Invalid OAuth access token") ||
        error.message.includes("Cannot parse access token") ||
        error.message.includes("token") && error.message.includes("expired")

      if (isTokenError && connection) {
        await markConnectionExpired(connection.id)
        return NextResponse.json(
          {
            error: `Sua conexão com ${platform === "instagram" ? "Instagram" : "Facebook"} expirou ou é inválida. Por favor, reconecte sua conta em Configurações > Redes Sociais.`,
            code: "TOKEN_EXPIRED",
          },
          { status: 400 }
        )
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erro ao publicar"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
