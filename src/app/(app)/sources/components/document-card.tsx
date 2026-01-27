/**
 * Document Card Component
 *
 * Card para exibir um documento com ações de editar, excluir, reindexar,
 * visualizar conteúdo e embeddings.
 */

"use client"

import * as React from "react"
import {
  FileText,
  Sparkles,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Database,
  FolderOpen,
  Check,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type {
  DocumentWithEmbeddings,
  UpdateDocumentResult,
  ReembedResult,
  ActionResult,
} from "../types/sources-types"
import {
  EmbeddingStatusBadge,
  EmbeddingProgressMini,
} from "@/components/embeddings"
import { DocumentViewDialog } from "./document-view-dialog"
import { EmbeddingsViewDialog } from "./embeddings-view-dialog"
import { MoveToCollectionDialog } from "./move-to-collection-dialog"

/**
 * Category configuration
 */
const CATEGORIES: Record<string, { label: string; color: string }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" }
}

// Re-export DocumentWithEmbeddings for use in documents-tab
export type { DocumentWithEmbeddings } from "../types/sources-types"

/**
 * Document Card Props
 */
export interface DocumentCardProps {
  document: DocumentWithEmbeddings
  onUpdate?: () => void
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
  showSelection?: boolean
}

/**
 * Category Badge Component
 */
function CategoryBadge({ category }: { category: string | null }) {
  const config = CATEGORIES[category || ""] || CATEGORIES.general

  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", config.color)}>
      {config.label}
    </span>
  )
}

/**
 * Edit Document Dialog Component
 */
interface EditDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: DocumentWithEmbeddings
  onSave: () => void
}

