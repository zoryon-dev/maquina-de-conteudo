/**
 * Article Wizard — Step 5: Assembly Review & Edit
 *
 * Shows the assembled article with a toggle between edit (textarea) and preview mode.
 * User can edit the markdown content and save changes before running SEO check.
 */

"use client"

import { useMemo, useState, useCallback } from "react"
import { Search, Loader2, Eye, Pencil, Save, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"

type ViewMode = "edit" | "preview"

interface Step5AssemblyProps {
  article: Article | null
  onSubmitSeo: () => void
  isSubmitting: boolean
  onRefresh?: () => Promise<Article | null>
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) {
          return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{line.replace(/^# /, "")}</h1>
        }
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">{line.replace(/^## /, "")}</h2>
        }
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-2">{line.replace(/^### /, "")}</h3>
        }
        if (line.trim() === "") return <br key={i} />
        return <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">{line}</p>
      })}
    </div>
  )
}

export function Step5Assembly({ article, onSubmitSeo, isSubmitting, onRefresh }: Step5AssemblyProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview")
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const originalContent = article?.assembledContent || ""
  const content = editedContent ?? originalContent
  const hasChanges = editedContent !== null && editedContent !== originalContent

  const wordCount = useMemo(() => {
    if (!content) return 0
    return content.split(/\s+/).filter(Boolean).length
  }, [content])

  const handleSave = useCallback(async () => {
    if (!article?.id || !hasChanges) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assembledContent: editedContent }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Falha ao salvar")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onRefresh?.()
    } catch (err) {
      console.error("[Step5Assembly] Save failed:", err)
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }, [article?.id, editedContent, hasChanges, onRefresh])

  if (!originalContent) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-white/50">Artigo ainda não montado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Artigo Montado</h2>
          <p className="text-sm text-white/50 mt-1">
            Edite o artigo ou revise antes de executar o check de SEO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 font-mono">
            {wordCount.toLocaleString()} palavras
          </span>

          {/* View mode toggle */}
          <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("edit")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs transition-colors",
                viewMode === "edit"
                  ? "bg-primary/10 text-primary"
                  : "text-white/40 hover:text-white/60",
              )}
            >
              <Pencil size={12} />
              Editar
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs transition-colors",
                viewMode === "preview"
                  ? "bg-primary/10 text-primary"
                  : "text-white/40 hover:text-white/60",
              )}
            >
              <Eye size={12} />
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] max-h-[60vh] overflow-y-auto">
        {viewMode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-[60vh] p-6 bg-transparent text-white/80 text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder:text-white/20"
            placeholder="Conteúdo do artigo em Markdown..."
          />
        ) : (
          <div className="p-6">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="outline"
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              {isSaving ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={14} className="mr-1 text-green-400" />
              ) : (
                <Save size={14} className="mr-1" />
              )}
              {saved ? "Salvo!" : "Salvar alterações"}
            </Button>
          )}
          {hasChanges && !saved && (
            <span className="text-xs text-yellow-400/60">Alterações não salvas</span>
          )}
        </div>

        <Button
          onClick={onSubmitSeo}
          disabled={isSubmitting}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Analisando SEO...
            </>
          ) : (
            <>
              <Search size={16} className="mr-2" />
              Analisar SEO
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
