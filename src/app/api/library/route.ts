/**
 * API Route for library items
 *
 * GET /api/library - Fetch library items with filters
 * POST /api/library - Create a new library item
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getLibraryItemsAction,
  createLibraryItemAction,
} from "@/app/(app)/library/actions/library-actions"

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)

    // Parse filters from query params
    const filters: Record<string, unknown> = {}
    const types = searchParams.get("types")
    if (types) {
      filters.types = types.split(",")
    }
    const statuses = searchParams.get("statuses")
    if (statuses) {
      filters.statuses = statuses.split(",")
    }
    const categories = searchParams.get("categories")
    if (categories) {
      filters.categories = categories.split(",").map(Number)
    }
    const search = searchParams.get("search")
    if (search) {
      filters.search = search
    }

    // Parse view mode
    const viewMode = {
      mode: (searchParams.get("viewMode") ?? "grid") as "grid" | "list",
      sortBy: (searchParams.get("sortBy") ?? "createdAt") as "createdAt" | "updatedAt" | "title" | "scheduledFor",
      sortOrder: (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc",
    }

    const result = await getLibraryItemsAction(filters, viewMode)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching library items:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch library items" },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await _request.json()
    const result = await createLibraryItemAction(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating library item:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create library item" },
      { status: 500 }
    )
  }
}
