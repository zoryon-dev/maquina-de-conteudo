/**
 * API Routes for individual conversation operations
 *
 * PATCH /api/chat/conversations/[id] - Update conversation (rename, move)
 * DELETE /api/chat/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
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
    const chatId = Number(id)
    const body = await request.json()

    // Import server actions dynamically
    const { updateConversationTitleAction, moveConversationToCollectionAction } =
      await import("@/app/(app)/chat/actions/chat-actions")

    // Handle rename
    if (body.title !== undefined) {
      const result = await updateConversationTitleAction(chatId, body.title)
      return NextResponse.json(result)
    }

    // Handle move to collection
    if (body.collectionId !== undefined) {
      const result = await moveConversationToCollectionAction(chatId, body.collectionId)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { success: false, error: "No valid update field provided" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating conversation:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
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
    const chatId = Number(id)

    // Import server action dynamically
    const { deleteConversationAction } = await import("@/app/(app)/chat/actions/chat-actions")

    const result = await deleteConversationAction(chatId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}
