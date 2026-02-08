/**
 * MDX Export API
 *
 * GET /api/articles/:id/export-mdx — Download article as .mdx file
 *
 * Query params:
 * - blogCategory: "ia-negocios" | "carreira-formacao" | "mercado-tendencias" | "agentes-automacao"
 * - blogAuthor: string (default: "jonas-kessler")
 * - featured: "true" | "false"
 * - draft: "true" | "false"
 */

import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { buildMdxExport } from "@/lib/article-services"
import type { BlogCategory, MdxExportOptions } from "@/lib/article-services"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_CATEGORIES: BlogCategory[] = [
  "ia-negocios",
  "carreira-formacao",
  "mercado-tendencias",
  "agentes-automacao",
]

export async function GET(request: Request, { params }: RouteContext) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return new Response(JSON.stringify({ error: "Invalid article ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(request.url)
  const options: MdxExportOptions = {}

  const blogCategory = url.searchParams.get("blogCategory")
  if (blogCategory && VALID_CATEGORIES.includes(blogCategory as BlogCategory)) {
    options.blogCategory = blogCategory as BlogCategory
  }

  const blogAuthor = url.searchParams.get("blogAuthor")
  if (blogAuthor) {
    options.blogAuthor = blogAuthor
  }

  const featured = url.searchParams.get("featured")
  if (featured === "true") options.featured = true
  if (featured === "false") options.featured = false

  const draft = url.searchParams.get("draft")
  if (draft === "true") options.draft = true
  if (draft === "false") options.draft = false

  try {
    const { mdxContent, filename } = await buildMdxExport(
      articleId,
      userId,
      options,
    )

    return new Response(mdxContent, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na exportação"
    console.error("[MDX Export API] Error:", error)

    const status = message.includes("não encontrado") ? 404
      : message.includes("não possui conteúdo") ? 400
      : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}
