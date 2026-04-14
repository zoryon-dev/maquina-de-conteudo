// Mapeamento semântico stage → seções de contexto de marca.
//
// WHY: cada etapa do pipeline BD v4 precisa de um subset diferente das
// variáveis de marca. Triagem não precisa de CTAs; legenda não precisa de
// fears; etc. Renderizar tudo em bullet flat polui o prompt e confunde o
// modelo. Aqui declaramos explicitamente quais campos cada stage consome e
// agrupamos esses campos em seções nomeadas (VOZ, AUDIÊNCIA, ...).

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

export type SectionName = "VOZ" | "AUDIÊNCIA" | "POSICIONAMENTO" | "OBJETIVOS E CTAs"

type SectionDef = {
  name: SectionName
  fields: ReadonlyArray<readonly [label: string, key: keyof BrandPromptVariables]>
}

// Catálogo de seções com labels humanos. Um mesmo key pode aparecer em
// várias seções em teoria, mas aqui cada key pertence a exatamente uma
// seção — se precisarmos repetir no futuro, basta duplicar.
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

/**
 * Dado um stage, retorna as seções relevantes (em ordem de catálogo) já
 * filtradas pelos fields daquele stage. Uma seção só aparece se pelo menos
 * um field dela estiver na lista do stage.
 */
export function getSectionsForStage(stage: BdStage): Array<{
  name: SectionName
  fields: ReadonlyArray<readonly [string, keyof BrandPromptVariables]>
}> {
  const stageFieldSet = new Set<keyof BrandPromptVariables>(BD_STAGE_FIELDS[stage])
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
