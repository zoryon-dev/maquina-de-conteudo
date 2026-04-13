import { describe, it, expect } from "vitest"
import {
  buildHeadlinePatternsBlock,
  buildHeadlineLibraryPromptBlock,
  getAllHeadlinePatterns,
  type HeadlinePatternId,
} from "../headline-library"

describe("buildHeadlinePatternsBlock", () => {
  it("sem ids retorna todos os 8 padrões", () => {
    const block = buildHeadlinePatternsBlock()
    const all = getAllHeadlinePatterns()
    expect(block).toContain(`(${all.length})`)
    for (const p of all) {
      expect(block).toContain(p.name)
    }
  })

  it("com subset retorna apenas os ids selecionados", () => {
    const ids: HeadlinePatternId[] = ["morte_de_x", "investigando_x"]
    const block = buildHeadlinePatternsBlock(ids)
    expect(block).toContain("(2)")
    expect(block).toContain("Morte")
    expect(block).toContain("Investigando")
    // não inclui um padrão fora do subset
    expect(block).not.toContain("Provocação Existencial")
  })

  it("array vazio retorna todos (fallback semântico)", () => {
    const block = buildHeadlinePatternsBlock([])
    const all = getAllHeadlinePatterns()
    expect(block).toContain(`(${all.length})`)
  })

  it("ids inválidos resultam em bloco vazio", () => {
    const block = buildHeadlinePatternsBlock(["nope" as HeadlinePatternId])
    expect(block).toBe("")
  })

  it("inclui exemplos limitados (top 2)", () => {
    const block = buildHeadlinePatternsBlock(["morte_de_x"])
    const lines = block.split("\n").filter((l) => l.startsWith("  - "))
    expect(lines.length).toBeLessThanOrEqual(2)
  })
})

describe("compatibilidade buildHeadlineLibraryPromptBlock (legado)", () => {
  it("ainda funciona e inclui todos os padrões", () => {
    const block = buildHeadlineLibraryPromptBlock()
    expect(block).toContain("BANCO DE PADRÕES")
    for (const p of getAllHeadlinePatterns()) {
      expect(block).toContain(p.name)
    }
  })
})
