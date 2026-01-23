/**
 * Ampliar Content Dialog
 *
 * Dialog para edição visual de conteúdo com card preview e área de texto editável.
 * Suporta navegação entre slides de carrossel e regeneração de imagem.
 *
 * Fluxo:
 * 1. Usuário edita o texto
 * 2. Clica "Salvar Texto" → habilita botão "Regenerar Imagem"
 * 3. Clica "Regenerar Imagem" → gera nova imagem baseada no texto salvo
 */

"use client"

import { useState, useCallback } from "react"
import { Loader2, ChevronLeft, ChevronRight, Save, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { LibraryItemWithRelations } from "@/types/library"

// ============================================================================
// TYPES
// ============================================================================

export interface AmpliarContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LibraryItemWithRelations
  mediaUrls: string[]
  carouselSlides: Array<{
    title?: string
    content: string
    imagePrompt?: string
  }>
  onUpdate?: () => void
}

interface SlideData {
  title?: string
  content: string
  imagePrompt?: string
  index: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AmpliarContentDialog({
  open,
  onOpenChange,
  item,
  mediaUrls,
  carouselSlides,
  onUpdate,
}: AmpliarContentDialogProps) {
  // Estado para slide atual (carrossel)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Estado para texto editado
  const [editedText, setEditedText] = useState("")

  // Estado para rastrear se houve mudanças não salvas
  const [hasChanges, setHasChanges] = useState(false)

  // Estado para loading
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Estado para saber se o texto foi salvo (habilita regenerar)
  const [hasSaved, setHasSaved] = useState(false)

  // Determina se é carrossel
  const isCarousel = item.type === "carousel"

  // Dados do slide atual
  const currentSlide: SlideData | null = isCarousel && carouselSlides.length > 0
    ? {
        title: carouselSlides[currentSlideIndex]?.title,
        content: carouselSlides[currentSlideIndex]?.content || "",
        imagePrompt: carouselSlides[currentSlideIndex]?.imagePrompt,
        index: currentSlideIndex,
      }
    : !isCarousel
      ? {
          title: item.title || undefined,
          content: item.content || "",
          index: 0,
        }
      : null

  // URL da imagem atual
  const currentImageUrl = isCarousel
    ? mediaUrls[currentSlideIndex] || null
    : mediaUrls[0] || null

  // Total de slides
  const totalSlides = isCarousel ? carouselSlides.length : 1

  // Inicializa editedText quando o slide muda
  const initializeText = useCallback(() => {
    if (currentSlide) {
      setEditedText(currentSlide.content)
      setHasChanges(false)
      setHasSaved(false)
    }
  }, [currentSlide])

  // Inicializa quando o dialog abre
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen)
    if (newOpen) {
      initializeText()
    }
  }, [onOpenChange, initializeText])

  // Navegação entre slides
  const goToPreviousSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
      initializeText()
    }
  }, [currentSlideIndex, initializeText])

  const goToNextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
      initializeText()
    }
  }, [currentSlideIndex, totalSlides, initializeText])

  // Handler para mudança de texto
  const handleTextChange = useCallback((value: string) => {
    setEditedText(value)
    setHasChanges(value !== currentSlide?.content)
  }, [currentSlide?.content])

  // Handler para salvar texto
  const handleSaveText = useCallback(async () => {
    if (!hasChanges || isSaving) return

    setIsSaving(true)

    try {
      const response = await fetch(`/api/library/${item.id}/update-slide-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: currentSlideIndex,
          content: editedText,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Texto salvo com sucesso!")
        setHasChanges(false)
        setHasSaved(true)
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao salvar texto")
      }
    } catch (error) {
      console.error("Error saving text:", error)
      toast.error("Erro ao salvar texto")
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges, isSaving, item.id, currentSlideIndex, editedText, onUpdate])

  // Handler para regenerar imagem
  const handleRegenerateImage = useCallback(async () => {
    if (!hasSaved || isRegenerating) return

    setIsRegenerating(true)

    try {
      // Determina se tem estrutura HTML/API
      const hasHtmlStructure = currentSlide?.imagePrompt || currentImageUrl?.startsWith("http")

      const response = await fetch(`/api/library/${item.id}/regenerate-slide-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: currentSlideIndex,
          method: hasHtmlStructure ? "template" : "ai",
          content: editedText,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Imagem regenerada com sucesso!")
        setHasSaved(false)
        onUpdate?.()
      } else {
        toast.error(result.error || "Erro ao regenerar imagem")
      }
    } catch (error) {
      console.error("Error regenerating image:", error)
      toast.error("Erro ao regenerar imagem")
    } finally {
      setIsRegenerating(false)
    }
  }, [hasSaved, isRegenerating, currentSlide, currentImageUrl, editedText, item.id, currentSlideIndex, onUpdate])

  // Verifica se pode regenerar (só após salvar)
  const canRegenerate = hasSaved && !isRegenerating

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="
          max-w-5xl w-full
          max-h-[90vh] overflow-hidden
          flex flex-col
          p-0
          bg-[#1a1a2e] border border-white/10
        "
        showCloseButton
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-white">
            {isCarousel ? `Slide ${currentSlideIndex + 1} de ${totalSlides}` : "Editar Imagem"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Edite o texto e regenere a imagem quando desejar
          </DialogDescription>
        </DialogHeader>

        {/* Content - Layout em duas colunas */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
            {/* Coluna Esquerda - Card Visual */}
            <div className="p-6 border-r border-white/10 flex items-center justify-center bg-white/[0.02]">
              <div className="relative w-full max-w-[320px] aspect-[3/4]">
                {/* Navegação entre slides (só carrossel) */}
                {isCarousel && totalSlides > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 text-white/60 hover:text-white hover:bg-white/10"
                      onClick={goToPreviousSlide}
                      disabled={currentSlideIndex === 0}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-10 text-white/60 hover:text-white hover:bg-white/10"
                      onClick={goToNextSlide}
                      disabled={currentSlideIndex === totalSlides - 1}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}

                {/* Card/Imagem */}
                {currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt={currentSlide?.title || `Slide ${currentSlideIndex + 1}`}
                    className={cn(
                      "w-full h-full object-cover rounded-lg shadow-lg",
                      isRegenerating && "opacity-50"
                    )}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/[0.02] to-white/[0.05] rounded-lg border border-white/10 flex items-center justify-center">
                    <div className="text-center text-white/40">
                      <p className="text-sm">Sem imagem</p>
                      {currentSlide?.title && (
                        <p className="text-xs mt-2">{currentSlide.title}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Overlay de loading */}
                {isRegenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Gerando imagem...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita - Área de Edição */}
            <div className="p-6 flex flex-col">
              {/* Título do card (se existir) */}
              {currentSlide?.title && (
                <div className="mb-4">
                  <label className="text-xs text-white/60 uppercase tracking-wider">Título</label>
                  <p className="text-white font-medium mt-1">{currentSlide.title}</p>
                </div>
              )}

              {/* Área de texto editável */}
              <div className="flex-1 flex flex-col">
                <label className="text-xs text-white/60 uppercase tracking-wider mb-2">
                  Texto da Imagem
                </label>
                <Textarea
                  value={editedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Digite o texto da imagem..."
                  className="
                    flex-1 min-h-[200px]
                    bg-white/5 border-white/10 text-white
                    placeholder:text-white/30
                    focus:border-primary/50 focus:ring-primary/20
                    resize-none
                  "
                  disabled={isSaving || isRegenerating}
                />
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 space-y-3">
                {/* Salvar Texto */}
                <Button
                  onClick={handleSaveText}
                  disabled={!hasChanges || isSaving || isRegenerating}
                  className="w-full h-10 bg-primary text-black hover:bg-primary/90"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Texto
                    </>
                  )}
                </Button>

                {/* Regenerar Imagem */}
                <Button
                  onClick={handleRegenerateImage}
                  disabled={!canRegenerate}
                  variant="outline"
                  className="w-full h-10 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerar Imagem
                    </>
                  )}
                </Button>

                {/* Info sobre regeneração */}
                {!hasSaved && (
                  <p className="text-xs text-white/40 text-center">
                    Salve o texto primeiro para habilitar a regeneração
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