function EditDocumentDialog({
  open,
  onOpenChange,
  document,
  onSave,
}: EditDocumentDialogProps) {
  const [title, setTitle] = React.useState(document.title)
  const [content, setContent] = React.useState(document.content)
  const [category, setCategory] = React.useState(document.category || "general")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setTitle(document.title)
    setContent(document.content)
    setCategory(document.category || "general")
  }, [document])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/sources/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
        }),
      })

      const result: UpdateDocumentResult = await response.json()

      if (result.success) {
        toast.success("Documento atualizado com sucesso")
        onSave()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Falha ao atualizar documento")
      }
    } catch (error) {
      toast.error("Erro ao atualizar documento")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Documento</DialogTitle>
          <DialogDescription className="text-white/60">
            Altere o título, conteúdo ou categoria do documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do documento"
              className="w-full px-4 py-2 rounded-lg bg-[#0a0a0f] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    category === key
                      ? "bg-primary text-black"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70">Conteúdo</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo do documento..."
              rows={12}
              className="w-full px-4 py-3 rounded-lg bg-[#0a0a0f] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-white/40">
              {content.length} caracteres
            </p>
          </div>

          {/* Warning about reindexing */}
          {document.embedded && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-300/80">
                ⚠️ Ao salvar, o documento precisará ser reindexado. Os embeddings
                antigos serão removidos e novos serão gerados.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5"
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-black hover:bg-primary/90"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Delete Document Dialog Component
 */
interface DeleteDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: DocumentWithEmbeddings
  onDelete: () => void
}

function DeleteDocumentDialog({
  open,
  onOpenChange,
  document,
  onDelete,
}: DeleteDocumentDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/sources/documents/${document.id}`, {
        method: "DELETE",
      })

      const result: ActionResult = await response.json()

      if (result.success) {
        toast.success("Documento excluído com sucesso")
        onDelete()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Falha ao excluir documento")
      }
    } catch (error) {
      toast.error("Erro ao excluir documento")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Excluir Documento</DialogTitle>
          <DialogDescription className="text-white/60">
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-white/80 text-sm">
            Tem certeza que deseja excluir <strong>"{document.title}"</strong>?
          </p>
          {document.embeddingCount && document.embeddingCount > 0 && (
            <p className="text-amber-400 text-xs mt-2">
              ⚠️ Este documento possui {document.embeddingCount} embeddings
              que também serão excluídos.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5"
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Excluindo...
              </span>
            ) : (
              "Excluir Documento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Main Document Card Component
 */
export function DocumentCard({
  document,
  onUpdate,
  selected = false,
  onSelectChange,
  showSelection = false,
}: DocumentCardProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [embeddingsOpen, setEmbeddingsOpen] = React.useState(false)
  const [moveOpen, setMoveOpen] = React.useState(false)
  const [isReembedding, setIsReembedding] = React.useState(false)

  const isIndexed = document.embedded && document.embeddingCount && document.embeddingCount > 0

  const handleReembed = async () => {
    setIsReembedding(true)
    try {
      const response = await fetch(`/api/sources/documents/${document.id}/reembed`, {
        method: "POST",
      })

      const result: ReembedResult = await response.json()

      if (result.success) {
        toast.success("Documento enviado para reindexação")
        onUpdate?.()
      } else {
        toast.error(result.error || "Falha ao iniciar reindexação")
      }
    } catch (error) {
      toast.error("Erro ao iniciar reindexação")
    } finally {
      setIsReembedding(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-4 p-4 rounded-xl border transition-all",
          selected
            ? "bg-primary/10 border-primary/30"
            : "bg-white/[0.02] border-white/5 hover:border-white/10"
        )}
      >
        {/* Selection Checkbox */}
        {showSelection && (
          <button
            type="button"
            onClick={() => onSelectChange?.(!selected)}
            className={cn(
              "mt-1 w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
              selected
                ? "bg-primary border-primary"
                : "border-white/20 hover:border-white/40"
            )}
          >
            {selected && <Check className="h-3.5 w-3.5 text-black" />}
          </button>
        )}

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-500/10 shrink-0">
          {isIndexed ? (
            <Sparkles className="h-6 w-6 text-cyan-400" />
          ) : (
            <FileText className="h-6 w-6 text-white/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-medium text-white truncate">
              {document.title}
            </h3>
            <CategoryBadge category={document.category} />
            {/* Embedding Status Badge */}
            <EmbeddingStatusBadge
              embedded={document.embedded}
              status={document.embeddingStatus}
              progress={document.embeddingProgress ?? undefined}
              total={document.chunksCount ?? undefined}
              compact
            />
          </div>

          <p className="text-xs text-white/50 line-clamp-2 mb-2">
            {document.content}
          </p>

          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="uppercase">{document.fileType || "TXT"}</span>
            {isIndexed ? (
              <>
                <span className="text-white/20">•</span>
                <span className="text-green-500 flex items-center gap-1">
                  ✓ {document.embeddingCount || document.chunksCount} {document.chunksCount === 1 ? "chunk" : "chunks"}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-cyan-400">
                  {document.embeddingModel}
                </span>
              </>
            ) : (
              <span className="text-white/30">Aguardando indexação</span>
            )}
            {/* Show progress if processing */}
            {document.embeddingStatus === "processing" && document.chunksCount && (
              <>
                <span className="text-white/20">•</span>
                <EmbeddingProgressMini
                  current={document.embeddingProgress ?? 0}
                  total={document.chunksCount}
                />
              </>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1">
          {/* View Document */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewOpen(true)}
            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ver documento"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* View Embeddings */}
          {isIndexed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEmbeddingsOpen(true)}
              className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Ver embeddings"
            >
              <Database className="h-4 w-4" />
            </Button>
          )}

          {/* Move to Collection */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMoveOpen(true)}
            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Mover para coleção"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
              <DropdownMenuItem
                onClick={() => setViewOpen(true)}
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver documento
              </DropdownMenuItem>
              {isIndexed && (
                <DropdownMenuItem
                  onClick={() => setEmbeddingsOpen(true)}
                  className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Ver embeddings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setMoveOpen(true)}
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Mover para coleção
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleReembed}
                disabled={isReembedding || document.embeddingStatus === "processing"}
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isReembedding ? "animate-spin" : ""}`} />
                {isReembedding ? "Reindexando..." : "Reindexar"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialogs */}
      <EditDocumentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        document={document}
        onSave={onUpdate || (() => {})}
      />
      <DeleteDocumentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        document={document}
        onDelete={onUpdate || (() => {})}
      />
      <DocumentViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        document={document}
      />
      <EmbeddingsViewDialog
        open={embeddingsOpen}
        onOpenChange={setEmbeddingsOpen}
        document={document}
      />
      <MoveToCollectionDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        documentIds={[document.id]}
        documentTitle={document.title}
        onSuccess={onUpdate || (() => {})}
      />
    </>
  )
}
