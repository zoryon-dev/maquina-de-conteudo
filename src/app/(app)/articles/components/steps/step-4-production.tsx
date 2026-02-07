/**
 * Article Wizard — Step 4: Production (Processing)
 *
 * Shows section-by-section production progress with polling.
 */

"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Loader2, CheckCircle2, Circle } from "lucide-react"
import type { Article } from "@/db/schema"

interface ProcessingProgress {
  stage?: string
  percent?: number
  message?: string
  currentSection?: number
  totalSections?: number
}

interface Step4ProductionProps {
  article: Article | null
  onComplete: () => void
  onRefresh: () => Promise<Article | null>
}

export function Step4Production({ article, onComplete, onRefresh }: Step4ProductionProps) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const progress = article?.processingProgress as ProcessingProgress | null
  const currentSection = progress?.currentSection ?? 0
  const totalSections = progress?.totalSections ?? 0
  const currentPercent = progress?.percent ?? 0
  const message = progress?.message ?? "Iniciando produção..."

  const poll = useCallback(async () => {
    const data = await onRefresh()
    if (!data || !isMountedRef.current) return

    if (data.currentStep !== "production") {
      onComplete()
      return
    }

    pollingRef.current = setTimeout(poll, 3000)
  }, [onRefresh, onComplete])

  useEffect(() => {
    isMountedRef.current = true
    pollingRef.current = setTimeout(poll, 3000)

    return () => {
      isMountedRef.current = false
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [poll])

  // Build section list from outline
  const outlines = article?.generatedOutlines as Array<{
    id: string
    sections?: Array<{ heading: string }>
  }> | null
  const selectedOutline = outlines?.find((o) => o.id === article?.selectedOutlineId)
  const sections = selectedOutline?.sections ?? []

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">Produzindo Artigo</h2>
        <p className="text-white/50 text-sm">{message}</p>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${currentPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Section List */}
      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map((section, i) => {
            const isDone = i + 1 < currentSection
            const isCurrent = i + 1 === currentSection
            const isPending = i + 1 > currentSection

            return (
              <div
                key={i}
                className="flex items-center gap-3 text-sm"
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                ) : isCurrent ? (
                  <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Circle size={16} className="text-white/20 flex-shrink-0" />
                )}
                <span
                  className={
                    isDone
                      ? "text-white/50 line-through"
                      : isCurrent
                        ? "text-white"
                        : "text-white/30"
                  }
                >
                  {i + 1}. {section.heading}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Counter */}
      {totalSections > 0 && (
        <p className="text-center text-xs text-white/30">
          {currentSection}/{totalSections} seções
        </p>
      )}
    </div>
  )
}
