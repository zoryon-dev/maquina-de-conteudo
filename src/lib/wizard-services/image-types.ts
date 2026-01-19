/**
 * Image Generation Types
 *
 * Types for image generation via OpenRouter and ScreenshotOne.
 * Supports both AI-generated images and HTML templates.
 */

// ============================================================================
// AI IMAGE GENERATION
// ============================================================================

/**
 * Available AI image models via OpenRouter
 */
export const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
} as const;

export type AiImageModel = (typeof AI_IMAGE_MODELS)[keyof typeof AI_IMAGE_MODELS];

/**
 * Image generation method
 */
export type ImageGenerationMethod = "ai" | "html-template";

/**
 * Color palette options for image generation
 */
export const COLOR_OPTIONS = {
  VIBRANT: "vibrante",
  PASTEL: "pastel",
  DARK: "escuro",
  LIGHT: "claro",
  NEON: "neon",
  EARTH: "terroso",
  MONOCHROME: "monocromático",
  CUSTOM: "personalizado",
} as const;

export type ColorOption = (typeof COLOR_OPTIONS)[keyof typeof COLOR_OPTIONS];

/**
 * Visual style options for image generation
 */
export const VISUAL_STYLES = {
  MINIMALIST: "minimalista",
  MODERN: "moderno",
  VINTAGE: "vintage",
  ABSTRACT: "abstrato",
  REALISTIC: "realista",
  CARTOON: "cartoon",
  WATERCOLOR: "aquarela",
  CYBERPUNK: "cyberpunk",
  GRUNGE: "grunge",
  ELEGANT: "elegante",
  PLAYFUL: "lúdico",
  PROFESSIONAL: "profissional",
} as const;

export type VisualStyle = (typeof VISUAL_STYLES)[keyof typeof VISUAL_STYLES];

/**
 * Composition options for image layout
 */
export const COMPOSITION_OPTIONS = {
  CENTERED: "centralizado",
  RULE_OF_THIRDS: "terços",
  SYMMETRICAL: "simétrico",
  ASYMMETRICAL: "assimétrico",
  DYNAMIC: "dinâmico",
  MINIMAL: "minimal",
} as const;

export type CompositionOption = (typeof COMPOSITION_OPTIONS)[keyof typeof COMPOSITION_OPTIONS];

/**
 * Mood options for image generation
 */
export const MOOD_OPTIONS = {
  ENERGETIC: "energético",
  CALM: "calmo",
  MYSTERIOUS: "misterioso",
  HAPPY: "alegre",
  SERIOUS: "sério",
  DRAMATIC: "dramático",
  ROMANTIC: "romântico",
  PLAYFUL: "lúdico",
  PROFESSIONAL: "profissional",
} as const;

export type MoodOption = (typeof MOOD_OPTIONS)[keyof typeof MOOD_OPTIONS];

/**
 * AI Image generation options
 */
export interface AiImageOptions {
  model: AiImageModel;
  color: ColorOption;
  customColor?: string; // Hex code when color is "personalizado"
  style: VisualStyle;
  composition?: CompositionOption;
  mood?: MoodOption;
  additionalContext?: string;
}

// ============================================================================
// HTML TEMPLATE GENERATION
// ============================================================================

/**
 * ScreenshotOne template options
 */
export const HTML_TEMPLATES = {
  // Gradient-based templates
  GRADIENT_SOLID: "gradiente-solid",
  GRADIENT_LINEAR: "gradiente-linear",
  GRADIENT_RADIAL: "gradiente-radial",
  GRADIENT_MESH: "gradiente-mesh",

  // Text-focused templates
  TYPOGRAPHY_BOLD: "tipografia-bold",
  TYPOGRAPHY_CLEAN: "tipografia-clean",
  TYPOGRAPHY_OVERLAY: "tipografia-overlay",

  // Pattern-based templates
  PATTERN_GEOMETRIC: "padrão-geométrico",
  PATTERN_DOTS: "padrão-círculos",
  PATTERN_LINES: "padrão-linhas",
  PATTERN_WAVES: "padrão-ondas",

  // Style-specific templates
  GLASSMORPHISM: "glassmorphism",
  NEOMORPHISM: "neomorphism",
  BRUTALIST: "brutalista",
  NEUMORPHISM: "neumorphism",

  // Theme-based templates
  DARK_MODE: "dark-mode",
  LIGHT_MODE: "light-mode",
  NEON_GLOW: "neon-glow",
  SUNSET_VIBES: "sunset-vibes",
} as const;

export type HtmlTemplate = (typeof HTML_TEMPLATES)[keyof typeof HTML_TEMPLATES];

/**
 * HTML template generation options
 */
export interface HtmlTemplateOptions {
  template: HtmlTemplate;
  primaryColor: string; // Hex code
  secondaryColor?: string; // Hex code
  backgroundColor?: string; // Hex code
  textColor?: string; // Hex code
  overlay?: boolean;
  opacity?: number; // 0-1
}

// ============================================================================
// IMAGE GENERATION CONFIG
// ============================================================================

/**
 * Complete image generation configuration
 */
export interface ImageGenerationConfig {
  method: ImageGenerationMethod;
  aiOptions?: AiImageOptions;
  htmlOptions?: HtmlTemplateOptions;
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  id: string;
  slideNumber: number;
  method: ImageGenerationMethod;
  model?: AiImageModel; // For AI images
  template?: HtmlTemplate; // For HTML templates
  imageUrl: string;
  thumbnailUrl?: string;
  config: ImageGenerationConfig;
  promptUsed?: string; // The actual prompt sent to AI
  createdAt: Date;
}

/**
 * Input for image generation
 */
export interface ImageGenerationInput {
  slideNumber: number;
  slideContent: string; // The text/content of the slide
  slideTitle?: string;
  wizardContext?: {
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
    tone?: string;
  };
  config: ImageGenerationConfig;
}

// ============================================================================
// SERVICE RESULT
// ============================================================================

export interface ImageGenerationResult {
  success: boolean;
  data?: GeneratedImage;
  error?: string;
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Input for generating the AI image prompt
 */
export interface PromptGenerationInput {
  slideContent: string;
  slideTitle?: string;
  options: AiImageOptions;
  wizardContext?: {
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
  };
}

/**
 * Result from prompt generation
 */
export interface PromptGenerationResult {
  success: boolean;
  data?: {
    prompt: string;
    negativePrompt?: string;
    styleGuidance: string;
  };
  error?: string;
}

// ============================================================================
// SCREENSHOT ONE CONFIG
// ============================================================================

/**
 * ScreenshotOne API configuration
 */
export interface ScreenshotOneConfig {
  accessKey: string;
  endpoint?: string;
}

/**
 * ScreenshotOne render options
 */
export interface ScreenshotOneRenderOptions {
  url: string; // The HTML URL to render
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number; // 1-100
  deviceScaleFactor?: number;
  fullPage?: boolean;
}

/**
 * Default Instagram dimensions
 */
export const INSTAGRAM_DIMENSIONS = {
  width: 1080,
  height: 1350,
} as const;

/**
 * Supported output formats
 */
export type ImageFormat = "png" | "jpeg" | "webp";
