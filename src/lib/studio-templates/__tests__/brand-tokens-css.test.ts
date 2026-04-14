import { describe, it, expect } from "vitest"
import { buildBrandTokenCss, tokenVar } from "../brand-tokens-css"
import { ZORYON_BRAND_FIXTURE } from "@/__fixtures__/zoryon-brand"
import type { BrandConfig } from "@/lib/brands/schema"

describe("buildBrandTokenCss", () => {
  it("gera :root com CSS vars dos tokens de Zoryon", () => {
    const css = buildBrandTokenCss(ZORYON_BRAND_FIXTURE)
    expect(css.startsWith(":root {")).toBe(true)
    expect(css.endsWith("}")).toBe(true)
    expect(css).toContain("--brand-color-primary: #a3e635;")
    expect(css).toContain("--brand-color-background: #0a0a0f;")
    expect(css).toContain("--brand-font-heading: Inter, sans-serif;")
    expect(css).toContain("--brand-spacing-md: 16px;")
    expect(css).toContain("--brand-shadow-subtle:")
  })

  it("retorna string vazia quando brand é undefined", () => {
    expect(buildBrandTokenCss(undefined)).toBe("")
  })

  it("retorna string vazia quando brand é null", () => {
    expect(buildBrandTokenCss(null)).toBe("")
  })

  it("sanitiza valores hostis (bloqueia CSS injection)", () => {
    const hostile: BrandConfig = {
      ...ZORYON_BRAND_FIXTURE,
      visual: {
        ...ZORYON_BRAND_FIXTURE.visual,
        tokens: {
          ...ZORYON_BRAND_FIXTURE.visual.tokens,
          colors: {
            primary: "#fff; } body { display:none",
            safe: "#ffffff",
          },
        },
      },
    }
    const css = buildBrandTokenCss(hostile)
    expect(css).not.toContain("display:none")
    expect(css).not.toContain("} body")
    // valor seguro sobrevive
    expect(css).toContain("--brand-color-safe: #ffffff;")
  })

  it("kebab-case: converte camelCase do token name para kebab no var", () => {
    const cfg: BrandConfig = {
      ...ZORYON_BRAND_FIXTURE,
      visual: {
        ...ZORYON_BRAND_FIXTURE.visual,
        tokens: {
          ...ZORYON_BRAND_FIXTURE.visual.tokens,
          colors: { primaryDark: "#000000" },
        },
      },
    }
    const css = buildBrandTokenCss(cfg)
    expect(css).toContain("--brand-color-primary-dark: #000000;")
  })
})

describe("tokenVar", () => {
  it("produz var() com fallback literal", () => {
    expect(tokenVar("color", "primary", "#a3e635")).toBe(
      "var(--brand-color-primary, #a3e635)"
    )
    expect(tokenVar("font", "heading", "'Inter', sans-serif")).toBe(
      "var(--brand-font-heading, 'Inter', sans-serif)"
    )
  })

  it("kebab-case no name", () => {
    expect(tokenVar("color", "primaryDark", "#000")).toBe(
      "var(--brand-color-primary-dark, #000)"
    )
  })
})
