/**
 * Multi Card Carousel Component
 *
 * Carrossel horizontal que mostra múltiplos cards (2-3) por vez.
 * Usa CSS scroll snap para navegação suave.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

// ============================================================================
// TYPES
// ============================================================================

export interface CarouselCardData {
  title?: string
  content: string
  imagePrompt?: string
  index: number
}

export interface MultiCardCarouselProps {
  cards: CarouselCardData[]
  /** Cards visíveis por vez (responsivo: desktop | tablet | mobile) */
  cardsPerView?: `${number}|${number}|${number}`
  className?: string
}

// ============================================================================
// CONFIG
// ============================================================================

const DEFAULT_CARDS_PER_VIEW = "3|2|1" // desktop | tablet | mobile

// ============================================================================
// COMPONENT
// ============================================================================

export function MultiCardCarousel({
  cards,
  cardsPerView = DEFAULT_CARDS_PER_VIEW,
  className,
}: MultiCardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Parse cardsPerView (format: "3|2|1")
  const [desktopCount, tabletCount, mobileCount] = cardsPerView.split("|").map(Number)
  const totalCards = cards.length

  // Calculate scroll amount based on visible cards
  const getVisibleCards = (): number => {
    if (typeof window === "undefined") return desktopCount
    const width = window.innerWidth
    if (width < 640) return mobileCount
    if (width < 1024) return tabletCount
    return desktopCount
  }

  // Update scroll buttons state
  const updateScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener("scroll", updateScrollState)
    // Initial check
    updateScrollState()

    return () => container.removeEventListener("scroll", updateScrollState)
  }, [])

  // Scroll by card width
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return

    const visibleCards = getVisibleCards()
    const cardWidth = container.clientWidth / visibleCards
    const multiplier = direction === "right" ? 1 : -1
    const scrollAmount = cardWidth * multiplier

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    })

    // Update current index
    const newIndex = direction === "right"
      ? Math.min(currentIndex + 1, totalCards - visibleCards)
      : Math.max(currentIndex - 1, 0)
    setCurrentIndex(newIndex)
  }

  if (totalCards === 0) {
    return (
      <div className={cn(
        "bg-white/[0.02] border border-white/10 rounded-xl p-8",
        "flex items-center justify-center text-white/20"
      )}>
        <p className="text-sm">Nenhum slide disponível</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide",
          "pb-2 -mb-2", // Space for scrollbar
          "scroll-smooth"
        )}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 snap-center",
              // Responsive card widths - usando inline style por causa das variaveis
              "w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
            )}
          >
            <CarouselCard card={card} />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {totalCards > getVisibleCards() && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              "h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "-translate-x-1/2"
            )}
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10",
              "h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "translate-x-1/2"
            )}
            aria-label="Próximo slide"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Card Counter */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <div className="flex gap-1">
          {cards.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 rounded-full transition-all duration-200",
                index === Math.round(currentIndex)
                  ? "bg-primary w-6"
                  : "bg-white/20 w-3"
              )}
            />
          ))}
        </div>
        <span className="text-xs text-white/40 ml-2">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface CarouselCardProps {
  card: CarouselCardData
}

function CarouselCard({ card }: CarouselCardProps) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden h-full min-h-[320px] flex flex-col">
      {/* Card Number */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {card.index + 1}
          </div>
          {card.title && (
            <span className="text-sm font-medium text-white/70 truncate">
              {card.title}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap text-center">
          {card.content}
        </p>
      </div>

      {/* Image Prompt (if exists) */}
      {card.imagePrompt && (
        <div className="px-3 py-2 border-t border-white/5 bg-white/[0.02]">
          <p className="text-[10px] text-white/20 truncate" title={card.imagePrompt}>
            📎 {card.imagePrompt.slice(0, 40)}...
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Hide scrollbar but keep functionality
 */
// Add to globals.css if needed:
// .scrollbar-hide {
//   -ms-overflow-style: none;
//   scrollbar-width: none;
// }
// .scrollbar-hide::-webkit-scrollbar {
//   display: none;
// }

export default MultiCardCarousel
