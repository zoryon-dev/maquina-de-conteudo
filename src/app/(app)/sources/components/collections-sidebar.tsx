/**
 * Collections Sidebar
 *
 * Sidebar para navegação e gerenciamento de coleções/pastas de documentos.
 */

"use client"

import * as React from "react"
import {
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  FolderPlus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  getRootCollectionsAction,
  getChildCollectionsAction,
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
  type DocumentCollectionWithCount,
} from "../actions/collections-actions"

// Available colors for collections
const COLLECTION_COLORS = [
  { value: null, label: "Padrão", class: "text-white/70" },
  { value: "#a3e635", label: "Lime", class: "text-primary" },
  { value: "#60a5fa", label: "Blue", class: "text-blue-400" },
  { value: "#f472b6", label: "Pink", class: "text-pink-400" },
  { value: "#a78bfa", label: "Purple", class: "text-purple-400" },
  { value: "#34d399", label: "Green", class: "text-green-400" },
  { value: "#fbbf24", label: "Yellow", class: "text-yellow-400" },
  { value: "#f87171", label: "Red", class: "text-red-400" },
]

export interface CollectionsSidebarProps {
  selectedCollectionId: number | null
  onSelectCollection: (collectionId: number | null) => void
  onRefresh?: () => void
}

/**
 * Extended collection with expanded state
 */
interface CollectionWithExpanded extends DocumentCollectionWithCount {
  expanded?: boolean
  children?: CollectionWithExpanded[]
}

