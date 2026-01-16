/**
 * Tag Picker Component
 *
 * Dropdown para selecionar múltiplas tags para um item da biblioteca.
 * Inclui busca, multi-select e opção de criar nova tag.
 */

"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronDown, Hash, Plus, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Tag } from "@/types/library"

interface TagPickerProps {
  tags: Tag[]
  selectedIds: number[]
  onSelect: (tagIds: number[]) => void
  onCreateNew?: () => void
  placeholder?: string
  maxVisible?: number
}

export function TagPicker({
  tags,
  selectedIds,
  onSelect,
  onCreateNew,
  placeholder = "Selecione tags",
  maxVisible = 3,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Get selected tags
  const selectedTags = useMemo(() => {
    return tags.filter((t) => selectedIds.includes(t.id))
  }, [tags, selectedIds])

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!search) return tags.filter((t) => !selectedIds.includes(t.id))

    return tags.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase())
      const notSelected = !selectedIds.includes(t.id)
      return matchesSearch && notSelected
    })
  }, [tags, selectedIds, search])

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

  // Handle tag toggle
  const toggleTag = (tagId: number) => {
    if (selectedIds.includes(tagId)) {
      onSelect(selectedIds.filter((id) => id !== tagId))
    } else {
      onSelect([...selectedIds, tagId])
    }
  }

  // Handle remove tag from selected
  const removeTag = (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(selectedIds.filter((id) => id !== tagId))
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between bg-white/[0.02] border-white/10 text-white hover:bg-white/5 min-h-[38px] h-auto py-1.5"
      >
        <div className="flex flex-wrap items-center gap-1">
          {selectedTags.length === 0 ? (
            <span className="text-white/40">{placeholder}</span>
          ) : (
            <>
              {selectedTags.slice(0, maxVisible).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 gap-1"
                  style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : {}}
                >
                  <span>#{tag.name}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-white"
                    onClick={(e) => removeTag(tag.id, e)}
                  />
                </Badge>
              ))}
              {selectedTags.length > maxVisible && (
                <span className="text-xs text-white/40">
                  +{selectedTags.length - maxVisible}
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Selected tags preview */}
          {selectedTags.length > 0 && (
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-white/40 mb-1">Selecionados</p>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 cursor-pointer"
                    onClick={() => toggleTag(tag.id)}
                    style={tag.color ? { backgroundColor: `${tag.color}30`, color: tag.color } : {}}
                  >
                    <span>#{tag.name}</span>
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available tags */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredTags.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">
                {search ? "Nenhuma tag encontrada" : "Nenhuma tag"}
              </p>
            ) : (
              filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                    selectedIds.includes(tag.id)
                      ? "bg-primary/20 text-primary"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Hash
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: tag.color || undefined }}
                  />
                  <span className="flex-1 text-left">#{tag.name}</span>
                  {selectedIds.includes(tag.id) && (
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
                Nova tag
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
