/**
 * API Routes for sources collections
 *
 * GET /api/sources/collections - Fetch all collections
 * POST /api/sources/collections - Create a new collection
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getCollectionsAction,
  createCollectionAction,
} from "@/app/(app)/sources/actions/collections-actions"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const result = await getCollectionsAction()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching collections:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch collections" },
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
    console.log("Creating collection with data:", body)
    const result = await createCollectionAction(body)
    console.log("Collection creation result:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating collection:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 500 }
    )
  }
}
