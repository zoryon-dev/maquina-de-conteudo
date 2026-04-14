/**
 * E2E estrutural — garante que a injeção de brand tokens funciona no
 * render de 5 templates representativos (3 genéricos + 2 BD). Cobre a
 * surface principal: fonte/background/primary em shape diverso. Se um
 * template novo quebrar a contract, um destes 10 asserts falha.
 */
import { describe, it, expect } from "vitest"
import { renderSlideToHtml } from "../renderer"
import type { FigmaTemplate, StudioSlide, StudioProfile, StudioHeader } from "../types"
import { ZORYON_BRAND_FIXTURE } from "@/__fixtures__/zoryon-brand"

const TEMPLATES: FigmaTemplate[] = [
  "01_CAPA",
  "DARK_MODE",
  "WHITE_MODE",
  "BD_DARK",
  "BD_CAPA",
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

describe.each(TEMPLATES)("visual tokens E2E — template %s", (template) => {
  const baseInput = {
    slide: makeSlide(template),
    profile,
    header,
    slideIndex: 0,
    totalSlides: 3,
  }

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
    // A declaração `--brand-color-primary: #a3e635` (com valor) só aparece
    // quando a injeção acontece. Referências `var(--brand-color-primary, ...)`
    // usadas em fallback literal não constam com `: #a3e635` direto.
    expect(html).not.toMatch(/--brand-color-primary:\s*#a3e635/)
  })
})
