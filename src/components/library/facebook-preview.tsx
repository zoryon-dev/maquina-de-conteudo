/**
 * Facebook Feed Preview Component
 *
 * Simula visualmente como o conteudo ficara no feed do Facebook.
 * Card com tema claro (branco) dentro do app escuro.
 */

"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"

// ============================================================================
// TYPES
// ============================================================================

export interface FacebookPreviewProps {
  imageUrl?: string
  imageUrls?: string[]
  displayName: string
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
  return "2 h"
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FacebookPreview({
  imageUrl,
  imageUrls,
  displayName,
  avatarUrl,
  caption,
  hashtags = [],
  likes = 84,
  className,
}: FacebookPreviewProps) {
  const [isLiked, setIsLiked] = useState(false)

  // Determine images to show
  const images: string[] = imageUrls && imageUrls.length > 0
    ? imageUrls
    : imageUrl
      ? [imageUrl]
      : []

  const firstImage = images[0] || null
  const extraCount = images.length > 1 ? images.length - 1 : 0

  const displayLikes = isLiked ? likes + 1 : likes

  // Build caption text with hashtags
  const fullCaption = hashtags.length > 0
    ? `${caption}\n\n${hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`
    : caption

  return (
    <div
      className={cn(
        "bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 max-w-[500px] w-full mx-auto",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Name and timestamp */}
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-gray-900 leading-5">
              {displayName}
            </span>
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-[12px]">{formatRelativeTime()}</span>
              <span className="text-[12px]">·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Menu */}
        <button type="button" className="text-gray-500 p-1 mt-0.5">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* ── Content Text ── */}
      <div className="px-4 pb-2">
        <p className="text-[15px] text-gray-900 leading-5 whitespace-pre-wrap">
          {fullCaption}
        </p>
      </div>

      {/* ── Image Area ── */}
      {firstImage && (
        <div className="relative w-full aspect-[3/4] bg-gray-100">
          <Image
            src={firstImage}
            alt="Post"
            fill
            className="object-cover"
            sizes="500px"
          />

          {/* Multi-image overlay (+N) */}
          {extraCount > 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-4xl font-semibold">
                +{extraCount}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Reaction Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          {/* Reaction emoji icons */}
          <div className="flex -space-x-1">
            <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center text-[10px] border border-white z-30" role="img" aria-label="curtir">
              <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
            </span>
            <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[10px] border border-white z-20" role="img" aria-label="amei">
              <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 text-white fill-white">
                <path d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4 2.5 5.5 2.5c1 0 2 .5 2.5 1.5.5-1 1.5-1.5 2.5-1.5 1.5 0 3 1.5 3 3.5S8 14 8 14z" />
              </svg>
            </span>
            <span className="w-[18px] h-[18px] rounded-full bg-yellow-400 flex items-center justify-center text-[10px] border border-white z-10" role="img" aria-label="haha">
              <span className="text-[10px]">&#128514;</span>
            </span>
          </div>
          <span className="text-[13px] text-gray-500 ml-1">
            {formatNumber(displayLikes)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-gray-500">
          <span>4 comentarios</span>
          <span>2 compartilhamentos</span>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium transition-colors hover:bg-gray-50",
            isLiked ? "text-blue-600" : "text-gray-600"
          )}
        >
          <ThumbsUp
            className={cn(
              "w-[18px] h-[18px]",
              isLiked && "fill-blue-600"
            )}
          />
          <span>Curtir</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span>Comentar</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Share2 className="w-[18px] h-[18px]" />
          <span>Compartilhar</span>
        </button>
      </div>

      {/* ── Bottom padding ── */}
      <div className="h-1.5" />
    </div>
  )
}
