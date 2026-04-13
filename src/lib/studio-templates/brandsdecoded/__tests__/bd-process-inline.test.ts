import { describe, it, expect } from "vitest"
import { bdProcessInline } from "../shared"

/**
 * `bdProcessInline` ordem de operações:
 *   1. escapeHtml(text)
 *   2. **...**  → <em>...</em>    (accent color)
 *   3. __...__  → <strong>...</strong>
 *
 * Logo: XSS sempre escapado ANTES de markdown ser interpretado.
 */

describe("bdProcessInline", () => {
  it("escapa tags HTML arbitrárias (XSS via <script>)", () => {
    const out = bdProcessInline("<script>alert(1)</script>")
    expect(out).not.toContain("<script>")
    expect(out).toContain("&lt;script&gt;")
    expect(out).toContain("&lt;/script&gt;")
  })

  it("**foo** envolve em <em> (accent color)", () => {
    const out = bdProcessInline("antes **foo** depois")
    expect(out).toBe("antes <em>foo</em> depois")
  })

  it("__bar__ envolve em <strong>", () => {
    const out = bdProcessInline("antes __bar__ depois")
    expect(out).toBe("antes <strong>bar</strong> depois")
  })

  it("**<img onerror=x>** escapa tag primeiro e não gera HTML perigoso dentro do <em>", () => {
    const out = bdProcessInline("**<img onerror=x>**")
    // A tag <img> foi escapada antes do wrap em <em>, então o conteúdo do
    // <em> é o <img escapado (&lt;img...&gt;), nunca uma tag ativa.
    expect(out).not.toContain("<img")
    expect(out).toContain("&lt;img")
    // E o regex match falha porque escapeHtml transformou " em &quot;
    // — o importante é que não há tag HTML injetada.
  })

  it("**foo desbalanceado (sem fechamento) não envolve, mantém literal escapado", () => {
    const out = bdProcessInline("**foo incompleto")
    // regex /\*\*([^*]+)\*\*/g exige fechamento, então mantém os asteriscos
    expect(out).toContain("**foo incompleto")
  })

  it("string vazia → string vazia", () => {
    expect(bdProcessInline("")).toBe("")
  })

  it("só whitespace → só whitespace (escapeHtml é identity para espaços)", () => {
    expect(bdProcessInline("   ")).toBe("   ")
  })

  it("mistura ** e __ na mesma string", () => {
    const out = bdProcessInline("**a** e __b__")
    expect(out).toBe("<em>a</em> e <strong>b</strong>")
  })

  it("caracteres especiais & < > são escapados", () => {
    const out = bdProcessInline("Test & Co <tag>")
    expect(out).toContain("Test &amp; Co")
    expect(out).toContain("&lt;tag&gt;")
  })

  it("aspas duplas e simples escapadas", () => {
    const out = bdProcessInline(`"hello" 'world'`)
    expect(out).toContain("&quot;hello&quot;")
    expect(out).toContain("&#039;world&#039;")
  })
})
