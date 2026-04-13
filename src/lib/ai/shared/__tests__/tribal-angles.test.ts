import { describe, it, expect } from "vitest"
import {
  getAllTribalAngles,
  getTribalAngle,
  buildTribalAnglesPromptBlock,
  buildTribalAngleInjection,
  TRIBAL_ANGLE_IDS,
  type TribalAngleId,
} from "../tribal-angles"
import { ValidationError } from "@/lib/errors"

describe("tribal-angles registry", () => {
  it("expõe exatamente 4 ângulos", () => {
    const angles = getAllTribalAngles()
    expect(angles).toHaveLength(4)
  })

  it("ids batem com TRIBAL_ANGLE_IDS na ordem", () => {
    const ids = getAllTribalAngles().map((a) => a.id)
    expect(ids).toEqual([...TRIBAL_ANGLE_IDS])
  })

  it("cada ângulo tem campos mínimos populados", () => {
    for (const angle of getAllTribalAngles()) {
      expect(angle.label.length).toBeGreaterThan(0)
      expect(angle.description.length).toBeGreaterThan(0)
      expect(angle.example.length).toBeGreaterThan(0)
      expect(angle.promptInstruction.length).toBeGreaterThan(0)
    }
  })

  it("getTribalAngle retorna ângulo correto", () => {
    expect(getTribalAngle("herege")?.label).toBe("Herege")
    expect(getTribalAngle("visionario")?.label).toBe("Visionário")
    expect(getTribalAngle("tradutor")?.label).toBe("Tradutor")
    expect(getTribalAngle("testemunha")?.label).toBe("Testemunha")
  })

  it("getTribalAngle com id inválido retorna undefined", () => {
    // @ts-expect-error — testa runtime defesa contra cast
    expect(getTribalAngle("inexistente")).toBeUndefined()
  })
})

describe("buildTribalAnglesPromptBlock", () => {
  it("inclui os 4 labels", () => {
    const block = buildTribalAnglesPromptBlock()
    expect(block).toContain("Herege")
    expect(block).toContain("Visionário")
    expect(block).toContain("Tradutor")
    expect(block).toContain("Testemunha")
  })

  it("começa com header", () => {
    expect(buildTribalAnglesPromptBlock()).toMatch(/^# ÂNGULOS TRIBAIS/)
  })
})

describe("buildTribalAngleInjection", () => {
  it("herege gera bloco com instrução do ângulo", () => {
    const block = buildTribalAngleInjection("herege")
    expect(block).toContain("# ÂNGULO TRIBAL ESCOLHIDO")
    expect(block).toContain("Herege")
    expect(block).toContain("HEREGE")
  })

  it("lança ValidationError para id inválido", () => {
    expect(() =>
      buildTribalAngleInjection("nope" as TribalAngleId)
    ).toThrow(ValidationError)
  })

  it("inclui promptInstruction completo", () => {
    const angle = getTribalAngle("tradutor")!
    const block = buildTribalAngleInjection("tradutor")
    expect(block).toContain(angle.promptInstruction)
  })
})
