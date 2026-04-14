// Integração RAG brand auto-inject — Fase 1 overhaul.
//
// Este arquivo cobre 3 camadas do dispatch do worker:
//   1. Flag RAG_BRAND_AUTO_INJECT (default on, toggleable via env)
//   2. Contrato de imports (resolveBrandIdForUser, generateWizardRagContextWithBrand)
//   3. Invariantes comportamentais — brand auto-inject é tentado mesmo quando
//      ragConfig é undefined | {} ou quando não há default brand configurado.
//
// Cobertura comportamental profunda do merge brand+user vive em:
//   - src/lib/rag/__tests__/brand-auto-inject.test.ts
//   - src/lib/wizard-services/__tests__/rag.service.test.ts
// Validação end-to-end vem via logs estruturados
// (`errorId: RAG_*` / `[rag] brand auto-inject: hit|empty`) em produção.

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

describe("Fase 1 — contrato de imports usados pelo dispatch RAG do worker", () => {
  it("expõe resolveBrandIdForUser de @/lib/brands/queries", async () => {
    const mod = await import("@/lib/brands/queries")
    expect(typeof mod.resolveBrandIdForUser).toBe("function")
  })

  it("expõe generateWizardRagContextWithBrand de rag.service", async () => {
    // Mock o assembler pra evitar carregar @/lib/voyage (precisa ENCRYPTION_KEY).
    vi.doMock("@/lib/rag/assembler", () => ({
      assembleRagContext: vi.fn(),
      isRagAvailable: vi.fn(),
      getRagStats: vi.fn(),
    }))
    const mod = await import("@/lib/wizard-services/rag.service")
    expect(typeof mod.generateWizardRagContextWithBrand).toBe("function")
    expect(typeof mod.formatRagForPrompt).toBe("function")
    vi.doUnmock("@/lib/rag/assembler")
  })
})

describe("Fase 1 — invariantes do dispatch RAG do worker", () => {
  it("brand auto-inject é chamado mesmo com ragConfig vazio ({})", async () => {
    // Invariante chave: independente de ragConfig do user, brand auto-inject
    // deve ser tentado quando flag on. Mockamos ambos os providers e verificamos
    // que getBrandAutoRagContext foi invocado.

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
