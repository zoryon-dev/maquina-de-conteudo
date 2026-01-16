/**
 * RAG Context Selector
 *
 * Allows users to select which document categories
 * to include in RAG context for chat queries.
 *
 * Features:
 * - Toggle buttons for each category
 * - "Select All / Clear All" functionality
 * - Persists selection in localStorage
 * - Shows count of selected categories
 */

"use client"

import * as React from "react"
import { Database, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { RAG_CATEGORIES, type RagCategory } from "@/lib/rag"

/**
 * Category configuration with labels and colors
 */
const CATEGORY_CONFIG: Record<RagCategory, { label: string; color: string }> = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
  offers: { label: "Ofertas", color: "bg-orange-500/10 text-orange-400" },
  brand: { label: "Marca", color: "bg-purple-500/10 text-purple-400" },
  audience: { label: "Público", color: "bg-green-500/10 text-green-400" },
  competitors: { label: "Concorrentes", color: "bg-red-500/10 text-red-400" },
  content: { label: "Conteúdo", color: "bg-amber-500/10 text-amber-400" },
}

/**
 * Storage key for localStorage persistence
 */
const STORAGE_KEY = "rag-selected-categories"

/**
 * Get initial categories from localStorage or default to all
 */
function getStoredCategories(): Set<RagCategory> {
  if (typeof window === "undefined") return new Set(RAG_CATEGORIES)

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed.filter((c): c is RagCategory => RAG_CATEGORIES.includes(c)))
      }
    }
  } catch {
    // Ignore storage errors
  }
  return new Set(RAG_CATEGORIES)
}

/**
 * Save categories to localStorage
 */
function saveCategories(categories: Set<RagCategory>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(categories)))
  } catch {
    // Ignore storage errors
  }
}

/**
 * RAG Context Selector Props
 */
export interface RagContextSelectorProps {
  /** Currently selected categories */
  value?: RagCategory[]
  /** Callback when selection changes */
  onValueChange?: (categories: RagCategory[]) => void
  /** Whether to show compact version (icon only when closed) */
  compact?: boolean
  /** Custom className */
  className?: string
}

/**
 * Hook to manage RAG category selection state
 */
export function useRagCategories() {
  const [categories, setCategories] = React.useState<Set<RagCategory>>(() => getStoredCategories())

  const toggleCategory = React.useCallback((category: RagCategory) => {
    setCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        // Don't allow deselecting all
        if (newSet.size > 1) {
          newSet.delete(category)
        }
      } else {
        newSet.add(category)
      }
      saveCategories(newSet)
      return newSet
    })
  }, [])

  const setAllCategories = React.useCallback((selected: boolean) => {
    const newSet = selected ? new Set(RAG_CATEGORIES) : new Set([RAG_CATEGORIES[0]])
    setCategories(newSet)
    saveCategories(newSet)
  }, [])

  const selectedArray = React.useMemo(
    () => Array.from(categories),
    [categories]
  )

  return {
    selected: selectedArray,
    toggleCategory,
    setAllCategories,
    count: categories.size,
    total: RAG_CATEGORIES.length,
  }
}

/**
 * RAG Context Selector Component
 *
 * Dropdown menu for selecting which document categories
 * to include in RAG context during chat.
 */
export function RagContextSelector({
  value: controlledValue,
  onValueChange,
  compact = false,
  className = "",
}: RagContextSelectorProps) {
  // Use internal state if uncontrolled
  const { selected, toggleCategory, setAllCategories, count, total } = useRagCategories()

  // Use controlled value if provided, otherwise use internal state
  const currentValue = controlledValue ?? selected

  // Sync with controlled value
  const currentValueSet = React.useMemo(
    () => new Set(controlledValue ?? selected),
    [controlledValue, selected]
  )

  const handleToggle = (category: RagCategory) => {
    toggleCategory(category)
    onValueChange?.(
      currentValueSet.has(category)
        ? currentValue.filter((c) => c !== category)
        : [...currentValue, category]
    )
  }

  const handleSelectAll = () => {
    setAllCategories(true)
    onValueChange?.(Array.from(RAG_CATEGORIES))
  }

  const handleClearAll = () => {
    setAllCategories(false)
    onValueChange?.([RAG_CATEGORIES[0]])
  }

  const isAllSelected = count === total

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
            compact && "px-2",
            className
          )}
          title="Fontes de contexto RAG"
        >
          <Database className="w-4 h-4" />
          {!compact && (
            <span className="text-xs hidden sm:inline">
              Fontes
            </span>
          )}
          {count > 0 && (
            <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
              {count}
            </span>
          )}
          <ChevronDown className="w-3 h-3 opacity-50" />
          <span className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#1a1a2e] border-white/10"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/90">
              Fontes de Contexto
            </span>
            <span className="text-[10px] text-white/40">
              {count}/{total}
            </span>
          </div>
        </div>

        {/* Select All / Clear All */}
        <div className="px-2 py-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className="text-[10px] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Selecionar todas
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={count === 1}
            className="text-[10px] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Limpar
          </button>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Category toggles */}
        {RAG_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category]
          const isSelected = currentValueSet.has(category)

          return (
            <DropdownMenuCheckboxItem
              key={category}
              checked={isSelected}
              onCheckedChange={() => handleToggle(category)}
              className={cn(
                "flex items-center gap-3 py-2 px-3 cursor-pointer",
                "text-white/70 hover:text-white hover:bg-white/5",
                "focus:bg-white/5"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                isSelected
                  ? "bg-primary border-primary text-black"
                  : "border-white/20"
              )}>
                {isSelected && <Check className="w-3 h-3" />}
              </div>
              <span className={cn("text-xs", config.color)}>
                {config.label}
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact version showing only the icon with badge
 */
export function RagContextSelectorCompact(props: Omit<RagContextSelectorProps, "compact">) {
  return <RagContextSelector {...props} compact />
}
