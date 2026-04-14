import { describe, it, expect, vi } from "vitest"
import {
  BD_STAGE_FIELDS,
  getSectionsForStage,
  renderSection,
  type BdStage,
} from "../brand-block-sections"

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

describe("BD_STAGE_FIELDS", () => {
  it("triagem foca em audiência + posicionamento", () => {
    expect(BD_STAGE_FIELDS.triagem).toContain("targetAudience")
    expect(BD_STAGE_FIELDS.triagem).toContain("audienceFears")
    expect(BD_STAGE_FIELDS.triagem).toContain("differentiators")
    // triagem NÃO precisa de CTAs
    expect(BD_STAGE_FIELDS.triagem).not.toContain("preferredCTAs")
  })

  it("headlines foca em voz + nicho + desejos", () => {
    expect(BD_STAGE_FIELDS.headlines).toContain("tone")
    expect(BD_STAGE_FIELDS.headlines).toContain("niche")
    expect(BD_STAGE_FIELDS.headlines).toContain("audienceDesires")
    // headlines não precisa de termos proibidos nessa camada
    expect(BD_STAGE_FIELDS.headlines).not.toContain("negativeTerms")
  })

  it("espinha foca em audiência + diferenciação + objetivos", () => {
    expect(BD_STAGE_FIELDS.espinha).toContain("targetAudience")
    expect(BD_STAGE_FIELDS.espinha).toContain("differentiators")
    expect(BD_STAGE_FIELDS.espinha).toContain("contentGoals")
  })

  it("copy-blocks inclui negativeTerms e voz", () => {
    expect(BD_STAGE_FIELDS["copy-blocks"]).toContain("tone")
    expect(BD_STAGE_FIELDS["copy-blocks"]).toContain("brandVoice")
    expect(BD_STAGE_FIELDS["copy-blocks"]).toContain("negativeTerms")
    expect(BD_STAGE_FIELDS["copy-blocks"]).toContain("contentGoals")
  })

  it("legenda foca em CTA + voz", () => {
    expect(BD_STAGE_FIELDS.legenda).toContain("preferredCTAs")
    expect(BD_STAGE_FIELDS.legenda).toContain("tone")
    expect(BD_STAGE_FIELDS.legenda).toContain("brandVoice")
  })

  it("cobre todos os 5 stages", () => {
    const keys = Object.keys(BD_STAGE_FIELDS) as BdStage[]
    expect(keys.sort()).toEqual(
      ["copy-blocks", "espinha", "headlines", "legenda", "triagem"].sort()
    )
  })
})

describe("renderSection", () => {
  it("renderiza seção com header e bullets labeled", () => {
    const out = renderSection(
      "VOZ",
      [
        ["Tom", "tone"],
        ["Vocabulário", "brandVoice"],
      ],
      FULL_VARS
    )
    expect(out).toContain("## VOZ")
    expect(out).toContain("- **Tom:** editorial, assertivo")
    expect(out).toContain("- **Vocabulário:** usa verbos ativos")
  })

  it("pula campos vazios ou ausentes", () => {
    const out = renderSection(
      "VOZ",
      [
        ["Tom", "tone"],
        ["Vocabulário", "brandVoice"],
      ],
      { tone: "editorial" }
    )
    expect(out).toContain("- **Tom:** editorial")
    expect(out).not.toContain("Vocabulário")
  })

  it("retorna string vazia se nenhum campo estiver presente", () => {
    const out = renderSection(
      "VOZ",
      [
        ["Tom", "tone"],
        ["Vocabulário", "brandVoice"],
      ],
      { targetAudience: "outra coisa" }
    )
    expect(out).toBe("")
  })

  it("ignora valores só com whitespace", () => {
    const out = renderSection(
      "VOZ",
      [["Tom", "tone"]],
      { tone: "   " }
    )
    expect(out).toBe("")
  })
})

describe("getSectionsForStage", () => {
  it("triagem retorna AUDIÊNCIA + POSICIONAMENTO (sem OBJETIVOS/VOZ)", () => {
    const sections = getSectionsForStage("triagem")
    const names = sections.map((s) => s.name)
    expect(names).toContain("AUDIÊNCIA")
    expect(names).toContain("POSICIONAMENTO")
    expect(names).not.toContain("OBJETIVOS E CTAs")
    expect(names).not.toContain("VOZ")
  })

  it("headlines inclui VOZ + AUDIÊNCIA + POSICIONAMENTO", () => {
    const sections = getSectionsForStage("headlines")
    const names = sections.map((s) => s.name)
    expect(names).toContain("VOZ")
    // audienceDesires está em AUDIÊNCIA
    expect(names).toContain("AUDIÊNCIA")
    expect(names).toContain("POSICIONAMENTO")
  })

  it("legenda inclui OBJETIVOS E CTAs + VOZ", () => {
    const sections = getSectionsForStage("legenda")
    const names = sections.map((s) => s.name)
    expect(names).toContain("OBJETIVOS E CTAs")
    expect(names).toContain("VOZ")
  })

  it("copy-blocks inclui VOZ + OBJETIVOS E CTAs", () => {
    const sections = getSectionsForStage("copy-blocks")
    const names = sections.map((s) => s.name)
    expect(names).toContain("VOZ")
    expect(names).toContain("OBJETIVOS E CTAs")
  })

  it("cada seção tem fields filtrados para aquele stage", () => {
    const sections = getSectionsForStage("headlines")
    const vozFields = sections.find((s) => s.name === "VOZ")?.fields.map(([, k]) => k)
    // headlines tem tone mas NÃO brandVoice
    expect(vozFields).toContain("tone")
    expect(vozFields).not.toContain("brandVoice")
  })
})

