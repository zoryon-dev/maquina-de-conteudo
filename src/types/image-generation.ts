/**
 * Image Generation Types
 *
 * Sistema modular de geração de imagens para Instagram.
 * Campos são concatenados de forma previsível para formar o prompt final.
 */

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
   * - 4:5 = Feed retrato (recomendado para Instagram)
   * - 9:16 = Stories/Reels
   * - 16:9 = Paisagem/YouTube
   */
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";

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
 */
export const DEFAULT_IMAGE_FIELDS: ImagePromptFields = {
  subject: "",
  setting: "",
  shotType: "medium",
  lighting: "natural",
  colorPalette: "warm",
  photoStyle: "lifestyle",
  aspectRatio: "4:5",
  includeText: false,
  textContent: "",
  textPlacement: "center",
  textStyle: "bold-sans",
  mood: "",
  avoidElements: "",
  additionalNotes: "",
};
