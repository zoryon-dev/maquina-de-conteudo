/**
 * Feature flag helpers.
 *
 * `isFeatureEnabled` funciona apenas em Server Components e API routes —
 * `process.env[name]` com chave dinâmica não é substituído pelo compilador
 * Next.js em client bundles.
 *
 * Para Client Components, use as constantes exportadas abaixo, que usam
 * referências literais e são inlined corretamente no build.
 */

/** Apenas para uso em Server Components / API routes. */
export function isFeatureEnabled(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return raw === "true"
}

// ── Client-safe constants (literais → Next.js faz static replacement) ──────

export const FEATURE_BD_WIZARD_V1 =
  process.env.NEXT_PUBLIC_FEATURE_BD_WIZARD_V1 === "true"

export const FEATURE_VISUAL_TOKENS_V2 =
  process.env.NEXT_PUBLIC_FEATURE_VISUAL_TOKENS_V2 === "true"
