import { describe, it, expect } from "vitest"
import {
  brandConfigSchema,
  brandVoiceAtributosSchema,
  brandOfferSchema,
  safeValidateBrandConfig,
  slugSchema,
} from "../schema"

describe("brandConfigSchema.parse({})", () => {
  it("returns the full tree with expected defaults", () => {
    const cfg = brandConfigSchema.parse({})

    // Estrutura completa
    expect(cfg).toHaveProperty("identity")
    expect(cfg).toHaveProperty("voice")
    expect(cfg).toHaveProperty("visual")
    expect(cfg).toHaveProperty("audience")
    expect(cfg).toHaveProperty("offer")
    expect(cfg).toHaveProperty("journey")
    expect(cfg).toHaveProperty("content")
    expect(cfg).toHaveProperty("meta")

    // Defaults específicos
    expect(cfg.identity.mission).toBe("")
    expect(cfg.identity.values).toEqual([])
    expect(cfg.voice.vocabulario).toEqual({ use: [], avoid: [] })
    expect(cfg.offer.pricing).toEqual({
      setupMin: 0,
      setupMax: 0,
      recMin: 0,
      recMax: 0,
    })
    expect(cfg.meta.seedVersion).toBe("1.0.0")
    expect(cfg.meta.qaEnabled).toBe(true)
    // seededAt default é ISO datetime gerado em runtime
    expect(cfg.meta.seededAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    )
  })
})

describe("brandVoiceAtributosSchema", () => {
  // Spec do projeto: defaults devem ser 80/70/75/75/30 (não 50)
  it("uses brand-specific defaults (80/70/75/75/30) when nested under brandConfigSchema", () => {
    const cfg = brandConfigSchema.parse({})
    expect(cfg.voice.atributos).toEqual({
      direto: 80,
      acessivel: 70,
      firme: 75,
      humano: 75,
      tecnico: 30,
    })
  })

  it("rejects values out of the 0..100 range", () => {
    const result = brandVoiceAtributosSchema.safeParse({ direto: 101 })
    expect(result.success).toBe(false)
  })

  it("accepts values at the 0 and 100 boundaries", () => {
    const result = brandVoiceAtributosSchema.safeParse({
      direto: 0,
      acessivel: 100,
      firme: 50,
      humano: 50,
      tecnico: 50,
    })
    expect(result.success).toBe(true)
  })
})

describe("brandOfferSchema.pricing refinement", () => {
  it("fails when setupMin > setupMax", () => {
    const result = brandOfferSchema.safeParse({
      pricing: { setupMin: 500, setupMax: 100, recMin: 0, recMax: 0 },
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid pricing range", () => {
    const result = brandOfferSchema.safeParse({
      pricing: { setupMin: 100, setupMax: 500, recMin: 50, recMax: 200 },
    })
    expect(result.success).toBe(true)
  })
})

describe("slugSchema", () => {
  it("accepts lowercase words and kebab-case", () => {
    expect(slugSchema.safeParse("zoryon").success).toBe(true)
    expect(slugSchema.safeParse("my-brand").success).toBe(true)
    expect(slugSchema.safeParse("123-ok").success).toBe(true)
  })

  it("rejects uppercase and underscores", () => {
    expect(slugSchema.safeParse("Zoryon").success).toBe(false)
    expect(slugSchema.safeParse("my_brand").success).toBe(false)
  })
})

describe("safeValidateBrandConfig", () => {
  it("returns { success: false, error } for invalid config without throwing", () => {
    const result = safeValidateBrandConfig({
      voice: { atributos: { direto: 999 } },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it("returns { success: true, data } for a valid (empty) config", () => {
    const result = safeValidateBrandConfig({})
    expect(result.success).toBe(true)
  })
})
