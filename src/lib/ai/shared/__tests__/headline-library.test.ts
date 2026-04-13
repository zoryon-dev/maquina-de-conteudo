import { describe, it, expect } from "vitest"
import {
  getAllHeadlinePatterns,
  getHeadlinePattern,
  buildHeadlineLibraryPromptBlock,
} from "../headline-library"

describe("headline-library", () => {
  it("getAllHeadlinePatterns returns an array of length 8", () => {
    const patterns = getAllHeadlinePatterns()
    expect(Array.isArray(patterns)).toBe(true)
    expect(patterns).toHaveLength(8)
  })

  it("all 8 ids are unique", () => {
    const patterns = getAllHeadlinePatterns()
    const ids = patterns.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
    expect(uniqueIds.size).toBe(8)
  })

  it("each pattern has at least 3 examples", () => {
    const patterns = getAllHeadlinePatterns()
    for (const p of patterns) {
      expect(p.examples.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("getHeadlinePattern('morte_de_x') has avgLikes ~= 57000 (±10k)", () => {
    const pattern = getHeadlinePattern("morte_de_x")
    expect(pattern).toBeDefined()
    expect(pattern!.avgLikes).toBeDefined()
    expect(Math.abs((pattern!.avgLikes ?? 0) - 57000)).toBeLessThanOrEqual(10000)
  })

  it("getHeadlinePattern('inexistente') returns undefined", () => {
    const pattern = getHeadlinePattern("inexistente")
    expect(pattern).toBeUndefined()
  })

  it("buildHeadlineLibraryPromptBlock contains 'A Morte' or 'morte_de_x'", () => {
    const block = buildHeadlineLibraryPromptBlock()
    const containsReference =
      block.includes("A Morte") || block.includes("morte_de_x")
    expect(containsReference).toBe(true)
  })

  it("buildHeadlineLibraryPromptBlock includes the number 57 (from ~57k likes)", () => {
    const block = buildHeadlineLibraryPromptBlock()
    expect(block).toMatch(/57/)
  })
})
