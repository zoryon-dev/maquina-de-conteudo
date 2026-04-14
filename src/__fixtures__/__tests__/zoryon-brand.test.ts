import { describe, it, expect } from "vitest"
import { ZORYON_BRAND_FIXTURE } from "../zoryon-brand"
import { brandConfigSchema } from "@/lib/brands/schema"

describe("ZORYON_BRAND_FIXTURE", () => {
  it("valida contra brandConfigSchema sem throws", () => {
    expect(() => brandConfigSchema.parse(ZORYON_BRAND_FIXTURE)).not.toThrow()
  })

  it("preserva tokens visuais essenciais após parse (defaults não sobrepõem)", () => {
    const parsed = brandConfigSchema.parse(ZORYON_BRAND_FIXTURE)
    expect(parsed.visual.tokens.colors.primary).toBe("#a3e635")
    expect(parsed.visual.tokens.fonts.heading).toBe("Inter, sans-serif")
    expect(parsed.visual.tokens.spacing.md).toBe("16px")
    expect(parsed.visual.tokens.shadows.subtle).toContain("rgba(0,0,0,0.12)")
  })
})
