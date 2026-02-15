/**
 * Library Grid Component
 *
 * Visualização em grid da biblioteca com cards de conteúdo.
 */

"use client"

import { Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { LibraryItemWithRelations } from "@/types/library"
import { ContentCard } from "./content-card"

interface LibraryGridProps {
  items: LibraryItemWithRelations[]
  selectedIds: Set<number>
  isAllSelected: boolean
  onSelectItem: (id: number) => void
  onSelectAll: () => void
  onEdit: (item: LibraryItemWithRelations) => void
  onDelete: (id: number) => void
  searchMode?: "exact" | "semantic"
  similarities?: Map<number, number>
}

export function LibraryGrid({
  items,
  selectedIds,
  isAllSelected,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
  searchMode = "exact",
  similarities,
}: LibraryGridProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Select All Checkbox */}
      <div className="flex items-center gap-2 px-1">
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
        <span className="text-sm text-white/60">
          {isAllSelected || selectedIds.size === items.length
            ? "Todos selecionados"
            : selectedIds.size > 0
              ? `${selectedIds.size} selecionados`
              : "Selecionar todos"}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => {
          const similarity = similarities?.get(item.id)
          return (
            <div key={item.id} className="relative">
              <ContentCard
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={() => onSelectItem(item.id)}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
              />
              {searchMode === "semantic" && similarity !== undefined && (
                <Badge className="absolute top-2 right-2 bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-1.5 py-0.5 z-10">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  {Math.round(similarity * 100)}%
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
