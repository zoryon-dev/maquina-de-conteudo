/**
 * Library Page Component
 *
 * Client Component principal que orquestra todos os hooks e
 * componentes da Biblioteca de Conteúdos.
 */

"use client"

import { useState } from "react"
import { Library, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLibraryData } from "../hooks/use-library-data"
import { useLibraryFilters } from "../hooks/use-library-filters"
import { useLibraryView } from "../hooks/use-library-view"
import { LibraryHeader } from "./library-header"
import { LibraryFilterBar } from "./library-filter-bar"
import { LibraryGrid } from "./library-grid"
import { LibraryList } from "./library-list"
import { EmptyLibraryState } from "./empty-library-state"
import { ContentDialog } from "./content-dialog"
import {
  deleteLibraryItemAction,
  batchDeleteAction,
  batchUpdateStatusAction,
} from "../actions/library-actions"
import type { LibraryItemWithRelations } from "@/types/library"
import type { ContentStatus } from "@/db/schema"

export function LibraryPage() {
  // View mode (grid/list + sorting)
  const { viewMode, toggleViewMode, setSortBy, toggleSortOrder } = useLibraryView()

  // Filters
  const {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount,
    setSearch,
    toggleType,
    toggleStatus,
    toggleCategory,
    toggleTag,
  } = useLibraryFilters()

  // Data fetching
  const { items, isLoading, error, refetch } = useLibraryData(filters, viewMode)

  // Selection state (for batch actions)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LibraryItemWithRelations | null>(null)

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setIsAllSelected(false)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
      setIsAllSelected(false)
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
      setIsAllSelected(true)
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsAllSelected(false)
  }

  // Handlers
  const handleSearch = (query: string) => {
    setSearch(query)
  }

  const handleEdit = (item: LibraryItemWithRelations) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    setItemToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    const result = await deleteLibraryItemAction(itemToDelete)

    if (result.success) {
      toast.success("Conteúdo excluído com sucesso")
      refetch()
    } else {
      toast.error(result.error ?? "Erro ao excluir conteúdo")
    }

    setDeleteConfirmOpen(false)
    setItemToDelete(null)
  }

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const result = await batchDeleteAction(ids)

    if (result.success) {
      toast.success(`${ids.length} ${ids.length === 1 ? "conteúdo excluído" : "conteúdos excluídos"} com sucesso`)
      clearSelection()
      refetch()
    } else {
      toast.error(result.error ?? "Erro ao excluir conteúdos")
    }
  }

  const handleBatchStatus = async (status: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const result = await batchUpdateStatusAction(ids, status as ContentStatus)

    if (result.success) {
      const statusLabels: Record<ContentStatus, string> = {
        draft: "rascunho",
        scheduled: "agendado",
        published: "publicado",
        archived: "arquivado",
      }
      toast.success(
        `${ids.length} ${ids.length === 1 ? "conteúdo movido para" : "conteúdos movidos para"} ${statusLabels[status as ContentStatus]}`
      )
      clearSelection()
      refetch()
    } else {
      toast.error(result.error ?? "Erro ao atualizar status")
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingItem(null)
  }

  const handleDialogSave = () => {
    setDialogOpen(false)
    setEditingItem(null)
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <LibraryHeader
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
        onSortBy={setSortBy}
        onToggleSortOrder={toggleSortOrder}
        searchQuery={filters.search ?? ""}
        onSearchChange={handleSearch}
        selectedCount={selectedIds.size}
        onCreateNew={handleCreate}
        onBatchDelete={selectedIds.size > 0 ? handleBatchDelete : undefined}
        onBatchStatus={selectedIds.size > 0 ? handleBatchStatus : undefined}
        onClearSelection={selectedIds.size > 0 ? clearSelection : undefined}
      />

      {/* Filter Bar */}
      <LibraryFilterBar
        filters={filters}
        onUpdateFilters={updateFilters}
        onClearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        onToggleType={toggleType}
        onToggleStatus={toggleStatus}
        onToggleCategory={toggleCategory}
        onToggleTag={toggleTag}
      />

      {/* Content Area */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyLibraryState
          hasActiveFilters={activeFilterCount > 0 || !!filters.search}
          onClearFilters={clearFilters}
          onCreateNew={handleCreate}
        />
      ) : viewMode.mode === "grid" ? (
        <LibraryGrid
          items={items}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          onSelectItem={toggleSelection}
          onSelectAll={toggleSelectAll}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <LibraryList
          items={items}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          onSelectItem={toggleSelection}
          onSelectAll={toggleSelectAll}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sortBy={viewMode.sortBy}
          sortOrder={viewMode.sortOrder}
          onSortBy={setSortBy}
        />
      )}

      {/* Content Dialog */}
      <ContentDialog
        open={dialogOpen}
        item={editingItem}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle>Excluir conteúdo?</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              Esta ação não pode ser desfeita. O conteúdo será movido para a lixeira.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Loading state skeleton
 */
function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3"
        >
          <div className="aspect-video bg-white/5 rounded-md animate-pulse" />
          <div className="h-4 bg-white/5 rounded animate-pulse" />
          <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/**
 * Error state with retry button
 */
interface ErrorStateProps {
  error: string
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
        <Library className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        Erro ao carregar biblioteca
      </h3>
      <p className="text-sm text-white/60 mb-4 max-w-md">{error}</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        Tentar novamente
      </Button>
    </div>
  )
}
