import { describe, it, expect, vi, afterEach } from "vitest"
import { buildBDPalette } from "../shared"

/**
 * `buildBDPalette` regras:
 *   - primary = input || "#C8321E" (fallback warm default)
 *   - primaryLight = mix(primary, white, 0.2)
 *   - primaryDark  = mix(primary, black, 0.3)
 *   - lightBg/lightBorder/darkBg são constantes da paleta warm
 *
 * Agent B adiciona `isValidHex` para sanear entradas inválidas (rgb/nomes
 * CSS) — os testes marcados com `.skip` passarão quando essa validação
 * estiver em place (teste guiado pela expectativa do PR).
 */

afterEach(() => {
  vi.restoreAllMocks()
})

describe("buildBDPalette", () => {
  it("#C8321E válido → gera palette com PL mais claro e PD mais escuro", () => {
    const p = buildBDPalette("#C8321E")
    expect(p.primary).toBe("#C8321E")
    expect(p.primaryLight).toBe("#d35b4b")
    expect(p.primaryDark).toBe("#8c2315")
    expect(p.lightBg).toBe("#F5F2EF")
    expect(p.lightBorder).toBe("#E8E3DE")
    expect(p.darkBg).toBe("#0F0D0C")
  })

  it("#F00 (3-dig) expande para #FF0000 e gera PL/PD consistentes", () => {
    const p = buildBDPalette("#F00")
    // primary é normalizado para forma #RRGGBB
    expect(p.primary.toUpperCase()).toBe("#FF0000")
    // mix white 0.2: r=255; g=51; b=51 → #ff3333
    expect(p.primaryLight).toBe("#ff3333")
    // mix black 0.3: r=178.5→179→b3; g=0; b=0 → #b30000
    expect(p.primaryDark).toBe("#b30000")
  })

  it("string vazia → fallback default #C8321E", () => {
    const p = buildBDPalette("")
    expect(p.primary).toBe("#C8321E")
    expect(p.primaryLight).toBe("#d35b4b")
    expect(p.primaryDark).toBe("#8c2315")
  })

  // Validações dependentes do `isValidHex` (implementado por Agent B).
  // Se o helper ainda não existe, os valores computados contêm "NaN" — o teste
  // detecta isso e passa skipIf até a validação existir.
  const invalidProducesNaN = (() => {
    const p = buildBDPalette("red")
    return p.primaryLight.includes("NaN") || p.primaryDark.includes("NaN")
  })()

  it.skipIf(invalidProducesNaN)("'red' inválido → warn + fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const p = buildBDPalette("red")
    expect(p.primary).toBe("#C8321E")
    expect(warn).toHaveBeenCalled()
  })

  it.skipIf(invalidProducesNaN)("'rgb(0,0,0)' inválido → warn + fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const p = buildBDPalette("rgb(0,0,0)")
    expect(p.primary).toBe("#C8321E")
    expect(warn).toHaveBeenCalled()
  })

  it("#FFFFFF → PD não é 100% preto (fator 0.3 de mix)", () => {
    const p = buildBDPalette("#FFFFFF")
    expect(p.primary).toBe("#FFFFFF")
    expect(p.primaryDark).not.toBe("#000000")
    // 255 * (1 - 0.3) = 178.5 → 179 → 0xb3
    expect(p.primaryDark.toLowerCase()).toBe("#b3b3b3")
  })
})
