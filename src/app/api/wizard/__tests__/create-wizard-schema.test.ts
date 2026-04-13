/**
 * Testes do contrato POST /api/wizard (schema Zod).
 *
 * Foco em estado ilegal entre motor ↔ motorOptions — o superRefine
 * é a última defesa antes de persistir no DB.
 */

import { describe, expect, it } from "vitest"
import { createWizardSchema } from "../schema"

describe("createWizardSchema", () => {
  it("aceita motor=brandsdecoded_v4 com tribalAngle válido", () => {
    const result = createWizardSchema.safeParse({
      motor: "brandsdecoded_v4",
      motorOptions: { tribalAngle: "herege" },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.motorOptions?.tribalAngle).toBe("herege")
    }
  })

  it("rejeita tribalAngle inválido com issue no path correto", () => {
    const result = createWizardSchema.safeParse({
      motor: "brandsdecoded_v4",
      motorOptions: { tribalAngle: "inválido" },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) =>
          i.path.join(".") === "motorOptions.tribalAngle" ||
          (i.path[0] === "motorOptions" && i.path[1] === "tribalAngle")
      )
      expect(issue).toBeDefined()
    }
  })

  it("rejeita tribalAngle quando motor != brandsdecoded_v4 (superRefine)", () => {
    const result = createWizardSchema.safeParse({
      motor: "tribal_v4",
      motorOptions: { tribalAngle: "herege" },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join(".") === "motorOptions.tribalAngle"
      )
      expect(issue).toBeDefined()
      expect(issue?.message).toMatch(/brandsdecoded_v4/)
    }
  })

  it("aceita bdHeadlinePatterns com ids válidos", () => {
    const result = createWizardSchema.safeParse({
      motor: "brandsdecoded_v4",
      motorOptions: { bdHeadlinePatterns: ["morte_de_x"] },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.motorOptions?.bdHeadlinePatterns).toEqual(["morte_de_x"])
    }
  })

  it("rejeita bdHeadlinePatterns com id inexistente (enum estrito)", () => {
    const result = createWizardSchema.safeParse({
      motor: "brandsdecoded_v4",
      motorOptions: { bdHeadlinePatterns: ["nao_existe"] },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.join(".") === "motorOptions.bdHeadlinePatterns.0"
      )
      expect(issue).toBeDefined()
    }
  })

  it("aceita payload sem motor (default aplicado no DB)", () => {
    const result = createWizardSchema.safeParse({
      theme: "Inteligência artificial aplicada ao conteúdo",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.motor).toBeUndefined()
    }
  })

  it("preserva passthrough para campos experimentais não listados", () => {
    const result = createWizardSchema.safeParse({
      motor: "tribal_v4",
      experimentalFlag: "xyz",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // passthrough mantém a chave extra na saída
      expect((result.data as Record<string, unknown>).experimentalFlag).toBe("xyz")
    }
  })

  it("rejeita numberOfSlides fora do range [1,20]", () => {
    const result = createWizardSchema.safeParse({ numberOfSlides: 21 })
    expect(result.success).toBe(false)
  })
})
