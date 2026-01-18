/**
 * API Routes for individual collection management
 *
 * PATCH /api/sources/collections/[id] - Update a collection
 * DELETE /api/sources/collections/[id] - Delete a collection
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  updateCollectionAction,
  deleteCollectionAction,
} from "@/app/(app)/sources/actions/collections-actions"

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
    const result = await updateCollectionAction(Number(id), body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating collection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update collection" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const result = await deleteCollectionAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting collection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete collection" },
      { status: 500 }
    )
  }
}
