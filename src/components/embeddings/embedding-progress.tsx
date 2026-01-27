/**
 * Embedding Progress Bar
 *
 * Displays a progress bar for document embedding operations.
 *
 * Shows:
 * - Current progress as a percentage bar
 * - Current/total chunks indicator
 * - Optional status text
 * - Estimated time remaining (based on chunk count)
 */

"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface EmbeddingProgressProps {
  /** Current progress (number of chunks processed) */
  current: number
  /** Total chunks to process */
  total: number
  /** Current status */
  status?: "pending" | "processing" | "completed" | "failed"
  /** Custom status text */
  statusText?: string
  /** Show chunk count instead of percentage */
  showCount?: boolean
  /** Compact variant */
  compact?: boolean
  /** Custom className */
  className?: string
}

/**
 * Calculate percentage from current and total
 */
function getPercentage(current: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((current / total) * 100))
}

/**
 * Estimate time remaining (very rough approximation)
 * Assumes ~1 second per chunk for embedding
 */
function estimateTimeRemaining(remaining: number): string {
  if (remaining <= 0) return ""
  const seconds = remaining * 1
  if (seconds < 60) return `~${seconds}s restantes`
  const minutes = Math.ceil(seconds / 60)
  return `~${minutes}min restantes`
}

/**
 * Embedding Progress Bar Component
 */
export function EmbeddingProgressBar({
  current,
  total,
  status = "processing",
  statusText,
  showCount = false,
  compact = false,
  className = "",
}: EmbeddingProgressProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0)
  const percent = getPercentage(current, total)
  const remaining = total - current

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent)
    }, 50)
    return () => clearTimeout(timer)
  }, [percent])

  // Don't show if completed (unless explicitly requested)
  if (status === "completed" && !statusText) {
    return null
  }

  const containerHeight = compact ? "h-1" : "h-2"

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar container */}
      <div className={cn("relative w-full rounded-full bg-white/10", containerHeight)}>
        {/* Animated progress fill */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out",
            status === "failed"
              ? "bg-red-500"
              : status === "completed"
                ? "bg-green-400"
                : "bg-primary"
          )}
          style={{ width: `${animatedPercent}%` }}
        />
      </div>

      {/* Status text (non-compact) */}
      {!compact && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-white/70">
            {statusText ||
              (status === "processing"
                ? `Gerando embeddings${remaining > 0 ? `...` : ""}`
                : status === "completed"
                  ? "Concluído"
                  : status === "failed"
                    ? "Falha no processamento"
                    : "Aguardando...")}
          </span>
          <span className="text-white/50">
            {showCount ? (
              `${current} / ${total} chunks`
            ) : (
              <>
                {percent}%
                {status === "processing" && remaining > 0 && remaining <= 10 && (
                  <span className="ml-2 text-white/40">
                    {estimateTimeRemaining(remaining)}
                  </span>
                )}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Mini progress indicator for inline display
 */
export function EmbeddingProgressMini({
  current,
  total,
  className = "",
}: {
  current: number
  total: number
  className?: string
}) {
  const percent = getPercentage(current, total)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1 w-16 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-white/50">{percent}%</span>
    </div>
  )
}

/**
 * Spinner for processing state
 */
export function EmbeddingSpinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div className={cn("animate-spin text-primary", sizeClasses[size])}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="h-full w-full"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}
