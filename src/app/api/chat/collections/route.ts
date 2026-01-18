/**
 * API Route for creating conversation collections
 *
 * POST /api/chat/collections
 * Creates a new collection/folder for conversations
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createCollectionAction } from "@/app/(app)/chat/actions/collection-actions"

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
    const result = await createCollectionAction(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating collection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create collection" },
      { status: 500 }
    )
  }
}
