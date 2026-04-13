// Ponte entre o BrandConfig (DB) e o formato UserVariables que prompts.ts
// já consome. Mantém zero mudanças nos prompts — a marca vira uma camada
// base que user vars e inputs do wizard sobrescrevem.

import "server-only"
import { getActiveBrandConfig } from "./context"
import type { BrandConfig } from "./schema"

const TOM_ATRIBUTO_THRESHOLD = 60 // atributos com score >= 60 entram na descrição de tom

// Shape consumido por prompts.ts / llm.service.ts. Não importamos o tipo
// direto de user-variables.service.ts para evitar acoplamento — campos
// extras ou faltantes são ok, o consumer usa estrutura parcial.
export type BrandPromptVariables = {
  tone?: string
  brandVoice?: string
  niche?: string
  targetAudience?: string
  audienceFears?: string
  audienceDesires?: string
  negativeTerms?: string
  differentiators?: string
  contentGoals?: string
  preferredCTAs?: string
}

function joinIfAny(parts: Array<string | null | undefined>, sep = " | "): string | undefined {
  const filtered = parts.filter((s): s is string => !!s && s.trim().length > 0)
  return filtered.length > 0 ? filtered.join(sep) : undefined
}

export function brandConfigToPromptVariables(config: BrandConfig): BrandPromptVariables {
  return {
    tone: buildTone(config),
    brandVoice: buildBrandVoice(config),
    niche: buildNiche(config),
    targetAudience: buildTargetAudience(config),
    audienceFears: buildAudienceFears(config),
    audienceDesires: buildAudienceDesires(config),
    negativeTerms: buildNegativeTerms(config),
    differentiators: buildDifferentiators(config),
    contentGoals: buildContentGoals(config),
    preferredCTAs: buildPreferredCTAs(config),
  }
}

export async function getBrandPromptVariables(): Promise<BrandPromptVariables> {
  const config = await getActiveBrandConfig()
  if (!config) return {}
  return brandConfigToPromptVariables(config)
}

export function buildTone(config: BrandConfig): string | undefined {
  const { tom, atributos } = config.voice
  const tomText = tom.trim()
  const atrText = [
    atributos.direto >= TOM_ATRIBUTO_THRESHOLD ? "direto" : null,
    atributos.acessivel >= TOM_ATRIBUTO_THRESHOLD ? "acessível" : null,
    atributos.firme >= TOM_ATRIBUTO_THRESHOLD ? "firme" : null,
    atributos.humano >= TOM_ATRIBUTO_THRESHOLD ? "humano" : null,
    atributos.tecnico >= TOM_ATRIBUTO_THRESHOLD ? "técnico" : null,
  ]
    .filter(Boolean)
    .join(", ")

  return joinIfAny([tomText, atrText])
}

export function buildBrandVoice(config: BrandConfig): string | undefined {
  const vocab = config.voice.vocabulario.use
  if (vocab.length === 0) return undefined
  return `Termos oficiais: ${vocab.join(", ")}`
}

export function buildNiche(config: BrandConfig): string | undefined {
  const positioning = config.identity.positioning.trim()
  return positioning.length > 0 ? positioning : undefined
}

export function buildTargetAudience(config: BrandConfig): string | undefined {
  const { avatares } = config.audience
  if (avatares.length === 0) return undefined
  const rendered = avatares.map((a) =>
    joinIfAny([a.nome, a.faixaSalarial, a.estagio], " — ")
  )
  return joinIfAny(rendered)
}

export function buildAudienceFears(config: BrandConfig): string | undefined {
  const dores = config.audience.avatares.flatMap((a) => a.dores)
  return dores.length > 0 ? dores.join(", ") : undefined
}

export function buildAudienceDesires(config: BrandConfig): string | undefined {
  const desejos = config.audience.avatares.flatMap((a) => [a.busca, a.transformacao])
  return joinIfAny(desejos, ", ")
}

export function buildNegativeTerms(config: BrandConfig): string | undefined {
  const avoid = config.voice.vocabulario.avoid
  if (avoid.length === 0) return undefined
  // Formato esperado por user-variables.service.ts: string separada por vírgula.
  return avoid.join(", ")
}

export function buildDifferentiators(config: BrandConfig): string | undefined {
  const { positioning, antiPositioning, beliefs } = config.identity
  return joinIfAny(
    [
      positioning.trim() ? `Posicionamento: ${positioning.trim()}` : null,
      antiPositioning.trim() ? `Anti-posicionamento: ${antiPositioning.trim()}` : null,
      beliefs.length > 0 ? `Crenças que combatemos: ${beliefs.join("; ")}` : null,
    ],
    " ∥ "
  )
}

export function buildContentGoals(config: BrandConfig): string | undefined {
  const pilares = config.content.pilares
  if (pilares.length === 0) return undefined
  const rendered = pilares.map((p) => {
    const objetivo = p.objetivo.trim()
    return objetivo.length > 0 ? `${p.nome}: ${objetivo}` : p.nome
  })
  return joinIfAny(rendered)
}

export function buildPreferredCTAs(config: BrandConfig): string | undefined {
  const ctas = config.content.pilares.map((p) => p.cta.trim()).filter((s) => s.length > 0)
  return ctas.length > 0 ? ctas.join(" | ") : undefined
}
