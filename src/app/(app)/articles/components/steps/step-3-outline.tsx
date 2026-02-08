/**
 * Article Wizard — Step 3: Outline Selection & Editing
 *
 * Displays 3 outline proposals. User can edit outlines (add/remove/reorder sections)
 * before selecting one to proceed.
 */

"use client"

import { INPUT_CLASSES } from "../shared/input-classes"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  GripVertical,
  X,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"
import type { ArticleOutline, OutlineSection } from "@/lib/article-services/types"
import { useState, useEffect, useRef, useCallback } from "react"

interface ProcessingProgress {
  stage?: string
  percent?: number
  message?: string
}

interface Step3OutlineProps {
  article: Article | null
  onSelect: (outlineId: string) => Promise<void>
  onRefresh: () => Promise<Article | null>
  isSubmitting: boolean
}

// ─── Outline Editor ─────────────────────────────────────

function OutlineEditor({
  outline,
  onSave,
  onClose,
}: {
  outline: ArticleOutline
  onSave: (updated: ArticleOutline) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(outline.title)
  const [sections, setSections] = useState<OutlineSection[]>(() =>
    (outline.sections || []).map((s) => ({ ...s })),
  )

  const updateSection = (index: number, field: keyof OutlineSection, value: unknown) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { heading: "", subheadings: [], estimatedWords: 300, keyPoints: [] },
    ])
  }

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const moveSection = (from: number, to: number) => {
    setSections((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const handleSave = () => {
    const totalWords = sections.reduce((acc, s) => acc + (s.estimatedWords || 0), 0)
    onSave({
      ...outline,
      title,
      sections: sections.filter((s) => s.heading.trim()),
      estimatedTotalWords: totalWords,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-white font-semibold">Editar Outline</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Título do Outline</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASSES}
            />
          </div>

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/50">Seções ({sections.length})</label>
              <button
                onClick={addSection}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus size={12} />
                Adicionar seção
              </button>
            </div>

            {sections.map((section, index) => (
              <motion.div
                key={index}
                layout
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => index > 0 && moveSection(index, index - 1)}
                      disabled={index === 0}
                      className="text-white/20 hover:text-white/50 disabled:opacity-30"
                    >
                      <GripVertical size={12} />
                    </button>
                  </div>

                  {/* Heading */}
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSection(index, "heading", e.target.value)}
                    placeholder="Título da seção"
                    className={cn(INPUT_CLASSES, "flex-1 text-sm !placeholder:text-white/30")}
                  />

                  {/* Words */}
                  <Input
                    type="number"
                    value={section.estimatedWords}
                    onChange={(e) => updateSection(index, "estimatedWords", parseInt(e.target.value) || 0)}
                    className={cn(INPUT_CLASSES, "w-20 text-sm text-center")}
                  />
                  <span className="text-[10px] text-white/30 -ml-1">w</span>

                  {/* Delete */}
                  <button
                    onClick={() => removeSection(index)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Subheadings (comma-separated) */}
                <Input
                  value={section.subheadings?.join(", ") || ""}
                  onChange={(e) =>
                    updateSection(
                      index,
                      "subheadings",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder="Sub-tópicos (separados por vírgula)"
                  className="!border-white/5 !bg-transparent !text-white/60 text-xs !placeholder:text-white/20 focus-visible:!border-primary/50"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-white/10 text-white/70 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary text-black hover:bg-primary/90"
          >
            <Save size={14} className="mr-1" />
            Salvar
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────

export function Step3Outline({ article, onSelect, onRefresh, isSubmitting }: Step3OutlineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    article?.selectedOutlineId ?? null,
  )
  const [editingOutline, setEditingOutline] = useState<ArticleOutline | null>(null)
  const [localOutlines, setLocalOutlines] = useState<ArticleOutline[]>([])

  const outlines = localOutlines.length > 0
    ? localOutlines
    : ((article?.generatedOutlines as ArticleOutline[] | null) ?? [])

  const progress = article?.processingProgress as ProcessingProgress | null

  // Sync local outlines when article updates
  useEffect(() => {
    const serverOutlines = (article?.generatedOutlines as ArticleOutline[] | null) ?? []
    if (serverOutlines.length > 0 && localOutlines.length === 0) {
      setLocalOutlines(serverOutlines)
    }
  }, [article?.generatedOutlines, localOutlines.length])

  // Polling while outlines are being generated
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const poll = useCallback(async () => {
    const data = await onRefresh()
    if (!data || !isMountedRef.current) return

    const updatedOutlines = (data.generatedOutlines as ArticleOutline[] | null) ?? []
    if (updatedOutlines.length > 0) {
      setLocalOutlines(updatedOutlines)
      return
    }

    pollingRef.current = setTimeout(poll, 2500)
  }, [onRefresh])

  useEffect(() => {
    isMountedRef.current = true
    if (outlines.length === 0) {
      pollingRef.current = setTimeout(poll, 2500)
    }

    return () => {
      isMountedRef.current = false
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [poll, outlines.length])

  // Save edited outline back to the article
  const handleSaveOutline = async (updated: ArticleOutline) => {
    const newOutlines = localOutlines.map((o) => (o.id === updated.id ? updated : o))
    setLocalOutlines(newOutlines)
    setEditingOutline(null)

    // Persist to backend
    if (article?.id) {
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generatedOutlines: newOutlines }),
        })
        if (!res.ok) {
          console.error("[Step3Outline] Failed to persist outline edit:", res.status)
        }
      } catch (err) {
        console.error("[Step3Outline] Network error persisting outline:", err)
      }
    }
  }

  if (!outlines.length) {
    const currentMessage = progress?.message ?? "Gerando outlines..."
    const currentPercent = progress?.percent ?? 0

    return (
      <div className="max-w-lg mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <Loader2 size={32} className="animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-white">Gerando Outlines</h2>
          <p className="text-white/50 text-sm">{currentMessage}</p>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${currentPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Escolha um Outline</h2>
        <p className="text-sm text-white/50 mt-1">
          Selecione a estrutura que melhor se encaixa — clique em <Pencil size={12} className="inline" /> para editar
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {outlines.map((outline, index) => (
          <motion.div
            key={outline.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "text-left rounded-xl border p-5 transition-all relative group",
              selectedId === outline.id
                ? "border-primary/50 bg-primary/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            )}
          >
            {/* Edit button */}
            <button
              onClick={() => setEditingOutline(outline)}
              className="absolute top-3 right-3 p-1.5 rounded-md text-white/20 hover:text-primary hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
              title="Editar outline"
            >
              <Pencil size={14} />
            </button>

            {/* Selectable area */}
            <button
              onClick={() => setSelectedId(outline.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between mb-3 pr-8">
                <span className="text-xs font-medium text-primary">
                  Opção {index + 1}
                </span>
                {selectedId === outline.id && (
                  <CheckCircle2 size={18} className="text-primary" />
                )}
              </div>

              <h3 className="text-white font-medium text-sm mb-1">{outline.title}</h3>

              {outline.differentiator && (
                <p className="text-white/40 text-xs mb-3">{outline.differentiator}</p>
              )}

              <div className="space-y-1.5">
                {outline.sections?.map((section, si) => (
                  <div key={si} className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate mr-2">{section.heading}</span>
                    <span className="text-white/30 flex-shrink-0">~{section.estimatedWords}w</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/40">{outline.sections?.length || 0} seções</span>
                <span className="text-white/40">~{outline.estimatedTotalWords || "?"}w total</span>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={() => selectedId && onSelect(selectedId)}
          disabled={!selectedId || isSubmitting}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Produzindo seções...
            </>
          ) : (
            <>
              <FileText size={16} className="mr-2" />
              Produzir Artigo
            </>
          )}
        </Button>
      </div>

      {/* Editor Modal */}
      {editingOutline && (
        <OutlineEditor
          outline={editingOutline}
          onSave={handleSaveOutline}
          onClose={() => setEditingOutline(null)}
        />
      )}
    </div>
  )
}
