/**
 * Instagram Feed Preview Component
 *
 * Simula visualmente como o conteudo ficara no feed do Instagram.
 * Card com tema claro (branco) dentro do app escuro.
 */

"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"

// ============================================================================
// TYPES
// ============================================================================

export interface InstagramPreviewProps {
  imageUrl?: string
  imageUrls?: string[]
  username: string
  avatarUrl?: string
  caption: string
  hashtags?: string[]
  likes?: number
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(): string {
  return "ha 2 horas"
}

function truncateCaption(text: string, maxLen = 125): { truncated: string; isTruncated: boolean } {
  if (text.length <= maxLen) return { truncated: text, isTruncated: false }
  const cut = text.slice(0, maxLen).trimEnd()
  return { truncated: cut, isTruncated: true }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InstagramPreview({
  imageUrl,
  imageUrls,
  username,
  avatarUrl,
  caption,
  hashtags = [],
  likes = 127,
  className,
}: InstagramPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showFullCaption, setShowFullCaption] = useState(false)

  // Determine images to show
  const images: string[] = imageUrls && imageUrls.length > 0
    ? imageUrls
    : imageUrl
      ? [imageUrl]
      : []

  const isCarousel = images.length > 1
  const currentImage = images[activeIndex] || null

  const handlePrev = () => setActiveIndex((i) => Math.max(0, i - 1))
  const handleNext = () => setActiveIndex((i) => Math.min(images.length - 1, i + 1))

  // Caption processing — strip inline hashtags from caption text
  const captionWithoutHashtags = caption.replace(/#\w+/g, "").trim()
  const truncatedCaption = truncateCaption(captionWithoutHashtags)

  const displayLikes = isLiked ? likes + 1 : likes

  return (
    <div
      className={cn(
        "bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 max-w-[468px] w-full mx-auto",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar with gradient ring */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-white p-[1px]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={username}
                  width={32}
                  height={32}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Username */}
          <span className="text-[13px] font-semibold text-gray-900">
            {username}
          </span>
        </div>

        {/* Menu */}
        <button type="button" className="text-gray-900 p-1">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* ── Image Area ── */}
      <div className="relative w-full aspect-[3/4] bg-gray-50 group">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={`Post ${activeIndex + 1}`}
            fill
            className="object-cover"
            sizes="468px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-2 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-2xl">+</span>
              </div>
              <p className="text-xs">Sem imagem</p>
            </div>
          </div>
        )}

        {/* Carousel Navigation Arrows — visible on hover */}
        {isCarousel && (
          <>
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
            )}
            {activeIndex < images.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            )}

            {/* Carousel Counter Badge */}
            <div className="absolute top-3 right-3 bg-gray-900/70 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {activeIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* ── Action Bar + Carousel Dots ── */}
      <div className="relative flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            className="p-0.5 transition-transform active:scale-125"
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked ? "fill-red-500 text-red-500" : "text-gray-900"
              )}
            />
          </button>
          <button type="button" className="p-0.5">
            <MessageCircle className="w-6 h-6 text-gray-900" />
          </button>
          <button type="button" className="p-0.5">
            <Send className="w-6 h-6 text-gray-900 -rotate-12" />
          </button>
        </div>

        {/* Carousel Dots — centered */}
        {isCarousel && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "rounded-full transition-all",
                  idx === activeIndex
                    ? "w-1.5 h-1.5 bg-blue-500"
                    : "w-1 h-1 bg-gray-300"
                )}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsSaved(!isSaved)}
          className="p-0.5"
        >
          <Bookmark
            className={cn(
              "w-6 h-6 transition-colors",
              isSaved ? "fill-gray-900 text-gray-900" : "text-gray-900"
            )}
          />
        </button>
      </div>

      {/* ── Likes ── */}
      <div className="px-3 pt-1 pb-0.5">
        <p className="text-[13px] font-semibold text-gray-900">
          {formatNumber(displayLikes)} curtidas
        </p>
      </div>

      {/* ── Caption ── */}
      <div className="px-3 pb-1">
        <p className="text-[13px] text-gray-900 leading-[18px]">
          <span className="font-semibold mr-1">{username}</span>
          {showFullCaption ? (
            captionWithoutHashtags
          ) : (
            <>
              {truncatedCaption.truncated}
              {truncatedCaption.isTruncated && (
                <button
                  type="button"
                  onClick={() => setShowFullCaption(true)}
                  className="text-gray-400 ml-0.5"
                >
                  ...mais
                </button>
              )}
            </>
          )}
        </p>
      </div>

      {/* ── Hashtags ── */}
      {hashtags.length > 0 && (
        <div className="px-3 pb-1">
          <p className="text-[13px] leading-[18px]">
            {hashtags.map((tag, idx) => (
              <span key={idx} className="text-[#00376b]">
                {tag.startsWith("#") ? tag : `#${tag}`}{" "}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── Comments Link ── */}
      <div className="px-3 pb-1">
        <button type="button" className="text-[13px] text-gray-400">
          Ver todos os 12 comentarios
        </button>
      </div>

      {/* ── Timestamp ── */}
      <div className="px-3 pb-3">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {formatRelativeTime()}
        </span>
      </div>
    </div>
  )
}
