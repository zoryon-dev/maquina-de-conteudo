/**
 * Article Wizard — Submit Pipeline Stage
 *
 * POST /api/articles/:id/submit
 *
 * Triggers a specific pipeline stage for the article.
 * Each stage runs as an independent job in the worker queue.
 *
 * Body: { stage: "research" | "outline" | "section_production" | "assembly" | "seo_geo_check" | "optimization" }
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { createJob } from "@/lib/queue/jobs";
import { isQueueConfigured, triggerWorker } from "@/lib/queue/client";
import { JobType } from "@/lib/queue/types";

const STAGE_TO_JOB_TYPE: Record<string, JobType> = {
  research: JobType.ARTICLE_RESEARCH,
  outline: JobType.ARTICLE_OUTLINE,
  section_production: JobType.ARTICLE_SECTION_PRODUCTION,
  assembly: JobType.ARTICLE_ASSEMBLY,
  seo_geo_check: JobType.ARTICLE_SEO_GEO_CHECK,
  optimization: JobType.ARTICLE_OPTIMIZATION,
};

const STAGE_TO_NEXT_STEP: Record<string, string> = {
  research: "research",
  outline: "outline",
  section_production: "production",
  assembly: "assembly",
  seo_geo_check: "seo_geo_check",
  optimization: "optimization",
};

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  if (!isQueueConfigured()) {
    return NextResponse.json(
      { error: "Queue system not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { stage } = body as { stage: string };

    if (!stage || !STAGE_TO_JOB_TYPE[stage]) {
      return NextResponse.json(
        {
          error: `Invalid stage. Must be one of: ${Object.keys(STAGE_TO_JOB_TYPE).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify ownership
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Create job
    const jobId = await createJob(userId, STAGE_TO_JOB_TYPE[stage], {
      articleId,
      userId,
    });

    // Update article with processing state
    await db
      .update(articles)
      .set({
        currentStep: STAGE_TO_NEXT_STEP[stage] as any,
        processingProgress: {
          stage,
          percent: 0,
          message: "Iniciando processamento...",
        },
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    // In development, trigger worker immediately
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      triggerWorker().catch((err) =>
        console.error("[Article Submit] Worker trigger error:", err),
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      stage,
      message: `Article ${stage} stage started`,
    });
  } catch (error) {
    console.error("[Articles API] Submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit article pipeline stage" },
      { status: 500 },
    );
  }
}
