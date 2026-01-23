/**
 * Content Preview Section
 *
 * Seção de visualização de conteúdo (65% da largura).
 * Mostra cards verticais para carrossel ou imagem única para outros tipos.
 * Inclui botão para abrir galeria em tela cheia.
 * Edição de legenda com salvamento.
 */

"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Layers, Type, Image, Video, Camera, Images, ChevronLeft, ChevronRight, Edit3, Copy, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageGalleryDrawer, type GalleryImage } from "@/components/ui/image-gallery-drawer"
import type { LibraryItemWithRelations } from "@/types/library"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  onCaptionUpdate?: () => void
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
  onCaptionUpdate,
}: ContentPreviewSectionProps) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [cardStartIndex, setCardStartIndex] = useState(0)

  // Caption editing state
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [editedCaption, setEditedCaption] = useState(caption || "")
  const [isSavingCaption, setIsSavingCaption] = useState(false)

  // Update edited caption when prop changes
  useEffect(() => {
    setEditedCaption(caption || "")
  }, [caption])

  // Converter URLs para o formato do drawer
  const galleryImages: GalleryImage[] = mediaUrls.map((url, index) => ({
    url,
    index,
    isHtmlTemplate: url.startsWith("http"),
  }))

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

  // Carousel navigation: show 3 cards at a time
  const VISIBLE_CARDS = 3
  const visibleCards = cardData
    ? cardData.slice(cardStartIndex, cardStartIndex + VISIBLE_CARDS)
    : []
  const canGoPrev = cardStartIndex > 0
  const canGoNext = cardData && cardStartIndex + VISIBLE_CARDS < cardData.length

  const goPrev = () => setCardStartIndex(prev => Math.max(0, prev - 1))
  const goNext = () => setCardStartIndex(prev => Math.min(cardData ? cardData.length - VISIBLE_CARDS : 0, prev + 1))

  // For non-carousel types with single image
  const singleImageData = mediaUrls.length > 0 ? mediaUrls[0] : null

  // Handler para copiar legenda
  const handleCopyCaption = async () => {
    const textToCopy = caption || item.content || ""
    if (!textToCopy) {
      toast.error("Nada para copiar")
      return
    }
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.success("Legenda copiada!")
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  // Handler para salvar legenda editada
  const handleSaveCaption = async () => {
    setIsSavingCaption(true)
    try {
      const response = await fetch(`/api/library/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedCaption }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Legenda atualizada!")
        setIsEditingCaption(false)
        onCaptionUpdate?.()
      } else {
        toast.error(result.error || "Erro ao salvar")
      }
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setIsSavingCaption(false)
    }
  }

  // Handler para cancelar edição
  const handleCancelEdit = () => {
    setEditedCaption(caption || "")
    setIsEditingCaption(false)
  }

  return (
    <div className="space-y-4">
      {/* Header with Gallery Button */}
      {(mediaUrls.length > 0) && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Preview</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGalleryOpen(true)}
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Images className="w-4 h-4 mr-2" />
            Ver Galeria ({mediaUrls.length})
          </Button>
        </div>
      )}

      {/* Media Preview Section */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl">
        {cardData ? (
          // Carousel: Grid de 3 cards com navegação
          <div className="relative p-4">
            {/* Seta Esquerda */}
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -left-12 top-1/2 -translate-y-1/2 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                onClick={goPrev}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}

            {/* Grid de 3 cards */}
            <div className="grid grid-cols-3 gap-4">
              {visibleCards.map((card) => (
                <FixedWidthCard key={card.index} card={card} />
              ))}
            </div>

            {/* Seta Direita */}
            {canGoNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-12 top-1/2 -translate-y-1/2 h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
                onClick={goNext}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {/* Indicador de página (X de Y) */}
            {cardData.length > VISIBLE_CARDS && (
              <div className="text-center mt-3">
                <span className="text-xs text-white/40">
                  {Math.floor(cardStartIndex / VISIBLE_CARDS) + 1} / {Math.ceil(cardData.length / VISIBLE_CARDS)}
                </span>
              </div>
            )}
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
      {(caption || item.content) ? (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <MessageSquare className="w-4 h-4" />
              <span>Legenda</span>
            </div>
            <div className="flex items-center gap-1">
              {isEditingCaption ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelEdit}
                    className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveCaption}
                    disabled={isSavingCaption}
                    className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-white/5"
                  >
                    {isSavingCaption ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCaption}
                    className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                    title="Copiar legenda"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingCaption(true)}
                    className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5"
                    title="Editar legenda"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {isEditingCaption ? (
            <Textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              placeholder="Edite a legenda..."
              rows={6}
              className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 resize-none text-sm"
            />
          ) : (
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
              {caption || item.content}
            </p>
          )}
        </div>
      ) : null}

      {/* Image Gallery Drawer */}
      <ImageGalleryDrawer
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={galleryImages}
        libraryItemId={item.id}
        onImageUpdated={() => window.location.reload()}
      />
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FixedWidthCardProps {
  card: {
    imageUrl: string | null
    title?: string
    content: string
    imagePrompt?: string
    index: number
  }
}

function FixedWidthCard({ card }: FixedWidthCardProps) {
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
