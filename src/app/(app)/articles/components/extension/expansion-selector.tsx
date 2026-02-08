/**
 * Extension Mode — Expansion Selector
 *
 * Checkboxes to select fixes from EXT-02 plan with impact preview.
 */

"use client"

import { useState, useMemo } from "react"
import {
  CheckCircle2,
  Square,
  FileText,
  Wrench,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FixItem {
  id: string
  type: "section" | "seo" | "geo"
  heading?: string
  description: string
  impact: string
  effort: string
  estimatedWordCount?: number
  previewContent?: string
  before?: string
  after?: string
}

interface ExpansionSelectorProps {
  sectionExpansions: Array<{
    id: string
    type: string
    heading: string
    proposedState: string
    previewContent: string
    estimatedWordCount: number
    impact: string
    effort: string
  }>
  seoFixes: Array<{
    id: string
    description: string
    before: string
    after: string
    impact: string
    effort: string
  }>
  geoFixes: Array<{
    id: string
    description: string
    before: string
    after: string
    impact: string
    effort: string
  }>
  selectedFixes: string[]
  onSelectionChange: (fixes: string[]) => void
}

export function ExpansionSelector({
  sectionExpansions,
  seoFixes,
  geoFixes,
  selectedFixes,
  onSelectionChange,
}: ExpansionSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allFixes: FixItem[] = useMemo(() => [
    ...sectionExpansions.map((s) => ({
      id: s.id,
      type: "section" as const,
      heading: s.heading,
      description: s.proposedState,
      impact: s.impact,
      effort: s.effort,
      estimatedWordCount: s.estimatedWordCount,
      previewContent: s.previewContent,
    })),
    ...seoFixes.map((f) => ({
      id: f.id,
      type: "seo" as const,
      description: f.description,
      impact: f.impact,
      effort: f.effort,
      before: f.before,
      after: f.after,
    })),
    ...geoFixes.map((f) => ({
      id: f.id,
      type: "geo" as const,
      description: f.description,
      impact: f.impact,
      effort: f.effort,
      before: f.before,
      after: f.after,
    })),
  ], [sectionExpansions, seoFixes, geoFixes])

  const toggle = (id: string) => {
    onSelectionChange(
      selectedFixes.includes(id)
        ? selectedFixes.filter((f) => f !== id)
        : [...selectedFixes, id]
    )
  }

  const selectAll = () => onSelectionChange(allFixes.map((f) => f.id))
  const selectNone = () => onSelectionChange([])

  const totalWords = allFixes
    .filter((f) => selectedFixes.includes(f.id))
    .reduce((sum, f) => sum + (f.estimatedWordCount || 0), 0)

  const typeIcon = { section: FileText, seo: Wrench, geo: Bot }
  const typeLabel = { section: "Seção", seo: "SEO", geo: "GEO" }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          <span className="text-white font-medium">{selectedFixes.length}</span> de {allFixes.length} correções selecionadas
          {totalWords > 0 && (
            <span className="text-white/40"> · ~{totalWords.toLocaleString()} palavras</span>
          )}
        </p>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-xs text-primary hover:text-primary/80">
            Selecionar todos
          </button>
          <span className="text-white/10">|</span>
          <button onClick={selectNone} className="text-xs text-white/40 hover:text-white/60">
            Limpar
          </button>
        </div>
      </div>

      {/* Fix list */}
      <div className="space-y-1.5">
        {allFixes.map((fix) => {
          const isSelected = selectedFixes.includes(fix.id)
          const isExpanded = expandedId === fix.id
          const Icon = typeIcon[fix.type]

          return (
            <div key={fix.id}>
              <div
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
                  isSelected
                    ? "border-primary/30 bg-primary/5"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10",
                )}
              >
                <button
                  onClick={() => toggle(fix.id)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckCircle2 size={16} className="text-primary" />
                  ) : (
                    <Square size={16} className="text-white/20" />
                  )}
                </button>

                <div className="flex-1 min-w-0" onClick={() => toggle(fix.id)}>
                  <div className="flex items-center gap-2">
                    <Icon size={12} className="text-white/30" />
                    <span className="text-[10px] text-white/30 uppercase">{typeLabel[fix.type]}</span>
                    {fix.heading && (
                      <span className="text-sm text-white font-medium truncate">{fix.heading}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{fix.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      fix.impact === "alto" ? "bg-red-400/10 text-red-400" : fix.impact === "médio" ? "bg-yellow-400/10 text-yellow-400" : "bg-white/5 text-white/30",
                    )}>
                      {fix.impact}
                    </span>
                    <span className="text-[10px] text-white/20">esforço: {fix.effort}</span>
                    {fix.estimatedWordCount && (
                      <span className="text-[10px] text-white/20">~{fix.estimatedWordCount} palavras</span>
                    )}
                  </div>
                </div>

                {(fix.previewContent || fix.before) && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : fix.id)}
                    className="mt-0.5 flex-shrink-0 text-white/20 hover:text-white/40"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="ml-7 mt-1 mb-2 rounded-lg border border-white/5 bg-white/[0.01] p-3">
                  {fix.previewContent && (
                    <div>
                      <p className="text-[10px] text-white/30 uppercase mb-1">Preview</p>
                      <p className="text-xs text-white/50 whitespace-pre-wrap">{fix.previewContent}</p>
                    </div>
                  )}
                  {fix.before && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-red-400/50 uppercase mb-0.5">Antes</p>
                        <p className="text-xs text-white/40">{fix.before}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-400/50 uppercase mb-0.5">Depois</p>
                        <p className="text-xs text-white/60">{fix.after}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
