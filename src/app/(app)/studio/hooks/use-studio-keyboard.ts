/**
 * useStudioKeyboard Hook
 *
 * Keyboard shortcuts para o Studio Editor:
 * - Ctrl/Cmd + S: Salvar projeto
 * - Ctrl/Cmd + D: Duplicar slide atual
 * - Arrow Left/Right: Navegar entre slides
 * - Delete/Backspace: Remover slide atual (com confirmação)
 * - Escape: Desselecionar campo de texto
 */

"use client";

import { useEffect, useCallback } from "react";
import { useStudioStore, useCanRemoveSlide, useSlides } from "@/stores/studio-store";
import { toast } from "sonner";

interface UseStudioKeyboardOptions {
  onSave: () => Promise<void>;
  enabled?: boolean;
}

export function useStudioKeyboard({ onSave, enabled = true }: UseStudioKeyboardOptions) {
  const slides = useSlides();
  const canRemoveSlide = useCanRemoveSlide();
  const activeSlideIndex = useStudioStore((state) => state.activeSlideIndex);
  const setActiveSlide = useStudioStore((state) => state.setActiveSlide);
  const duplicateSlide = useStudioStore((state) => state.duplicateSlide);
  const removeSlide = useStudioStore((state) => state.removeSlide);

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input/textarea
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + S: Salvar
      if (modKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        await onSave();
        return;
      }

      // Ctrl/Cmd + D: Duplicar slide
      if (modKey && event.key.toLowerCase() === "d" && !isTyping) {
        event.preventDefault();
        const currentSlide = slides[activeSlideIndex];
        if (currentSlide) {
          duplicateSlide(currentSlide.id);
          toast.success("Slide duplicado");
        }
        return;
      }

      // Não processar outros atalhos se estiver digitando
      if (isTyping) {
        // Escape para sair do input
        if (event.key === "Escape") {
          (target as HTMLElement).blur();
        }
        return;
      }

      // Arrow Left: Slide anterior
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (activeSlideIndex > 0) {
          setActiveSlide(activeSlideIndex - 1);
        }
        return;
      }

      // Arrow Right: Próximo slide
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (activeSlideIndex < slides.length - 1) {
          setActiveSlide(activeSlideIndex + 1);
        }
        return;
      }

      // Delete/Backspace: Remover slide (com confirmação)
      if ((event.key === "Delete" || event.key === "Backspace") && canRemoveSlide) {
        event.preventDefault();
        const currentSlide = slides[activeSlideIndex];
        if (currentSlide) {
          // Confirmação simples via confirm (pode ser substituído por modal)
          if (confirm(`Remover slide ${activeSlideIndex + 1}?`)) {
            removeSlide(currentSlide.id);
            toast.success("Slide removido");
          }
        }
        return;
      }

      // Números 1-9: Ir para slide específico
      const slideNumber = parseInt(event.key);
      if (!isNaN(slideNumber) && slideNumber >= 1 && slideNumber <= slides.length) {
        event.preventDefault();
        setActiveSlide(slideNumber - 1);
        return;
      }
    },
    [
      slides,
      activeSlideIndex,
      canRemoveSlide,
      setActiveSlide,
      duplicateSlide,
      removeSlide,
      onSave,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Retorna lista de atalhos para exibição de ajuda
  return {
    shortcuts: [
      { key: "Ctrl/⌘ + S", action: "Salvar projeto" },
      { key: "Ctrl/⌘ + D", action: "Duplicar slide" },
      { key: "← →", action: "Navegar slides" },
      { key: "1-9", action: "Ir para slide" },
      { key: "Delete", action: "Remover slide" },
      { key: "Escape", action: "Sair do campo" },
    ],
  };
}
