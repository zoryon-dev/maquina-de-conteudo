/**
 * Article Wizard — Interlinking Review
 *
 * Displays internal link suggestions with approve/reject actions.
 */

"use client"

import { useState } from "react"
import { Link2, ExternalLink, Check, X, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface LinkSuggestion {
  id: number
  targetUrl: string
  anchorText: string
  relevanceScore: number | null
  insertionPoint: string | null
  rationale: string | null
  isReverse: boolean | null
  status: string
}

interface InterlinkingReviewProps {
  links: LinkSuggestion[]
  onApprove?: (linkId: number) => void
  onReject?: (linkId: number) => void
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  const color =
    score >= 80 ? "text-green-400 bg-green-500/10" :
    score >= 60 ? "text-yellow-400 bg-yellow-500/10" :
    "text-red-400 bg-red-500/10"

  return (
    <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded", color)}>
      {score}
    </span>
  )
}

export function InterlinkingReview({ links, onApprove, onReject }: InterlinkingReviewProps) {
  const forwardLinks = links.filter((l) => !l.isReverse)
  const reverseLinks = links.filter((l) => l.isReverse)

  if (links.length === 0) {
    return (
      <div className="text-center py-8">
        <Link2 className="h-8 w-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">Nenhuma sugestão de link disponível</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Forward Links */}
      {forwardLinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
            <Link2 className="h-3.5 w-3.5" />
            Links Internos ({forwardLinks.length})
          </div>
          {forwardLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}

      {/* Reverse Links */}
      {reverseLinks.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Links Reversos ({reverseLinks.length})
          </div>
          {reverseLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LinkCard({
  link,
  onApprove,
  onReject,
}: {
  link: LinkSuggestion
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
}) {
  const [status, setStatus] = useState(link.status)

  const handleApprove = () => {
    setStatus("approved")
    onApprove?.(link.id)
  }

  const handleReject = () => {
    setStatus("rejected")
    onReject?.(link.id)
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        status === "approved"
          ? "border-green-500/20 bg-green-500/5"
          : status === "rejected"
            ? "border-red-500/20 bg-red-500/5 opacity-60"
            : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary truncate">
              {link.anchorText}
            </span>
            <ScoreBadge score={link.relevanceScore} />
          </div>
          <a
            href={link.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 mt-0.5 truncate"
          >
            {link.targetUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        {status === "suggested" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleApprove}
              className="p-1.5 rounded-md hover:bg-green-500/20 text-green-400 transition-colors"
              title="Aprovar"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleReject}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
              title="Rejeitar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {status === "approved" && (
          <Check className="h-4 w-4 text-green-400 shrink-0" />
        )}
      </div>

      {link.rationale && (
        <p className="text-xs text-white/40 leading-relaxed">{link.rationale}</p>
      )}
    </div>
  )
}
