/**
 * Brand Tokens CSS — gera CSS custom properties a partir de
 * `brand.config.visual.tokens`. Valores são sanitizados por regex para
 * bloquear CSS injection (fechamento de bloco, seletores extra, etc.).
 *
 * Templates consomem via `tokenVar()` com fallback hardcoded, garantindo
 * zero mudança visual quando a flag `visualTokensV2` está off ou quando
 * não há brand ativa.
 */

import type { BrandConfig } from "@/lib/brands/schema"

// Permite: hex (#), letras/números, espaços, vírgulas, pontos, traços,
// porcentagem, parênteses, barra (p/ rgb(255 0 0 / .5)).
// Bloqueia explicitamente chars que fariam escape do contexto CSS:
// `{`, `}`, `;`, `<`, `>`, `"`, `'`, `@`, `:` fora de parênteses, etc.
const SAFE_CSS_VALUE = /^[#\w\s,.\-%()/]+$/

function sanitize(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!SAFE_CSS_VALUE.test(trimmed)) return null
  return trimmed
}

function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
}

export type TokenGroup = "color" | "font" | "spacing" | "shadow"

export function buildBrandTokenCss(brand: BrandConfig | undefined | null): string {
  if (!brand?.visual?.tokens) return ""

  const { colors, fonts, spacing, shadows } = brand.visual.tokens
  const lines: string[] = []

  const pushGroup = (
    prefix: TokenGroup,
    obj: Record<string, string> | undefined | null
  ) => {
    if (!obj) return
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== "string") continue
      const safe = sanitize(value)
      if (!safe) continue
      lines.push(`  --brand-${prefix}-${toKebab(key)}: ${safe};`)
    }
  }

  pushGroup("color", colors)
  pushGroup("font", fonts)
  pushGroup("spacing", spacing)
  pushGroup("shadow", shadows)

  if (lines.length === 0) return ""

  return `:root {\n${lines.join("\n")}\n}`
}

/**
 * Helper para templates: gera `var(--brand-<group>-<name>, <fallback>)`.
 * O `fallback` deve ser o literal CSS que o template já usava antes do
 * overhaul (preservar aparência com flag off).
 */
export function tokenVar(
  group: TokenGroup,
  name: string,
  fallback: string
): string {
  return `var(--brand-${group}-${toKebab(name)}, ${fallback})`
}
