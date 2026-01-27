/**
 * API Routes for settings documents
 *
 * GET /api/settings/documents - Get documents for current user
 * POST /api/settings/documents - Upload a new document
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getDocumentsAction,
  uploadDocumentAction,
} from "@/app/(app)/settings/actions/save-settings"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const documents = await getDocumentsAction()
    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const result = await uploadDocumentAction(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { success: false, error: "Failed to upload document" },
      { status: 500 }
    )
  }
}
