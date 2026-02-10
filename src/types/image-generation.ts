/**
 * Image Generation Types
 *
 * Sistema modular de geração de imagens para Instagram.
 * Campos são concatenados de forma previsível para formar o prompt final.
 */

// ============================================================================
// ASPECT RATIO
// ============================================================================

/**
 * Aspect ratios suportados para geração de imagens.
 * Subset de CreativeFormat (creative-studio) focado em geração AI.
 */
export type ImageAspectRatio = "1:1" | "3:4" | "9:16" | "16:9";

// ============================================================================
// CAMPOS PARA GERAÇÃO MODULAR
// ============================================================================

/**
 * Campos para geração modular de imagens
 * Todos os campos são concatenados de forma previsível para formar o prompt final
 */
export interface ImagePromptFields {
  // ═══════════════════════════════════════════════════════════════
  // CAMPOS OBRIGATÓRIOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * O que/quem aparece na imagem (sujeito principal)
   * @example "mulher empreendedora trabalhando no laptop"
   * @example "mãos segurando um celular"
   * @example "mesa de trabalho organizada"
   */
  subject: string;

  /**
   * Onde a cena acontece (cenário/ambiente)
   * @example "café moderno com plantas"
   * @example "home office minimalista"
   * @example "fundo gradiente abstrato"
   */
  setting: string;

  // ═══════════════════════════════════════════════════════════════
  // CAMPOS VISUAIS (selects/radios)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Tipo de enquadramento da câmera
   */
  shotType: "close-up" | "medium" | "wide" | "detail" | "overhead";

  /**
   * Tipo de iluminação da cena
   */
  lighting: "natural" | "studio" | "golden-hour" | "dramatic" | "soft" | "neon";

  /**
   * Paleta de cores predominante
   */
  colorPalette: "warm" | "cool" | "vibrant" | "muted" | "pastel" | "dark" | "b&w";

  /**
   * Estilo fotográfico geral
   */
  photoStyle: "editorial" | "lifestyle" | "corporate" | "candid" | "artistic" | "minimal" | "bold";

  // ═══════════════════════════════════════════════════════════════
  // FORMATO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Proporção da imagem (aspect ratio)
   * - 1:1 = Feed quadrado
   * - 3:4 = Feed retrato (recomendado para Instagram)
   * - 9:16 = Stories/Reels
   * - 16:9 = Paisagem/YouTube
   */
  aspectRatio: ImageAspectRatio;

  // ═══════════════════════════════════════════════════════════════
  // TEXTO NA IMAGEM (opcional)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Se deve incluir texto sobreposto na imagem
   */
  includeText: boolean;

  /**
   * Conteúdo do texto (obrigatório se includeText = true)
   * @example "Comece hoje"
   * @example "Você não está sozinha"
   */
  textContent?: string;

  /**
   * Posição do texto na imagem
   */
  textPlacement?: "top" | "center" | "bottom";

  /**
   * Estilo visual do texto
   */
  textStyle?: "bold-sans" | "elegant-serif" | "handwritten" | "minimal";

  // ═══════════════════════════════════════════════════════════════
  // CAMPOS AVANÇADOS (opcionais, collapsed por padrão na UI)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Humor/sentimento que a imagem deve transmitir
   * @example "confiante e determinada"
   * @example "calmo e reflexivo"
   * @example "energético e motivador"
   */
  mood?: string;

  /**
   * Elementos específicos para evitar na imagem
   * @example "sem pessoas ao fundo, sem logos visíveis"
   */
  avoidElements?: string;

  /**
   * Instruções adicionais livres do usuário
   * @example "estilo similar a fotos da Forbes"
   */
  additionalNotes?: string;
}

// ============================================================================
// PRESETS
// ============================================================================

/**
 * Presets pré-configurados para casos de uso comuns
 */
export interface ImagePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaults: Partial<ImagePromptFields>;
}

// ============================================================================
// RESULTADO DO BUILD
// ============================================================================

/**
 * Resultado da função buildPrompt
 */
export interface BuiltPrompt {
  /** Prompt positivo completo para enviar ao modelo */
  prompt: string;
  /** Prompt negativo (elementos a evitar) */
  negativePrompt: string;
  /** Preview amigável para mostrar ao usuário */
  previewText: string;
}

// ============================================================================
// VALORES PADRÃO
// ============================================================================

