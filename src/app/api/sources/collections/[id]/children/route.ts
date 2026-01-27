/**
 * API Routes for child collections
 *
 * GET /api/sources/collections/[id]/children - Fetch child collections
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getChildCollectionsAction } from "@/app/(app)/sources/actions/collections-actions"

export async function GET(
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

  const { id: parentId } = await params

  try {
    const result = await getChildCollectionsAction(Number(parentId))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching child collections:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch child collections" },
      { status: 500 }
    )
  }
}
