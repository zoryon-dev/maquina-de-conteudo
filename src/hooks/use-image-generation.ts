"use client";

/**
 * useImageGeneration Hook
 *
 * Hook para gerenciar geração de imagens com o sistema modular.
 * Encapsula chamadas à API e gerenciamento de estado.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ImagePromptFields } from "@/types/image-generation";

// ============================================================================
// TYPES
// ============================================================================

interface GenerateImageResponse {
  success: boolean;
  url?: string;
  promptUsed?: string;
  negativePrompt?: string;
  previewText?: string;
  mode?: "modular" | "legacy";
  presetId?: string | null;
  model?: string;
  error?: string;
  code?: string;
}

interface UseImageGenerationOptions {
  /** Callback quando imagem é gerada com sucesso */
  onSuccess?: (url: string, response: GenerateImageResponse) => void;
  /** Callback quando ocorre erro */
  onError?: (error: string) => void;
  /** Mostrar toast de sucesso */
  showSuccessToast?: boolean;
  /** Mostrar toast de erro */
  showErrorToast?: boolean;
}

interface UseImageGenerationReturn {
  /** Gerar imagem com campos modulares */
  generateWithFields: (fields: ImagePromptFields, presetId?: string) => Promise<string | null>;
  /** Gerar imagem com prompt simples (legado) */
  generateWithPrompt: (prompt: string, style?: "realistic" | "artistic" | "minimal" | "vibrant") => Promise<string | null>;
  /** Se está gerando */
  isGenerating: boolean;
  /** URL da última imagem gerada */
  lastGeneratedUrl: string | null;
  /** Última resposta da API */
  lastResponse: GenerateImageResponse | null;
  /** Limpar estado */
  reset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useImageGeneration(
  options: UseImageGenerationOptions = {}
): UseImageGenerationReturn {
  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<GenerateImageResponse | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // GERAR COM CAMPOS MODULARES
  // ═══════════════════════════════════════════════════════════════
  const generateWithFields = useCallback(
    async (fields: ImagePromptFields, presetId?: string): Promise<string | null> => {
      setIsGenerating(true);
      setLastGeneratedUrl(null);
      setLastResponse(null);

      try {
        const response = await fetch("/api/studio/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields, presetId }),
        });

        const data: GenerateImageResponse = await response.json();
        setLastResponse(data);

        if (!data.success || !data.url) {
          const errorMsg = data.error || "Erro ao gerar imagem";
          if (showErrorToast) {
            toast.error(errorMsg);
          }
          onError?.(errorMsg);
          return null;
        }

        setLastGeneratedUrl(data.url);
        if (showSuccessToast) {
          toast.success("Imagem gerada com sucesso!");
        }
        onSuccess?.(data.url, data);
        return data.url;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro ao gerar imagem";
        if (showErrorToast) {
          toast.error(errorMsg);
        }
        onError?.(errorMsg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [onSuccess, onError, showSuccessToast, showErrorToast]
  );

  // ═══════════════════════════════════════════════════════════════
  // GERAR COM PROMPT SIMPLES (LEGADO)
  // ═══════════════════════════════════════════════════════════════
  const generateWithPrompt = useCallback(
    async (
      prompt: string,
      style: "realistic" | "artistic" | "minimal" | "vibrant" = "minimal"
    ): Promise<string | null> => {
      setIsGenerating(true);
      setLastGeneratedUrl(null);
      setLastResponse(null);

      try {
        const response = await fetch("/api/studio/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, style }),
        });

        const data: GenerateImageResponse = await response.json();
        setLastResponse(data);

        if (!data.success || !data.url) {
          const errorMsg = data.error || "Erro ao gerar imagem";
          if (showErrorToast) {
            toast.error(errorMsg);
          }
          onError?.(errorMsg);
          return null;
        }

        setLastGeneratedUrl(data.url);
        if (showSuccessToast) {
          toast.success("Imagem gerada com sucesso!");
        }
        onSuccess?.(data.url, data);
        return data.url;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro ao gerar imagem";
        if (showErrorToast) {
          toast.error(errorMsg);
        }
        onError?.(errorMsg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [onSuccess, onError, showSuccessToast, showErrorToast]
  );

  // ═══════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════
  const reset = useCallback(() => {
    setIsGenerating(false);
    setLastGeneratedUrl(null);
    setLastResponse(null);
  }, []);

  return {
    generateWithFields,
    generateWithPrompt,
    isGenerating,
    lastGeneratedUrl,
    lastResponse,
    reset,
  };
}
