/**
 * Content Dialog Component
 *
 * Modal de edição completa para itens da biblioteca.
 * Permite editar todos os campos incluindo conteúdo, categoria, tags e agendamento.
 */

"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Link as LinkIcon, ImagePlus, Folder, Hash } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  updateLibraryItemAction,
  createLibraryItemAction,
  getCategoriesAction,
  getTagsAction,
} from "../actions/library-actions"
import { CategoryPicker } from "./category-picker"
import { TagPicker } from "./tag-picker"
import type { LibraryItemWithRelations, Category, Tag } from "@/types/library"

interface ContentDialogProps {
  open: boolean
  item: LibraryItemWithRelations | null
  onClose: () => void
  onSave: () => void
}

// Type configurations
const TYPE_OPTIONS: Array<{ value: "text" | "image" | "carousel" | "video" | "story"; label: string; icon: string; color: string }> = [
  { value: "text", label: "Texto", icon: "Type", color: "text-blue-400" },
  { value: "image", label: "Imagem", icon: "Image", color: "text-purple-400" },
  { value: "carousel", label: "Carrossel", icon: "Layers", color: "text-pink-400" },
  { value: "video", label: "Vídeo", icon: "Video", color: "text-red-400" },
  { value: "story", label: "Story", icon: "Camera", color: "text-orange-400" },
]

// Status configurations
const STATUS_OPTIONS: Array<{ value: "draft" | "scheduled" | "published" | "archived"; label: string; color: string; icon: string }> = [
  { value: "draft", label: "Rascunho", color: "bg-gray-500/20 text-gray-300", icon: "FileText" },
  { value: "scheduled", label: "Agendado", color: "bg-blue-500/20 text-blue-300", icon: "Clock" },
  { value: "published", label: "Publicado", color: "bg-green-500/20 text-green-300", icon: "CheckCircle" },
  { value: "archived", label: "Arquivado", color: "bg-orange-500/20 text-orange-300", icon: "Archive" },
]

export function ContentDialog({ open, item, onClose, onSave }: ContentDialogProps) {
  const isEditing = !!item

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<"text" | "image" | "carousel" | "video" | "story">("text")
  const [status, setStatus] = useState<"draft" | "scheduled" | "published" | "archived">("draft")
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaUrlInput, setMediaUrlInput] = useState("")
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [tagIds, setTagIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Categories and tags
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  // Load categories and tags when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingMetadata(true)
      Promise.all([getCategoriesAction(), getTagsAction()])
        .then(([cats, tagsData]) => {
          setCategories(cats)
          setTags(tagsData)
        })
        .finally(() => {
          setIsLoadingMetadata(false)
        })
    }
  }, [open])

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (item) {
      setTitle(item.title ?? "")
      setContent(item.content ?? "")
      setType(item.type)
      setStatus(item.status)
      setCategoryId(item.categoryId ?? null)
      setTagIds(item.tags.map((t) => t.id))
      // Parse mediaUrl from JSON string if it exists
      if (item.mediaUrl) {
        try {
          const parsed = JSON.parse(item.mediaUrl)
          setMediaUrls(Array.isArray(parsed) ? parsed : [])
        } catch {
          setMediaUrls([])
        }
      } else {
        setMediaUrls([])
      }
    } else {
      setTitle("")
      setContent("")
      setType("text")
      setStatus("draft")
      setCategoryId(null)
      setTagIds([])
      setMediaUrls([])
    }
    setError(null)
  }, [item, open])

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!content.trim()) {
      setError("O conteúdo é obrigatório")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const formData = {
        title: title.trim() || undefined,
        content: content.trim(),
        type,
        status,
        categoryId,
        tagIds,
        mediaUrl: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
      }

      let result

      if (isEditing && item) {
        result = await updateLibraryItemAction(item.id, formData)
      } else {
        result = await createLibraryItemAction(formData)
      }

      if (result.success) {
        onSave()
        onClose()
      } else {
        setError(result.error ?? "Erro ao salvar")
      }
    } catch {
      setError("Erro ao salvar")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle add media URL
  const handleAddMediaUrl = () => {
    const url = mediaUrlInput.trim()
    if (url && !mediaUrls.includes(url)) {
      setMediaUrls([...mediaUrls, url])
      setMediaUrlInput("")
    }
  }

  // Handle remove media URL
  const handleRemoveMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter((u) => u !== url))
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {isEditing ? "Editar Conteúdo" : "Novo Conteúdo"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Type & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Tipo de Conteúdo</Label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setType(option.value)}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-all border",
                      type === option.value
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-all border",
                      status === option.value
                        ? option.color
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70 text-sm">
              Título <span className="text-white/30">(opcional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite um título para este conteúdo..."
              className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-white/70 text-sm">
              Conteúdo *
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite ou cole seu conteúdo aqui..."
              rows={8}
              className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 resize-none"
            />
            <div className="flex justify-between">
              <span className="text-xs text-white/30">
                {content.length} caracteres
              </span>
            </div>
          </div>

          {/* Media URLs */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm flex items-center gap-2">
              <ImagePlus className="w-4 h-4" />
              Imagens/Mídia <span className="text-white/30">(opcional)</span>
            </Label>

            {/* Add URL input */}
            <div className="flex gap-2">
              <Input
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMediaUrl()}
                placeholder="https://..."
                className="flex-1 bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50"
              />
              <Button
                onClick={handleAddMediaUrl}
                variant="outline"
                size="sm"
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                Adicionar
              </Button>
            </div>

            {/* Media URLs list */}
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                {mediaUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/10 rounded-md"
                  >
                    <LinkIcon className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <span className="flex-1 text-sm text-white/70 truncate">{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMediaUrl(url)}
                      className="h-6 w-6 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Categoria <span className="text-white/30">(opcional)</span>
              </Label>
              {isLoadingMetadata ? (
                <div className="h-[38px] bg-white/[0.02] border border-white/10 rounded-md animate-pulse" />
              ) : (
                <CategoryPicker
                  categories={categories}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                  placeholder="Selecione uma categoria"
                />
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Tags <span className="text-white/30">(opcional)</span>
              </Label>
              {isLoadingMetadata ? (
                <div className="h-[38px] bg-white/[0.02] border border-white/10 rounded-md animate-pulse" />
              ) : (
                <TagPicker
                  tags={tags}
                  selectedIds={tagIds}
                  onSelect={setTagIds}
                  placeholder="Selecione tags"
                />
              )}
            </div>
          </div>

          {/* Helper text */}
          <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/5">
            <span>Ctrl+S para salvar • Esc para cancelar</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="bg-primary text-black hover:bg-primary/90 min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {isEditing ? "Salvar" : "Criar"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
