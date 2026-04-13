import { describe, it, expect } from "vitest"
import { BLOCK_SPEC } from "../copy-blocks"

describe("BLOCK_SPEC invariants", () => {
  it("has exactly 18 entries", () => {
    expect(BLOCK_SPEC).toHaveLength(18)
  })

  it("indices are 1..18 consecutive", () => {
    const indices = BLOCK_SPEC.map((b) => b.index)
    const expected = Array.from({ length: 18 }, (_, i) => i + 1)
    expect(indices).toEqual(expected)
  })

  it("slides cover 1..9 with exactly 2 entries each", () => {
    const slideSet = new Set<number>()
    const countBySlide = new Map<number, number>()
    for (const spec of BLOCK_SPEC) {
      slideSet.add(spec.slide)
      countBySlide.set(spec.slide, (countBySlide.get(spec.slide) ?? 0) + 1)
    }

    const slideList = Array.from(slideSet).sort((a, b) => a - b)
    expect(slideList).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])

    for (let slide = 1; slide <= 9; slide++) {
      expect(countBySlide.get(slide)).toBe(2)
    }
  })

  it("position alternates 'a' (odd index within pair) and 'b' (even)", () => {
    for (const spec of BLOCK_SPEC) {
      // index 1,3,5,... → 'a'; 2,4,6,... → 'b'
      const expected = spec.index % 2 === 1 ? "a" : "b"
      expect(spec.position).toBe(expected)
    }
  })

  it("each slide has exactly one 'a' and one 'b'", () => {
    const bySlide = new Map<number, string[]>()
    for (const spec of BLOCK_SPEC) {
      const list = bySlide.get(spec.slide) ?? []
      list.push(spec.position)
      bySlide.set(spec.slide, list)
    }
    for (const [, positions] of bySlide) {
      const sorted = [...positions].sort()
      expect(sorted).toEqual(["a", "b"])
    }
  })

  it("targetWords[7] (bloco 8) is 34 — the longest", () => {
    expect(BLOCK_SPEC[7].targetWords).toBe(34)
    const max = Math.max(...BLOCK_SPEC.map((b) => b.targetWords))
    expect(max).toBe(34)
  })

  it("targetWords[0] (chapéu) is 7", () => {
    expect(BLOCK_SPEC[0].targetWords).toBe(7)
  })

  it("targetWords[1] (headline) is 9", () => {
    expect(BLOCK_SPEC[1].targetWords).toBe(9)
  })

  it("sectionLabel is consistent within each slide (shared prefix)", () => {
    const bySlide = new Map<number, string[]>()
    for (const spec of BLOCK_SPEC) {
      const list = bySlide.get(spec.slide) ?? []
      list.push(spec.sectionLabel)
      bySlide.set(spec.slide, list)
    }

    for (const [, labels] of bySlide) {
      expect(labels).toHaveLength(2)
      // Os dois labels do mesmo slide compartilham o prefixo antes do " — ".
      const [first, second] = labels
      const prefixFirst = first.split(" — ")[0]
      const prefixSecond = second.split(" — ")[0]
      expect(prefixFirst).toBe(prefixSecond)
    }
  })
})
