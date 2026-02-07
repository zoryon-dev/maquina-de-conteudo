/**
 * Projects & Site Intelligence Section
 *
 * Manage projects and run Site Intelligence (crawl, brand voice, keyword gaps).
 */

"use client"

import * as React from "react"
import {
  Globe,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Clock,
  BarChart3,
  Link2,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const inputClasses =
  "!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"

interface Project {
  id: number
  name: string
  siteUrl: string | null
}

interface SiteIntelligenceData {
  id: number
  projectId: number
  siteUrl: string
  urlMap: unknown
  brandVoiceProfile: unknown
  keywordGaps: unknown
  competitorUrls: string[] | null
  crawledAt: string | null
  urlsCount: number | null
  status: string
  error: string | null
}

// ─────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: "text-white/50 bg-white/5 border-white/10", label: "Pendente" },
    crawling: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Crawling..." },
    analyzing: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "Analisando..." },
    complete: { color: "text-green-400 bg-green-500/10 border-green-500/20", label: "Pronto" },
    error: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Erro" },
  }
  const c = config[status] ?? config.pending

  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", c.color)}>
      {c.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────
// Freshness Check
// ─────────────────────────────────────────────────────

function isFresh(crawledAt: string | null): boolean {
  if (!crawledAt) return false
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return new Date(crawledAt) > sevenDaysAgo
}

function formatDate(d: string | null): string {
  if (!d) return "Nunca"
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─────────────────────────────────────────────────────
// SI Card for a project
// ─────────────────────────────────────────────────────

function SiteIntelligenceCard({
  project,
  si,
  onCrawl,
  onSave,
  isCrawling,
}: {
  project: Project
  si: SiteIntelligenceData | null
  onCrawl: (projectId: number) => void
  onSave: (projectId: number, siteUrl: string, competitorUrls: string[]) => void
  isCrawling: boolean
}) {
  const [siteUrl, setSiteUrl] = React.useState(si?.siteUrl || project.siteUrl || "")
  const [competitors, setCompetitors] = React.useState(
    si?.competitorUrls?.join("\n") || ""
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const urlMap = si?.urlMap as any[] | null
  const brandVoice = si?.brandVoiceProfile as Record<string, unknown> | null
  const keywordGaps = si?.keywordGaps as any[] | null
  const fresh = isFresh(si?.crawledAt ?? null)
  const isProcessing = si?.status === "crawling" || si?.status === "analyzing"

  const handleSave = async () => {
    if (!siteUrl) return
    setIsSaving(true)
    try {
      await onSave(
        project.id,
        siteUrl,
        competitors.split("\n").map((u) => u.trim()).filter(Boolean),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{project.name}</h3>
            <p className="text-xs text-white/50">
              {si ? <StatusBadge status={si.status} /> : "Nenhum crawl realizado"}
            </p>
          </div>
        </div>
        {si && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(si.crawledAt)}
            {si.crawledAt && !fresh && (
              <span className="text-yellow-400 ml-1">(expirado)</span>
            )}
          </div>
        )}
      </div>

      {/* Config fields */}
      <div className="grid gap-3">
        <div>
          <Label className="text-xs text-white/70 mb-1 block">URL do Site</Label>
          <Input
            className={inputClasses}
            placeholder="https://meusite.com.br"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-white/70 mb-1 block">
            URLs de Concorrentes (um por linha)
          </Label>
          <textarea
            className={cn(
              inputClasses,
              "w-full rounded-md px-3 py-2 text-sm min-h-[60px] resize-none"
            )}
            placeholder={"https://concorrente1.com\nhttps://concorrente2.com"}
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-white/70 hover:text-white"
          onClick={handleSave}
          disabled={isSaving || !siteUrl}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Salvar Config
        </Button>
        <Button
          size="sm"
          className="bg-primary text-black font-medium hover:bg-primary/90"
          onClick={() => onCrawl(project.id)}
          disabled={isCrawling || isProcessing || !siteUrl}
        >
          {isCrawling || isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {isProcessing ? "Processando..." : "Iniciar Crawl"}
        </Button>
      </div>

      {/* Error */}
      {si?.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{si.error}</p>
        </div>
      )}

      {/* Dashboard — only if we have data */}
      {si?.status === "complete" && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
          {/* URLs found */}
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
            <Link2 className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">
              {Array.isArray(urlMap) ? urlMap.length : 0}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">URLs</p>
          </div>

          {/* Brand Voice */}
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
            <Mic className="h-4 w-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">
              {brandVoice && Object.keys(brandVoice).length > 0 ? (
                <Check className="h-5 w-5 text-green-400 mx-auto" />
              ) : (
                "—"
              )}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Brand Voice
            </p>
          </div>

          {/* Keyword Gaps */}
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
            <BarChart3 className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-semibold text-white">
              {Array.isArray(keywordGaps) ? keywordGaps.length : 0}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Keyword Gaps
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Main Section
// ─────────────────────────────────────────────────────

export function ProjectsSection() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [siData, setSiData] = React.useState<Record<number, SiteIntelligenceData>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [crawlingProjects, setCrawlingProjects] = React.useState<Set<number>>(new Set())

  // Load projects
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/projects")
        if (!res.ok) throw new Error("Failed to load projects")
        const data = await res.json()
        setProjects(data.projects || data || [])

        // Load SI data for each project
        const projectList = data.projects || data || []
        for (const p of projectList) {
          const siRes = await fetch(
            `/api/articles/site-intelligence?projectId=${p.id}`
          )
          if (siRes.ok) {
            const siJson = await siRes.json()
            if (siJson.siteIntelligence) {
              setSiData((prev) => ({
                ...prev,
                [p.id]: siJson.siteIntelligence,
              }))
            }
          }
        }
      } catch (err) {
        console.error("[ProjectsSection] Load error:", err)
        toast.error("Erro ao carregar projetos")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Poll for processing projects
  React.useEffect(() => {
    const processingIds = Object.entries(siData)
      .filter(([, si]) => si.status === "crawling" || si.status === "analyzing")
      .map(([id]) => Number(id))

    if (processingIds.length === 0) return

    const interval = setInterval(async () => {
      for (const projectId of processingIds) {
        const res = await fetch(
          `/api/articles/site-intelligence?projectId=${projectId}`
        )
        if (res.ok) {
          const json = await res.json()
          if (json.siteIntelligence) {
            setSiData((prev) => ({
              ...prev,
              [projectId]: json.siteIntelligence,
            }))
            // Clear crawling state if done
            if (
              json.siteIntelligence.status === "complete" ||
              json.siteIntelligence.status === "error"
            ) {
              setCrawlingProjects((prev) => {
                const next = new Set(prev)
                next.delete(projectId)
                return next
              })
            }
          }
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [siData])

  const handleSaveConfig = async (
    projectId: number,
    siteUrl: string,
    competitorUrls: string[],
  ) => {
    try {
      const res = await fetch("/api/articles/site-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, siteUrl, competitorUrls }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const saved = await res.json()
      setSiData((prev) => ({ ...prev, [projectId]: saved }))
      toast.success("Configuração salva")
    } catch {
      toast.error("Erro ao salvar configuração")
    }
  }

  const handleCrawl = async (projectId: number) => {
    setCrawlingProjects((prev) => new Set(prev).add(projectId))
    try {
      const res = await fetch("/api/articles/site-intelligence/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Crawl failed")
      }
      const result = await res.json()
      toast.success("Crawl iniciado!")

      // Update SI data with crawling status
      if (result.siteIntelligenceId) {
        setSiData((prev) => ({
          ...prev,
          [projectId]: {
            ...(prev[projectId] || {}),
            id: result.siteIntelligenceId,
            projectId,
            status: "crawling",
          } as SiteIntelligenceData,
        }))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar crawl")
      setCrawlingProjects((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Globe className="h-10 w-10 text-white/20 mx-auto" />
        <p className="text-sm text-white/50">
          Nenhum projeto encontrado. Crie um projeto primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Site Intelligence</h2>
        <p className="text-sm text-white/50">
          Configure seus projetos e execute o crawl para extrair brand voice e identificar gaps de keywords.
          Os dados são cacheados por 7 dias.
        </p>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <SiteIntelligenceCard
            key={project.id}
            project={project}
            si={siData[project.id] ?? null}
            onCrawl={handleCrawl}
            onSave={handleSaveConfig}
            isCrawling={crawlingProjects.has(project.id)}
          />
        ))}
      </div>
    </div>
  )
}
