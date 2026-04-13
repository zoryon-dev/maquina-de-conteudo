import { describe, it, expect } from "vitest"
import { generateBDCapaHtml } from "../bd-capa"
import type { StudioSlide, StudioProfile, StudioHeader } from "../../types"

// ============================================================================
// Fixtures
// ============================================================================

function mkSlide(overrides?: Partial<StudioSlide>): StudioSlide {
  return {
    id: "s1",
    template: "BD_CAPA",
    content: {
      texto1: "Título de capa",
      texto1Bold: false,
      texto2: "",
      texto3: "",
      texto3Bold: false,
      imageUrl: undefined,
      backgroundImageUrl: undefined,
    },
    style: {
      backgroundColor: "#FFFFFF",
      textColor: "#000000",
      primaryColor: "#C8321E",
      showSwipeIndicator: false,
    },
    ...overrides,
  }
}

const PROFILE: StudioProfile = {
  avatarUrl: undefined,
  name: "Brand",
  handle: "@brand",
  showVerifiedBadge: false,
}

const HEADER: StudioHeader = {
  category: "ESTUDO DE CASO",
  brand: "Test & Co",
  copyright: "©COPYRIGHT 2026",
}

// ============================================================================
// Tests
// ============================================================================

describe("generateBDCapaHtml", () => {
  it("escapa HTML dentro de texto1: <b>foo</b> aparece como &lt;b&gt;foo&lt;/b&gt;", () => {
    const slide = mkSlide({
      content: {
        ...mkSlide().content,
        texto1: "<b>foo</b>",
      },
    })

    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    expect(html).toContain("&lt;b&gt;foo&lt;/b&gt;")
    // Não injeta a tag real na headline
    expect(html).not.toContain("<h1 class=\"capa-headline\"><b>foo</b>")
  })

  it("processa **bold** em texto2 envolvendo em <em> (accent)", () => {
    const slide = mkSlide({
      content: {
        ...mkSlide().content,
        texto1: "Título",
        texto2: "**bold**",
      },
    })

    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    expect(html).toContain("<em>bold</em>")
  })

  it("brand 'Test & Co' no header aparece escapado como 'Test &amp; Co'", () => {
    const slide = mkSlide()
    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    expect(html).toContain("Test &amp; Co")
    expect(html).not.toContain("Test & Co</span>")
  })

  it("output contém as classes esperadas: accent-bar, brand-bar, prog", () => {
    const slide = mkSlide()
    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    expect(html).toContain('class="accent-bar"')
    expect(html).toContain('class="brand-bar"')
    expect(html).toContain('class="prog"')
  })

  it("fontes via <link> presentes (Google Fonts preconnect + stylesheet)", () => {
    const slide = mkSlide()
    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    expect(html).toContain("https://fonts.googleapis.com")
    expect(html).toContain("https://fonts.gstatic.com")
    expect(html).toContain("Barlow+Condensed")
    expect(html).toContain("Plus+Jakarta+Sans")
    expect(html).toMatch(/<link[^>]+rel="stylesheet"/)
  })

  it("totalSlides default = 9 aparece no progress bar", () => {
    const slide = mkSlide()
    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
      slideIndex: 0,
    })

    // progress bar mostra "01" e "09"
    expect(html).toMatch(/>01</)
    expect(html).toMatch(/>09</)
  })

  it("backgroundImageUrl aplicado escapa aspas/parênteses (CSS injection-safe)", () => {
    const slide = mkSlide({
      content: {
        ...mkSlide().content,
        backgroundImageUrl: "https://example.com/a(b)'c.jpg",
      },
    })

    const html = generateBDCapaHtml({
      slide,
      profile: PROFILE,
      header: HEADER,
    })

    // Os caracteres ( ) ' são escapados com \
    expect(html).toContain("background-image: url('")
    // Garante que os parênteses cruos NÃO fecham a url() do CSS
    expect(html).not.toContain("url('https://example.com/a(b)")
  })
})
