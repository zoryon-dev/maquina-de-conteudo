/**
 * Article Extension API
 *
 * POST /api/articles/:id/extend — Trigger extension pipeline stages
 *   body: { stage: "diagnose" | "plan" | "expand", ... }
 *
 * GET /api/articles/:id/extend — Get extension data (diagnosis, plan, expanded)
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { articles } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { parseJSONB } from "@/lib/article-services/services/pipeline.service"
import {
  diagnoseArticle,
  planExpansion,
  expandArticle,
} from "@/lib/article-services"
import type { SiteUrlMapEntry } from "@/lib/article-services"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 })
  }

  try {
    const [article] = await db
      .select({
        id: articles.id,
        extensionDiagnosis: articles.extensionDiagnosis,
        extensionPlan: articles.extensionPlan,
        extensionExpandedContent: articles.extensionExpandedContent,
      })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    return NextResponse.json({
      diagnosis: article.extensionDiagnosis ? parseJSONB(article.extensionDiagnosis) : null,
      plan: article.extensionPlan ? parseJSONB(article.extensionPlan) : null,
      expandedContent: article.extensionExpandedContent ?? null,
    })
  } catch (error) {
    console.error("[Article Extension API] GET Error:", error)
    return NextResponse.json({ error: "Failed to get extension data" }, { status: 500 })
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
    const { stage } = body as { stage: string }

    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    const model = article.model || "openrouter/google/gemini-2.0-flash-001"

    if (stage === "diagnose") {
      const { competitorArticles, targetKeyword, siteUrlMap } = body as {
        competitorArticles: string;
        targetKeyword: string;
        siteUrlMap?: SiteUrlMapEntry[];
      }

      const content = article.finalContent || article.optimizedContent || article.assembledContent
      if (!content) {
        return NextResponse.json({ error: "No article content found" }, { status: 400 })
      }

      const result = await diagnoseArticle({
        originalArticle: content,
        originalUrl: article.referenceUrl || "",
        competitorArticles: competitorArticles || "[]",
        targetKeyword: targetKeyword || article.primaryKeyword || "",
        siteUrlMap,
        model,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      await db.update(articles).set({
        extensionDiagnosis: result.data as any,
      }).where(eq(articles.id, articleId))

      return NextResponse.json({ diagnosis: result.data })
    }

    if (stage === "plan") {
      const diagnosis = parseJSONB(article.extensionDiagnosis)
      if (!diagnosis) {
        return NextResponse.json({ error: "No diagnosis found. Run diagnose first." }, { status: 400 })
      }

      const content = article.finalContent || article.optimizedContent || article.assembledContent
      if (!content) {
        return NextResponse.json({ error: "No article content found" }, { status: 400 })
      }

      const result = await planExpansion({
        originalArticle: content,
        diagnosis: JSON.stringify(diagnosis),
        targetKeyword: article.primaryKeyword || "",
        model,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      await db.update(articles).set({
        extensionPlan: result.data as any,
      }).where(eq(articles.id, articleId))

      return NextResponse.json({ plan: result.data })
    }

    if (stage === "expand") {
      const { selectedFixes } = body as { selectedFixes: string[] }
      const plan = parseJSONB(article.extensionPlan)
      if (!plan) {
        return NextResponse.json({ error: "No expansion plan found. Run plan first." }, { status: 400 })
      }

      const content = article.finalContent || article.optimizedContent || article.assembledContent
      if (!content) {
        return NextResponse.json({ error: "No article content found" }, { status: 400 })
      }

      const result = await expandArticle({
        originalArticle: content,
        selectedFixes: selectedFixes || [],
        expansionPlan: JSON.stringify(plan),
        targetKeyword: article.primaryKeyword || "",
        secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
        model,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      await db.update(articles).set({
        extensionExpandedContent: result.data.expandedArticle,
        finalContent: result.data.expandedArticle,
        finalWordCount: result.data.metricsAfter.totalWordCount,
      }).where(eq(articles.id, articleId))

      return NextResponse.json({ expansion: result.data })
    }

    return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
  } catch (error) {
    console.error("[Article Extension API] POST Error:", error)
    return NextResponse.json({ error: "Extension operation failed" }, { status: 500 })
  }
}
