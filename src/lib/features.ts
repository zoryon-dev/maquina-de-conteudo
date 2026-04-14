/**
 * Feature flag helper — resolve env flags como boolean.
 *
 * Convenção: valor "true" (string, lowercase) ativa; qualquer outra coisa
 * (incluindo undefined) usa `defaultValue`. Usar `NEXT_PUBLIC_` prefix para
 * flags consumidas no client.
 */
export function isFeatureEnabled(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return raw === "true"
}
