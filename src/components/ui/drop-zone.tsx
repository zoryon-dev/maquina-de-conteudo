/**
 * Drop Zone Component
 *
 * Componente reutilizável de drag & drop para upload de arquivos.
 * Suporta validação de tipo e tamanho, múltiplos arquivos,
 * e feedback visual com animações Framer Motion.
 */

"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileWarning } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

export interface DropZoneProps {
  onFilesDropped: (files: File[]) => void
  accept?: string[] // e.g. ["image/png", "image/jpeg"]
  maxFiles?: number
  maxSizeBytes?: number
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

function isImageAccept(accept?: string[]): boolean {
  if (!accept) return false
  return accept.every((t) => IMAGE_TYPES.includes(t))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAcceptExtensions(accept?: string[]): string {
  if (!accept) return "*"
  return accept
    .map((mime) => {
      const ext = mime.split("/")[1]
      if (ext === "jpeg") return ".jpg,.jpeg"
      return `.${ext}`
    })
    .join(",")
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DropZone({
  onFilesDropped,
  accept,
  maxFiles = 10,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  children,
  className,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const isImageMode = isImageAccept(accept)

  // Validate and filter files
  const validateFiles = useCallback(
    (fileList: FileList | File[]): File[] => {
      const files = Array.from(fileList)
      const validFiles: File[] = []
      let hasErrors = false

      for (const file of files) {
        // Check file type
        if (accept && accept.length > 0 && !accept.includes(file.type)) {
          toast.error(`"${file.name}" — tipo não permitido`, {
            description: `Tipos aceitos: ${accept.map((t) => t.split("/")[1].toUpperCase()).join(", ")}`,
          })
          hasErrors = true
          continue
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          toast.error(`"${file.name}" — arquivo muito grande`, {
            description: `Tamanho máximo: ${formatFileSize(maxSizeBytes)}`,
          })
          hasErrors = true
          continue
        }

        validFiles.push(file)
      }

      // Check max files
      if (validFiles.length > maxFiles) {
        toast.error(`Máximo de ${maxFiles} ${maxFiles === 1 ? "arquivo" : "arquivos"} por vez`)
        return validFiles.slice(0, maxFiles)
      }

      return validFiles
    },
    [accept, maxFiles, maxSizeBytes]
  )

  // Drag event handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return
      dragCounterRef.current++
      if (dragCounterRef.current === 1) {
        setIsDragOver(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current--
      if (dragCounterRef.current === 0) {
        setIsDragOver(false)
      }
    },
    []
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)

      if (disabled) return

      const { files } = e.dataTransfer
      if (files && files.length > 0) {
        const validFiles = validateFiles(files)
        if (validFiles.length > 0) {
          onFilesDropped(validFiles)
        }
      }
    },
    [disabled, validateFiles, onFilesDropped]
  )

  // Click to open file dialog
  const handleClick = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      if (files && files.length > 0) {
        const validFiles = validateFiles(files)
        if (validFiles.length > 0) {
          onFilesDropped(validFiles)
        }
      }
      // Reset input so the same file can be selected again
      e.target.value = ""
    },
    [validateFiles, onFilesDropped]
  )

  // If children are provided, wrap them with drop handlers (invisible overlay mode)
  if (children) {
    return (
      <div
        className={cn("relative", className)}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {children}

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragOver && !disabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-primary/5 border-2 border-dashed border-primary/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">
                  Solte para fazer upload
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={getAcceptExtensions(accept)}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    )
  }

  // Standalone drop zone (no children)
  return (
    <div className={cn("relative", className)}>
      <motion.div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={
          isDragOver && !disabled
            ? { scale: 1.01, borderColor: "hsl(84 76% 55% / 0.5)" }
            : { scale: 1, borderColor: "rgba(255, 255, 255, 0.1)" }
        }
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8 rounded-xl",
          "border-2 border-dashed cursor-pointer transition-colors",
          "bg-white/[0.02] hover:bg-white/[0.04]",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <AnimatePresence mode="wait">
          {isDragOver && !disabled ? (
            <motion.div
              key="drag-active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-primary">
                Solte para fazer upload
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="drag-idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Upload className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-sm font-medium text-white/70">
                {isImageMode
                  ? "Arraste imagens aqui — PNG, JPG, WebP"
                  : "Arraste arquivos aqui"}
              </p>
              <p className="text-xs text-white/40">
                ou clique para selecionar
                {maxSizeBytes && ` (max. ${formatFileSize(maxSizeBytes)})`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={getAcceptExtensions(accept)}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
}
