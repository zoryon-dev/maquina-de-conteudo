/**
 * Image Gallery Drawer - Slide Lateral de Imagens
 *
 * Componente que exibe imagens da biblioteca em um drawer lateral.
 * Permite visualizar ampliada, navegar entre imagens e editar textos de templates HTML.
 *
 * Funcionalidades:
 * - Navegação entre imagens (setas, dots, teclado)
 * - Visualização ampliada com zoom
 * - Edição de texto para imagens HTML templates
 * - Regeneração de imagem com texto editado
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Edit3, Loader2, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getWizardTemplateDataAction } from "@/app/(app)/library/actions/library-actions"

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImage {
  url: string
  index: number
  // Metadata para imagens HTML templates
  templateType?: "dark-mode" | "white-mode" | "twitter" | "super-headline"
  templateData?: {
    headline?: string
    descricao?: string
    subtitulo?: string
    paragrafo1?: string
    paragrafo2?: string
    destaque?: string
  }
  // Indica se é uma imagem HTML template (pode ser editada)
  isHtmlTemplate?: boolean
}

interface ImageGalleryDrawerProps {
  open: boolean
  onClose: () => void
  images: GalleryImage[]
  initialIndex?: number
  libraryItemId?: number
  onImageUpdated?: (index: number, newUrl: string) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ImageGalleryDrawer({
  open,
  onClose,
  images,
  initialIndex = 0,
  libraryItemId,
  onImageUpdated,
}: ImageGalleryDrawerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [enrichedImages, setEnrichedImages] = useState<GalleryImage[]>(images)

  // Estado para edição de texto
  const [editedText, setEditedText] = useState({
    headline: "",
    descricao: "",
    subtitulo: "",
    paragrafo1: "",
    paragrafo2: "",
    destaque: "",
  })

  // Buscar dados do wizard quando o drawer abrir
  useEffect(() => {
    if (open && libraryItemId) {
      getWizardTemplateDataAction(libraryItemId).then((data) => {
        if (data && data.slideTemplates.length > 0) {
          // Enriquecer as imagens com os metadados do template
          const enriched = images.map((img) => {
            const templateInfo = data.slideTemplates[img.index]
            if (templateInfo?.templateType) {
              return {
                ...img,
                isHtmlTemplate: true,
                templateType: templateInfo.templateType as any,
                templateData: templateInfo.templateData,
              }
            }
            return img
          })
          setEnrichedImages(enriched)
        }
      })
    }
  }, [open, libraryItemId, images])

  // Usar as imagens enriquecidas quando disponíveis, senão as originais
  const displayImages = enrichedImages.length > 0 ? enrichedImages : images

  // Reset current index quando mudar as imagens
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, images])

  // Reset zoom ao mudar de imagem
  useEffect(() => {
    setZoom(1)
  }, [currentIndex])

  // Carregar dados do template atual
  useEffect(() => {
    const currentImage = displayImages[currentIndex]
    if (currentImage?.templateData) {
      setEditedText({
        headline: currentImage.templateData.headline || "",
        descricao: currentImage.templateData.descricao || "",
        subtitulo: currentImage.templateData.subtitulo || "",
        paragrafo1: currentImage.templateData.paragrafo1 || "",
        paragrafo2: currentImage.templateData.paragrafo2 || "",
        destaque: currentImage.templateData.destaque || "",
      })
    }
  }, [currentIndex, displayImages])

  const currentImage = displayImages[currentIndex]

  // Handlers de navegação
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1))
  }, [displayImages.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0))
  }, [displayImages.length])

  const goToImage = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Handlers de zoom
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => setZoom(1)

  // Handler de teclado
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return // Ignorar durante edição

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          goToPrevious()
          break
        case "ArrowRight":
          e.preventDefault()
          goToNext()
          break
        case "Escape":
          e.preventDefault()
          if (zoom !== 1) {
            handleResetZoom()
          } else {
            onClose()
          }
          break
        case "+":
        case "=":
          e.preventDefault()
          handleZoomIn()
          break
        case "-":
          e.preventDefault()
          handleZoomOut()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, isEditing, goToPrevious, goToNext, onClose, zoom])

  // Handler de download
  const handleDownload = async () => {
    if (!currentImage) return

    try {
      const response = await fetch(currentImage.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `imagem-${currentIndex + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("Imagem baixada")
    } catch {
      toast.error("Erro ao baixar imagem")
    }
  }

  // Handler de regenerar imagem com texto editado
  const handleRegenerate = async () => {
    if (!libraryItemId || !currentImage?.isHtmlTemplate) return

    setIsRegenerating(true)

    try {
      const response = await fetch(`/api/library/${libraryItemId}/regenerate-slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: currentIndex,
          editedData: editedText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Erro ao regenerar imagem")
      }

      if (data.success && data.newImageUrl) {
        // Atualizar a URL da imagem
        onImageUpdated?.(currentIndex, data.newImageUrl)
        toast.success("Imagem atualizada!")
        setIsEditing(false)
      } else {
        throw new Error(data.error || "Erro ao regenerar")
      }
    } catch (err) {
      console.error("Error regenerating:", err)
      toast.error(err instanceof Error ? err.message : "Erro ao regenerar imagem")
    } finally {
      setIsRegenerating(false)
    }
  }

  // Se não há imagens ou drawer fechado, não renderizar
  if (!open || displayImages.length === 0) {
    return null
  }

  const templateType = currentImage?.templateType
  const showEditButton = currentImage?.isHtmlTemplate

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex transition-all duration-300",
      open ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-[#0a0a0f] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">
              Imagem {currentIndex + 1} de {displayImages.length}
            </span>
            {templateType && (
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                {templateType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Editar (só para templates HTML) */}
            {showEditButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-white/70 hover:text-white hover:bg-white/5"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? "Cancelar Edição" : "Editar Texto"}
              </Button>
            )}

            {/* Botão Download */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <Download className="w-5 h-5" />
            </Button>

            {/* Botão Fechar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Área da Imagem */}
          <div className={cn(
            "flex-1 flex items-center justify-center bg-black/50 p-6 overflow-hidden",
            isEditing && "flex-1/2"
          )}>
            <div className="relative flex items-center justify-center">
              {/* Botão Anterior */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-0 z-10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              {/* Imagem com zoom */}
              <div
                className="transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                {currentImage && (
                  <img
                    src={currentImage.url}
                    alt={`Imagem ${currentIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    draggable={false}
                  />
                )}
              </div>

              {/* Botão Próximo */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-0 z-10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Painel de Edição (só para templates HTML) */}
          {isEditing && showEditButton && (
            <div className="flex-1/2 border-l border-white/10 p-6 overflow-y-auto bg-white/[0.02]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Editar Texto</h3>
                  <p className="text-sm text-white/60">
                    Edite os textos abaixo e clique em "Atualizar Imagem" para regenerar.
                  </p>
                </div>

                {/* Campos baseados no template */}
                {templateType === "dark-mode" || templateType === "white-mode" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Headline</Label>
                      <Input
                        value={editedText.headline}
                        onChange={(e) => setEditedText({ ...editedText, headline: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Título principal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Descrição</Label>
                      <Textarea
                        value={editedText.descricao}
                        onChange={(e) => setEditedText({ ...editedText, descricao: e.target.value })}
                        className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        placeholder="Descrição do conteúdo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Subtítulo</Label>
                      <Input
                        value={editedText.subtitulo}
                        onChange={(e) => setEditedText({ ...editedText, subtitulo: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Subtítulo"
                      />
                    </div>
                  </>
                ) : templateType === "twitter" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Headline</Label>
                      <Input
                        value={editedText.headline}
                        onChange={(e) => setEditedText({ ...editedText, headline: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Nome/Título"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Parágrafo 1</Label>
                      <Textarea
                        value={editedText.paragrafo1}
                        onChange={(e) => setEditedText({ ...editedText, paragrafo1: e.target.value })}
                        className="bg-white/5 border-white/10 text-white min-h-[80px]"
                        placeholder="Primeiro parágrafo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Parágrafo 2</Label>
                      <Textarea
                        value={editedText.paragrafo2}
                        onChange={(e) => setEditedText({ ...editedText, paragrafo2: e.target.value })}
                        className="bg-white/5 border-white/10 text-white min-h-[80px]"
                        placeholder="Segundo parágrafo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Destaque</Label>
                      <Input
                        value={editedText.destaque}
                        onChange={(e) => setEditedText({ ...editedText, destaque: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Texto de destaque"
                      />
                    </div>
                  </>
                ) : templateType === "super-headline" ? (
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Headline</Label>
                    <Textarea
                      value={editedText.headline}
                      onChange={(e) => setEditedText({ ...editedText, headline: e.target.value })}
                      className="bg-white/5 border-white/10 text-white min-h-[120px] text-lg"
                      placeholder="Headline principal"
                    />
                  </div>
                ) : null}

                {/* Botão de Salvar */}
                <Button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="w-full bg-primary text-black hover:bg-primary/90"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar Imagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Controles de zoom e dots */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Controles de zoom */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white/70 hover:text-white hover:bg-white/5"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-white/60 text-sm w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white/70 hover:text-white hover:bg-white/5"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                Reset
              </Button>
            </div>

            {/* Dots de navegação */}
            <div className="flex items-center gap-1.5">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Ir para imagem ${index + 1}`}
                />
              ))}
            </div>

            {/* Espaçador para equilíbrio */}
            <div className="w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
