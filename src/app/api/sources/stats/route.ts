/**
 * API Route for sources statistics
 *
 * GET /api/sources/stats - Fetch document statistics
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDocumentStatsAction } from "@/app/(app)/sources/actions/sources-actions"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await getDocumentStatsAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
