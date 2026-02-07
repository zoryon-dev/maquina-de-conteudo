/**
 * Article Wizard — Step 5: Assembly Review
 *
 * Shows the assembled article in markdown preview.
 * User reviews and triggers SEO check.
 */

"use client"

import { useMemo } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Article } from "@/db/schema"

interface Step5AssemblyProps {
  article: Article | null
  onSubmitSeo: () => void
  isSubmitting: boolean
}

export function Step5Assembly({ article, onSubmitSeo, isSubmitting }: Step5AssemblyProps) {
  const content = article?.assembledContent || ""

  const wordCount = useMemo(() => {
    if (!content) return 0
    return content.split(/\s+/).filter(Boolean).length
  }, [content])

  if (!content) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-white/50">Artigo ainda não montado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Artigo Montado</h2>
          <p className="text-sm text-white/50 mt-1">
            Revise o artigo antes de executar o check de SEO
          </p>
        </div>
        <span className="text-xs text-white/40 font-mono">
          {wordCount.toLocaleString()} palavras
        </span>
      </div>

      {/* Article Preview */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 max-h-[60vh] overflow-y-auto">
        <div className="prose prose-invert prose-sm max-w-none">
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

      {/* Submit SEO */}
      <div className="flex justify-end pt-2">
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
