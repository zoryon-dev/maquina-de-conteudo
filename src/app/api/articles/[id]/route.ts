/**
 * Article Wizard — Single Article API Route
 *
 * GET    /api/articles/:id  → Get article details
 * PATCH  /api/articles/:id  → Update article fields
 * DELETE /api/articles/:id  → Soft-delete article
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, articleCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("[Articles API] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get article" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Allowed updatable fields
    const updatableFields = [
      "title",
      "primaryKeyword",
      "secondaryKeywords",
      "articleType",
      "targetWordCount",
      "referenceUrl",
      "referenceMotherUrl",
      "customInstructions",
      "authorName",
      "model",
      "modelConfig",
      "currentStep",
      "selectedOutlineId",
      "finalTitle",
      "projectId",
      "status",
      "categoryId",
      "assembledContent",
      "generatedOutlines",
    ] as const;

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, articleId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Articles API] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Soft delete (set deletedAt)
    const [deleted] = await db
      .update(articles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId))
      .returning();

    return NextResponse.json({ success: true, article: deleted });
  } catch (error) {
    console.error("[Articles API] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
