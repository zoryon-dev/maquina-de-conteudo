import { describe, it, expect } from "vitest"
import { getCompatibleTemplates, getAvailableTemplates } from "../index"
import { TEMPLATE_METADATA } from "../types"

/**
 * Regras de `getCompatibleTemplates(motor)`:
 *   - Inclui TODOS os templates genéricos (meta.motor === undefined)
 *   - Inclui APENAS os templates cujo `meta.motor` bate com o argumento
 *
 * Templates exclusivos de `brandsdecoded_v4`: BD_CAPA, BD_DARK, BD_LIGHT, BD_CTA.
 * Hoje NÃO existem templates exclusivos de `tribal_v4` — genéricos atendem ambos.
 */

describe("getCompatibleTemplates", () => {
  it("tribal_v4 → exclui BD_CAPA/BD_DARK/BD_LIGHT/BD_CTA", () => {
    const list = getCompatibleTemplates("tribal_v4")
    expect(list).not.toContain("BD_CAPA")
    expect(list).not.toContain("BD_DARK")
    expect(list).not.toContain("BD_LIGHT")
    expect(list).not.toContain("BD_CTA")
  })

  it("tribal_v4 → inclui genéricos (01_CAPA, 201, 202, 203, DARK_MODE, WHITE_MODE)", () => {
    const list = getCompatibleTemplates("tribal_v4")
    expect(list).toContain("01_CAPA")
    expect(list).toContain("201")
    expect(list).toContain("202")
    expect(list).toContain("203")
    expect(list).toContain("DARK_MODE")
    expect(list).toContain("WHITE_MODE")
    expect(list).toContain("TWITTER")
    expect(list).toContain("SUPER_HEADLINE")
    expect(list).toContain("IMAGE_OVERLAY")
    expect(list).toContain("IMAGE_SPLIT")
    expect(list).toContain("IMAGE_MINIMAL")
  })

  it("brandsdecoded_v4 → inclui BD templates + genéricos", () => {
    const list = getCompatibleTemplates("brandsdecoded_v4")
    expect(list).toContain("BD_CAPA")
    expect(list).toContain("BD_DARK")
    expect(list).toContain("BD_LIGHT")
    expect(list).toContain("BD_CTA")
    // genéricos também entram
    expect(list).toContain("01_CAPA")
    expect(list).toContain("DARK_MODE")
    expect(list).toContain("WHITE_MODE")
  })

  it("brandsdecoded_v4 → retorna o conjunto completo (nenhum template exclusivo tribal hoje)", () => {
    const list = getCompatibleTemplates("brandsdecoded_v4")
    const all = getAvailableTemplates()
    // Não há `motor === "tribal_v4"` no metadata atual, então BD compatible == todos
    expect(list.sort()).toEqual(all.sort())
  })

  it("templates sem `motor` em metadata são sempre incluídos (genéricos)", () => {
    const genericIds = (Object.keys(TEMPLATE_METADATA) as Array<keyof typeof TEMPLATE_METADATA>)
      .filter((id) => !TEMPLATE_METADATA[id].motor)

    const tribalList = getCompatibleTemplates("tribal_v4")
    const bdList = getCompatibleTemplates("brandsdecoded_v4")

    for (const id of genericIds) {
      expect(tribalList).toContain(id)
      expect(bdList).toContain(id)
    }
  })

  it("cardinalidade: brandsdecoded_v4 tem >= tribal_v4 (BD adiciona os 4 exclusivos)", () => {
    const tribal = getCompatibleTemplates("tribal_v4")
    const bd = getCompatibleTemplates("brandsdecoded_v4")
    expect(bd.length).toBeGreaterThanOrEqual(tribal.length)
    expect(bd.length - tribal.length).toBe(4) // BD_CAPA/DARK/LIGHT/CTA
  })
})
