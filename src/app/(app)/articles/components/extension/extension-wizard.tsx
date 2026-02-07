/**
 * Extension Mode — Extension Wizard
 *
 * 5-step flow: Input → Diagnose → Select fixes → Expand → Review
 */

"use client"

import { useState, useCallback } from "react"
import {
  Loader2,
  Search,
  Stethoscope,
  CheckSquare,
  Zap,
  FileText,
  ArrowRight,
  ArrowLeft,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DiagnosisView } from "./diagnosis-view"
import { ExpansionSelector } from "./expansion-selector"

type ExtStep = "input" | "diagnosing" | "diagnosis" | "selecting" | "expanding" | "review"

interface ExtensionWizardProps {
  articleId: number
  articleContent: string
  primaryKeyword: string
}

export function ExtensionWizard({ articleId, articleContent, primaryKeyword }: ExtensionWizardProps) {
  const [step, setStep] = useState<ExtStep>("input")
  const [targetKeyword, setTargetKeyword] = useState(primaryKeyword)
  const [competitorInfo, setCompetitorInfo] = useState("")
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [selectedFixes, setSelectedFixes] = useState<string[]>([])
  const [expansion, setExpansion] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDiagnose = useCallback(async () => {
    setStep("diagnosing")
    setError(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "diagnose",
          targetKeyword,
          competitorArticles: competitorInfo || "[]",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Diagnosis failed")
      setDiagnosis(data.diagnosis)
      setStep("diagnosis")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no diagnóstico")
      setStep("input")
    }
  }, [articleId, targetKeyword, competitorInfo])

  const handlePlan = useCallback(async () => {
    setStep("selecting")
    setError(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "plan" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Planning failed")
      setPlan(data.plan)

      // Pre-select all recommended fixes
      const allIds = [
        ...(data.plan.sectionExpansions || []).map((s: any) => s.id),
        ...(data.plan.seoFixesDetailed || []).map((f: any) => f.id),
        ...(data.plan.geoFixesDetailed || []).map((f: any) => f.id),
      ]
      setSelectedFixes(allIds)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no planejamento")
      setStep("diagnosis")
    }
  }, [articleId])

  const handleExpand = useCallback(async () => {
    setStep("expanding")
    setError(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "expand", selectedFixes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Expansion failed")
      setExpansion(data.expansion)
      setStep("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na expansão")
      setStep("selecting")
    }
  }, [articleId, selectedFixes])

  const handleCopy = async () => {
    if (!expansion?.expandedArticle) return
    try {
      await navigator.clipboard.writeText(expansion.expandedArticle)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const STEPS: { id: ExtStep; label: string; icon: typeof Search }[] = [
    { id: "input", label: "Configurar", icon: Search },
    { id: "diagnosis", label: "Diagnóstico", icon: Stethoscope },
    { id: "selecting", label: "Selecionar", icon: CheckSquare },
    { id: "review", label: "Resultado", icon: FileText },
  ]

  const stepIndex = STEPS.findIndex((s) =>
    s.id === step || (step === "diagnosing" && s.id === "input") || (step === "expanding" && s.id === "selecting")
  )

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === stepIndex
          const isDone = i < stepIndex
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={cn("w-8 h-px", isDone ? "bg-primary/40" : "bg-white/10")} />}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                isActive ? "text-primary bg-primary/10" : isDone ? "text-primary/60" : "text-white/30",
              )}>
                <Icon size={12} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step: Input */}
      {step === "input" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Modo Extensão</h2>
            <p className="text-sm text-white/50 mt-1">
              Diagnostique e expanda seu artigo com análise competitiva
            </p>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Keyword alvo</label>
            <input
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm"
              placeholder="Keyword principal do artigo"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Artigos concorrentes (JSON, opcional)
            </label>
            <textarea
              value={competitorInfo}
              onChange={(e) => setCompetitorInfo(e.target.value)}
              rows={3}
              className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm font-mono"
              placeholder='[{"url": "...", "title": "...", "content_summary": "..."}]'
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleDiagnose}
              disabled={!targetKeyword.trim()}
              className="bg-primary text-black hover:bg-primary/90"
            >
              <Stethoscope size={16} className="mr-2" />
              Diagnosticar Artigo
            </Button>
          </div>
        </div>
      )}

      {/* Step: Diagnosing */}
      {step === "diagnosing" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-white/50">Analisando artigo e concorrentes...</p>
        </div>
      )}

      {/* Step: Diagnosis */}
      {step === "diagnosis" && diagnosis && (
        <div className="space-y-6">
          <DiagnosisView diagnosis={diagnosis} />
          <div className="flex justify-end">
            <Button onClick={handlePlan} className="bg-primary text-black hover:bg-primary/90">
              <Zap size={16} className="mr-2" />
              Gerar Plano de Expansão
            </Button>
          </div>
        </div>
      )}

      {/* Step: Selecting (loading plan or selecting fixes) */}
      {step === "selecting" && !plan && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-white/50">Gerando plano de expansão...</p>
        </div>
      )}

      {step === "selecting" && plan && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Selecione as Correções</h3>
            <p className="text-sm text-white/50 mt-1">
              Escolha quais correções aplicar ao artigo
            </p>
          </div>

          <ExpansionSelector
            sectionExpansions={plan.sectionExpansions || []}
            seoFixes={plan.seoFixesDetailed || []}
            geoFixes={plan.geoFixesDetailed || []}
            selectedFixes={selectedFixes}
            onSelectionChange={setSelectedFixes}
          />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep("diagnosis")}
              className="border-white/10 text-white/70"
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
            <Button
              onClick={handleExpand}
              disabled={selectedFixes.length === 0}
              className="bg-primary text-black hover:bg-primary/90"
            >
              <Zap size={16} className="mr-2" />
              Expandir ({selectedFixes.length} fixes)
            </Button>
          </div>
        </div>
      )}

      {/* Step: Expanding */}
      {step === "expanding" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-white/50">Expandindo artigo...</p>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && expansion && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Artigo Expandido</h3>
              <p className="text-sm text-white/50 mt-1">
                +{expansion.metricsAfter.wordCountAdded} palavras · {expansion.metricsAfter.totalWordCount} total
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="border-white/10 text-white/70"
            >
              {copied ? (
                <><CheckCircle2 size={16} className="mr-2 text-green-400" /> Copiado!</>
              ) : (
                <><Copy size={16} className="mr-2" /> Copiar</>
              )}
            </Button>
          </div>

          {/* Changes summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label="Novas seções" value={expansion.metricsAfter.newSectionsCount} />
            <MiniStat label="Expandidas" value={expansion.metricsAfter.expandedSectionsCount} />
            <MiniStat label="SEO fixes" value={expansion.metricsAfter.seoFixesApplied} />
            <MiniStat label="GEO fixes" value={expansion.metricsAfter.geoFixesApplied} />
          </div>

          {/* Content preview */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 max-h-[50vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
            {expansion.expandedArticle.split("\n").map((line: string, i: number) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{line.replace(/^# /, "")}</h1>
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">{line.replace(/^## /, "")}</h2>
              if (line.startsWith("### ")) return <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-2">{line.replace(/^### /, "")}</h3>
              if (line.trim() === "") return <br key={i} />
              return <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">{line}</p>
            })}
          </div>

          {/* Editor notes */}
          {expansion.editorReviewNotes?.length > 0 && (
            <div>
              <h4 className="text-xs text-white/50 uppercase tracking-wider mb-2">Notas do Editor</h4>
              <ul className="space-y-1">
                {expansion.editorReviewNotes.map((note: string, i: number) => (
                  <li key={i} className="text-xs text-yellow-400/60 flex items-start gap-1.5">
                    <span className="text-yellow-400/40 mt-0.5">!</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/30">{label}</p>
    </div>
  )
}
