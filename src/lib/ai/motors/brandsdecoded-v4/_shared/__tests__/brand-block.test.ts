import { describe, it, expect } from "vitest"
import { buildBrandContextBlock } from "../brand-block"

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

describe("buildBrandContextBlock — legacy mode (sem stage)", () => {
  it("gera bullet flat com key:value para cada var", () => {
    const out = buildBrandContextBlock({ tone: "X", niche: "Y" })
    expect(out).toContain("# CONTEXTO DE MARCA")
    expect(out).toContain("- **tone:** X")
    expect(out).toContain("- **niche:** Y")
  })

  // T2 — Byte-for-byte snapshot. `toContain` é flexível demais para refactors
  // silenciosos (ex: mudar a ordem de campos, retirar linha em branco).
  it("legacy mode output é byte-for-byte estável (backcompat snapshot)", () => {
    const out = buildBrandContextBlock({
      tone: "editorial",
      niche: "estratégia",
      targetAudience: "PMEs",
    })
    expect(out).toBe(
      "# CONTEXTO DE MARCA\n\n- **tone:** editorial\n- **niche:** estratégia\n- **targetAudience:** PMEs"
    )
  })

  it("legacy + heading + note é byte-for-byte estável (backcompat snapshot)", () => {
    const out = buildBrandContextBlock(
      { tone: "X" },
      { heading: "## CUSTOM", note: "nota" }
    )
    expect(out).toBe("## CUSTOM\nnota\n\n- **tone:** X")
  })

  it("filtra vars vazias / whitespace", () => {
    const out = buildBrandContextBlock({ tone: "X", niche: "  ", brandVoice: "" })
    expect(out).toContain("- **tone:** X")
    expect(out).not.toContain("niche")
    expect(out).not.toContain("brandVoice")
  })

  it("retorna fallback quando vars vazias", () => {
    const out = buildBrandContextBlock(undefined, { fallback: "## vazio" })
    expect(out).toBe("## vazio")
  })

  it("retorna string vazia quando vars vazias e sem fallback", () => {
    const out = buildBrandContextBlock({})
    expect(out).toBe("")
  })

  it("respeita heading customizado", () => {
    const out = buildBrandContextBlock({ tone: "X" }, { heading: "## CUSTOM" })
    expect(out).toContain("## CUSTOM")
    expect(out).not.toContain("# CONTEXTO DE MARCA")
  })

  it("respeita note customizado", () => {
    const out = buildBrandContextBlock(
      { tone: "X" },
      { note: "injetar sem citar" }
    )
    expect(out).toContain("injetar sem citar")
  })
})

describe("buildBrandContextBlock — stage mode (semântico)", () => {
  it("stage=triagem renderiza AUDIÊNCIA + POSICIONAMENTO, não OBJETIVOS", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "triagem" })
    expect(out).toContain("## AUDIÊNCIA")
    expect(out).toContain("## POSICIONAMENTO")
    expect(out).not.toContain("## OBJETIVOS E CTAs")
    expect(out).not.toContain("Comenta aí")
  })

  it("stage=headlines inclui VOZ mas não negativeTerms", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "headlines" })
    expect(out).toContain("## VOZ")
    expect(out).toContain("Tom")
    expect(out).not.toContain("guru, hack")
    expect(out).not.toContain("Termos a evitar")
  })

  it("stage=legenda inclui CTAs + VOZ", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "legenda" })
    expect(out).toContain("## OBJETIVOS E CTAs")
    expect(out).toContain("Comenta aí")
    expect(out).toContain("## VOZ")
  })

  it("stage=copy-blocks inclui negativeTerms", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "copy-blocks" })
    expect(out).toContain("guru, hack")
    expect(out).toContain("## VOZ")
  })

  it("stage=espinha inclui audiência + objetivos", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "espinha" })
    expect(out).toContain("## AUDIÊNCIA")
    expect(out).toContain("## OBJETIVOS E CTAs")
  })

  it("stage + vars vazias retorna fallback", () => {
    const out = buildBrandContextBlock(
      {},
      { stage: "triagem", fallback: "## MARCA — ausente" }
    )
    expect(out).toBe("## MARCA — ausente")
  })

  it("stage respeita heading customizado", () => {
    const out = buildBrandContextBlock(FULL_VARS, {
      stage: "triagem",
      heading: "# CUSTOM HEAD",
    })
    expect(out).toContain("# CUSTOM HEAD")
    expect(out).not.toContain("# CONTEXTO DE MARCA\n")
  })

  it("stage respeita note customizado", () => {
    const out = buildBrandContextBlock(FULL_VARS, {
      stage: "triagem",
      note: "nota especial aqui",
    })
    expect(out).toContain("nota especial aqui")
  })

  it("stage não produz bullets flat - **key:** (formato legacy)", () => {
    const out = buildBrandContextBlock(FULL_VARS, { stage: "triagem" })
    // Legacy usa "- **tone:**" com chave crua. Stage mode usa labels humanos.
    expect(out).not.toContain("- **targetAudience:**")
    expect(out).not.toContain("- **differentiators:**")
    expect(out).toContain("- **Público:**")
  })
})
