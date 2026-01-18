/**
 * API Route for document embeddings
 *
 * GET /api/documents/[id]/embeddings - Fetch embeddings for a document
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDocumentEmbeddingsAction } from "@/app/(app)/sources/actions/sources-actions"

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

  const { id } = await params

  try {
    const result = await getDocumentEmbeddingsAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching document embeddings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch embeddings" },
      { status: 500 }
    )
  }
}
