"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAllHeadlinePatterns,
  type HeadlinePatternId,
} from "@/lib/ai/shared/headline-library"

const PATTERNS = getAllHeadlinePatterns().map((p) => ({
  id: p.id as HeadlinePatternId,
  name: p.name,
  description: p.description,
  avgLikes: p.avgLikes,
}))

const TOTAL_PATTERNS = PATTERNS.length
const MAX_SELECTABLE = 8

type Props = {
  value?: HeadlinePatternId[]
  onChange: (patterns: HeadlinePatternId[]) => void
  disabled?: boolean
  className?: string
}

function formatLikes(likes: number | undefined): string | undefined {
  if (!likes) return undefined
  if (likes >= 1000) return `~${(likes / 1000).toFixed(0)}k likes`
  return `~${likes} likes`
}

export function BdHeadlinePatternsSelector({
  value = [],
  onChange,
  disabled,
  className,
}: Props) {
  const selectedCount = value.length

  const toggle = (id: HeadlinePatternId) => {
    if (disabled) return
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
      return
    }
    if (value.length >= MAX_SELECTABLE) return
    onChange([...value, id])
  }

  const clearAll = () => {
    if (disabled) return
    onChange([])
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-white">
            Headlines estilo BrandsDecoded{" "}
            <span className="text-white/40 font-normal">(opcional)</span>
          </label>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              className="text-xs text-white/50 hover:text-white/80 transition-colors disabled:cursor-not-allowed"
            >
              Limpar
            </button>
          )}
        </div>
        <p className="text-xs text-white/60">
          Selecione 1-{MAX_SELECTABLE} padrões para gerar headlines extras no
          estilo BD. Sugestões aparecem como metadata após a geração.
        </p>
        <p className="text-xs text-white/40">
          {selectedCount} de {TOTAL_PATTERNS} padrões selecionados
        </p>
      </div>

      <div
        role="group"
        aria-label="Padrões de headline BrandsDecoded"
        className="grid gap-2 md:grid-cols-2"
      >
        {PATTERNS.map((pattern) => {
          const active = value.includes(pattern.id)
          const reachedLimit = !active && value.length >= MAX_SELECTABLE
          const likesLabel = formatLikes(pattern.avgLikes)
          return (
            <button
              key={pattern.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              aria-pressed={active}
              disabled={disabled || reachedLimit}
              onClick={() => toggle(pattern.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                (disabled || reachedLimit) && "cursor-not-allowed opacity-50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  active
                    ? "border-primary bg-primary text-[#0a0a0f]"
                    : "border-white/40 bg-transparent"
                )}
                aria-hidden="true"
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium text-white">
                    {pattern.name}
                  </div>
                  {likesLabel && (
                    <span className="text-[10px] uppercase tracking-wide text-white/40">
                      {likesLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 line-clamp-2">
                  {pattern.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
