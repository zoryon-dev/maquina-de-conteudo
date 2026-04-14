/**
 * Integration test — fluxo completo de seeds (extract → consolidate → resolve).
 *
 * Valida que os três componentes de Fase 4 compõem corretamente:
 *   extractSeedAsBriefing (seed → briefing)
 *   consolidateSeeds (N briefings → string única)
 *   resolveBdBriefing (wizard.seeds + theme → briefing final)
 *
 * Testes unitários em content-extractor.service.test.ts + bd-briefing-resolver.test.ts
 * cobrem cada etapa isoladamente. Este arquivo garante que os formatos se
 * encaixam ponta-a-ponta.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const extractFromUrlMock = vi.fn()
const transcribeYouTubeMock = vi.fn()

vi.mock("../firecrawl.service", () => ({
  extractFromUrl: (...args: unknown[]) => extractFromUrlMock(...args),
}))

vi.mock("../apify.service", () => ({
  transcribeYouTube: (...args: unknown[]) => transcribeYouTubeMock(...args),
  formatYouTubeForPrompt: (x: { transcription: string }) =>
    `TRANSCRICAO: ${x.transcription}`,
}))

import {
  extractSeedAsBriefing,
  consolidateSeeds,
  type StoredSeed,
} from "../content-extractor.service"
import { resolveBdBriefing } from "../../../app/api/workers/bd-briefing-resolver"

describe("integration — seed flow end-to-end", () => {
  beforeEach(() => {
    extractFromUrlMock.mockReset()
    transcribeYouTubeMock.mockReset()
  })

  it("extract(link) + extract(youtube) + extract(theme) → consolidate → resolve reproduz briefing final", async () => {
    extractFromUrlMock.mockResolvedValue({
      success: true,
      data: {
        sourceUrl: "https://x.com/artigo",
        content: "Conteúdo do artigo scrapado via Firecrawl para teste de integração. " + "Texto adicional ".repeat(10),
        metadata: { title: "Artigo X" },
      },
    })
    transcribeYouTubeMock.mockResolvedValue({
      success: true,
      data: {
        sourceUrl: "https://youtube.com/watch?v=abc",
        transcription: "transcrição de vídeo completa para teste integração. " + "Conteúdo da transcrição ".repeat(8),
        metadata: { title: "Video Y", channelName: "Canal" },
      },
    })

    const r1 = await extractSeedAsBriefing({ type: "link", url: "https://x.com/artigo" })
    const r2 = await extractSeedAsBriefing({
      type: "youtube",
      url: "https://youtube.com/watch?v=abc",
    })
    const r3 = await extractSeedAsBriefing({
      type: "theme",
      value: "marketing digital para clínicas",
    })

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    if (!r1.success || !r2.success || !r3.success) return

    const seeds: StoredSeed[] = [
      { id: "s1", type: "link", value: "https://x.com/artigo", briefing: r1.data.briefing },
      { id: "s2", type: "youtube", value: "https://youtube.com/watch?v=abc", briefing: r2.data.briefing },
      { id: "s3", type: "theme", value: "marketing digital para clínicas", briefing: r3.data.briefing },
    ]

    const consolidated = consolidateSeeds(seeds)
    expect(consolidated).toContain("### FONTE 1 (link)")
    expect(consolidated).toContain("### FONTE 2 (youtube)")
    expect(consolidated).toContain("### FONTE 3 (theme)")
    expect(consolidated).toContain("Conteúdo do artigo")
    expect(consolidated).toContain("TRANSCRICAO:")
    expect(consolidated).toContain("marketing digital")

    const resolved = resolveBdBriefing({ seeds, theme: "deve ser ignorado" })
    expect(resolved.source).toBe("seeds")
    expect(resolved.seedsCount).toBe(3)
    expect(resolved.briefing).toBe(consolidated)
  })

  it("seeds vazias → resolver cai em wizard.theme", () => {
    const resolved = resolveBdBriefing({ seeds: [], theme: "tema puro" })
    expect(resolved.source).toBe("theme")
    expect(resolved.briefing).toBe("tema puro")
  })

  it("seed única sem separador + resolver preserva", async () => {
    const r = await extractSeedAsBriefing({
      type: "keyword",
      value: "SEO técnico avançado",
    })
    expect(r.success).toBe(true)
    if (!r.success) return

    const seeds: StoredSeed[] = [
      { id: "s1", type: "keyword", value: "SEO técnico avançado", briefing: r.data.briefing },
    ]
    const resolved = resolveBdBriefing({ seeds, theme: null })
    expect(resolved.source).toBe("seeds")
    expect(resolved.briefing?.split("---").length).toBe(1)
  })
})
