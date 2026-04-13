import { describe, it, expect } from "vitest"
import { pickHeadline } from "../orchestrator"
import type { GeneratedHeadline } from "../headline-patterns"

function mkHeadline(
  id: number,
  format: "IC" | "NM" = "IC",
  text?: string
): GeneratedHeadline {
  return { id, format, text: text ?? `Headline #${id}` }
}

describe("pickHeadline", () => {
  it("returns the headline with matching forcedHeadlineId", () => {
    const headlines = [
      mkHeadline(1),
      mkHeadline(2),
      mkHeadline(5, "NM", "Quinta headline"),
      mkHeadline(7),
    ]
    const result = pickHeadline(headlines, {
      autoSelectHeadline: false,
      forcedHeadlineId: 5,
    })
    expect(result.id).toBe(5)
    expect(result.text).toBe("Quinta headline")
  })

  it("throws when forcedHeadlineId does not exist", () => {
    const headlines = [mkHeadline(1), mkHeadline(2), mkHeadline(3)]
    expect(() =>
      pickHeadline(headlines, {
        autoSelectHeadline: false,
        forcedHeadlineId: 99,
      })
    ).toThrow(/99/)
  })

  it("returns id=1 when autoSelectHeadline=true and id=1 exists", () => {
    const headlines = [mkHeadline(2), mkHeadline(1), mkHeadline(3)]
    const result = pickHeadline(headlines, { autoSelectHeadline: true })
    expect(result.id).toBe(1)
  })

  it("returns first headline when autoSelectHeadline=true and id=1 is absent", () => {
    const headlines = [
      mkHeadline(2),
      mkHeadline(3),
      mkHeadline(4),
      mkHeadline(5),
      mkHeadline(6),
      mkHeadline(7),
      mkHeadline(8),
      mkHeadline(9),
      mkHeadline(10),
      mkHeadline(11),
    ]
    const result = pickHeadline(headlines, { autoSelectHeadline: true })
    expect(result.id).toBe(2)
  })

  it("throws when autoSelectHeadline=false and no forcedHeadlineId provided", () => {
    const headlines = [mkHeadline(1), mkHeadline(2)]
    expect(() =>
      pickHeadline(headlines, { autoSelectHeadline: false })
    ).toThrow()
  })

  it("throws when headlines array is empty", () => {
    expect(() =>
      pickHeadline([], { autoSelectHeadline: true })
    ).toThrow()
  })
})
