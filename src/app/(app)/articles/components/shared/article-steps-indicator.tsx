/**
 * Article Wizard — Steps Indicator
 *
 * Visual progress indicator with icons, tooltips, status colors.
 * Clickable to navigate to completed steps.
 */

"use client"

import { motion } from "framer-motion"
import {
  Check,
  Pen,
  Search,
  LayoutList,
  FileText,
  Layers,
  BarChart3,
  Zap,
  Tags,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ArticleStepValue =
  | "inputs"
  | "research"
  | "outline"
  | "production"
  | "assembly"
  | "seo_geo_check"
  | "optimization"
  | "metadata"
  | "completed"

interface StepConfig {
  value: ArticleStepValue
  label: string
  shortLabel: string
  icon: React.ElementType
  tooltip: string
}

const ARTICLE_STEPS: StepConfig[] = [
  { value: "inputs", label: "Briefing", shortLabel: "Brief", icon: Pen, tooltip: "Dados iniciais do artigo" },
  { value: "research", label: "Pesquisa", shortLabel: "Pesq", icon: Search, tooltip: "Pesquisa de referências e fontes" },
  { value: "outline", label: "Outline", shortLabel: "Out", icon: LayoutList, tooltip: "Estrutura e seções do artigo" },
  { value: "production", label: "Produção", shortLabel: "Prod", icon: FileText, tooltip: "Escrita seção a seção" },
  { value: "assembly", label: "Montagem", shortLabel: "Mont", icon: Layers, tooltip: "Montagem e edição do artigo" },
  { value: "seo_geo_check", label: "SEO Check", shortLabel: "SEO", icon: BarChart3, tooltip: "Análise SEO e GEO" },
  { value: "optimization", label: "Otimização", shortLabel: "Otim", icon: Zap, tooltip: "Otimização automática" },
  { value: "metadata", label: "Metadados", shortLabel: "Meta", icon: Tags, tooltip: "Links, imagem e metadados" },
]

interface ArticleStepsIndicatorProps {
  currentStep: ArticleStepValue
  onStepClick?: (step: ArticleStepValue) => void
  className?: string
}

export function ArticleStepsIndicator({
  currentStep,
  onStepClick,
  className,
}: ArticleStepsIndicatorProps) {
  const currentIndex = ARTICLE_STEPS.findIndex((s) => s.value === currentStep)
  const isCompleted = currentStep === "completed"

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex items-center min-w-max px-1">
          {ARTICLE_STEPS.map((step, index) => {
            const isPast = index < currentIndex || isCompleted
            const isCurrent = index === currentIndex
            const isClickable = onStepClick && isPast
            const StepIcon = step.icon

            return (
              <div key={step.value} className="flex items-center group/step">
                <div className="relative">
                  <motion.button
                    onClick={() => isClickable && onStepClick(step.value)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                      isPast
                        ? "border-primary bg-primary text-black"
                        : isCurrent
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/15 bg-white/5 text-white/30",
                      isClickable && "cursor-pointer hover:scale-110 active:scale-95",
                      !isClickable && "cursor-default",
                    )}
                  >
                    {isPast ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}

                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/40 blur-md -z-10"
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.button>

                  {/* Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none z-10">
                    <span className="text-[10px] bg-white/10 backdrop-blur-sm text-white/70 px-2 py-1 rounded-md">
                      {step.tooltip}
                    </span>
                  </div>
                </div>

                <div className="ml-1.5 mr-2 min-w-0">
                  <p
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      isCurrent ? "text-white" : isPast ? "text-white/60" : "text-white/30",
                    )}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </p>
                </div>

                {index < ARTICLE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-shrink-0 w-4 sm:w-6 h-0.5 transition-colors",
                      index < currentIndex || isCompleted ? "bg-primary" : "bg-white/10",
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{
            width: isCompleted
              ? "100%"
              : `${((currentIndex + 1) / ARTICLE_STEPS.length) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}
