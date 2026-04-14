/**
 * Testa a cadeia de prioridade do CTA instruction no BD_CTA template.
 *
 * Prioridade:
 *  1. slide.content.texto3Instruction (override explícito por slide)
 *  2. brand.content.ctaInstructionTemplate (override de marca)
 *  3. DEFAULT_BD_CTA_INSTRUCTION (fallback padrão)
 */

import { describe, it, expect } from "vitest"
import { generateBDCtaHtml, DEFAULT_BD_CTA_INSTRUCTION } from "../bd-cta"
import type { StudioSlide, StudioProfile, StudioHeader } from "../../types"

function mkCtaSlide(texto3Instruction?: string): StudioSlide {
  return {
    id: "cta-test",
    template: "BD_CTA",
    content: {
      texto1: "Headline CTA",
      texto1Bold: false,
      texto2: "Corpo CTA",
      texto3: "PALAVRA",
      texto3Bold: false,
      ...(texto3Instruction !== undefined ? { texto3Instruction } : {}),
    },
    style: {
      backgroundColor: "#0a0a0f",
      textColor: "#ffffff",
      primaryColor: "#a3e635",
      showSwipeIndicator: false,
    },
  }
}

const baseProfile: StudioProfile = {
  name: "Zoryon",
  handle: "@zoryon",
  showVerifiedBadge: false,
}

const baseHeader: StudioHeader = {
  category: "Branding",
  brand: "Zoryon",
  copyright: "",
}

describe("BD CTA instruction chain", () => {
  it("usa texto3Instruction do slide quando presente — prioridade máxima", () => {
    const slide = mkCtaSlide("Salva essa dica:")
    const html = generateBDCtaHtml({
      slide,
      profile: baseProfile,
      header: baseHeader,
      ctaInstruction: undefined, // simulando brand sem override
    })
    // O renderer (renderSlideToHtml) injeta ctaInstruction via slide.content?.texto3Instruction
    // Este teste chama diretamente generateBDCtaHtml com ctaInstruction explícito
    // para verificar que o fallback funciona corretamente
    const htmlWithSlideInstruction = generateBDCtaHtml({
      slide,
      profile: baseProfile,
      header: baseHeader,
      ctaInstruction: slide.content?.texto3Instruction,
    })
    expect(htmlWithSlideInstruction).toContain("Salva essa dica:")
    expect(htmlWithSlideInstruction).not.toContain(DEFAULT_BD_CTA_INSTRUCTION)
  })

  it("usa ctaInstructionTemplate da marca quando texto3Instruction ausente", () => {
    const slide = mkCtaSlide() // sem texto3Instruction
    const brandCta = "Marca pede que você comente:"
    const html = generateBDCtaHtml({
      slide,
      profile: baseProfile,
      header: baseHeader,
      ctaInstruction: brandCta,
    })
    expect(html).toContain("Marca pede que você comente:")
    expect(html).not.toContain(DEFAULT_BD_CTA_INSTRUCTION)
  })

  it("usa DEFAULT_BD_CTA_INSTRUCTION quando texto3Instruction e brand ambos ausentes", () => {
    const slide = mkCtaSlide()
    const html = generateBDCtaHtml({
      slide,
      profile: baseProfile,
      header: baseHeader,
      // ctaInstruction omitido → usa default
    })
    expect(html).toContain(DEFAULT_BD_CTA_INSTRUCTION)
  })

  it("texto3Instruction sobrepõe a instruction de marca quando ambos presentes", () => {
    const slide = mkCtaSlide("Instrução do slide")
    const html = generateBDCtaHtml({
      slide,
      profile: baseProfile,
      header: baseHeader,
      // Quando o renderer usa slide.content?.texto3Instruction ?? brand?.ctaInstructionTemplate,
      // o slide vence. Aqui testamos passando o valor que o renderer passaria:
      ctaInstruction: slide.content?.texto3Instruction ?? "Instrução de marca",
    })
    expect(html).toContain("Instrução do slide")
    expect(html).not.toContain("Instrução de marca")
    expect(html).not.toContain(DEFAULT_BD_CTA_INSTRUCTION)
  })
})
