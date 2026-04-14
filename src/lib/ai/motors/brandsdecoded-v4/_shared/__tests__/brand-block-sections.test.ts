import { describe, it, expect } from "vitest"
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
