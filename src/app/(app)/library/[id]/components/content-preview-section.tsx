/**
 * Content Preview Section
 *
 * Seção de visualização de conteúdo (65% da largura).
 * Mostra cards verticais para carrossel ou imagem única para outros tipos.
 */

"use client"

import { MessageSquare, Layers, Type, Image, Video, Camera } from "lucide-react"
import type { LibraryItemWithRelations } from "@/types/library"

// ============================================================================
// TYPES
// ============================================================================

export interface ContentPreviewSectionProps {
  item: LibraryItemWithRelations
  mediaUrls: string[]
  carouselSlides: Array<{
    title?: string
    content: string
    imagePrompt?: string
  }>
  caption: string | null
}

// ============================================================================
// ICONS MAP
// ============================================================================

const TYPE_ICONS: Record<string, typeof Type> = {
  text: Type,
  image: Image,
  carousel: Layers,
  video: Video,
  story: Camera,
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ContentPreviewSection({
  item,
  mediaUrls,
  carouselSlides,
  caption,
}: ContentPreviewSectionProps) {
  const TypeIcon = TYPE_ICONS[item.type] || Type

  // Prepare card data for carousels
  const cardData = item.type === "carousel" && carouselSlides.length > 0
    ? carouselSlides.map((slide, index) => ({
        imageUrl: mediaUrls[index] || null,
        title: slide.title,
        content: slide.content,
        imagePrompt: slide.imagePrompt,
        index,
      }))
    : null

  // For non-carousel types with single image
  const singleImageData = mediaUrls.length > 0 ? mediaUrls[0] : null

  return (
    <div className="space-y-4">
      {/* Media Preview Section */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        {cardData ? (
          // Carousel: Grid of 3 vertical cards
          <div className="grid grid-cols-3 gap-3 p-4">
            {cardData.map((card) => (
              <VerticalCard key={card.index} card={card} />
            ))}
          </div>
        ) : singleImageData ? (
          // Single image type
          <div className="aspect-[3/4] w-full">
            <img
              src={singleImageData}
              alt={item.title || "Imagem"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          // No media - placeholder with type icon
          <div className="aspect-[3/4] flex flex-col items-center justify-center gap-3 text-white/20">
            <TypeIcon className="w-16 h-16" />
            <p className="text-sm">
              {item.type === "text" ? "Conteúdo de texto" : "Sem mídia"}
            </p>
          </div>
        )}
      </div>

      {/* Caption / Legenda Section */}
      {caption ? (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span>Legenda</span>
          </div>
          <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
            {caption}
          </p>
        </div>
      ) : item.type === "text" ? (
        // For text type, show the content as caption
        item.content && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
              <Type className="w-4 h-4" />
              <span>Conteúdo</span>
            </div>
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
              {item.content}
            </p>
          </div>
        )
      ) : null}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface VerticalCardProps {
  card: {
    imageUrl: string | null
    title?: string
    content: string
    imagePrompt?: string
    index: number
  }
}

function VerticalCard({ card }: VerticalCardProps) {
  return (
    <div className="aspect-[3/4] bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden flex flex-col">
      {/* Image Area */}
      {card.imageUrl ? (
        <div className="flex-1 relative">
          <img
            src={card.imageUrl}
            alt={card.title || `Card ${card.index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-white/[0.02] to-white/[0.05]">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
            {card.index + 1}
          </div>
        </div>
      )}

      {/* Content Area - bottom of card */}
      <div className="p-2 border-t border-white/5 bg-white/[0.02]">
        {card.title && (
          <p className="text-xs font-medium text-white/80 truncate mb-1">
            {card.title}
          </p>
        )}
        <p className="text-[10px] text-white/40 line-clamp-2">
          {card.content.length > 80 ? `${card.content.slice(0, 80)}...` : card.content}
        </p>
      </div>
    </div>
  )
}
