/**
 * API Route for Rescheduling Published Posts
 *
 * POST /api/published-posts/[id]/reschedule - Reschedule post to new date
 *
 * This endpoint is used for drag & drop operations in the calendar.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { publishedPosts } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"

/**
 * POST /api/published-posts/[id]/reschedule
 *
 * Reschedule a published post to a new date/time.
 *
 * Body:
 * - scheduledFor: string - ISO datetime for new schedule
 *
 * @example
 * POST /api/published-posts/123/reschedule
 * { "scheduledFor": "2026-02-01T14:00:00Z" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const postId = parseInt(id)

    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, error: "Invalid post ID" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { scheduledFor } = body

    if (!scheduledFor) {
      return NextResponse.json(
        { success: false, error: "scheduledFor is required" },
        { status: 400 }
      )
    }

    const newDate = new Date(scheduledFor)

    // Validate date is in the future
    if (newDate < new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled date must be in the future" },
        { status: 400 }
      )
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(publishedPosts)
      .where(
        and(
          eq(publishedPosts.id, postId),
          eq(publishedPosts.userId, userId),
          isNull(publishedPosts.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      )
    }

    // Don't allow rescheduling already published posts
    if (existing.status === "published") {
      return NextResponse.json(
        { success: false, error: "Cannot reschedule published post" },
        { status: 400 }
      )
    }

    // Update scheduledFor and status
    const [updated] = await db
      .update(publishedPosts)
      .set({
        scheduledFor: newDate,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(publishedPosts.id, postId))
      .returning()

    return NextResponse.json({
      success: true,
      post: updated,
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error rescheduling post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reschedule post" },
      { status: 500 }
    )
  }
}
