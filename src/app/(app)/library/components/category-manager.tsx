/**
 * Category Manager Component
 *
 * Dialog for managing library categories:
 * - List categories with item counts
 * - Create new categories (name + color)
 * - Rename/recolor existing categories
 * - Delete categories with item migration option
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Folder,
  AlertTriangle,
  X,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "../actions/library-actions"
import {
  getCategoriesWithCountsAction,
  deleteCategoryWithMigrationAction,
} from "../actions/category-tag-actions"
import type { Category } from "@/types/library"

// ============================================================================
// TYPES
// ============================================================================

interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

interface CategoryWithCount extends Category {
  itemCount?: number
}

// Predefined color palette
const COLOR_PALETTE = [
  "#a3e635", // lime
  "#f87171", // red
  "#60a5fa", // blue
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#34d399", // emerald
  "#f472b6", // pink
  "#fb923c", // orange
  "#38bdf8", // sky
  "#e879f9", // fuchsia
]

// ============================================================================
// COMPONENT
// ============================================================================

export function CategoryManager({ open, onOpenChange, onUpdate }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // New category form
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0])
  const [isSaving, setIsSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number
    name: string
    itemCount: number
  } | null>(null)
  const [moveToCategory, setMoveToCategory] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getCategoriesWithCountsAction()
      setCategories(result)
    } catch {
      // Fallback to basic categories
      const basic = await getCategoriesAction()
      setCategories(basic.map((c) => ({ ...c, itemCount: 0 })))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void fetchCategories()
    }
  }, [open, fetchCategories])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsSaving(true)
    try {
      const result = await createCategoryAction({
        name: newName.trim(),
        color: newColor,
        orderIdx: categories.length,
      })

      if (result.success) {
        toast.success("Categoria criada")
        setNewName("")
        setNewColor(COLOR_PALETTE[0])
        setIsCreating(false)
        await fetchCategories()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao criar categoria")
      }
    } catch {
      toast.error("Erro ao criar categoria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || COLOR_PALETTE[0])
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    setIsSaving(true)
    try {
      const result = await updateCategoryAction(editingId, {
        name: editName.trim(),
        color: editColor,
      })

      if (result.success) {
        toast.success("Categoria atualizada")
        setEditingId(null)
        await fetchCategories()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao atualizar categoria")
      }
    } catch {
      toast.error("Erro ao atualizar categoria")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const handleRequestDelete = (cat: CategoryWithCount) => {
    setDeleteConfirm({
      id: cat.id,
      name: cat.name,
      itemCount: cat.itemCount || 0,
    })
    setMoveToCategory(null)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      const result = await deleteCategoryWithMigrationAction(
        deleteConfirm.id,
        moveToCategory ?? undefined
      )

      if (result.success) {
        toast.success("Categoria excluida")
        setDeleteConfirm(null)
        await fetchCategories()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao excluir categoria")
      }
    } catch {
      toast.error("Erro ao excluir categoria")
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              Gerenciar Categorias
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Crie, edite ou exclua categorias para organizar seus conteudos.
            </DialogDescription>
          </DialogHeader>

          {/* Category List */}
          <div className="space-y-2 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : categories.length === 0 && !isCreating ? (
              <div className="text-center py-8">
                <Folder className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">Nenhuma categoria criada.</p>
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id}>
                  {editingId === cat.id ? (
                    // Edit mode
                    <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8 bg-white/[0.02] border-white/10 text-white text-sm"
                        placeholder="Nome da categoria"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                      />
                      <div className="flex gap-1">
                        {COLOR_PALETTE.slice(0, 5).map((color) => (
                          <button
                            key={color}
                            className="w-5 h-5 rounded-full border-2 transition-transform"
                            style={{
                              backgroundColor: color,
                              borderColor: editColor === color ? "white" : "transparent",
                              transform: editColor === color ? "scale(1.2)" : "scale(1)",
                            }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/5"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || "#a3e635" }}
                        />
                        <span className="text-sm text-white/90 truncate">{cat.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-white/10 text-white/40 shrink-0"
                        >
                          {cat.itemCount || 0}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/5"
                          onClick={() => handleStartEdit(cat)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRequestDelete(cat)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* New Category Form */}
            {isCreating ? (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-8 bg-white/[0.02] border-white/10 text-white text-sm"
                  placeholder="Nome da nova categoria"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate()
                    if (e.key === "Escape") {
                      setIsCreating(false)
                      setNewName("")
                    }
                  }}
                />
                <div className="flex gap-1">
                  {COLOR_PALETTE.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      className="w-5 h-5 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: newColor === color ? "white" : "transparent",
                        transform: newColor === color ? "scale(1.2)" : "scale(1)",
                      }}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={handleCreate}
                  disabled={isSaving || !newName.trim()}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/5"
                  onClick={() => {
                    setIsCreating(false)
                    setNewName("")
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full h-10 border border-dashed border-white/10 text-white/50 hover:text-white hover:bg-white/5 hover:border-white/20"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation with Migration */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null)
        }}
      >
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle>Excluir categoria "{deleteConfirm?.name}"?</DialogTitle>
            </div>
            {deleteConfirm && deleteConfirm.itemCount > 0 ? (
              <DialogDescription className="text-white/60">
                Esta categoria possui {deleteConfirm.itemCount}{" "}
                {deleteConfirm.itemCount === 1 ? "conteudo" : "conteudos"}.
                Escolha o que fazer com eles:
              </DialogDescription>
            ) : (
              <DialogDescription className="text-white/60">
                Esta categoria nao possui conteudos associados e sera excluida permanentemente.
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Migration Options */}
          {deleteConfirm && deleteConfirm.itemCount > 0 && (
            <div className="space-y-2 mt-2">
              <button
                onClick={() => setMoveToCategory(null)}
                className={`w-full p-3 text-left text-sm rounded-lg border transition-colors ${
                  moveToCategory === null
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20"
                }`}
              >
                Remover categoria dos itens (ficam sem categoria)
              </button>
              {categories
                .filter((c) => c.id !== deleteConfirm?.id)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMoveToCategory(cat.id)}
                    className={`w-full p-3 text-left text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                      moveToCategory === cat.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || "#a3e635" }}
                    />
                    Mover para "{cat.name}"
                  </button>
                ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(null)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              variant="destructive"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
