/**
 * Document Card Component
 *
 * Card para exibir um documento com ações de editar, excluir e reindexar.
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
import {
  deleteDocumentWithEmbeddingsAction,
  updateDocumentAction,
} from "../actions/sources-actions"

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
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
}

/**
 * Document with embedding count - exported for use in documents-tab
 */
export interface DocumentWithEmbeddings {
  id: number
  title: string
  content: string
  fileType: string | null
  category: string | null
  embedded: boolean
  embeddingModel: string | null
  createdAt: Date
  updatedAt: Date
  embeddingCount?: number
}

/**
 * Document Card Props
 */
export interface DocumentCardProps {
  document: DocumentWithEmbeddings
  onUpdate?: () => void
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
      const result = await updateDocumentAction(document.id, {
        title: title.trim(),
        content: content.trim(),
        category,
      })

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
      const result = await deleteDocumentWithEmbeddingsAction(document.id)

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
export function DocumentCard({ document, onUpdate }: DocumentCardProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const isIndexed = document.embedded && document.embeddingCount && document.embeddingCount > 0

  return (
    <>
      <div className="group flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-white truncate">
              {document.title}
            </h3>
            <CategoryBadge category={document.category} />
          </div>

          <p className="text-xs text-white/50 line-clamp-2 mb-2">
            {document.content}
          </p>

          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="uppercase">{document.fileType || "TXT"}</span>
            {isIndexed && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-green-500 flex items-center gap-1">
                  ✓ {document.embeddingCount} chunks
                </span>
                <span className="text-white/20">•</span>
                <span className="text-cyan-400">
                  {document.embeddingModel}
                </span>
              </>
            )}
            {!isIndexed && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-amber-500">Pendente de indexação</span>
              </>
            )}
          </div>
        </div>

        {/* Actions Dropdown */}
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
              onClick={() => setEditOpen(true)}
              className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
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
    </>
  )
}
