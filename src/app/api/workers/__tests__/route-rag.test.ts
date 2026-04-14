import { describe, it, expect } from "vitest"

// Smoke test: valida o contrato dos imports usados pelo dispatch RAG do worker.
// A rota completa tem muito setup inline (DB, Clerk, motor, etc) — testar o
// handler inteiro exigiria mocks pesados que não trariam mais sinal que esta
// asserção. Cobertura comportamental do merge brand+user vive em:
//   - src/lib/rag/__tests__/brand-auto-inject.test.ts
//   - src/lib/wizard-services/__tests__/rag.service.test.ts
// Validação end-to-end vem via logs `[rag] brand auto-inject: ...` em produção.

describe("worker RAG dispatch — contrato de imports", () => {
  it("expõe resolveBrandIdForUser de @/lib/brands/queries", async () => {
    const mod = await import("@/lib/brands/queries")
    expect(typeof mod.resolveBrandIdForUser).toBe("function")
  })

  it("expõe generateWizardRagContextWithBrand de rag.service", async () => {
    // Mock o assembler pra evitar carregar @/lib/voyage (precisa ENCRYPTION_KEY).
    const { vi } = await import("vitest")
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
