import { describe, it, expect, vi, beforeEach } from "vitest"

const assembleRagContextMock = vi.fn()
const getBrandAutoRagContextMock = vi.fn()
const isFeatureEnabledMock = vi.fn()

vi.mock("@/lib/rag/brand-auto-inject", () => ({
  getBrandAutoRagContext: (...args: unknown[]) => getBrandAutoRagContextMock(...args),
}))

vi.mock("@/lib/features", () => ({
  isFeatureEnabled: (...args: unknown[]) => isFeatureEnabledMock(...args),
}))

// Mock the assembler module so that the real generateWizardRagContext (which
// the merge function calls internally) is driven by our mock — and so that
// loading rag.service does not pull in @/lib/voyage (requires ENCRYPTION_KEY).
vi.mock("@/lib/rag/assembler", () => ({
  assembleRagContext: (...args: unknown[]) => assembleRagContextMock(...args),
  isRagAvailable: vi.fn(),
  getRagStats: vi.fn(),
}))

import {
  BRAND_SECTION_HEADER,
  USER_SECTION_HEADER,
  generateWizardRagContext,
  generateWizardRagContextWithBrand,
} from "../rag.service"

/**
 * Helper: drive the real generateWizardRagContext via the mocked assembleRagContext.
 * Pass `null` to make the inner function return `{success: true, data: null}`.
 */
function setUserRag(data: { context: string; sources: Array<{ id: number; title: string }>; tokensUsed: number; chunksIncluded: number } | null) {
  if (data === null) {
    assembleRagContextMock.mockResolvedValue({
      context: "",
      sources: [],
      tokensUsed: 0,
      chunksIncluded: 0,
      truncated: false,
    })
  } else {
    assembleRagContextMock.mockResolvedValue({
      context: data.context,
      sources: data.sources.map((s) => ({
        id: s.id,
        title: s.title,
        category: "general",
        score: 0.8,
        chunkCount: 1,
      })),
      tokensUsed: data.tokensUsed,
      chunksIncluded: data.chunksIncluded,
      truncated: false,
    })
  }
}

