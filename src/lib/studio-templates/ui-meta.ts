/**
 * Studio Templates — UI Meta helpers
 *
 * Helpers ergonômicos para consumir `icon` e `preview` diretamente do
 * `TEMPLATE_METADATA` (single source of truth), evitando Records duplicados
 * espalhados nos componentes UI (template-gallery, visual-template-selector).
 *
 * Uso recomendado:
 *   const iconName = getTemplateIcon("BD_CAPA")       // "Newspaper"
 *   const Icon = ICON_MAP[iconName]                    // LucideIcon mapping local
 *   const { bg, accent } = getTemplatePreview("BD_CAPA")
 */

import type { FigmaTemplate, TemplatePreview } from "./types";
import { TEMPLATE_METADATA } from "./types";

/**
 * Retorna o nome do ícone lucide-react (PascalCase) de um template.
 * Consumidor faz `ICON_MAP[name]` para obter o componente.
 */
export function getTemplateIcon(template: FigmaTemplate): string {
  return TEMPLATE_METADATA[template].icon;
}

/**
 * Retorna o preview (bg + accent) de um template para uso no card de galeria.
 */
export function getTemplatePreview(template: FigmaTemplate): TemplatePreview {
  return TEMPLATE_METADATA[template].preview;
}
