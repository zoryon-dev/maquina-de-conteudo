/**
 * Article Wizard — Step 8: Metadata & Final Preview
 *
 * Shows final article with SEO score, word count, title selection.
 * Integrates interlinking review and metadata preview panels.
 * User marks as completed after reviewing all sections.
 */

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Copy,
  FileText,
  Award,
  Loader2,
  Link2,
  Tags,
  Sparkles,
  ImageIcon,
  RefreshCw,
  Code2,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { INPUT_CLASSES } from "../shared/input-classes"
import { scoreColor } from "../shared/score-utils"
import { InterlinkingReview } from "../shared/interlinking-review"
import { MetadataPreview } from "../shared/metadata-preview"
import { MdxExportDialog } from "../shared/mdx-export-dialog"
import type { Article } from "@/db/schema"

type TabId = "article" | "links" | "metadata" | "image"

interface ArticleImageRecord {
  id: number
  imageType: string
  imageUrl: string
  altText?: string | null
  promptUsed?: string | null
  modelUsed?: string | null
  createdAt: string
}

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
  const [featuredImage, setFeaturedImage] = useState<ArticleImageRecord | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [userImagePrompt, setUserImagePrompt] = useState("")
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0)
  const [selectedDescIndex, setSelectedDescIndex] = useState(0)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [copiedFrontmatter, setCopiedFrontmatter] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const linksPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const linksTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const metaPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const metaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (linksPollRef.current) clearInterval(linksPollRef.current)
      if (linksTimeoutRef.current) clearTimeout(linksTimeoutRef.current)
      if (metaPollRef.current) clearInterval(metaPollRef.current)
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current)
    }
  }, [])

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
      .catch((err) => console.warn("[Step8Metadata] Failed to load links:", err))
  }, [article?.id])

  // Load featured image
  useEffect(() => {
    if (!article?.id) return
    fetch(`/api/articles/${article.id}/images`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.images?.length > 0) {
          const featured = data.images.find((img: ArticleImageRecord) => img.imageType === "featured")
          if (featured) setFeaturedImage(featured)
        }
      })
      .catch((err) => console.warn("[Step8Metadata] Failed to load images:", err))
  }, [article?.id])

  // Load category slug
  useEffect(() => {
    if (!article?.categoryId) return
    fetch("/api/articles/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.categories) {
          const cat = data.categories.find(
            (c: { id: number; slug: string }) => c.id === article.categoryId,
          )
          if (cat) setCategorySlug(cat.slug)
        }
      })
      .catch((err) => console.warn("[Step8Metadata] Failed to load categories:", err))
  }, [article?.categoryId])

  // Load metadata
  useEffect(() => {
    if (!article?.id) return
    fetch(`/api/articles/${article.id}/metadata`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.metadata) setMetadata(data.metadata)
      })
      .catch((err) => console.warn("[Step8Metadata] Failed to load metadata:", err))
  }, [article?.id])

  const handleGenerateLinks = async () => {
    if (!article?.id) return
    setIsGeneratingLinks(true)
    setActionError(null)
    try {
      const submitRes = await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "interlinking" }),
      })
      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}))
        throw new Error(data.error || `Falha ao iniciar geração de links (${submitRes.status})`)
      }
      // Poll for completion (cleanup via refs)
      if (linksPollRef.current) clearInterval(linksPollRef.current)
      if (linksTimeoutRef.current) clearTimeout(linksTimeoutRef.current)

      linksPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/articles/${article.id}/links`)
          if (res.ok) {
            const data = await res.json()
            if (data?.links?.length > 0) {
              setLinks(data.links)
              setIsGeneratingLinks(false)
              if (linksPollRef.current) clearInterval(linksPollRef.current)
              if (linksTimeoutRef.current) clearTimeout(linksTimeoutRef.current)
            }
          }
        } catch (err) {
          console.warn("[Step8Metadata] Link polling error:", err)
        }
      }, 3000)
      linksTimeoutRef.current = setTimeout(() => {
        if (linksPollRef.current) clearInterval(linksPollRef.current)
        setIsGeneratingLinks(false)
      }, 120000)
    } catch (err) {
      console.error("[Step8Metadata] Generate links failed:", err)
      setActionError(err instanceof Error ? err.message : "Falha ao gerar links")
      setIsGeneratingLinks(false)
    }
  }

  const handleGenerateMetadata = async () => {
    if (!article?.id) return
    setIsGeneratingMeta(true)
    setActionError(null)
    try {
      const submitRes = await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "metadata" }),
      })
      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}))
        throw new Error(data.error || `Falha ao iniciar geração de metadata (${submitRes.status})`)
      }
      // Poll for completion (cleanup via refs)
      if (metaPollRef.current) clearInterval(metaPollRef.current)
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current)

      metaPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/articles/${article.id}/metadata`)
          if (res.ok) {
            const data = await res.json()
            if (data?.metadata) {
              setMetadata(data.metadata)
              setIsGeneratingMeta(false)
              if (metaPollRef.current) clearInterval(metaPollRef.current)
              if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current)
            }
          }
        } catch (err) {
          console.warn("[Step8Metadata] Metadata polling error:", err)
        }
      }, 3000)
      metaTimeoutRef.current = setTimeout(() => {
        if (metaPollRef.current) clearInterval(metaPollRef.current)
        setIsGeneratingMeta(false)
      }, 120000)
    } catch (err) {
      console.error("[Step8Metadata] Generate metadata failed:", err)
      setActionError(err instanceof Error ? err.message : "Falha ao gerar metadata")
      setIsGeneratingMeta(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!article?.id) return
    setIsGeneratingImage(true)
    setActionError(null)
    try {
      const body: Record<string, unknown> = { imageType: "featured" }
      if (userImagePrompt.trim()) {
        body.userPrompt = userImagePrompt.trim()
      } else {
        body.autoPrompt = true
      }

      const res = await fetch(`/api/articles/${article.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Falha ao gerar imagem (${res.status})`)
      }
      const data = await res.json()
      if (data?.image) setFeaturedImage(data.image)
    } catch (err) {
      console.error("[Step8Metadata] Image generation failed:", err)
      setActionError(err instanceof Error ? err.message : "Falha ao gerar imagem")
    } finally {
      setIsGeneratingImage(false)
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
    setActionError(null)
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: "completed", finalTitle }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Falha ao concluir artigo")
      }
      onComplete()
    } catch (err) {
      console.error("[Step8Metadata] Complete failed:", err)
      setActionError(err instanceof Error ? err.message : "Falha ao concluir artigo")
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
    { id: "image", label: "Imagem", icon: ImageIcon },
    { id: "links", label: "Links", icon: Link2, count: links.length },
    { id: "metadata", label: "Metadados", icon: Tags },
  ]

  return (
    <div className="space-y-6">
      {/* Action error */}
      {actionError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )}

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
                scoreColor(seoScore),
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
                scoreColor(geoScore),
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

      {activeTab === "image" && (
        <div className="space-y-4">
          {!featuredImage && !isGeneratingImage && (
            <div className="text-center py-8 space-y-4">
              <ImageIcon className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-sm text-white/40">
                Descreva a imagem que deseja ou gere automaticamente
              </p>
              <div className="max-w-md mx-auto space-y-3">
                <Input
                  value={userImagePrompt}
                  onChange={(e) => setUserImagePrompt(e.target.value)}
                  placeholder="Ex: Uma ilustração minimalista de um laptop com gráficos subindo..."
                  className={cn(INPUT_CLASSES, "text-sm !placeholder:text-white/30")}
                />
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleGenerateImage}
                    className="bg-primary text-black hover:bg-primary/90"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {userImagePrompt.trim() ? "Gerar com Meu Prompt" : "Gerar Automaticamente"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {isGeneratingImage && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-white/50">Gerando imagem destacada...</p>
            </div>
          )}
          {featuredImage && !isGeneratingImage && (
            <div className="space-y-4">
              <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredImage.imageUrl}
                  alt={featuredImage.altText || "Imagem destacada do artigo"}
                  className="w-full aspect-video object-cover"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-white/40 space-y-1">
                  {featuredImage.modelUsed && (
                    <p>Modelo: {featuredImage.modelUsed}</p>
                  )}
                  {featuredImage.altText && (
                    <p>Alt: {featuredImage.altText}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={userImagePrompt}
                    onChange={(e) => setUserImagePrompt(e.target.value)}
                    placeholder="Novo prompt (opcional)..."
                    className={cn(INPUT_CLASSES, "text-xs h-8 max-w-[240px] !placeholder:text-white/30")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateImage}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Regenerar
                  </Button>
                </div>
              </div>
            </div>
          )}
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
            <>
              <MetadataPreview
                metaTitles={metadata.metaTitles || []}
                metaDescriptions={metadata.metaDescriptions || []}
                slug={metadata.slug}
                schemaArticle={metadata.schemaArticle}
                schemaFaq={metadata.schemaFaq}
                schemaHowto={metadata.schemaHowto}
                selectedTitleIndex={selectedTitleIndex}
                selectedDescIndex={selectedDescIndex}
                onSelectTitle={setSelectedTitleIndex}
                onSelectDesc={setSelectedDescIndex}
              />

              {/* MDX Frontmatter */}
              <MdxFrontmatter
                article={article}
                metadata={metadata}
                featuredImage={featuredImage}
                categorySlug={categorySlug}
                selectedTitleIndex={selectedTitleIndex}
                selectedDescIndex={selectedDescIndex}
                copied={copiedFrontmatter}
                onCopy={() => setCopiedFrontmatter(true)}
                onCopied={() => setTimeout(() => setCopiedFrontmatter(false), 2000)}
              />
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Copy size={16} className="mr-2" />
            {copied ? "Copiado!" : "Copiar Artigo"}
          </Button>

          {article?.id && (
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Download size={16} className="mr-2" />
              Exportar MDX
            </Button>
          )}
        </div>

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

      {/* MDX Export Dialog */}
      {article?.id && (
        <MdxExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          articleId={article.id}
          articleTitle={finalTitle || undefined}
        />
      )}
    </div>
  )
}

// ─── MDX Frontmatter Block ──────────────────────────────

interface MdxFrontmatterProps {
  article: Article | null
  metadata: any
  featuredImage: ArticleImageRecord | null
  categorySlug: string | null
  selectedTitleIndex: number
  selectedDescIndex: number
  copied: boolean
  onCopy: () => void
  onCopied: () => void
}

function MdxFrontmatter({
  article,
  metadata,
  featuredImage,
  categorySlug,
  selectedTitleIndex,
  selectedDescIndex,
  copied,
  onCopy,
  onCopied,
}: MdxFrontmatterProps) {
  const metaTitles = metadata?.metaTitles || []
  const metaDescriptions = metadata?.metaDescriptions || []
  const slug = metadata?.slug || ""

  const title = metaTitles[selectedTitleIndex]?.text || article?.finalTitle || article?.title || ""
  const excerpt = metaDescriptions[selectedDescIndex]?.text || ""
  const publishedAt = new Date().toISOString().split("T")[0]

  const primaryKeyword = article?.primaryKeyword || ""
  const secondaryKeywords = (article?.secondaryKeywords as string[] | null) || []
  const tags = [primaryKeyword, ...secondaryKeywords].filter(Boolean)

  const lines = ["---"]
  lines.push(`title: "${title}"`)
  if (excerpt) lines.push(`excerpt: "${excerpt}"`)
  if (featuredImage?.imageUrl) lines.push(`coverImage: "${featuredImage.imageUrl}"`)
  lines.push(`publishedAt: "${publishedAt}"`)
  if (slug) lines.push(`slug: "${slug}"`)
  if (article?.authorName) lines.push(`author: "${article.authorName}"`)
  if (categorySlug) lines.push(`category: "${categorySlug}"`)
  if (tags.length > 0) {
    lines.push("tags:")
    for (const tag of tags) {
      lines.push(`  - "${tag}"`)
    }
  }
  lines.push("---")

  const frontmatter = lines.join("\n")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(frontmatter)
      onCopy()
      onCopied()
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="space-y-2">
      <h4 className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5">
        <Code2 className="h-3.5 w-3.5" />
        MDX Frontmatter
      </h4>
      <div className="relative rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10 transition-colors z-10"
          title="Copiar frontmatter"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-white/40" />
          )}
        </button>
        <pre className="p-4 text-xs text-white/60 overflow-x-auto font-mono leading-relaxed">
          {frontmatter}
        </pre>
      </div>
    </section>
  )
}
