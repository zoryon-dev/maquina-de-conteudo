/**
 * Media Carousel Component
 *
 * Carrossel reutilizável para exibir mídias (imagens, slides).
 * Suporta navegação por setas, teclado e touch/swipe.
 *
 * @component
 */

"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

// ============================================================================
// TYPES
// ============================================================================

export interface MediaItem {
  url?: string
  title?: string
  content?: string
  imagePrompt?: string
  [key: string]: unknown
}

export interface MediaCarouselProps {
  /** Itens do carrossel */
  items: MediaItem[]
  /** Tipo de conteúdo para renderização específica */
  type?: "image" | "carousel" | "video" | "mixed"
  /** Classe adicional para o container */
  className?: string
  /** Altura fixa (opcional) */
  aspectRatio?: "video" | "square" | "portrait" | "custom"
  /** Mostrar indicadores (dots) */
  showIndicators?: boolean
  /** Mostrar setas de navegação */
  showArrows?: boolean
  /** Auto-play em ms (false para desabilitar) */
  autoplay?: number | false
  /** Callback quando slide muda */
  onSlideChange?: (index: number) => void
  /** Render customizado para cada item */
  renderItem?: (item: MediaItem, index: number) => React.ReactNode
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MediaCarousel({
  items,
  type = "image",
  className,
  aspectRatio = "square",
  showIndicators = true,
  showArrows = true,
  autoplay = false,
  onSlideChange,
  renderItem,
}: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<number>(0)
  const touchEndRef = useRef<number>(0)

  const hasItems = items.length > 0
  const canNavigate = items.length > 1

  // Aspect ratio classes
  const aspectRatioClasses: Record<typeof aspectRatio, string> = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    custom: "",
  }

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (!canNavigate) return
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    onSlideChange?.(newIndex)
  }, [currentIndex, items.length, canNavigate, onSlideChange])

  const goToNext = useCallback(() => {
    if (!canNavigate) return
    const newIndex = (currentIndex + 1) % items.length
    setCurrentIndex(newIndex)
    onSlideChange?.(newIndex)
  }, [currentIndex, items.length, canNavigate, onSlideChange])

  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return
    setCurrentIndex(index)
    onSlideChange?.(index)
  }, [items.length, onSlideChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious()
      } else if (e.key === "ArrowRight") {
        goToNext()
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("keydown", handleKeyDown)
      return () => container.removeEventListener("keydown", handleKeyDown)
    }
  }, [goToPrevious, goToNext])

  // Autoplay
  useEffect(() => {
    if (autoplay === false || isPaused || !canNavigate) return

    const interval = setInterval(goToNext, autoplay)
    return () => clearInterval(interval)
  }, [autoplay, isPaused, goToNext, canNavigate])

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.changedTouches[0].screenX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.changedTouches[0].screenX
  }

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return

    const diff = touchStartRef.current - touchEndRef.current
    const threshold = 50 // Minimum swipe distance

    if (diff > threshold) {
      goToNext() // Swipe left = next
    } else if (diff < -threshold) {
      goToPrevious() // Swipe right = previous
    }

    touchStartRef.current = 0
    touchEndRef.current = 0
  }

  if (!hasItems) {
    return (
      <div
        className={cn(
          "bg-white/5 border border-white/10 rounded-lg overflow-hidden",
          aspectRatioClasses[aspectRatio],
          className
        )}
      >
        <div className="w-full h-full flex items-center justify-center text-white/20">
          <p className="text-sm">Nenhuma mídia disponível</p>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group bg-white/5 border border-white/10 rounded-lg overflow-hidden",
        aspectRatioClasses[aspectRatio],
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      role="region"
      aria-label="Carrossel de mídias"
    >
      {/* Main Content */}
      <div className="w-full h-full">
        {renderItem ? (
          renderItem(currentItem, currentIndex)
        ) : (
          <DefaultCarouselItem item={currentItem} type={type} />
        )}
      </div>

      {/* Navigation Arrows */}
      {showArrows && canNavigate && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Próximo slide"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && canNavigate && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-white/30 hover:bg-white/50"
              )}
              aria-label={`Ir para slide ${index + 1}`}
              aria-current={index === currentIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}

      {/* Slide Counter */}
      {canNavigate && (
        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium">
          {currentIndex + 1} / {items.length}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DEFAULT ITEM RENDERER
// ============================================================================

interface DefaultCarouselItemProps {
  item: MediaItem
  type: "image" | "carousel" | "video" | "mixed"
}

function DefaultCarouselItem({ item, type }: DefaultCarouselItemProps) {
  const hasImage = item.url && item.url.length > 0
  const hasContent = item.content && item.content.length > 0

  if (hasImage) {
    return (
      <img
        src={item.url}
        alt={item.title || `Slide ${type}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    )
  }

  if (hasContent) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-lg">
          {item.title && (
            <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
          )}
          <p className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">
            {item.content}
          </p>
          {item.imagePrompt && (
            <p className="text-xs text-white/30 italic mt-4 line-clamp-2">
              Prompt: {item.imagePrompt}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Empty state placeholder
  return (
    <div className="w-full h-full flex items-center justify-center text-white/20">
      <svg
        className="w-16 h-16"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MediaCarousel
