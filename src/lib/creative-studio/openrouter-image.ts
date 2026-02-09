/**
 * Creative Studio — OpenRouter Image Client
 *
 * Handles text-to-image and image-to-image generation via OpenRouter API.
 * Reuses the same response extraction pattern from /api/studio/generate-image.
 */

import { getStorageProvider } from "@/lib/storage";
import { ConfigError } from "@/lib/errors";

interface GenerateImageParams {
  prompt: string;
  model: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  sourceImage?: string; // base64 data URL for img2img
}

interface GenerateImageResult {
  url: string;
  storageKey: string;
  timeMs: number;
}

export async function generateCreativeImage(
  params: GenerateImageParams,
  userId: string,
  outputStorageKey: string
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ConfigError("OPENROUTER_API_KEY is not configured. Image generation requires an OpenRouter API key.");
  }

  const start = Date.now();

  // Build messages
  const messages: Array<{ role: string; content: unknown }> = [];

  if (params.sourceImage) {
    // img2img: send reference image + prompt
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: params.sourceImage },
        },
        {
          type: "text",
          text: params.prompt,
        },
      ],
    });
  } else {
    // text2img: just the prompt
    messages.push({
      role: "user",
      content: params.prompt,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: params.model,
        modalities: ["image", "text"],
        messages,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CreativeStudio] OpenRouter error:", response.status, errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = extractImageUrlFromResponse(data);

  if (!imageUrl) {
    console.error("[CreativeStudio] No image in response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Could not extract image from generation response");
  }

  // Upload to storage
  const storage = getStorageProvider();
  let uploadUrl: string;

  if (imageUrl.startsWith("data:")) {
    // Base64 data URL — convert to buffer and upload
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const uploadResult = await storage.uploadFile(imageBuffer, outputStorageKey, {
      contentType: "image/png",
    });
    uploadUrl = uploadResult.url;
  } else {
    // Remote URL — fetch and re-upload to our storage
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error(`Failed to fetch generated image: ${imageResp.status}`);
    const imageBuffer = Buffer.from(await imageResp.arrayBuffer());

    const uploadResult = await storage.uploadFile(imageBuffer, outputStorageKey, {
      contentType: "image/png",
    });
    uploadUrl = uploadResult.url;
  }

  const timeMs = Date.now() - start;
  console.log(`[CreativeStudio] Image generated in ${timeMs}ms, stored at ${outputStorageKey}`);

  return {
    url: uploadUrl,
    storageKey: outputStorageKey,
    timeMs,
  };
}

/**
 * Extracts image URL from OpenRouter response.
 * Handles various response formats from different models.
 */
function extractImageUrlFromResponse(response: unknown): string | null {
  const data = response as Record<string, unknown>;

  const buildDataUrl = (base64: string, mimeType?: string): string => {
    const safeMimeType = mimeType && typeof mimeType === "string" ? mimeType : "image/png";
    return `data:${safeMimeType};base64,${base64}`;
  };

  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;

    // Gemini images array
    if (Array.isArray(message?.images) && message.images.length > 0) {
      const firstImage = message.images[0] as Record<string, unknown>;
      if (firstImage.inlineData && typeof firstImage.inlineData === "object") {
        const inlineData = firstImage.inlineData as Record<string, unknown>;
        if (inlineData.data && typeof inlineData.data === "string") {
          return buildDataUrl(inlineData.data, inlineData.mimeType as string | undefined);
        }
      }
      if (firstImage.url && typeof firstImage.url === "string") return firstImage.url;
      if (firstImage.image_url && typeof firstImage.image_url === "object") {
        const imageUrl = (firstImage.image_url as Record<string, unknown>).url;
        if (typeof imageUrl === "string") return imageUrl;
      }
    }

    // Multimodal content array
    const content = message?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.image_url && typeof itemObj.image_url === "object") {
            const url = (itemObj.image_url as Record<string, unknown>).url;
            if (typeof url === "string") return url;
          }
          if (itemObj.url && typeof itemObj.url === "string") return itemObj.url;
        }
      }
    }

    // String content (URL or JSON)
    if (typeof content === "string") {
      if (content.startsWith("http://") || content.startsWith("https://")) return content;
      try {
        const parsed = JSON.parse(content);
        if (parsed.url && typeof parsed.url === "string") return parsed.url;
        if (parsed.image && typeof parsed.image === "string") return parsed.image;
      } catch {
        // Not JSON — expected for text responses
      }
    }
  }

  if (data.url && typeof data.url === "string") return data.url;
  if (data.image && typeof data.image === "string") return data.image;

  return null;
}
