/**
 * Article Wizard — Metadata Preview
 *
 * Displays generated SEO metadata: titles, descriptions, slug, schema markup.
 */

"use client"

import { useState } from "react"
import {
  FileText,
  Link2,
  Code,
  Copy,
  CheckCircle2,
  Star,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetaTitleItem {
  text: string
  chars?: number
  ctrScore?: number
  style?: string
}

interface MetaDescriptionItem {
  text: string
  chars?: number
  style?: string
}

interface MetadataPreviewProps {
  metaTitles: MetaTitleItem[]
  metaDescriptions: MetaDescriptionItem[]
  slug: string | null
  schemaArticle: Record<string, unknown> | null
  schemaFaq: Record<string, unknown> | null
  schemaHowto: Record<string, unknown> | null
  selectedTitleIndex?: number
  selectedDescIndex?: number
  onSelectTitle?: (index: number) => void
  onSelectDesc?: (index: number) => void
}

export function MetadataPreview({
  metaTitles,
  metaDescriptions,
  slug,
  schemaArticle,
  schemaFaq,
  schemaHowto,
  selectedTitleIndex = 0,
  selectedDescIndex = 0,
  onSelectTitle,
  onSelectDesc,
}: MetadataPreviewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch { /* ignore */ }
  }

  const hasSchemas = schemaArticle || schemaFaq || schemaHowto

  return (
    <div className="space-y-5">
      {/* Meta Titles */}
      {metaTitles.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Meta Titles
          </h4>
          <div className="space-y-2">
            {metaTitles.map((title, i) => (
              <button
                key={i}
                onClick={() => onSelectTitle?.(i)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all",
                  selectedTitleIndex === i
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-white">{title.text}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-white/30">
                        {title.chars || title.text.length} chars
                      </span>
                      {title.style && (
                        <span className="text-[10px] text-white/30 capitalize">
                          {title.style}
                        </span>
                      )}
                      {title.ctrScore != null && (
                        <span className={cn(
                          "text-[10px] font-mono",
                          title.ctrScore >= 70 ? "text-green-400" : "text-yellow-400"
                        )}>
                          CTR: {title.ctrScore}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedTitleIndex === i && (
                    <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Meta Descriptions */}
      {metaDescriptions.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Meta Descriptions
          </h4>
          <div className="space-y-2">
            {metaDescriptions.map((desc, i) => (
              <button
                key={i}
                onClick={() => onSelectDesc?.(i)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all",
                  selectedDescIndex === i
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{desc.text}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-white/30">
                        {desc.chars || desc.text.length} chars
                      </span>
                      {desc.style && (
                        <span className="text-[10px] text-white/30 capitalize">
                          {desc.style}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedDescIndex === i && (
                    <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Slug */}
      {slug && (
        <section className="space-y-2">
          <h4 className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Slug
          </h4>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <code className="text-sm text-primary flex-1 font-mono">/{slug}</code>
            <button
              onClick={() => copyToClipboard(slug, "slug")}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              {copiedField === "slug" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-white/40" />
              )}
            </button>
          </div>
        </section>
      )}

      {/* Schema Markup */}
      {hasSchemas && (
        <section className="space-y-2">
          <h4 className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Schema Markup
          </h4>
          <div className="space-y-2">
            {schemaArticle && (
              <SchemaBlock label="Article" data={schemaArticle} onCopy={copyToClipboard} copiedField={copiedField} />
            )}
            {schemaFaq && (
              <SchemaBlock label="FAQ" data={schemaFaq} onCopy={copyToClipboard} copiedField={copiedField} />
            )}
            {schemaHowto && (
              <SchemaBlock label="HowTo" data={schemaHowto} onCopy={copyToClipboard} copiedField={copiedField} />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function SchemaBlock({
  label,
  data,
  onCopy,
  copiedField,
}: {
  label: string
  data: Record<string, unknown>
  onCopy: (text: string, field: string) => void
  copiedField: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const json = JSON.stringify(data, null, 2)
  const field = `schema-${label}`

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-medium text-white/70">{label} Schema</span>
        <span className="text-[10px] text-white/30">
          {expanded ? "Recolher" : "Expandir"}
        </span>
      </button>
      {expanded && (
        <div className="relative border-t border-white/5">
          <button
            onClick={() => onCopy(json, field)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 z-10"
          >
            {copiedField === field ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/40" />
            )}
          </button>
          <pre className="p-3 text-xs text-white/50 overflow-x-auto max-h-48 font-mono">
            {json}
          </pre>
        </div>
      )}
    </div>
  )
}
