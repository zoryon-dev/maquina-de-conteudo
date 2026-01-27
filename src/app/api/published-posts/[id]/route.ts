/**
 * API Routes for Individual Published Post
 *
 * GET /api/published-posts/[id] - Get post details
 * PUT /api/published-posts/[id] - Update post (scheduledFor, caption, platform)
 * DELETE /api/published-posts/[id] - Cancel post (soft delete)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { publishedPosts } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"

/**
 * GET /api/published-posts/[id]
 *
 * Get details of a specific published post.
 *
 * @example
 * GET /api/published-posts/123
 */
export async function GET(
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

    const [post] = await db
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

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      post,
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error fetching post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch post" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/published-posts/[id]
 *
 * Update a published post.
 *
 * Body:
 * - scheduledFor?: string - New scheduled date/time
 * - caption?: string - New caption/message
 * - platform?: string - New platform
 * - status?: string - New status
 * - mediaUrl?: string - New media URLs
 *
 * @example
 * PUT /api/published-posts/123
 * {
 *   "scheduledFor": "2026-02-01T14:00:00Z",
 *   "caption": "Updated caption"
 * }
 */
export async function PUT(
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

    // Don't allow editing already published posts
    if (existing.status === "published") {
      return NextResponse.json(
        { success: false, error: "Cannot edit published post" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      scheduledFor,
      caption,
      platform,
      status,
      mediaUrl,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (scheduledFor !== undefined) {
      const newDate = new Date(scheduledFor)
      if (newDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "Scheduled date must be in the future" },
          { status: 400 }
        )
      }
      updateData.scheduledFor = newDate
      // If changing scheduledFor, also update status to scheduled
      updateData.status = "scheduled"
    }

    if (caption !== undefined) {
      updateData.caption = caption
    }

    if (platform) {
      updateData.platform = platform
    }

    if (status) {
      updateData.status = status
    }

    if (mediaUrl !== undefined) {
      updateData.mediaUrl = mediaUrl
    }

    const [updated] = await db
      .update(publishedPosts)
      .set(updateData)
      .where(eq(publishedPosts.id, postId))
      .returning()

    return NextResponse.json({
      success: true,
      post: updated,
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error updating post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update post" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/published-posts/[id]
 *
 * Cancel a published post (soft delete).
 *
 * This sets:
 * - status = "cancelled"
 * - deletedAt = current timestamp
 *
 * @example
 * DELETE /api/published-posts/123
 */
export async function DELETE(
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

    // Soft delete (set status to cancelled and deletedAt to now)
    const [result] = await db
      .update(publishedPosts)
      .set({
        status: "cancelled",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(publishedPosts.id, postId),
          eq(publishedPosts.userId, userId)
        )
      )
      .returning()

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Post cancelled successfully",
    })
  } catch (error) {
    console.error("[PUBLISHED_POSTS] Error deleting post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cancel post" },
      { status: 500 }
    )
  }
}
