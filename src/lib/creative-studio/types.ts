/**
 * Creative Studio — Shared Types
 *
 * Types used across components, API routes, and lib modules.
 */

// ========================================
// TEXT OVERLAY
// ========================================

export interface TextOverlayConfig {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold" | "black";
  textColor: string;
  textAlign: "left" | "center" | "right";
  position: TextPosition;
  backgroundColor?: string;
  backgroundOpacity?: number;
  shadow?: boolean;
  shadowConfig?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  lineHeight?: number;
  letterSpacing?: number;
  maxWidth?: number; // percentage 0-100
}

export type TextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

// ========================================
// IMAGE ANALYSIS (Modo 3 — Replicar)
// ========================================

export interface ImageAnalysis {
  layout: {
    type: string;
    description: string;
    zones: Array<{
      position: string;
      content: string;
    }>;
  };
  colors: {
    palette: string[];
    dominantColor: string;
    style: string;
  };
  typography: {
    detected: boolean;
    fonts: Array<{
      family: string;
      weight: string;
      size: string;
    }>;
  };
  texts: Array<{
    content: string;
    hierarchy: "heading" | "subheading" | "body" | "caption";
    position: string;
  }>;
  style: {
    mood: string;
    aesthetic: string;
    keywords: string[];
  };
}

// ========================================
// STYLE PRESETS
// ========================================

export interface StylePreset {
  id: string;
  name: string;
  category: "tribal" | "generic";
  promptPrefix: string;
  negativePrompt?: string;
  colorPalette: string[];
  previewGradient: string; // CSS gradient for preview card
  textConfig?: Partial<TextOverlayConfig>;
}

// ========================================
// TEMPLATES
// ========================================

export interface Template {
  slug: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string; // Contains {{variables}}
  variables: TemplateVariable[];
  defaultFormat: string;
  textConfigTemplate?: Partial<TextOverlayConfig>;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[]; // For select type
  required?: boolean;
}

// ========================================
// FORMAT DIMENSIONS
// ========================================

export interface FormatDimension {
  width: number;
  height: number;
  label: string;
  aspect: string;
}

// ========================================
// GENERATION
// ========================================

export interface GenerationParams {
  projectId?: number;
  mode: "text2img" | "img2img" | "inpaint";
  model: string;
  prompt: string;
  negativePrompt?: string;
  formats: string[];
  quantity: number;
  textMode?: "ai_embedded" | "canvas_overlay";
  textConfig?: TextOverlayConfig;
  sourceImage?: string; // URL for img2img
  strength?: number; // 0-1 for img2img
}

export interface GenerationResult {
  outputId: number;
  imageUrl: string;
  storageKey: string;
  format: string;
  width: number;
  height: number;
  modelUsed: string;
  generationTimeMs: number;
}

// ========================================
// CREATIVE MODELS (extended info)
// ========================================

export interface CreativeModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapability[];
  maxResolution?: number;
  supportsNegativePrompt?: boolean;
}

export type ModelCapability = "text2img" | "img2img" | "inpaint" | "vision";
