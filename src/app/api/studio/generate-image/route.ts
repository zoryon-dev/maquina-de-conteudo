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
      { success: false, error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, style = "minimal", model } = body;

    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Prompt muito curto. Descreva a imagem desejada." },
        { status: 400 }
      );
    }

    // Validar modelo se fornecido
    const selectedModel: AiImageModel = model && VALID_MODELS.includes(model)
      ? model
      : "google/gemini-3-pro-image-preview";

    console.log(`[STUDIO-GENERATE-IMAGE] Generating image with model: ${selectedModel}`);
    console.log(`[STUDIO-GENERATE-IMAGE] Prompt: "${prompt.slice(0, 50)}..."`);

    // Mapear estilo para tipos do sistema
    const styleConfig = STYLE_MAP[style] || STYLE_MAP.minimal;

    // Gerar imagem usando o serviço existente
    const result = await generateAiImage({
      slideNumber: 1,
      totalSlides: 1,
      slideContent: prompt,
      config: {
        method: "ai",
        aiOptions: {
          model: selectedModel,
          style: styleConfig.style,
          color: styleConfig.color,
          mood: "calmo",
          additionalContext: "Imagem para Instagram, sem texto sobreposto, alta qualidade visual.",
        },
      },
    });

    if (!result.success || !result.data) {
      console.error("[STUDIO-GENERATE-IMAGE] Generation failed:", result.error);
      return NextResponse.json(
        { success: false, error: result.error || "Erro ao gerar imagem" },
        { status: 500 }
      );
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

      console.log(`[STUDIO-GENERATE-IMAGE] Image uploaded: ${uploadResult.url}`);

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
    console.error("[STUDIO-GENERATE-IMAGE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar imagem",
      },
      { status: 500 }
    );
  }
}
