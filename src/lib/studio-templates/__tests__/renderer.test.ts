import { describe, it, expect } from "vitest"
import { renderSlideToHtml } from "../renderer"
import type { StudioSlide, StudioProfile, StudioHeader } from "../types"
import { ZORYON_BRAND_FIXTURE } from "@/__fixtures__/zoryon-brand"

const baseSlide: StudioSlide = {
  id: "s1",
  template: "DARK_MODE",
  content: {
    texto1: "Headline de teste",
    texto1Bold: true,
    texto2: "corpo pequeno",
    texto3Bold: false,
  },
  style: {
    backgroundColor: "#0a0a0f",
    textColor: "#ffffff",
    primaryColor: "#a3e635",
    showSwipeIndicator: false,
  },
}

const baseProfile: StudioProfile = {
  name: "Zoryon",
  handle: "@zoryon",
  showVerifiedBadge: false,
}

const baseHeader: StudioHeader = {
  category: "",
  brand: "",
  copyright: "",
}

const baseInput = {
  slide: baseSlide,
  profile: baseProfile,
  header: baseHeader,
  slideIndex: 0,
  totalSlides: 1,
}

describe("renderSlideToHtml — brand tokens (Fase 3)", () => {
  it("flag on + brand presente → injeta <style data-brand-tokens> com CSS vars", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: true },
    })
    expect(result.html).toContain("<style data-brand-tokens>")
    expect(result.html).toContain("--brand-color-primary: #a3e635")
    expect(result.html).toContain("--brand-font-heading: Inter, sans-serif")
  })

  it("flag off + brand presente → não injeta (backcompat)", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: false },
    })
    expect(result.html).not.toContain("--brand-color-primary")
    expect(result.html).not.toContain("data-brand-tokens")
  })

  it("flag on + brand undefined → não injeta", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: true },
    })
    expect(result.html).not.toContain("--brand-color-primary")
  })

  it("sem flags e sem brand → HTML idêntico ao render legado", () => {
    const legacy = renderSlideToHtml(baseInput)
    const withNullBrand = renderSlideToHtml({ ...baseInput, brand: null })
    expect(legacy.html).toBe(withNullBrand.html)
    expect(legacy.html).not.toContain("--brand-color-primary")
  })

  it("injeta style dentro de <head> quando presente (cascade correto)", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: true },
    })
    const headIdx = result.html.indexOf("<head>")
    const styleIdx = result.html.indexOf("<style data-brand-tokens>")
    expect(headIdx).toBeGreaterThan(-1)
    expect(styleIdx).toBeGreaterThan(headIdx)
  })
})
