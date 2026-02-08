/**
 * Article Wizard — GEO Score Card
 *
 * Displays GEO overall score + breakdown by 6 criteria.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  MessageSquareText,
  BarChart3,
  LayoutList,
  ShieldCheck,
  BookOpen,
  Code,
  ChevronDown,
  ChevronUp,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GeoSubScore {
  score: number
  issues: string[]
  recommendations: string[]
  missingSubtopics?: string[]
}

interface GeoPriorityFix {
  fix: string
  impact: string
  effort: string
  criterion: string
  estimatedScoreImprovement: number
}

interface GeoScoreCardProps {
  overallScore: number
  directAnswers: GeoSubScore
  citableData: GeoSubScore
  extractableStructure: GeoSubScore
  authorityEeat: GeoSubScore
  topicCoverage: GeoSubScore
  schemaMetadata: GeoSubScore
  priorityFixes?: GeoPriorityFix[]
  aiCitationProbability?: { score: number; assessment: string }
}

const CRITERIA = [
  { key: "directAnswers", label: "Respostas Diretas", icon: MessageSquareText, weight: "alto" },
  { key: "citableData", label: "Dados Citáveis", icon: BarChart3, weight: "alto" },
  { key: "extractableStructure", label: "Estrutura Extraível", icon: LayoutList, weight: "médio" },
  { key: "authorityEeat", label: "E-E-A-T", icon: ShieldCheck, weight: "médio" },
  { key: "topicCoverage", label: "Cobertura Temática", icon: BookOpen, weight: "alto" },
  { key: "schemaMetadata", label: "Schema & Metadata", icon: Code, weight: "baixo" },
] as const

import { scoreColor, scoreBg } from "./score-utils"

export function GeoScoreCard(props: GeoScoreCardProps) {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null)

  const scores: Record<string, GeoSubScore> = {
    directAnswers: props.directAnswers,
    citableData: props.citableData,
    extractableStructure: props.extractableStructure,
    authorityEeat: props.authorityEeat,
    topicCoverage: props.topicCoverage,
    schemaMetadata: props.schemaMetadata,
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className={cn("text-5xl font-bold", scoreColor(props.overallScore))}>
            {props.overallScore}
          </div>
          <p className="text-white/40 text-xs mt-1">GEO Score</p>
        </div>

        {props.aiCitationProbability && (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <Bot size={14} className="text-primary/60" />
            <div>
              <p className="text-[10px] text-white/30 uppercase">AI Citation</p>
              <p className={cn("text-sm font-medium", scoreColor(props.aiCitationProbability.score))}>
                {props.aiCitationProbability.assessment}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Criteria Breakdown */}
      <div className="space-y-1.5">
        {CRITERIA.map(({ key, label, icon: Icon, weight }, i) => {
          const sub = scores[key]
          if (!sub) return null
          const isExpanded = expandedCriterion === key

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setExpandedCriterion(isExpanded ? null : key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <Icon size={14} className="text-white/40 flex-shrink-0" />
                <span className="text-sm text-white/80 flex-1 text-left">{label}</span>
                <span className="text-[10px] text-white/20 mr-2">{weight}</span>

                {/* Score bar */}
                <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", scoreBg(sub.score))}
                    style={{ width: `${sub.score}%` }}
                  />
                </div>

                <span className={cn("text-sm font-mono w-8 text-right", scoreColor(sub.score))}>
                  {sub.score}
                </span>

                {isExpanded ? (
                  <ChevronUp size={12} className="text-white/30" />
                ) : (
                  <ChevronDown size={12} className="text-white/30" />
                )}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="ml-7 mt-1 mb-2 space-y-2"
                >
                  {sub.issues.length > 0 && (
                    <div>
                      <p className="text-[10px] text-red-400/60 uppercase mb-1">Issues</p>
                      {sub.issues.map((issue, j) => (
                        <p key={j} className="text-xs text-white/40 pl-2 border-l border-red-400/20 mb-1">
                          {issue}
                        </p>
                      ))}
                    </div>
                  )}
                  {sub.recommendations.length > 0 && (
                    <div>
                      <p className="text-[10px] text-primary/60 uppercase mb-1">Recomendações</p>
                      {sub.recommendations.map((rec, j) => (
                        <p key={j} className="text-xs text-white/40 pl-2 border-l border-primary/20 mb-1">
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}
                  {sub.missingSubtopics && sub.missingSubtopics.length > 0 && (
                    <div>
                      <p className="text-[10px] text-yellow-400/60 uppercase mb-1">Subtópicos Faltantes</p>
                      {sub.missingSubtopics.map((topic, j) => (
                        <p key={j} className="text-xs text-white/40 pl-2 border-l border-yellow-400/20 mb-1">
                          {topic}
                        </p>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Priority Fixes */}
      {props.priorityFixes && props.priorityFixes.length > 0 && (
        <div>
          <h4 className="text-xs text-white/50 uppercase tracking-wider mb-2">Correções Prioritárias</h4>
          <div className="space-y-1.5">
            {props.priorityFixes.slice(0, 5).map((fix, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5",
                  fix.impact === "alto"
                    ? "bg-red-400/10 text-red-400"
                    : fix.impact === "médio"
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-white/5 text-white/40",
                )}>
                  {fix.impact}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70">{fix.fix}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {fix.criterion} · +{fix.estimatedScoreImprovement}pts · esforço: {fix.effort}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
