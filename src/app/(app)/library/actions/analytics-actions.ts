/**
 * Server Actions for Library Analytics
 *
 * Provides aggregated statistics, timelines, and breakdowns
 * for the analytics dashboard in the library page.
 */

"use server"

import { db } from "@/db"
import {
  libraryItems,
  publishedPosts,
  categories,
  tags,
  libraryItemTags,
} from "@/db/schema"
import { eq, and, gte, isNull, sql, desc } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import type { PostType, ContentStatus } from "@/db/schema"

// ============================================================================
// TYPES
// ============================================================================

export interface LibraryOverview {
  totalItems: number
  byStatus: Record<ContentStatus, number>
  byType: Record<PostType, number>
  createdThisWeek: number
  createdThisMonth: number
}

export interface TimelineEntry {
  date: string
  count: number
}

export interface TopContentItem {
  id: number
  title: string | null
  type: PostType
  status: ContentStatus
  publishedAt: Date | null
  createdAt: Date
  metrics: {
    likes?: number
    comments?: number
    shares?: number
    impressions?: number
    reach?: number
  } | null
}

export interface PlatformBreakdownEntry {
  platform: string
  count: number
}

// ============================================================================
// ANALYTICS ACTIONS
// ============================================================================

/**
 * Get library overview statistics
 *
 * Returns total counts, breakdowns by status and type,
 * and creation counts for the current week and month.
 */
export async function getLibraryOverviewAction(): Promise<LibraryOverview | null> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return null
  }

  try {
    // Get all non-deleted items with type and status
    const allItems = await db
      .select({
        type: libraryItems.type,
        status: libraryItems.status,
        createdAt: libraryItems.createdAt,
      })
      .from(libraryItems)
      .where(and(eq(libraryItems.userId, userId), isNull(libraryItems.deletedAt)))

    // Initialize counters
    const byStatus: Record<string, number> = {
      draft: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    }

    const byType: Record<string, number> = {
      text: 0,
      image: 0,
      carousel: 0,
      video: 0,
      story: 0,
    }

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    let createdThisWeek = 0
    let createdThisMonth = 0

    for (const item of allItems) {
      if (item.status) {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1
      }
      if (item.type) {
        byType[item.type] = (byType[item.type] || 0) + 1
      }
      if (item.createdAt >= startOfWeek) {
        createdThisWeek++
      }
      if (item.createdAt >= startOfMonth) {
        createdThisMonth++
      }
    }

    return {
      totalItems: allItems.length,
      byStatus: byStatus as Record<ContentStatus, number>,
      byType: byType as Record<PostType, number>,
      createdThisWeek,
      createdThisMonth,
    }
  } catch (error) {
    console.error("[getLibraryOverviewAction] Error:", error)
    return null
  }
}

/**
 * Get publication timeline data
 *
 * Returns an array of { date, count } entries showing
 * items created per day over the last N days.
 *
 * @param days - Number of days to look back (default: 30)
 */
export async function getPublicationTimelineAction(
  days: number = 30
): Promise<TimelineEntry[]> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return []
  }

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Query items created in the period, grouped by date
    const result = await db
      .select({
        date: sql<string>`to_char(${libraryItems.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt),
          gte(libraryItems.createdAt, startDate)
        )
      )
      .groupBy(sql`to_char(${libraryItems.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${libraryItems.createdAt}, 'YYYY-MM-DD')`)

    // Fill in missing dates with 0
    const dateMap = new Map(result.map((r) => [r.date, r.count]))
    const timeline: TimelineEntry[] = []

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      timeline.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      })
    }

    return timeline
  } catch (error) {
    console.error("[getPublicationTimelineAction] Error:", error)
    return []
  }
}

/**
 * Get top content items
 *
 * Returns the most recently published items, with engagement
 * metrics from publishedPosts when available.
 *
 * @param limit - Maximum number of items to return (default: 5)
 */
export async function getTopContentAction(
  limit: number = 5
): Promise<TopContentItem[]> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return []
  }

  try {
    // Get recently published items with their metrics from publishedPosts
    const publishedItems = await db
      .select({
        id: libraryItems.id,
        title: libraryItems.title,
        type: libraryItems.type,
        status: libraryItems.status,
        publishedAt: libraryItems.publishedAt,
        createdAt: libraryItems.createdAt,
        metrics: publishedPosts.metrics,
      })
      .from(libraryItems)
      .leftJoin(
        publishedPosts,
        and(
          eq(publishedPosts.libraryItemId, libraryItems.id),
          eq(publishedPosts.status, "published"),
          isNull(publishedPosts.deletedAt)
        )
      )
      .where(
        and(
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt),
          eq(libraryItems.status, "published")
        )
      )
      .orderBy(desc(libraryItems.publishedAt))
      .limit(limit)

    // If not enough published items, fill with recent drafts/scheduled
    if (publishedItems.length < limit) {
      const remaining = limit - publishedItems.length
      const publishedIds = publishedItems.map((i) => i.id)

      const recentItems = await db
        .select({
          id: libraryItems.id,
          title: libraryItems.title,
          type: libraryItems.type,
          status: libraryItems.status,
          publishedAt: libraryItems.publishedAt,
          createdAt: libraryItems.createdAt,
        })
        .from(libraryItems)
        .where(
          and(
            eq(libraryItems.userId, userId),
            isNull(libraryItems.deletedAt),
            publishedIds.length > 0
              ? sql`${libraryItems.id} NOT IN (${sql.join(publishedIds.map(id => sql`${id}`), sql`, `)})`
              : sql`1=1`
          )
        )
        .orderBy(desc(libraryItems.createdAt))
        .limit(remaining)

      return [
        ...publishedItems.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          publishedAt: item.publishedAt,
          createdAt: item.createdAt,
          metrics: item.metrics as TopContentItem["metrics"],
        })),
        ...recentItems.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          status: item.status,
          publishedAt: item.publishedAt,
          createdAt: item.createdAt,
          metrics: null,
        })),
      ]
    }

    return publishedItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      metrics: item.metrics as TopContentItem["metrics"],
    }))
  } catch (error) {
    console.error("[getTopContentAction] Error:", error)
    return []
  }
}

/**
 * Get platform breakdown
 *
 * Returns the count of published posts per platform
 * from the publishedPosts table.
 */
export async function getPlatformBreakdownAction(): Promise<PlatformBreakdownEntry[]> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return []
  }

  try {
    const result = await db
      .select({
        platform: publishedPosts.platform,
        count: sql<number>`count(*)::int`,
      })
      .from(publishedPosts)
      .where(
        and(
          eq(publishedPosts.userId, userId),
          isNull(publishedPosts.deletedAt)
        )
      )
      .groupBy(publishedPosts.platform)
      .orderBy(sql`count(*) DESC`)

    return result.map((r) => ({
      platform: r.platform,
      count: r.count,
    }))
  } catch (error) {
    console.error("[getPlatformBreakdownAction] Error:", error)
    return []
  }
}

/**
 * Get categories with item counts for analytics
 */
export async function getCategoryBreakdownAction(): Promise<
  Array<{ id: number; name: string; color: string | null; count: number }>
> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return []
  }

  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
        count: sql<number>`count(${libraryItems.id})::int`,
      })
      .from(categories)
      .leftJoin(
        libraryItems,
        and(
          eq(libraryItems.categoryId, categories.id),
          isNull(libraryItems.deletedAt)
        )
      )
      .where(eq(categories.userId, userId))
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(sql`count(${libraryItems.id}) DESC`)

    return result
  } catch (error) {
    console.error("[getCategoryBreakdownAction] Error:", error)
    return []
  }
}
