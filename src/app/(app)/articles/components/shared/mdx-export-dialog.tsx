/**
 * MDX Export Dialog
 *
 * Dialog for configuring and downloading .mdx files for the Zoryon Blog.
 * Fetches suggested category from the API and lets the user override options.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, Loader2, FileCode2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { INPUT_CLASSES } from "./input-classes"
import { cn } from "@/lib/utils"

type BlogCategory =
  | "ia-negocios"
  | "carreira-formacao"
  | "mercado-tendencias"
  | "agentes-automacao"

const BLOG_CATEGORIES: { value: BlogCategory; label: string }[] = [
  { value: "ia-negocios", label: "IA & Negócios" },
  { value: "carreira-formacao", label: "Carreira & Formação" },
  { value: "mercado-tendencias", label: "Mercado & Tendências" },
  { value: "agentes-automacao", label: "Agentes & Automação" },
]

interface MdxExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleId: number
  articleTitle?: string
}

export function MdxExportDialog({
  open,
  onOpenChange,
  articleId,
  articleTitle,
}: MdxExportDialogProps) {
  const [blogCategory, setBlogCategory] = useState<BlogCategory>("ia-negocios")
  const [suggestedCategory, setSuggestedCategory] = useState<BlogCategory | null>(null)
  const [blogAuthor, setBlogAuthor] = useState("jonas-kessler")
  const [featured, setFeatured] = useState(false)
  const [draft, setDraft] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Fetch suggested category when dialog opens
  useEffect(() => {
    if (!open || !articleId) return

    const fetchSuggestion = async () => {
      try {
        const res = await fetch(
          `/api/articles/${articleId}/export-mdx?blogAuthor=${encodeURIComponent(blogAuthor)}&draft=true`,
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Falha ao carregar preview")
        }
        const text = await res.text()

        // Extract suggested category from frontmatter
        const categoryMatch = text.match(/^category:\s*"(.+)"$/m)
        if (categoryMatch) {
          const cat = categoryMatch[1] as BlogCategory
          setSuggestedCategory(cat)
          setBlogCategory(cat)
        }

        // Show first ~15 lines as preview (frontmatter only)
        const frontmatterEnd = text.indexOf("---", 4)
        if (frontmatterEnd > 0) {
          setPreview(text.substring(0, frontmatterEnd + 3))
        }
      } catch (err) {
        console.warn("[MdxExportDialog] Failed to fetch suggestion:", err)
      }
    }

    fetchSuggestion()
  }, [open, articleId, blogAuthor])

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        blogCategory,
        blogAuthor,
        featured: String(featured),
        draft: String(draft),
      })

      const res = await fetch(`/api/articles/${articleId}/export-mdx?${params}`)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Falha na exportação (${res.status})`)
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = disposition.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || "artigo.mdx"

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (err) {
      console.error("[MdxExportDialog] Download failed:", err)
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setIsDownloading(false)
    }
  }, [articleId, blogCategory, blogAuthor, featured, draft, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            Exportar MDX para Zoryon Blog
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {articleTitle
              ? `Exportando: ${articleTitle}`
              : "Configure as opções de exportação do artigo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Blog Category */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Categoria do Blog</Label>
            <Select
              value={blogCategory}
              onValueChange={(v) => setBlogCategory(v as BlogCategory)}
            >
              <SelectTrigger className={cn(INPUT_CLASSES, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {BLOG_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="text-white/80 focus:bg-white/5 focus:text-white"
                  >
                    <span className="flex items-center gap-2">
                      {cat.label}
                      {suggestedCategory === cat.value && (
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">Autor</Label>
            <Input
              value={blogAuthor}
              onChange={(e) => setBlogAuthor(e.target.value)}
              placeholder="jonas-kessler"
              className={cn(INPUT_CLASSES, "text-sm")}
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
              <Label htmlFor="featured" className="text-white/70 text-sm cursor-pointer">
                Featured
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="draft"
                checked={draft}
                onCheckedChange={setDraft}
              />
              <Label htmlFor="draft" className="text-white/70 text-sm cursor-pointer">
                Draft
              </Label>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">
                Preview do Frontmatter
              </Label>
              <pre className="p-3 rounded-lg border border-white/10 bg-white/[0.02] text-xs text-white/50 font-mono max-h-32 overflow-y-auto leading-relaxed">
                {preview}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-primary text-black hover:bg-primary/90 font-medium"
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Download .mdx
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
