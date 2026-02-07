/**
 * Article Wizard — CRUD API Route
 *
 * POST /api/articles   → Create new article
 * GET  /api/articles   → List user articles (with filters)
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import type { ArticleWizardStep } from "@/db/schema";

export async function POST(request: Request) {
  const userId = await ensureAuthenticatedUser();

  try {
    const body = await request.json();
    const {
      projectId,
      title,
      primaryKeyword,
      secondaryKeywords,
      articleType,
      targetWordCount,
      referenceUrl,
      referenceMotherUrl,
      customInstructions,
      authorName,
      model,
      modelConfig,
    } = body;

    if (!primaryKeyword) {
      return NextResponse.json(
        { error: "primaryKeyword is required" },
        { status: 400 },
      );
    }

    // Validate project ownership if provided
    if (projectId) {
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .limit(1);

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or unauthorized" },
          { status: 404 },
        );
      }
    }

    const [article] = await db
      .insert(articles)
      .values({
        userId,
        projectId: projectId ?? null,
        title: title ?? null,
        primaryKeyword,
        secondaryKeywords: secondaryKeywords ?? null,
        articleType: articleType || "guia",
        targetWordCount: targetWordCount || 2000,
        referenceUrl: referenceUrl ?? null,
        referenceMotherUrl: referenceMotherUrl ?? null,
        customInstructions: customInstructions ?? null,
        authorName: authorName ?? null,
        model: model ?? null,
        modelConfig: modelConfig ?? null,
        currentStep: "inputs",
      })
      .returning();

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("[Articles API] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const userId = await ensureAuthenticatedUser();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const step = searchParams.get("step") as ArticleWizardStep | null;
    const projectId = searchParams.get("projectId");

    const conditions = [eq(articles.userId, userId)];

    if (step) {
      conditions.push(eq(articles.currentStep, step));
    }
    if (projectId) {
      conditions.push(eq(articles.projectId, parseInt(projectId, 10)));
    }

    const result = await db
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      articles: result,
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error("[Articles API] List error:", error);
    return NextResponse.json(
      { error: "Failed to list articles" },
      { status: 500 },
    );
  }
}
