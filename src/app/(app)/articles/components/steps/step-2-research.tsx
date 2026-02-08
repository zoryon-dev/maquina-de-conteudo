/**
 * Article Wizard — Step 2: Research (Processing)
 *
 * Shows research progress with polling. Auto-advances when complete.
 */

"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Loader2, CheckCircle2, Globe, Search, Brain } from "lucide-react"
import type { Article } from "@/db/schema"

interface ProcessingProgress {
  stage?: string
  percent?: number
  message?: string
}

const RESEARCH_STAGES = [
  { key: "extraction", icon: Globe, label: "Extraindo conteúdo de referência" },
  { key: "search", icon: Search, label: "Pesquisando contexto adicional" },
  { key: "synthesis", icon: Brain, label: "Sintetizando pesquisa" },
]

interface Step2ResearchProps {
  article: Article | null
  onComplete: () => void
  onRefresh: () => Promise<Article | null>
}

export function Step2Research({ article, onComplete, onRefresh }: Step2ResearchProps) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const progress = article?.processingProgress as ProcessingProgress | null

  const poll = useCallback(async () => {
    const data = await onRefresh()
    if (!data || !isMountedRef.current) return

    // Check if step changed (research complete → outline)
    if (data.currentStep !== "research") {
      console.log(`[Step2Research] Poll: step changed to "${data.currentStep}", calling onComplete`)
      onComplete()
      return
    }

    const p = data.processingProgress as ProcessingProgress | null
    console.log(`[Step2Research] Poll: step="${data.currentStep}", progress=${p?.percent}%`)
    pollingRef.current = setTimeout(poll, 2500)
  }, [onRefresh, onComplete])

  useEffect(() => {
    isMountedRef.current = true
    pollingRef.current = setTimeout(poll, 2500)

    return () => {
      isMountedRef.current = false
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [poll])

  const currentPercent = progress?.percent ?? 0
  const currentMessage = progress?.message ?? "Iniciando pesquisa..."

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">Pesquisando...</h2>
        <p className="text-white/50 text-sm">{currentMessage}</p>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${currentPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {RESEARCH_STAGES.map((stage, i) => {
          const stagePercent = ((i + 1) / RESEARCH_STAGES.length) * 100
          const isDone = currentPercent >= stagePercent
          const isCurrent =
            currentPercent >= (i / RESEARCH_STAGES.length) * 100 &&
            currentPercent < stagePercent

          return (
            <div
              key={stage.key}
              className="flex items-center gap-3 text-sm"
            >
              {isDone ? (
                <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border border-white/20 flex-shrink-0" />
              )}
              <stage.icon
                size={16}
                className={isDone || isCurrent ? "text-white/70" : "text-white/30"}
              />
              <span className={isDone || isCurrent ? "text-white/70" : "text-white/30"}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
