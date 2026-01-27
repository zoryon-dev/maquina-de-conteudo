/**
 * Server Actions for Calendar Page
 *
 * Handles CRUD operations for published posts and library items.
 * All actions are authenticated and protected.
 *
 * UPDATED: Now uses publishedPosts instead of scheduledPosts
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { libraryItems, publishedPosts } from "@/db/schema"
import { eq, and, gte, lte, isNull, inArray } from "drizzle-orm"
import type {
  CalendarPost,
  CalendarFilters,
  PostFormData,
  ActionResult,
} from "@/types/calendar"
import type { ContentStatus } from "@/db/schema"

/**
 * Fetch calendar posts with filters
 *
 * Combines library_items and published_posts tables to get all scheduled/published posts
 * within a date range, with optional filtering by platform, status, and type.
 *
 * UPDATED: Now uses publishedPosts instead of scheduledPosts
 *
 * @param dateRange - Start and end dates for the query
 * @param filters - Optional filters for platform, status, and type
 * @returns Array of calendar posts
 *
 * @example
 * const posts = await getCalendarPostsAction(
 *   { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
 *   { platforms: ['instagram', 'facebook'], statuses: ['scheduled'] }
 * )
 */
export async function getCalendarPostsAction(
  dateRange: { start: Date; end: Date },
  filters: CalendarFilters = {}
): Promise<CalendarPost[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Build query conditions - using publishedPosts now
    const conditions = [
      eq(publishedPosts.userId, userId),
      gte(publishedPosts.scheduledFor!, dateRange.start),
      lte(publishedPosts.scheduledFor!, dateRange.end),
      isNull(publishedPosts.deletedAt),
    ]

    // Add platform filter if provided (only instagram/facebook are valid for publishedPosts)
    if (filters.platforms && filters.platforms.length > 0) {
      const validPlatforms = filters.platforms.filter(
        (p) => (p as string) === "instagram" || (p as string) === "facebook"
      ) as ("instagram" | "facebook")[]
      if (validPlatforms.length > 0) {
        conditions.push(inArray(publishedPosts.platform, validPlatforms))
      }
    }

    // Add status filter if provided (map library status to published post status)
    if (filters.statuses && filters.statuses.length > 0) {
      // Map library statuses to published post statuses
      // Only "scheduled" and "published" exist in publishedPosts enum
      const validStatuses: ("scheduled" | "published")[] = []
      if (filters.statuses.includes("scheduled")) {
        validStatuses.push("scheduled")
      }
      if (filters.statuses.includes("published")) {
        validStatuses.push("published")
      }
      if (validStatuses.length > 0) {
        conditions.push(inArray(publishedPosts.status, validStatuses))
      }
    }

    // Execute query with join
    const posts = await db
      .select({
        // Published post fields
        id: publishedPosts.id,
        scheduledPostId: publishedPosts.id,
        platform: publishedPosts.platform,
        scheduledPostStatus: publishedPosts.status,
        scheduledFor: publishedPosts.scheduledFor,
        postedAt: publishedPosts.publishedAt,
        platformPostId: publishedPosts.platformPostId,
        mediaType: publishedPosts.mediaType,
        createdAt: publishedPosts.createdAt,
        updatedAt: publishedPosts.updatedAt,

        // Library item fields (via left join)
        libraryItemId: publishedPosts.libraryItemId,
        type: libraryItems.type,
        status: libraryItems.status,
        title: libraryItems.title,
        content: libraryItems.content,
        // Use publishedPosts.mediaUrl if available, otherwise fall back to libraryItems.mediaUrl
        mediaUrl: publishedPosts.mediaUrl, // Prioritize published post media URL (custom override)
        metadata: libraryItems.metadata,
      })
      .from(publishedPosts)
      .leftJoin(libraryItems, eq(publishedPosts.libraryItemId, libraryItems.id))
      .where(and(...conditions))
      .orderBy(publishedPosts.scheduledFor)

    return posts as CalendarPost[]
  } catch (error) {
    console.error("Error fetching calendar posts:", error)
    return []
  }
}

/**
 * Get calendar statistics
 *
 * Returns counts of posts by platform and status for the current user.
 *
 * @returns Statistics object with counts
 */
