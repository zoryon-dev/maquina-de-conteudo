/**
 * API Route for re-embedding a document
 *
 * POST /api/sources/documents/[id]/reembed - Queue a document for re-embedding
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { reembedDocumentAction } from "@/app/(app)/sources/actions/sources-actions"

export async function POST(
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
    const { force } = body as { force?: boolean }

    const result = await reembedDocumentAction(Number(id), force ?? true)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error re-embedding document:", error)
    return NextResponse.json(
      { success: false, error: "Failed to queue re-embedding job" },
      { status: 500 }
    )
  }
}
