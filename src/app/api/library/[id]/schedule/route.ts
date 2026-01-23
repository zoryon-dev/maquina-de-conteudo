/**
 * POST /api/library/[id]/schedule
 *
 * Agenda uma publicação de rede social para um item da biblioteca.
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems, scheduledPosts } from "@/db/schema"
import { eq } from "drizzle-orm"

interface ScheduleRequest {
  platform: string
  scheduledFor: string // ISO datetime
  message?: string // Currently not stored - schema needs metadata field
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const libraryItemId = parseInt(id)

  if (isNaN(libraryItemId)) {
    return NextResponse.json({ success: false, error: "Invalid library item ID" }, { status: 400 })
  }

  try {
    const body = await request.json() as ScheduleRequest
    const { platform, scheduledFor } = body

    // Validate required fields
    if (!platform || !scheduledFor) {
      return NextResponse.json({ success: false, error: "Platform and scheduledFor are required" }, { status: 400 })
    }

    // Validate the date is in the future
    const scheduledDate = new Date(scheduledFor)
    if (scheduledDate < new Date()) {
      return NextResponse.json({ success: false, error: "Scheduled date must be in the future" }, { status: 400 })
    }

    // Check if the library item exists and belongs to the user
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1)

    if (!item || item.userId !== userId) {
      return NextResponse.json({ success: false, error: "Library item not found" }, { status: 404 })
    }

    // Create the scheduled post
    const [scheduledPost] = await db
      .insert(scheduledPosts)
      .values({
        libraryItemId,
        platform,
        scheduledFor: scheduledDate,
        status: "pending",
      })
      .returning()

    // Update the library item status to scheduled
    await db
      .update(libraryItems)
      .set({ status: "scheduled" })
      .where(eq(libraryItems.id, libraryItemId))

    return NextResponse.json({
      success: true,
      scheduledPost,
    })
  } catch (error) {
    console.error("[SCHEDULE] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to schedule post" }, { status: 500 })
  }
}
