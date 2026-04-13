import { describe, it, expect } from "vitest"
import { parseHeadlinesResponse } from "../generate-bd-headlines"

/**
 * PR7 — testes para parseHeadlinesResponse.
 *
 * Nota: Agent A expandiu a assinatura do parser para retornar também um
 * objeto `diagnostics` junto com `headlines`. Este arquivo lida com as
 * duas formas possíveis (array direto OU objeto {headlines,diagnostics})
 * para não quebrar enquanto o refactor anda.
 */

function getHeadlines(
  result:
    | { headlines: Array<{ text: string; patternId?: string }> }
    | Array<{ text: string; patternId?: string }>
): Array<{ text: string; patternId?: string }> {
  return Array.isArray(result) ? result : result.headlines
}

describe("parseHeadlinesResponse — markdown + prosa", () => {
  it("extrai JSON envolto em bloco markdown ```json```", () => {
    const raw = '```json\n{"headlines":[{"text":"A","patternId":"morte_de_x"}]}\n```'
    const result = parseHeadlinesResponse(raw, 1)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(1)
    expect(headlines[0].text).toBe("A")
    expect(headlines[0].patternId).toBe("morte_de_x")
  })

  it("extrai JSON embutido no meio da prosa", () => {
    const raw = 'Aqui vão: {"headlines":[{"text":"A"}]} pronto.'
    const result = parseHeadlinesResponse(raw, 1)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(1)
    expect(headlines[0].text).toBe("A")
  })

  it("descarta itens inválidos (text vazio, só espaço, patternId tipo errado)", () => {
    const raw =
      '{"headlines":[{"text":""},{"text":"   "},{"text":"válida","patternId":123}]}'
    const result = parseHeadlinesResponse(raw, 3)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(1)
    expect(headlines[0].text).toBe("válida")
    expect(headlines[0].patternId).toBeUndefined()
  })

  it("descarta patternId desconhecido (não está no registry)", () => {
    const raw = '{"headlines":[{"text":"X","patternId":"fake_pattern"}]}'
    const result = parseHeadlinesResponse(raw, 1)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(1)
    expect(headlines[0].text).toBe("X")
    expect(headlines[0].patternId).toBeUndefined()
  })

  it("retorna vazio quando não há JSON no texto (sem throw)", () => {
    const raw = "não tem json"
    const result = parseHeadlinesResponse(raw, 1)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(0)
  })

  it("retorna vazio quando headlines array está vazio", () => {
    const raw = '{"headlines":[]}'
    const result = parseHeadlinesResponse(raw, 1)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(0)
  })

  it("preserva patternId válido entre os 8 registrados", () => {
    const raw =
      '{"headlines":[{"text":"H1","patternId":"investigando_x"},{"text":"H2","patternId":"contraste_antitese"}]}'
    const result = parseHeadlinesResponse(raw, 2)
    const headlines = getHeadlines(result)
    expect(headlines).toHaveLength(2)
    expect(headlines[0].patternId).toBe("investigando_x")
    expect(headlines[1].patternId).toBe("contraste_antitese")
  })
})
