/**
 * Image Generation Service
 *
 * Handles AI image generation via OpenRouter.
 * Supports multiple models: Gemini, OpenAI, Seedream, Flux.
 */

import { openrouter } from "@/lib/ai/config";
import type {
  AiImageModel,
  AiImageOptions,
  ImageGenerationInput,
  ImageGenerationResult,
  PromptGenerationInput,
  PromptGenerationResult,
  GeneratedImage,
} from "./image-types";
import type { ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for image generation
 */
export const DEFAULT_IMAGE_MODEL: AiImageModel = "google/gemini-3-pro-image-preview";

/**
 * Maximum retries for image generation
 */
const MAX_RETRIES = 2;

/**
 * Request timeout in ms
 */
const REQUEST_TIMEOUT = 120000; // 2 minutes for image generation

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * System prompt for generating image prompts
 * Translates user preferences into detailed AI image prompts
 */
const IMAGE_PROMPT_SYSTEM = `You are an expert at creating detailed prompts for AI image generation.

Your task is to transform slide content and user preferences into a detailed, effective image generation prompt.

GUIDELINES:
1. Always specify the image format: "Instagram post, 1080x1350px, vertical 4:5 aspect ratio"
2. Include visual style descriptors (minimalist, modern, vibrant, etc.)
3. Specify color palette clearly
4. Include composition details (centered, rule of thirds, etc.)
5. Add mood and atmosphere elements
6. Keep prompts under 1000 characters for best results
7. Be specific but leave room for AI creativity

OUTPUT FORMAT (JSON only):
{
  "prompt": "detailed image generation prompt",
  "negative_prompt": "what to avoid in the image",
  "style_guidance": "brief style explanation for the user"
}

EXAMPLE:
Input: {
  "slideContent": "5 dicas para aumentar vendas",
  "options": {
    "color": "vibrante",
    "style": "moderno",
    "composition": "dinâmico",
    "mood": "energético"
  }
}

Output:
{
  "prompt": "Instagram post 1080x1350px vertical. Modern, energetic design featuring '5 dicas para aumentar vendas' in bold typography. Vibrant color scheme with electric blues, vivid oranges, and bright yellows. Dynamic diagonal composition with floating geometric shapes and subtle gradient overlays. Clean, professional business aesthetic with high energy. Soft drop shadows, contemporary sans-serif fonts, subtle glow effects on key elements.",
  "negative_prompt": "blurry, low quality, distorted text, unreadable, watermark, signature, ugly, poorly drawn, bad anatomy, extra limbs, disfigured, out of frame, cut off, low resolution, pixelated",
  "style_guidance": "A modern, high-energy design perfect for business content with vibrant gradients and bold typography."
}`;

/**
 * Generates an optimized prompt for AI image generation based on user options
 */
export async function generateImagePrompt(
  input: PromptGenerationInput
): Promise<PromptGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { slideContent, slideTitle, options, wizardContext } = input;

    // Build context for prompt generation
    const contextParts: string[] = [];

    if (slideTitle) {
      contextParts.push(`Title: "${slideTitle}"`);
    }
    contextParts.push(`Content: "${slideContent}"`);

    if (wizardContext?.theme) {
      contextParts.push(`Theme: ${wizardContext.theme}`);
    }
    if (wizardContext?.niche) {
      contextParts.push(`Niche: ${wizardContext.niche}`);
    }
    if (wizardContext?.targetAudience) {
      contextParts.push(`Target Audience: ${wizardContext.targetAudience}`);
    }

    // Build user preferences
    const preferencesParts: string[] = [];
    preferencesParts.push(`Color: ${options.color}`);
    preferencesParts.push(`Style: ${options.style}`);
    if (options.composition) {
      preferencesParts.push(`Composition: ${options.composition}`);
    }
    if (options.mood) {
      preferencesParts.push(`Mood: ${options.mood}`);
    }
    if (options.customColor) {
      preferencesParts.push(`Custom Color: ${options.customColor}`);
    }
    if (options.additionalContext) {
      preferencesParts.push(`Additional: ${options.additionalContext}`);
    }

    const userMessage = `Generate an AI image prompt for:

${contextParts.join("\n")}

User Preferences:
${preferencesParts.join("\n")}

Respond with JSON only: { prompt, negative_prompt, style_guidance }`;

    // Use a lightweight text model for prompt generation
    const promptModel = process.env.WIZARD_DEFAULT_MODEL || "openai/gpt-4.1-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: promptModel,
        messages: [
          { role: "system", content: IMAGE_PROMPT_SYSTEM },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[IMAGE-GEN] Prompt generation failed:", response.status, errorText);
      return {
        success: false,
        error: `Failed to generate prompt: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in prompt generation response",
      };
    }

    const parsed = JSON.parse(content);

    return {
      success: true,
      data: {
        prompt: parsed.prompt || "",
        negativePrompt: parsed.negative_prompt || "",
        styleGuidance: parsed.style_guidance || "",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Prompt generation timed out",
      };
    }
    console.error("[IMAGE-GEN] Error generating image prompt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generates an image using OpenRouter's image models
 */
export async function generateAiImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { slideNumber, slideContent, slideTitle, wizardContext, config } = input;

    if (!config.aiOptions) {
      return {
        success: false,
        error: "AI options not provided in config",
      };
    }

    // Step 1: Generate the optimized prompt
    console.log(`[IMAGE-GEN] Generating prompt for slide ${slideNumber}...`);

    const promptResult = await generateImagePrompt({
      slideContent,
      slideTitle,
      options: config.aiOptions,
      wizardContext,
    });

    if (!promptResult.success || !promptResult.data) {
      return {
        success: false,
        error: `Failed to generate prompt: ${promptResult.error}`,
      };
    }

    const { prompt, negativePrompt } = promptResult.data;
    console.log(`[IMAGE-GEN] Generated prompt:`, prompt.substring(0, 200) + "...");

    // Step 2: Call the image model
    console.log(`[IMAGE-GEN] Calling model ${config.aiOptions.model}...`);

    const model = config.aiOptions.model;
    const imageData = await callImageModel(model, prompt, negativePrompt);

    if (!imageData) {
      return {
        success: false,
        error: "Failed to generate image",
      };
    }

    // Step 3: Return the result
    const result: GeneratedImage = {
      id: `img-${Date.now()}-${slideNumber}`,
      slideNumber,
      method: "ai",
      model,
      imageUrl: imageData.url,
      thumbnailUrl: imageData.thumbnailUrl,
      config,
      promptUsed: prompt,
      createdAt: new Date(),
    };

    console.log(`[IMAGE-GEN] Image generated successfully: ${imageData.url}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[IMAGE-GEN] Error generating AI image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calls a specific image model via OpenRouter
 *
 * IMPORTANT: OpenRouter now requires the `modalities` parameter to be set
 * to ["image", "text"] for image generation models to work correctly.
 *
 * Reference: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
async function callImageModel(
  model: AiImageModel,
  prompt: string,
  negativePrompt?: string
): Promise<{ url: string; thumbnailUrl?: string } | null> {
  // Build the prompt with negative prompt if provided
  const fullPrompt = negativePrompt
    ? `${prompt}\n\nAvoid: ${negativePrompt}`
    : prompt;

  console.log(`[IMAGE-GEN] Calling model ${model} with modalities: ["image", "text"]`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
    },
    body: JSON.stringify({
      model,
      // REQUIRED: Tell OpenRouter we want both image and text output
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[IMAGE-GEN] Model ${model} failed:`, response.status, errorText);
    return null;
  }

  const data = await response.json();

  // Extract image URL from response
  // The structure varies by model, so we need to handle different formats
  const imageUrl = extractImageUrl(data, model);

  if (!imageUrl) {
    console.error("[IMAGE-GEN] No image URL in response:", JSON.stringify(data, null, 2));
    return null;
  }

  return { url: imageUrl };
}

/**
 * Extracts the image URL from various model response formats
 *
 * OpenRouter image models can return the image URL in different formats:
 * 1. Direct URL in choices[0].message.content
 * 2. JSON in content with url/image field
 * 3. Array in data field with url
 * 4. Direct url field at root
 *
 * When modalities: ["image", "text"] is used, the response typically includes:
 * - content: string (text description) OR
 * - content: array with image data OR
 * - url field directly in the message
 */
function extractImageUrl(response: unknown, model: AiImageModel): string | null {
  const data = response as Record<string, unknown>;

  console.log(`[IMAGE-GEN] Extracting URL from response, keys:`, Object.keys(data));

  // Format 1: OpenRouter 2025 format - nested in choices.message.content
  // When modalities: ["image", "text"] is used, images may be in content array
  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    const content = message?.content;

    // Handle array content format (new multimodal format)
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          // Check for image_url field (OpenAI-style format)
          if (itemObj.image_url && typeof itemObj.image_url === "object") {
            const imageUrl = (itemObj.image_url as Record<string, unknown>).url;
            if (typeof imageUrl === "string") {
              console.log(`[IMAGE-GEN] Found URL in content[].image_url.url`);
              return imageUrl;
            }
          }
          // Check for direct url field
          if (itemObj.url && typeof itemObj.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in content[].url`);
            return itemObj.url;
          }
          // Check for type: "image" with url
          if (itemObj.type === "image" && itemObj.url && typeof itemObj.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in content[] (type:image)`);
            return itemObj.url;
          }
        }
      }
    }

    // Handle string content format
    if (typeof content === "string") {
      // Direct URL
      if (content.startsWith("http://") || content.startsWith("https://")) {
        console.log(`[IMAGE-GEN] Found direct URL in content`);
        return content;
      }
      // Try parsing as JSON
      try {
        const parsed = JSON.parse(content);
        if (parsed.url && typeof parsed.url === "string") {
          console.log(`[IMAGE-GEN] Found URL in JSON content`);
          return parsed.url;
        }
        if (parsed.image && typeof parsed.image === "string") {
          console.log(`[IMAGE-GEN] Found image in JSON content`);
          return parsed.image;
        }
        // Check for images array in parsed content
        if (parsed.images && Array.isArray(parsed.images) && parsed.images[0]?.url) {
          console.log(`[IMAGE-GEN] Found URL in JSON images array`);
          return parsed.images[0].url;
        }
      } catch {
        // Not JSON, continue
      }
    }

    // Check for tool_calls (some models use this)
    if (Array.isArray(message?.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        const tc = toolCall as Record<string, unknown>;
        if (tc.output && typeof tc.output === "object") {
          const output = tc.output as Record<string, unknown>;
          if (output.url && typeof output.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in tool_calls.output`);
            return output.url;
          }
        }
      }
    }
  }

  // Format 2: Direct URL in data field (legacy format)
  if (typeof data.data === "string") {
    console.log(`[IMAGE-GEN] Found URL in data field (string)`);
    return data.data as string;
  }

  // Format 3: Array with url field in data
  if (Array.isArray(data.data)) {
    const firstItem = data.data[0] as Record<string, unknown> | undefined;
    if (firstItem?.url && typeof firstItem.url === "string") {
      console.log(`[IMAGE-GEN] Found URL in data[0].url`);
      return firstItem.url;
    }
    if (firstItem?.image && typeof firstItem.image === "string") {
      console.log(`[IMAGE-GEN] Found URL in data[0].image`);
      return firstItem.image;
    }
    // Check for b64_json base64 encoded image
    if (firstItem?.b64_json && typeof firstItem.b64_json === "string") {
      console.log(`[IMAGE-GEN] Found base64 image in data[0].b64_json`);
      // Convert base64 to data URL
      return `data:image/png;base64,${firstItem.b64_json}`;
    }
  }

  // Format 4: Direct url field at root
  if (data.url && typeof data.url === "string") {
    console.log(`[IMAGE-GEN] Found URL in root url field`);
    return data.url;
  }

  // Format 5: image field at root
  if (data.image && typeof data.image === "string") {
    console.log(`[IMAGE-GEN] Found URL in root image field`);
    return data.image;
  }

  console.log(`[IMAGE-GEN] No image URL found in response`);
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Checks if image generation service is available
 */
