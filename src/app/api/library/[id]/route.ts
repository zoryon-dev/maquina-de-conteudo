/**
 * API Route for individual library items
 *
 * PATCH /api/library/[id] - Update a library item
 * DELETE /api/library/[id] - Delete a library item
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  updateLibraryItemAction,
  deleteLibraryItemAction,
} from "@/app/(app)/library/actions/library-actions"

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
    const result = await updateLibraryItemAction(Number(id), body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating library item:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update library item" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const result = await deleteLibraryItemAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting library item:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete library item" },
      { status: 500 }
    )
  }
}
