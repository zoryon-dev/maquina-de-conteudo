/**
 * Chunk Viewer
 *
 * Displays document chunks for RAG context inspection.
 *
 * Features:
 * - Expandable chunks with metadata
 * - Chunk index and position markers
 * - Similarity scores for search results
 * - Copy chunk text to clipboard
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChunkViewerProps {
  /** Chunks to display */
  chunks: Array<{
    index: number
    text: string
    startPos?: number | null
    endPos?: number | null
    score?: number
  }>
  /** Whether chunks are from search results (show scores) */
  isSearchResult?: boolean
  /** Maximum chunks to show initially */
  initialLimit?: number
  /** Custom className */
  className?: string
}

/**
 * Single chunk display component
 */
interface ChunkProps {
  chunk: {
    index: number
    text: string
    startPos?: number | null
    endPos?: number | null
    score?: number
  }
  isSearchResult?: boolean
  defaultExpanded?: boolean
}

function ChunkCard({ chunk, isSearchResult, defaultExpanded = false }: ChunkProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chunk.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scoreColor = chunk.score && chunk.score >= 0.8
    ? "text-green-400"
    : chunk.score && chunk.score >= 0.6
      ? "text-yellow-400"
      : chunk.score
        ? "text-red-400"
        : "text-white/40"

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/40" />
          )}
          <span className="text-sm font-medium text-white/90">
            Chunk {chunk.index}
          </span>
          {chunk.startPos !== undefined && chunk.startPos !== null && (
            <span className="text-xs text-white/40">
              ({chunk.startPos.toLocaleString()}
              {chunk.endPos ? ` - ${chunk.endPos.toLocaleString()}` : ""})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSearchResult && chunk.score !== undefined && (
            <span className={cn("text-sm font-mono", scoreColor)}>
              {(chunk.score * 100).toFixed(0)}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="Copiar texto"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/40" />
            )}
          </button>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 mt-2 p-3 rounded bg-black/30 text-sm text-white/70 whitespace-pre-wrap break-words">
            {chunk.text}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Chunk Viewer Component
 */
export function ChunkViewer({
  chunks,
  isSearchResult = false,
  initialLimit = 5,
  className = "",
}: ChunkViewerProps) {
  const [showAll, setShowAll] = useState(chunks.length <= initialLimit)
  const displayedChunks = showAll ? chunks : chunks.slice(0, initialLimit)

  if (chunks.length === 0) {
    return (
      <div className={cn("text-center py-8 text-white/40", className)}>
        <p>Nenhum chunk encontrado</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">
          {chunks.length} {chunks.length === 1 ? "chunk" : "chunks"}
          {isSearchResult && " encontrados"}
        </span>
        {chunks.length > initialLimit && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {showAll ? "Mostrar menos" : `Mostrar todos (${chunks.length})`}
          </button>
        )}
      </div>

      {/* Chunk cards */}
      <div className="space-y-2">
        {displayedChunks.map((chunk) => (
          <ChunkCard
            key={chunk.index}
            chunk={chunk}
            isSearchResult={isSearchResult}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {!showAll && chunks.length > initialLimit && (
        <div className="text-center py-2">
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            + {chunks.length - initialLimit} {chunks.length - initialLimit === 1 ? "chunk" : "chunks"} ocultos
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Compact chunk list (for inline display)
 */
export function ChunkList({
  chunks,
  maxDisplay = 3,
  className = "",
}: {
  chunks: Array<{ index: number; text: string }>
  maxDisplay?: number
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (chunks.length === 0) return null

  const displayChunks = expanded ? chunks : chunks.slice(0, maxDisplay)

  return (
    <div className={cn("space-y-1", className)}>
      {displayChunks.map((chunk) => (
        <div
          key={chunk.index}
          className="flex items-center gap-2 text-xs text-white/50"
        >
          <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40">
            {chunk.index}
          </span>
          <span className="flex-1 truncate">
            {chunk.text.slice(0, 60)}
            {chunk.text.length > 60 && "..."}
          </span>
        </div>
      ))}
      {chunks.length > maxDisplay && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-primary hover:text-primary/80 mt-1"
        >
          + {chunks.length - maxDisplay} mais
        </button>
      )}
    </div>
  )
}
