/**
 * API Route for system status
 *
 * GET /api/settings/system-status - Get system status
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSystemStatusAction } from "@/app/(app)/settings/actions/system-status"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const status = await getSystemStatusAction()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error fetching system status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch system status" },
      { status: 500 }
    )
  }
}
