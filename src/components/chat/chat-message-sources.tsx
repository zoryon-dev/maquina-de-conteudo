/**
 * Chat Message Sources
 *
 * Displays RAG sources used for a chat response.
 *
 * Features:
 * - Expandable source cards
 * - Similarity score display
 * - Category badges
 * - Text preview with full text on expand
 */

"use client"

import { useState } from "react"
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * RAG source information
 */
export interface ChatSource {
  documentTitle: string
  category: string
  text: string
  score: number
}

/**
 * Category configuration
 */
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
}

/**
 * Props for ChatMessageSources
 */
export interface ChatMessageSourcesProps {
  /** Sources to display */
  sources: ChatSource[]
  /** Number of chunks included in context */
  chunksIncluded?: number
  /** Custom className */
  className?: string
}

/**
 * Score color based on similarity
 */
function getScoreColor(score: number): string {
  return score >= 0.8
    ? "text-green-400"
    : score >= 0.6
      ? "text-yellow-400"
      : "text-orange-400"
}

/**
 * Single source card component
 */
interface SourceCardProps {
  source: ChatSource
  defaultExpanded?: boolean
}

function SourceCard({ source, defaultExpanded = false }: SourceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const config = CATEGORY_CONFIG[source.category] || CATEGORY_CONFIG.general
  const scoreColor = getScoreColor(source.score)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
        )}
        <FileText className="h-4 w-4 text-white/40 shrink-0" />
        <span className="text-sm font-medium text-white/90 truncate flex-1">
          {source.documentTitle}
        </span>
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
          {config.label}
        </span>
        <span className={cn("text-xs font-mono", scoreColor)}>
          {(source.score * 100).toFixed(0)}%
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 mt-2 p-3 rounded bg-black/30 text-sm text-white/70 whitespace-pre-wrap break-words">
            {source.text}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Chat Message Sources Component
 *
 * Shows a collapsible list of sources used for RAG-enhanced responses.
 */
export function ChatMessageSources({
  sources,
  chunksIncluded,
  className = "",
}: ChatMessageSourcesProps) {
  const [allExpanded, setAllExpanded] = useState(false)

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Fontes usadas</span>
          {chunksIncluded !== undefined && (
            <span className="text-white/40">({chunksIncluded} chunks)</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAllExpanded(!allExpanded)}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {allExpanded ? "Recolher" : "Expandir"} todas
        </button>
      </div>

      {/* Source cards */}
      <div className="space-y-2">
        {sources.map((source, index) => (
          <SourceCard
            key={`${source.documentTitle}-${index}`}
            source={source}
            defaultExpanded={allExpanded}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Compact pill version showing source count
 */
export function ChatMessageSourcesPill({
  sources,
  onClick,
}: {
  sources: ChatSource[]
  onClick?: () => void
}) {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
    >
      <Check className="h-3 w-3" />
      <span>{sources.length} fonte{sources.length > 1 ? "s" : ""}</span>
    </button>
  )
}
