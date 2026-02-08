/**
 * Article Wizard — Step 6: SEO/GEO Check
 *
 * Shows SEO + GEO scores side by side.
 * SEO: checklist with pass/warn/fail.
 * GEO: 6-criteria breakdown with expandable details.
 * Both run in parallel on the pipeline.
 */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap,
  Search,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { scoreBadge } from "../shared/score-utils"
import { GeoScoreCard } from "../shared/geo-score-card"
import type { Article } from "@/db/schema"

type TabId = "seo" | "geo"

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

interface GeoReport {
  overallScore: number
  targetQueries?: string[]
  directAnswers: { score: number; issues: string[]; recommendations: string[] }
  citableData: { score: number; issues: string[]; recommendations: string[] }
  extractableStructure: { score: number; issues: string[]; recommendations: string[] }
  authorityEeat: { score: number; issues: string[]; recommendations: string[] }
  topicCoverage: { score: number; issues: string[]; recommendations: string[]; missingSubtopics?: string[] }
  schemaMetadata: { score: number; issues: string[]; recommendations: string[] }
  priorityFixes?: Array<{ fix: string; impact: string; effort: string; criterion: string; estimatedScoreImprovement: number }>
  aiCitationProbability?: { score: number; assessment: string }
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
  const [activeTab, setActiveTab] = useState<TabId>("seo")

  const seoReport = article?.seoReport as SeoReport | null
  const geoReport = article?.geoReport as GeoReport | null
  const seoScore = article?.seoScore
  const geoScore = article?.geoScore

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
        <p className="text-white/50">Analisando SEO e GEO...</p>
      </div>
    )
  }

  const checks = seoReport.checks ?? []
  const passCount = checks.filter((c) => c.status === "pass").length
  const warnCount = checks.filter((c) => c.status === "warn").length
  const failCount = checks.filter((c) => c.status === "fail").length

  const TABS: { id: TabId; label: string; icon: typeof Search; score?: number | null }[] = [
    { id: "seo", label: "SEO", icon: Search, score: seoScore },
    { id: "geo", label: "GEO", icon: Bot, score: geoScore },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">SEO & GEO Check</h2>
          <p className="text-sm text-white/50 mt-1">
            Análise de SEO tradicional e AI-Readiness (GEO)
          </p>
        </div>

        {/* Score summary */}
        <div className="flex items-center gap-4">
          {seoScore != null && (
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                seoScore >= 80 ? "text-green-400" : seoScore >= 60 ? "text-yellow-400" : "text-red-400",
              )}>
                {seoScore}
              </div>
              <p className="text-[10px] text-white/30">SEO</p>
            </div>
          )}
          {geoScore != null && (
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                geoScore >= 80 ? "text-green-400" : geoScore >= 60 ? "text-yellow-400" : "text-red-400",
              )}>
                {geoScore}
              </div>
              <p className="text-[10px] text-white/30">GEO</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === tab.id
                  ? "text-white bg-white/5 border-b-2 border-primary"
                  : "text-white/50 hover:text-white/70",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.score != null && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full ml-1",
                  scoreBadge(tab.score),
                )}>
                  {tab.score}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="space-y-5">
          {/* Score bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Score SEO geral</span>
              <span className={cn(
                "font-bold",
                (seoScore ?? 0) >= 80 ? "text-green-400" : (seoScore ?? 0) >= 60 ? "text-yellow-400" : "text-red-400",
              )}>
                {seoScore ?? 0}/100
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  (seoScore ?? 0) >= 80 ? "bg-green-400" : (seoScore ?? 0) >= 60 ? "bg-yellow-400" : "bg-red-400",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${seoScore ?? 0}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          {/* Status summary pills */}
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/5 border border-green-400/10">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-sm text-green-400 font-medium">{passCount}</span>
              <span className="text-xs text-green-400/60">ok</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400/5 border border-yellow-400/10">
              <AlertTriangle size={14} className="text-yellow-400" />
              <span className="text-sm text-yellow-400 font-medium">{warnCount}</span>
              <span className="text-xs text-yellow-400/60">atenção</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/5 border border-red-400/10">
              <XCircle size={14} className="text-red-400" />
              <span className="text-sm text-red-400 font-medium">{failCount}</span>
              <span className="text-xs text-red-400/60">falha</span>
            </div>
          </div>

          {/* Priority categories */}
          {(["high", "medium", "low"] as const).map((priority) => {
            const priorityChecks = checks.filter((c) => c.priority === priority)
            if (priorityChecks.length === 0) return null
            const priorityPass = priorityChecks.filter((c) => c.status === "pass").length
            const priorityPercent = Math.round((priorityPass / priorityChecks.length) * 100)
            const priorityLabels = { high: "Alta Prioridade", medium: "Média Prioridade", low: "Baixa Prioridade" }

            return (
              <div key={priority} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/50">{priorityLabels[priority]}</span>
                  <span className="text-xs text-white/30">{priorityPass}/{priorityChecks.length} ok</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", priorityPercent >= 80 ? "bg-green-400" : priorityPercent >= 50 ? "bg-yellow-400" : "bg-red-400")}
                    style={{ width: `${priorityPercent}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {priorityChecks
                    .sort((a, b) => { const order = { fail: 0, warn: 1, pass: 2 }; return order[a.status] - order[b.status] })
                    .map((check, i) => {
                      const Icon = STATUS_ICON[check.status]
                      return (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                          <Icon size={14} className={cn("mt-0.5 flex-shrink-0", STATUS_COLOR[check.status])} />
                          <div className="min-w-0">
                            <p className="text-white/80 text-xs font-medium">{check.criterion}</p>
                            <p className="text-white/40 text-[11px] mt-0.5">{check.message}</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}

          {/* Suggestions */}
          {seoReport.suggestions?.length > 0 && (
            <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4 space-y-2">
              <h3 className="text-sm font-medium text-primary/80">Sugestões de Melhoria</h3>
              <ul className="space-y-1.5">
                {seoReport.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* GEO Tab */}
      {activeTab === "geo" && (
        <div>
          {geoReport ? (
            <GeoScoreCard
              overallScore={geoReport.overallScore}
              directAnswers={geoReport.directAnswers}
              citableData={geoReport.citableData}
              extractableStructure={geoReport.extractableStructure}
              authorityEeat={geoReport.authorityEeat}
              topicCoverage={geoReport.topicCoverage}
              schemaMetadata={geoReport.schemaMetadata}
              priorityFixes={geoReport.priorityFixes}
              aiCitationProbability={geoReport.aiCitationProbability}
            />
          ) : (
            <div className="text-center py-8 space-y-2">
              <Bot className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-sm text-white/40">
                A análise GEO não está disponível para este artigo.
              </p>
              <p className="text-xs text-white/30">
                O GEO check pode ter falhado ou não foi executado.
              </p>
            </div>
          )}
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
