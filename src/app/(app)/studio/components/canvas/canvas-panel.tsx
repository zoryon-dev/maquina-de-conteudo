/**
 * Canvas Panel Component
 *
 * Preview ao vivo do slide atual em um iframe.
 * Renderiza o HTML do template em tempo real.
 *
 * Técnica de escala: O container é dimensionado para o tamanho ESCALADO,
 * e o iframe usa transform: scale() para reduzir visualmente.
 */

"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Monitor, ZoomIn, ZoomOut, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudioStore, useActiveSlide, useProfile, useHeader } from "@/stores/studio-store";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import { DIMENSIONS } from "@/lib/studio-templates/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function CanvasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSlide = useActiveSlide();
  const profile = useProfile();
  const header = useHeader();
  const slides = useStudioStore((state) => state.slides);
  const activeSlideIndex = useStudioStore((state) => state.activeSlideIndex);
  const aspectRatio = useStudioStore((state) => state.aspectRatio);
  const setActiveSlide = useStudioStore((state) => state.setActiveSlide);

  // Estado para zoom dinâmico
  const [scale, setScale] = useState(0.35);
  const [autoScale, setAutoScale] = useState(true);

  // Estado para dialog fullscreen
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Gerar HTML do slide atual
  const previewHtml = useMemo(() => {
    if (!activeSlide) return null;

    const result = renderSlideToHtml({
      slide: activeSlide,
      profile,
      header,
      slideIndex: activeSlideIndex,
      totalSlides: slides.length,
    });

    return result.html;
  }, [activeSlide, profile, header, activeSlideIndex, slides.length]);

  const dimensions = DIMENSIONS[aspectRatio];

  // Calcular escala automaticamente baseado no espaço disponível
  useEffect(() => {
    if (!autoScale || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      // Deixar margem generosa para o frame, badge e controles
      const availableWidth = containerRect.width - 80;
      const availableHeight = containerRect.height - 100;

      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      // Usar a menor escala para garantir que cabe inteiro
      const newScale = Math.min(scaleX, scaleY, 0.45); // Max 45%
      setScale(Math.max(newScale, 0.15)); // Min 15%
    };

    calculateScale();

    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [dimensions, autoScale]);

  // Navegação entre slides (para fullscreen)
  const goToPrevSlide = useCallback(() => {
    if (activeSlideIndex > 0) {
      setActiveSlide(activeSlideIndex - 1);
    }
  }, [activeSlideIndex, setActiveSlide]);

  const goToNextSlide = useCallback(() => {
    if (activeSlideIndex < slides.length - 1) {
      setActiveSlide(activeSlideIndex + 1);
    }
  }, [activeSlideIndex, slides.length, setActiveSlide]);

  // Keyboard navigation para fullscreen
  useEffect(() => {
    if (!fullscreenOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevSlide();
      } else if (e.key === "ArrowRight") {
        goToNextSlide();
      } else if (e.key === "Escape") {
        setFullscreenOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenOpen, goToPrevSlide, goToNextSlide]);

  if (!activeSlide || !previewHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40">
        <Monitor className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">Nenhum slide selecionado</p>
      </div>
    );
  }

  // Converter HTML para data URL para o iframe
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;

  // Dimensões escaladas do preview
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  return (
    <>
      <div ref={containerRef} className="relative flex items-center justify-center w-full h-full">
        {/* Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => {
              setAutoScale(false);
              setScale((s) => Math.min(s + 0.05, 0.6));
            }}
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white/40 font-mono w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => {
              setAutoScale(false);
              setScale((s) => Math.max(s - 0.05, 0.1));
            }}
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => setAutoScale(true)}
          >
            Auto
          </Button>
          {/* Ampliar Button */}
          <div className="w-px h-5 bg-white/10 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setFullscreenOpen(true)}
            title="Ver em tela cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Ampliar
          </Button>
        </div>

        {/* Device Frame */}
        <div
          className="relative bg-black rounded-2xl shadow-2xl transition-all duration-200"
          style={{
            width: scaledWidth + 16,
            height: scaledHeight + 16,
            padding: 8,
          }}
        >
          {/* Screen Bezel Effect */}
          <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

          {/* Preview Container - dimensionado para o tamanho ESCALADO */}
          <div
            className="relative rounded-xl bg-white overflow-hidden"
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
          >
            {/* Iframe com transform scale */}
            <iframe
              src={dataUrl}
              title="Preview"
              className="border-0 pointer-events-none"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Slide Info Badge */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/60">
          <span>
            Slide {activeSlideIndex + 1} de {slides.length}
          </span>
          <span className="text-white/30">|</span>
          <span>{dimensions.width} × {dimensions.height}</span>
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <FullscreenPreviewDialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        html={previewHtml}
        dimensions={dimensions}
        slideIndex={activeSlideIndex}
        totalSlides={slides.length}
        onPrevSlide={goToPrevSlide}
        onNextSlide={goToNextSlide}
      />
    </>
  );
}

// ============================================================================
// FULLSCREEN PREVIEW DIALOG
// ============================================================================

interface FullscreenPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  html: string;
  dimensions: { width: number; height: number };
  slideIndex: number;
  totalSlides: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
}

function FullscreenPreviewDialog({
  open,
  onClose,
  html,
  dimensions,
  slideIndex,
  totalSlides,
  onPrevSlide,
  onNextSlide,
}: FullscreenPreviewDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);

  // Calcular escala para caber na tela
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Deixar margem para os controles
      const availableWidth = rect.width - 160;
      const availableHeight = rect.height - 100;

      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      setScale(Math.min(scaleX, scaleY, 1)); // Max 100%
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [open, dimensions]);

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  const canGoPrev = slideIndex > 0;
  const canGoNext = slideIndex < totalSlides - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-0">
        <DialogTitle className="sr-only">Preview em tela cheia</DialogTitle>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 w-10 h-10 text-white/60 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Navigation - Previous */}
        {canGoPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onPrevSlide}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        {/* Navigation - Next */}
        {canGoNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 text-white/60 hover:text-white hover:bg-white/10"
            onClick={onNextSlide}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}

        {/* Preview Container */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
          >
            <iframe
              src={dataUrl}
              title="Preview Fullscreen"
              className="border-0 pointer-events-none"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Slide Info */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80">
          <span className="font-medium">
            Slide {slideIndex + 1} de {totalSlides}
          </span>
          <span className="text-white/30">|</span>
          <span className="text-white/60">{dimensions.width} × {dimensions.height}</span>
          <span className="text-white/30">|</span>
          <span className="text-white/40 text-xs">← → para navegar • ESC para fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
