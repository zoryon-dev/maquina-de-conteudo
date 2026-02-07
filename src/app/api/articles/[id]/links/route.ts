/**
 * Article Links API
 *
 * GET /api/articles/:id/links — Get interlinking suggestions for an article
 */

import { NextResponse } from "next/server"
import { db } from "@/db"
import { articles, articleLinks } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"

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

    const links = await db
      .select()
      .from(articleLinks)
      .where(eq(articleLinks.articleId, articleId))

    return NextResponse.json({ links })
  } catch (error) {
    console.error("[Article Links API] Error:", error)
    return NextResponse.json({ error: "Failed to get links" }, { status: 500 })
  }
}
