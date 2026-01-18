/**
 * API Routes for root collections (no parent)
 *
 * GET /api/sources/collections/root - Fetch root collections
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getRootCollectionsAction } from "@/app/(app)/sources/actions/collections-actions"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await getRootCollectionsAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching root collections:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch root collections" },
      { status: 500 }
    )
  }
}
