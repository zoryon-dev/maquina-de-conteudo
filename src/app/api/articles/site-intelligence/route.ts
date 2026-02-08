/**
 * Site Intelligence — CRUD API Route
 *
 * GET  /api/articles/site-intelligence?projectId=X  → Get SI data for project
 * POST /api/articles/site-intelligence              → Create/update SI config
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { siteIntelligence, projects } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"

export async function GET(request: Request) {
  const userId = await ensureAuthenticatedUser()

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, parseInt(projectId, 10)), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const [si] = await db
      .select()
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, project.id))
      .limit(1)

    return NextResponse.json({ siteIntelligence: si ?? null })
  } catch (error) {
    console.error("[SI API] Get error:", error)
    return NextResponse.json({ error: "Failed to get site intelligence" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await ensureAuthenticatedUser()

  try {
    const body = await request.json()
    const { projectId, siteUrl, competitorUrls } = body

    if (!projectId || !siteUrl) {
      return NextResponse.json(
        { error: "projectId and siteUrl are required" },
        { status: 400 },
      )
    }

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if SI already exists for this project
    const [existing] = await db
      .select()
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, projectId))
      .limit(1)

    if (existing) {
      // Update
      const [updated] = await db
        .update(siteIntelligence)
        .set({
          siteUrl,
          competitorUrls: competitorUrls ?? existing.competitorUrls,
          updatedAt: new Date(),
        })
        .where(eq(siteIntelligence.id, existing.id))
        .returning()

      return NextResponse.json(updated)
    }

    // Create
    const [created] = await db
      .insert(siteIntelligence)
      .values({
        projectId,
        siteUrl,
        competitorUrls: competitorUrls ?? [],
        status: "pending",
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[SI API] Create/update error:", error)
    return NextResponse.json({ error: "Failed to save site intelligence" }, { status: 500 })
  }
}
