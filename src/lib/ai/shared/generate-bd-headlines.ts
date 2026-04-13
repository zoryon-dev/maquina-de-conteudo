// Gera N headlines usando os padrões da biblioteca BrandsDecoded.
// Helper cross-motor: chamável por Tribal v4, BrandsDecoded v4 ou motores
// futuros que queiram headlines alternativas no estilo BD.

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { ConfigError } from "@/lib/errors"
import {
  buildHeadlinePatternsBlock,
  type HeadlinePatternId,
  getHeadlinePattern,
} from "./headline-library"
import { extractLooseJSON } from "./parse-json"

export type BdHeadlineSuggestion = {
  text: string
  patternId?: HeadlinePatternId
}

export type GenerateBdHeadlinesInput = {
  briefing: string
  // Quando fornecido, restringe aos padrões selecionados. Caso contrário
  // usa todos os 8 (mais variedade, menos foco).
  patternIds?: HeadlinePatternId[]
  // Quantas sugestões retornar. Default 5.
  count?: number
  // Bloco textual de marca (vindo do PR2 brand injection). Opcional.
  brandContextBlock?: string
  model?: string
}

export type GenerateBdHeadlinesDiagnostics = {
  llmFailed?: boolean
  parseFailed?: boolean
  discardedCount?: number
  expectedCount?: number
}

export type GenerateBdHeadlinesResult = {
  headlines: BdHeadlineSuggestion[]
  promptUsed: string
  diagnostics?: GenerateBdHeadlinesDiagnostics
}

export const DEFAULT_COUNT = 5

/**
 * Helper puro (PR7): compõe o prompt completo + conta validada para geração
 * de headlines BD. Extraído para permitir testes unitários sem chamar o LLM.
 * Faz clamp do `count` entre 1 e 10 e injeta patternsBlock + brandContextBlock.
 */
export function buildBdHeadlinesPrompt(input: GenerateBdHeadlinesInput): {
  prompt: string
  count: number
} {
  const count = Math.max(1, Math.min(input.count ?? DEFAULT_COUNT, 10))
  const patternsBlock = buildHeadlinePatternsBlock(input.patternIds)
  const brandBlock = input.brandContextBlock?.trim() ?? ""

  const prompt = [
    "# TAREFA",
    `Gere ${count} headlines no estilo BrandsDecoded para o briefing abaixo, usando os padrões fornecidos.`,
    "",
    "# REGRAS",
    "- PT-BR. Sem clichês de IA (não use 'no fim das contas', 'a pergunta que fica', etc).",
    "- Cada headline deve seguir um padrão da seção abaixo (não invente padrões novos).",
    "- Headlines de 8-25 palavras. Concretas, com verbo forte ou contraste.",
    "- Variedade entre as opções — não repita padrão estrutural mais que 2x.",
    "",
    "# BRIEFING",
    input.briefing,
    "",
    brandBlock,
    "",
    patternsBlock,
    "",
    "# RESPOSTA",
    "Responda APENAS com JSON válido, sem markdown:",
    `{"headlines":[{"text":"...","patternId":"..."}, ...]}`,
    `(${count} itens, patternId é opcional mas recomendado)`,
  ]
    .filter(Boolean)
    .join("\n")

  return { prompt, count }
}

export async function generateBdHeadlines(
  input: GenerateBdHeadlinesInput
): Promise<GenerateBdHeadlinesResult> {
  if (!openrouter) {
    throw new ConfigError(
      "OpenRouter não configurado — defina OPENROUTER_API_KEY"
    )
  }

  const { prompt, count } = buildBdHeadlinesPrompt(input)

  let raw: string
  try {
    const { text } = await generateText({
      model: openrouter.chat(input.model ?? DEFAULT_TEXT_MODEL),
      prompt,
      temperature: 0.8,
    })
    raw = text
  } catch (err) {
    console.error("[generate-bd-headlines] LLM call failed:", err)
    return {
      headlines: [],
      promptUsed: prompt,
      diagnostics: { llmFailed: true, expectedCount: count },
    }
  }

  const { headlines, diagnostics } = parseHeadlinesResponse(raw, count)
  const finalDiagnostics: GenerateBdHeadlinesDiagnostics = {
    ...diagnostics,
    expectedCount: count,
  }
  const hasDiagnostic =
    finalDiagnostics.parseFailed !== undefined ||
    (finalDiagnostics.discardedCount !== undefined && finalDiagnostics.discardedCount > 0) ||
    headlines.length < count

  return {
    headlines,
    promptUsed: prompt,
    ...(hasDiagnostic ? { diagnostics: finalDiagnostics } : {}),
  }
}

export function parseHeadlinesResponse(
  raw: string,
  expectedCount: number = DEFAULT_COUNT
): { headlines: BdHeadlineSuggestion[]; diagnostics: GenerateBdHeadlinesDiagnostics } {
  const diagnostics: GenerateBdHeadlinesDiagnostics = {}

  let data: { headlines?: Array<{ text?: unknown; patternId?: unknown }> }
  try {
    data = extractLooseJSON<{
      headlines?: Array<{ text?: unknown; patternId?: unknown }>
    }>(raw, "generate-bd-headlines")
  } catch (err) {
    console.warn(
      "[generate-bd-headlines] parse falhou:",
      err instanceof Error ? err.message : err
    )
    diagnostics.parseFailed = true
    return { headlines: [], diagnostics }
  }

  if (!Array.isArray(data?.headlines)) {
    diagnostics.parseFailed = true
    return { headlines: [], diagnostics }
  }

  const valid: BdHeadlineSuggestion[] = []
  let discarded = 0
  for (const item of data.headlines) {
    if (typeof item?.text !== "string" || item.text.trim().length === 0) {
      console.warn("[generate-bd-headlines] item descartado: text inválido")
      discarded++
      continue
    }
    let patternId: HeadlinePatternId | undefined
    if (typeof item.patternId === "string") {
      const pattern = getHeadlinePattern(item.patternId)
      if (pattern) patternId = pattern.id
    }
    valid.push({ text: item.text.trim(), patternId })
  }

  if (discarded > 0) {
    diagnostics.discardedCount = discarded
  }

  if (valid.length === 0) {
    console.warn("[generate-bd-headlines] zero headlines válidas no output")
  } else if (valid.length < expectedCount) {
    console.warn(
      `[generate-bd-headlines] esperado ${expectedCount}, válidas ${valid.length}`
    )
  }

  return { headlines: valid, diagnostics }
}
