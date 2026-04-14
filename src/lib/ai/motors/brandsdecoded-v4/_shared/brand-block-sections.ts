// Etapas distintas do pipeline consomem subsets da marca. Bullet-list
// flat com todos os campos polui o prompt; agrupar em seções nomeadas
// (VOZ/AUDIÊNCIA/...) melhora a aderência do modelo.

// Tipo canônico — mantém este arquivo em sync com brandConfigToPromptVariables.
import type { BrandPromptVariables } from "@/lib/brands/injection"

export type BdStage = "triagem" | "headlines" | "espinha" | "copy-blocks" | "legenda"

export type { BrandPromptVariables }

export const BD_STAGE_FIELDS: Record<BdStage, ReadonlyArray<keyof BrandPromptVariables>> = {
  triagem: ["targetAudience", "audienceFears", "differentiators", "niche"],
  headlines: ["tone", "niche", "audienceDesires", "differentiators"],
  espinha: ["targetAudience", "audienceFears", "differentiators", "contentGoals"],
  "copy-blocks": ["tone", "brandVoice", "negativeTerms", "contentGoals"],
  legenda: ["preferredCTAs", "tone", "brandVoice"],
} as const

// Labels PT-BR são load-bearing: entram no prompt e afetam aderência do modelo.
export type SectionName = "VOZ" | "AUDIÊNCIA" | "POSICIONAMENTO" | "OBJETIVOS E CTAs"

type SectionDef = {
  name: SectionName
  fields: ReadonlyArray<readonly [label: string, key: keyof BrandPromptVariables]>
}

const SECTION_CATALOG: readonly SectionDef[] = [
  {
    name: "VOZ",
    fields: [
      ["Tom", "tone"],
      ["Vocabulário", "brandVoice"],
    ],
  },
  {
    name: "AUDIÊNCIA",
    fields: [
      ["Público", "targetAudience"],
      ["Dores", "audienceFears"],
      ["Desejos", "audienceDesires"],
    ],
  },
  {
    name: "POSICIONAMENTO",
    fields: [
      ["Nicho", "niche"],
      ["Diferenciais", "differentiators"],
    ],
  },
  {
    name: "OBJETIVOS E CTAs",
    fields: [
      ["Objetivos de conteúdo", "contentGoals"],
      ["CTAs preferidos", "preferredCTAs"],
      ["Termos a evitar", "negativeTerms"],
    ],
  },
] as const

export function renderSection(
  name: SectionName,
  fields: ReadonlyArray<readonly [label: string, key: keyof BrandPromptVariables]>,
  vars: BrandPromptVariables
): string {
  const lines: string[] = []
  for (const [label, key] of fields) {
    const raw = vars[key]
    if (!raw) continue
    const value = String(raw).trim()
    if (!value) continue
    lines.push(`- **${label}:** ${value}`)
  }
  if (lines.length === 0) return ""
  return [`## ${name}`, ...lines].join("\n")
}

// Ordem segue SECTION_CATALOG. Seções sem fields relevantes são omitidas.
export function getSectionsForStage(stage: BdStage): Array<{
  name: SectionName
  fields: ReadonlyArray<readonly [string, keyof BrandPromptVariables]>
}> {
  const stageFields = BD_STAGE_FIELDS[stage]
  if (!stageFields) {
    console.error(
      "[bd/brand-block-sections] stage desconhecido: %s — esperado um de %o",
      stage,
      Object.keys(BD_STAGE_FIELDS)
    )
    return []
  }
  const stageFieldSet = new Set<keyof BrandPromptVariables>(stageFields)
  const result: Array<{
    name: SectionName
    fields: ReadonlyArray<readonly [string, keyof BrandPromptVariables]>
  }> = []
  for (const section of SECTION_CATALOG) {
    const filtered = section.fields.filter(([, key]) => stageFieldSet.has(key))
    if (filtered.length === 0) continue
    result.push({ name: section.name, fields: filtered })
  }
  return result
}
