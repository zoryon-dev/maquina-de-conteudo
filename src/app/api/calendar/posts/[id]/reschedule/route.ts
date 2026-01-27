/**
 * API Route for rescheduling a calendar post
 *
 * POST /api/calendar/posts/[id]/reschedule - Reschedule a post to a new date
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { reschedulePostAction } from "@/app/(app)/calendar/actions/calendar-actions"

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
    const { newDate } = body as { newDate: string }

    if (!newDate) {
      return NextResponse.json(
        { success: false, error: "Missing newDate" },
        { status: 400 }
      )
    }

    const result = await reschedulePostAction(Number(id), new Date(newDate))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error rescheduling post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reschedule post" },
      { status: 500 }
    )
  }
}
