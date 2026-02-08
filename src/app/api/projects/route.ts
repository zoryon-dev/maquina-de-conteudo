/**
 * Projects API
 *
 * GET /api/projects — List user's projects
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { projects } from "@/db/schema"
import { eq, isNull } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"

export async function GET() {
  const userId = await ensureAuthenticatedUser()

  try {
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        siteUrl: projects.siteUrl,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.userId, userId))

    return NextResponse.json({ projects: userProjects })
  } catch (error) {
    console.error("[Projects API] Error:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}
