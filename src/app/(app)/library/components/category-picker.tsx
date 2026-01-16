/**
 * Category Picker Component
 *
 * Dropdown para selecionar uma categoria para um item da biblioteca.
 * Inclui busca e opção de criar nova categoria.
 */

"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronDown, Folder, FolderOpen, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Category } from "@/types/library"

interface CategoryPickerProps {
  categories: Category[]
  selectedId: number | null
  onSelect: (categoryId: number | null) => void
  onCreateNew?: () => void
  placeholder?: string
  allowClear?: boolean
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onCreateNew,
  placeholder = "Selecione uma categoria",
  allowClear = true,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Get selected category name
  const selectedCategory = useMemo(() => {
    if (!selectedId) return null
    return categories.find((c) => c.id === selectedId)
  }, [categories, selectedId])

  // Filter categories by search (flat list for simplicity)
  const filteredCategories = useMemo(() => {
    if (!search) return categories
    return categories.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [categories, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between bg-white/[0.02] border-white/10 text-white hover:bg-white/5",
          !selectedCategory && "text-white/40"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <>
              <Folder className="w-4 h-4" style={{ color: selectedCategory.color || undefined }} />
              <span>{selectedCategory.name}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="max-h-48 overflow-y-auto p-1">
            {allowClear && (
              <button
                onClick={() => {
                  onSelect(null)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/60 hover:text-white hover:bg-white/5"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Sem categoria</span>
              </button>
            )}

            {filteredCategories.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">
                {search ? "Nenhuma categoria encontrada" : "Nenhuma categoria"}
              </p>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelect(category.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                    selectedId === category.id
                      ? "bg-primary/20 text-primary"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Folder
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: category.color || undefined }}
                  />
                  <span className="flex-1 text-left">{category.name}</span>
                  {selectedId === category.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Create new */}
          {onCreateNew && (
            <div className="p-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCreateNew()
                  setOpen(false)
                }}
                className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova categoria
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
