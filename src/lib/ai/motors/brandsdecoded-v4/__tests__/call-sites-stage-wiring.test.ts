import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * T1 — Call-site stage wiring.
 *
 * Prova que cada uma das 5 etapas do pipeline BD v4 chama
 * `buildBrandContextBlock` com o `stage` correto. Sem este teste, um typo
 * ("triage" em vez de "triagem") passaria silenciosamente — a renderização
 * cairia no modo legacy bullet-flat e ninguém notaria até ver o prompt.
 *
 * Estratégia: mockar `buildBrandContextBlock` do módulo `_shared/brand-block`
 * e registrar todos os `opts.stage` observados. Também mockamos `generateText`
 * do Vercel AI SDK + openrouter para evitar qualquer chamada de rede.
 */

// Mock da AI SDK — retornamos um JSON plausível pra cada stage.
vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(async ({ prompt }: { prompt: string }) => {
    // Heurística de ordem importa: copy-blocks menciona "ESPINHA DORSAL
    // APROVADA" no prompt; legenda menciona "ESPINHA DORSAL DO CARROSSEL".
    // Portanto, checa copy-blocks e legenda primeiro.
    if (prompt.includes("18 blocos") || prompt.includes("Gerar os 18 blocos")) {
      return {
        text: JSON.stringify({
          blocks: Array.from({ length: 18 }, (_, i) => ({
            index: i + 1,
            text: `bloco ${i + 1} com conteúdo textual suficiente`,
          })),
        }),
      }
    }
    if (prompt.includes("legenda Instagram") || prompt.includes("Escrever a legenda")) {
      // Legenda: texto corrido >50 palavras.
      return {
        text: Array.from({ length: 60 }, (_, i) => `palavra${i}`).join(" "),
      }
    }
    if (prompt.includes("10 headlines") || prompt.includes("Gere 10 headlines")) {
      return {
        text: JSON.stringify({
          headlines: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            format: i < 5 ? "IC" : "NM",
            text:
              i < 5
                ? "Reenquadramento provocativo: hook de curiosidade aqui"
                : "Cenário concreto. Mecanismo explicado. Tensão aberta.",
          })),
        }),
      }
    }
    if (prompt.includes("Espinha Dorsal") || prompt.includes("monte a Espinha")) {
      return {
        text: JSON.stringify({
          headline: "Reenquadramento provocativo: hook de curiosidade aqui",
          hook: "hook x",
          mecanismo: "mec x",
          prova: "A) a B) b C) c",
          aplicacao: "apl x",
          direcao: "dir x",
        }),
      }
    }
    // Default fallback: triagem.
    return {
      text: JSON.stringify({
        transformacao: "t",
        friccao: "f",
        angulo: "a",
        evidencias: ["e1", "e2", "e3"],
      }),
    }
  }),
}))

vi.mock("@/lib/ai/config", () => ({
  openrouter: { chat: vi.fn().mockReturnValue({}) },
  DEFAULT_TEXT_MODEL: "mock-model",
}))

// Spy no buildBrandContextBlock. Mantemos a implementação real para não
// quebrar os call sites que dependem do retorno ser string.
const stageCalls: Array<{ stage?: string }> = []
vi.mock("../_shared/brand-block", async () => {
  const actual = await vi.importActual<typeof import("../_shared/brand-block")>(
    "../_shared/brand-block"
  )
  return {
    ...actual,
    buildBrandContextBlock: vi.fn((vars, opts = {}) => {
      stageCalls.push({ stage: opts.stage })
      return actual.buildBrandContextBlock(vars, opts)
    }),
  }
})

// Silencia QA dry (dynamic import dentro do orchestrator).
vi.mock("@/lib/ai/quality", () => ({
  runEditorialQA: vi.fn().mockResolvedValue({
    passed: true,
    blockingHits: [],
    warnHits: [],
    scores: [],
  }),
}))

const BRAND_VARS = {
  tone: "editorial",
  niche: "estratégia",
  targetAudience: "PMEs",
  audienceFears: "virar commodity",
  audienceDesires: "autoridade",
  differentiators: "metodologia BD",
  brandVoice: "verbos ativos",
  negativeTerms: "guru",
  contentGoals: "educar",
  preferredCTAs: "link na bio",
}