/**
 * T5 — Section ordering lock. A ordem das seções segue o catálogo interno
 * (VOZ → AUDIÊNCIA → POSICIONAMENTO → OBJETIVOS E CTAs). Locking essa ordem
 * bloqueia refactors que podem embaralhar silenciosamente a apresentação no
 * prompt — o modelo é sensível a ordem.
 */
describe("section ordering invariants (T5)", () => {
  it("getSectionsForStage('headlines') retorna seções em ordem do catálogo", () => {
    const names = getSectionsForStage("headlines").map((s) => s.name)
    // Catálogo: VOZ, AUDIÊNCIA, POSICIONAMENTO, OBJETIVOS E CTAs
    // headlines fields: tone, niche, audienceDesires, differentiators
    // → VOZ (tone), AUDIÊNCIA (audienceDesires), POSICIONAMENTO (niche+differentiators)
    expect(names).toEqual(["VOZ", "AUDIÊNCIA", "POSICIONAMENTO"])
  })

  it("getSectionsForStage('triagem') exclui OBJETIVOS e VOZ, na ordem", () => {
    const names = getSectionsForStage("triagem").map((s) => s.name)
    // triagem fields: targetAudience, audienceFears, differentiators, niche
    // → AUDIÊNCIA, POSICIONAMENTO
    expect(names).toEqual(["AUDIÊNCIA", "POSICIONAMENTO"])
    expect(names).not.toContain("OBJETIVOS E CTAs")
    expect(names).not.toContain("VOZ")
  })

  it("getSectionsForStage('legenda') inclui OBJETIVOS (CTAs) e VOZ, na ordem", () => {
    const names = getSectionsForStage("legenda").map((s) => s.name)
    // legenda fields: preferredCTAs, tone, brandVoice
    // → VOZ (tone+brandVoice), OBJETIVOS E CTAs (preferredCTAs)
    expect(names).toEqual(["VOZ", "OBJETIVOS E CTAs"])
  })

  it("getSectionsForStage('espinha') retorna AUDIÊNCIA + POSICIONAMENTO + OBJETIVOS", () => {
    const names = getSectionsForStage("espinha").map((s) => s.name)
    // espinha fields: targetAudience, audienceFears, differentiators, contentGoals
    expect(names).toEqual(["AUDIÊNCIA", "POSICIONAMENTO", "OBJETIVOS E CTAs"])
  })

  it("getSectionsForStage('copy-blocks') retorna VOZ + OBJETIVOS (sem AUDIÊNCIA/POSICIONAMENTO)", () => {
    const names = getSectionsForStage("copy-blocks").map((s) => s.name)
    // copy-blocks fields: tone, brandVoice, negativeTerms, contentGoals
    expect(names).toEqual(["VOZ", "OBJETIVOS E CTAs"])
  })
})

/**
 * T4 — Empty-section-collapse. Quando um stage tem fields que se mapeiam
 * para uma seção, mas nenhum deles é fornecido nas vars, a seção inteira
 * NÃO deve aparecer no output. Header órfão polui o prompt e confunde o LLM.
 */
describe("empty-section-collapse (T4)", () => {
  it("stage=headlines com apenas audienceDesires não renderiza header VOZ vazio", async () => {
    const { buildBrandContextBlock } = await import("../brand-block")
    const out = buildBrandContextBlock(
      { audienceDesires: "autoridade" },
      { stage: "headlines" }
    )
    expect(out).toContain("autoridade")
    // VOZ apareceria se tone/brandVoice estivessem setados — não estão.
    expect(out).not.toContain("## VOZ")
    // POSICIONAMENTO também não tem fields presentes.
    expect(out).not.toContain("## POSICIONAMENTO")
    // Apenas AUDIÊNCIA renderiza.
    expect(out).toContain("## AUDIÊNCIA")
  })

  it("renderSection retorna string vazia quando nenhum field está presente → omitido do join", async () => {
    const { buildBrandContextBlock } = await import("../brand-block")
    // espinha fields: targetAudience, audienceFears, differentiators, contentGoals
    // Passamos só differentiators: POSICIONAMENTO deve aparecer; AUDIÊNCIA e OBJETIVOS não.
    const out = buildBrandContextBlock(
      { differentiators: "metodologia única" },
      { stage: "espinha" }
    )
    expect(out).toContain("## POSICIONAMENTO")
    expect(out).toContain("metodologia única")
    expect(out).not.toContain("## AUDIÊNCIA")
    expect(out).not.toContain("## OBJETIVOS E CTAs")
  })
})

/**
 * T6 — Runtime guard. Quando um caller passa um stage inválido (cast forçado
 * via `as BdStage` em uso real), a função deve retornar [] e logar um erro
 * explícito em vez de produzir output silenciosamente vazio. Assume o fix C3
 * do agente de produção.
 */
describe("runtime guard em stage desconhecido (T6)", () => {
  it("getSectionsForStage loga e retorna [] para stage desconhecido", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const result = getSectionsForStage("nonexistent" as BdStage)
      expect(result).toEqual([])
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})
