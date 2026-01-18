/**
 * API Route for individual source documents
 *
 * PATCH /api/sources/documents/[id] - Update a document
 * DELETE /api/sources/documents/[id] - Delete a document with embeddings
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  updateDocumentAction,
  deleteDocumentWithEmbeddingsAction,
} from "@/app/(app)/sources/actions/sources-actions"

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
    const result = await updateDocumentAction(Number(id), body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update document" },
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
    const result = await deleteDocumentWithEmbeddingsAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
