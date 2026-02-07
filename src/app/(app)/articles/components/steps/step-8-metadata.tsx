/**
 * Article Wizard — Step 8: Metadata & Final Preview
 *
 * Shows final article with SEO score, word count, title selection.
 * User marks as completed.
 */

"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Copy,
  FileText,
  Award,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Article } from "@/db/schema"

interface Step8MetadataProps {
  article: Article | null
  onComplete: () => void
}

export function Step8Metadata({ article, onComplete }: Step8MetadataProps) {
  const [copied, setCopied] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const content = article?.finalContent || article?.optimizedContent || ""
  const seoScore = article?.seoScore
  const geoScore = article?.geoScore
  const finalTitle = article?.finalTitle || article?.title

  const wordCount = useMemo(() => {
    if (!content) return 0
    return content.split(/\s+/).filter(Boolean).length
  }, [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleComplete = async () => {
    if (!article) return
    setIsCompleting(true)

    try {
      await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: "completed",
          finalTitle,
        }),
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

  return (
    <div className="space-y-6">
      {/* Header with scores */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Artigo Final</h2>
          <p className="text-sm text-white/50 mt-1">
            Revise e finalize seu artigo
          </p>
        </div>

        <div className="flex items-center gap-4">
          {seoScore != null && (
            <div className="text-center">
              <div
                className={cn(
                  "text-2xl font-bold",
                  seoScore >= 80 ? "text-green-400" : seoScore >= 60 ? "text-yellow-400" : "text-red-400",
                )}
              >
                {seoScore}
              </div>
              <p className="text-[10px] text-white/30">SEO</p>
            </div>
          )}
          {geoScore != null && (
            <div className="text-center">
              <div
                className={cn(
                  "text-2xl font-bold",
                  geoScore >= 80 ? "text-green-400" : geoScore >= 60 ? "text-yellow-400" : "text-red-400",
                )}
              >
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

      {/* Article Content */}
      <div className="relative rounded-xl border border-white/10 bg-white/[0.02]">
        {/* Copy button */}
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
            if (line.startsWith("# ")) {
              return (
                <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">
                  {line.replace(/^# /, "")}
                </h1>
              )
            }
            if (line.startsWith("## ")) {
              return (
                <h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">
                  {line.replace(/^## /, "")}
                </h2>
              )
            }
            if (line.startsWith("### ")) {
              return (
                <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-2">
                  {line.replace(/^### /, "")}
                </h3>
              )
            }
            if (line.trim() === "") return <br key={i} />
            return (
              <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">
                {line}
              </p>
            )
          })}
        </div>
      </div>

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
