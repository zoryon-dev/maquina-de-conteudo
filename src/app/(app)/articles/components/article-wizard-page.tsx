/**
 * Article Wizard Page — Main Orchestrator
 *
 * Manages article wizard state, step transitions, polling, and API communication.
 * Follows the existing wizard-page.tsx pattern.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArticleStepsIndicator,
  type ArticleStepValue,
} from "./shared/article-steps-indicator"
import { Step1Inputs } from "./steps/step-1-inputs"
import { Step2Research } from "./steps/step-2-research"
import { Step3Outline } from "./steps/step-3-outline"
import { Step4Production } from "./steps/step-4-production"
import { Step5Assembly } from "./steps/step-5-assembly"
import { Step6SeoGeo } from "./steps/step-6-seo-geo"
import { Step7Optimization } from "./steps/step-7-optimization"
import { Step8Metadata } from "./steps/step-8-metadata"
import type { Article } from "@/db/schema"

// Processing stages that use polling
const PROCESSING_STEPS = new Set<ArticleStepValue>([
  "research",
  "production",
  "optimization",
])

export interface ArticleModelConfig {
  default?: string
  research?: string
  outline?: string
  production?: string
  optimization?: string
  image?: string
}

export interface ArticleFormData {
  title?: string
  primaryKeyword?: string
  secondaryKeywords?: string[]
  articleType?: string
  targetWordCount?: number
  referenceUrl?: string
  referenceMotherUrl?: string
  customInstructions?: string
  authorName?: string
  model?: string
  modelConfig?: ArticleModelConfig
  selectedOutlineId?: string
  projectId?: number
}

interface ArticleWizardPageProps {
  articleId?: number
  className?: string
}

export function ArticleWizardPage({
  articleId: propArticleId,
  className,
}: ArticleWizardPageProps) {
  const router = useRouter()
  const [articleId, setArticleId] = useState<number | null>(propArticleId ?? null)
  const [article, setArticle] = useState<Article | null>(null)
  const [currentStep, setCurrentStep] = useState<ArticleStepValue>("inputs")
  const [formData, setFormData] = useState<ArticleFormData>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!propArticleId)

  const isMountedRef = useRef(true)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount (reset isMountedRef on every mount to handle StrictMode)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [])

  // Load existing article
  useEffect(() => {
    if (!propArticleId) return
    isMountedRef.current = true

    const loadArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${propArticleId}`)
        if (!response.ok) throw new Error("Artigo não encontrado")

        const data: Article = await response.json()
        if (!isMountedRef.current) return

        setArticle(data)
        setArticleId(data.id)
        setCurrentStep(data.currentStep as ArticleStepValue)
        setFormData({
          title: data.title ?? undefined,
          primaryKeyword: data.primaryKeyword ?? undefined,
          secondaryKeywords: data.secondaryKeywords as string[] | undefined,
          articleType: data.articleType ?? undefined,
          targetWordCount: data.targetWordCount ?? undefined,
          referenceUrl: data.referenceUrl ?? undefined,
          referenceMotherUrl: data.referenceMotherUrl ?? undefined,
          customInstructions: data.customInstructions ?? undefined,
          authorName: data.authorName ?? undefined,
          model: data.model ?? undefined,
          selectedOutlineId: data.selectedOutlineId ?? undefined,
          projectId: data.projectId ?? undefined,
        })

      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Erro ao carregar artigo")
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false)
      }
    }

    loadArticle()
  }, [propArticleId])

  // Auto-save (debounced)
  const autoSave = useCallback(
    async (data: ArticleFormData) => {
      if (!articleId) return
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/articles/${articleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
        } catch {
          // Silent fail — auto-save
        }
      }, 1500)
    },
    [articleId],
  )

  // Refresh article data from API
  const refreshArticle = useCallback(async () => {
    if (!articleId) return null
    try {
      const response = await fetch(`/api/articles/${articleId}`)
      if (!response.ok) return null
      const data: Article = await response.json()
      if (isMountedRef.current) {
        setArticle(data)
      } else {
        console.warn("[ArticleWizard] refreshArticle: isMountedRef is false, skipping setArticle")
      }
      return data
    } catch {
      return null
    }
  }, [articleId])

  // Polling for processing steps
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearTimeout(pollingRef.current)
    console.log(`[ArticleWizard] startPolling (currentStep="${currentStep}")`)

    const poll = async () => {
      const data = await refreshArticle()
      if (!data || !isMountedRef.current) return

      const progress = data.processingProgress as {
        stage?: string
        percent?: number
        message?: string
      } | null

      // Check if step has advanced
      if (data.currentStep !== currentStep) {
        console.log(`[ArticleWizard] Poll: step advanced "${currentStep}" → "${data.currentStep}"`)
        setCurrentStep(data.currentStep as ArticleStepValue)
        return // Stop polling — step changed
      }

      // Continue polling if still processing
      if (progress && progress.percent !== undefined && progress.percent < 100) {
        pollingRef.current = setTimeout(poll, 2000)
      } else {
        console.log(`[ArticleWizard] Poll: done (percent=${progress?.percent}, step="${data.currentStep}")`)
      }
    }

    pollingRef.current = setTimeout(poll, 2000)
  }, [refreshArticle, currentStep])

  // Map API stage names to UI step names (some stages differ from enum values)
  const STAGE_TO_UI_STEP: Record<string, ArticleStepValue> = {
    section_production: "production",
  }

  // Submit a pipeline stage
  const submitStage = async (stage: string) => {
    if (!articleId) return
    setIsSubmitting(true)
    setError(null)

    const uiStep = STAGE_TO_UI_STEP[stage] ?? (stage as ArticleStepValue)
    console.log(`[ArticleWizard] submitStage: "${stage}" → UI step "${uiStep}"`)

    try {
      const response = await fetch(`/api/articles/${articleId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Erro desconhecido" }))
        throw new Error(data.error)
      }

      // Move to the processing step (use mapped UI step)
      setCurrentStep(uiStep)
      startPolling()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 1: Create article & submit research
  const handleSubmitInputs = async () => {
    console.log("[ArticleWizard] handleSubmitInputs: starting")
    setIsSubmitting(true)
    setError(null)

    try {
      let id = articleId

      if (!id) {
        // Create article
        const response = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Erro ao criar artigo" }))
          throw new Error(data.error)
        }
        const newArticle: Article = await response.json()
        id = newArticle.id
        setArticleId(id)
        setArticle(newArticle)

        // Update URL without remount (avoid killing this component's state)
        window.history.replaceState(null, "", `/articles/${id}`)
      } else {
        // Save inputs
        await fetch(`/api/articles/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
      }

      // Submit research stage
      const submitRes = await fetch(`/api/articles/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "research" }),
      })
      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({ error: "Erro" }))
        throw new Error(data.error)
      }

      setCurrentStep("research")
      startPolling()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar processamento")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Outline selected → submit section production
  const handleOutlineSelected = async (outlineId: string) => {
    if (!articleId) return

    // Save selected outline
    await fetch(`/api/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOutlineId: outlineId }),
    })

    setFormData((prev) => ({ ...prev, selectedOutlineId: outlineId }))
    await submitStage("section_production")
  }

  // Navigate to next manual step
  const handleNextStep = (nextStep: ArticleStepValue) => {
    setCurrentStep(nextStep)
  }

  // Handle polling completion (processing steps auto-advance)
  const handleProcessingComplete = async (nextStep: ArticleStepValue) => {
    console.log(`[ArticleWizard] handleProcessingComplete → "${nextStep}"`)
    if (pollingRef.current) clearTimeout(pollingRef.current)
    await refreshArticle()
    setCurrentStep(nextStep)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/articles")}
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft size={16} className="mr-1" />
          Artigos
        </Button>
        <h1 className="text-lg font-semibold text-white">
          {article?.title || formData.primaryKeyword || "Novo Artigo"}
        </h1>
      </div>

      {/* Steps Indicator */}
      <ArticleStepsIndicator currentStep={currentStep} />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === "inputs" && (
            <Step1Inputs
              formData={formData}
              onChange={(data) => {
                setFormData(data)
                autoSave(data)
              }}
              onSubmit={handleSubmitInputs}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === "research" && (
            <Step2Research
              article={article}
              onComplete={() => handleProcessingComplete("outline")}
              onRefresh={refreshArticle}
            />
          )}

          {currentStep === "outline" && (
            <Step3Outline
              article={article}
              onSelect={handleOutlineSelected}
              onRefresh={refreshArticle}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === "production" && (
            <Step4Production
              article={article}
              onComplete={() => handleProcessingComplete("assembly")}
              onRefresh={refreshArticle}
            />
          )}

          {currentStep === "assembly" && (
            <Step5Assembly
              article={article}
              onSubmitSeo={() => submitStage("seo_geo_check")}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === "seo_geo_check" && (
            <Step6SeoGeo
              article={article}
              onSubmitOptimization={() => submitStage("optimization")}
              onRefresh={refreshArticle}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === "optimization" && (
            <Step7Optimization
              article={article}
              onComplete={() => handleProcessingComplete("metadata")}
              onRefresh={refreshArticle}
            />
          )}

          {currentStep === "metadata" && (
            <Step8Metadata
              article={article}
              onComplete={() => {
                setCurrentStep("completed")
                router.push("/articles")
              }}
            />
          )}

          {currentStep === "completed" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Artigo Concluído!</h2>
              <p className="text-white/60 text-center max-w-md">
                Seu artigo foi otimizado e está pronto para publicação.
              </p>
              <Button
                onClick={() => router.push("/articles")}
                className="mt-4 bg-primary text-black hover:bg-primary/90"
              >
                Ver Artigos
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