export async function getCalendarStatsAction() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    // Now uses publishedPosts instead of scheduledPosts
    const allPosts = await db
      .select({
        platform: publishedPosts.platform,
        status: publishedPosts.status,
        scheduledFor: publishedPosts.scheduledFor,
      })
      .from(publishedPosts)
      .leftJoin(libraryItems, eq(publishedPosts.libraryItemId, libraryItems.id))
      .where(and(eq(publishedPosts.userId, userId), isNull(publishedPosts.deletedAt)))

    // Calculate statistics
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const byPlatform: Record<string, number> = {
      instagram: 0,
      twitter: 0,
      linkedin: 0,
      tiktok: 0,
    }

    const byStatus: Record<string, number> = {
      draft: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    }

    let scheduledThisWeek = 0
    let scheduledThisMonth = 0

    for (const post of allPosts) {
      // Count by platform
      if (post.platform) {
        byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1
      }

      // Count by status
      if (post.status) {
        byStatus[post.status] = (byStatus[post.status] || 0) + 1
      }

      // Count scheduled posts
      if (post.scheduledFor) {
        if (post.scheduledFor <= weekFromNow) {
          scheduledThisWeek++
        }
        if (post.scheduledFor <= monthFromNow) {
          scheduledThisMonth++
        }
      }
    }

    return {
      totalPosts: allPosts.length,
      scheduledThisWeek,
      scheduledThisMonth,
      byPlatform,
      byStatus,
    }
  } catch (error) {
    console.error("Error fetching calendar stats:", error)
    return null
  }
}

/**
 * Create a new library item and schedule posts for platforms
 *
 * UPDATED: Now uses publishedPosts instead of scheduledPosts
 *
 * @param data - Post form data
 * @returns Action result with library item ID on success
 *
 * @example
 * const result = await createPostAction({
 *   title: "New Post",
 *   content: "Post content here...",
 *   type: "text",
 *   platforms: ["instagram", "facebook"],
 *   scheduledFor: new Date("2026-01-15T14:00:00")
 * })
 */
export async function createPostAction(
  data: PostFormData
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Create library item
    const [libraryItem] = await db
      .insert(libraryItems)
      .values({
        userId,
        type: data.type,
        status: data.scheduledFor ? ("scheduled" as ContentStatus) : ("draft" as ContentStatus),
        title: data.title || null,
        content: data.content,
        mediaUrl: data.mediaUrl && data.mediaUrl.length > 0 ? JSON.stringify(data.mediaUrl) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        scheduledFor: data.scheduledFor || null,
      })
      .returning()

    // Create published posts for each platform (NEW: uses publishedPosts)
    if (data.platforms && data.platforms.length > 0) {
      const scheduledFor = data.scheduledFor || new Date()

      await db.insert(publishedPosts).values(
        data.platforms.map((platform) => ({
          userId,
          libraryItemId: libraryItem.id,
          platform: platform as "instagram" | "facebook",
          scheduledFor,
          status: "scheduled" as const,
          mediaType: data.type,
        }))
      )
    }

    // Revalidate calendar path
    revalidatePath("/calendar")

    return { success: true, libraryItemId: libraryItem.id }
  } catch (error) {
    console.error("Error creating post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar post",
    }
  }
}

/**
 * Update an existing library item and its scheduled posts
 *
 * @param id - Library item ID
 * @param data - Partial post form data
 * @returns Action result
 */
export async function updatePostAction(
  id: number,
  data: Partial<PostFormData>
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Post não encontrado" }
    }

    // Update library item
    await db
      .update(libraryItems)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.scheduledFor !== undefined && {
          scheduledFor: data.scheduledFor,
          status: data.scheduledFor ? ("scheduled" as ContentStatus) : ("draft" as ContentStatus),
        }),
        ...(data.mediaUrl !== undefined && {
          mediaUrl: data.mediaUrl && data.mediaUrl.length > 0 ? JSON.stringify(data.mediaUrl) : null,
        }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, id))

    // Update or recreate published posts if platforms changed
    if (data.platforms) {
      // Delete existing published posts for this library item
      await db
        .delete(publishedPosts)
        .where(eq(publishedPosts.libraryItemId, id))

      // Create new published posts
      if (data.platforms.length > 0 && data.scheduledFor) {
        await db.insert(publishedPosts).values(
          data.platforms.map((platform) => ({
            userId,
            libraryItemId: id,
            platform: platform as "instagram" | "facebook",
            scheduledFor: data.scheduledFor!,
            status: "scheduled" as const,
            mediaType: data.type || "text",
          }))
        )
      }
    }

    revalidatePath("/calendar")

    return { success: true }
  } catch (error) {
    console.error("Error updating post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar post",
    }
  }
}

