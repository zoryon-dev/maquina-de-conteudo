/**
 * API Route for duplicating a calendar post
 *
 * POST /api/calendar/posts/[id]/duplicate - Duplicate a post
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { duplicatePostAction } from "@/app/(app)/calendar/actions/calendar-actions"

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

  const { id } = await params

  try {
    const body = await request.json()
    const { newScheduledFor } = body as { newScheduledFor?: string }

    const result = await duplicatePostAction(
      Number(id),
      newScheduledFor ? new Date(newScheduledFor) : undefined
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error duplicating post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to duplicate post" },
      { status: 500 }
    )
  }
}
