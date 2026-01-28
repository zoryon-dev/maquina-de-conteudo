/**
 * Social Metrics Fetch Worker
 *
 * Fetches metrics from Instagram and Facebook for published posts.
 * Updates the metrics in the database.
 */

import { db } from "@/db"
import { publishedPosts, socialConnections } from "@/db/schema"
import { eq, and, lt } from "drizzle-orm"
import { getInstagramService, getFacebookService } from "../api"

/**
 * Payload for metrics fetch job
 */
export interface MetricsFetchPayload {
  userId?: string // Optional - if not provided, fetches for all users
  publishedPostId?: number // Optional - fetch for specific post
}

/**
 * Error details for a failed post
 */
export interface MetricsFetchError {
  postId: number
  platform: string
  error: string
}

/**
 * Fetch metrics for a published post
 *
 * @param payload - Job payload
 * @returns Result with number of posts updated and any errors
 */
export async function fetchSocialMetrics(
  payload: MetricsFetchPayload = {}
): Promise<{ success: boolean; updatedCount: number; errors?: MetricsFetchError[]; error?: string }> {
  const { userId, publishedPostId } = payload

  try {
    let postsToUpdate: typeof publishedPosts.$inferSelect[]

    if (publishedPostId) {
      // Fetch for specific post
      const [post] = await db
        .select()
        .from(publishedPosts)
        .where(eq(publishedPosts.id, publishedPostId))

      postsToUpdate = post ? [post] : []
    } else {
      // Fetch posts that need metrics update
      // Criteria: published at least 1 hour ago, updated in last 24 hours
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const query = db
        .select()
        .from(publishedPosts)
        .where(
          and(
            eq(publishedPosts.status, "published"),
            lt(publishedPosts.publishedAt!, oneHourAgo as any)
          )
        )

      // Filter by userId if provided
      if (userId) {
        const results = await query
        postsToUpdate = results.filter((p) => p.userId === userId)
      } else {
        postsToUpdate = await query
      }

      // Only fetch if not updated recently (avoid spamming API)
      postsToUpdate = postsToUpdate.filter(
        (p) =>
          !p.metricsLastFetchedAt ||
          p.metricsLastFetchedAt < twentyFourHoursAgo
      )
    }

    let updatedCount = 0
    const errors: MetricsFetchError[] = []

    for (const post of postsToUpdate) {
      try {
        // Get connection for this post's platform
        const connectionResult = await db
          .select()
          .from(socialConnections)
          .where(
            and(
              eq(socialConnections.userId, post.userId),
              eq(socialConnections.platform, post.platform as any)
            )
          )

        const connection = connectionResult[0]

        if (!connection || !post.platformPostId) {
          errors.push({
            postId: post.id,
            platform: post.platform,
            error: !connection ? "No connection found" : "No platformPostId",
          })
          continue
        }

        // Get service and fetch metrics based on platform
        const metrics =
          post.platform === "instagram"
            ? await getInstagramService(
                connection.accessToken,
                connection.accountId
              ).getMediaMetrics(post.platformPostId)
            : await getFacebookService(
                connection.accessToken,
                connection.accountId
              ).getPostMetrics(post.platformPostId)

        // Update post with metrics
        await db
          .update(publishedPosts)
          .set({
            metrics: metrics as any,
            metricsLastFetchedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(publishedPosts.id, post.id))

        updatedCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[MetricsFetch] Error fetching metrics for post ${post.id}:`, errorMsg)
        errors.push({
          postId: post.id,
          platform: post.platform,
          error: errorMsg,
        })
      }
    }

    // Log summary if there were errors
    if (errors.length > 0) {
    }

    return { success: true, updatedCount, errors: errors.length > 0 ? errors : undefined }
  } catch (error) {
    console.error("Metrics fetch worker error:", error)
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
