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
import { toAppError, getErrorMessage, isAuthError, hasErrorCode } from "@/lib/errors"
import { safeDecrypt } from "@/lib/encryption"
import { z } from "zod"

const publishSchema = z.object({
  libraryItemId: z.number().int().positive(),
  platform: z.enum(["instagram", "facebook"]),
  scheduledFor: z.string().datetime().optional(),
  caption: z.string().max(2200).optional(),
})

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

  // Get App Access Token for debug_token endpoint
  const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`

  // 1. Get token info using debug_token endpoint
  try {
    const debugUrl = `${GRAPH_API_URL}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
    await fetch(debugUrl)
  } catch (e) {
    // Silently skip debug
  }

  // 2. Get IG Business Account info
  try {
    const igUrl = `${GRAPH_API_URL}/${igAccountId}?fields=username,account_type,media_count,followers_count&access_token=${accessToken}`
    await fetch(igUrl)
  } catch (e) {
    // Silently skip debug
  }

  // 3. Check content publishing limit
  try {
    const limitUrl = `${GRAPH_API_URL}/${igAccountId}/content_publishing_limit?access_token=${accessToken}`
    await fetch(limitUrl)
  } catch (e) {
    // Silently skip debug
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
    const parseResult = publishSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body. Required: libraryItemId (number), platform ('instagram' | 'facebook')" },
        { status: 400 }
      )
    }
    const { libraryItemId, platform: reqPlatform, scheduledFor, caption } = parseResult.data
    platform = reqPlatform

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

    // Parse media URLs with validation
    let mediaUrls: string[] = []
    if (libraryItem.mediaUrl) {
      try {
        const parsed = JSON.parse(libraryItem.mediaUrl)
        if (!Array.isArray(parsed)) {
          return NextResponse.json(
            { error: "Invalid media URL format: expected array" },
            { status: 400 }
          )
        }
        mediaUrls = parsed.filter((url): url is string => typeof url === "string" && url.length > 0)
      } catch (parseError) {
        console.error("[Publish] Failed to parse mediaUrl JSON:", parseError)
        return NextResponse.json(
          { error: "Invalid media URL format in library item. Please re-create the content." },
          { status: 400 }
        )
      }
    }

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

    const shouldCheckExpiry = platform === "instagram"

    // Check if token is expired (Instagram user tokens expire; page tokens don't)
    if (shouldCheckExpiry && isTokenExpired(connection.tokenExpiresAt)) {
      await markConnectionExpired(connection.id)
      return NextResponse.json(
        {
          error: `Sua conexão com ${platform === "instagram" ? "Instagram" : "Facebook"} expirou. Por favor, reconecte sua conta em Configurações > Redes Sociais.`,
          code: "TOKEN_EXPIRED",
        },
        { status: 400 }
      )
    }

    // Decrypt token before use (handles both encrypted and legacy plaintext)
    const decryptedAccessToken = safeDecrypt(connection.accessToken)
    if (!decryptedAccessToken) {
      return NextResponse.json(
        { error: "Falha ao descriptografar token de acesso. Reconecte sua conta." },
        { status: 500 }
      )
    }

    // Check token permissions before publishing (debug only, silently fails)
    if (platform === "instagram") {
      await debugInstagramTokenPermissions(decryptedAccessToken, connection.accountId)
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

      // Track if native scheduling failed
      let usedFallback = false

      // For Facebook, we can use native scheduling
      if (platform === "facebook") {
        try {
          const service = getFacebookService(
            decryptedAccessToken,
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
          usedFallback = true
        }
      }

      // For Instagram, we rely on the cron system (no native scheduling)
      // The cron endpoint will process scheduled posts and enqueue jobs

      return NextResponse.json({
        success: true,
        publishedPostId: publishedPost.id,
        scheduled: true,
        scheduledFor: scheduledDate.toISOString(),
        warning: platform === "facebook" && usedFallback
          ? "Agendamento nativo do Facebook falhou. Usando cron do servidor - a publicação será processada nos próximos minutos."
          : undefined,
      })
    }

    // Immediate publishing - now using async job queue
    // Previously this was synchronous, causing UI to hang during Instagram processing
    // Now we create a job and return immediately, letting the worker handle publishing

    // Create published post record with PROCESSING status
    const [publishedPost] = await db
      .insert(publishedPosts)
      .values({
        userId,
        libraryItemId,
        platform: platform as "instagram" | "facebook",
        mediaType: libraryItem.type as any,
        caption: postCaption,
        status: PublishedPostStatus.PROCESSING,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Create job for worker to process
    // Priority 1 = high priority for immediate publishing
    const jobType = platform === "instagram" ? "social_publish_instagram" : "social_publish_facebook"

    try {
      const jobId = await createJob(
        userId,
        jobType as any,
        {
          publishedPostId: publishedPost.id,
          userId,
        } as any, // SocialPublishPayload not yet defined in JobPayload union
        {
          priority: 1, // High priority for immediate publishing
        }
      )

      // In development, trigger worker immediately for faster feedback
      let workerTriggerFailed = false
      if (process.env.NODE_ENV === "development") {
        // Try to trigger worker, but continue if it fails
        // The cron job will pick up the job within 1 minute anyway
        await import("@/lib/queue/client").then(async ({ triggerWorker }) => {
          try {
            await triggerWorker()
          } catch (err) {
            console.error("[Publish] Failed to trigger worker in development:", err)
            workerTriggerFailed = true
          }
        })
      }

      return NextResponse.json({
        success: true,
        publishedPostId: publishedPost.id,
        jobId,
        queued: true,
        platform,
        message: "Publicação enfileirada. Você será notificado quando for publicada.",
        developmentWarning: process.env.NODE_ENV === "development" && workerTriggerFailed
          ? "Worker trigger falhou em desenvolvimento. O job será processado pelo cron em até 1 minuto."
          : undefined,
      })
    } catch (jobError) {
      // If job creation fails, clean up the published post
      console.error("[Publish] Failed to create job, cleaning up:", jobError)
      await db
        .delete(publishedPosts)
        .where(eq(publishedPosts.id, publishedPost.id))

      return NextResponse.json(
        {
          error: "Falha ao enfileirar publicação. Tente novamente.",
          code: "JOB_CREATION_FAILED",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const appError = toAppError(error, "PUBLISH_FAILED")
    console.error("[SocialPublish] Error:", appError)

    // Handle SocialApiError with token errors
    const isTokenError =
      error instanceof SocialApiError &&
      (error.code === SocialErrorCode.TOKEN_EXPIRED ||
        error.code === SocialErrorCode.AUTH_FAILED ||
        error.message.includes("Invalid OAuth access token") ||
        error.message.includes("Cannot parse access token") ||
        (error.message.includes("token") && error.message.includes("expired")))

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

    return NextResponse.json(
      { error: getErrorMessage(appError) },
      { status: 500 }
    )
  }
}