describe("generateWizardRagContextWithBrand", () => {
  beforeEach(() => {
    assembleRagContextMock.mockReset()
    getBrandAutoRagContextMock.mockReset()
    isFeatureEnabledMock.mockReset()
    // Default: flag ON
    isFeatureEnabledMock.mockReturnValue(true)
  })

  it("mescla brand (primeiro) e user (segundo) com separadores", async () => {
    getBrandAutoRagContextMock.mockResolvedValue({
      context: "BRAND_CONTENT",
      sources: [
        { id: 26, title: "Zoryon v2 Projeto Base", category: "brand", score: 0.9, chunkCount: 3 },
      ],
      tokensUsed: 420,
      chunksIncluded: 3,
      truncated: false,
    })
    setUserRag({
      context: "USER_CONTENT",
      sources: [{ id: 5, title: "User doc" }],
      tokensUsed: 500,
      chunksIncluded: 2,
    })

    const result = await generateWizardRagContextWithBrand(
      "user_123",
      "test query",
      { mode: "auto" },
      1
    )

    expect(result.success).toBe(true)
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).toContain(BRAND_SECTION_HEADER)
    expect(result.data!.context).toContain(USER_SECTION_HEADER)
    expect(result.data!.context).toContain("BRAND_CONTENT")
    expect(result.data!.context).toContain("USER_CONTENT")
    expect(result.data!.context.indexOf("BRAND_CONTENT")).toBeLessThan(
      result.data!.context.indexOf("USER_CONTENT")
    )
    // Tokens & chunks somados
    expect(result.data!.tokensUsed).toBe(920)
    expect(result.data!.chunksIncluded).toBe(5)
    // Sources merged in narrower shape
    expect(result.data!.sources).toEqual([
      { id: 26, title: "Zoryon v2 Projeto Base" },
      { id: 5, title: "User doc" },
    ])
  })

  it("retorna apenas brand quando user RAG ausente (data: null)", async () => {
    getBrandAutoRagContextMock.mockResolvedValue({
      context: "BRAND_ONLY",
      sources: [
        { id: 26, title: "Zoryon", category: "brand", score: 0.9, chunkCount: 2 },
      ],
      tokensUsed: 300,
      chunksIncluded: 2,
      truncated: false,
    })
    setUserRag(null)

    const result = await generateWizardRagContextWithBrand("user_123", "q", {}, 1)
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).toContain("BRAND_ONLY")
    expect(result.data!.context).toContain(BRAND_SECTION_HEADER)
    expect(result.data!.context).not.toContain(USER_SECTION_HEADER)
  })

  it("retorna apenas user quando brand auto-inject retorna null", async () => {
    getBrandAutoRagContextMock.mockResolvedValue(null)
    setUserRag({
      context: "USER_ONLY",
      sources: [{ id: 7, title: "Doc" }],
      tokensUsed: 200,
      chunksIncluded: 1,
    })

    const result = await generateWizardRagContextWithBrand("user_123", "q", { mode: "auto" }, 1)
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).toContain("USER_ONLY")
    expect(result.data!.context).toContain(USER_SECTION_HEADER)
    expect(result.data!.context).not.toContain(BRAND_SECTION_HEADER)
  })

  it("retorna data:null quando ambos brand e user são ausentes", async () => {
    getBrandAutoRagContextMock.mockResolvedValue(null)
    setUserRag(null)

    const result = await generateWizardRagContextWithBrand("user_123", "q", {}, 1)
    if (!result.success) throw new Error("expected success")
    expect(result.data).toBeNull()
  })

  it("kill-switch: flag OFF pula chamada de brand auto-inject", async () => {
    isFeatureEnabledMock.mockReturnValue(false)
    getBrandAutoRagContextMock.mockResolvedValue({
      context: "BRAND_NEVER_USED",
      sources: [],
      tokensUsed: 100,
      chunksIncluded: 1,
      truncated: false,
    })
    setUserRag({
      context: "USER_ONLY",
      sources: [],
      tokensUsed: 200,
      chunksIncluded: 1,
    })

    const result = await generateWizardRagContextWithBrand("user_123", "q", {}, 1)

    // Brand não foi chamado
    expect(getBrandAutoRagContextMock).not.toHaveBeenCalled()
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).not.toContain("BRAND")
    expect(result.data!.context).toContain("USER_ONLY")
  })

  it("ambos lados rejeitam — retorna data:null sem unhandled rejection", async () => {
    getBrandAutoRagContextMock.mockRejectedValue(new Error("brand RAG down"))
    assembleRagContextMock.mockRejectedValue(new Error("user RAG down"))

    const result = await generateWizardRagContextWithBrand(
      "user_123",
      "q",
      { mode: "auto" },
      1
    )

    expect(result.success).toBe(true)
    if (!result.success) throw new Error("expected success")
    expect(result.data).toBeNull()
  })

  it("brand rejeita, user OK — retorna apenas user", async () => {
    getBrandAutoRagContextMock.mockRejectedValue(new Error("brand down"))
    setUserRag({
      context: "USER_SURVIVES",
      sources: [{ id: 9, title: "Surviving doc" }],
      tokensUsed: 100,
      chunksIncluded: 1,
    })

    const result = await generateWizardRagContextWithBrand("user_123", "q", { mode: "auto" }, 1)
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).toContain("USER_SURVIVES")
    expect(result.data!.context).not.toContain(BRAND_SECTION_HEADER)
  })

  it("user mode 'off' ainda permite brand auto-inject (independente)", async () => {
    getBrandAutoRagContextMock.mockResolvedValue({
      context: "BRAND_STILL_INJECTS",
      sources: [
        { id: 30, title: "Brand doc", category: "brand", score: 0.9, chunkCount: 1 },
      ],
      tokensUsed: 150,
      chunksIncluded: 1,
      truncated: false,
    })
    // user mode "off" → generateWizardRagContext retorna {success:true,data:null}
    // sem nem chamar assembleRagContext

    const result = await generateWizardRagContextWithBrand(
      "user_123",
      "q",
      { mode: "off" },
      1
    )

    expect(getBrandAutoRagContextMock).toHaveBeenCalled()
    if (!result.success) throw new Error("expected success")
    expect(result.data).not.toBeNull()
    expect(result.data!.context).toContain("BRAND_STILL_INJECTS")
    expect(result.data!.context).toContain(BRAND_SECTION_HEADER)
    expect(result.data!.context).not.toContain(USER_SECTION_HEADER)
  })
})

describe("generateWizardRagContext (catch path)", () => {
  beforeEach(() => {
    assembleRagContextMock.mockReset()
  })

  it("retorna success:false com error quando assembler lança", async () => {
    assembleRagContextMock.mockRejectedValue(new Error("voyage failed"))

    const result = await generateWizardRagContext("user_123", "q", { mode: "auto" })

    expect(result.success).toBe(false)
    if (result.success) throw new Error("expected failure")
    expect(result.error).toContain("voyage failed")
  })

  it("retorna success:true data:null quando mode é 'off'", async () => {
    const result = await generateWizardRagContext("user_123", "q", { mode: "off" })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error("expected success")
    expect(result.data).toBeNull()
    expect(assembleRagContextMock).not.toHaveBeenCalled()
  })
})
