/**
 * Document View Dialog
 *
 * Dialog for viewing the full content of a document.
 */

"use client"

import * as React from "react"
import { FileText, Copy, Check, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface DocumentViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: number
    title: string
    content: string
    fileType: string | null
    category: string | null
  }
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
}

function CategoryBadge({ category }: { category: string | null }) {
  const config = CATEGORIES[category || ""] || CATEGORIES.general
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
      {config.label}
    </span>
  )
}

export function DocumentViewDialog({
  open,
  onOpenChange,
  document,
}: DocumentViewDialogProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(document.content)
    setCopied(true)
    toast.success("Conteúdo copiado para a área de transferência")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([document.content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement("a")
    anchor.href = url
    anchor.download = `${document.title}.txt`
    window.document.body.appendChild(anchor)
    anchor.click()
    window.document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    toast.success("Download iniciado")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white truncate pr-4">
                {document.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <CategoryBadge category={document.category} />
                <span className="text-xs text-white/40 uppercase">
                  {document.fileType || "TXT"}
                </span>
                <span className="text-xs text-white/40">
                  {document.content.length.toLocaleString()} caracteres
                </span>
              </div>
            </div>
          </div>
          <DialogDescription className="text-white/60" />
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-black/30 rounded-lg p-4">
          <pre className="text-sm text-white/80 whitespace-pre-wrap break-words font-mono">
            {document.content}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            Visualização do documento original
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