/**
 * Valores padrão para os campos
 * NOTE: subject and setting are empty - use createImagePromptFields() for validation
 */
export const DEFAULT_IMAGE_FIELDS: ImagePromptFields = {
  subject: "",
  setting: "",
  shotType: "medium",
  lighting: "natural",
  colorPalette: "warm",
  photoStyle: "lifestyle",
  aspectRatio: "3:4",
  includeText: false,
  textContent: "",
  textPlacement: "center",
  textStyle: "bold-sans",
  mood: "",
  avoidElements: "",
  additionalNotes: "",
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation result for ImagePromptFields
 */
export interface ImageFieldsValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validates ImagePromptFields and returns validation result
 * Use this before sending fields to the API to get helpful error messages
 *
 * @example
 * const validation = validateImagePromptFields(fields);
 * if (!validation.valid) {
 *   console.error(validation.errors);
 * }
 */
export function validateImagePromptFields(fields: ImagePromptFields): ImageFieldsValidation {
  const errors: string[] = [];

  // Required fields
  if (!fields.subject || fields.subject.trim().length === 0) {
    errors.push("Subject is required - describe what/who appears in the image");
  }
  if (!fields.setting || fields.setting.trim().length === 0) {
    errors.push("Setting is required - describe where the scene takes place");
  }

  // Text-related validation
  if (fields.includeText) {
    if (!fields.textContent || fields.textContent.trim().length === 0) {
      errors.push("Text content is required when includeText is enabled");
    }
    if (!fields.textPlacement) {
      errors.push("Text placement is required when includeText is enabled");
    }
    if (!fields.textStyle) {
      errors.push("Text style is required when includeText is enabled");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a validated ImagePromptFields object
 * Throws an error if required fields are missing or invalid
 *
 * @example
 * const fields = createImagePromptFields({
 *   ...DEFAULT_IMAGE_FIELDS,
 *   subject: "woman entrepreneur",
 *   setting: "modern office",
 * });
 */
export function createImagePromptFields(fields: ImagePromptFields): ImagePromptFields {
  const validation = validateImagePromptFields(fields);

  if (!validation.valid) {
    throw new Error(`Invalid ImagePromptFields: ${validation.errors.join(". ")}`);
  }

  return fields;
}

// ============================================================================
// DISCRIMINATED UNIONS (Type-safe alternative)
// ============================================================================

/**
 * Base fields without text overlay
 */
interface ImagePromptFieldsBase {
  subject: string;
  setting: string;
  shotType: "close-up" | "medium" | "wide" | "detail" | "overhead";
  lighting: "natural" | "studio" | "golden-hour" | "dramatic" | "soft" | "neon";
  colorPalette: "warm" | "cool" | "vibrant" | "muted" | "pastel" | "dark" | "b&w";
  photoStyle: "editorial" | "lifestyle" | "corporate" | "candid" | "artistic" | "minimal" | "bold";
  aspectRatio: ImageAspectRatio;
  mood?: string;
  avoidElements?: string;
  additionalNotes?: string;
}

/**
 * Image fields WITH text overlay - all text fields required
 */
export interface ImagePromptFieldsWithText extends ImagePromptFieldsBase {
  includeText: true;
  textContent: string;
  textPlacement: "top" | "center" | "bottom";
  textStyle: "bold-sans" | "elegant-serif" | "handwritten" | "minimal";
}

/**
 * Image fields WITHOUT text overlay - text fields not allowed
 */
export interface ImagePromptFieldsWithoutText extends ImagePromptFieldsBase {
  includeText: false;
  textContent?: never;
  textPlacement?: never;
  textStyle?: never;
}

/**
 * Strictly typed ImagePromptFields using discriminated union
 * Use this type when you want compile-time enforcement of text field dependencies
 *
 * @example
 * // This is valid:
 * const withText: StrictImagePromptFields = {
 *   ...baseFields,
 *   includeText: true,
 *   textContent: "Hello",
 *   textPlacement: "center",
 *   textStyle: "bold-sans",
 * };
 *
 * // This would be a compile error (missing textContent when includeText is true):
 * const invalid: StrictImagePromptFields = {
 *   ...baseFields,
 *   includeText: true, // Error! Missing required text fields
 * };
 */
export type StrictImagePromptFields = ImagePromptFieldsWithText | ImagePromptFieldsWithoutText;
