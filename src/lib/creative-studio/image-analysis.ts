/**
 * Creative Studio — Image Analysis via Gemini Vision
 *
 * Analyzes reference images for the Replicate mode (Mode 3).
 * Uses Gemini via OpenRouter to extract layout, colors, typography, texts, and style.
 */

import type { ImageAnalysis } from "./types";

const ANALYSIS_PROMPT = `Analyze this image in detail for the purpose of replicating its visual style. Return a JSON object with the following structure:

{
  "layout": {
    "type": "single-column" | "split" | "grid" | "centered" | "asymmetric" | "full-bleed",
    "description": "Brief description of the layout structure",
    "zones": [
      { "position": "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right", "content": "description of what's in this zone" }
    ]
  },
  "colors": {
    "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "dominantColor": "#hex",
    "style": "dark" | "light" | "vibrant" | "muted" | "monochrome" | "gradient"
  },
  "typography": {
    "detected": true/false,
    "fonts": [
      { "family": "serif" | "sans-serif" | "monospace" | "display" | "handwritten", "weight": "light" | "regular" | "bold" | "black", "size": "small" | "medium" | "large" | "hero" }
    ]
  },
  "texts": [
    { "content": "exact text found", "hierarchy": "heading" | "subheading" | "body" | "caption", "position": "top" | "center" | "bottom" | "left" | "right" }
  ],
  "style": {
    "mood": "professional" | "playful" | "dramatic" | "minimal" | "luxurious" | "energetic" | "calm" | "bold",
    "aesthetic": "modern" | "vintage" | "corporate" | "artistic" | "tech" | "organic" | "editorial" | "pop",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}

Return ONLY the JSON object, no markdown formatting or explanation.`;

export async function analyzeImage(
  imageBase64: string
): Promise<ImageAnalysis> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CreativeStudio:Analysis] OpenRouter error:", response.status, errorText);
    throw new Error(`Image analysis failed: ${response.status}`);
  }

  const data = await response.json();

  // Extract text content from response
  const content = extractTextContent(data);
  if (!content) {
    throw new Error("No analysis content in response");
  }

  // Parse JSON from response (may have markdown code fences)
  const jsonStr = content
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr) as ImageAnalysis;
    return validateAnalysis(parsed);
  } catch (parseError) {
    console.error("[CreativeStudio:Analysis] Failed to parse JSON:", jsonStr.slice(0, 300));
    throw new Error("Failed to parse image analysis response");
  }
}

function extractTextContent(data: unknown): string | null {
  const resp = data as Record<string, unknown>;

  if (Array.isArray(resp.choices)) {
    const firstChoice = resp.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    const content = message?.content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if (obj.type === "text" && typeof obj.text === "string") return obj.text;
        }
      }
    }
  }

  return null;
}

/**
 * Validates and provides safe defaults for the analysis object.
 */
function validateAnalysis(raw: Partial<ImageAnalysis>): ImageAnalysis {
  return {
    layout: raw.layout ?? {
      type: "centered",
      description: "Unknown layout",
      zones: [],
    },
    colors: raw.colors ?? {
      palette: ["#000000", "#ffffff"],
      dominantColor: "#000000",
      style: "dark",
    },
    typography: raw.typography ?? {
      detected: false,
      fonts: [],
    },
    texts: raw.texts ?? [],
    style: raw.style ?? {
      mood: "professional",
      aesthetic: "modern",
      keywords: [],
    },
  };
}
