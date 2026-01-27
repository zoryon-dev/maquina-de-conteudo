/**
 * API Route for library categories
 *
 * GET /api/library/categories - Fetch all categories for the current user
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCategoriesAction } from "@/app/(app)/library/actions/library-actions"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await getCategoriesAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}
