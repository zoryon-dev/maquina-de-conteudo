import { describe, it, expect } from "vitest"
import {
  REFERENCIAS_EXEMPLARES,
  buildReferenciasPromptBlock,
} from "../referencias"

describe("REFERENCIAS_EXEMPLARES", () => {
  it("has exactly 2 references", () => {
    expect(REFERENCIAS_EXEMPLARES).toHaveLength(2)
  })

  it("every reference has a non-empty espinha.headline", () => {
    for (const ref of REFERENCIAS_EXEMPLARES) {
      expect(typeof ref.espinha.headline).toBe("string")
      expect(ref.espinha.headline.trim().length).toBeGreaterThan(0)
    }
  })

  it("every reference has a non-empty legenda", () => {
    for (const ref of REFERENCIAS_EXEMPLARES) {
      expect(typeof ref.legenda).toBe("string")
      expect(ref.legenda.trim().length).toBeGreaterThan(0)
    }
  })
})

describe("buildReferenciasPromptBlock", () => {
  it("with maxRefs=1 mentions only the first reference", () => {
    const block = buildReferenciasPromptBlock(1)

    // Um fragmento estável da primeira headline do Exemplo 1.
    const firstHeadlineFragment = "tema que você mais domina"
    // Um fragmento estável da headline do Exemplo 2.
    const secondHeadlineFragment = "droga favorita dos adultos ansiosos"

    expect(block).toContain(firstHeadlineFragment)
    expect(block).not.toContain(secondHeadlineFragment)
  })

  it("with maxRefs=2 mentions both references", () => {
    const block = buildReferenciasPromptBlock(2)

    expect(block).toContain("tema que você mais domina")
    expect(block).toContain("droga favorita dos adultos ansiosos")
  })

  it("called with no arg includes both references by default", () => {
    const block = buildReferenciasPromptBlock()
    expect(block).toContain("tema que você mais domina")
    expect(block).toContain("droga favorita dos adultos ansiosos")
  })
})
