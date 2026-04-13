export type BrandBlockOptions = {
  heading?: string  // default "# CONTEXTO DE MARCA"
  note?: string     // linha extra abaixo do heading
  fallback?: string // string se vars vazias; default: ""
}

export function buildBrandContextBlock(
  vars: Record<string, string | undefined> | undefined,
  opts: BrandBlockOptions = {}
): string {
  const heading = opts.heading ?? "# CONTEXTO DE MARCA"
  const entries = Object.entries(vars ?? {}).filter(([, v]) => v && String(v).trim())
  if (entries.length === 0) return opts.fallback ?? ""
  const lines = [heading]
  if (opts.note) lines.push(opts.note)
  lines.push("")
  for (const [k, v] of entries) lines.push(`- **${k}:** ${v}`)
  return lines.join("\n")
}
