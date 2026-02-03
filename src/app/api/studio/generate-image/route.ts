/**
 * POST /api/studio/generate-image
 *
 * Gera uma imagem usando IA para o Studio.
 * Suporta dois modos:
 * 1. Modular: campos estruturados (fields) concatenados de forma previsível
 * 2. Legado: prompt simples com estilo
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStorageProvider } from "@/lib/storage";
import type { AiImageModel } from "@/lib/wizard-services/image-types";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";
import { buildPrompt, validateFields, buildSimplePrompt } from "@/lib/image-generation/build-prompt";
import type { ImagePromptFields } from "@/types/image-generation";

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

/**
 * Request body para geração de imagem
 * Suporta dois formatos:
 * 1. fields: objeto com campos estruturados (novo sistema modular)
 * 2. prompt: string simples (modo legado)
 */
interface GenerateImageRequest {
  /** Campos estruturados para geração modular */
  fields?: ImagePromptFields;
  /** Prompt simples (modo legado) */
  prompt?: string;
  /** Estilo simples (modo legado) */
  style?: "realistic" | "artistic" | "minimal" | "vibrant";
  /** Modelo de IA a usar */
  model?: AiImageModel;
  /** ID do preset aplicado (para tracking) */
  presetId?: string;
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extracts image URL from OpenRouter response
 * Handles various response formats from different models
 */
function extractImageUrlFromResponse(response: unknown): string | null {
  const data = response as Record<string, unknown>;

  const buildDataUrl = (base64: string, mimeType?: string): string => {
    const safeMimeType = mimeType && typeof mimeType === "string" ? mimeType : "image/png";
    return `data:${safeMimeType};base64,${base64}`;
  };

  // Check choices array (standard OpenRouter format)
  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;

    // Check for images array (Gemini format)
    if (Array.isArray(message?.images) && message.images.length > 0) {
      const firstImage = message.images[0] as Record<string, unknown>;

      // Check inlineData (Gemini base64 format)
      if (firstImage.inlineData && typeof firstImage.inlineData === "object") {
        const inlineData = firstImage.inlineData as Record<string, unknown>;
        if (inlineData.data && typeof inlineData.data === "string") {
          return buildDataUrl(inlineData.data, inlineData.mimeType as string | undefined);
        }
      }

      // Check direct url
      if (firstImage.url && typeof firstImage.url === "string") {
        return firstImage.url;
      }

      // Check image_url wrapper
      if (firstImage.image_url && typeof firstImage.image_url === "object") {
        const imageUrl = (firstImage.image_url as Record<string, unknown>).url;
        if (typeof imageUrl === "string") return imageUrl;
      }
    }

    // Check content array (multimodal format)
    const content = message?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.image_url && typeof itemObj.image_url === "object") {
            const url = (itemObj.image_url as Record<string, unknown>).url;
            if (typeof url === "string") return url;
          }
          if (itemObj.url && typeof itemObj.url === "string") {
            return itemObj.url;
          }
        }
      }
    }

    // Check string content (direct URL or JSON)
    if (typeof content === "string") {
      if (content.startsWith("http://") || content.startsWith("https://")) {
        return content;
      }
      try {
        const parsed = JSON.parse(content);
        if (parsed.url && typeof parsed.url === "string") return parsed.url;
        if (parsed.image && typeof parsed.image === "string") return parsed.image;
      } catch (parseError) {
        // Content is not JSON - this is expected for plain text/URL responses
        console.debug("[StudioGenerateImage] Content is not JSON, trying other extraction methods");
      }
    }
  }

  // Check direct fields
  if (data.url && typeof data.url === "string") return data.url;
  if (data.image && typeof data.image === "string") return data.image;

  return null;
}

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
    const { fields, prompt, style = "minimal", model, presetId } = body;

    // Validar modelo se fornecido
    let selectedModel: AiImageModel = "google/gemini-3-pro-image-preview";
    if (model) {
      if (VALID_MODELS.includes(model)) {
        selectedModel = model;
      } else {
        console.warn("[StudioGenerateImage] Invalid model, using fallback:", { requested: model, fallback: selectedModel });
      }
    }

    let builtPrompt: { prompt: string; negativePrompt: string; previewText: string };
    let isModularMode = false;

    // ═══════════════════════════════════════════════════════════════
    // MODO 1: Campos Estruturados (Modular)
    // ═══════════════════════════════════════════════════════════════
    if (fields) {
      isModularMode = true;

      // Validar campos obrigatórios
      const validation = validateFields(fields);
      if (!validation.valid) {
        throw new ValidationError(validation.errors.join(". "));
      }

      // Construir prompt de forma previsível
      builtPrompt = buildPrompt(fields);

      console.log(`[StudioGenerateImage] Modular mode with model: ${selectedModel}`);
      console.log(`[StudioGenerateImage] Preset: ${presetId || "none"}`);
      console.log(`[StudioGenerateImage] Preview: "${builtPrompt.previewText}"`);
      console.log(`[StudioGenerateImage] Full prompt: "${builtPrompt.prompt.slice(0, 200)}..."`);
    }
    // ═══════════════════════════════════════════════════════════════
    // MODO 2: Prompt Simples (Legado)
    // ═══════════════════════════════════════════════════════════════
    else if (prompt) {
      if (prompt.trim().length < 3) {
        throw new ValidationError("Prompt muito curto. Descreva a imagem desejada.");
      }

      builtPrompt = buildSimplePrompt(prompt, style);

      console.log(`[StudioGenerateImage] Legacy mode with model: ${selectedModel}`);
      console.log(`[StudioGenerateImage] Style: ${style}`);
      console.log(`[StudioGenerateImage] Prompt: "${builtPrompt.prompt.slice(0, 150)}..."`);
    }
    // ═══════════════════════════════════════════════════════════════
    // ERRO: Nenhum input válido
    // ═══════════════════════════════════════════════════════════════
    else {
      throw new ValidationError("Forneça 'fields' (modo modular) ou 'prompt' (modo simples).");
    }

    // ═══════════════════════════════════════════════════════════════
    // CHAMAR API DE GERAÇÃO
    // ═══════════════════════════════════════════════════════════════
    const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: selectedModel,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: builtPrompt.prompt }],
        max_tokens: 1000,
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("[StudioGenerateImage] Generation failed:", imageResponse.status, errorText);
      throw new Error(`Erro ao gerar imagem: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = extractImageUrlFromResponse(imageData);

    if (!imageUrl) {
      console.error("[StudioGenerateImage] No image URL in response:", JSON.stringify(imageData).slice(0, 500));
      throw new Error("Não foi possível extrair a imagem da resposta");
    }

    // A imagem vem como base64 ou URL, precisamos processar
    const generatedImageUrl = imageUrl;
    let finalUrl = generatedImageUrl;

    // Se for base64, fazer upload para storage
    if (generatedImageUrl.startsWith("data:")) {
      const storage = getStorageProvider();
      const timestamp = Date.now();
      const key = `studio/${userId}/generated/${timestamp}.png`;

      // Converter base64 para buffer
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      const uploadResult = await storage.uploadFile(imageBuffer, key, {
        contentType: "image/png",
      });

      console.log(`[StudioGenerateImage] Image uploaded: ${uploadResult.url}`);
      finalUrl = uploadResult.url;
    }

    // Retornar resposta com informações adicionais para modo modular
    return NextResponse.json({
      success: true,
      url: finalUrl,
      // Informações do prompt para debug/display
      promptUsed: builtPrompt.prompt,
      negativePrompt: builtPrompt.negativePrompt,
      previewText: builtPrompt.previewText,
      // Metadata
      mode: isModularMode ? "modular" : "legacy",
      presetId: presetId || null,
      model: selectedModel,
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
