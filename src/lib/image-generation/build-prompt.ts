/**
 * Build Prompt
 *
 * Constrói prompts de imagem de forma previsível a partir de campos estruturados.
 * Não há IA intermediária - o usuário vê exatamente o que será enviado.
 */

import type { ImagePromptFields, BuiltPrompt } from "@/types/image-generation";

// ============================================================================
// SANITIZAÇÃO DE INPUT
// ============================================================================

/**
 * Sanitiza input do usuário para prevenir prompt injection
 * Remove caracteres que podem ser usados para manipular o prompt
 *
 * @param input - String de input do usuário
 * @returns String sanitizada
 */
function sanitizePromptInput(input: string): string {
  return input
    // Remove quebras de linha que podem separar instruções
    .replace(/[\r\n]+/g, " ")
    // Remove aspas duplas que podem fechar strings de prompt
    .replace(/"/g, "'")
    // Remove caracteres de controle
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Remove múltiplos espaços
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// MAPAS DE TRADUÇÃO
// ============================================================================

/**
 * Mapas de tradução dos campos para texto do prompt
 * Cada campo tem uma tradução clara e consistente
 */
const SHOT_TYPE_MAP: Record<ImagePromptFields["shotType"], string> = {
  "close-up": "close-up portrait shot, face and shoulders visible",
  "medium": "medium shot, waist up, showing upper body and environment",
  "wide": "wide environmental shot, full body with surroundings visible",
  "detail": "detail shot, macro focus on specific element",
  "overhead": "overhead flat lay shot, top-down perspective",
};

const LIGHTING_MAP: Record<ImagePromptFields["lighting"], string> = {
  "natural": "natural daylight, soft window light",
  "studio": "professional studio lighting, clean and even",
  "golden-hour": "golden hour warm sunlight, soft shadows",
  "dramatic": "dramatic lighting, strong contrast, defined shadows",
  "soft": "soft diffused lighting, minimal shadows",
  "neon": "neon accent lighting, colorful glows",
};

const COLOR_PALETTE_MAP: Record<ImagePromptFields["colorPalette"], string> = {
  "warm": "warm color palette, oranges, yellows, and earth tones",
  "cool": "cool color palette, blues, teals, and greens",
  "vibrant": "vibrant saturated colors, bold and eye-catching",
  "muted": "muted desaturated tones, soft and understated",
  "pastel": "pastel color palette, soft pinks, blues, and lavenders",
  "dark": "dark moody palette, deep shadows, rich blacks",
  "b&w": "black and white, high contrast monochrome",
};

const PHOTO_STYLE_MAP: Record<ImagePromptFields["photoStyle"], string> = {
  "editorial": "editorial photography style, magazine quality, polished",
  "lifestyle": "lifestyle photography, authentic and relatable moments",
  "corporate": "corporate professional photography, clean and trustworthy",
  "candid": "candid photography style, natural unposed moments",
  "artistic": "artistic photography, creative composition and unique angles",
  "minimal": "minimalist photography, clean backgrounds, single focus point",
  "bold": "bold graphic style, strong shapes and high impact visuals",
};

const TEXT_STYLE_MAP: Record<NonNullable<ImagePromptFields["textStyle"]>, string> = {
  "bold-sans": "bold sans-serif typography, modern and impactful",
  "elegant-serif": "elegant serif typography, sophisticated and classic",
  "handwritten": "handwritten script typography, personal and authentic",
  "minimal": "minimal clean typography, simple and readable",
};

const ASPECT_RATIO_MAP: Record<ImagePromptFields["aspectRatio"], string> = {
  "1:1": "square 1:1 aspect ratio",
  "4:5": "portrait 4:5 aspect ratio, optimized for Instagram feed",
  "9:16": "vertical 9:16 aspect ratio, optimized for Stories and Reels",
  "16:9": "landscape 16:9 aspect ratio, cinematic wide format",
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Constrói o prompt final a partir dos campos preenchidos
 *
 * @param fields - Campos preenchidos pelo usuário
 * @returns Objeto com prompt, negativePrompt e previewText
 *
 * @example
 * const result = buildPrompt({
 *   subject: "mulher empreendedora trabalhando no laptop",
 *   setting: "café moderno com plantas",
 *   shotType: "medium",
 *   lighting: "natural",
 *   colorPalette: "warm",
 *   photoStyle: "lifestyle",
 *   aspectRatio: "4:5",
 *   includeText: false,
 * });
 *
 * // result.prompt será uma string concatenada de todos os elementos
 */
export function buildPrompt(fields: ImagePromptFields): BuiltPrompt {
  const promptParts: string[] = [];

  // Sanitize user inputs to prevent prompt injection
  const safeSubject = sanitizePromptInput(fields.subject);
  const safeSetting = sanitizePromptInput(fields.setting);
  const safeMood = fields.mood ? sanitizePromptInput(fields.mood) : "";
  const safeTextContent = fields.textContent ? sanitizePromptInput(fields.textContent) : "";
  const safeAdditionalNotes = fields.additionalNotes ? sanitizePromptInput(fields.additionalNotes) : "";
  const safeAvoidElements = fields.avoidElements ? sanitizePromptInput(fields.avoidElements) : "";

  // ═══════════════════════════════════════════════════════════════
  // 1. SUJEITO E CENÁRIO (Core da imagem)
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(`${safeSubject}, set in ${safeSetting}`);

  // ═══════════════════════════════════════════════════════════════
  // 2. ENQUADRAMENTO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(SHOT_TYPE_MAP[fields.shotType]);

  // ═══════════════════════════════════════════════════════════════
  // 3. ILUMINAÇÃO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(LIGHTING_MAP[fields.lighting]);

  // ═══════════════════════════════════════════════════════════════
  // 4. ESTILO FOTOGRÁFICO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(PHOTO_STYLE_MAP[fields.photoStyle]);

  // ═══════════════════════════════════════════════════════════════
  // 5. PALETA DE CORES
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(COLOR_PALETTE_MAP[fields.colorPalette]);

  // ═══════════════════════════════════════════════════════════════
  // 6. MOOD (se fornecido)
  // ═══════════════════════════════════════════════════════════════
  if (safeMood) {
    promptParts.push(`conveying a ${safeMood} mood and atmosphere`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. TEXTO NA IMAGEM (se solicitado)
  // ═══════════════════════════════════════════════════════════════
  if (fields.includeText && safeTextContent) {
    const placement = fields.textPlacement || "center";
    const style = fields.textStyle ? TEXT_STYLE_MAP[fields.textStyle] : "clean readable typography";

    promptParts.push(
      `with text overlay saying '${safeTextContent}' positioned at the ${placement} of the image, ${style}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. NOTAS ADICIONAIS (se fornecidas)
  // ═══════════════════════════════════════════════════════════════
  if (safeAdditionalNotes) {
    promptParts.push(safeAdditionalNotes);
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. FORMATO E OTIMIZAÇÃO INSTAGRAM (sempre incluído)
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(ASPECT_RATIO_MAP[fields.aspectRatio]);
  promptParts.push("scroll-stopping visual optimized for Instagram");
  promptParts.push("high quality, sharp focus, professional photography");

  // ═══════════════════════════════════════════════════════════════
  // CONSTRUIR PROMPT NEGATIVO
  // ═══════════════════════════════════════════════════════════════
  const negativePromptParts: string[] = [
    "blurry",
    "low quality",
    "distorted",
    "watermark",
    "logo",
    "amateur",
    "poorly lit",
    "oversaturated",
    "unnatural colors",
  ];

  // Adiciona elementos que o usuário quer evitar
  if (safeAvoidElements) {
    negativePromptParts.push(safeAvoidElements);
  }

  // Se NÃO quer texto, adiciona ao negativo
  if (!fields.includeText) {
    negativePromptParts.push("text", "words", "letters", "typography", "captions");
  }

  // ═══════════════════════════════════════════════════════════════
  // CONSTRUIR PREVIEW AMIGÁVEL
  // ═══════════════════════════════════════════════════════════════
  const previewText = `${fields.subject} | ${fields.setting} | ${fields.shotType} | ${fields.lighting} | ${fields.colorPalette}`;

  return {
    prompt: promptParts.join(". ") + ".",
    negativePrompt: negativePromptParts.join(", "),
    previewText,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

/**
 * Valida os campos obrigatórios antes de construir o prompt
 */
export function validateFields(fields: Partial<ImagePromptFields>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!fields.subject || !fields.subject.trim()) {
    errors.push("O campo 'O que aparece na imagem' é obrigatório");
  }

  if (!fields.setting || !fields.setting.trim()) {
    errors.push("O campo 'Cenário/Ambiente' é obrigatório");
  }

  if (fields.includeText && (!fields.textContent || !fields.textContent.trim())) {
    errors.push("Você marcou 'incluir texto' mas não digitou o texto");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Cria um prompt simples a partir de texto livre (modo compatibilidade)
 * Usado quando o usuário passa apenas uma string de prompt
 */
export function buildSimplePrompt(
  userPrompt: string,
  style: "realistic" | "artistic" | "minimal" | "vibrant" = "minimal"
): BuiltPrompt {
  const styleHints: Record<string, string> = {
    realistic: "photorealistic, high detail, natural lighting",
    artistic: "artistic style, creative composition, expressive",
    minimal: "minimalist, clean design, simple composition",
    vibrant: "vibrant colors, dynamic, energetic",
  };

  const prompt = `${userPrompt.trim()}. ${styleHints[style]}. High quality, professional photography, 4:5 aspect ratio for Instagram.`;

  return {
    prompt,
    negativePrompt: "blurry, low quality, distorted, watermark, amateur, text, words, letters",
    previewText: userPrompt.slice(0, 50) + (userPrompt.length > 50 ? "..." : ""),
  };
}
