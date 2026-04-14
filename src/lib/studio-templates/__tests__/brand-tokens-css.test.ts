import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { buildBrandTokenCss, tokenVar } from "../brand-tokens-css"
import { ZORYON_BRAND_FIXTURE } from "@/__fixtures__/zoryon-brand"
import type { BrandConfig } from "@/lib/brands/schema"

// T6: spy em console.warn no escopo inteiro deste arquivo — após C3, o
// sanitizer logga todas as rejeições. Suprimir o warn evita ruído no output
// de testes legítimos (e permite que o T2 abaixo faça assertions sobre ele).
describe("brand-tokens-css", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

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

  // ==========================================================================
  // T2 — ADVERSARIAL TABLE
  // ==========================================================================
  // Tabela exhaustiva de inputs hostis + legítimos. Cada case declara se
  // DEVE ou NÃO passar; quando rejeitado, verificamos que console.warn
  // foi chamado (depende da fix C3). Quando aceito com quotes, depende da
  // fix C4. Testes com `anticipatory: true` vão falhar até que os fixes
  // da production agent estejam em main — é o comportamento correto
  // para test-first.

  describe("sanitize adversarial inputs", () => {
    // Format: [label, input, shouldPass, anticipatory?]
    //   anticipatory = depende de fix ainda não aplicado (C3/C4)
    const cases: Array<[label: string, input: string, shouldPass: boolean, anticipatory?: boolean]> = [
      ["clean hex", "#a3e635", true],
      ["rgb comma-separated", "rgb(163, 230, 53)", true],
      ["hsl space-separated", "hsl(84 76% 55%)", true],
      // C4: quoted font names — hoje rejeitados pelo regex, aceitos pós-fix.
      ["quoted font name", "'Inter', sans-serif", true, true],
      ["double-quoted font", `"Plus Jakarta Sans", sans-serif`, true, true],
      // CSS injection vectors
      ["CSS injection via brace", "#fff; } body { display: none", false],
      ["CSS injection via closing", "red; x: y", false],
      ["style tag escape", "</style><script>alert(1)</script>", false],
      ["newline injection", "red\n}\nbody { x: 1 }", false],
      // expression() IE — regex aceita mas browser ignora (sem flag executável)
      ["expression() IE", "expression(alert(1))", true],
      // url external sem colon — hoje aceito (gap documentado)
      ["url external (no colon)", "url(//evil.com/x.png)", true],
      // url com colon — bloqueado
      ["url with colon (blocked)", "url(https://x.com/y.png)", false],
      ["at-rule", "@import 'evil.css'", false],
      ["backslash escape", "\\aa red", false],
      ["unicode font", "Noto Sans KR", true],
      ["empty string", "", false],
      ["whitespace only", "   ", false],
      ["oversized (1000 chars)", "a".repeat(1000), true /* regex allows; no length guard yet */],
    ]

    it.each(cases)("%s → shouldPass=%s", (_label, input, shouldPass, anticipatory) => {
      const css = buildBrandTokenCss({
        ...ZORYON_BRAND_FIXTURE,
        visual: {
          ...ZORYON_BRAND_FIXTURE.visual,
          tokens: {
            ...ZORYON_BRAND_FIXTURE.visual.tokens,
            colors: { adversarial: input },
          },
        },
      })
      if (shouldPass) {
        // Deve produzir uma declaração `--brand-color-adversarial: <input>;`
        // Se anticipatory=true (quoted fonts), vai falhar até C4 land.
        expect(css).toContain("--brand-color-adversarial:")
        // O valor específico (após trim) aparece na saída
        expect(css).toContain(input.trim())
        void anticipatory
      } else {
        // Não pode conter a declaração com o valor injetado
        expect(css).not.toContain(`--brand-color-adversarial: ${input}`)
        // Após C3: console.warn chamado com contexto da rejeição.
        // Se C3 ainda não landou, este expect falha (teste antecipatório).
        // Empty/whitespace podem pular o warn (short-circuit); então
        // só assertamos warn quando o input não for vazio/whitespace.
        if (input.trim().length > 0) {
          expect(warnSpy).toHaveBeenCalled()
        }
      }
    })
  })
})