/**
 * Soft delete a library item (sets deletedAt)
 *
 * @param id - Library item ID
 * @returns Action result
 */
export async function deletePostAction(id: number): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Post não encontrado" }
    }

    // Soft delete
    await db
      .update(libraryItems)
      .set({ deletedAt: new Date() })
      .where(eq(libraryItems.id, id))

    revalidatePath("/calendar")

    return { success: true }
  } catch (error) {
    console.error("Error deleting post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir post",
    }
  }
}

/**
 * Reschedule a post to a new date (drag & drop action)
 *
 * Updates both libraryItems.scheduledFor and all related published_posts.
 *
 * @param id - Library item ID
 * @param newDate - New scheduled date/time
 * @returns Action result
 *
 * @example
 * // User dragged post from Jan 15 to Jan 20
 * await reschedulePostAction(123, new Date("2026-01-20T14:00:00"))
 */
export async function reschedulePostAction(
  id: number,
  newDate: Date
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Post não encontrado" }
    }

    // Update library item scheduledFor
    await db
      .update(libraryItems)
      .set({
        scheduledFor: newDate,
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, id))

    // Update all published posts for this library item (NEW: uses publishedPosts)
    await db
      .update(publishedPosts)
      .set({ scheduledFor: newDate })
      .where(eq(publishedPosts.libraryItemId, id))

    revalidatePath("/calendar")

    return { success: true }
  } catch (error) {
    console.error("Error rescheduling post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao reagendar post",
    }
  }
}

/**
 * Duplicate a library item and its published posts
 *
 * Creates a copy with "(cópia)" appended to the title.
 *
 * @param id - Library item ID to duplicate
 * @param newScheduledFor - Optional new scheduled date for the copy
 * @returns Action result with new library item ID
 */
export async function duplicatePostAction(
  id: number,
  newScheduledFor?: Date
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Fetch original library item
    const [original] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!original || original.userId !== userId) {
      return { success: false, error: "Post não encontrado" }
    }

    // Fetch published posts to get platforms (NEW: uses publishedPosts)
    const scheduled = await db
      .select({ platform: publishedPosts.platform })
      .from(publishedPosts)
      .where(eq(publishedPosts.libraryItemId, id))

    const platforms = scheduled.map((s) => s.platform)

    // Create new library item
    const [newLibraryItem] = await db
      .insert(libraryItems)
      .values({
        userId,
        type: original.type,
        status: "draft" as ContentStatus,
        title: original.title ? `${original.title} (cópia)` : null,
        content: original.content,
        mediaUrl: original.mediaUrl,
        metadata: original.metadata,
        scheduledFor: newScheduledFor || null,
      })
      .returning()

    // Duplicate published posts if they exist (NEW: uses publishedPosts)
    if (platforms.length > 0) {
      const scheduledFor = newScheduledFor || new Date()

      await db.insert(publishedPosts).values(
        platforms.map((platform) => ({
          userId,
          libraryItemId: newLibraryItem.id,
          platform: platform as "instagram" | "facebook",
          scheduledFor,
          status: "scheduled" as const,
          mediaType: original.type,
        }))
      )
    }

    revalidatePath("/calendar")

    return { success: true, libraryItemId: newLibraryItem.id }
  } catch (error) {
    console.error("Error duplicating post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao duplicar post",
    }
  }
}

/**
 * Get a single post with its published posts
 *
 * @param id - Library item ID
 * @returns Post data or null if not found
 */
export async function getPostAction(id: number) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    const [post] = await db
      .select()
      .from(libraryItems)
      .where(and(eq(libraryItems.id, id), eq(libraryItems.userId, userId)))
      .limit(1)

    if (!post) {
      return null
    }

    // Get published posts for this library item (NEW: uses publishedPosts)
    const scheduled = await db
      .select()
      .from(publishedPosts)
      .where(eq(publishedPosts.libraryItemId, id))

    return {
      ...post,
      scheduledPosts: scheduled,
    }
  } catch (error) {
    console.error("Error fetching post:", error)
    return null
  }
}
