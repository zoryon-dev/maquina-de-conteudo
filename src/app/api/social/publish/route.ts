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
import { PublishedPostStatus } from "@/lib/social/types"
import { getInstagramService, getFacebookService } from "@/lib/social/api"
import { SocialMediaType } from "@/lib/social/types"

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

  try {
    const body = await request.json()
    const { libraryItemId, platform, scheduledFor, caption } = body

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

    const connection = connectionResult[0]

    if (!connection) {
      return NextResponse.json(
        { error: `No active ${platform} connection. Please connect your account first.` },
        { status: 400 }
      )
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
      // Instagram publishing
      const service = getInstagramService(
        connection.accessToken,
        connection.accountId
      )
      const result = await service.publishPost({
        imageUrl: mediaUrls[0],
        caption: postCaption,
        mediaType: SocialMediaType.IMAGE,
      })

      platformPostId =
        typeof result === "string" ? result : result.platformPostId
      platformPostUrl =
        typeof result === "string"
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

    const errorMessage =
      error instanceof Error ? error.message : "Publishing failed"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
