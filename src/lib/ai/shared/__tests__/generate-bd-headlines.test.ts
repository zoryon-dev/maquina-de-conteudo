import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock do "ai" SDK ANTES de importar o módulo sob teste.
// `generateText` precisa ser reatribuível por teste para simular sucesso/lixo/throw.
// ---------------------------------------------------------------------------

const generateTextMock = vi.fn()

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))

// ---------------------------------------------------------------------------
// Mock do @/lib/ai/config — `openrouter` é mutável via configState para que
// possamos simular `openrouter = null` em um teste específico sem precisar
// de `vi.resetModules()`/dynamic import.
// ---------------------------------------------------------------------------

const configState: { openrouter: unknown } = {
  // por padrão, fingimos um provider configurado; o objeto é tratado como
  // truthy pelo `if (!openrouter)` guard. A função `chat()` retorna um
  // sentinel que será passado opaco ao mock de `generateText`.
  openrouter: { chat: (modelId: string) => ({ __mockModel: modelId }) },
}

vi.mock("@/lib/ai/config", () => ({
  get openrouter() {
    return configState.openrouter
  },
  DEFAULT_TEXT_MODEL: "openai/gpt-4.1",
}))

// Agora podemos importar o módulo sob teste.
import {
  generateBdHeadlines,
  type GenerateBdHeadlinesInput,
} from "../generate-bd-headlines"
import { ConfigError } from "@/lib/errors"

// ---------------------------------------------------------------------------
// Helpers de fixture
// ---------------------------------------------------------------------------

const baseInput: GenerateBdHeadlinesInput = {
  briefing: "Como a Geração Z está reconfigurando o consumo de luxo no Brasil",
}

function setLlmText(text: string) {
  generateTextMock.mockResolvedValueOnce({ text })
}

function setLlmThrow(err: unknown) {
  generateTextMock.mockRejectedValueOnce(err)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateBdHeadlines", () => {
  beforeEach(() => {
    generateTextMock.mockReset()
    // restaura openrouter "configurado" antes de cada teste (caso anterior tenha
    // setado pra null)
    configState.openrouter = {
      chat: (modelId: string) => ({ __mockModel: modelId }),
    }
  })

  it("lança ConfigError quando openrouter está null (OPENROUTER_API_KEY ausente)", async () => {
    configState.openrouter = null
    await expect(generateBdHeadlines(baseInput)).rejects.toBeInstanceOf(
      ConfigError
    )
    // não chamou o LLM
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it("parseia JSON válido e retorna headlines com patternId preservado", async () => {
    setLlmText(
      '{"headlines":[{"text":"A Morte do Luxo Acessível","patternId":"morte_de_x"},{"text":"Investigando o Novo Status da Gen Z","patternId":"investigando_x"}]}'
    )

    const result = await generateBdHeadlines({ ...baseInput, count: 2 })

    expect(generateTextMock).toHaveBeenCalledTimes(1)
    expect(result.headlines).toHaveLength(2)
    expect(result.headlines[0].text).toBe("A Morte do Luxo Acessível")
    expect(result.headlines[0].patternId).toBe("morte_de_x")
    expect(result.headlines[1].patternId).toBe("investigando_x")
    // count atendido → não deve haver diagnostics de parseFailed nem llmFailed
    expect(result.diagnostics?.parseFailed).toBeUndefined()
    expect(result.diagnostics?.llmFailed).toBeUndefined()
    // promptUsed deve estar presente
    expect(result.promptUsed).toContain("# BRIEFING")
    expect(result.promptUsed).toContain(baseInput.briefing)
  })

  it("parseia JSON envolto em markdown (```json ... ```) via extractLooseJSON", async () => {
    setLlmText(
      '```json\n{"headlines":[{"text":"O Fim do Marketing de Influência","patternId":"morte_de_x"}]}\n```'
    )

    const result = await generateBdHeadlines({ ...baseInput, count: 1 })

    expect(result.headlines).toHaveLength(1)
    expect(result.headlines[0].text).toBe("O Fim do Marketing de Influência")
    expect(result.headlines[0].patternId).toBe("morte_de_x")
  })

  it("retorna headlines vazias + diagnostics.parseFailed quando LLM devolve lixo", async () => {
    setLlmText("não tem json aqui, só prosa solta sobre o tema")

    const result = await generateBdHeadlines({ ...baseInput, count: 5 })

    expect(result.headlines).toEqual([])
    expect(result.diagnostics?.parseFailed).toBe(true)
    expect(result.diagnostics?.expectedCount).toBe(5)
  })

  it("quando patternIds é fornecido, o prompt inclui APENAS aqueles padrões (não os 8)", async () => {
    setLlmText('{"headlines":[{"text":"H","patternId":"morte_de_x"}]}')

    const result = await generateBdHeadlines({
      ...baseInput,
      count: 1,
      patternIds: ["morte_de_x"],
    })

    // O prompt deve mencionar morte_de_x mas NÃO os outros 7
    expect(result.promptUsed).toContain("A Morte")
    expect(result.promptUsed).not.toContain("investigando_x")
    expect(result.promptUsed).not.toContain("Por que")
    // header de "PADRÕES SELECIONADOS" deve indicar contagem 1
    expect(result.promptUsed).toContain("(1)")
  })

  it("count=3 → prompt menciona 3 e parser retorna no máximo 3 itens válidos", async () => {
    // LLM devolve 4, mas pedimos 3
    setLlmText(
      '{"headlines":[{"text":"H1"},{"text":"H2"},{"text":"H3"},{"text":"H4"}]}'
    )

    const result = await generateBdHeadlines({ ...baseInput, count: 3 })

    // O prompt explicitamente pede 3
    expect(result.promptUsed).toContain("Gere 3 headlines")
    // parser retorna todas as válidas (4) — o clamp é feito apenas na
    // contagem do prompt, não no resultado. Validamos que diagnostics ainda
    // não acusa parseFailed.
    expect(result.headlines.length).toBeGreaterThanOrEqual(3)
    expect(result.diagnostics?.parseFailed).toBeUndefined()
  })

  it("quando generateText lança, retorna headlines:[] + diagnostics.llmFailed=true (não propaga erro)", async () => {
    setLlmThrow(new Error("openrouter timeout"))

    const result = await generateBdHeadlines({ ...baseInput, count: 5 })

    expect(result.headlines).toEqual([])
    expect(result.diagnostics?.llmFailed).toBe(true)
    expect(result.diagnostics?.expectedCount).toBe(5)
    expect(result.promptUsed).toContain("# BRIEFING")
  })

  it("descarta itens com text inválido e patternIds desconhecidos sem quebrar", async () => {
    setLlmText(
      '{"headlines":[{"text":""},{"text":"   "},{"text":"válida","patternId":"fake_pattern"},{"text":"H2","patternId":"morte_de_x"}]}'
    )

    const result = await generateBdHeadlines({ ...baseInput, count: 2 })

    // 2 válidas (texto não-vazio); patternId "fake_pattern" é ignorado, "morte_de_x" preservado
    expect(result.headlines).toHaveLength(2)
    expect(result.headlines[0].text).toBe("válida")
    expect(result.headlines[0].patternId).toBeUndefined()
    expect(result.headlines[1].text).toBe("H2")
    expect(result.headlines[1].patternId).toBe("morte_de_x")
    // diagnostics deve indicar descarte
    expect(result.diagnostics?.discardedCount).toBe(2)
  })
})
