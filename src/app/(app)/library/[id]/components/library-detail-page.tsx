/**
 * Library Detail Page Component
 *
 * Client Component principal que orquestra a visualização de detalhes
 * de um item da biblioteca. Layout 65/35 (Preview | Actions).
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Tag, Clock, Edit2, CalendarClock, Send, RefreshCw, Download, Expand } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS, STATUS_CONFIGS } from "@/types/calendar"
import { ContentPreviewSection } from "./content-preview-section"
import { ContentActionsSection } from "./content-actions-section"
import { AmpliarContentDialog } from "./ampliar-content-dialog"

// ============================================================================
// TYPES
// ============================================================================

export interface LibraryDetailPageProps {
  item: LibraryItemWithRelations
  mediaUrls: string[]
  carouselSlides: Array<{
    title?: string
    content: string
    imagePrompt?: string
  }>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LibraryDetailPage({ item, mediaUrls, carouselSlides }: LibraryDetailPageProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [ampliarDialogOpen, setAmpliarDialogOpen] = useState(false)

  // Parse metadata for additional info
  let metadata: Record<string, unknown> = {}
  if (item.metadata) {
    try {
      metadata = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata
    } catch {
      // Invalid metadata, use empty object
    }
  }

  // Origin info from metadata (Wizard, Chat, etc.)
  const origin = (metadata.origin as string) || "Biblioteca"
  const narrative = (metadata.narrative as string) || null
  const wizardId = (metadata.wizardId as number) || null

  // Extract hashtags from content or metadata
  const hashtags = extractHashtags(item.content)

  // Caption/legenda content
  const caption = extractCaption(item.content, item.type)

  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]
  const statusConfig = STATUS_CONFIGS[item.status]

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/library"
          className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Biblioteca</span>
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/40 truncate max-w-[200px]">
          {item.title || `${typeConfig.label} #${item.id}`}
        </span>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-white truncate">
            {item.title || `Conteúdo ${typeConfig.label}`}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={cn("text-xs", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs border-0", typeConfig.color)}
            >
              {typeConfig.label}
            </Badge>
            {item.category && (
              <Badge
                variant="outline"
                className="text-xs bg-white/5 border-white/10 text-white/70"
              >
                {item.category.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Ampliar Button - Abre dialog de edição visual */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            onClick={() => setAmpliarDialogOpen(true)}
          >
            <Expand className="w-4 h-4 mr-2" />
            Ampliar
          </Button>

          {/* Download All Images */}
          {mediaUrls.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => handleDownloadAll(mediaUrls)}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Imagens
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid - 65/35 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left Column - Content Preview (65%) */}
        <ContentPreviewSection
          item={item}
          mediaUrls={mediaUrls}
          carouselSlides={carouselSlides}
          caption={caption}
        />

        {/* Right Column - Actions & Metadata (35%) */}
        <ContentActionsSection
          item={item}
          origin={origin}
          narrative={narrative}
          wizardId={wizardId}
          hashtags={hashtags}
          metadata={metadata}
          isRefreshing={isRefreshing}
          onRefresh={() => setIsRefreshing(!isRefreshing)}
        />
      </div>

      {/* Ampliar Content Dialog */}
      <AmpliarContentDialog
        open={ampliarDialogOpen}
        onOpenChange={setAmpliarDialogOpen}
        item={item}
        mediaUrls={mediaUrls}
        carouselSlides={carouselSlides}
        onUpdate={() => setIsRefreshing(!isRefreshing)}
      />
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract hashtags from content or metadata
 */
function extractHashtags(content: string | null): string[] {
  if (!content) return []

  // Try to parse as JSON for structured content
  try {
    const parsed = JSON.parse(content)
    if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
      return parsed.hashtags
    }
  } catch {
    // Not JSON, extract from text
  }

  // Extract hashtags from text content
  const hashtagRegex = /#(\w+)/g
  const matches = content.match(hashtagRegex)
  return matches ? [...new Set(matches)] : []
}

/**
 * Extract caption from content
 */
function extractCaption(content: string | null, type: string): string | null {
  if (!content) return null

  if (type === "carousel") {
    try {
      const parsed = JSON.parse(content)
      return parsed.caption || null
    } catch {
      return null
    }
  }

  return content
}

/**
 * Handle download all images
 */
async function handleDownloadAll(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = url.split("/").pop() || "image.jpg"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error downloading image:", error)
    }
  }
}
