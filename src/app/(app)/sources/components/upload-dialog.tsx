/**
 * Upload Document Dialog
 *
 * Dialog para upload de documentos com seleção de categoria.
 * Reutiliza a lógica do UploadZone de settings.
 */

"use client"

import * as React from "react"
import {
  Upload,
  Loader2,
  X,
  FileText,
  Folder,
  Package,
  Tag,
  Palette,
  Users,
  Target,
} from "lucide-react"
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
import { uploadDocumentAction } from "../../settings/actions/save-settings"

/**
 * Category configuration - matches DOCUMENT_CATEGORIES from system-prompts.ts
 */
const CATEGORIES = [
  { value: "general", label: "Geral", icon: Folder, description: "Documentos gerais sobre o negócio" },
  { value: "products", label: "Catálogo", icon: Package, description: "Lista completa de produtos/serviços" },
  { value: "offers", label: "Ofertas", icon: Tag, description: "Promoções, descontos, lançamentos" },
  { value: "brand", label: "Marca", icon: Palette, description: "Tom de voz, valores, missão, visão" },
  { value: "audience", label: "Público", icon: Users, description: "Personas, pesquisas, dados demográficos" },
  { value: "competitors", label: "Concorrentes", icon: Target, description: "Análise competitiva" },
  { value: "content", label: "Conteúdo", icon: FileText, description: "Posts que funcionaram, calendário anterior" },
] as const

/**
 * Upload Dialog Props
 */
export interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Main Upload Dialog Component
 */
export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState("general")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = [".pdf", ".txt", ".md"]
    const isValidType = validTypes.some((type) =>
      file.name.toLowerCase().endsWith(type)
    )

    if (!isValidType) {
      toast.error("Tipo de arquivo inválido. Use PDF, TXT ou MD.")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.")
      return
    }

    setIsUploading(true)

    try {
      // Read file content
      const content = await file.text()

      // Determine file type
      const fileType = file.name.split(".").pop()?.toLowerCase() || "txt"

      // Upload to server
      const result = await uploadDocumentAction({
        title: file.name,
        type: fileType,
        category: selectedCategory,
        content,
      })

      if (result.success) {
        toast.success("Documento enviado com sucesso!")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Falha ao enviar documento")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Falha ao processar arquivo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Reset category when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedCategory("general")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Adicionar Documento
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Faça upload de arquivos PDF, TXT ou MD para enriquecer o contexto da IA via RAG.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">Categoria do documento</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs transition-all border",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                    title={cat.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading ? handleClick : undefined}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-white/20 hover:border-white/30 hover:bg-white/5",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? (
              <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
            ) : (
              <Upload className="h-10 w-10 mx-auto mb-3 text-white/40" />
            )}
            <p className="text-sm text-white/70 mb-1">
              {isUploading
                ? "Processando arquivo..."
                : "Arraste arquivos aqui ou clique para selecionar"}
            </p>
            <p className="text-xs text-white/40">
              PDF, TXT, MD (máx. 10MB)
            </p>
          </div>

          {/* Selected Category Info */}
          {selectedCategory && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
              {React.createElement(
                CATEGORIES.find((c) => c.value === selectedCategory)?.icon || FileText,
                { className: "h-4 w-4 text-primary" }
              )}
              <span className="text-xs text-white/60">
                Categoria: <span className="text-white font-medium">
                  {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5"
            disabled={isUploading}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
