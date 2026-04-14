import { describe, it, expect } from "vitest"
import { resolveBdBriefing } from "../bd-briefing-resolver"

describe("resolveBdBriefing", () => {
  it("seeds presentes → consolida + source='seeds'", () => {
    const r = resolveBdBriefing({
      seeds: [{ id: "1", type: "theme", value: "x", briefing: "X" }],
      theme: "should be ignored",
    })
    expect(r.source).toBe("seeds")
    expect(r.seedsCount).toBe(1)
    expect(r.briefing).toContain("X")
  })

  it("seeds vazias + theme → fallback theme", () => {
    const r = resolveBdBriefing({ seeds: [], theme: "fallback theme" })
    expect(r.source).toBe("theme")
    expect(r.briefing).toBe("fallback theme")
    expect(r.seedsCount).toBe(0)
  })

  it("seeds null + theme → fallback", () => {
    const r = resolveBdBriefing({ seeds: null, theme: "ok" })
    expect(r.source).toBe("theme")
    expect(r.briefing).toBe("ok")
  })

  it("seeds undefined + theme → fallback", () => {
    const r = resolveBdBriefing({ seeds: undefined, theme: "ok" })
    expect(r.source).toBe("theme")
    expect(r.briefing).toBe("ok")
  })

  it("seeds não-array (objeto) + theme → fallback (Array.isArray guard)", () => {
    const r = resolveBdBriefing({
      seeds: { not: "array" } as unknown,
      theme: "ok",
    })
    expect(r.source).toBe("theme")
    expect(r.briefing).toBe("ok")
  })

  it("seeds vazias + theme null → empty", () => {
    const r = resolveBdBriefing({ seeds: [], theme: null })
    expect(r.source).toBe("empty")
    expect(r.briefing).toBeUndefined()
    expect(r.seedsCount).toBe(0)
  })

  it("seeds vazias + theme undefined → empty", () => {
    const r = resolveBdBriefing({ seeds: [] })
    expect(r.source).toBe("empty")
    expect(r.briefing).toBeUndefined()
  })

  it("seeds vazias + theme whitespace-only → empty (trim)", () => {
    const r = resolveBdBriefing({ seeds: [], theme: "   " })
    expect(r.source).toBe("empty")
    expect(r.briefing).toBeUndefined()
  })

  it("seeds vazias + theme vazio string → empty", () => {
    const r = resolveBdBriefing({ seeds: [], theme: "" })
    expect(r.source).toBe("empty")
  })

  it("seeds.length > 0 mas uma sem briefing → ainda consolida via value", () => {
    const r = resolveBdBriefing({
      seeds: [{ id: "1", type: "keyword", value: "marketing" }],
      theme: "ignored",
    })
    expect(r.source).toBe("seeds")
    expect(r.seedsCount).toBe(1)
    expect(r.briefing).toContain("marketing")
    expect(r.briefing).toContain("### FONTE 1 (keyword)")
  })

  it("múltiplas seeds → todas aparecem + separador entre elas", () => {
    const r = resolveBdBriefing({
      seeds: [
        { id: "1", type: "link", value: "https://a.com", briefing: "A" },
        { id: "2", type: "youtube", value: "https://y.com/b", briefing: "B" },
      ],
      theme: null,
    })
    expect(r.source).toBe("seeds")
    expect(r.seedsCount).toBe(2)
    expect(r.briefing).toContain("### FONTE 1 (link)")
    expect(r.briefing).toContain("### FONTE 2 (youtube)")
    expect(r.briefing).toContain("---")
  })
})
