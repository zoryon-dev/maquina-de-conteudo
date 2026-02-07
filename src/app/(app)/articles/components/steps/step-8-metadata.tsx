/**
 * Article Wizard — Step 8: Metadata & Final Preview
 *
 * Shows final article with SEO score, word count, title selection.
 * Integrates interlinking review and metadata preview panels.
 * User marks as completed after reviewing all sections.
 */

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Copy,
  FileText,
  Award,
  Loader2,
  Link2,
  Tags,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InterlinkingReview } from "../shared/interlinking-review"
import { MetadataPreview } from "../shared/metadata-preview"
import type { Article } from "@/db/schema"

type TabId = "article" | "links" | "metadata"

interface Step8MetadataProps {
  article: Article | null
  onComplete: () => void
}

export function Step8Metadata({ article, onComplete }: Step8MetadataProps) {
  const [copied, setCopied] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("article")
  const [links, setLinks] = useState<any[]>([])
  const [metadata, setMetadata] = useState<any>(null)
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false)
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false)

  const content = article?.finalContent || article?.optimizedContent || ""
  const seoScore = article?.seoScore
  const geoScore = article?.geoScore
  const finalTitle = article?.finalTitle || article?.title

  const wordCount = useMemo(() => {
    if (!content) return 0
    return content.split(/\s+/).filter(Boolean).length
  }, [content])

  // Load interlinking data
  useEffect(() => {
    if (!article?.id) return
    fetch(`/api/articles/${article.id}/links`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.links) setLinks(data.links)
      })
      .catch(() => {})
  }, [article?.id])

  // Load metadata
  useEffect(() => {
    if (!article?.id) return
    fetch(`/api/articles/${article.id}/metadata`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.metadata) setMetadata(data.metadata)
      })
      .catch(() => {})
  }, [article?.id])

  const handleGenerateLinks = async () => {
    if (!article?.id) return
    setIsGeneratingLinks(true)
    try {
      await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "interlinking" }),
      })
      // Poll for completion
      const poll = setInterval(async () => {
        const res = await fetch(`/api/articles/${article.id}/links`)
        if (res.ok) {
          const data = await res.json()
          if (data?.links?.length > 0) {
            setLinks(data.links)
            setIsGeneratingLinks(false)
            clearInterval(poll)
          }
        }
      }, 3000)
      setTimeout(() => { clearInterval(poll); setIsGeneratingLinks(false) }, 120000)
    } catch {
      setIsGeneratingLinks(false)
    }
  }

  const handleGenerateMetadata = async () => {
    if (!article?.id) return
    setIsGeneratingMeta(true)
    try {
      await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "metadata" }),
      })
      // Poll for completion
      const poll = setInterval(async () => {
        const res = await fetch(`/api/articles/${article.id}/metadata`)
        if (res.ok) {
          const data = await res.json()
          if (data?.metadata) {
            setMetadata(data.metadata)
            setIsGeneratingMeta(false)
            clearInterval(poll)
          }
        }
      }, 3000)
      setTimeout(() => { clearInterval(poll); setIsGeneratingMeta(false) }, 120000)
    } catch {
      setIsGeneratingMeta(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleComplete = async () => {
    if (!article) return
    setIsCompleting(true)
    try {
      await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: "completed", finalTitle }),
      })
      onComplete()
    } catch {
      setIsCompleting(false)
    }
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-white/50">Carregando artigo final...</p>
      </div>
    )
  }

  const TABS: { id: TabId; label: string; icon: typeof FileText; count?: number }[] = [
    { id: "article", label: "Artigo", icon: FileText },
    { id: "links", label: "Links", icon: Link2, count: links.length },
    { id: "metadata", label: "Metadados", icon: Tags },
  ]

  return (
    <div className="space-y-6">
      {/* Header with scores */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Artigo Final</h2>
          <p className="text-sm text-white/50 mt-1">
            Revise artigo, links internos e metadados SEO
          </p>
        </div>

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
          <div className="text-center">
            <div className="text-2xl font-bold text-white/80">{wordCount.toLocaleString()}</div>
            <p className="text-[10px] text-white/30">palavras</p>
          </div>
        </div>
      </div>

      {/* Title */}
      {finalTitle && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-xs text-primary/60 mb-1">Título Final</p>
          <p className="text-white font-medium">{finalTitle}</p>
        </div>
      )}

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
              {tab.count != null && tab.count > 0 && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "article" && (
        <div className="relative rounded-xl border border-white/10 bg-white/[0.02]">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors z-10"
            title="Copiar artigo"
          >
            {copied ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <Copy size={16} className="text-white/40" />
            )}
          </button>

          <div className="p-6 max-h-[50vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
            {content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{line.replace(/^# /, "")}</h1>
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">{line.replace(/^## /, "")}</h2>
              if (line.startsWith("### ")) return <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-2">{line.replace(/^### /, "")}</h3>
              if (line.trim() === "") return <br key={i} />
              return <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">{line}</p>
            })}
          </div>
        </div>
      )}

      {activeTab === "links" && (
        <div className="space-y-4">
          {links.length === 0 && !isGeneratingLinks && (
            <div className="text-center py-8 space-y-3">
              <Link2 className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-sm text-white/40">
                Gere links internos baseados no conteúdo do seu site
              </p>
              <Button
                size="sm"
                onClick={handleGenerateLinks}
                className="bg-primary text-black hover:bg-primary/90"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Gerar Links Internos
              </Button>
            </div>
          )}
          {isGeneratingLinks && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-white/50">Analisando links internos...</p>
            </div>
          )}
          {links.length > 0 && <InterlinkingReview links={links} />}
        </div>
      )}

      {activeTab === "metadata" && (
        <div className="space-y-4">
          {!metadata && !isGeneratingMeta && (
            <div className="text-center py-8 space-y-3">
              <Tags className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-sm text-white/40">
                Gere metadados SEO completos (titles, descriptions, schema markup)
              </p>
              <Button
                size="sm"
                onClick={handleGenerateMetadata}
                className="bg-primary text-black hover:bg-primary/90"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Gerar Metadados
              </Button>
            </div>
          )}
          {isGeneratingMeta && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-white/50">Gerando metadados SEO...</p>
            </div>
          )}
          {metadata && (
            <MetadataPreview
              metaTitles={metadata.metaTitles || []}
              metaDescriptions={metadata.metaDescriptions || []}
              slug={metadata.slug}
              schemaArticle={metadata.schemaArticle}
              schemaFaq={metadata.schemaFaq}
              schemaHowto={metadata.schemaHowto}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
        >
          <Copy size={16} className="mr-2" />
          {copied ? "Copiado!" : "Copiar Artigo"}
        </Button>

        <Button
          onClick={handleComplete}
          disabled={isCompleting}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          {isCompleting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Finalizando...
            </>
          ) : (
            <>
              <Award size={16} className="mr-2" />
              Concluir Artigo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
