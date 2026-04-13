import { describe, it, expect } from "vitest"
import { parseCopyBlocksResponse, BLOCK_SPEC } from "../copy-blocks"

function buildFullBlocksArray(): Array<{ index: number; text: string }> {
  return Array.from({ length: 18 }, (_, i) => ({
    index: i + 1,
    text: `bloco ${i + 1} — texto de teste com conteúdo suficiente.`,
  }))
}

function buildFullJsonPayload(): string {
  return JSON.stringify({ blocks: buildFullBlocksArray() })
}

describe("parseCopyBlocksResponse", () => {
  it("parses valid JSON with 18 blocks and normalizes via BLOCK_SPEC", () => {
    const raw = buildFullJsonPayload()
    const blocks = parseCopyBlocksResponse(raw)

    expect(blocks).toHaveLength(18)

    for (let i = 0; i < 18; i++) {
      const spec = BLOCK_SPEC[i]
      const block = blocks[i]
      expect(block.index).toBe(spec.index)
      expect(block.slide).toBe(spec.slide)
      expect(block.position).toBe(spec.position)
      expect(block.targetWords).toBe(spec.targetWords)
      expect(block.text).toContain(`bloco ${spec.index}`)
    }
  })

  it("parses JSON wrapped in ```json fenced code block", () => {
    const payload = buildFullJsonPayload()
    const raw = "```json\n" + payload + "\n```"
    const blocks = parseCopyBlocksResponse(raw)
    expect(blocks).toHaveLength(18)
    expect(blocks[0].index).toBe(1)
  })

  it("parses JSON with prose before and after via first '{' / last '}' fallback", () => {
    const payload = buildFullJsonPayload()
    const raw = `Aqui está o JSON solicitado:\n\n${payload}\n\nEspero que ajude!`
    const blocks = parseCopyBlocksResponse(raw)
    expect(blocks).toHaveLength(18)
    expect(blocks[17].index).toBe(18)
  })

  it("throws with helpful message when block 7 is missing", () => {
    const arr = buildFullBlocksArray().filter((b) => b.index !== 7)
    const raw = JSON.stringify({ blocks: arr })

    expect(() => parseCopyBlocksResponse(raw)).toThrow(/7|ausente/i)
  })

  it("discards out-of-range indices (42) silently; throws if result incomplete", () => {
    const arr = buildFullBlocksArray()
    // Troca o bloco 5 por um com index fora do range; o parser deve descartar
    // o 42 e então falhar porque o bloco 5 está ausente.
    const mutated = [
      ...arr.filter((b) => b.index !== 5),
      { index: 42, text: "fora do range — deve ser descartado" },
    ]
    const raw = JSON.stringify({ blocks: mutated })

    expect(() => parseCopyBlocksResponse(raw)).toThrow(/5|ausente/i)
  })

  it("accepts out-of-range 42 when the 18 válidos estão todos presentes", () => {
    const arr = buildFullBlocksArray()
    const mutated = [
      ...arr,
      { index: 42, text: "extra fora do range — descartado" },
    ]
    const raw = JSON.stringify({ blocks: mutated })
    const blocks = parseCopyBlocksResponse(raw)
    expect(blocks).toHaveLength(18)
  })

  it("discards blocks with empty text and throws if that leaves gap", () => {
    const arr = buildFullBlocksArray().map((b) =>
      b.index === 9 ? { index: 9, text: "   " } : b
    )
    const raw = JSON.stringify({ blocks: arr })
    expect(() => parseCopyBlocksResponse(raw)).toThrow(/9|ausente/i)
  })

  it("throws on completely invalid JSON", () => {
    const raw = "isto não é json — apenas texto aleatório sem chaves"
    expect(() => parseCopyBlocksResponse(raw)).toThrow()
  })
})
