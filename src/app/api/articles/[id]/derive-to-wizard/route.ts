/**
 * Derive-to-Wizard API
 *
 * POST /api/articles/:id/derive-to-wizard
 *   body: { derivationType: "social_post" | "video_script" | "carousel" }
 *   response: { wizardId: number, contentType: string }
 *
 * Uses AI (Gemini 3 Flash) to extract wizard fields from a completed article,
 * creates a new contentWizard with pre-filled fields, and returns the wizardId.
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { articles, contentWizards } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import {
  extractWizardFieldsFromArticle,
  type DerivationType,
} from "@/lib/article-services/services/derive-to-wizard.service"

const VALID_DERIVATION_TYPES = new Set<DerivationType>([
  "social_post",
  "video_script",
  "carousel",
])

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { derivationType } = body as { derivationType: string }

    if (!derivationType || !VALID_DERIVATION_TYPES.has(derivationType as DerivationType)) {
      return NextResponse.json(
        { error: "Invalid derivationType. Must be: social_post, video_script, or carousel" },
        { status: 400 }
      )
    }

    // Fetch article with ownership check
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Verify article has content
    const hasContent =
      article.finalContent || article.optimizedContent || article.assembledContent
    if (!hasContent) {
      return NextResponse.json(
        { error: "Article has no content yet. Complete the article pipeline first." },
        { status: 400 }
      )
    }

    // Extract wizard fields via AI
    const extraction = await extractWizardFieldsFromArticle({
      article,
      derivationType: derivationType as DerivationType,
    })

    if (!extraction.success) {
      return NextResponse.json(
        { error: extraction.error },
        { status: 500 }
      )
    }

    const fields = extraction.data

    // Create pre-filled wizard
    const [wizard] = await db
      .insert(contentWizards)
      .values({
        userId,
        currentStep: "input",
        contentType: fields.contentType,
        theme: fields.theme,
        context: fields.context,
        objective: fields.objective,
        cta: fields.cta,
        targetAudience: fields.targetAudience,
        negativeTerms: fields.negativeTerms,
        sourceArticleId: articleId,
        ...(fields.numberOfSlides ? { numberOfSlides: fields.numberOfSlides } : {}),
        ...(fields.videoDuration ? { videoDuration: fields.videoDuration } : {}),
      })
      .returning({ id: contentWizards.id })

    return NextResponse.json({
      wizardId: wizard.id,
      contentType: fields.contentType,
    })
  } catch (error) {
    console.error("[DeriveToWizard API] Error:", error)
    return NextResponse.json(
      { error: "Failed to derive wizard from article" },
      { status: 500 }
    )
  }
}
