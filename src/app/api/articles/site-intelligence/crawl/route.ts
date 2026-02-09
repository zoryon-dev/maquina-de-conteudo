/**
 * Site Intelligence — Crawl Trigger
 *
 * POST /api/articles/site-intelligence/crawl
 *
 * Triggers a crawl job for the specified project's site intelligence.
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { siteIntelligence, projects } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { validateExternalUrl, validateExternalUrls } from "@/lib/security/url-validator"
import { createJob } from "@/lib/queue/jobs"
import { isQueueConfigured, triggerWorker } from "@/lib/queue/client"
import { JobType } from "@/lib/queue/types"

export async function POST(request: Request) {
  const userId = await ensureAuthenticatedUser()

  if (!isQueueConfigured()) {
    return NextResponse.json({ error: "Queue system not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
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

    // Get or create SI record
    let [si] = await db
      .select()
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, projectId))
      .limit(1)

    if (!si) {
      if (!project.siteUrl) {
        return NextResponse.json(
          { error: "Project has no siteUrl configured" },
          { status: 400 },
        )
      }

      const [created] = await db
        .insert(siteIntelligence)
        .values({
          projectId,
          siteUrl: project.siteUrl,
          status: "crawling",
        })
        .returning()
      si = created
    } else {
      // Update status to crawling
      await db
        .update(siteIntelligence)
        .set({ status: "crawling", error: null, updatedAt: new Date() })
        .where(eq(siteIntelligence.id, si.id))
    }

    // SSRF protection: validate siteUrl before crawling
    const urlCheck = validateExternalUrl(si.siteUrl)
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `Invalid site URL: ${urlCheck.error}` }, { status: 400 })
    }

    // SSRF protection: validate competitor URLs
    if (si.competitorUrls?.length) {
      const competitorCheck = validateExternalUrls(si.competitorUrls, "competitor URL")
      if (!competitorCheck.valid) {
        return NextResponse.json({ error: competitorCheck.error }, { status: 400 })
      }
    }

    // Create crawl job
    const jobId = await createJob(userId, JobType.SITE_INTELLIGENCE_CRAWL as any, {
      siteIntelligenceId: si.id,
      projectId,
      siteUrl: si.siteUrl,
      competitorUrls: si.competitorUrls ?? [],
      userId,
    })

    // In dev, trigger worker
    const isDev = process.env.NODE_ENV === "development"
    if (isDev) {
      triggerWorker().catch((err) =>
        console.error("[SI Crawl] Worker trigger error:", err),
      )
    }

    return NextResponse.json({
      success: true,
      jobId,
      siteIntelligenceId: si.id,
      message: "Site crawl started",
    })
  } catch (error) {
    console.error("[SI API] Crawl trigger error:", error)
    return NextResponse.json({ error: "Failed to trigger crawl" }, { status: 500 })
  }
}
