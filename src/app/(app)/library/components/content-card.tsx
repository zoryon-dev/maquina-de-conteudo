/**
 * Content Card Component
 *
 * Card individual para visualização em grid da biblioteca.
 * Exibe thumbnail, título, badges e ações.
 * Suporta edição inline de título com duplo clique.
 */

"use client"

import { Check, Type, Image, Layers, Video, Camera, MoreVertical, Copy, Trash2, Edit2, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS, STATUS_CONFIGS } from "@/types/calendar"
import { formatDate } from "@/lib/format"
import { toast } from "sonner"

interface ContentCardProps {
  item: LibraryItemWithRelations
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

const TYPE_ICONS: Record<string, typeof Type> = {
  text: Type,
  image: Image,
  carousel: Layers,
  video: Video,
  story: Camera,
}

export function ContentCard({
  item,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(item.title ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]
  const statusConfig = STATUS_CONFIGS[item.status]
  const TypeIcon = TYPE_ICONS[item.type] || Type

  // Get preview URL or placeholder
  const mediaUrls = item.mediaUrl ?? []
  const hasMedia = mediaUrls.length > 0
  const previewUrl = hasMedia ? mediaUrls[0] : null

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle double click to start inline edit
  const handleDoubleClick = () => {
    setEditedTitle(item.title ?? "")
    setIsEditing(true)
  }

  // Handle save inline edit
  const handleSave = async () => {
    if (editedTitle.trim() === (item.title ?? "")) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/library/${item.id}/inline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "title",
          value: editedTitle.trim() || "Sem título",
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success("Título atualizado")
        // Update local item title for immediate feedback
        item.title = editedTitle.trim() || "Sem título"
      } else {
        toast.error(result.error ?? "Erro ao atualizar título")
      }
    } catch {
      toast.error("Erro ao atualizar título")
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  // Handle cancel inline edit
  const handleCancel = () => {
    setEditedTitle(item.title ?? "")
    setIsEditing(false)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div
      className={cn(
        "group relative bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden transition-all hover:bg-white/[0.04] hover:border-white/15",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0f]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Clickable overlay for opening dialog (excludes checkbox and menu) */}
      <button
        onClick={onEdit}
        className="absolute inset-0 z-0"
        aria-label="Abrir detalhes"
      />

      {/* Selection Checkbox - higher z-index to catch clicks before overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={cn(
          "absolute top-3 left-3 z-10 w-5 h-5 rounded border flex items-center justify-center transition-all",
          selected
            ? "bg-primary border-primary text-black"
            : "bg-black/50 border-white/30 hover:border-white/50",
          isHovered || selected ? "opacity-100" : "opacity-0"
        )}
      >
        {selected && <Check className="w-3.5 h-3.5" />}
      </button>

      {/* Preview/Thumbnail */}
      <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden pointer-events-none">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-white/20">
            <TypeIcon className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 pointer-events-none">
        {/* Title */}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Digite o título..."
              className="flex-1 h-7 text-sm bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-primary/50 px-2"
              disabled={isSaving}
            />
            {isSaving && (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            )}
          </div>
        ) : (
          <h3
            className="font-medium text-white text-sm line-clamp-2 min-h-[2.5em] cursor-text hover:text-white/80 transition-colors"
            onDoubleClick={handleDoubleClick}
            title="Duplo clique para editar o título"
          >
            {item.title || "Sem título"}
          </h3>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("text-xs px-1.5 py-0", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-xs px-1.5 py-0 border-0",
              typeConfig.color
            )}
          >
            {typeConfig.label}
          </Badge>
          {item.category && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 bg-white/5 border-white/10 text-white/70"
            >
              {item.category.name}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded"
              >
                #{tag.name}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-xs text-white/40">
                +{item.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-white/40 pt-1">
          <span>{formatDate(item.createdAt)}</span>
          {item.scheduledPosts.length > 0 && (
            <span>
              {item.scheduledPosts.length}{" "}
              {item.scheduledPosts.length === 1 ? "plataforma" : "plataformas"}
            </span>
          )}
        </div>
      </div>

      {/* Actions Menu */}
      <div
        className={cn(
          "absolute top-3 right-3 z-10 transition-opacity pointer-events-auto",
          isHovered || selected ? "opacity-100" : "opacity-0"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-[#1a1a2e] border-white/10"
          >
            <DropdownMenuItem
              onClick={onEdit}
              className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  )
}
