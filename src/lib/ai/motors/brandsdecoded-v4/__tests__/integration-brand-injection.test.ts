import { describe, it, expect } from "vitest"
import { buildBrandContextBlock } from "../_shared/brand-block"
import type { BdStage } from "../_shared/brand-block-sections"

/**
 * Integration test: simula as 5 stages do pipeline BD v4 com um conjunto
 * completo de brand prompt variables (shape Zoryon) e verifica invariantes
 * de segmentação — cada stage só recebe os campos relevantes.
 *
 * Motivação: quando trocarmos a renderização em produção, queremos um
 * contrato explícito que bloqueia regressão (ex: CTAs vazarem na triagem).
 */

const FULL_VARS = {
  tone: "editorial, assertivo",
  brandVoice: "usa verbos ativos",
  targetAudience: "profissionais de marketing",
  audienceFears: "virar commodity",
  audienceDesires: "autoridade sustentável",
  differentiators: "metodologia BD",
  niche: "estratégia de marca",
  negativeTerms: "guru, hack",
  contentGoals: "educar + gerar leads",
  preferredCTAs: "'Comenta aí' ou link na bio",
}

function renderStage(stage: BdStage): string {
  return buildBrandContextBlock(FULL_VARS, {
    stage,
    heading: "# CONTEXTO DE MARCA",
  })
}

describe("integration: brand injection por stage (BD v4)", () => {
  it("triagem: inclui AUDIÊNCIA e POSICIONAMENTO, exclui CTAs", () => {
    const out = renderStage("triagem")
    expect(out).toContain("AUDIÊNCIA")
    expect(out).toContain("POSICIONAMENTO")
    expect(out).not.toContain("CTAs")
    expect(out).not.toContain("preferredCTAs")
    expect(out).not.toContain("Comenta aí")
    // e não inclui negativeTerms que pertencem a OBJETIVOS
    expect(out).not.toContain("guru, hack")
  })

  it("headlines: inclui tone e niche, exclui negativeTerms", () => {
    const out = renderStage("headlines")
    // valores dos fields devem estar no output
    expect(out).toContain("editorial, assertivo") // tone
    expect(out).toContain("estratégia de marca") // niche
    expect(out).not.toContain("negativeTerms")
    expect(out).not.toContain("guru, hack")
  })

  it("espinha: inclui audiência + differentiators + contentGoals", () => {
    const out = renderStage("espinha")
    expect(out).toContain("profissionais de marketing") // targetAudience
    expect(out).toContain("metodologia BD") // differentiators
    expect(out).toContain("educar + gerar leads") // contentGoals
    // CTAs não entram na espinha
    expect(out).not.toContain("Comenta aí")
  })

  it("copy-blocks: inclui negativeTerms e voz", () => {
    const out = renderStage("copy-blocks")
    expect(out).toContain("guru, hack") // negativeTerms
    expect(out).toContain("editorial, assertivo") // tone
    expect(out).toContain("usa verbos ativos") // brandVoice
    // audiência/posicionamento não participam dessa etapa
    expect(out).not.toContain("profissionais de marketing")
  })

  it("legenda: inclui preferredCTAs + voz", () => {
    const out = renderStage("legenda")
    expect(out).toContain("Comenta aí") // preferredCTAs
    expect(out).toContain("editorial, assertivo") // tone
    expect(out).toContain("usa verbos ativos") // brandVoice
    // dores/desejos da audiência não entram na legenda
    expect(out).not.toContain("virar commodity")
    expect(out).not.toContain("autoridade sustentável")
  })

  it("cada stage produz headers de seção (## VOZ / ## AUDIÊNCIA / etc)", () => {
    const stages: BdStage[] = ["triagem", "headlines", "espinha", "copy-blocks", "legenda"]
    for (const stage of stages) {
      const out = renderStage(stage)
      // Pelo menos uma seção deve aparecer com seu header.
      expect(out).toMatch(/## (VOZ|AUDIÊNCIA|POSICIONAMENTO|OBJETIVOS E CTAs)/)
    }
  })

  it("vars vazias retorna string vazia (sem fallback) para qualquer stage", () => {
    const stages: BdStage[] = ["triagem", "headlines", "espinha", "copy-blocks", "legenda"]
    for (const stage of stages) {
      const out = buildBrandContextBlock({}, { stage })
      expect(out).toBe("")
    }
  })
})
