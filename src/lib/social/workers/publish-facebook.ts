/**
 * Facebook Publish Worker
 *
 * Handles publishing posts to Facebook via the worker system.
 * Processes jobs from the queue and updates the database.
 */

import { db } from "@/db"
import { publishedPosts, libraryItems, socialConnections } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getFacebookService } from "../api"
import { PublishedPostStatus } from "../types"
import { SocialMediaType } from "../types"

/**
 * Payload for Facebook publish job
 */
export interface FacebookPublishPayload {
  publishedPostId: number
  userId: string
}

/**
 * Publish a post to Facebook
 *
 * This worker is called by the queue system to publish a scheduled post.
 *
 * @param payload - Job payload containing publishedPostId and userId
 * @returns Result with platformPostId
 */
export async function publishToFacebook(
  payload: FacebookPublishPayload
): Promise<{ success: boolean; platformPostId?: string; error?: string }> {
  const { publishedPostId, userId } = payload

  try {
    // Get the published post record
    const [postRecord] = await db
      .select()
      .from(publishedPosts)
      .where(eq(publishedPosts.id, publishedPostId))

    if (!postRecord) {
      return { success: false, error: "Post not found" }
    }

    // Verify ownership
    if (postRecord.userId !== userId) {
      return { success: false, error: "Forbidden" }
    }

    // Get the library item for media URLs
    const [libraryItem] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, postRecord.libraryItemId!))

    if (!libraryItem) {
      return { success: false, error: "Library item not found" }
    }

    // Parse media URLs from JSON
    const mediaUrls: string[] = libraryItem.mediaUrl
      ? JSON.parse(libraryItem.mediaUrl)
      : []

    if (mediaUrls.length === 0) {
      return { success: false, error: "No media URLs found" }
    }

    // Get active Facebook connection
    const connectionResult = await db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, "facebook")
        )
      )

    const connection = connectionResult[0]

    if (!connection) {
      return { success: false, error: "No active Facebook connection" }
    }

    // Get Facebook service
    const service = getFacebookService(connection.accessToken, connection.accountId)

    // Publish photo (Facebook uses photo endpoint for image posts)
    const result = await service.publishPhoto({
      imageUrl: mediaUrls[0],
      caption: postRecord.caption || undefined,
      mediaType: SocialMediaType.IMAGE,
    })

    // Update published post record
    await db
      .update(publishedPosts)
      .set({
        status: PublishedPostStatus.PUBLISHED,
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(publishedPosts.id, publishedPostId))

    // Update library item status
    await db
      .update(libraryItems)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(libraryItems.id, libraryItem.id))

    return { success: true, platformPostId: result.platformPostId }
  } catch (error) {
    console.error("Facebook publish worker error:", error)

    // Update post as failed
    await db
      .update(publishedPosts)
      .set({
        status: PublishedPostStatus.FAILED,
        failureReason: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(publishedPosts.id, publishedPostId))

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
