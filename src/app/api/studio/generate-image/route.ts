/**
 * POST /api/studio/generate-image
 *
 * Gera uma imagem usando IA para o Studio.
 * Usa o serviço de geração de imagens existente.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateAiImage } from "@/lib/wizard-services/image-generation.service";
import { getStorageProvider } from "@/lib/storage";
import type { VisualStyle, ColorOption, AiImageModel } from "@/lib/wizard-services/image-types";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";

// ============================================================================
// TYPES
// ============================================================================

// Modelos de IA válidos para geração de imagem
const VALID_MODELS: AiImageModel[] = [
  "google/gemini-3-pro-image-preview",
  "openai/gpt-5-image",
  "bytedance-seed/seedream-4.5",
  "black-forest-labs/flux.2-max",
];

interface GenerateImageRequest {
  prompt: string;
  style?: "realistic" | "artistic" | "minimal" | "vibrant";
  model?: AiImageModel;
}

// Mapeamento de estilos simples para tipos do sistema
const STYLE_MAP: Record<string, { style: VisualStyle; color: ColorOption }> = {
  realistic: { style: "realista", color: "vibrante" },
  artistic: { style: "abstrato", color: "vibrante" },
  minimal: { style: "minimalista", color: "claro" },
  vibrant: { style: "moderno", color: "neon" },
};

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, style = "minimal", model } = body;

    if (!prompt || prompt.trim().length < 3) {
      throw new ValidationError("Prompt muito curto. Descreva a imagem desejada.");
    }

    // Validar modelo se fornecido, com logging de fallback
    let selectedModel: AiImageModel = "google/gemini-3-pro-image-preview";
    if (model) {
      if (VALID_MODELS.includes(model)) {
        selectedModel = model;
      } else {
        console.warn("[StudioGenerateImage] Invalid model, using fallback:", { requested: model, fallback: selectedModel });
      }
    }

    console.log(`[StudioGenerateImage] Generating image with model: ${selectedModel}`);
    console.log(`[StudioGenerateImage] Prompt: "${prompt.slice(0, 50)}..."`);

    // Mapear estilo para tipos do sistema, com logging de fallback
    const styleConfig = STYLE_MAP[style];
    if (!styleConfig) {
      console.warn("[StudioGenerateImage] Invalid style, using fallback:", { requested: style, fallback: "minimal" });
    }
    const finalStyleConfig = styleConfig || STYLE_MAP.minimal;

    // Gerar imagem usando o serviço existente
    const result = await generateAiImage({
      slideNumber: 1,
      totalSlides: 1,
      slideContent: prompt,
      config: {
        method: "ai",
        aiOptions: {
          model: selectedModel,
          style: finalStyleConfig.style,
          color: finalStyleConfig.color,
          mood: "calmo",
          additionalContext: "Imagem para Instagram, sem texto sobreposto, alta qualidade visual.",
        },
      },
    });

    if (!result.success || !result.data) {
      console.error("[StudioGenerateImage] Generation failed:", result.error);
      throw new Error(result.error || "Erro ao gerar imagem");
    }

    // A imagem vem como base64, precisamos fazer upload para storage
    const imageUrl = result.data.imageUrl;

    // Se for base64, fazer upload para storage
    if (imageUrl.startsWith("data:")) {
      const storage = getStorageProvider();
      const timestamp = Date.now();
      const key = `studio/${userId}/generated/${timestamp}.png`;

      // Converter base64 para buffer
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      const uploadResult = await storage.uploadFile(imageBuffer, key, {
        contentType: "image/png",
      });

      console.log(`[StudioGenerateImage] Image uploaded: ${uploadResult.url}`);

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        prompt: prompt,
      });
    }

    // Se já for URL, retornar diretamente
    return NextResponse.json({
      success: true,
      url: imageUrl,
      prompt: prompt,
    });

  } catch (error) {
    const appError = toAppError(error, "STUDIO_GENERATE_IMAGE_FAILED");
    console.error("[StudioGenerateImage]", appError.code, ":", appError.message);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(appError),
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
}
