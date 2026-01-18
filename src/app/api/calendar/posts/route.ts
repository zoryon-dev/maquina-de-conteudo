/**
 * API Route for calendar posts
 *
 * GET /api/calendar/posts - Fetch calendar posts with filters
 * POST /api/calendar/posts - Create a new post
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getCalendarPostsAction,
  createPostAction,
} from "@/app/(app)/calendar/actions/calendar-actions"

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

    // Parse date range from query params
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!start || !end) {
      return NextResponse.json(
        { success: false, error: "Missing start or end date" },
        { status: 400 }
      )
    }

    const dateRange = {
      start: new Date(start),
      end: new Date(end),
    }

    // Parse filters from query params
    const filters: Record<string, unknown> = {}
    const platforms = searchParams.get("platforms")
    if (platforms) {
      filters.platforms = platforms.split(",")
    }
    const statuses = searchParams.get("statuses")
    if (statuses) {
      filters.statuses = statuses.split(",")
    }
    const types = searchParams.get("types")
    if (types) {
      filters.types = types.split(",")
    }

    const result = await getCalendarPostsAction(dateRange, filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching calendar posts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendar posts" },
      { status: 500 }
    )
  }
}

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
    const result = await createPostAction(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    )
  }
}
