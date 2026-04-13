import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks ANTES de importar o módulo sob teste.
// Segue o padrão de src/lib/brands/__tests__/queries.test.ts:
//   - vi.mock declarado no topo (hoisting-safe)
//   - spies controláveis por teste via mockImplementation / mockReturnValue
// ---------------------------------------------------------------------------

// --- auth (Clerk) ----------------------------------------------------------
const authMock = vi.fn<() => Promise<{ userId: string | null }>>()
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}))

// --- isAdmin ---------------------------------------------------------------
const isAdminMock = vi.fn<(userId: string) => boolean>()
vi.mock("@/lib/auth/admin", () => ({
  isAdmin: (userId: string) => isAdminMock(userId),
}))

// --- brand queries ---------------------------------------------------------
const getBrandBySlugMock = vi.fn()
const getBrandConfigMock = vi.fn()
const listBrandVersionsMock = vi.fn()
const restoreBrandVersionMock = vi.fn()
const updateBrandConfigMock = vi.fn()
vi.mock("@/lib/brands/queries", () => ({
  getBrandBySlug: (...args: unknown[]) => getBrandBySlugMock(...args),
  getBrandConfig: (...args: unknown[]) => getBrandConfigMock(...args),
  listBrandVersions: (...args: unknown[]) => listBrandVersionsMock(...args),
  restoreBrandVersion: (...args: unknown[]) => restoreBrandVersionMock(...args),
  updateBrandConfig: (...args: unknown[]) => updateBrandConfigMock(...args),
}))

// --- next/cache ------------------------------------------------------------
const revalidatePathMock = vi.fn()
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

// ---------------------------------------------------------------------------
// Imports do módulo sob teste (depois dos mocks)
// ---------------------------------------------------------------------------
import {
  SECTION_SCHEMAS,
  updateBrandSectionAction,
  restoreBrandVersionAction,
  type BrandSection,
} from "../brand"
import { brandConfigSchema, type BrandConfig } from "@/lib/brands/schema"
import { NotFoundError } from "@/lib/errors"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validConfig: BrandConfig = {
  identity: {
    mission: "",
    vision: "",
    values: [],
    positioning: "",
    antiPositioning: "",
    beliefs: [],
  },
  voice: {
    atributos: {
      direto: 80,
      acessivel: 70,
      firme: 75,
      humano: 75,
      tecnico: 30,
    },
    tom: "",
    vocabulario: { use: [], avoid: [] },
    crencasCombatidas: [],
    antiPatterns: [],
  },
  visual: {
    tokens: { colors: {}, fonts: {}, spacing: {}, shadows: {} },
    logoUrl: "",
    logoAltUrl: "",
  },
  audience: { avatares: [], antiAvatar: "" },
  offer: {
    setores: [],
    pricing: { setupMin: 0, setupMax: 0, recMin: 0, recMax: 0 },
    courses: [],
  },
  journey: { motorServicos: [], motorEducacao: [] },
  content: { pilares: [], canais: [] },
  meta: {
    seedVersion: "1.0.0",
    seededAt: "2026-01-01T00:00:00.000Z",
    qaEnabled: true,
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SECTION_SCHEMAS exhaustiveness", () => {
  it("cobre 100% das chaves do brandConfigSchema", () => {
    // shape expõe as chaves top-level do BrandConfig
    const configKeys = Object.keys(brandConfigSchema.shape).sort()
    const sectionKeys = Object.keys(SECTION_SCHEMAS).sort()

    expect(sectionKeys).toEqual(configKeys)

    // Sanity: cada chave do config deve existir em SECTION_SCHEMAS
    for (const key of configKeys) {
      expect(SECTION_SCHEMAS).toHaveProperty(key)
    }
  })
})

describe("updateBrandSectionAction — auth guard", () => {
  beforeEach(() => {
    authMock.mockReset()
    isAdminMock.mockReset()
    updateBrandConfigMock.mockReset()
    getBrandConfigMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it("retorna 'Não autenticado' e NÃO chama updateBrandConfig quando userId é null", async () => {
    authMock.mockResolvedValue({ userId: null })

    const result = await updateBrandSectionAction(
      1,
      "voice" as BrandSection,
      validConfig.voice
    )

    expect(result).toEqual({ success: false, error: "Não autenticado" })
    expect(updateBrandConfigMock).not.toHaveBeenCalled()
    expect(getBrandConfigMock).not.toHaveBeenCalled()
    expect(isAdminMock).not.toHaveBeenCalled()
  })
})

describe("updateBrandSectionAction — admin guard", () => {
  beforeEach(() => {
    authMock.mockReset()
    isAdminMock.mockReset()
    updateBrandConfigMock.mockReset()
    getBrandConfigMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it("retorna Forbidden quando isAdmin é false e NÃO chama updateBrandConfig", async () => {
    authMock.mockResolvedValue({ userId: "user_nope" })
    isAdminMock.mockReturnValue(false)

    const result = await updateBrandSectionAction(
      1,
      "voice" as BrandSection,
      validConfig.voice
    )

    expect(result).toEqual({ success: false, error: "Forbidden" })
    expect(isAdminMock).toHaveBeenCalledWith("user_nope")
    expect(updateBrandConfigMock).not.toHaveBeenCalled()
    expect(getBrandConfigMock).not.toHaveBeenCalled()
  })
})

describe("updateBrandSectionAction — payload inválido", () => {
  beforeEach(() => {
    authMock.mockReset()
    isAdminMock.mockReset()
    updateBrandConfigMock.mockReset()
    getBrandConfigMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it("retorna issues populado quando voice.atributos.direto excede 100", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" })
    isAdminMock.mockReturnValue(true)

    const invalidVoice = {
      atributos: { direto: 999, acessivel: 70, firme: 75, humano: 75, tecnico: 30 },
      tom: "",
      vocabulario: { use: [], avoid: [] },
      crencasCombatidas: [],
      antiPatterns: [],
    }

    const result = await updateBrandSectionAction(
      1,
      "voice" as BrandSection,
      // payload inválido (forçando cast para simular call-site runtime)
      invalidVoice as unknown as BrandConfig["voice"]
    )

    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.issues).toBeDefined()
      expect(Array.isArray(result.issues)).toBe(true)
      expect(result.issues!.length).toBeGreaterThan(0)
      expect(result.code).toBe("VALIDATION_ERROR")
      // path deve conter atributos.direto
      const paths = result.issues!.map((i) => i.path.join("."))
      expect(paths.some((p) => p.includes("atributos.direto"))).toBe(true)
    }
    expect(updateBrandConfigMock).not.toHaveBeenCalled()
    expect(getBrandConfigMock).not.toHaveBeenCalled()
  })
})

describe("restoreBrandVersionAction — propagação de NotFoundError", () => {
  beforeEach(() => {
    authMock.mockReset()
    isAdminMock.mockReset()
    restoreBrandVersionMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it("retorna code=NOT_FOUND e NÃO chama revalidatePath", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" })
    isAdminMock.mockReturnValue(true)
    restoreBrandVersionMock.mockRejectedValue(
      new NotFoundError("BrandVersion", "42 (brand=1)")
    )

    const result = await restoreBrandVersionAction(1, 42)

    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.code).toBe("NOT_FOUND")
      expect(result.error).toMatch(/not found/i)
    }
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
