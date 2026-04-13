/**
 * Testes do reducer `applyMotorChange`.
 *
 * Garante que ao trocar de motor a UI nunca envia motorOptions de motor
 * inativo (evita vazar config ilegal que o superRefine do boundary já bloqueia
 * — mas o ideal é não chegar lá).
 */

import { describe, expect, it } from "vitest"
import { applyMotorChange } from "../apply-motor-change"
import type { WizardFormData } from "../step-1-inputs"

describe("applyMotorChange", () => {
  it("limpa motorOptions quando sai de brandsdecoded_v4 para tribal_v4", () => {
    const data: WizardFormData = {
      motor: "brandsdecoded_v4",
      motorOptions: { tribalAngle: "herege" },
      theme: "Marketing tribal",
    }

    const next = applyMotorChange(data, "tribal_v4")

    expect(next.motor).toBe("tribal_v4")
    expect(next.motorOptions).toBeUndefined()
    // Campos não-motor são preservados.
    expect(next.theme).toBe("Marketing tribal")
  })

  it("não cria motorOptions quando vem de tribal_v4 sem opções e vai para brandsdecoded_v4", () => {
    const data: WizardFormData = { motor: "tribal_v4" }

    const next = applyMotorChange(data, "brandsdecoded_v4")

    expect(next.motor).toBe("brandsdecoded_v4")
    expect(next.motorOptions).toBeUndefined()
  })

  it("preserva motorOptions ao trocar de brandsdecoded_v4 para brandsdecoded_v4 (no-op de motor)", () => {
    const data: WizardFormData = {
      motor: "brandsdecoded_v4",
      motorOptions: { tribalAngle: "visionario", bdHeadlinePatterns: ["morte_de_x"] },
    }

    const next = applyMotorChange(data, "brandsdecoded_v4")

    expect(next.motor).toBe("brandsdecoded_v4")
    expect(next.motorOptions).toEqual({
      tribalAngle: "visionario",
      bdHeadlinePatterns: ["morte_de_x"],
    })
  })

  it("não muta o objeto de entrada (pureza)", () => {
    const data: WizardFormData = {
      motor: "brandsdecoded_v4",
      motorOptions: { tribalAngle: "herege" },
    }
    const snapshot = JSON.parse(JSON.stringify(data))

    applyMotorChange(data, "tribal_v4")

    expect(data).toEqual(snapshot)
  })
})
