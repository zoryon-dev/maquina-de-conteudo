/**
 * Library List Component
 *
 * Visualização em lista/tabela da biblioteca com linhas de conteúdo.
 */

"use client"

import { Check, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LibraryItemWithRelations, ViewMode } from "@/types/library"
import { ContentRow } from "./content-row"

interface LibraryListProps {
  items: LibraryItemWithRelations[]
  selectedIds: Set<number>
  isAllSelected: boolean
  onSelectItem: (id: number) => void
  onSelectAll: () => void
  onEdit: (item: LibraryItemWithRelations) => void
  onDelete: (id: number) => void
  sortBy: ViewMode["sortBy"]
  sortOrder: "asc" | "desc"
  onSortBy: (sortBy: ViewMode["sortBy"]) => void
}

const COLUMNS = [
  { key: "title" as const, label: "Título", sortable: true },
  { key: "type" as const, label: "Tipo", sortable: false },
  { key: "status" as const, label: "Status", sortable: false },
  { key: "category" as const, label: "Categoria", sortable: false },
  { key: "tags" as const, label: "Tags", sortable: false },
  { key: "createdAt" as const, label: "Criado em", sortable: true },
  { key: "actions" as const, label: "", sortable: false },
]

export function LibraryList({
  items,
  selectedIds,
  isAllSelected,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSortBy,
}: LibraryListProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-white/[0.02] border-b border-white/10">
            <tr>
              {/* Checkbox column */}
              <th className="w-10 px-4 py-3">
                <button
                  onClick={onSelectAll}
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-all",
                    isAllSelected || selectedIds.size > 0
                      ? "bg-primary border-primary text-black"
                      : "border-white/20 hover:border-white/40"
                  )}
                >
                  {(isAllSelected || selectedIds.size === items.length) && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              </th>

              {/* Column headers */}
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:text-white/80"
                  )}
                  onClick={() =>
                    column.sortable && onSortBy(column.key as ViewMode["sortBy"])
                  }
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <span className="text-primary">
                        {sortOrder === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-white/10">
            {items.map((item) => (
              <ContentRow
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={() => onSelectItem(item.id)}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {selectedIds.size > 0
            ? `${selectedIds.size} de ${items.length} selecionados`
            : `${items.length} itens`}
        </span>
      </div>
    </div>
  )
}
