/**
 * API Routes for document collection items
 *
 * POST /api/sources/collections/[id]/documents/[documentId] - Add document to collection
 * DELETE /api/sources/collections/[id]/documents/[documentId] - Remove document from collection
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  addDocumentToCollectionAction,
  removeDocumentFromCollectionAction,
} from "@/app/(app)/sources/actions/collections-actions"

// Add document to collection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id: collectionId, documentId } = await params

  try {
    const result = await addDocumentToCollectionAction(
      Number(documentId),
      Number(collectionId)
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error adding document to collection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add document to collection" },
      { status: 500 }
    )
  }
}

// Remove document from collection
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id: collectionId, documentId } = await params

  try {
    const result = await removeDocumentFromCollectionAction(
      Number(documentId),
      Number(collectionId)
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error removing document from collection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to remove document from collection" },
      { status: 500 }
    )
  }
}
