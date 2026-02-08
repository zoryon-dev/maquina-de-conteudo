/**
 * Articles List Page
 *
 * Server Component that renders the ArticlesListPage client component.
 */

import type { Metadata } from "next"
import { ArticlesListPage } from "./components/articles-list-page"

export const metadata: Metadata = {
  title: "Artigos",
  description: "Crie e gerencie artigos otimizados para SEO com IA.",
}

export default function ArticlesPage() {
  return <ArticlesListPage />
}
