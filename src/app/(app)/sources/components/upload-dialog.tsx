/**
 * Upload Document Dialog
 *
 * Dialog para upload de documentos com seleção de categoria.
 * Suporta upload de arquivos únicos ou múltiplos (bulk upload).
 * Formatos suportados: PDF, TXT, MD, DOC, DOCX.
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
  File,
  Check,
  AlertCircle,
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
 * Supported file extensions
 */
const SUPPORTED_EXTENSIONS = [".pdf", ".txt", ".md", ".doc", ".docx"]

/**
 * Upload result for a single file
 */
interface UploadResult {
  file: File
  success: boolean
  document?: {
    id: number
    title: string
    fileType: string
    category: string
  }
  error?: string
}

/**
 * Upload Dialog Props
 */
export interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  collectionId?: number | null
}

/**
 * Main Upload Dialog Component
 */
export function UploadDialog({ open, onOpenChange, onSuccess, collectionId }: UploadDialogProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState("general")
  const [uploadResults, setUploadResults] = React.useState<UploadResult[]>([])
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
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
      addFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addFiles(Array.from(files))
    }
  }

  const addFiles = (files: File[]) => {
    // Validate file types
    const validFiles = files.filter((file) => {
      const isValidType = SUPPORTED_EXTENSIONS.some((type) =>
        file.name.toLowerCase().endsWith(type)
      )
      if (!isValidType) {
        toast.error(`${file.name}: tipo não suportado`, {
          description: `Use: ${SUPPORTED_EXTENSIONS.join(", ")}`
        })
      }
      return isValidType
    })

    // Validate file sizes (10MB max per file)
    const validSizeFiles = validFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: arquivo muito grande`, {
          description: "Máximo 10MB por arquivo"
        })
        return false
      }
      return true
    })

    // Add to selected files (avoid duplicates)
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const newFiles = validSizeFiles.filter((f) => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um arquivo")
      return
    }

    setIsUploading(true)
    setUploadResults([])

    try {
      // Create FormData for bulk upload
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })
      formData.append("category", selectedCategory)
      if (collectionId) {
        formData.append("collectionId", collectionId.toString())
      }

      // Upload to API route
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Handle bulk upload results
        if (result.documents) {
          const results: UploadResult[] = selectedFiles.map((file, index) => {
            const doc = result.documents[index]
            return {
              file,
              success: !!doc,
              document: doc,
              error: !doc ? result.failed?.[index]?.error : undefined,
            }
          })
          setUploadResults(results)

          const successCount = results.filter((r) => r.success).length
          const failedCount = results.filter((r) => !r.success).length

          if (failedCount === 0) {
            toast.success(`${successCount} documento(s) enviado(s) com sucesso!`)
          } else if (successCount === 0) {
            toast.error("Falha ao enviar todos os documentos")
          } else {
            toast.success(`${successCount} enviados, ${failedCount} falharam`)
          }

          onSuccess?.()
          // Don't close dialog immediately - show results first
          setTimeout(() => {
            onOpenChange(false)
          }, 2000)
        } else {
          // Single file upload (backward compatible)
          toast.success("Documento enviado com sucesso!")
          onSuccess?.()
          onOpenChange(false)
        }
      } else {
        toast.error(result.error || "Falha ao enviar documento(s)")
      }
    } catch (error) {
      toast.error("Falha ao processar arquivo(s)")
    } finally {
      setIsUploading(false)
      setSelectedFiles([])
      setUploadResults([])
    }
  }

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedCategory("general")
      setSelectedFiles([])
      setUploadResults([])
    }
  }, [open])

  const hasFiles = selectedFiles.length > 0 || uploadResults.length > 0

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!isUploading) {
        onOpenChange(open)
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Adicionar Documento{selectedFiles.length > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Faça upload de arquivos PDF, TXT, MD, DOC ou DOCX para enriquecer o contexto da IA via RAG.
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
          {!hasFiles && (
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
                PDF, TXT, MD, DOC, DOCX (máx. 10MB cada)
              </p>
              <p className="text-xs text-white/30 mt-1">
                Múltiplos arquivos permitidos
              </p>
            </div>
          )}

          {/* Selected Files List */}
          {hasFiles && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/70">
                  Arquivos selecionados ({selectedFiles.length})
                </span>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={handleClick}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    + Adicionar mais
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {selectedFiles.map((file, index) => {
                  const result = uploadResults[index]
                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        result?.success
                          ? "bg-green-500/10 border-green-500/30"
                          : result?.error
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-white/5 border-white/10"
                      )}
                    >
                      <File className="h-4 w-4 text-white/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-white/40">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {result?.success ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : result?.error ? (
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      ) : !isUploading ? (
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <X className="h-4 w-4 text-white/40" />
                        </button>
                      ) : (
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected Category Info */}
          {selectedCategory && !hasFiles && (
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

        {/* Hidden file input - accepts multiple files */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.doc,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          {hasFiles && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedFiles([])}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Limpar
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5"
            disabled={isUploading}
          >
            Cancelar
          </Button>
          {hasFiles && (
            <Button
              type="button"
              onClick={processFiles}
              disabled={isUploading}
              className="bg-primary text-black hover:bg-primary/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {selectedFiles.length} arquivo{selectedFiles.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
