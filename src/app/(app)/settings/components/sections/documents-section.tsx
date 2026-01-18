/**
 * Documents Section
 *
 * Manage documents for RAG (Retrieval-Augmented Generation)
 */

"use client"

import * as React from "react"
import { FileText, Upload, Trash2, FileJson, Loader2, Folder, Package, Tag, Palette, Users, Target, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { DbDocument, ActionResult } from "../../types/settings-types"
import { DOCUMENT_CATEGORIES } from "@/lib/system-prompts"

/**
 * Documents Section Props
 */
export interface DocumentsSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * Icon mapping for categories
 */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  general: Folder,
  products: Package,
  offers: Tag,
  brand: Palette,
  audience: Users,
  competitors: Target,
  content: FileText,
}

/**
 * Upload Zone Component
 */
interface UploadZoneProps {
  onUpload: (file: File, category: string) => void
  isUploading: boolean
}

function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
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

  const processFile = (file: File) => {
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

    onUpload(file, selectedCategory)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Category Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/60">Categoria:</span>
        <div className="flex flex-wrap gap-1">
          {DOCUMENT_CATEGORIES.map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat.value] || Folder
            const isSelected = selectedCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all",
                  isSelected
                    ? "bg-primary text-black font-medium"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                )}
                title={cat.description}
              >
                <IconComponent className="h-3 w-3" />
                {cat.label}
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
          <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
        ) : (
          <Upload className="h-8 w-8 mx-auto mb-3 text-white/40" />
        )}
        <p className="text-sm text-white/70 mb-1">
          {isUploading
            ? "Processando arquivo..."
            : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="text-xs text-white/40">
          PDF, TXT, MD (máx. 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>
    </div>
  )
}

/**
 * Document Card Component
 */
interface DocumentCardProps {
  document: DbDocument
  onDelete: () => void
}

function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const categoryInfo = DOCUMENT_CATEGORIES.find(
    (c) => c.value === document.category
  )

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 shrink-0">
        <FileJson className="h-5 w-5 text-blue-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {document.title}
        </p>
        <p className="text-xs text-white/40 flex items-center gap-2 flex-wrap">
          <span className="uppercase">{document.fileType || "file"}</span>
          <span>•</span>
          <span>
            {new Date(document.createdAt).toLocaleDateString("pt-BR")}
          </span>
          {categoryInfo && (
            <>
              <span>•</span>
              <span className="text-purple-400">{categoryInfo.label}</span>
            </>
          )}
          {document.embedded && (
            <>
              <span>•</span>
              <span className="text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Indexado
              </span>
            </>
          )}
        </p>
      </div>

      {/* Delete Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Documents Section Component
 */
export function DocumentsSection({ onChange, className }: DocumentsSectionProps) {
  const [documents, setDocuments] = React.useState<DbDocument[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)

  // Fetch documents on mount
  React.useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/settings/documents")
      if (response.ok) {
        const data: DbDocument[] = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      toast.error("Falha ao carregar documentos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File, category: string) => {
    setIsUploading(true)

    try {
      // Read file content
      const content = await file.text()

      // Determine file type
      const fileType = file.name.split(".").pop()?.toLowerCase() || "txt"

      // Upload to server
      const response = await fetch("/api/settings/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          type: fileType,
          category,
          content,
        }),
      })

      const result: ActionResult = await response.json()

      if (result.success) {
        toast.success("Documento enviado com sucesso!")
        onChange?.()
        await fetchDocuments()
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

  const handleDelete = async (docId: number) => {
    try {
      const response = await fetch(`/api/settings/documents/${docId}`, {
        method: "DELETE",
      })

      const result: ActionResult = await response.json()

      if (result.success) {
        toast.success("Documento removido")
        onChange?.()
        await fetchDocuments()
      } else {
        toast.error(result.error || "Falha ao remover documento")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Falha ao remover documento")
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Documentos</h2>
        <p className="text-sm text-white/60">
          Faça upload de documentos para enriquecer o contexto da IA via RAG.
          Os documentos são indexados usando embeddings da Voyage AI.
        </p>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <FileText className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90">
            <span className="font-medium">Camada 4 (RAG):</span> Documentos
            indexados serão usados como contexto adicional quando a IA precisar de
            informações específicas do seu negócio.
          </p>
          <p className="text-white/60 mt-1">
            Use categorias para organizar e selecionar grupos de documentos
            durante a geração de conteúdo.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <UploadZone onUpload={handleUpload} isUploading={isUploading} />

      {/* Documents List */}
      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin mb-2" />
          <p className="text-sm text-white/40">Carregando documentos...</p>
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-white/50 uppercase tracking-wide">
            Documentos ({documents.length})
          </p>
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={() => handleDelete(doc.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-white/40">
            Nenhum documento indexado ainda.
          </p>
        </div>
      )}

      {/* Future Features Notice */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          Em breve: Seleção de documentos específicos por agente, re-indexação
          e busca por similaridade.
        </p>
      </div>
    </div>
  )
}
