/**
 * API Route for deleting settings documents
 *
 * DELETE /api/settings/documents/[id] - Delete a document
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { deleteDocumentAction } from "@/app/(app)/settings/actions/save-settings"

export async function DELETE(
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
    const result = await deleteDocumentAction(Number(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
