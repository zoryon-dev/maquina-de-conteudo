/**
 * Article Wizard — Step 3: Outline Selection
 *
 * Displays 3 outline proposals. User selects one to proceed.
 */

"use client"

import { motion } from "framer-motion"
import { CheckCircle2, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"
import type { ArticleOutline } from "@/lib/article-services/types"
import { useState } from "react"

interface Step3OutlineProps {
  article: Article | null
  onSelect: (outlineId: string) => Promise<void>
  isSubmitting: boolean
}

export function Step3Outline({ article, onSelect, isSubmitting }: Step3OutlineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    article?.selectedOutlineId ?? null,
  )

  const outlines = (article?.generatedOutlines as ArticleOutline[] | null) ?? []

  if (!outlines.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-white/50">Gerando outlines...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Escolha um Outline</h2>
        <p className="text-sm text-white/50 mt-1">
          Selecione a estrutura que melhor se encaixa no seu artigo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {outlines.map((outline, index) => (
          <motion.button
            key={outline.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedId(outline.id)}
            className={cn(
              "text-left rounded-xl border p-5 transition-all",
              selectedId === outline.id
                ? "border-primary/50 bg-primary/5"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-primary">
                Opção {index + 1}
              </span>
              {selectedId === outline.id && (
                <CheckCircle2 size={18} className="text-primary" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-white font-medium text-sm mb-1">
              {outline.title}
            </h3>

            {/* Differentiator */}
            {outline.differentiator && (
              <p className="text-white/40 text-xs mb-3">{outline.differentiator}</p>
            )}

            {/* Sections */}
            <div className="space-y-1.5">
              {outline.sections?.map((section, si) => (
                <div
                  key={si}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-white/60 truncate mr-2">
                    {section.heading}
                  </span>
                  <span className="text-white/30 flex-shrink-0">
                    ~{section.estimatedWords}w
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">
                {outline.sections?.length || 0} seções
              </span>
              <span className="text-white/40">
                ~{outline.estimatedTotalWords || "?"}w total
              </span>
            </div>
          </motion.button>
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
    </div>
  )
}
