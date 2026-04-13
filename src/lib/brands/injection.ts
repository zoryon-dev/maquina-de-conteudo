// Ponte entre o BrandConfig (DB) e o formato UserVariables que prompts.ts
// já consome. Mantém zero mudanças nos prompts — a marca vira uma camada
// base que user vars e inputs do wizard sobrescrevem.

import "server-only"
import { getActiveBrandConfig } from "./context"
import type { BrandConfig } from "./schema"

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

// ── builders (exportados para uso avançado, ex: injeção parcial em prompts
//    específicos que só precisam de um bloco) ──

export function buildTone(config: BrandConfig): string | undefined {
  const { tom, atributos } = config.voice
  const tomText = tom.trim()
  const atrText = [
    atributos.direto >= 60 ? "direto" : null,
    atributos.acessivel >= 60 ? "acessível" : null,
    atributos.firme >= 60 ? "firme" : null,
    atributos.humano >= 60 ? "humano" : null,
    atributos.tecnico >= 60 ? "técnico" : null,
  ]
    .filter(Boolean)
    .join(", ")

  const parts = [tomText, atrText].filter((s) => s && s.length > 0)
  return parts.length > 0 ? parts.join(" | ") : undefined
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
  return avatares
    .map((a) => {
      const parts = [a.nome, a.faixaSalarial, a.estagio].filter((p) => p && p.trim().length > 0)
      return parts.join(" — ")
    })
    .filter((s) => s.length > 0)
    .join(" | ")
}

export function buildAudienceFears(config: BrandConfig): string | undefined {
  const dores = config.audience.avatares.flatMap((a) => a.dores)
  return dores.length > 0 ? dores.join("; ") : undefined
}

export function buildAudienceDesires(config: BrandConfig): string | undefined {
  const desejos = config.audience.avatares
    .flatMap((a) => [a.busca, a.transformacao])
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return desejos.length > 0 ? desejos.join("; ") : undefined
}

export function buildNegativeTerms(config: BrandConfig): string | undefined {
  const avoid = config.voice.vocabulario.avoid
  if (avoid.length === 0) return undefined
  // Formato esperado por user-variables.service.ts: string separada por vírgula.
  return avoid.join(", ")
}

export function buildDifferentiators(config: BrandConfig): string | undefined {
  const { positioning, antiPositioning, beliefs } = config.identity
  const parts: string[] = []
  if (positioning.trim()) parts.push(`Posicionamento: ${positioning.trim()}`)
  if (antiPositioning.trim()) parts.push(`Anti-posicionamento: ${antiPositioning.trim()}`)
  if (beliefs.length > 0) parts.push(`Crenças que combatemos: ${beliefs.join("; ")}`)
  return parts.length > 0 ? parts.join(" ∥ ") : undefined
}

export function buildContentGoals(config: BrandConfig): string | undefined {
  const pilares = config.content.pilares
  if (pilares.length === 0) return undefined
  return pilares
    .map((p) => {
      const objetivo = p.objetivo.trim()
      return objetivo.length > 0 ? `${p.nome}: ${objetivo}` : p.nome
    })
    .join(" | ")
}

export function buildPreferredCTAs(config: BrandConfig): string | undefined {
  const ctas = config.content.pilares
    .map((p) => p.cta.trim())
    .filter((s) => s.length > 0)
  return ctas.length > 0 ? ctas.join(" | ") : undefined
}

// ── merge helper: combina marca (base) + user vars (override) ──
// Strings vazias em override NÃO sobrescrevem a base (permite user apagar
// um campo pra "voltar ao da marca"). Usar null/undefined explicitos ou
// string com espaços não-vazia para override efetivo.

export function mergeBrandWithUserVars<T extends BrandPromptVariables>(
  brandVars: BrandPromptVariables,
  userVars: T
): T & BrandPromptVariables {
  const merged = { ...brandVars } as T & BrandPromptVariables
  for (const key of Object.keys(userVars) as Array<keyof T>) {
    const value = userVars[key]
    if (typeof value === "string" && value.trim().length > 0) {
      ;(merged as Record<string, unknown>)[key as string] = value
    } else if (typeof value !== "string" && value !== undefined && value !== null) {
      ;(merged as Record<string, unknown>)[key as string] = value
    }
  }
  return merged
}
