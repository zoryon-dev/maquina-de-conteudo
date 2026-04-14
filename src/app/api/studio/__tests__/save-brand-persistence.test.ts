/**
 * T3 — Integração de persistência de brand_id no save do Studio.
 *
 * Foco estrito: contract de que o route `POST /api/studio/save`
 *   - escreve `brand_id = <numero>` quando `resolveBrandIdForUser` retorna id
 *   - escreve `brand_id = null` quando retorna null
 *   - degrada graciosamente quando `getBrandConfig` lança ConfigError
 *     (salva mesmo assim, loga erro com contexto, ainda persiste brandId)
 *
 * Mockamos db, auth, storage, screenshot e brand queries — este teste NÃO
 * exercita o renderer nem o screenshot; o alvo é a lógica de persistência.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ConfigError } from "@/lib/errors"

// ---------------------------------------------------------------------------
// Spies & estado mutável controlados pelos testes
// ---------------------------------------------------------------------------
const insertValuesSpy = vi.fn()
const insertReturningSpy = vi.fn()
const updateSetSpy = vi.fn()
const selectSpy = vi.fn()

type AuthResult = { userId: string | null }
const authState: { value: AuthResult } = { value: { userId: "user_test_1" } }

// ---------------------------------------------------------------------------
// Mocks — devem vir ANTES do import dinâmico do route
// ---------------------------------------------------------------------------
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => authState.value),
}))

vi.mock("@/db", () => {
  const db = {
    insert: vi.fn(() => ({
      values: (payload: unknown) => {
        insertValuesSpy(payload)
        return {
          returning: async () => {
            insertReturningSpy()
            return [{ id: 42 }]
          },
        }
      },
    })),
    update: vi.fn(() => ({
      set: (payload: unknown) => {
        updateSetSpy(payload)
        return {
          where: () => ({
            returning: async () => [{ id: 99 }],
          }),
        }
      },
    })),
    select: vi.fn(() => {
      selectSpy()
      const chain: Record<string, (...args: unknown[]) => unknown> = {}
      const methods = ["from", "where", "orderBy", "limit"]
      const p = Promise.resolve([])
      for (const m of methods) chain[m] = () => chain
      ;(chain as unknown as { then: Promise<unknown>["then"] }).then =
        p.then.bind(p)
      return chain
    }),
  }
  return { db }
})

vi.mock("@/db/schema", () => ({
  libraryItems: { id: "id", userId: "userId", brandId: "brandId" },
  MAX_SLIDES: 10,
}))

// Storage/screenshot — nunca disponível neste test (skip preview)
vi.mock("@/lib/studio-templates/render-to-image", () => ({
  isScreenshotOneAvailable: () => false,
  renderSlideToImage: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({
    uploadFile: vi.fn(async () => ({ url: "https://example.com/preview.png" })),
  }),
}))

// Brand queries — configuráveis por teste via helpers abaixo
const resolveBrandIdMock = vi.fn<(userId: string) => Promise<number | null>>()
const getBrandConfigMock = vi.fn<(id: number) => Promise<unknown>>()
vi.mock("@/lib/brands/queries", () => ({
  resolveBrandIdForUser: resolveBrandIdMock,
  getBrandConfig: getBrandConfigMock,
}))

vi.mock("@/lib/features", () => ({
  isFeatureEnabled: () => false,
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
import type { StudioState } from "@/lib/studio-templates/types"

function makeRequest(state: StudioState): Request {
  return new Request("http://localhost/api/studio/save", {
    method: "POST",
    body: JSON.stringify({ state }),
    headers: { "content-type": "application/json" },
  })
}

const fixtureState: StudioState = {
  contentType: "carousel",
  aspectRatio: "3:4",
  slides: [
    {
      id: "s1",
      template: "DARK_MODE",
      content: { texto1: "H", texto1Bold: false, texto3Bold: false },
      style: {
        backgroundColor: "#000",
        textColor: "#fff",
        primaryColor: "#a3e635",
        showSwipeIndicator: false,
      },
    },
  ],
  profile: { name: "X", handle: "@x", showVerifiedBadge: false },
  header: { category: "", brand: "", copyright: "" },
  projectTitle: "Teste",
  caption: "c",
  hashtags: [],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/studio/save — brand_id persistence (T3)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    insertValuesSpy.mockClear()
    insertReturningSpy.mockClear()
    updateSetSpy.mockClear()
    selectSpy.mockClear()
    resolveBrandIdMock.mockReset()
    getBrandConfigMock.mockReset()
    authState.value = { userId: "user_test_1" }
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
    logSpy.mockRestore()
  })

  it("escreve brand_id quando resolveBrandIdForUser retorna número", async () => {
    resolveBrandIdMock.mockResolvedValue(42)
    getBrandConfigMock.mockResolvedValue({ identity: {} })

    const { POST } = await import("../save/route")
    const res = await POST(makeRequest(fixtureState))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(insertValuesSpy).toHaveBeenCalledTimes(1)
    const payload = insertValuesSpy.mock.calls[0][0] as { brandId: number | null }
    expect(payload.brandId).toBe(42)
  })

  it("escreve brand_id=null quando não há default brand", async () => {
    resolveBrandIdMock.mockResolvedValue(null)

    const { POST } = await import("../save/route")
    const res = await POST(makeRequest(fixtureState))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    // getBrandConfig NÃO pode ser chamado quando brandId é null
    expect(getBrandConfigMock).not.toHaveBeenCalled()
    const payload = insertValuesSpy.mock.calls[0][0] as { brandId: number | null }
    expect(payload.brandId).toBeNull()
  })

  // ANTICIPATORY: depende do prod agent adicionar catch específico de
  // ConfigError no save route (ConfigError handling).
  it("degrada graciosamente quando getBrandConfig lança ConfigError", async () => {
    resolveBrandIdMock.mockResolvedValue(42)
    getBrandConfigMock.mockRejectedValue(
      new ConfigError("Brand 42 has invalid config in DB", {
        brandId: 42,
        issues: [{ path: ["visual"], message: "invalid" }],
      })
    )

    const { POST } = await import("../save/route")
    const res = await POST(makeRequest(fixtureState))
    const body = await res.json()

    // Contract pós-fix: save completa, persiste brandId, loga erro.
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(insertValuesSpy).toHaveBeenCalledTimes(1)
    const payload = insertValuesSpy.mock.calls[0][0] as { brandId: number | null }
    expect(payload.brandId).toBe(42)

    // Log com contexto da brand corrompida
    expect(errorSpy).toHaveBeenCalled()
    const loggedAny = errorSpy.mock.calls.flat().some((arg) => {
      const s = typeof arg === "string" ? arg : JSON.stringify(arg)
      return s.includes("42") || s.includes("ConfigError")
    })
    expect(loggedAny).toBe(true)
  })
})
