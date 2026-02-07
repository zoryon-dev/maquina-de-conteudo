/**
 * Extension Mode — Diagnosis View
 *
 * Displays the EXT-01 diagnosis: metrics, weak sections, missing sections, fixes.
 */

"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  TrendingUp,
  FileText,
  BarChart3,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DiagnosisViewProps {
  diagnosis: {
    currentMetrics: {
      wordCount: number
      headingCount: { h2: number; h3: number }
      internalLinks: number
      externalLinks: number
      estimatedSeoScore: number
      estimatedGeoScore: number
    }
    competitorBenchmark: {
      avgWordCount: number
      avgHeadingCount: number
      topCompetitor: { url: string; wordCount: number; strengths: string[] }
    }
    weakSections: Array<{
      heading: string
      currentWordCount: number
      competitorAvgWordCount: number
      depthAssessment: string
      issues: string[]
      impact: string
    }>
    missingSections: Array<{
      topic: string
      proposedHeading: string
      estimatedWordCount: number
      impact: string
      rationale: string
    }>
    projectedAfterFixes: {
      wordCount: number
      seoScore: number
      geoScore: number
      improvementSummary: string
    }
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400"
  if (score >= 60) return "text-yellow-400"
  return "text-red-400"
}

function impactBadge(impact: string) {
  const colors: Record<string, string> = {
    alto: "bg-red-400/10 text-red-400",
    médio: "bg-yellow-400/10 text-yellow-400",
    baixo: "bg-white/5 text-white/40",
  }
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", colors[impact] || colors.baixo)}>
      {impact}
    </span>
  )
}

export function DiagnosisView({ diagnosis }: DiagnosisViewProps) {
  const { currentMetrics: m, competitorBenchmark: cb, projectedAfterFixes: p } = diagnosis

  return (
    <div className="space-y-6">
      {/* Metrics comparison */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Palavras" current={m.wordCount} benchmark={cb.avgWordCount} icon={FileText} />
        <MetricCard label="Headings" current={m.headingCount.h2 + m.headingCount.h3} benchmark={cb.avgHeadingCount} icon={BarChart3} />
        <MetricCard label="SEO" current={m.estimatedSeoScore} benchmark={null} icon={TrendingUp} isScore />
        <MetricCard label="GEO" current={m.estimatedGeoScore} benchmark={null} icon={Link2} isScore />
      </div>

      {/* Projected improvement */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <p className="text-xs text-primary/60 mb-1">Projeção após todas as correções</p>
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">{p.wordCount.toLocaleString()} palavras</span>
          <span className={cn("font-medium", scoreColor(p.seoScore))}>SEO: {p.seoScore}</span>
          <span className={cn("font-medium", scoreColor(p.geoScore))}>GEO: {p.geoScore}</span>
        </div>
        <p className="text-xs text-white/40 mt-1">{p.improvementSummary}</p>
      </div>

      {/* Weak Sections */}
      {diagnosis.weakSections.length > 0 && (
        <section>
          <h4 className="text-xs text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
            Seções Fracas ({diagnosis.weakSections.length})
          </h4>
          <div className="space-y-2">
            {diagnosis.weakSections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{s.heading}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {s.currentWordCount} palavras (concorrentes: ~{s.competitorAvgWordCount}) · {s.depthAssessment}
                    </p>
                  </div>
                  {impactBadge(s.impact)}
                </div>
                {s.issues.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {s.issues.map((issue, j) => (
                      <li key={j} className="text-xs text-white/30 flex items-start gap-1.5">
                        <span className="text-yellow-400/50 mt-0.5">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Missing Sections */}
      {diagnosis.missingSections.length > 0 && (
        <section>
          <h4 className="text-xs text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-red-400" />
            Seções Faltantes ({diagnosis.missingSections.length})
          </h4>
          <div className="space-y-2">
            {diagnosis.missingSections.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{s.proposedHeading}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      ~{s.estimatedWordCount} palavras · {s.rationale}
                    </p>
                  </div>
                  {impactBadge(s.impact)}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MetricCard({
  label,
  current,
  benchmark,
  icon: Icon,
  isScore,
}: {
  label: string
  current: number
  benchmark: number | null
  icon: typeof FileText
  isScore?: boolean
}) {
  const diff = benchmark ? current - benchmark : 0
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-white/30" />
        <span className="text-[10px] text-white/30 uppercase">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", isScore ? scoreColor(current) : "text-white")}>
        {current.toLocaleString()}
      </p>
      {benchmark != null && (
        <p className={cn("text-[10px]", diff >= 0 ? "text-green-400/60" : "text-red-400/60")}>
          vs avg {benchmark.toLocaleString()} ({diff >= 0 ? "+" : ""}{diff.toLocaleString()})
        </p>
      )}
    </div>
  )
}
