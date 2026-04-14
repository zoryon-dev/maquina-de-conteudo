import { describe, it, expect, vi, beforeEach } from "vitest"

const assembleRagContextMock = vi.fn()
vi.mock("@/lib/rag/assembler", () => ({
  assembleRagContext: (...args: unknown[]) => assembleRagContextMock(...args),
}))

import { getBrandAutoRagContext } from "../brand-auto-inject"

describe("getBrandAutoRagContext", () => {
  beforeEach(() => {
    assembleRagContextMock.mockReset()
  })

  it("chama assembleRagContext com categories=['brand']", async () => {
    assembleRagContextMock.mockResolvedValue({
      context: "brand chunks...",
      sources: [
        { id: 26, title: "Zoryon v2 Projeto Base", category: "brand", score: 0.9, chunkCount: 3 },
      ],
      tokensUsed: 420,
      chunksIncluded: 3,
      truncated: false,
    })

    const result = await getBrandAutoRagContext("user_123", "some query")

    expect(assembleRagContextMock).toHaveBeenCalledWith(
      "user_123",
      "some query",
      expect.objectContaining({
        categories: ["brand"],
        threshold: 0.4,
        maxChunks: 5,
        maxTokens: 1500,
      })
    )
    expect(result).not.toBeNull()
    expect(result!.chunksIncluded).toBe(3)
  })

  it("retorna null quando nenhum chunk é encontrado", async () => {
    assembleRagContextMock.mockResolvedValue({
      context: "",
      sources: [],
      tokensUsed: 0,
      chunksIncluded: 0,
      truncated: false,
    })

    const result = await getBrandAutoRagContext("user_123", "query sem match")
    expect(result).toBeNull()
  })

  it("retorna null em erro (graceful degradation)", async () => {
    assembleRagContextMock.mockRejectedValue(new Error("Voyage down"))

    const result = await getBrandAutoRagContext("user_123", "q")
    expect(result).toBeNull()
  })
})
