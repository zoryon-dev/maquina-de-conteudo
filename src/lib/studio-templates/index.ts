/**
 * Studio Templates
 *
 * Sistema de templates HTML para o Editor Visual (Studio).
 * Exporta tipos, templates e funções de renderização.
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  FigmaTemplate,
  TemplateMotor,
  StudioContentType,
  AspectRatio,
  StudioProfile,
  StudioHeader,
  SlideContent,
  SlideStyle,
  StudioSlide,
  StudioState,
  TemplateMetadata,
} from "./types";

export {
  TEMPLATE_METADATA,
  DIMENSIONS,
  INSTAGRAM_DIMENSIONS,
  DEFAULT_SLIDE_CONTENT,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_PROFILE,
  DEFAULT_HEADER,
  createDefaultSlide,
  createInitialStudioState,
  getRecommendedTemplate,
  escapeHtml,
} from "./types";

// ============================================================================
// TEMPLATES
// ============================================================================

// Figma Templates
export { generate01CapaHtml } from "./01-capa";
export type { CapaTemplateInput } from "./01-capa";

export { generate201Html } from "./201";
export type { Template201Input } from "./201";

export { generate202Html } from "./202";
export type { Template202Input } from "./202";

export { generate203Html } from "./203";
export type { Template203Input } from "./203";

// Generic Templates
export { generateDarkModeHtml } from "./dark-mode";
export type { TemplateDarkModeInput } from "./dark-mode";

export { generateWhiteModeHtml } from "./white-mode";
export type { TemplateWhiteModeInput } from "./white-mode";

export { generateTwitterHtml } from "./twitter";
export type { TemplateTwitterInput } from "./twitter";

export { generateSuperHeadlineHtml } from "./super-headline";
export type { TemplateSuperHeadlineInput } from "./super-headline";

// Image Templates
export { generateImageOverlayHtml } from "./image-overlay";
export type { TemplateImageOverlayInput } from "./image-overlay";

export { generateImageSplitHtml } from "./image-split";
export type { TemplateImageSplitInput } from "./image-split";

export { generateImageMinimalHtml } from "./image-minimal";
export type { TemplateImageMinimalInput } from "./image-minimal";

// BrandsDecoded v4 Templates
export { generateBDCapaHtml } from "./brandsdecoded/bd-capa";
export type { TemplateBDCapaInput } from "./brandsdecoded/bd-capa";

export { generateBDDarkHtml } from "./brandsdecoded/bd-dark";
export type { TemplateBDDarkInput } from "./brandsdecoded/bd-dark";

export { generateBDLightHtml } from "./brandsdecoded/bd-light";
export type { TemplateBDLightInput } from "./brandsdecoded/bd-light";

export { generateBDCtaHtml } from "./brandsdecoded/bd-cta";
export type { TemplateBDCtaInput } from "./brandsdecoded/bd-cta";

// ============================================================================
// RENDERER
// ============================================================================

export {
  renderSlideToHtml,
  renderAllSlidesToHtml,
  generatePreviewHtml,
  generatePreviewDataUrl,
} from "./renderer";

export type { RenderSlideInput, RenderSlideResult } from "./renderer";

// ============================================================================
// HELPERS
// ============================================================================

import type { FigmaTemplate, TemplateMotor } from "./types";
import { TEMPLATE_METADATA } from "./types";

/**
 * Retorna todos os templates disponíveis
 */
export function getAvailableTemplates(): FigmaTemplate[] {
  return Object.keys(TEMPLATE_METADATA) as FigmaTemplate[];
}

/**
 * Retorna o label de um template para exibição
 */
export function getTemplateLabel(template: FigmaTemplate): string {
  return TEMPLATE_METADATA[template]?.label ?? template;
}

/**
 * Retorna a descrição de um template
 */
export function getTemplateDescription(template: FigmaTemplate): string {
  return TEMPLATE_METADATA[template]?.description ?? "";
}

/**
 * Verifica se um template é válido
 */
export function isValidTemplate(template: string): template is FigmaTemplate {
  return template in TEMPLATE_METADATA;
}

/**
 * Retorna o uso recomendado de um template
 */
export function getTemplateRecommendedUse(
  template: FigmaTemplate
): "cover" | "content" | "final" | "any" {
  return TEMPLATE_METADATA[template]?.recommendedUse ?? "any";
}

/**
 * Retorna templates recomendados para cada posição
 */
export function getRecommendedTemplatesForPosition(
  position: "cover" | "content" | "final"
): FigmaTemplate[] {
  return (Object.entries(TEMPLATE_METADATA) as [FigmaTemplate, typeof TEMPLATE_METADATA[FigmaTemplate]][])
    .filter(([, meta]) => meta.recommendedUse === position || meta.recommendedUse === "any")
    .map(([id]) => id);
}

/**
 * Retorna templates compatíveis com um motor específico.
 *
 * Retorna:
 * - Templates com `motor` igual ao informado (ex: `brandsdecoded_v4`)
 * - Templates genéricos (sem `motor` definido) — compatíveis com qualquer motor
 *
 * Se `motor` for `undefined`, retorna todos os templates.
 */
export function getTemplatesForMotor(
  motor?: TemplateMotor
): FigmaTemplate[] {
  if (!motor) {
    return Object.keys(TEMPLATE_METADATA) as FigmaTemplate[];
  }
  return (Object.entries(TEMPLATE_METADATA) as [FigmaTemplate, typeof TEMPLATE_METADATA[FigmaTemplate]][])
    .filter(([, meta]) => !meta.motor || meta.motor === motor)
    .map(([id]) => id);
}
