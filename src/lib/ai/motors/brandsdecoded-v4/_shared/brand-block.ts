import type { BrandPromptVariables } from "@/lib/brands/injection"
import { getSectionsForStage, renderSection, type BdStage } from "./brand-block-sections"

export type BrandBlockOptions = {
  stage?: BdStage    // quando presente, usa renderização semântica por seções
  heading?: string   // default "# CONTEXTO DE MARCA"
  note?: string      // linha extra abaixo do heading
  fallback?: string  // string se vars vazias; default: ""
}

export function buildBrandContextBlock(
  vars: BrandPromptVariables | undefined,
  opts: BrandBlockOptions = {}
): string {
  const heading = opts.heading ?? "# CONTEXTO DE MARCA"
  const entries = Object.entries(vars ?? {}).filter(([, v]) => v && String(v).trim())
  if (entries.length === 0) return opts.fallback ?? ""

  // Stage mode: seções semânticas customizadas por etapa do pipeline.
  if (opts.stage) {
    const sections = getSectionsForStage(opts.stage)
    const parts: string[] = [heading]
    if (opts.note) parts.push(opts.note)
    parts.push("")
    for (const section of sections) {
      const rendered = renderSection(section.name, section.fields, vars ?? {})
      if (rendered) parts.push(rendered, "")
    }
    return parts.join("\n").trimEnd()
  }

  // Legacy mode (backcompat): bullet flat com chave crua.
  const lines = [heading]
  if (opts.note) lines.push(opts.note)
  lines.push("")
  for (const [k, v] of entries) lines.push(`- **${k}:** ${v}`)
  return lines.join("\n")
}