describe("call-site stage wiring (T1)", () => {
  beforeEach(() => {
    stageCalls.length = 0
  })

  it("runTriagem passa stage='triagem' para buildBrandContextBlock", async () => {
    const { runTriagem } = await import("../espinha")
    await runTriagem({
      briefing: "um briefing qualquer",
      brandPromptVariables: BRAND_VARS,
    })
    const stages = stageCalls.map((c) => c.stage).filter(Boolean)
    expect(stages).toContain("triagem")
  })

  it("generateHeadlinesForBD passa stage='headlines'", async () => {
    const { generateHeadlinesForBD } = await import("../headline-patterns")
    await generateHeadlinesForBD({
      briefing: "um briefing qualquer",
      triagem: {
        transformacao: "t",
        friccao: "f",
        angulo: "a",
        evidencias: ["e1", "e2"],
      },
      brandPromptVariables: BRAND_VARS,
    })
    const stages = stageCalls.map((c) => c.stage).filter(Boolean)
    expect(stages).toContain("headlines")
  })

  it("buildEspinhaDorsal passa stage='espinha'", async () => {
    const { buildEspinhaDorsal } = await import("../espinha")
    await buildEspinhaDorsal({
      triagem: {
        transformacao: "t",
        friccao: "f",
        angulo: "a",
        evidencias: ["e1", "e2"],
      },
      selectedHeadline: "Reenquadramento provocativo: hook de curiosidade aqui",
      brandPromptVariables: BRAND_VARS,
    })
    const stages = stageCalls.map((c) => c.stage).filter(Boolean)
    expect(stages).toContain("espinha")
  })

  it("generateCopyBlocks passa stage='copy-blocks'", async () => {
    const { generateCopyBlocks } = await import("../copy-blocks")
    await generateCopyBlocks({
      espinha: {
        headline: "h",
        hook: "hk",
        mecanismo: "m",
        prova: "p",
        aplicacao: "a",
        direcao: "d",
      },
      brandPromptVariables: BRAND_VARS,
    })
    const stages = stageCalls.map((c) => c.stage).filter(Boolean)
    expect(stages).toContain("copy-blocks")
  })

  it("generateLegendaInstagram passa stage='legenda'", async () => {
    const { generateLegendaInstagram } = await import("../orchestrator")
    const { BLOCK_SPEC } = await import("../copy-blocks")
    await generateLegendaInstagram({
      espinha: {
        headline: "h",
        hook: "hk",
        mecanismo: "m",
        prova: "p",
        aplicacao: "a",
        direcao: "d",
      },
      blocks: BLOCK_SPEC.map((spec) => ({ ...spec, text: `bloco ${spec.index}` })),
      brandPromptVariables: BRAND_VARS,
    })
    const stages = stageCalls.map((c) => c.stage).filter(Boolean)
    expect(stages).toContain("legenda")
  })

  it("cobre os 5 stages em sequência quando pipeline completo roda", async () => {
    // Chamamos os 5 builders diretamente para consolidar a asserção
    // estrutural: nenhum call site foi esquecido.
    const { runTriagem, buildEspinhaDorsal } = await import("../espinha")
    const { generateHeadlinesForBD } = await import("../headline-patterns")
    const { generateCopyBlocks, BLOCK_SPEC } = await import("../copy-blocks")
    const { generateLegendaInstagram } = await import("../orchestrator")

    const espinhaShape = {
      headline: "h",
      hook: "hk",
      mecanismo: "m",
      prova: "p",
      aplicacao: "a",
      direcao: "d",
    }
    const triagemShape = {
      transformacao: "t",
      friccao: "f",
      angulo: "a",
      evidencias: ["e1", "e2"],
    }

    await runTriagem({ briefing: "b", brandPromptVariables: BRAND_VARS })
    await generateHeadlinesForBD({
      briefing: "b",
      triagem: triagemShape,
      brandPromptVariables: BRAND_VARS,
    })
    await buildEspinhaDorsal({
      triagem: triagemShape,
      selectedHeadline: "h",
      brandPromptVariables: BRAND_VARS,
    })
    await generateCopyBlocks({
      espinha: espinhaShape,
      brandPromptVariables: BRAND_VARS,
    })
    await generateLegendaInstagram({
      espinha: espinhaShape,
      blocks: BLOCK_SPEC.map((spec) => ({ ...spec, text: `bloco ${spec.index}` })),
      brandPromptVariables: BRAND_VARS,
    })

    const stages = new Set(
      stageCalls.map((c) => c.stage).filter((s): s is string => Boolean(s))
    )
    expect(stages).toEqual(
      new Set(["triagem", "headlines", "espinha", "copy-blocks", "legenda"])
    )
  })
})
