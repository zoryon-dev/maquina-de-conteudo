/**
 * Article Wizard — Step 7: Optimization (Processing)
 *
 * Shows optimization progress with polling. Auto-advances when complete.
 */

"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Loader2, Zap } from "lucide-react"
import type { Article } from "@/db/schema"

interface ProcessingProgress {
  stage?: string
  percent?: number
  message?: string
}

interface Step7OptimizationProps {
  article: Article | null
  onComplete: () => void
  onRefresh: () => Promise<Article | null>
}

export function Step7Optimization({ article, onComplete, onRefresh }: Step7OptimizationProps) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const progress = article?.processingProgress as ProcessingProgress | null
  const currentPercent = progress?.percent ?? 0
  const message = progress?.message ?? "Otimizando artigo..."

  const poll = useCallback(async () => {
    const data = await onRefresh()
    if (!data || !isMountedRef.current) return

    if (data.currentStep !== "optimization") {
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

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Zap size={40} className="text-primary" />
        </motion.div>
        <h2 className="text-xl font-semibold text-white">Otimizando</h2>
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

      <div className="text-center">
        <p className="text-xs text-white/30">
          SEO + Títulos sendo gerados...
        </p>
      </div>
    </div>
  )
}
