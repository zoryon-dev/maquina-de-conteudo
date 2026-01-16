/**
 * Library Filter Bar Component
 *
 * Barra de filtros expansível para tipos, status, categorias e tags.
 * Baseada no padrão do calendário com adaptações para a biblioteca.
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Filter, X, Hash, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LibraryFilters } from "@/types/library"
import type { PostType, ContentStatus } from "@/db/schema"
import { CONTENT_TYPE_CONFIGS } from "@/types/calendar"

// Extend STATUS_CONFIGS from calendar with proper types
const STATUS_CONFIGS: Record<ContentStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-300" },
  scheduled: { label: "Agendado", color: "bg-blue-500/20 text-blue-300" },
  published: { label: "Publicado", color: "bg-green-500/20 text-green-300" },
  archived: { label: "Arquivado", color: "bg-orange-500/20 text-orange-300" },
}

interface LibraryFilterBarProps {
  filters: LibraryFilters
  onUpdateFilters: (filters: LibraryFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
  onToggleType: (type: PostType) => void
  onToggleStatus: (status: ContentStatus) => void
  onToggleCategory: (categoryId: number) => void
  onToggleTag: (tagId: number) => void
  // TODO: Add categories and tags when available
  categories?: Array<{ id: number; name: string; color?: string | null }>
  tags?: Array<{ id: number; name: string; color?: string | null }>
}

export function LibraryFilterBar({
  filters,
  onUpdateFilters,
  onClearFilters,
  activeFilterCount,
  onToggleType,
  onToggleStatus,
  onToggleCategory,
  onToggleTag,
  categories = [],
  tags = [],
}: LibraryFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/90">Filtros</span>

          {activeFilterCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-xs bg-primary/20 text-primary border-0"
            >
              {activeFilterCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/5"
            >
              Limpar
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Active Filters Pills (always visible when filters are active) */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {filters.types?.map((type) => (
            <FilterPill
              key={type}
              label={CONTENT_TYPE_CONFIGS[type]?.label || type}
              onRemove={() => onToggleType(type)}
            />
          ))}
          {filters.statuses?.map((status) => (
            <FilterPill
              key={status}
              label={STATUS_CONFIGS[status].label}
              onRemove={() => onToggleStatus(status)}
            />
          ))}
          {filters.categories?.map((categoryId) => {
            const category = categories.find((c) => c.id === categoryId)
            return category ? (
              <FilterPill
                key={categoryId}
                label={category.name}
                onRemove={() => onToggleCategory(categoryId)}
              />
            ) : null
          })}
          {filters.tags?.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId)
            return tag ? (
              <FilterPill
                key={tagId}
                label={tag.name}
                onRemove={() => onToggleTag(tagId)}
              />
            ) : null
          })}
          {filters.search && (
            <FilterPill
              label={`Busca: "${filters.search}"`}
              onRemove={() => onUpdateFilters({ ...filters, search: undefined })}
            />
          )}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Content Type Filter */}
          <FilterSection
            title="Tipo de Conteúdo"
            icon={<Hash className="w-3 h-3" />}
            items={Object.entries(CONTENT_TYPE_CONFIGS).map(([key, config]) => ({
              value: key,
              label: config.label,
              icon: config.icon,
              color: config.color,
            }))}
            selected={filters.types || []}
            onToggle={(value) => onToggleType(value as PostType)}
          />

          {/* Status Filter */}
          <FilterSection
            title="Status"
            icon={<Hash className="w-3 h-3" />}
            items={Object.entries(STATUS_CONFIGS).map(([key, config]) => ({
              value: key,
              label: config.label,
              color: config.color,
            }))}
            selected={filters.statuses || []}
            onToggle={(value) => onToggleStatus(value as ContentStatus)}
          />

          {/* Category Filter */}
          {categories.length > 0 && (
            <FilterSection
              title="Categorias"
              icon={<Folder className="w-3 h-3" />}
              items={categories.map((cat) => ({
                value: cat.id.toString(),
                label: cat.name,
                color: cat.color || "text-white/70",
              }))}
              selected={filters.categories?.map((id) => id.toString()) || []}
              onToggle={(value) => onToggleCategory(parseInt(value, 10))}
            />
          )}

          {/* Tag Filter */}
          {tags.length > 0 && (
            <FilterSection
              title="Tags"
              icon={<Hash className="w-3 h-3" />}
              items={tags.map((tag) => ({
                value: tag.id.toString(),
                label: tag.name,
                color: tag.color || "text-white/70",
              }))}
              selected={filters.tags?.map((id) => id.toString()) || []}
              onToggle={(value) => onToggleTag(parseInt(value, 10))}
            />
          )}

          {categories.length === 0 && tags.length === 0 && (
            <p className="text-xs text-white/40 text-center py-2">
              Categorias e tags serão exibidas aqui quando criadas.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Filter Section with buttons
 */
interface FilterSectionProps {
  title: string
  icon?: React.ReactNode
  items: Array<{
    value: string
    label: string
    icon?: string
    color?: string
  }>
  selected: string[]
  onToggle: (value: string) => void | ((value: PostType) => void) | ((value: ContentStatus) => void)
}

function FilterSection({ title, icon, items, selected, onToggle }: FilterSectionProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-white/60 uppercase mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = selected.includes(item.value)

          return (
            <button
              key={item.value}
              onClick={() => onToggle(item.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                "border",
                isSelected
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 flex items-center justify-center text-xs",
                  !isSelected && item.color
                )}
              >
                {item.icon || (isSelected && "✓")}
              </span>
              <span>{item.label}</span>
              {isSelected && <X className="w-3 h-3 ml-1" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Removable filter pill
 */
interface FilterPillProps {
  label: string
  onRemove: () => void
}

function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <Badge
      variant="outline"
      className="h-6 px-2 text-xs bg-primary/10 text-primary border-primary/30 cursor-pointer hover:bg-primary/20"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
    >
      {label}
      <X className="w-3 h-3 ml-1" />
    </Badge>
  )
}
