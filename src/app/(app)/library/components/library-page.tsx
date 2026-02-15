/**
 * Library Page Component
 *
 * Client Component principal que orquestra todos os hooks e
 * componentes da Biblioteca de Conteúdos.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Library, AlertTriangle, Trash2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropZone } from "@/components/ui/drop-zone"
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
import { TrashView } from "./trash-view"
import { LibraryAnalytics } from "./analytics/library-analytics"
import { CategoryManager } from "./category-manager"
import { TagManager } from "./tag-manager"
import { Pagination } from "@/components/ui/pagination"
import { getTrashCountAction, searchLibrarySemanticAction } from "../actions/library-actions"
import type { LibraryItemWithRelations } from "@/types/library"
import type { ContentStatus } from "@/db/schema"

/** Search mode: exact (ILIKE) or semantic (embedding) */
type SearchMode = "exact" | "semantic"

export function LibraryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // View mode: library, trash, or analytics
  const [activeTab, setActiveTab] = useState<"library" | "trash" | "analytics">("library")
  const [trashCount, setTrashCount] = useState(0)

  // Category/Tag manager dialog state
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

  // Semantic search state
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false)
  const [semanticResults, setSemanticResults] = useState<LibraryItemWithRelations[]>([])
  const [semanticSimilarities, setSemanticSimilarities] = useState<Map<number, number>>(new Map())
  const [isSemanticLoading, setIsSemanticLoading] = useState(false)
  const [semanticError, setSemanticError] = useState<string | null>(null)
  const semanticDebounceRef = useRef<NodeJS.Timeout | null>(null)

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
    toggleDatePreset,
    clearDateFilter,
  } = useLibraryFilters()

  // Data fetching with pagination (for exact search mode)
  const {
    items: exactItems,
    isLoading: isExactLoading,
    error: exactError,
    refetch,
    total,
    page,
    limit,
    totalPages,
    setPage,
    setLimit,
  } = useLibraryData({ filters, viewMode })

  // Determine which items/loading/error to use based on search mode
  const isUsingSemanticSearch = semanticSearchEnabled && !!filters.search?.trim()
  const items = isUsingSemanticSearch ? semanticResults : exactItems
  const isLoading = isUsingSemanticSearch ? isSemanticLoading : isExactLoading
  const error = isUsingSemanticSearch ? semanticError : exactError
  const searchMode: SearchMode = isUsingSemanticSearch ? "semantic" : "exact"

  // Selection state (for batch actions)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LibraryItemWithRelations | null>(null)

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  // Fetch trash count on mount and when switching tabs
  const fetchTrashCount = useCallback(async () => {
    try {
      const count = await getTrashCountAction()
      setTrashCount(count)
    } catch {
      // Silently fail - count is not critical
    }
  }, [])

  useEffect(() => {
    void fetchTrashCount()
  }, [fetchTrashCount])

  // Semantic search effect with debounce
  useEffect(() => {
    if (!semanticSearchEnabled || !filters.search?.trim()) {
      // Clear semantic results when not in use
      setSemanticResults([])
      setSemanticSimilarities(new Map())
      setSemanticError(null)
      return
    }

    // Debounce 500ms
    if (semanticDebounceRef.current) {
      clearTimeout(semanticDebounceRef.current)
    }

    setIsSemanticLoading(true)
    semanticDebounceRef.current = setTimeout(async () => {
      try {
        setSemanticError(null)
        const result = await searchLibrarySemanticAction(filters.search!.trim(), 20)

        if (result.success) {
          setSemanticResults(result.results.map((r) => r.item))
          const simMap = new Map<number, number>()
          for (const r of result.results) {
            simMap.set(r.item.id, r.similarity)
          }
          setSemanticSimilarities(simMap)
        } else {
          setSemanticError(result.error || "Erro na busca semantica")
          setSemanticResults([])
          setSemanticSimilarities(new Map())
        }
      } catch (err) {
        setSemanticError(
          err instanceof Error ? err.message : "Erro na busca semantica"
        )
        setSemanticResults([])
        setSemanticSimilarities(new Map())
      } finally {
        setIsSemanticLoading(false)
      }
    }, 500)

    return () => {
      if (semanticDebounceRef.current) {
        clearTimeout(semanticDebounceRef.current)
      }
    }
  }, [semanticSearchEnabled, filters.search])

  // When switching back from trash to library, refresh both counts
  const handleTabChange = (tab: "library" | "trash" | "analytics") => {
    setActiveTab(tab)
    if (tab === "library") {
      refetch()
      fetchTrashCount()
    }
  }

  // Callback from TrashView to update trash count
  const handleTrashCountChange = useCallback((count: number) => {
    setTrashCount(count)
  }, [])

  // Handle ?edit=ID parameter to open edit dialog
  useEffect(() => {
    const editId = searchParams.get("edit")
    if (editId && !isLoading && items.length > 0) {
      const id = parseInt(editId)
      if (!isNaN(id)) {
        const itemToEdit = items.find((item) => item.id === id)
        if (itemToEdit && !dialogOpen) {
          setEditingItem(itemToEdit)
          setDialogOpen(true)
        }
      }
    }
  }, [searchParams, items, isLoading, dialogOpen])

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

  const handleToggleSemanticSearch = () => {
    setSemanticSearchEnabled((prev) => !prev)
    // Clear semantic results when toggling off
    if (semanticSearchEnabled) {
      setSemanticResults([])
      setSemanticSimilarities(new Map())
      setSemanticError(null)
    }
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

    const response = await fetch(`/api/library/${itemToDelete}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      toast.success("Conteudo movido para a lixeira")
      refetch()
      fetchTrashCount()
    } else {
      toast.error(result.error ?? "Erro ao excluir conteudo")
    }

    setDeleteConfirmOpen(false)
    setItemToDelete(null)
  }

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const response = await fetch("/api/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })

    const result = await response.json()

    if (result.success) {
      toast.success(`${ids.length} ${ids.length === 1 ? "conteudo movido" : "conteudos movidos"} para a lixeira`)
      clearSelection()
      refetch()
      fetchTrashCount()
    } else {
      toast.error(result.error ?? "Erro ao excluir conteudos")
    }
  }

  const handleBatchStatus = async (status: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const response = await fetch("/api/library/batch-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: status as ContentStatus }),
    })

    const result = await response.json()

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
    // Limpar o parâmetro ?edit= da URL
    if (searchParams.get("edit")) {
      router.push("/library")
    }
  }

  const handleDialogSave = () => {
    setDialogOpen(false)
    setEditingItem(null)
    refetch()
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when changing items per page
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Drag & drop upload handler
  const handleFilesDropped = useCallback(
    async (files: File[]) => {
      if (activeTab !== "library") return

      const toastId = toast.loading(
        `Enviando ${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}...`
      )

      try {
        const formData = new FormData()
        for (const file of files) {
          formData.append("files", file)
        }

        const response = await fetch("/api/library/upload", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          const { successCount, errorCount } = result
          if (errorCount > 0) {
            toast.warning(
              `${successCount} ${successCount === 1 ? "imagem enviada" : "imagens enviadas"}, ${errorCount} com erro`,
              { id: toastId }
            )
          } else {
            toast.success(
              `${successCount} ${successCount === 1 ? "imagem adicionada" : "imagens adicionadas"} a biblioteca`,
              { id: toastId }
            )
          }
          refetch()
        } else {
          toast.error(result.error || "Erro ao enviar arquivos", { id: toastId })
        }
      } catch {
        toast.error("Erro ao enviar arquivos", { id: toastId })
      }
    },
    [activeTab, refetch]
  )

  return (
    <DropZone
      onFilesDropped={handleFilesDropped}
      accept={["image/png", "image/jpeg", "image/webp", "image/gif"]}
      maxFiles={10}
      maxSizeBytes={5 * 1024 * 1024}
      disabled={activeTab !== "library"}
    >
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
        selectedIds={Array.from(selectedIds)}
        onCreateNew={handleCreate}
        onBatchDelete={selectedIds.size > 0 ? handleBatchDelete : undefined}
        onBatchStatus={selectedIds.size > 0 ? handleBatchStatus : undefined}
        onClearSelection={selectedIds.size > 0 ? clearSelection : undefined}
        activeTab={activeTab}
        trashCount={trashCount}
        onTabChange={handleTabChange}
        onImportComplete={refetch}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        onOpenTagManager={() => setTagManagerOpen(true)}
        semanticSearchEnabled={semanticSearchEnabled}
        onToggleSemanticSearch={handleToggleSemanticSearch}
      />

      {/* Semantic search indicator */}
      {isUsingSemanticSearch && !isLoading && items.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Busca Semantica
          </Badge>
          <span className="text-xs text-white/40">
            {items.length} {items.length === 1 ? "resultado" : "resultados"} por relevancia
          </span>
        </div>
      )}

      {/* Show filter bar only in library mode (hide during semantic search) */}
      {activeTab === "library" && !isUsingSemanticSearch && (
        <LibraryFilterBar
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          onToggleType={toggleType}
          onToggleStatus={toggleStatus}
          onToggleCategory={toggleCategory}
          onToggleTag={toggleTag}
          onToggleDatePreset={toggleDatePreset}
          onClearDateFilter={clearDateFilter}
        />
      )}

      {/* Content Area */}
      {activeTab === "analytics" ? (
        <LibraryAnalytics />
      ) : activeTab === "trash" ? (
        <TrashView onTrashCountChange={handleTrashCountChange} />
      ) : isLoading ? (
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
          searchMode={searchMode}
          similarities={semanticSimilarities}
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
          searchMode={searchMode}
          similarities={semanticSimilarities}
        />
      )}

      {/* Pagination - show when there are items (library mode only, not during semantic search) */}
      {activeTab === "library" && !isUsingSemanticSearch && !isLoading && !error && items.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          isLoading={isLoading}
        />
      )}

      {/* Content Dialog */}
      <ContentDialog
        open={dialogOpen}
        item={editingItem}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
      />

      {/* Category Manager Dialog */}
      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onUpdate={refetch}
      />

      {/* Tag Manager Dialog */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        onUpdate={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle>Mover para lixeira?</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              O conteudo sera movido para a lixeira e mantido por 30 dias antes
              da exclusao permanente. Voce pode restaura-lo a qualquer momento.
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
              <Trash2 className="w-4 h-4 mr-2" />
              Mover para Lixeira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DropZone>
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
