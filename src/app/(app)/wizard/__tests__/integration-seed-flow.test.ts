/**
 * Integration test — fluxo de seeds Fase 4.
 *
 * Valida o ponto de consolidação (consolidateSeeds) que conecta UI +
 * extract-seed action + worker dispatch BD. Testes unitários individuais
 * cobrem cada etapa; este arquivo garante que o formato consolidado do
 * briefing satisfaz contratos compartilhados.
 */
import { describe, it, expect } from "vitest"
import { consolidateSeeds } from "@/lib/wizard-services/content-extractor.service"

describe("integration — seed flow", () => {
  it("consolida múltiplas seeds com separadores", () => {
    const out = consolidateSeeds([
      { type: "link", value: "https://x.com", briefing: "Artigo A" },
      { type: "youtube", value: "https://yt.com/abc", briefing: "Transcrição B" },
      { type: "theme", value: "marketing" },
    ])
    expect(out).toContain("### FONTE 1 (link)")
    expect(out).toContain("Artigo A")
    expect(out).toContain("### FONTE 2 (youtube)")
    expect(out).toContain("Transcrição B")
    expect(out).toContain("### FONTE 3 (theme)")
    expect(out).toContain("marketing")
    expect(out.split("---").length).toBe(3)
  })

  it("usa value quando briefing ausente", () => {
    const out = consolidateSeeds([{ type: "keyword", value: "SEO" }])
    expect(out).toContain("SEO")
  })
})
