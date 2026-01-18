/**
 * API Route for individual calendar posts
 *
 * PATCH /api/calendar/posts/[id] - Update a post
 * DELETE /api/calendar/posts/[id] - Delete a post
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  updatePostAction,
  deletePostAction,
} from "@/app/(app)/calendar/actions/calendar-actions"

export async function PATCH(
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

  const { id } = await params

  try {
    const body = await request.json()
    const result = await updatePostAction(Number(id), body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update post" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const result = await deletePostAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 }
    )
  }
}
