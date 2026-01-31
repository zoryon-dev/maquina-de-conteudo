/**
 * Image Upload Dialog
 *
 * Dialog para upload de imagem customizada para substituir imagens na biblioteca.
 * Suporta: PNG, JPG, WebP, GIF (max 5MB).
 */

"use client"

import * as React from "react"
import { Upload, Loader2, X, ImageIcon, Check, AlertCircle } from "lucide-react"
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

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"]
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ============================================================================
// TYPES
// ============================================================================

export interface ImageUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  libraryItemId: number
  slideIndex: number
  currentImageUrl?: string
  onSuccess?: (newImageUrl: string) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ImageUploadDialog({
  open,
  onOpenChange,
  libraryItemId,
  slideIndex,
  currentImageUrl,
  onSuccess,
}: ImageUploadDialogProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setPreviewUrl(null)
      setError(null)
      setIsUploading(false)
    }
  }, [open])

  // Generate preview URL when file is selected
  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [selectedFile])

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
      validateAndSetFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    setError(null)

    // Validate file type by extension
    const isValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
    if (!isValidExtension) {
      setError(`Tipo não suportado. Use: ${SUPPORTED_EXTENSIONS.join(", ")}`)
      return
    }

    // Validate MIME type
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError("Arquivo não é uma imagem válida")
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("slideIndex", slideIndex.toString())

      const response = await fetch(`/api/library/${libraryItemId}/upload-image`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao fazer upload")
      }

      toast.success("Imagem substituída com sucesso!")
      onSuccess?.(result.newImageUrl)
      onOpenChange(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Substituir Imagem
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Faça upload de uma nova imagem para substituir a atual.
            <br />
            <span className="text-white/40">
              Formatos: PNG, JPG, WebP, GIF (máx. 5MB)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Image Preview */}
          {currentImageUrl && !previewUrl && (
            <div className="space-y-2">
              <p className="text-xs text-white/40">Imagem atual:</p>
              <div className="relative aspect-video w-full max-w-[300px] mx-auto rounded-lg overflow-hidden border border-white/10 bg-white/[0.02]">
                <img
                  src={currentImageUrl}
                  alt="Imagem atual"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-white/60 bg-black/50 px-2 py-1 rounded">
                    Será substituída
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Drop Zone or Preview */}
          {previewUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-white/40">Nova imagem:</p>
              <div className="relative aspect-video w-full max-w-[300px] mx-auto rounded-lg overflow-hidden border border-primary/30 bg-white/[0.02]">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-1 bg-black/70 rounded-full hover:bg-black/90 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-xs text-white/40 text-center">
                {selectedFile?.name} ({(selectedFile?.size ?? 0 / 1024).toFixed(1)} KB)
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-white/20 hover:border-white/40 bg-white/[0.02]"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_MIME_TYPES.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-3 text-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isDragging ? "bg-primary/20" : "bg-white/5"
                )}>
                  <ImageIcon className={cn(
                    "w-6 h-6",
                    isDragging ? "text-primary" : "text-white/40"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-white/80">
                    {isDragging ? "Solte a imagem aqui" : "Arraste uma imagem ou clique para selecionar"}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    PNG, JPG, WebP ou GIF (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-primary text-black hover:bg-primary/90 min-w-[100px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Substituir
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
