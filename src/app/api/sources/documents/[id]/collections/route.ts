/**
 * API Route for getting collections of a document
 *
 * GET /api/sources/documents/[id]/collections - Get collections for a document
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDocumentCollectionsAction } from "@/app/(app)/sources/actions/collections-actions"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id: documentId } = await params

  try {
    const result = await getDocumentCollectionsAction(Number(documentId))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching document collections:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch document collections" },
      { status: 500 }
    )
  }
}
