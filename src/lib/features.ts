/**
 * Feature flag helper. Retorna `true` apenas quando env === "true" (exact
 * match, case-sensitive). `defaultValue` aplica-se **apenas** quando a var
 * está unset (undefined). Qualquer valor não-"true" retorna false.
 *
 * Use `NEXT_PUBLIC_` prefix para flags consumidas no client.
 */
export function isFeatureEnabled(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return raw === "true"
}
