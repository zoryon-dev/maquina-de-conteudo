import { describe, it, expect } from "vitest"
import {
  buildBdHeadlinesPrompt,
  DEFAULT_COUNT,
} from "../generate-bd-headlines"
import {
  getAllHeadlinePatterns,
  type HeadlinePatternId,
} from "../headline-library"

/**
 * PR7 — testes para buildBdHeadlinesPrompt (helper puro extraído do
 * generate-bd-headlines.ts). Responsável por:
 *  - Clampar `count` entre 1 e 10.
 *  - Injetar patternsBlock (subset ou todos) e brandContextBlock opcional.
 *  - Montar o prompt sem depender do LLM.
 */

const BRIEFING = "Briefing de teste: tema sobre branding autoral."

describe("buildBdHeadlinesPrompt — count clamp", () => {
  it("count=0 é clamp para 1 (prompt menciona 'Gere 1 headlines')", () => {
    const { prompt, count } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      count: 0,
    })
    expect(count).toBe(1)
    expect(prompt).toContain("Gere 1 headlines")
    expect(prompt).toContain("(1 itens")
  })

  it("count=11 é clamp para 10 (prompt menciona '10 headlines')", () => {
    const { prompt, count } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      count: 11,
    })
    expect(count).toBe(10)
    expect(prompt).toContain("Gere 10 headlines")
    expect(prompt).toContain("(10 itens")
  })

  it("count negativo também é clamp para 1", () => {
    const { count } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      count: -5,
    })
    expect(count).toBe(1)
  })
})

describe("buildBdHeadlinesPrompt — default count (Test 4)", () => {
  it("sem `count` usa DEFAULT_COUNT=5", () => {
    expect(DEFAULT_COUNT).toBe(5)
    const { prompt, count } = buildBdHeadlinesPrompt({ briefing: BRIEFING })
    expect(count).toBe(5)
    expect(prompt).toContain("Gere 5 headlines")
    expect(prompt).toContain("(5 itens")
  })
})

describe("buildBdHeadlinesPrompt — patternIds", () => {
  it("subset de patternIds reflete no bloco (somente os selecionados aparecem)", () => {
    const ids: HeadlinePatternId[] = ["morte_de_x", "investigando_x"]
    const { prompt } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      patternIds: ids,
    })
    expect(prompt).toContain("A Morte / O Fim de X")
    expect(prompt).toContain("Investigando")
    // Não deve conter padrões fora do subset.
    expect(prompt).not.toContain("Provocação Existencial")
  })

  it("sem patternIds → prompt menciona todos os 8 padrões", () => {
    const { prompt } = buildBdHeadlinesPrompt({ briefing: BRIEFING })
    const all = getAllHeadlinePatterns()
    expect(all.length).toBeGreaterThanOrEqual(8)
    for (const pattern of all) {
      expect(prompt).toContain(pattern.name)
    }
  })

  it("patternIds=[] (array vazio) cai no fallback — todos os padrões", () => {
    const { prompt } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      patternIds: [],
    })
    // Fallback é o bloco de todos (não vazio).
    expect(prompt).toContain("A Morte / O Fim de X")
    expect(prompt).toContain("Provocação Existencial")
  })
})

describe("buildBdHeadlinesPrompt — brandContextBlock", () => {
  it("brandContextBlock vazio não injeta linhas vazias duplicadas no prompt", () => {
    const { prompt } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      brandContextBlock: "",
    })
    // Filter(Boolean) remove strings vazias, então não deve haver 3+ \n seguidas.
    expect(prompt).not.toMatch(/\n\n\n\n/)
  })

  it("brandContextBlock com conteúdo aparece literal no prompt", () => {
    const brandBlock = "## MARCA — Zoryon\nPosicionamento: IA editorial."
    const { prompt } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      brandContextBlock: brandBlock,
    })
    expect(prompt).toContain(brandBlock)
  })

  it("brandContextBlock undefined funciona como vazio (sem quebrar prompt)", () => {
    const { prompt } = buildBdHeadlinesPrompt({ briefing: BRIEFING })
    expect(prompt).toContain("# TAREFA")
    expect(prompt).toContain("# BRIEFING")
    expect(prompt).toContain(BRIEFING)
    expect(prompt).toContain("# RESPOSTA")
  })

  it("brandContextBlock só-whitespace é tratado como vazio (trim)", () => {
    const { prompt } = buildBdHeadlinesPrompt({
      briefing: BRIEFING,
      brandContextBlock: "   \n   ",
    })
    expect(prompt).not.toMatch(/\n\n\n\n/)
  })
})

describe("buildBdHeadlinesPrompt — estrutura final", () => {
  it("contém todas as seções obrigatórias", () => {
    const { prompt } = buildBdHeadlinesPrompt({ briefing: BRIEFING })
    expect(prompt).toContain("# TAREFA")
    expect(prompt).toContain("# REGRAS")
    expect(prompt).toContain("# BRIEFING")
    expect(prompt).toContain("# RESPOSTA")
    expect(prompt).toContain(BRIEFING)
  })
})