export function isImageGenerationAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Gets available AI image models
 */
export function getAvailableImageModels(): AiImageModel[] {
  return [
    "google/gemini-3-pro-image-preview",
    "openai/gpt-5-image",
    "bytedance-seed/seedream-4.5",
    "black-forest-labs/flux.2-max",
  ];
}

/**
 * Gets a user-friendly label for a model
 */
export function getModelLabel(model: AiImageModel): string {
  const labels: Record<AiImageModel, string> = {
    "google/gemini-3-pro-image-preview": "Gemini 3 Pro",
    "openai/gpt-5-image": "GPT-5 Image",
    "bytedance-seed/seedream-4.5": "Seedream 4.5",
    "black-forest-labs/flux.2-max": "Flux 2.0 Max",
  };
  return labels[model] || model;
}

/**
 * Validates image generation options
 */
export function validateImageOptions(options: AiImageOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.color === "personalizado" && !options.customColor) {
    errors.push("Custom color hex code is required when color is 'personalizado'");
  }

  if (options.customColor && !/^#[0-9A-Fa-f]{6}$/.test(options.customColor)) {
    errors.push("Custom color must be a valid hex code (e.g., #FF5733)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export types for external use
export type { PromptGenerationResult, ImageGenerationResult, GeneratedImage };
