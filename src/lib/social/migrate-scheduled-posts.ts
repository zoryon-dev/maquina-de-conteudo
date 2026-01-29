/**
 * Migration Script: scheduledPosts → publishedPosts
 *
 * Migrates data from the legacy scheduled_posts table to the modern published_posts table.
 * This script handles:
 * - Mapping userId from libraryItems (required in publishedPosts)
 * - Converting platform text to enum
 * - Converting status values
 * - Mapping error → failureReason
 * - Deleting migrated records from scheduled_posts
 *
 * Usage:
 * ```ts
 * import { migrateScheduledPostToPublished, migrateAllScheduledPosts } from '@/lib/social/migrate-scheduled-posts'
 *
 * // Migrate a single post
 * await migrateScheduledPostToPublished(123)
 *
 * // Migrate all posts
 * await migrateAllScheduledPosts()
 * ```
 */

import { db } from "@/db"
import { scheduledPosts, publishedPosts, libraryItems } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"

/**
 * Status mapping from scheduledPosts to publishedPosts
 *
 * scheduled_posts.status: "pending" | "published" | "failed"
 * published_posts.status: "scheduled" | "pending" | "processing" | "published" | "failed" | "cancelled"
 *
 * Mapping:
 * - "pending" → "scheduled" (posts waiting to be published)
 * - "published" → "published" (already published)
 * - "failed" → "failed" (failed to publish)
 */
const STATUS_MAP: Record<string, "scheduled" | "pending" | "processing" | "published" | "failed" | "cancelled"> = {
  pending: "scheduled", // scheduled_posts "pending" means scheduled for future
  published: "published",
  failed: "failed",
}

/**
 * Platform mapping from scheduledPosts to publishedPosts
 *
 * scheduled_posts.platform: text (instagram, twitter, linkedin, etc.)
 * published_posts.platform: socialPlatformEnum ("instagram" | "facebook" | "linkedin")
 *
 * Note: Only "instagram" and "facebook" are valid in publishedPosts.
 * Other platforms will be logged and skipped.
 */
const VALID_PLATFORMS = ["instagram", "facebook", "linkedin"] as const

/**
 * Migrate a single scheduled post to published_posts
 *
 * @param scheduledPostId - ID of the scheduled post to migrate
 * @returns Result object with success status and new published post ID
 */
export async function migrateScheduledPostToPublished(scheduledPostId: number) {
  try {
    // Fetch the scheduled post
    const [scheduled] = await db
      .select()
      .from(scheduledPosts)
      .where(eq(scheduledPosts.id, scheduledPostId))
      .limit(1)

    if (!scheduled) {
      return { success: false, error: "Scheduled post not found" }
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(scheduled.platform as any)) {
      return {
        success: false,
        error: `Platform "${scheduled.platform}" not supported in publishedPosts`,
      }
    }

    // Fetch library item to get userId (required in publishedPosts)
    const [libraryItem] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, scheduled.libraryItemId))
      .limit(1)

    if (!libraryItem) {
      return { success: false, error: "Library item not found" }
    }

    // Map status
    const mappedStatus = STATUS_MAP[scheduled.status] || "pending"

    // Check if a published post already exists for this combination
    const [existing] = await db
      .select()
      .from(publishedPosts)
      .where(
        and(
          eq(publishedPosts.libraryItemId, scheduled.libraryItemId),
          eq(publishedPosts.platform, scheduled.platform as any)
        )
      )
      .limit(1)

    if (existing) {
      // Already migrated, update if needed
      await db
        .update(publishedPosts)
        .set({
          scheduledFor: scheduled.scheduledFor,
          status: mappedStatus,
          platformPostId: scheduled.platformPostId,
          failureReason: scheduled.error,
          updatedAt: new Date(),
        })
        .where(eq(publishedPosts.id, existing.id))

      // Delete from scheduled_posts
      await db.delete(scheduledPosts).where(eq(scheduledPosts.id, scheduledPostId))

      return { success: true, publishedPostId: existing.id, updated: true }
    }

    // Create new published post
    const [published] = await db
      .insert(publishedPosts)
      .values({
        userId: libraryItem.userId,
        libraryItemId: scheduled.libraryItemId,
        platform: scheduled.platform as any, // Filter to IG/FB before calling
        status: mappedStatus,
        platformPostId: scheduled.platformPostId,
        scheduledFor: scheduled.scheduledFor,
        publishedAt: scheduled.postedAt,
        failureReason: scheduled.error,
        mediaType: libraryItem.type || "text",
      })
      .returning()

    // Delete from scheduled_posts after successful migration
    await db.delete(scheduledPosts).where(eq(scheduledPosts.id, scheduledPostId))

    return { success: true, publishedPostId: published.id, created: true }
  } catch (error) {
    console.error(`Error migrating scheduled post ${scheduledPostId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Migrate all scheduled posts to published_posts
 *
 * This function processes all remaining records in scheduled_posts
 * and migrates them to published_posts.
 *
 * @returns Migration summary with counts of success/failure
 */
export async function migrateAllScheduledPosts() {
  try {
    // Fetch all scheduled posts
    const allScheduled = await db.select().from(scheduledPosts)

    if (allScheduled.length === 0) {
      return { success: true, message: "No scheduled posts to migrate", migrated: 0, failed: 0 }
    }

    let migrated = 0
    let failed = 0
    const errors: Array<{ id: number; error: string }> = []

    for (const scheduled of allScheduled) {
      const result = await migrateScheduledPostToPublished(scheduled.id)

      if (result.success) {
        migrated++
      } else {
        failed++
        errors.push({ id: scheduled.id, error: result.error || "Unknown error" })
      }
    }

    return {
      success: failed === 0,
      message: `Migrated ${migrated} posts, ${failed} failed`,
      migrated,
      failed,
      errors: failed > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error("Error in bulk migration:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      migrated: 0,
      failed: 0,
    }
  }
}

/**
 * Get count of remaining scheduled posts
 *
 * Useful for checking migration status
 */
export async function getScheduledPostsCount() {
  const result = await db.select().from(scheduledPosts)
  return result.length
}

/**
 * Get migration status summary
 */
export async function getMigrationStatus() {
  const scheduledCount = await getScheduledPostsCount()

  // Get count of published posts that came from migration
  const allPublished = await db.select().from(publishedPosts)
  const publishedFromLibrary = allPublished.filter((p) => p.libraryItemId !== null)

  return {
    scheduledPostsRemaining: scheduledCount,
    publishedPostsTotal: allPublished.length,
    publishedPostsFromLibrary: publishedFromLibrary.length,
    migrationComplete: scheduledCount === 0,
  }
}
