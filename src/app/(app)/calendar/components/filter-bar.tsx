/**
 * Filter Bar Component
 *
 * Platform, status, and content type filters for the calendar.
 * Uses collapsible sections with checkboxes for multi-select.
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CalendarFilters, Platform } from "@/types/calendar"
import { PLATFORM_CONFIGS } from "@/types/calendar"
import type { ContentStatus } from "@/db/schema"

interface FilterBarProps {
  filters: CalendarFilters
  onFiltersChange: (filters: CalendarFilters) => void
}

// Status configurations
const STATUS_CONFIGS: Record<ContentStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-300" },
  scheduled: { label: "Agendado", color: "bg-blue-500/20 text-blue-300" },
  published: { label: "Publicado", color: "bg-green-500/20 text-green-300" },
  archived: { label: "Arquivado", color: "bg-orange-500/20 text-orange-300" },
}

// Content type configurations
const TYPE_CONFIGS: Record<string, { label: string; icon: string }> = {
  text: { label: "Texto", icon: "T" },
  image: { label: "Imagem", icon: "I" },
  carousel: { label: "Carrossel", icon: "C" },
  video: { label: "Vídeo", icon: "V" },
  story: { label: "Story", icon: "S" },
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Count active filters
  const activeFilterCount =
    (filters.platforms?.length ?? 0) +
    (filters.statuses?.length ?? 0) +
    (filters.types?.length ?? 0)

  // Toggle platform filter
  const togglePlatform = (platform: Platform) => {
    const current = filters.platforms || []
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform]

    onFiltersChange({ ...filters, platforms: updated.length ? updated : undefined })
  }

  // Toggle status filter
  const toggleStatus = (status: ContentStatus) => {
    const current = filters.statuses || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]

    onFiltersChange({ ...filters, statuses: updated.length ? updated : undefined })
  }

  // Toggle type filter
  const toggleType = (type: string) => {
    const current = filters.types || []
    const updated = current.includes(type as any)
      ? current.filter((t) => t !== type)
      : [...current, type as any]

    onFiltersChange({ ...filters, types: updated.length ? updated : undefined })
  }

  // Reset all filters
  const resetFilters = () => {
    onFiltersChange({})
  }

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
              onClick={resetFilters}
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
          {filters.platforms?.map((platform) => (
            <FilterPill
              key={platform}
              label={PLATFORM_CONFIGS[platform].label}
              onRemove={() => togglePlatform(platform)}
            />
          ))}
          {filters.statuses?.map((status) => (
            <FilterPill
              key={status}
              label={STATUS_CONFIGS[status].label}
              onRemove={() => toggleStatus(status)}
            />
          ))}
          {filters.types?.map((type) => (
            <FilterPill
              key={type}
              label={TYPE_CONFIGS[type]?.label || type}
              onRemove={() => toggleType(type)}
            />
          ))}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Platform Filter */}
          <FilterSection
            title="Plataformas"
            items={Object.entries(PLATFORM_CONFIGS).map(([key, config]) => ({
              value: key,
              label: config.label,
              icon: config.icon,
              color: config.color,
            }))}
            selected={filters.platforms || []}
            onToggle={(value) => togglePlatform(value as Platform)}
          />

          {/* Status Filter */}
          <FilterSection
            title="Status"
            items={Object.entries(STATUS_CONFIGS).map(([key, config]) => ({
              value: key,
              label: config.label,
              color: config.color,
            }))}
            selected={filters.statuses || []}
            onToggle={(value) => toggleStatus(value as ContentStatus)}
          />

          {/* Type Filter */}
          <FilterSection
            title="Tipo de Conteúdo"
            items={Object.entries(TYPE_CONFIGS).map(([key, config]) => ({
              value: key,
              label: config.label,
              icon: config.icon,
            }))}
            selected={filters.types || []}
            onToggle={toggleType}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Filter Section with checkboxes
 */
interface FilterSectionProps {
  title: string
  items: Array<{
    value: string
    label: string
    icon?: string
    color?: string
  }>
  selected: string[]
  onToggle: (value: string) => void
}

function FilterSection({ title, items, selected, onToggle }: FilterSectionProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-white/60 uppercase mb-2">{title}</h4>
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
              {item.icon && (
                <span className={cn("w-4 h-4 flex items-center justify-center text-xs", item.color)}>
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
              {isSelected && (
                <X className="w-3 h-3 ml-1" />
              )}
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
