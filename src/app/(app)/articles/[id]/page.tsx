/**
 * Article Wizard Page — Individual Article
 *
 * Server Component that renders the Article Wizard for a specific article.
 */

import { ArticleWizardPage } from "../components/article-wizard-page"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params
  const articleId = parseInt(id, 10)

  if (isNaN(articleId)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/50">Artigo não encontrado</p>
      </div>
    )
  }

  return <ArticleWizardPage articleId={articleId} />
}
