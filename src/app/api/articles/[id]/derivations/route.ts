/**
 * Article Derivations API
 *
 * POST /api/articles/:id/derivations — Generate cross-format derivations
 *   body: { formats: ["linkedin", "video_script", "carousel"], articleUrl?: string }
 *
 * GET /api/articles/:id/derivations — List derivations for an article
 *
 * PATCH /api/articles/:id/derivations — Update derivation content
 *   body: { derivationId: number, content: object }
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { articles, articleDerivations } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { deriveAllFormats } from "@/lib/article-services"
import type { DerivationFormat } from "@/lib/article-services"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 })
  }

  try {
    // Verify ownership
    const [article] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const derivations = await db
      .select()
      .from(articleDerivations)
      .where(eq(articleDerivations.articleId, articleId))

    return NextResponse.json({ derivations })
  } catch (error) {
    console.error("[Derivations API] GET Error:", error)
    return NextResponse.json({ error: "Failed to get derivations" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { formats, articleUrl } = body as { formats: DerivationFormat[]; articleUrl?: string }

    if (!formats?.length) {
      return NextResponse.json({ error: "At least one format required" }, { status: 400 })
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const content = article.finalContent || article.optimizedContent || article.assembledContent
    if (!content) {
      return NextResponse.json({ error: "No article content found" }, { status: 400 })
    }

    const model = article.model || "openrouter/google/gemini-2.0-flash-001"
    const url = articleUrl || article.referenceUrl || ""

    // Run all derivations in parallel
    const results = await deriveAllFormats({
      formats,
      articleContent: content,
      articleUrl: url,
      model,
    })

    // Save to DB
    const saved: any[] = []

    if (results.linkedin) {
      const [row] = await db.insert(articleDerivations).values({
        articleId,
        format: "linkedin" as any,
        content: results.linkedin as any,
      }).returning()
      saved.push(row)
    }

    if (results.videoScript) {
      const [row] = await db.insert(articleDerivations).values({
        articleId,
        format: "video_script" as any,
        content: results.videoScript as any,
      }).returning()
      saved.push(row)
    }

    if (results.carousel) {
      const [row] = await db.insert(articleDerivations).values({
        articleId,
        format: "carousel" as any,
        content: results.carousel as any,
      }).returning()
      saved.push(row)
    }

    return NextResponse.json({
      derivations: saved,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error("[Derivations API] POST Error:", error)
    return NextResponse.json({ error: "Failed to generate derivations" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { derivationId, content } = body as { derivationId: number; content: any }

    // Verify ownership
    const [article] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const [updated] = await db
      .update(articleDerivations)
      .set({
        content: content as any,
        status: "edited" as any,
        updatedAt: new Date(),
      })
      .where(and(
        eq(articleDerivations.id, derivationId),
        eq(articleDerivations.articleId, articleId),
      ))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Derivation not found" }, { status: 404 })
    }

    return NextResponse.json({ derivation: updated })
  } catch (error) {
    console.error("[Derivations API] PATCH Error:", error)
    return NextResponse.json({ error: "Failed to update derivation" }, { status: 500 })
  }
}
