/**
 * Library Item Detail Page
 *
 * Server Component que busca os dados do item e renderiza a página de detalhes.
 * Rota: /library/[id]
 */

import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getLibraryItemAction } from "../actions/library-actions"
import { LibraryDetailPage } from "./components/library-detail-page"

// ============================================================================
// INTERFACE PROPS
// ============================================================================

interface LibraryDetailPageProps {
  params: Promise<{ id: string }>
}

// ============================================================================
// GENERATE METADATA
// ============================================================================

export async function generateMetadata(
  props: LibraryDetailPageProps
): Promise<Metadata> {
  const { id } = await props.params
  const item = await getLibraryItemAction(Number(id))

  if (!item) {
    return {
      title: "Conteúdo não encontrado",
    }
  }

  const title = item.title || `Conteúdo ${item.type}`
  const description = item.content
    ? `${item.content.slice(0, 160)}...`
    : "Visualize e gerencie este conteúdo da biblioteca."

  return {
    title: `${title} | Biblioteca`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  }
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function LibraryDetailRootPage(props: LibraryDetailPageProps) {
  const { id } = await props.params
  const item = await getLibraryItemAction(Number(id))

  if (!item) {
    notFound()
  }

  // Parse mediaUrl if it's a JSON string
  let mediaUrls: string[] = []
  if (item.mediaUrl) {
    try {
      const parsed = JSON.parse(item.mediaUrl)
      mediaUrls = Array.isArray(parsed) ? parsed : []
    } catch {
      // If not valid JSON, try as single URL
      mediaUrls = item.mediaUrl ? [item.mediaUrl] : []
    }
  }

  // Parse content for carousel slides
  // Handles both Visual Studio format (content as object) and legacy format (content as string)
  let carouselSlides: Array<{ title?: string; content: string; imagePrompt?: string }> = []
  if (item.type === "carousel" && item.content) {
    try {
      const parsed = JSON.parse(item.content)
      if (parsed.slides && Array.isArray(parsed.slides)) {
        carouselSlides = parsed.slides.map((slide: any) => {
          // Visual Studio format: content is an object with texto1, texto2, etc.
          if (slide.content && typeof slide.content === "object") {
            const textParts: string[] = []
            if (slide.content.texto1) textParts.push(slide.content.texto1)
            if (slide.content.texto2) textParts.push(slide.content.texto2)
            if (slide.content.texto3) textParts.push(slide.content.texto3)
            return {
              title: slide.content.texto1 || slide.title,
              content: textParts.join("\n\n") || "Slide sem texto",
              imagePrompt: slide.imagePrompt,
            }
          }
          // Legacy format: content is already a string
          return {
            title: slide.title,
            content: typeof slide.content === "string" ? slide.content : "Slide sem texto",
            imagePrompt: slide.imagePrompt,
          }
        })
      }
    } catch {
      // Not valid carousel JSON
    }
  }

  return (
    <LibraryDetailPage
      item={item}
      mediaUrls={mediaUrls}
      carouselSlides={carouselSlides}
    />
  )
}
