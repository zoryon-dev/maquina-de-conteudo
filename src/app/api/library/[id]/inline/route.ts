/**
 * API Route for inline update of library items
 *
 * PATCH /api/library/[id]/inline
 * Updates a single field of a library item (e.g., title)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { inlineUpdateLibraryItemAction } from "@/app/(app)/library/actions/library-actions"

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
  const body = await request.json()
  const { field, value } = body

  // Runtime validation — TypeScript `as` provides zero protection
  const ALLOWED_FIELDS = ["title", "status"] as const
  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json(
      { success: false, error: "Invalid field" },
      { status: 400 }
    )
  }
  if (typeof value !== "string") {
    return NextResponse.json(
      { success: false, error: "Invalid value" },
      { status: 400 }
    )
  }

  try {
    const result = await inlineUpdateLibraryItemAction(Number(id), field, value)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating library item:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update item" },
      { status: 500 }
    )
  }
}
