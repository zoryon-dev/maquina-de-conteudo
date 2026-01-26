/**
 * Content Dialog Component
 *
 * Modal de edição completa para itens da biblioteca.
 * Permite editar todos os campos incluindo conteúdo, categoria, tags e agendamento.
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Loader2, Link as LinkIcon, ImagePlus, Folder, Hash, Layers, Type, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { CategoryPicker } from "./category-picker"
import { TagPicker } from "./tag-picker"
import type { LibraryItemWithRelations, Category, Tag } from "@/types/library"
import { toast } from "sonner"
import { VideoScriptViewer, isVideoScriptStructured } from "@/components/library/video-script-viewer"
import type { VideoScriptStructured } from "@/lib/wizard-services/types"

// ============================================================================
// TYPES FOR CAROUSEL
// ============================================================================

interface CarouselSlide {
  title?: string;
  content: string;
  imagePrompt?: string;
}

interface CarouselContent {
  type: "carousel";
  slides: CarouselSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
}

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
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false)

  // Carousel-specific state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [carouselCaption, setCarouselCaption] = useState("")
  const [carouselHashtags, setCarouselHashtags] = useState<string[]>([])
  const [showCarouselView, setShowCarouselView] = useState(true)

  // Video-specific state
  const [showVideoScriptView, setShowVideoScriptView] = useState(true)

  // Categories and tags
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  // Parse carousel content from JSON
  const parsedCarousel = useMemo((): CarouselContent | null => {
    if (type !== "carousel") return null
    try {
      const parsed = JSON.parse(content)
      if (parsed.slides && Array.isArray(parsed.slides)) {
        return parsed as CarouselContent
      }
    } catch {
      // Not valid JSON, return null
    }
    return null
  }, [content, type])

  const carouselSlides = parsedCarousel?.slides ?? []
  const currentSlide = carouselSlides[currentSlideIndex] ?? null

  // Parse video content from JSON
  const parsedVideoScript = useMemo((): VideoScriptStructured | null => {
    if (type !== "video") return null
    try {
      const parsed = JSON.parse(content)
      if (isVideoScriptStructured(parsed)) {
        return parsed as VideoScriptStructured
      }
    } catch {
      // Not valid JSON or not structured, return null
    }
    return null
  }, [content, type])

  // Parse video metadata (SEO, thumbnail info, etc.)
  interface VideoMetadata {
    selectedTitle?: {
      id: string;
      title: string;
      hook_factor: number;
      word_count?: number;
      formula_used?: string;
      triggers?: string[];
      tribal_angle?: string;
      reason?: string;
    };
    thumbnail?: {
      imageUrl: string;
      promptUsed?: string;
      especificacoes?: string;
      reasoning?: string;
      variacoes?: string[];
    };
    youtubeSEO?: {
      title?: string;
      description?: string;
      tags?: string[];
      hashtags?: string[];
      timestamps?: Array<{ time: string; label: string }>;
      chapters?: string;
    };
    script?: {
      valorCentral?: string;
      hookTexto?: string;
      topicos?: string[];
      duracao?: string;
    };
    wizardContext?: {
      duration?: string;
      theme?: string;
      targetAudience?: string;
    };
  }

  const parsedVideoMetadata = useMemo((): VideoMetadata | null => {
    if (type !== "video" || !item?.metadata) return null
    try {
      return JSON.parse(item.metadata) as VideoMetadata
    } catch {
      return null
    }
  }, [type, item?.metadata])

  // Load categories and tags when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingMetadata(true)
      Promise.all([
        fetch("/api/library/categories").then((r) => r.json()),
        fetch("/api/library/tags").then((r) => r.json()),
      ])
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
      // Reset carousel state
      setCurrentSlideIndex(0)
      setShowCarouselView(true)
      // Reset video state
      setShowVideoScriptView(true)
    } else {
      setTitle("")
      setContent("")
      setType("text")
      setStatus("draft")
      setCategoryId(null)
      setTagIds([])
      setMediaUrls([])
      setCurrentSlideIndex(0)
      setShowCarouselView(true)
      setShowVideoScriptView(true)
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
        const response = await fetch(`/api/library/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        result = await response.json()
      } else {
        const response = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        result = await response.json()
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

  // Handle regenerate images for carousel
  const handleRegenerateImages = async () => {
    if (!item || item.type !== "carousel") return

    setIsRegeneratingImages(true)
    setError(null)

    try {
      // Call the queue API to regenerate images
      const response = await fetch(`/api/library/${item.id}/regenerate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro ao regenerar imagens" }))
        throw new Error(errorData.error || "Erro ao regenerar imagens")
      }

      const data = await response.json()

      // Show success message
      toast.success("Imagens sendo geradas", {
        description: "Você será notificado quando estiverem prontas.",
      })

      // Close dialog to show updated state
      onSave()
      onClose()
    } catch (err) {
      console.error("Error regenerating images:", err)
      setError(err instanceof Error ? err.message : "Erro ao regenerar imagens")
    } finally {
      setIsRegeneratingImages(false)
    }
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

          {/* Content - Regular, Video, or Carousel */}
          {type === "carousel" && parsedCarousel ? (
            <div className="space-y-4">
              {/* Carousel Viewer */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                {/* Carousel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-primary/10">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-white">
                      Carrossel - {carouselSlides.length} slide{carouselSlides.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCarouselView(!showCarouselView)}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    {showCarouselView ? "Editar JSON" : "Ver carrossel"}
                  </button>
                </div>

                {showCarouselView ? (
                  <>
                    {/* Slide Display */}
                    <div className="p-6">
                      {currentSlide ? (
                        <div className="space-y-4">
                          {/* Slide Number */}
                          <div className="flex items-center justify-center gap-3">
                            {carouselSlides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => (i > 0 ? i - 1 : carouselSlides.length - 1))}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center text-sm font-bold">
                                {currentSlideIndex + 1}
                              </div>
                              <span className="text-white/60 text-sm">
                                {carouselSlides.length > 1 && `de ${carouselSlides.length}`}
                              </span>
                            </div>
                            {carouselSlides.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((i) => (i < carouselSlides.length - 1 ? i + 1 : 0))}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Slide Indicators */}
                          {carouselSlides.length > 1 && (
                            <div className="flex justify-center gap-2">
                              {carouselSlides.map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setCurrentSlideIndex(i)}
                                  className={cn(
                                    "w-2 h-2 rounded-full transition-colors",
                                    i === currentSlideIndex ? "bg-primary" : "bg-white/20"
                                  )}
                                />
                              ))}
                            </div>
                          )}

                          {/* Slide Content */}
                          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3">
                            {currentSlide.title && (
                              <div>
                                <p className="text-xs text-primary/80 mb-1">Título</p>
                                <p className="text-white font-medium">{currentSlide.title}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-primary/80 mb-1">Conteúdo</p>
                              <p className="text-white/90 whitespace-pre-wrap">{currentSlide.content}</p>
                            </div>
                            {currentSlide.imagePrompt && (
                              <div className="pt-2 border-t border-white/5">
                                <p className="text-xs text-white/40">Prompt de Imagem:</p>
                                <p className="text-xs text-white/30 italic line-clamp-2">{currentSlide.imagePrompt}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-white/40 py-8">Nenhum slide encontrado</p>
                      )}
                    </div>

                    {/* Caption & Hashtags from carousel */}
                    {(parsedCarousel.caption || parsedCarousel.hashtags) && (
                      <div className="px-6 pb-4 border-t border-white/10">
                        {parsedCarousel.caption && (
                          <div className="mb-3">
                            <p className="text-xs text-primary/80 mb-1">Caption</p>
                            <p className="text-sm text-white/80">{parsedCarousel.caption}</p>
                          </div>
                        )}
                        {parsedCarousel.hashtags && parsedCarousel.hashtags.length > 0 && (
                          <div>
                            <p className="text-xs text-primary/80 mb-1">Hashtags</p>
                            <div className="flex flex-wrap gap-1">
                              {parsedCarousel.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* JSON Editor Mode */
                  <div className="p-4">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder='{"slides": [{"content": "..."}]}'
                      rows={12}
                      className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 resize-none font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : type === "video" && parsedVideoScript ? (
            <div className="space-y-4">
              {/* Video Script Viewer */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                {/* Video Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-red-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                      <span className="text-xs text-white font-bold">▶</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      Roteiro de Vídeo - {parsedVideoScript.meta.duracao_estimada}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVideoScriptView(!showVideoScriptView)}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    {showVideoScriptView ? "Editar JSON" : "Ver roteiro"}
                  </button>
                </div>

                {showVideoScriptView ? (
                  /* Video Script Structured View */
                  <div className="p-4">
                    <VideoScriptViewer script={parsedVideoScript} />
                  </div>
                ) : (
                  /* JSON Editor Mode */
                  <div className="p-4">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder='{"meta": {...}, "thumbnail": {...}, "roteiro": {...}}'
                      rows={12}
                      className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 resize-none font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* YouTube SEO Section */}
            {parsedVideoMetadata?.youtubeSEO && (
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">
                      YouTube SEO
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Title */}
                  {parsedVideoMetadata.youtubeSEO.title && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/60 mb-1">Título Otimizado</h4>
                      <p className="text-sm text-white/90 bg-white/[0.02] rounded-lg p-2">
                        {parsedVideoMetadata.youtubeSEO.title}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {parsedVideoMetadata.youtubeSEO.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/60 mb-1">Descrição</h4>
                      <p className="text-sm text-white/70 bg-white/[0.02] rounded-lg p-2 max-h-32 overflow-y-auto">
                        {parsedVideoMetadata.youtubeSEO.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {parsedVideoMetadata.youtubeSEO.tags && parsedVideoMetadata.youtubeSEO.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/60 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {parsedVideoMetadata.youtubeSEO.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hashtags */}
                  {parsedVideoMetadata.youtubeSEO.hashtags && parsedVideoMetadata.youtubeSEO.hashtags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/60 mb-2">Hashtags</h4>
                      <p className="text-sm text-blue-300">
                        {parsedVideoMetadata.youtubeSEO.hashtags.join(" ")}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  {parsedVideoMetadata.youtubeSEO.timestamps && parsedVideoMetadata.youtubeSEO.timestamps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/60 mb-2">Timestamps</h4>
                      <div className="space-y-1">
                        {parsedVideoMetadata.youtubeSEO.timestamps.map((ts, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-blue-300 font-mono">{ts.time}</span>
                            <span className="text-white/70">{ts.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thumbnail Preview */}
            {parsedVideoMetadata?.thumbnail?.imageUrl && (
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-purple-500/10">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      Thumbnail Gerada
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <img
                    src={parsedVideoMetadata.thumbnail.imageUrl}
                    alt="Thumbnail"
                    className="w-full rounded-lg"
                  />
                </div>
              </div>
            )}
            </div>
          ) : (
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
          )}

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

            {/* Regenerate Images Button - for carousels */}
            {type === "carousel" && isEditing && (
              <Button
                type="button"
                onClick={handleRegenerateImages}
                disabled={isRegeneratingImages}
                variant="outline"
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 w-full"
              >
                {isRegeneratingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando imagens...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerar Imagens com IA
                  </>
                )}
              </Button>
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
