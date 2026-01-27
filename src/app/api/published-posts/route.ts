/**
 * API Routes for Published Posts
 *
 * GET /api/published-posts - List published posts with filters
 * POST /api/published-posts - Create a new published post
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { publishedPosts } from "@/db/schema"
import { eq, and, gte, lte, isNull, desc, inArray } from "drizzle-orm"

/**
 * GET /api/published-posts
 *
 * Query params:
 * - status: "scheduled" | "pending" | "processing" | "published" | "failed" | "cancelled"
 * - platform: "instagram" | "facebook"
 * - startDate: ISO date
 * - endDate: ISO date
 * - libraryItemId: number (filter by library item)
 *
 * @example
 * GET /api/published-posts?status=scheduled&platform=instagram&startDate=2026-01-01&endDate=2026-01-31
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const platform = searchParams.get("platform")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const libraryItemId = searchParams.get("libraryItemId")

    // Build conditions array
    const conditions: unknown[] = [
      eq(publishedPosts.userId, userId),
      isNull(publishedPosts.deletedAt),
    ]

    // Add optional filters
    if (status) {
      conditions.push(eq(publishedPosts.status, status as any))
    }

    if (platform) {
      conditions.push(eq(publishedPosts.platform, platform as any))
    }

    if (libraryItemId) {
      conditions.push(eq(publishedPosts.libraryItemId, parseInt(libraryItemId)))
    }

    // Date range filters - only apply if scheduledFor is not null
    if (startDate) {
      conditions.push(
        gte(publishedPosts.scheduledFor!, new Date(startDate))
      )
    }

    if (endDate) {
      conditions.push(
        lte(publishedPosts.scheduledFor!, new Date(endDate))
      )
    }

    const posts = await db
      .select()
      .from(publishedPosts)
      .where(and(...conditions as any[]))
      .orderBy(desc(publishedPosts.scheduledFor))

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error fetching posts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch published posts" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/published-posts
 *
 * Create a new published post entry.
 *
 * Body:
 * - libraryItemId?: number - Optional library item reference
 * - platform: "instagram" | "facebook"
 * - status: "scheduled" | "pending" | "processing" | "published" | "failed"
 * - scheduledFor?: string - ISO datetime
 * - caption?: string - Post caption/message
 * - mediaUrl?: string - JSON array of media URLs
 * - mediaType?: "text" | "image" | "carousel" | "video" | "story"
 *
 * @example
 * POST /api/published-posts
 * {
 *   "libraryItemId": 123,
 *   "platform": "instagram",
 *   "status": "scheduled",
 *   "scheduledFor": "2026-01-30T14:00:00Z",
 *   "caption": "My post caption #hashtag"
 * }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const {
      libraryItemId,
      platform,
      status = "scheduled",
      scheduledFor,
      caption,
      mediaUrl,
      mediaType,
    } = body

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { success: false, error: "Platform is required" },
        { status: 400 }
      )
    }

    // Validate scheduledFor date for scheduled posts
    if (status === "scheduled" && scheduledFor) {
      // Date objects internally store UTC timestamps, so comparison is correct
      // regardless of timezone. Both scheduledFor (ISO string) and now() are UTC-aware.
      const scheduledDate = new Date(scheduledFor)
      const now = new Date()

      if (scheduledDate <= now) {
        return NextResponse.json(
          { success: false, error: "Scheduled date must be in the future" },
          { status: 400 }
        )
      }
    }

    // Create published post
    const [publishedPost] = await db
      .insert(publishedPosts)
      .values({
        userId,
        libraryItemId: libraryItemId || null,
        platform,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        caption: caption || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      post: publishedPost,
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error creating post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create published post" },
      { status: 500 }
    )
  }
}
