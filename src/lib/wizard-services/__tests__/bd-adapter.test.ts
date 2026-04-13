import { describe, it, expect } from "vitest"
import { bdResultToGeneratedContent, BD_TOTAL_SLIDES } from "../bd-adapter"
import type { BrandsDecodedResult } from "@/lib/ai/motors/brandsdecoded-v4"

// ============================================================================
// Fixtures
// ============================================================================

type BDBlock = BrandsDecodedResult["blocks"][number]

function mkBlock(slide: number, position: "a" | "b", text: string, idx?: number): BDBlock {
  // o BLOCK_SPEC define index/targetWords/sectionLabel — os testes não olham
  // esses campos, mas fornecemos valores plausíveis para tipo ser satisfeito.
  // Cast via `unknown` porque `CopyBlockSpec` é um union literal do BLOCK_SPEC,
  // e sintetizar blocos "livres" não casa com o tipo fechado.
  return {
    index: idx ?? (slide - 1) * 2 + (position === "a" ? 1 : 2),
    slide,
    position,
    targetWords: 20,
    sectionLabel: `slide ${slide} ${position}`,
    text,
  } as unknown as BDBlock
}

function mkResult(blocks: BDBlock[]): BrandsDecodedResult {
  return {
    triagem: {} as BrandsDecodedResult["triagem"],
    headlines: [],
    selectedHeadline: {
      id: 1,
      text: "Headline de teste",
      patternName: "IC",
    } as unknown as BrandsDecodedResult["selectedHeadline"],
    espinha: {} as BrandsDecodedResult["espinha"],
    blocks,
    legendaInstagram: "Legenda gerada no teste.",
  }
}

function mkCompleteBlocks(): BDBlock[] {
  const blocks: BDBlock[] = []
  for (let s = 1; s <= 9; s++) {
    blocks.push(mkBlock(s, "a", `Título S${s}`))
    blocks.push(mkBlock(s, "b", `Corpo S${s}`))
  }
  return blocks
}

// ============================================================================
// Tests
// ============================================================================

describe("bdResultToGeneratedContent", () => {
  it("mapeia 18 blocos completos para 9 slides title/content", () => {
    const bd = mkResult(mkCompleteBlocks())
    const content = bdResultToGeneratedContent(bd, {
      selectedNarrativeId: "nar-1",
      selectedNarrativeAngle: "herege",
      model: "gpt-5-mini",
      ragUsed: true,
    })

    expect(content.type).toBe("carousel")
    expect(content.slides).toHaveLength(BD_TOTAL_SLIDES)
    expect(content.slides).toHaveLength(9)

    for (let i = 0; i < 9; i++) {
      expect(content.slides![i].title).toBe(`Título S${i + 1}`)
      expect(content.slides![i].content).toBe(`Corpo S${i + 1}`)
      expect(content.slides![i].numero).toBe(i + 1)
    }

    expect(content.caption).toBe("Legenda gerada no teste.")
    expect(content.metadata.narrativeId).toBe("nar-1")
    expect(content.metadata.narrativeAngle).toBe("herege")
    expect(content.metadata.model).toBe("gpt-5-mini")
    expect(content.metadata.ragUsed).toBe(true)
    expect(content.metadata.narrativeTitle).toBe("Headline de teste")
  })

  it("bloco faltante (slide 5 sem position 'a') vira string vazia, sem throw", () => {
    const blocks = mkCompleteBlocks().filter(
      (b) => !(b.slide === 5 && b.position === "a")
    )
    const bd = mkResult(blocks)

    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    expect(content.slides).toHaveLength(9)
    expect(content.slides![4].title).toBe("")
    expect(content.slides![4].content).toBe("Corpo S5")
    expect(content.slides![4].numero).toBe(5)
  })

  it("blocos fora de ordem continuam mapeando corretamente (indexação por Map)", () => {
    // Embaralha os blocos em ordem reversa
    const blocks = [...mkCompleteBlocks()].reverse()
    const bd = mkResult(blocks)

    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    for (let i = 0; i < 9; i++) {
      expect(content.slides![i].title).toBe(`Título S${i + 1}`)
      expect(content.slides![i].content).toBe(`Corpo S${i + 1}`)
    }
  })

  it("selectedNarrativeId undefined → 'bd-auto'", () => {
    const bd = mkResult(mkCompleteBlocks())
    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    expect(content.metadata.narrativeId).toBe("bd-auto")
  })

  it("selectedNarrativeAngle undefined → 'tradutor' (fallback BD)", () => {
    const bd = mkResult(mkCompleteBlocks())
    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    expect(content.metadata.narrativeAngle).toBe("tradutor")
  })

  it("ragUsed default = false quando não informado", () => {
    const bd = mkResult(mkCompleteBlocks())
    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    expect(content.metadata.ragUsed).toBe(false)
  })

  it("todos os blocos ausentes → 9 slides vazios (sem throw)", () => {
    const bd = mkResult([])
    const content = bdResultToGeneratedContent(bd, {
      model: "gpt-5-mini",
    })

    expect(content.slides).toHaveLength(9)
    for (let i = 0; i < 9; i++) {
      expect(content.slides![i].title).toBe("")
      expect(content.slides![i].content).toBe("")
      expect(content.slides![i].numero).toBe(i + 1)
    }
  })
})
