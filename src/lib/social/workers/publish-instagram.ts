/**
 * Instagram Publish Worker
 *
 * Handles publishing posts to Instagram via the worker system.
 * Processes jobs from the queue and updates the database.
 */

import { db } from "@/db"
import { publishedPosts, libraryItems, socialConnections } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getInstagramService } from "../api"
import { PublishedPostStatus } from "../types"
import { SocialMediaType } from "../types"

/**
 * Payload for Instagram publish job
 */
export interface InstagramPublishPayload {
  publishedPostId: number
  userId: string
}

/**
 * Publish a post to Instagram
 *
 * This worker is called by the queue system to publish a scheduled post.
 *
 * @param payload - Job payload containing publishedPostId and userId
 * @returns Result with platformPostId
 */
export async function publishToInstagram(
  payload: InstagramPublishPayload
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

    // Get active Instagram connection
    const connectionResult = await db
      .select()
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.userId, userId),
          eq(socialConnections.platform, "instagram")
        )
      )

    const connection = connectionResult[0]

    if (!connection) {
      return { success: false, error: "No active Instagram connection" }
    }

    // Get Instagram service
    const service = getInstagramService(connection.accessToken, connection.accountId)

    let platformPostId: string

    if (mediaUrls.length > 1) {
      // Carousel post
      const carouselItems = mediaUrls.map((url) => ({
        imageUrl: url,
        mediaType: SocialMediaType.IMAGE as SocialMediaType.IMAGE | SocialMediaType.VIDEO,
      }))

      const result = await service.publishPost(
        {
          imageUrl: mediaUrls[0],
          caption: postRecord.caption || undefined,
          mediaType: SocialMediaType.CAROUSEL,
        },
        true, // isCarousel
        carouselItems
      )

      // Handle string | PublishResult return
      platformPostId = typeof result === "string" ? result : result.platformPostId
    } else {
      // Single media post
      const result = await service.publishPost({
        imageUrl: mediaUrls[0],
        caption: postRecord.caption || undefined,
        mediaType: SocialMediaType.IMAGE,
      })

      platformPostId = typeof result === "string" ? result : result.platformPostId
    }

    // Update published post record
    await db
      .update(publishedPosts)
      .set({
        status: PublishedPostStatus.PUBLISHED,
        platformPostId,
        platformPostUrl: `https://www.instagram.com/p/${platformPostId}/`,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(publishedPosts.id, publishedPostId))

    // Update library item status
    await db
      .update(libraryItems)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(libraryItems.id, libraryItem.id))

    return { success: true, platformPostId }
  } catch (error) {
    console.error("Instagram publish worker error:", error)

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
