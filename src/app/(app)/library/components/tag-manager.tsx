/**
 * Tag Manager Component
 *
 * Dialog for managing library tags:
 * - List tags with item counts
 * - Create new tags
 * - Rename existing tags
 * - Delete tags (with warning about affected items)
 * - Merge tags: select 2+ tags, choose survivor name
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Hash,
  AlertTriangle,
  X,
  Check,
  Merge,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getTagsAction,
  createTagAction,
  deleteTagAction,
} from "../actions/library-actions"
import {
  renameTagAction,
  mergeTagsAction,
} from "../actions/category-tag-actions"

// ============================================================================
// TYPES
// ============================================================================

interface TagManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

interface TagWithCount {
  id: number
  userId: string
  name: string
  color: string | null
  createdAt: Date
  itemCount?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TagManager({ open, onOpenChange, onUpdate }: TagManagerProps) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // New tag form
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number
    name: string
    itemCount: number
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Merge state
  const [selectedForMerge, setSelectedForMerge] = useState<Set<number>>(new Set())
  const [isMerging, setIsMerging] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [survivorId, setSurvivorId] = useState<number | null>(null)

  // Sort state
  const [sortBy, setSortBy] = useState<"name" | "count">("name")

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTagsAction()
      setTags(result as TagWithCount[])
    } catch {
      toast.error("Erro ao carregar tags")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void fetchTags()
      setSelectedForMerge(new Set())
    }
  }, [open, fetchTags])

  // ============================================================================
  // SORTING
  // ============================================================================

  const sortedTags = [...tags].sort((a, b) => {
    if (sortBy === "count") {
      return (b.itemCount || 0) - (a.itemCount || 0)
    }
    return a.name.localeCompare(b.name)
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = async () => {
    if (!newName.trim()) return

    setIsSaving(true)
    try {
      const result = await createTagAction(newName.trim())

      if (result.success) {
        toast.success("Tag criada")
        setNewName("")
        setIsCreating(false)
        await fetchTags()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao criar tag")
      }
    } catch {
      toast.error("Erro ao criar tag")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (tag: TagWithCount) => {
    setEditingId(tag.id)
    setEditName(tag.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    setIsSaving(true)
    try {
      const result = await renameTagAction(editingId, editName.trim())

      if (result.success) {
        toast.success("Tag renomeada")
        setEditingId(null)
        await fetchTags()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao renomear tag")
      }
    } catch {
      toast.error("Erro ao renomear tag")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName("")
  }

  const handleRequestDelete = (tag: TagWithCount) => {
    setDeleteConfirm({
      id: tag.id,
      name: tag.name,
      itemCount: tag.itemCount || 0,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      const result = await deleteTagAction(deleteConfirm.id)

      if (result.success) {
        toast.success("Tag excluida")
        setDeleteConfirm(null)
        setSelectedForMerge((prev) => {
          const next = new Set(prev)
          next.delete(deleteConfirm.id)
          return next
        })
        await fetchTags()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao excluir tag")
      }
    } catch {
      toast.error("Erro ao excluir tag")
    } finally {
      setIsDeleting(false)
    }
  }

  // Merge handlers
  const toggleMergeSelection = (id: number) => {
    setSelectedForMerge((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleOpenMergeDialog = () => {
    const selectedArray = Array.from(selectedForMerge)
    if (selectedArray.length < 2) {
      toast.error("Selecione pelo menos 2 tags para mesclar")
      return
    }
    setSurvivorId(selectedArray[0])
    setMergeDialogOpen(true)
  }

  const handleConfirmMerge = async () => {
    if (!survivorId) return

    const tagIds = Array.from(selectedForMerge)
    setIsMerging(true)
    try {
      const result = await mergeTagsAction(tagIds, survivorId)

      if (result.success) {
        toast.success("Tags mescladas com sucesso")
        setMergeDialogOpen(false)
        setSelectedForMerge(new Set())
        await fetchTags()
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao mesclar tags")
      }
    } catch {
      toast.error("Erro ao mesclar tags")
    } finally {
      setIsMerging(false)
    }
  }

  const mergeableCount = selectedForMerge.size

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Gerenciar Tags
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Crie, edite, exclua ou mescle tags para organizar seus conteudos.
            </DialogDescription>
          </DialogHeader>

          {/* Sort and Merge Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Ordenar:</span>
              <button
                onClick={() => setSortBy("name")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === "name"
                    ? "bg-primary/20 text-primary"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Nome
              </button>
              <button
                onClick={() => setSortBy("count")}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === "count"
                    ? "bg-primary/20 text-primary"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Quantidade
              </button>
            </div>

            {mergeableCount >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenMergeDialog}
                className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                <Merge className="w-3.5 h-3.5 mr-1" />
                Mesclar ({mergeableCount})
              </Button>
            )}
          </div>

          {/* Tag List */}
          <div className="space-y-2 mt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : sortedTags.length === 0 && !isCreating ? (
              <div className="text-center py-8">
                <Hash className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">Nenhuma tag criada.</p>
              </div>
            ) : (
              sortedTags.map((tag) => (
                <div key={tag.id}>
                  {editingId === tag.id ? (
                    // Edit mode
                    <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8 bg-white/[0.02] border-white/10 text-white text-sm"
                        placeholder="Nome da tag"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                      />
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
                        <Checkbox
                          checked={selectedForMerge.has(tag.id)}
                          onCheckedChange={() => toggleMergeSelection(tag.id)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Hash className="w-3.5 h-3.5 text-white/30 shrink-0" />
                        <span className="text-sm text-white/90 truncate">{tag.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-white/10 text-white/40 shrink-0"
                        >
                          {tag.itemCount || 0}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/5"
                          onClick={() => handleStartEdit(tag)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRequestDelete(tag)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* New Tag Form */}
            {isCreating ? (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Hash className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-8 bg-white/[0.02] border-white/10 text-white text-sm"
                  placeholder="Nome da nova tag"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate()
                    if (e.key === "Escape") {
                      setIsCreating(false)
                      setNewName("")
                    }
                  }}
                />
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
                Nova Tag
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
              <DialogTitle>Excluir tag "{deleteConfirm?.name}"?</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              {deleteConfirm && deleteConfirm.itemCount > 0
                ? `Esta tag sera removida de ${deleteConfirm.itemCount} ${deleteConfirm.itemCount === 1 ? "conteudo" : "conteudos"}. Os conteudos nao serao excluidos.`
                : "Esta tag sera excluida permanentemente."}
            </DialogDescription>
          </DialogHeader>

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
              Excluir Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5 text-primary" />
              Mesclar Tags
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Escolha qual nome manter. Todos os conteudos das tags selecionadas serao
              associados a tag sobrevivente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            {tags
              .filter((t) => selectedForMerge.has(t.id))
              .map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSurvivorId(tag.id)}
                  className={`w-full p-3 text-left text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                    survivorId === tag.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  {tag.name}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 border-white/10 text-white/40 ml-auto"
                  >
                    {tag.itemCount || 0}
                  </Badge>
                  {survivorId === tag.id && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      manter
                    </span>
                  )}
                </button>
              ))}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setMergeDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmMerge}
              disabled={isMerging || !survivorId}
              className="bg-primary text-black hover:bg-primary/90"
            >
              {isMerging ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Merge className="w-4 h-4 mr-2" />
              )}
              Mesclar Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
