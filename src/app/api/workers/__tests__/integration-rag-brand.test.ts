// Smoke integration: valida que o flag default de RAG_BRAND_AUTO_INJECT
// é true (auto-inject ativo) e que setá-lo "false" desativa o caminho
// de brand. Este teste roda contra o helper isFeatureEnabled real — a
// validação end-to-end via worker depende de logs em produção pós-deploy.
//
// Cobertura comportamental do merge brand+user vive em:
//   - src/lib/rag/__tests__/brand-auto-inject.test.ts
//   - src/lib/wizard-services/__tests__/rag.service.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"

describe("Fase 1 — integração RAG brand auto-inject (flag)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("flag default está ligada quando env ausente", async () => {
    vi.stubEnv("RAG_BRAND_AUTO_INJECT", undefined as unknown as string)
    const { isFeatureEnabled } = await import("@/lib/features")
    expect(isFeatureEnabled("RAG_BRAND_AUTO_INJECT", true)).toBe(true)
  })

  it("flag explícita 'false' desativa auto-inject", async () => {
    vi.stubEnv("RAG_BRAND_AUTO_INJECT", "false")
    const { isFeatureEnabled } = await import("@/lib/features")
    expect(isFeatureEnabled("RAG_BRAND_AUTO_INJECT", true)).toBe(false)
  })

  it("flag explícita 'true' mantém auto-inject ativo", async () => {
    vi.stubEnv("RAG_BRAND_AUTO_INJECT", "true")
    const { isFeatureEnabled } = await import("@/lib/features")
    expect(isFeatureEnabled("RAG_BRAND_AUTO_INJECT", true)).toBe(true)
  })
})

describe("Fase 1 — integração RAG brand auto-inject (invariante)", () => {
  it("brand auto-inject é chamado mesmo com ragConfig undefined", async () => {
    // Smoke focada na invariante chave: independente de ragConfig do user,
    // brand auto-inject deve ser tentado quando flag on. Mockamos ambos
    // os providers; verificamos que getBrandAutoRagContext foi invocado.

    const getBrandAutoRagContextMock = vi.fn().mockResolvedValue(null)
    const isFeatureEnabledMock = vi.fn().mockReturnValue(true)
    const assembleRagContextMock = vi.fn().mockResolvedValue({
      context: "",
      sources: [],
      tokensUsed: 0,
      chunksIncluded: 0,
      truncated: false,
    })

    vi.doMock("@/lib/rag/brand-auto-inject", () => ({
      getBrandAutoRagContext: getBrandAutoRagContextMock,
    }))
    vi.doMock("@/lib/features", () => ({
      isFeatureEnabled: isFeatureEnabledMock,
    }))
    vi.doMock("@/lib/rag/assembler", () => ({
      assembleRagContext: assembleRagContextMock,
      isRagAvailable: vi.fn(),
      getRagStats: vi.fn(),
    }))

    vi.resetModules()
    const { generateWizardRagContextWithBrand } = await import(
      "@/lib/wizard-services/rag.service"
    )

    // Caso real: wizard sem ragConfig nenhum, brandId resolvido pra null/1
    await generateWizardRagContextWithBrand(
      "user_test",
      "Context for carousel: tema X",
      {}, // ragConfig vazio — invariante: brand ainda deve rodar
      1
    )

    expect(getBrandAutoRagContextMock).toHaveBeenCalledTimes(1)
    expect(getBrandAutoRagContextMock).toHaveBeenCalledWith(
      "user_test",
      "Context for carousel: tema X",
      1
    )

    vi.doUnmock("@/lib/rag/brand-auto-inject")
    vi.doUnmock("@/lib/features")
    vi.doUnmock("@/lib/rag/assembler")
  })
})
