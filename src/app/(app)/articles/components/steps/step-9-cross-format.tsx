/**
 * Article Wizard — Step 9: Cross-Format Derivations
 *
 * Generates LinkedIn posts, video scripts, and Instagram carousels from the
 * final article. User picks formats → parallel generation → tabbed preview.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Hash,
  Linkedin,
  Loader2,
  Pencil,
  Play,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"
import type {
  LinkedInDerivation,
  VideoScriptDerivation,
  CarouselDerivation,
} from "@/lib/article-services"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormatKey = "linkedin" | "video_script" | "carousel"
type TabId = FormatKey

interface Derivation {
  id: number
  format: FormatKey
  content: LinkedInDerivation | VideoScriptDerivation | CarouselDerivation
  status: string
}

interface Step9CrossFormatProps {
  article: Article | null
  onComplete: () => void
}

const FORMAT_OPTIONS: { key: FormatKey; label: string; icon: typeof Linkedin; desc: string }[] = [
  { key: "linkedin", label: "LinkedIn Post", icon: Linkedin, desc: "Post otimizado para engajamento" },
  { key: "video_script", label: "Roteiro de Vídeo", icon: Play, desc: "Script 60-90s para Reels/TikTok" },
  { key: "carousel", label: "Carrossel Instagram", icon: SlidersHorizontal, desc: "8-12 slides educativos" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step9CrossFormat({ article, onComplete }: Step9CrossFormatProps) {
  const [selectedFormats, setSelectedFormats] = useState<Set<FormatKey>>(new Set(["linkedin", "video_script", "carousel"]))
  const [isGenerating, setIsGenerating] = useState(false)
  const [derivations, setDerivations] = useState<Derivation[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Load existing derivations
  useEffect(() => {
    if (!article?.id) return
    fetch(`/api/articles/${article.id}/derivations`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.derivations?.length) {
          setDerivations(data.derivations)
          setActiveTab(data.derivations[0].format)
        }
      })
      .catch(() => {})
  }, [article?.id])

  const toggleFormat = (key: FormatKey) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!article?.id || selectedFormats.size === 0) return
    setIsGenerating(true)
    setErrors([])
    try {
      const res = await fetch(`/api/articles/${article.id}/derivations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: Array.from(selectedFormats) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Falha ao gerar derivações")
      if (data.derivations?.length) {
        setDerivations(data.derivations)
        setActiveTab(data.derivations[0].format)
      }
      if (data.errors?.length) setErrors(data.errors)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const activeDerivation = derivations.find((d) => d.format === activeTab)

  // -------------------------------------------------------------------------
  // No article yet
  // -------------------------------------------------------------------------

  if (!article) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-white/50">Carregando artigo...</p>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Format selection (before generation)
  // -------------------------------------------------------------------------

  if (derivations.length === 0 && !isGenerating) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Derivação Cross-Format</h2>
          <p className="text-sm text-white/50 mt-1">
            Gere conteúdo derivado do artigo para diferentes plataformas
          </p>
        </div>

        <div className="grid gap-3">
          {FORMAT_OPTIONS.map(({ key, label, icon: Icon, desc }) => {
            const selected = selectedFormats.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleFormat(key)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  selected
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20",
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
                  selected ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40",
                )}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium", selected ? "text-white" : "text-white/70")}>{label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  selected ? "border-primary bg-primary" : "border-white/20",
                )}>
                  {selected && <CheckCircle2 size={12} className="text-black" />}
                </div>
              </button>
            )
          })}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={selectedFormats.size === 0}
          className="w-full bg-primary text-black hover:bg-primary/90 font-medium"
        >
          <Sparkles size={16} className="mr-2" />
          Gerar {selectedFormats.size} formato{selectedFormats.size !== 1 ? "s" : ""}
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Generating state
  // -------------------------------------------------------------------------

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-white/50">Gerando derivações em paralelo...</p>
        <p className="text-xs text-white/30">Isso pode levar 30-60 segundos</p>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Results view
  // -------------------------------------------------------------------------

  const tabs = derivations.map((d) => {
    const opt = FORMAT_OPTIONS.find((f) => f.key === d.format)
    return { id: d.format, label: opt?.label || d.format, icon: opt?.icon || Sparkles }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Derivação Cross-Format</h2>
          <p className="text-sm text-white/50 mt-1">
            {derivations.length} formato{derivations.length !== 1 ? "s" : ""} gerado{derivations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setDerivations([]); setActiveTab(null) }}
          className="border-white/10 text-white/60 hover:text-white"
        >
          <Sparkles size={14} className="mr-1.5" />
          Regerar
        </Button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-400">{e}</p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-px">
        {tabs.map((tab) => {
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
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeDerivation && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02]">
          {activeDerivation.format === "linkedin" && (
            <LinkedInPreview
              content={activeDerivation.content as LinkedInDerivation}
              onCopy={handleCopy}
              copiedId={copiedId}
            />
          )}
          {activeDerivation.format === "video_script" && (
            <VideoScriptPreview
              content={activeDerivation.content as VideoScriptDerivation}
              onCopy={handleCopy}
              copiedId={copiedId}
            />
          )}
          {activeDerivation.format === "carousel" && (
            <CarouselPreview
              content={activeDerivation.content as CarouselDerivation}
              onCopy={handleCopy}
              copiedId={copiedId}
            />
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onComplete}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          <CheckCircle2 size={16} className="mr-2" />
          Concluir
        </Button>
      </div>
    </div>
  )
}

// ===========================================================================
// SUB-COMPONENTS — LinkedIn Preview
// ===========================================================================

function LinkedInPreview({
  content,
  onCopy,
  copiedId,
}: {
  content: LinkedInDerivation
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#0077B5]">
          <Linkedin size={18} />
          <span className="text-sm font-medium">LinkedIn Post</span>
        </div>
        <CopyButton
          onClick={() => onCopy(content.fullPost, "linkedin-post")}
          copied={copiedId === "linkedin-post"}
        />
      </div>

      <div className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed bg-white/[0.02] rounded-lg p-4 max-h-[40vh] overflow-y-auto">
        {content.fullPost}
      </div>

      {content.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {content.hashtags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 text-xs text-primary/70 bg-primary/5 rounded-full px-2 py-0.5">
              <Hash size={10} />
              {tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      {content.cta && (
        <div className="text-xs text-white/40 border-t border-white/5 pt-3">
          <span className="text-white/50 font-medium">1o comentário:</span> {content.cta}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// SUB-COMPONENTS — Video Script Preview
// ===========================================================================

function VideoScriptPreview({
  content,
  onCopy,
  copiedId,
}: {
  content: VideoScriptDerivation
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const fullText = content.sections
    .map((s) => `[${s.duration}] ${s.content}`)
    .join("\n\n")

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-400">
          <Play size={18} />
          <span className="text-sm font-medium">Roteiro de Vídeo</span>
          <span className="text-xs text-white/30 ml-1">~{content.estimatedDuration}</span>
        </div>
        <CopyButton
          onClick={() => onCopy(fullText, "video-script")}
          copied={copiedId === "video-script"}
        />
      </div>

      {content.title && (
        <p className="text-white font-medium text-sm">{content.title}</p>
      )}

      <div className="space-y-2">
        {content.sections.map((section, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/5 bg-white/[0.01] overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="text-[10px] font-mono text-white/30 shrink-0 w-16">
                {section.duration}
              </span>
              <span className="text-xs font-medium text-primary/70 uppercase shrink-0 w-20">
                {section.topic}
              </span>
              <span className="text-sm text-white/70 flex-1 truncate">
                {section.content}
              </span>
              {expanded === i ? (
                <ChevronDown size={14} className="text-white/30 shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-white/30 shrink-0" />
              )}
            </button>
            {expanded === i && (
              <div className="px-4 pb-3 space-y-2 border-t border-white/5 pt-2">
                <p className="text-sm text-white/80 whitespace-pre-wrap">{section.content}</p>
                {section.visualNotes && (
                  <p className="text-xs text-white/30 italic">Visual: {section.visualNotes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// SUB-COMPONENTS — Carousel Preview
// ===========================================================================

function CarouselPreview({
  content,
  onCopy,
  copiedId,
}: {
  content: CarouselDerivation
  onCopy: (text: string, id: string) => void
  copiedId: string | null
}) {
  const captionText = [content.caption, content.hashtags.join(" ")].filter(Boolean).join("\n\n")

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-pink-400">
          <SlidersHorizontal size={18} />
          <span className="text-sm font-medium">Carrossel Instagram</span>
          <span className="text-xs text-white/30 ml-1">{content.slides.length} slides</span>
        </div>
        <CopyButton
          onClick={() => onCopy(captionText, "carousel-caption")}
          copied={copiedId === "carousel-caption"}
          label="Copiar caption"
        />
      </div>

      {/* Slides grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {content.slides.map((slide) => (
          <div
            key={slide.number}
            className="aspect-square rounded-lg border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono text-white/20">{slide.number}</span>
              <p className="text-xs font-semibold text-white mt-1 line-clamp-2">{slide.title}</p>
            </div>
            {slide.content && (
              <p className="text-[10px] text-white/50 line-clamp-3 mt-1">{slide.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Caption */}
      {content.caption && (
        <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
          <p className="text-xs text-white/30 mb-1.5 font-medium">Caption</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{content.caption}</p>
          {content.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {content.hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-pink-400/70 bg-pink-400/5 rounded-full px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// HELPERS
// ===========================================================================

function CopyButton({
  onClick,
  copied,
  label,
}: {
  onClick: () => void
  copied: boolean
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
      title={label || "Copiar"}
    >
      {copied ? (
        <>
          <CheckCircle2 size={14} className="text-green-400" />
          <span className="text-green-400">Copiado</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>{label || "Copiar"}</span>
        </>
      )}
    </button>
  )
}
