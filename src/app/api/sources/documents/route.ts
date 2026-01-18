/**
 * API Routes for sources documents
 *
 * GET /api/sources/documents - Fetch documents with optional collection filter
 * DELETE /api/sources/documents - Batch delete documents
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getDocumentsByCollectionAction,
  batchDeleteDocumentsAction,
} from "@/app/(app)/sources/actions/sources-actions"

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get("collectionId")

    const result = await getDocumentsByCollectionAction(
      collectionId ? Number(collectionId) : null
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { documentIds } = body as { documentIds: number[] }

    const result = await batchDeleteDocumentsAction(documentIds)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting documents:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete documents" },
      { status: 500 }
    )
  }
}
