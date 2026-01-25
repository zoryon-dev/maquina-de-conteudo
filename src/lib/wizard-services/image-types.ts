/**
 * Image Generation Types
 *
 * Types for image generation via OpenRouter and ScreenshotOne.
 * Simplified to 4 HTML templates + AI generation.
 *
 * Flow:
 * - Cover (CAPA): First image - user chooses AI or one of 4 templates
 * - Posts (COMUNS): Remaining images - user chooses AI or one of 4 templates
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
 * Available HTML templates - simplified to 4 options
 * Each template follows the pattern from .context/wizard-prompts/
 */
export const HTML_TEMPLATES = {
  DARK_MODE: "dark-mode",
  WHITE_MODE: "white-mode",
  TWITTER: "twitter",
  SUPER_HEADLINE: "super-headline",
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

/**
 * Template data structure - matches the expected fields from .context files
 */
export interface TemplateData {
  // Common fields
  title?: string;
  content: string;

  // Dark/White mode fields
  headline?: string;
  descricao?: string;
  subtitulo?: string;
  legenda?: string;

  // Twitter mode fields
  paragrafo1?: string;
  paragrafo2?: string;
  destaque?: string;
}

// ============================================================================
// IMAGE GENERATION CONFIG
// ============================================================================

/**
 * Cover and Posts configuration
 * Allows different templates for cover (first image) and posts (remaining images)
 */
export interface CoverPostsConfig {
  // Cover (CAPA) - primeira imagem
  coverMethod: ImageGenerationMethod;
  coverTemplate?: HtmlTemplate; // Required if coverMethod is "html-template"
  coverHtmlOptions?: HtmlTemplateOptions; // Color options for HTML template
  coverAiOptions?: AiImageOptions; // Required if coverMethod is "ai"

  // Posts (COMUNS) - demais imagens
  postsMethod: ImageGenerationMethod;
  postsTemplate?: HtmlTemplate; // Required if postsMethod is "html-template"
  postsHtmlOptions?: HtmlTemplateOptions; // Color options for HTML template
  postsAiOptions?: AiImageOptions; // Required if postsMethod is "ai"
}

/**
 * Image generation configuration
 * Supports both legacy single-method and new cover/posts configuration
 */
export interface ImageGenerationConfig {
  // Legacy: Single method for all images
  method?: ImageGenerationMethod;
  aiOptions?: AiImageOptions;
  htmlOptions?: HtmlTemplateOptions;

  // New: Separate configuration for cover (first) and posts (remaining) images
  coverPosts?: CoverPostsConfig;
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
// VIDEO THUMBNAIL GENERATION (v4.0)
// ============================================================================

/**
 * Nano Banana thumbnail style options
 * Each style has specific color, background, and mood mappings
 */
export type NanoBananaStyle =
  | "profissional"
  | "minimalista"
  | "moderno"
  | "energético"
  | "educacional"
  | "provocativo"
  | "inspirador"
  | "tech";

/**
 * Input for generating video thumbnail (legacy v4.0 format)
 * Reuses AI image generation with thumbnail-specific optimization
 */
export interface VideoThumbnailInput {
  thumbnailTitle: string; // Short title from video script
  narrativeTitle?: string; // Additional context from narrative
  thumbnailConfig: ImageGenerationConfig;
  wizardContext?: {
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
    tone?: string;
  };
}

/**
 * Input for generating video thumbnail using Nano Banana format (v4.3)
 * Uses structured prompt generation with reference image support
 */
export interface NanoBananaThumbnailInput {
  thumbnailTitle: string; // 4-6 words creating curiosity
  estilo?: NanoBananaStyle; // Visual style (default: profissional)
  contextoTematico: string; // Thematic context for the thumbnail
  expressao?: string; // Facial expression suggestion (optional, will be mapped from theme)
  referenciaImagem1?: string; // URL to user/person photo (optional)
  referenciaImagem2?: string; // URL to style reference (optional)
  wizardContext?: {
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
    tone?: string;
  };
}

/**
 * Nano Banana output format with specifications
 */
export interface NanoBananaThumbnailOutput {
  prompt: string; // 5-line structured prompt
  negative_prompt: string;
  especificacoes: {
    texto: string; // Exact text that appears on thumbnail
    cor_texto: string; // Hex color
    cor_fundo: string; // Hex color of main background
    posicao_texto: "centro" | "terco_superior" | "terco_inferior";
    expressao: string; // Facial expression
  };
  variacoes: string[]; // Array of alternative suggestions
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
 * User Brand Presets for image generation
 * When available, these are integrated into the prompt for brand-aligned visuals
 */
export interface UserBrandPresets {
  voiceTone?: string;
  brandVoice?: string;
  niches?: string;
  targetAudience?: string;
  fearsAndPains?: string;
  desiresAndAspirations?: string;
  differentials?: string;
  contentObjectives?: string;
  preferredCTAs?: string;
  forbiddenTerms?: string;
}

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
  brand?: UserBrandPresets; // User Brand Presets - v4.3 integration
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

/**
 * Helper to get template label
 */
export function getTemplateLabel(template: HtmlTemplate): string {
  const labels: Record<HtmlTemplate, string> = {
    "dark-mode": "Dark Mode",
    "white-mode": "White Mode",
    "twitter": "Twitter",
    "super-headline": "Super Headline",
  };
  return labels[template] || template;
}

/**
 * Helper to get template description
 */
export function getTemplateDescription(template: HtmlTemplate): string {
  const descriptions: Record<HtmlTemplate, string> = {
    "dark-mode": "Fundo escuro com gradiente verde e tipografia elegante",
    "white-mode": "Fundo claro com estilo minimalista e moderno",
    "twitter": "Estilo de post do Twitter com avatar e verificado",
    "super-headline": "Headline gigante com grid de fundo e CTA",
  };
  return descriptions[template] || "";
}

/**
 * Helper to get required fields for each template
 */
export function getTemplateRequiredFields(template: HtmlTemplate): string[] {
  const fields: Record<HtmlTemplate, string[]> = {
    "dark-mode": ["headline", "descricao", "subtitulo"],
    "white-mode": ["headline", "descricao", "subtitulo"],
    "twitter": ["headline", "paragrafo1", "paragrafo2", "destaque"],
    "super-headline": ["headline"],
  };
  return fields[template] || ["headline"];
}
