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

/**
 * Nota: templates agora usam `var(--brand-color-primary, fallback)` mesmo
 * com flag off. Isso significa que a string "--brand-color-primary" vai
 * aparecer no HTML como *referência* dentro de `var(...)`. O que detecta
 * injeção real é a *declaração* da custom property (`--brand-color-primary:`
 * seguido de value) ou a tag `<style data-brand-tokens>`. Testes abaixo
 * usam esses marcadores precisos.
 */
const DECL_PRIMARY = "--brand-color-primary: #a3e635"
const DECL_FONT = "--brand-font-heading: Inter, sans-serif"
const BRAND_STYLE_TAG = "<style data-brand-tokens>"

describe("renderSlideToHtml — brand tokens (Fase 3)", () => {
  it("flag on + brand presente → injeta <style data-brand-tokens> com declarações CSS", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: true },
    })
    expect(result.html).toContain(BRAND_STYLE_TAG)
    expect(result.html).toContain(DECL_PRIMARY)
    expect(result.html).toContain(DECL_FONT)
  })

  it("flag off + brand presente → não injeta declarações (backcompat)", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: false },
    })
    expect(result.html).not.toContain(BRAND_STYLE_TAG)
    expect(result.html).not.toContain(DECL_PRIMARY)
  })

  it("flag on + brand undefined → não injeta", () => {
    const result = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: true },
    })
    expect(result.html).not.toContain(BRAND_STYLE_TAG)
    expect(result.html).not.toContain(DECL_PRIMARY)
  })

  // T6: fortalece contract — flag on + brand=undefined deve produzir HTML
  // BYTE-FOR-BYTE idêntico ao flag off. Isso prova que a flag só ativa
  // injeção quando HÁ brand, nunca como side effect solo.
  it("flag on + brand=undefined é byte-for-byte idêntico a flag off", () => {
    const flagOn = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: true },
    })
    const flagOff = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: false },
    })
    expect(flagOn.html).toBe(flagOff.html)
  })

  it("flag on + brand=null é byte-for-byte idêntico a flag off", () => {
    const flagOnNull = renderSlideToHtml({
      ...baseInput,
      brand: null,
      featureFlags: { visualTokensV2: true },
    })
    const flagOff = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: false },
    })
    expect(flagOnNull.html).toBe(flagOff.html)
  })

  it("sem flags e sem brand → HTML idêntico entre undefined e null brand", () => {
    const legacy = renderSlideToHtml(baseInput)
    const withNullBrand = renderSlideToHtml({ ...baseInput, brand: null })
    expect(legacy.html).toBe(withNullBrand.html)
    expect(legacy.html).not.toContain(BRAND_STYLE_TAG)
    expect(legacy.html).not.toContain(DECL_PRIMARY)
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
