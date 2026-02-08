/**
 * Creative Studio — Constants
 *
 * Format dimensions, model capabilities, storage keys, and defaults.
 */

import type { FormatDimension, CreativeModelInfo } from "./types";

// ========================================
// FORMAT DIMENSIONS
// ========================================

export const FORMAT_DIMENSIONS: Record<string, FormatDimension> = {
  "1:1": { width: 1080, height: 1080, label: "Feed Quadrado", aspect: "1:1" },
  "4:5": { width: 1080, height: 1350, label: "Feed Retrato", aspect: "4:5" },
  "9:16": { width: 1080, height: 1920, label: "Stories/Reels", aspect: "9:16" },
  "1.91:1": { width: 1200, height: 628, label: "Landscape", aspect: "1.91:1" },
  "2:3": { width: 1000, height: 1500, label: "Pinterest", aspect: "2:3" },
  "16:9": { width: 1920, height: 1080, label: "Cover", aspect: "16:9" },
} as const;

export const FORMAT_OPTIONS = Object.entries(FORMAT_DIMENSIONS).map(
  ([key, dim]) => ({
    value: key,
    label: dim.label,
    width: dim.width,
    height: dim.height,
  })
);

// ========================================
// CREATIVE MODELS (extended from ai/config)
// ========================================

export const CREATIVE_MODELS: CreativeModelInfo[] = [
  {
    id: "google/gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    provider: "Google",
    capabilities: ["text2img", "img2img", "vision"],
    supportsNegativePrompt: false,
  },
  {
    id: "openai/gpt-5-image",
    name: "GPT-5 Image",
    provider: "OpenAI",
    capabilities: ["text2img", "img2img"],
    supportsNegativePrompt: false,
  },
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    provider: "ByteDance",
    capabilities: ["text2img"],
    supportsNegativePrompt: true,
  },
  {
    id: "black-forest-labs/flux.2-max",
    name: "Flux 2 Max",
    provider: "Black Forest Labs",
    capabilities: ["text2img"],
    supportsNegativePrompt: true,
  },
];

export const DEFAULT_CREATIVE_MODEL = "openai/gpt-5-image";

// ========================================
// STORAGE KEYS
// ========================================

export const STORAGE_PREFIX = "creative";

export function getUploadKey(userId: string, filename: string): string {
  return `${STORAGE_PREFIX}/${userId}/uploads/${Date.now()}-${filename}`;
}

export function getOutputKey(
  userId: string,
  projectId: number,
  format: string,
  index: number
): string {
  const safeFormat = format.replace(/[:/]/g, "x");
  return `${STORAGE_PREFIX}/${userId}/outputs/${projectId}/${safeFormat}_${index}.png`;
}

export function getOverlayKey(userId: string): string {
  return `${STORAGE_PREFIX}/${userId}/overlays/${Date.now()}-overlay.png`;
}

export function getResizedKey(userId: string, format: string): string {
  const safeFormat = format.replace(/[:/]/g, "x");
  return `${STORAGE_PREFIX}/${userId}/resized/${Date.now()}-${safeFormat}.png`;
}

// ========================================
// LIMITS & DEFAULTS
// ========================================

export const MAX_QUANTITY_PER_FORMAT = 4;
export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const POLLING_INTERVAL_MS = 3000;

// ========================================
// AVAILABLE FONTS (for text overlay)
// ========================================

export const AVAILABLE_FONTS = [
  { value: "Inter", label: "Inter", category: "sans-serif" },
  { value: "Montserrat", label: "Montserrat", category: "sans-serif" },
  { value: "Roboto Mono", label: "Roboto Mono", category: "monospace" },
  { value: "Playfair Display", label: "Playfair Display", category: "serif" },
  { value: "Arial", label: "Arial", category: "sans-serif" },
  { value: "Georgia", label: "Georgia", category: "serif" },
] as const;

// Safe zone percentage for text overlay edges
export const TEXT_SAFE_ZONE_PERCENT = 5;
