/**
 * Article Wizard — Steps Indicator
 *
 * Visual progress indicator for the article wizard pipeline.
 * 8 linear steps: Inputs → Research → Outline → Production → Assembly → SEO → Optimization → Metadata
 */

"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
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
}

const ARTICLE_STEPS: StepConfig[] = [
  { value: "inputs", label: "Briefing", shortLabel: "Brief" },
  { value: "research", label: "Pesquisa", shortLabel: "Pesq" },
  { value: "outline", label: "Outline", shortLabel: "Out" },
  { value: "production", label: "Produção", shortLabel: "Prod" },
  { value: "assembly", label: "Montagem", shortLabel: "Mont" },
  { value: "seo_geo_check", label: "SEO Check", shortLabel: "SEO" },
  { value: "optimization", label: "Otimização", shortLabel: "Otim" },
  { value: "metadata", label: "Metadados", shortLabel: "Meta" },
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

            return (
              <div key={step.value} className="flex items-center">
                <motion.button
                  onClick={() => isClickable && onStepClick(step.value)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors",
                    isPast || isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20 bg-white/5 text-white/40",
                    isClickable && "cursor-pointer hover:scale-110 active:scale-95",
                    !isClickable && "cursor-default",
                  )}
                >
                  {isPast ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px] font-semibold">{index + 1}</span>
                  )}

                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/50 blur-md -z-10"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                <div className="ml-1.5 mr-2 min-w-0">
                  <p
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      isCurrent ? "text-white" : "text-white/50",
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
