/**
 * Integration test do server action principal do BD wizard.
 *
 * Estratégia: mocka auth (Clerk), orchestrator (generateWithBrandsDecoded),
 * rag.service, brands/queries, brands/injection e db. Verifica:
 *  - briefing injeta RAG context (header + separador + seeds consolidadas)
 *  - brandPromptVariables chega ao orchestrator
 *  - seeds vazias retornam error shape sem chamar orchestrator
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const authMock = vi.fn<() => Promise<{ userId: string | null }>>()
const generateWithBdMock = vi.fn()
const ragMock = vi.fn()
const resolveBrandIdMock = vi.fn()
const getBrandConfigMock = vi.fn()
const brandConfigToPromptVariablesMock = vi.fn<
  (...args: unknown[]) => Record<string, string>
>(() => ({
  tone: "editorial",
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}))
vi.mock("@/lib/ai/motors/brandsdecoded-v4/orchestrator", () => ({
  generateWithBrandsDecoded: (...a: unknown[]) => generateWithBdMock(...a),
}))
vi.mock("@/lib/wizard-services/rag.service", () => ({
  generateWizardRagContextWithBrand: (...a: unknown[]) => ragMock(...a),
}))
vi.mock("@/lib/brands/queries", () => ({
  resolveBrandIdForUser: (...a: unknown[]) => resolveBrandIdMock(...a),
  getBrandConfig: (...a: unknown[]) => getBrandConfigMock(...a),
}))
vi.mock("@/lib/brands/injection", () => ({
  brandConfigToPromptVariables: (...a: unknown[]) =>
    brandConfigToPromptVariablesMock(...a),
}))
vi.mock("@/lib/wizard-services/bd-adapter", () => ({
  bdResultToGeneratedContent: () => ({ type: "carousel", slides: [] }),
}))

// Cenário compartilhado do wizard carregado do db. Testes podem
// substituir a tupla retornada em `limit`.
const wizardStateRef: { current: unknown } = { current: null }

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [wizardStateRef.current],
        }),
      }),
    }),
    update: () => ({
      set: () => ({ where: async () => undefined }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () => [{ id: 42 }],
      }),
    }),
  },
}))

import {
  generateBdContentAction,
  saveBdCarouselAction,
} from "../[id]/actions/bd-wizard-actions"

describe("generateBdContentAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    generateWithBdMock.mockReset()
    ragMock.mockReset()
    resolveBrandIdMock.mockReset()
    getBrandConfigMock.mockReset()
    wizardStateRef.current = null
  })

  it("roda pipeline completo e injeta RAG context + brand vars", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    resolveBrandIdMock.mockResolvedValue(1)
    getBrandConfigMock.mockResolvedValue({ voice: {} })
    ragMock.mockResolvedValue({
      success: true,
      data: {
        context: "## MARCA\nZoryon - tone editorial",
        chunksIncluded: 3,
        tokensUsed: 120,
        sources: [],
      },
    })
    generateWithBdMock.mockResolvedValue({
      triagem: {},
      headlines: [{ id: 1, format: "IC", text: "H1" }],
      selectedHeadline: { id: 1, format: "IC", text: "H1" },
      espinha: {},
      blocks: [],
      legendaInstagram: "legenda",
    })
    wizardStateRef.current = {
      id: 1,
      userId: "user_1",
      seeds: [{ type: "theme", value: "x", briefing: "briefing x" }],
      generatedContent: null,
    }

    const r = await generateBdContentAction(1)
    expect(r.success).toBe(true)

    const call = generateWithBdMock.mock.calls[0][0] as {
      briefing: string
      brandPromptVariables: unknown
    }
    // RAG context vem antes do briefing consolidado
    expect(call.briefing).toContain("MARCA")
    expect(call.briefing).toContain("briefing x")
    expect(call.briefing.indexOf("MARCA")).toBeLessThan(
      call.briefing.indexOf("briefing x")
    )
    // brandPromptVariables foi extraído
    expect(call.brandPromptVariables).toEqual({ tone: "editorial" })
  })

  it("falha sem auth", async () => {
    authMock.mockResolvedValue({ userId: null })
    const r = await generateBdContentAction(1)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch(/auth/)
  })

  it("retorna erro quando wizard não existe", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    wizardStateRef.current = undefined
    const r = await generateBdContentAction(999)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch(/not found/)
  })

  it("retorna erro quando seeds estão vazias", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    resolveBrandIdMock.mockResolvedValue(null)
    wizardStateRef.current = {
      id: 1,
      userId: "user_1",
      seeds: [],
      generatedContent: null,
    }
    const r = await generateBdContentAction(1)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch(/seed/i)
    // orchestrator não deve ter sido chamado
    expect(generateWithBdMock).not.toHaveBeenCalled()
  })
})

describe("saveBdCarouselAction", () => {
  beforeEach(() => {
    authMock.mockReset()
    resolveBrandIdMock.mockReset()
    wizardStateRef.current = null
  })

  it("falha quando não há generatedContent", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    wizardStateRef.current = {
      id: 1,
      userId: "user_1",
      seeds: [],
      generatedContent: null,
      model: null,
    }
    const r = await saveBdCarouselAction(1)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toMatch(/gerado/i)
  })

  it("retorna libraryItemId quando sucesso", async () => {
    authMock.mockResolvedValue({ userId: "user_1" })
    resolveBrandIdMock.mockResolvedValue(1)
    wizardStateRef.current = {
      id: 1,
      userId: "user_1",
      seeds: [],
      model: null,
      generatedContent: {
        selectedHeadline: { id: 1, text: "Headline teste" },
        headlines: [],
        triagem: {},
        espinha: {},
        blocks: [],
        legendaInstagram: "legenda",
      },
    }
    const r = await saveBdCarouselAction(1)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.libraryItemId).toBe(42)
  })
})
