/**
 * Article Wizard — Step 6: SEO/GEO Check
 *
 * Shows SEO score dashboard with checks and suggestions.
 * Triggers optimization when ready.
 */

"use client"

import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"

interface SeoCheck {
  criterion: string
  status: "pass" | "warn" | "fail"
  message: string
  priority: "high" | "medium" | "low"
}

interface SeoReport {
  overallScore: number
  checks: SeoCheck[]
  suggestions: string[]
}

interface Step6SeoGeoProps {
  article: Article | null
  onSubmitOptimization: () => void
  onRefresh: () => Promise<Article | null>
  isSubmitting: boolean
}

const STATUS_ICON = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
}

const STATUS_COLOR = {
  pass: "text-green-400",
  warn: "text-yellow-400",
  fail: "text-red-400",
}

export function Step6SeoGeo({
  article,
  onSubmitOptimization,
  onRefresh,
  isSubmitting,
}: Step6SeoGeoProps) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const seoReport = article?.seoReport as SeoReport | null
  const seoScore = article?.seoScore

  // Poll until SEO report is available
  const poll = useCallback(async () => {
    const data = await onRefresh()
    if (!data || !isMountedRef.current) return

    if (data.seoReport) return // Done

    pollingRef.current = setTimeout(poll, 2500)
  }, [onRefresh])

  useEffect(() => {
    isMountedRef.current = true
    if (!seoReport) {
      pollingRef.current = setTimeout(poll, 2500)
    }

    return () => {
      isMountedRef.current = false
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [poll, seoReport])

  if (!seoReport) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-white/50">Analisando SEO...</p>
      </div>
    )
  }

  const checks = seoReport.checks ?? []
  const passCount = checks.filter((c) => c.status === "pass").length
  const warnCount = checks.filter((c) => c.status === "warn").length
  const failCount = checks.filter((c) => c.status === "fail").length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">SEO Check</h2>
        <p className="text-sm text-white/50 mt-1">
          Resultado da análise de SEO do artigo
        </p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div
            className={cn(
              "text-5xl font-bold",
              seoScore != null && seoScore >= 80
                ? "text-green-400"
                : seoScore != null && seoScore >= 60
                  ? "text-yellow-400"
                  : "text-red-400",
            )}
          >
            {seoScore ?? "?"}
          </div>
          <p className="text-white/40 text-xs mt-1">SEO Score</p>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 size={14} /> {passCount}
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <AlertTriangle size={14} /> {warnCount}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <XCircle size={14} /> {failCount}
          </span>
        </div>
      </div>

      {/* Checks */}
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {checks
          .sort((a, b) => {
            const order = { fail: 0, warn: 1, pass: 2 }
            return order[a.status] - order[b.status]
          })
          .map((check, i) => {
            const Icon = STATUS_ICON[check.status]
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <Icon size={16} className={cn("mt-0.5 flex-shrink-0", STATUS_COLOR[check.status])} />
                <div className="min-w-0">
                  <p className="text-white/80 text-sm font-medium">{check.criterion}</p>
                  <p className="text-white/40 text-xs mt-0.5">{check.message}</p>
                </div>
                <span className="text-[10px] text-white/30 ml-auto flex-shrink-0 uppercase">
                  {check.priority}
                </span>
              </motion.div>
            )
          })}
      </div>

      {/* Suggestions */}
      {seoReport.suggestions?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-2">Sugestões</h3>
          <ul className="space-y-1">
            {seoReport.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Optimization */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onSubmitOptimization}
          disabled={isSubmitting}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Otimizando...
            </>
          ) : (
            <>
              <Zap size={16} className="mr-2" />
              Otimizar Artigo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
