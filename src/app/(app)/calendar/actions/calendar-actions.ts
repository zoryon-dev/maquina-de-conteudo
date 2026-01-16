/**
 * Server Actions for Calendar Page
 *
 * Handles CRUD operations for scheduled posts and library items.
 * All actions are authenticated and protected.
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { libraryItems, scheduledPosts } from "@/db/schema"
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
 * Combines library_items and scheduled_posts tables to get all scheduled posts
 * within a date range, with optional filtering by platform, status, and type.
 *
 * @param dateRange - Start and end dates for the query
 * @param filters - Optional filters for platform, status, and type
 * @returns Array of calendar posts
 *
 * @example
 * const posts = await getCalendarPostsAction(
 *   { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
 *   { platforms: ['instagram', 'twitter'], statuses: ['scheduled'] }
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
    // Build query conditions
    const conditions = [
      eq(libraryItems.userId, userId),
      gte(libraryItems.scheduledFor, dateRange.start),
      lte(libraryItems.scheduledFor, dateRange.end),
      isNull(libraryItems.deletedAt),
    ]

    // Add platform filter if provided
    if (filters.platforms && filters.platforms.length > 0) {
      conditions.push(inArray(scheduledPosts.platform, filters.platforms))
    }

    // Add status filter if provided
    if (filters.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(libraryItems.status, filters.statuses))
    }

    // Add type filter if provided
    if (filters.types && filters.types.length > 0) {
      conditions.push(inArray(libraryItems.type, filters.types))
    }

    // Execute query with join
    const posts = await db
      .select({
        // Library item fields
        id: libraryItems.id,
        libraryItemId: libraryItems.id,
        type: libraryItems.type,
        status: libraryItems.status,
        title: libraryItems.title,
        content: libraryItems.content,
        scheduledFor: libraryItems.scheduledFor,
        mediaUrl: libraryItems.mediaUrl,
        metadata: libraryItems.metadata,
        createdAt: libraryItems.createdAt,
        updatedAt: libraryItems.updatedAt,
        // Scheduled post fields
        scheduledPostId: scheduledPosts.id,
        platform: scheduledPosts.platform,
        scheduledPostStatus: scheduledPosts.status,
        postedAt: scheduledPosts.postedAt,
        platformPostId: scheduledPosts.platformPostId,
      })
      .from(libraryItems)
      .innerJoin(scheduledPosts, eq(libraryItems.id, scheduledPosts.libraryItemId))
      .where(and(...conditions))
      .orderBy(libraryItems.scheduledFor)

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
    const allPosts = await db
      .select({
        platform: scheduledPosts.platform,
        status: libraryItems.status,
        scheduledFor: libraryItems.scheduledFor,
      })
      .from(libraryItems)
      .innerJoin(scheduledPosts, eq(libraryItems.id, scheduledPosts.libraryItemId))
      .where(and(eq(libraryItems.userId, userId), isNull(libraryItems.deletedAt)))

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
 * @param data - Post form data
 * @returns Action result with library item ID on success
 *
 * @example
 * const result = await createPostAction({
 *   title: "New Post",
 *   content: "Post content here...",
 *   type: "text",
 *   platforms: ["instagram", "twitter"],
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

    // Create scheduled posts for each platform
    if (data.platforms && data.platforms.length > 0) {
      const scheduledFor = data.scheduledFor || new Date()

      await db.insert(scheduledPosts).values(
        data.platforms.map((platform) => ({
          libraryItemId: libraryItem.id,
          platform,
          scheduledFor,
          status: "pending",
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

    // Update or recreate scheduled posts if platforms changed
    if (data.platforms) {
      // Delete existing scheduled posts
      await db
        .delete(scheduledPosts)
        .where(eq(scheduledPosts.libraryItemId, id))

      // Create new scheduled posts
      if (data.platforms.length > 0 && data.scheduledFor) {
        await db.insert(scheduledPosts).values(
          data.platforms.map((platform) => ({
            libraryItemId: id,
            platform,
            scheduledFor: data.scheduledFor!,
            status: "pending",
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
 * Updates both libraryItems.scheduledFor and all related scheduled_posts.
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

    // Update all scheduled posts for this library item
    await db
      .update(scheduledPosts)
      .set({ scheduledFor: newDate })
      .where(eq(scheduledPosts.libraryItemId, id))

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
 * Duplicate a library item and its scheduled posts
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

    // Fetch scheduled posts to get platforms
    const scheduled = await db
      .select({ platform: scheduledPosts.platform })
      .from(scheduledPosts)
      .where(eq(scheduledPosts.libraryItemId, id))

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

    // Duplicate scheduled posts if they exist
    if (platforms.length > 0) {
      const scheduledFor = newScheduledFor || new Date()

      await db.insert(scheduledPosts).values(
        platforms.map((platform) => ({
          libraryItemId: newLibraryItem.id,
          platform,
          scheduledFor,
          status: "pending",
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
 * Get a single post with its scheduled posts
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

    // Get scheduled posts for this library item
    const scheduled = await db
      .select()
      .from(scheduledPosts)
      .where(eq(scheduledPosts.libraryItemId, id))

    return {
      ...post,
      scheduledPosts: scheduled,
    }
  } catch (error) {
    console.error("Error fetching post:", error)
    return null
  }
}
