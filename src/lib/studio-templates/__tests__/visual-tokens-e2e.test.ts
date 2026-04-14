/**
 * E2E estrutural — garante que a injeção de brand tokens funciona no render
 * de todos os 15 templates. Também estabelece o contrato de backcompat mais
 * forte possível: com a flag OFF, o HTML é BYTE-FOR-BYTE idêntico
 * independente da brand ser null, undefined ou presente. Qualquer código
 * futuro que quebre isso falha imediatamente.
 */
import { describe, it, expect } from "vitest"
import { renderSlideToHtml } from "../renderer"
import type { FigmaTemplate, StudioSlide, StudioProfile, StudioHeader } from "../types"
import { ZORYON_BRAND_FIXTURE } from "@/__fixtures__/zoryon-brand"

const ALL_TEMPLATES: FigmaTemplate[] = [
  "01_CAPA",
  "201",
  "202",
  "203",
  "DARK_MODE",
  "WHITE_MODE",
  "TWITTER",
  "SUPER_HEADLINE",
  "IMAGE_OVERLAY",
  "IMAGE_SPLIT",
  "IMAGE_MINIMAL",
  "BD_CAPA",
  "BD_DARK",
  "BD_LIGHT",
  "BD_CTA",
]

function makeSlide(template: FigmaTemplate): StudioSlide {
  return {
    id: `test-${template}`,
    template,
    content: {
      texto1: "Headline de teste",
      texto1Bold: true,
      texto2: "Corpo da mensagem com contexto razoável",
      texto3: "Fechamento call-to-action",
      texto3Bold: false,
    },
    style: {
      backgroundColor: "#0a0a0f",
      textColor: "#ffffff",
      primaryColor: "#a3e635",
      showSwipeIndicator: true,
    },
  }
}

const profile: StudioProfile = {
  name: "Zoryon",
  handle: "@zoryon",
  showVerifiedBadge: false,
}

const header: StudioHeader = {
  category: "TESTE",
  brand: "ZORYON",
  copyright: "©2026",
}

function makeBaseInput(template: FigmaTemplate) {
  return {
    slide: makeSlide(template),
    profile,
    header,
    slideIndex: 0,
    totalSlides: 3,
  }
}

// ============================================================================
// FLAG ON — INJECTION WORKS FOR ALL 15
// ============================================================================

describe.each(ALL_TEMPLATES)("visual tokens E2E — template %s (flag on)", (template) => {
  const baseInput = makeBaseInput(template)

  it("flag ON + brand Zoryon → injeta <style data-brand-tokens> e renderiza", () => {
    const { html } = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: true },
    })
    expect(html).toContain("<style data-brand-tokens>")
    expect(html).toMatch(/--brand-color-primary:\s*#a3e635/)
    expect(html).toMatch(/--brand-font-heading:\s*Inter,\s*sans-serif/)
    // Sanity: template renderizou conteúdo (não só o <style>)
    expect(html.length).toBeGreaterThan(500)
  })

  it("flag OFF → sem declaração de brand vars (backcompat)", () => {
    const { html } = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: false },
    })
    expect(html).not.toContain("<style data-brand-tokens>")
    expect(html).not.toMatch(/--brand-color-primary:\s*#a3e635/)
  })
})

// ============================================================================
// T1 — FLAG OFF BYTE-FOR-BYTE INVARIANTE
// ============================================================================
// Se a flag está desligada, o HTML precisa ser IDÊNTICO independente de
// brand=null, brand=undefined, ou brand=Zoryon. Esta é a contract mais forte
// de backcompat — qualquer código que vaze a brand para a renderização com
// flag off (mesmo indiretamente via side-effect) vai falhar.

describe.each(ALL_TEMPLATES)("flag off invariante (%s)", (template) => {
  it("brand=null e brand=Zoryon produzem HTML IDÊNTICO quando flag off", () => {
    const baseInput = makeBaseInput(template)
    const noBrand = renderSlideToHtml({
      ...baseInput,
      brand: null,
      featureFlags: { visualTokensV2: false },
    })
    const withBrand = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
      featureFlags: { visualTokensV2: false },
    })
    expect(withBrand.html).toBe(noBrand.html)
  })

  it("brand=undefined e brand=null produzem HTML IDÊNTICO quando flag off", () => {
    const baseInput = makeBaseInput(template)
    const undef = renderSlideToHtml({
      ...baseInput,
      featureFlags: { visualTokensV2: false },
    })
    const nullBrand = renderSlideToHtml({
      ...baseInput,
      brand: null,
      featureFlags: { visualTokensV2: false },
    })
    expect(undef.html).toBe(nullBrand.html)
  })

  it("sem featureFlags e brand=Zoryon produzem HTML IDÊNTICO ao render puro", () => {
    const baseInput = makeBaseInput(template)
    const legacy = renderSlideToHtml(baseInput)
    const withBrandNoFlag = renderSlideToHtml({
      ...baseInput,
      brand: ZORYON_BRAND_FIXTURE,
    })
    expect(withBrandNoFlag.html).toBe(legacy.html)
  })
})
