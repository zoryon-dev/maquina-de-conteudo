// Gera N headlines usando os 8 padrões da biblioteca BrandsDecoded.
// Helper cross-motor: chamável por Tribal v4, BrandsDecoded v4 ou motores
// futuros que queiram oferecer "headlines extras no estilo BD" como
// alternativa ao output principal.

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import {
  buildHeadlinePatternsBlock,
  type HeadlinePatternId,
  type HeadlinePattern,
  getHeadlinePattern,
} from "./headline-library"

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

export type GenerateBdHeadlinesResult = {
  headlines: BdHeadlineSuggestion[]
  promptUsed: string
}

const DEFAULT_COUNT = 5

export async function generateBdHeadlines(
  input: GenerateBdHeadlinesInput
): Promise<GenerateBdHeadlinesResult> {
  if (!openrouter) {
    return { headlines: [], promptUsed: "" }
  }

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
    return { headlines: [], promptUsed: prompt }
  }

  const headlines = parseHeadlinesResponse(raw, count)
  return { headlines, promptUsed: prompt }
}

function parseHeadlinesResponse(raw: string, expectedCount: number): BdHeadlineSuggestion[] {
  const cleaned = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      console.warn("[generate-bd-headlines] sem JSON parseável no output")
      return []
    }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      console.warn("[generate-bd-headlines] JSON malformado no fallback")
      return []
    }
  }

  const data = parsed as { headlines?: Array<{ text?: unknown; patternId?: unknown }> }
  if (!Array.isArray(data?.headlines)) return []

  const valid: BdHeadlineSuggestion[] = []
  for (const item of data.headlines) {
    if (typeof item?.text !== "string" || item.text.trim().length === 0) {
      console.warn("[generate-bd-headlines] item descartado: text inválido")
      continue
    }
    let patternId: HeadlinePatternId | undefined
    if (typeof item.patternId === "string") {
      const pattern = getHeadlinePattern(item.patternId) as HeadlinePattern | undefined
      if (pattern) patternId = pattern.id as HeadlinePatternId
    }
    valid.push({ text: item.text.trim(), patternId })
  }

  if (valid.length === 0) {
    console.warn("[generate-bd-headlines] zero headlines válidas no output")
  } else if (valid.length < expectedCount) {
    console.warn(
      `[generate-bd-headlines] esperado ${expectedCount}, válidas ${valid.length}`
    )
  }

  return valid
}