export function CollectionsSidebar({
  selectedCollectionId,
  onSelectCollection,
  onRefresh,
}: CollectionsSidebarProps) {
  const [collections, setCollections] = React.useState<CollectionWithExpanded[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingCollection, setEditingCollection] = React.useState<DocumentCollectionWithCount | null>(null)
  const [newCollectionName, setNewCollectionName] = React.useState("")
  const [editName, setEditName] = React.useState("")
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null)

  // Fetch collections
  const fetchCollections = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRootCollectionsAction()
      setCollections(data)
    } catch (error) {
      console.error("Failed to fetch collections:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch child collections when expanding
  const fetchChildCollections = React.useCallback(async (parentId: number) => {
    try {
      const children = await getChildCollectionsAction(parentId)
      setCollections((prev) => {
        const updateChildren = (
          items: CollectionWithExpanded[]
        ): CollectionWithExpanded[] => {
          return items.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                expanded: true,
                children: children.map((child) => ({
                  ...child,
                  expanded: false,
                })),
              }
            }
            if (item.children) {
              return {
                ...item,
                children: updateChildren(item.children),
              }
            }
            return item
          })
        }
        return updateChildren(prev)
      })
    } catch (error) {
      console.error("Failed to fetch child collections:", error)
    }
  }, [])

  // Toggle collection expansion
  const toggleExpand = (collectionId: number) => {
    const collection = findCollection(collectionId, collections)
    if (collection?.children && collection.children.length > 0) {
      // Toggle collapse if has children
      setCollections((prev) => {
        const updateExpanded = (items: CollectionWithExpanded[]): CollectionWithExpanded[] => {
          return items.map((item) => {
            if (item.id === collectionId) {
              return { ...item, expanded: !item.expanded }
            }
            if (item.children) {
              return { ...item, children: updateExpanded(item.children) }
            }
            return item
          })
        }
        return updateExpanded(prev)
      })
    } else {
      // Fetch children if not loaded
      fetchChildCollections(collectionId)
    }
  }

  // Find collection by ID
  const findCollection = (
    id: number,
    items: CollectionWithExpanded[]
  ): CollectionWithExpanded | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findCollection(id, item.children)
        if (found) return found
      }
    }
    return null
  }

  // Create new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error("Nome da coleção é obrigatório")
      return
    }

    setIsCreating(true)
    try {
      const result = await createCollectionAction({
        name: newCollectionName.trim(),
        color: selectedColor,
        icon: "folder",
      })

      if (result.success) {
        toast.success("Coleção criada com sucesso!")
        setNewCollectionName("")
        setSelectedColor(null)
        setIsCreating(false)
        fetchCollections()
        onRefresh?.()
      } else {
        toast.error(result.error || "Falha ao criar coleção")
      }
    } catch (error) {
      console.error("Create collection error:", error)
      toast.error("Falha ao criar coleção")
    } finally {
      setIsCreating(false)
    }
  }

  // Edit collection
  const handleEditCollection = async () => {
    if (!editingCollection || !editName.trim()) {
      toast.error("Nome da coleção é obrigatório")
      return
    }

    setIsEditing(true)
    try {
      const result = await updateCollectionAction(editingCollection.id, {
        name: editName.trim(),
        color: selectedColor,
      })

      if (result.success) {
        toast.success("Coleção atualizada com sucesso!")
        setEditingCollection(null)
        setEditName("")
        setSelectedColor(null)
        fetchCollections()
        onRefresh?.()
      } else {
        toast.error(result.error || "Falha ao atualizar coleção")
      }
    } catch (error) {
      console.error("Update collection error:", error)
      toast.error("Falha ao atualizar coleção")
    } finally {
      setIsEditing(false)
    }
  }

  // Delete collection
  const handleDeleteCollection = async (collection: DocumentCollectionWithCount) => {
    if (!confirm(`Deseja realmente excluir a coleção "${collection.name}"?`)) {
      return
    }

    try {
      const result = await deleteCollectionAction(collection.id)
      if (result.success) {
        toast.success("Coleção excluída com sucesso!")
        if (selectedCollectionId === collection.id) {
          onSelectCollection(null)
        }
        fetchCollections()
        onRefresh?.()
      } else {
        toast.error(result.error || "Falha ao excluir coleção")
      }
    } catch (error) {
      console.error("Delete collection error:", error)
      toast.error("Falha ao excluir coleção")
    }
  }

  // Start editing
  const startEdit = (collection: DocumentCollectionWithCount) => {
    setEditingCollection(collection)
    setEditName(collection.name)
    setSelectedColor(collection.color)
  }

  // Initial fetch
  React.useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  // Render collection item
  const renderCollection = (
    collection: CollectionWithExpanded,
    level: number = 0
  ) => {
    const isSelected = selectedCollectionId === collection.id
    const hasChildren = collection.itemCount > 0 || (collection.children && collection.children.length > 0)
    const IconComponent = isSelected ? FolderOpen : Folder

    return (
      <div key={collection.id}>
        <div
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group",
            isSelected
              ? "bg-primary/20 text-primary"
              : "text-white/70 hover:bg-white/5 hover:text-white/90",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${level * 8 + 8}px` }}
        >
          {/* Expand/Collapse button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand(collection.id)
            }}
            className="p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            {hasChildren ? (
              collection.expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : (
              <div className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Folder icon with color */}
          <div
            className="p-0.5 rounded"
            style={{ color: collection.color || undefined }}
          >
            <IconComponent className="h-4 w-4" />
          </div>

          {/* Collection name */}
          <span
            className="flex-1 text-sm truncate"
            onClick={() => onSelectCollection(collection.id)}
          >
            {collection.name}
          </span>

          {/* Item count */}
          <span className="text-xs text-white/40">
            {collection.itemCount}
          </span>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  startEdit(collection)
                }}
                className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteCollection(collection)
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Render children if expanded */}
        {collection.expanded && collection.children && (
          <div>
            {collection.children.map((child) => renderCollection(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Coleções
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-6 px-2 text-white/60 hover:text-white hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* All Documents option */}
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 mx-1 mt-2 rounded-lg cursor-pointer transition-colors",
          selectedCollectionId === null
            ? "bg-primary/20 text-primary"
            : "text-white/70 hover:bg-white/5 hover:text-white/90"
        )}
        onClick={() => onSelectCollection(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1 text-sm">Todos os Documentos</span>
      </div>

      {/* Collections list */}
      <div className="flex-1 overflow-y-auto px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-xs text-white/40">Carregando...</div>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FolderPlus className="h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/40">
              Nenhuma coleção ainda
            </p>
            <p className="text-xs text-white/30 mt-1">
              Clique no + para criar
            </p>
          </div>
        ) : (
          <div className="py-2">
            {collections.map((collection) => renderCollection(collection))}
          </div>
        )}
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Nova Coleção
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Crie uma pasta para organizar seus documentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Collection name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">
                Nome da coleção
              </label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Ex: Produtos, Marketing, etc."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCollection()
                  }
                }}
              />
            </div>

            {/* Color selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color.value || "default"}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === color.value
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105",
                      color.value
                        ? undefined
                        : "bg-white/10"
                    )}
                    style={color.value ? { backgroundColor: color.value } : undefined}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsCreating(false)
                setNewCollectionName("")
                setSelectedColor(null)
              }}
              className="text-white/60 hover:text-white hover:bg-white/5"
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || isCreating}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              {isCreating ? "Criando..." : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => {
        if (!open) {
          setEditingCollection(null)
          setEditName("")
          setSelectedColor(null)
        }
      }}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar Coleção
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Altere o nome e cor da coleção
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Collection name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">
                Nome da coleção
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Produtos, Marketing, etc."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditCollection()
                  }
                }}
              />
            </div>

            {/* Color selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color.value || "default"}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === color.value
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105",
                      color.value
                        ? undefined
                        : "bg-white/10"
                    )}
                    style={color.value ? { backgroundColor: color.value } : undefined}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditingCollection(null)
                setEditName("")
                setSelectedColor(null)
              }}
              className="text-white/60 hover:text-white hover:bg-white/5"
              disabled={isEditing}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleEditCollection}
              disabled={!editName.trim() || isEditing}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              {isEditing ? (
                "Salvando..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
