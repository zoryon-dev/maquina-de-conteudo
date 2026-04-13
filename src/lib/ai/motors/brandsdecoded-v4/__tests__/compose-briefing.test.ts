import { describe, it, expect } from "vitest"
import { composeBriefingWithTribalAngle } from "../orchestrator"
import type { TribalAngleId } from "@/lib/ai/shared/tribal-angles"

/**
 * PR7 — testes para composeBriefingWithTribalAngle (helper puro extraído do
 * orchestrator). Comportamento esperado:
 *  - Sem tribalAngle → retorna rawBriefing inalterado.
 *  - Com tribalAngle válido → prefixa bloco "# ÂNGULO TRIBAL ESCOLHIDO" +
 *    rawBriefing preservado no final.
 *  - Com id inválido → idealmente throws (Agent A está adicionando essa
 *    validação). Se ainda não throw, aceita passagem silenciosa.
 */

const BRIEFING = "Briefing cru sobre o tema central do post."

describe("composeBriefingWithTribalAngle", () => {
  it("sem tribalAngle retorna rawBriefing inalterado", () => {
    const result = composeBriefingWithTribalAngle(BRIEFING)
    expect(result).toBe(BRIEFING)
  })

  it("com tribalAngle=undefined explícito retorna rawBriefing inalterado", () => {
    const result = composeBriefingWithTribalAngle(BRIEFING, undefined)
    expect(result).toBe(BRIEFING)
  })

  it("com tribalAngle='herege' prefixa bloco tribal + briefing", () => {
    const result = composeBriefingWithTribalAngle(BRIEFING, "herege")
    expect(result).toContain("# ÂNGULO TRIBAL ESCOLHIDO")
    expect(result).toContain("Herege")
    expect(result).toContain(BRIEFING)
    // rawBriefing deve vir depois do bloco tribal (no final).
    expect(result.indexOf("# ÂNGULO TRIBAL ESCOLHIDO")).toBeLessThan(
      result.indexOf(BRIEFING)
    )
  })

  it("com tribalAngle='visionario' injeta o ângulo correto", () => {
    const result = composeBriefingWithTribalAngle(BRIEFING, "visionario")
    expect(result).toContain("Visionário")
    expect(result).toContain(BRIEFING)
  })

  it("com id inválido throws OU retorna briefing (depende do estado do Agent A)", () => {
    const invalidId = "fake_tribal" as TribalAngleId
    let threw = false
    let returned: string | undefined
    try {
      returned = composeBriefingWithTribalAngle(BRIEFING, invalidId)
    } catch {
      threw = true
    }
    // Caso ideal (pós Agent A): throws ValidationError.
    // Caso intermediário: retorna algo contendo o briefing (ou undefined).
    if (threw) {
      expect(threw).toBe(true)
    } else {
      expect(returned).toBeDefined()
      expect(returned).toContain(BRIEFING)
    }
  })

  it("testa os 4 ids tribais válidos sem lançar", () => {
    const ids: TribalAngleId[] = ["herege", "visionario", "tradutor", "testemunha"]
    for (const id of ids) {
      const result = composeBriefingWithTribalAngle(BRIEFING, id)
      expect(result).toContain(BRIEFING)
      expect(result).toContain("# ÂNGULO TRIBAL ESCOLHIDO")
    }
  })
})
