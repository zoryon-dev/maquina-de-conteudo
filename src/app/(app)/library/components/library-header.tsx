/**
 * Library Header Component
 *
 * Header da Biblioteca com busca, toggle de visualização,
 * ordenação e ações batch.
 */

"use client"

import { Plus, Grid3x3, List, ArrowUpDown, Trash2, CheckCircle2, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/types/library"

interface LibraryHeaderProps {
  viewMode: ViewMode
  onToggleViewMode: () => void
  onSortBy: (sortBy: ViewMode["sortBy"]) => void
  onToggleSortOrder: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCount: number
  onCreateNew: () => void
  onBatchDelete?: () => void
  onBatchStatus?: (status: string) => void
  onClearSelection?: () => void
  activeTab: "library" | "trash"
  trashCount: number
  onTabChange: (tab: "library" | "trash") => void
}

const SORT_OPTIONS: Array<{ value: ViewMode["sortBy"]; label: string }> = [
  { value: "createdAt", label: "Data de criação" },
  { value: "updatedAt", label: "Data de edição" },
  { value: "scheduledFor", label: "Agendamento" },
  { value: "title", label: "Título" },
]

export function LibraryHeader({
  viewMode,
  onToggleViewMode,
  onSortBy,
  onToggleSortOrder,
  searchQuery,
  onSearchChange,
  selectedCount,
  onCreateNew,
  onBatchDelete,
  onBatchStatus,
  onClearSelection,
  activeTab,
  trashCount,
  onTabChange,
}: LibraryHeaderProps) {
  const hasSelection = selectedCount > 0
  const isTrashView = activeTab === "trash"

  return (
    <div className="space-y-4">
      {/* Top Row: Title, Tab Toggle, Search, Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">Biblioteca</h1>

          {/* Tab Toggle: Biblioteca | Lixeira */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-1">
            <button
              onClick={() => onTabChange("library")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === "library"
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Library className="w-3.5 h-3.5" />
              Biblioteca
            </button>
            <button
              onClick={() => onTabChange("trash")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === "trash"
                  ? "bg-red-500/80 text-white shadow-lg shadow-red-500/20"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Lixeira
              {trashCount > 0 && (
                <Badge
                  className={cn(
                    "text-xs px-1.5 py-0 min-w-[1.25rem] h-5 flex items-center justify-center",
                    activeTab === "trash"
                      ? "bg-white/20 text-white border-0"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                >
                  {trashCount}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Search and Create - only show in library mode */}
        {!isTrashView && (
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Input
                type="search"
                placeholder="Buscar conteudo..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 h-9 bg-white/[0.02] border-white/10 text-white placeholder:text-white/40 focus:border-primary/50"
              />
            </div>

            {/* Create Button */}
            <Button
              onClick={onCreateNew}
              className="bg-primary text-black hover:bg-primary/90 h-9"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Row: View Toggle, Sort, or Batch Actions - only show in library mode */}
      {!isTrashView && (
        <>
          {hasSelection ? (
            // Batch Actions Bar
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary font-medium">
                  {selectedCount} {selectedCount === 1 ? "selecionado" : "selecionados"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchStatus?.("published")}
                  className="h-8 text-white/70 hover:text-white hover:bg-white/5"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Publicar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchStatus?.("draft")}
                  className="h-8 text-white/70 hover:text-white hover:bg-white/5"
                >
                  Rascunho
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBatchDelete}
                  className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-8 text-white/60 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            // View and Sort Controls
            <div className="flex items-center justify-between">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-1">
                <ViewToggleButton
                  active={viewMode.mode === "grid"}
                  onClick={() => viewMode.mode !== "grid" && onToggleViewMode()}
                  icon={Grid3x3}
                  label="Grid"
                />
                <ViewToggleButton
                  active={viewMode.mode === "list"}
                  onClick={() => viewMode.mode !== "list" && onToggleViewMode()}
                  icon={List}
                  label="Lista"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <SortButton
                  sortBy={viewMode.sortBy}
                  sortOrder={viewMode.sortOrder}
                  onSortBy={onSortBy}
                  onToggleSortOrder={onToggleSortOrder}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * View toggle button
 */
interface ViewToggleButtonProps {
  active: boolean
  onClick: () => void
  icon: typeof Grid3x3
  label: string
}

function ViewToggleButton({ active, onClick, icon: Icon, label }: ViewToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
        active
          ? "bg-primary text-black shadow-lg shadow-primary/20"
          : "text-white/60 hover:text-white"
      )}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

/**
 * Sort button with dropdown
 */
interface SortButtonProps {
  sortBy: ViewMode["sortBy"]
  sortOrder: "asc" | "desc"
  onSortBy: (sortBy: ViewMode["sortBy"]) => void
  onToggleSortOrder: () => void
}

function SortButton({ sortBy, sortOrder, onSortBy, onToggleSortOrder }: SortButtonProps) {
  const currentLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? "Ordenar"

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSortOrder}
        className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/5"
        title={`Ordem: ${sortOrder === "asc" ? "Crescente" : "Decrescente"}`}
      >
        <ArrowUpDown
          className={cn(
            "w-4 h-4 transition-transform",
            sortOrder === "desc" && "rotate-180"
          )}
        />
      </Button>

      <select
        value={sortBy}
        onChange={(e) => onSortBy(e.target.value as ViewMode["sortBy"])}
        className="h-8 px-3 bg-white/[0.02] border border-white/10 rounded-md text-sm text-white/70 hover:text-white hover:border-white/20 focus:outline-none focus:border-primary/50 cursor-pointer appearance-none pr-8"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
