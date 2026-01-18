/**
 * API Route for library tags
 *
 * GET /api/library/tags - Fetch all tags for the current user
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getTagsAction } from "@/app/(app)/library/actions/library-actions"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await getTagsAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tags" },
      { status: 500 }
    )
  }
}
