/**
 * POST /api/library/[id]/schedule
 *
 * Agenda uma publicação de rede social para um item da biblioteca.
 * Atualizado para usar publishedPosts com suporte a caption e mediaUrl.
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems, publishedPosts } from "@/db/schema"
import { eq } from "drizzle-orm"

interface ScheduleRequest {
  platform: string
  scheduledFor: string // ISO datetime
  message?: string // Custom caption/message - NOW SAVED!
  mediaUrls?: string[] // Media URLs for standalone posts
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
    const { platform, scheduledFor, message, mediaUrls } = body

    // Validate required fields
    if (!platform || !scheduledFor) {
      return NextResponse.json(
        { success: false, error: "Platform and scheduledFor are required" },
        { status: 400 }
      )
    }

    // Validate the date is in the future
    // Date objects internally store UTC timestamps, so comparison is correct
    // regardless of timezone. Both scheduledFor (ISO string) and now() are UTC-aware.
    const scheduledDate = new Date(scheduledFor)
    const now = new Date()

    if (scheduledDate <= now) {
      return NextResponse.json(
        { success: false, error: "A data de agendamento deve ser futura" },
        { status: 400 }
      )
    }

    // Check if the library item exists and belongs to the user
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1)

    if (!item || item.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Library item not found" },
        { status: 404 }
      )
    }

    // Create the published post (NEW: uses publishedPosts instead of scheduledPosts)
    const [publishedPost] = await db
      .insert(publishedPosts)
      .values({
        userId,
        libraryItemId,
        platform: platform as "instagram" | "facebook", // Cast to satisfy enum
        status: "scheduled",
        scheduledFor: scheduledDate,
        caption: message || null, // NEW: Saves custom message
        mediaUrl: mediaUrls && mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null, // NEW: Saves media URLs
        mediaType: item.type, // Inherit type from library item
      })
      .returning()

    // Update the library item status to scheduled
    await db
      .update(libraryItems)
      .set({ status: "scheduled" })
      .where(eq(libraryItems.id, libraryItemId))

    return NextResponse.json({
      success: true,
      publishedPost,
    })
  } catch (error) {
    console.error("[SCHEDULE] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to schedule post" },
      { status: 500 }
    )
  }
}
