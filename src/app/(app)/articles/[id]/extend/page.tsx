/**
 * Article Extension Mode — Entry Point
 *
 * Loads article and renders the extension wizard.
 */

import { redirect } from "next/navigation"
import { db } from "@/db"
import { articles } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { ExtensionWizard } from "../../components/extension/extension-wizard"

type PageProps = { params: Promise<{ id: string }> }

export default async function ArticleExtendPage({ params }: PageProps) {
  const userId = await ensureAuthenticatedUser()
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) redirect("/articles")

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      primaryKeyword: articles.primaryKeyword,
      finalContent: articles.finalContent,
      optimizedContent: articles.optimizedContent,
      assembledContent: articles.assembledContent,
    })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1)

  if (!article) redirect("/articles")

  const content = article.finalContent || article.optimizedContent || article.assembledContent || ""

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <p className="text-white/50">Este artigo não possui conteúdo para extensão.</p>
          <p className="text-sm text-white/30 mt-2">Complete o pipeline de criação primeiro.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{article.title || "Artigo sem título"}</h1>
        <p className="text-sm text-white/40 mt-1">Modo Extensão — Diagnosticar e expandir</p>
      </div>

      <ExtensionWizard
        articleId={article.id}
        articleContent={content}
        primaryKeyword={article.primaryKeyword || ""}
      />
    </div>
  )
}
