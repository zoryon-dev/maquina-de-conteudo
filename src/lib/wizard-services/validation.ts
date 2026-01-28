/**
 * Runtime Validation for Wizard Services
 *
 * Validates AI-generated responses to ensure they meet v4.2 requirements.
 * TypeScript checks structure, we check CONTENT.
 */

import type { ZoryonCarousel } from "./types";

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public expected: string,
    public received: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// ============================================================================
// CAROUSEL VALIDATION v4.2
// ============================================================================

/**
 * Validates that a ZoryonCarousel response meets v4.2 requirements.
 *
 * Critical fields:
 * - throughline: Required, must be non-empty
 * - valor_central: Required (v4.2), must be non-empty
 * - slides[].tipo: Required (v4.2), must be one of the 7 valid types
 * - slides[].corpo: Must be <=130 characters (v4.2)
 * - legenda: Required, must be 200-400 words (v4.2)
 */
export function validateCarouselResponse(
  response: unknown,
  fallbackMessage?: string
): ZoryonCarousel {
  // Type guard: ensure it's an object
  if (!response || typeof response !== "object") {
    throw new ValidationError(
      "Resposta da IA não é um objeto válido",
      "response",
      "object with carousel structure",
      typeof response
    );
  }

  const carousel = response as Record<string, unknown>;

  // Validate throughline
  if (!carousel.throughline || typeof carousel.throughline !== "string") {
    throw new ValidationError(
      `Campo 'throughline' está faltando ou inválido. A IA deve fornecer o fio condutor narrativo.`,
      "throughline",
      "string não-vazia",
      typeof carousel.throughline
    );
  }

  if (carousel.throughline.trim().length === 0) {
    throw new ValidationError(
      `Campo 'throughline' está vazio. A IA deve preencher o fio condutor.`,
      "throughline",
      "string não-vazia",
      `"${carousel.throughline}"`
    );
  }

  // Validate valor_central (v4.2)
  if (!carousel.valor_central || typeof carousel.valor_central !== "string") {
    throw new ValidationError(
      `Campo 'valor_central' está faltando ou inválido (v4.2 obrigatório). A IA deve explicar o que a pessoa aprende.`,
      "valor_central",
      "string não-vazia",
      typeof carousel.valor_central
    );
  }

  if (carousel.valor_central.trim().length === 0) {
    throw new ValidationError(
      `Campo 'valor_central' está vazio (v4.2). A IA deve explicar o valor do carrossel.`,
      "valor_central",
      "string não-vazia",
      `"${carousel.valor_central}"`
    );
  }

  // Validate capa
  if (!carousel.capa || typeof carousel.capa !== "object") {
    throw new ValidationError(
      `Campo 'capa' está faltando ou inválido.`,
      "capa",
      "object with titulo and subtitulo",
      typeof carousel.capa
    );
  }

  const capa = carousel.capa as Record<string, unknown>;
  if (!capa.titulo || typeof capa.titulo !== "string" || capa.titulo.trim().length === 0) {
    throw new ValidationError(
      `Campo 'capa.titulo' está vazio ou inválido.`,
      "capa.titulo",
      "string não-vazia",
      typeof capa.titulo
    );
  }

  if (!capa.subtitulo || typeof capa.subtitulo !== "string" || capa.subtitulo.trim().length === 0) {
    throw new ValidationError(
      `Campo 'capa.subtitulo' está vazio ou inválido.`,
      "capa.subtitulo",
      "string não-vazia",
      typeof capa.subtitulo
    );
  }

  // Validate slides array
  if (!Array.isArray(carousel.slides)) {
    throw new ValidationError(
      `Campo 'slides' não é um array.`,
      "slides",
      "array",
      typeof carousel.slides
    );
  }

  if (carousel.slides.length === 0) {
    throw new ValidationError(
      `Array 'slides' está vazio. Deve ter pelo menos 1 slide.`,
      "slides",
      "array com 1+ slides",
      "array vazio"
    );
  }

  const VALID_TYPES = ["problema", "conceito", "passo", "exemplo", "erro", "sintese", "cta"] as const;
  type ValidSlideType = typeof VALID_TYPES[number];

  // Validate each slide
  carousel.slides.forEach((slide: unknown, index: number) => {
    if (!slide || typeof slide !== "object") {
      throw new ValidationError(
        `Slide ${index + 1} não é um objeto válido.`,
        `slides[${index}]`,
        "object",
        typeof slide
      );
    }

    const slideObj = slide as Record<string, unknown>;

    // Validate tipo (v4.2)
    if (!slideObj.tipo || typeof slideObj.tipo !== "string") {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'tipo' está faltando (v4.2 obrigatório). Cada slide deve ter um tipo.`,
        `slides[${index}].tipo`,
        "um de: " + VALID_TYPES.join(", "),
        typeof slideObj.tipo
      );
    }

    if (!VALID_TYPES.includes(slideObj.tipo as ValidSlideType)) {
      throw new ValidationError(
        `Slide ${index + 1}: Tipo '${slideObj.tipo}' é inválido. Deve ser um dos 7 tipos v4.2.`,
        `slides[${index}].tipo`,
        "um de: " + VALID_TYPES.join(", "),
        slideObj.tipo
      );
    }

    // Validate titulo
    if (!slideObj.titulo || typeof slideObj.titulo !== "string" || slideObj.titulo.trim().length === 0) {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'titulo' está vazio ou inválido.`,
        `slides[${index}].titulo`,
        "string não-vazia (máx 6 palavras)",
        typeof slideObj.titulo
      );
    }

    const tituloWordCount = slideObj.titulo.trim().split(/\s+/).length;
    if (tituloWordCount > 6) {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'titulo' tem ${tituloWordCount} palavras, mas máximo v4.2 é 6.`,
        `slides[${index}].titulo`,
        "máx 6 palavras",
        `${tituloWordCount} palavras`
      );
    }

    // Validate corpo (v4.2: <=130 chars)
    if (!slideObj.corpo || typeof slideObj.corpo !== "string") {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'corpo' está faltando.`,
        `slides[${index}].corpo`,
        "string (até 130 caracteres)",
        typeof slideObj.corpo
      );
    }

    const corpoLength = slideObj.corpo.trim().length;
    if (corpoLength > 130) {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'corpo' tem ${corpoLength} caracteres, mas máximo v4.2 é 130.`,
        `slides[${index}].corpo`,
        "máx 130 caracteres",
        `${corpoLength} caracteres`
      );
    }

    // Validate conexao_proximo (v4.2 - optional field, can be null/undefined/empty for last slide)
    // Aceita string, null, undefined, ou string vazia - qualquer outro tipo é inválido
    if (
      slideObj.conexao_proximo !== undefined &&
      slideObj.conexao_proximo !== null &&
      typeof slideObj.conexao_proximo !== "string"
    ) {
      throw new ValidationError(
        `Slide ${index + 1}: Campo 'conexao_proximo' deve ser string, null ou undefined quando presente.`,
        `slides[${index}].conexao_proximo`,
        "string | null | undefined",
        typeof slideObj.conexao_proximo
      );
    }
  });

  // Validate legenda (v4.2: 200-400 palavras)
  if (!carousel.legenda || typeof carousel.legenda !== "string") {
    throw new ValidationError(
      `Campo 'legenda' está faltando ou inválido.`,
      "legenda",
      "string (200-400 palavras)",
      typeof carousel.legenda
    );
  }

  const wordCount = carousel.legenda.trim().split(/\s+/).length;

  // Mínimo absoluto: 200 palavras (abaixo disso rejeita)
  const MIN_ABSOLUTE = 200;
  // Máximo recomendado: 400 palavras (acima disso avisa)
  const MAX_RECOMMENDED = 400;

  if (wordCount < MIN_ABSOLUTE) {
    throw new ValidationError(
      `Campo 'legenda' tem ${wordCount} palavras, mas mínimo absoluto é ${MIN_ABSOLUTE}. A caption deve ter mais substância.`,
      "legenda",
      "200-400 palavras",
      `${wordCount} palavras`
    );
  }

  if (wordCount > MAX_RECOMMENDED) {
  }

  // If we got here, validation passed!
  return carousel as ZoryonCarousel;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wraps validateCarouselResponse with user-friendly error handling.
 * Returns a ServiceResult instead of throwing.
 */
export function safeValidateCarousel(
  response: unknown,
  fallbackMessage?: string
): { success: true; data: ZoryonCarousel } | { success: false; error: string } {
  try {
    const validated = validateCarouselResponse(response, fallbackMessage);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido na validação",
    };
  }
}

/**
 * Attempts to auto-fix common validation errors by re-prompting the AI.
 * This is more advanced - would need access to the LLM service.
 *
 * For now, just logs the error for debugging.
 */
export function logValidationError(error: ValidationError, context: string) {
  console.error(`[ValidationError] ${context}:`);
  console.error(`  Campo: ${error.field}`);
  console.error(`  Esperado: ${error.expected}`);
  console.error(`  Recebido: ${error.received}`);
  console.error(`  Mensagem: ${error.message}`);
}
