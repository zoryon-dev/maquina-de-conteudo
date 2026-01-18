/**
 * API Route for creating conversations
 *
 * POST /api/chat/conversations
 * Creates a new conversation for the authenticated user
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createConversationAction } from "@/app/(app)/chat/actions/chat-actions"

export async function POST() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await createConversationAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}
