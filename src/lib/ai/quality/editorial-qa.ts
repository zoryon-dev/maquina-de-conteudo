// LLM judge dos 7 parâmetros editoriais BrandsDecoded.
// Uso defensivo: chamado APÓS anti-patterns regex (catch barato).
// Reprovação se qualquer parâmetro < 8/10. Resultado guia o rewrite-loop.

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { findAntiPatterns, summarizeHits } from "./anti-patterns"

export type EditorialParam =
  | "gramatica"
  | "fluidez"
  | "ai_slop"
  | "fatos"
  | "estrutura"
  | "densidade"
  | "tom"

export type EditorialScore = {
  param: EditorialParam
  score: number // 0-10
  rationale: string
}

export type EditorialQAResult = {
  passed: boolean
  scores: EditorialScore[]
  blockingHits: ReturnType<typeof findAntiPatterns>
  warnHits: ReturnType<typeof findAntiPatterns>
  feedback: string // resumo legível para alimentar o rewrite
}

const PARAM_LABELS: Record<EditorialParam, string> = {
  gramatica: "Gramática (artigos presentes, concordância, frases completas)",
  fluidez: "Fluidez (conectivos naturais, parágrafo de reportagem)",
  ai_slop: "AI Slop (sem estruturas binárias, cacoetes, jargão, anglicismos)",
  fatos: "Fatos verificados (números/dados com fonte+ano)",
  estrutura: "Estrutura (anatomia preservada, promessa cumprida)",
  densidade: "Densidade (substância concreta, sem genericidades)",
  tom: "Tom Editorial (jornalístico, sem 2ª pessoa, sem metalinguagem)",
}

export const APPROVAL_THRESHOLD = 8

export type EditorialQAOptions = {
  model?: string
  passThreshold?: number
  // Permite skipar parâmetros não-aplicáveis ao motor (ex: tribal v4 não
  // segue 18-blocos do BD, então "estrutura" pode ser irrelevante).
  skipParams?: EditorialParam[]
}

export async function runEditorialQA(
  text: string,
  opts: EditorialQAOptions = {}
): Promise<EditorialQAResult> {
  const threshold = opts.passThreshold ?? APPROVAL_THRESHOLD
  const skip = new Set(opts.skipParams ?? [])

  const allHits = findAntiPatterns(text)
  const blockingHits = allHits.filter((h) => h.severity === "block")
  const warnHits = allHits.filter((h) => h.severity === "warn")

  // Curto-circuito: se já há blocker mecânico, nem chama LLM judge —
  // economiza tokens e dá feedback imediato pro rewrite.
  if (blockingHits.length > 0) {
    return {
      passed: false,
      scores: [],
      blockingHits,
      warnHits,
      feedback: buildFeedback({ scores: [], blockingHits, warnHits }, threshold),
    }
  }

  if (!openrouter) {
    return {
      passed: true,
      scores: [],
      blockingHits,
      warnHits,
      feedback: "QA pulado: OpenRouter não configurado.",
    }
  }

  const judgePrompt = buildJudgePrompt(text, skip)
  const model = opts.model ?? DEFAULT_TEXT_MODEL

  let raw: string
  try {
    const { text: response } = await generateText({
      model: openrouter.chat(model),
      prompt: judgePrompt,
      temperature: 0.1,
    })
    raw = response
  } catch (err) {
    console.error("[editorial-qa] judge call failed:", err)
    // Falhou o LLM call → não reprova; deixa anti-patterns serem a única
    // verificação. Melhor liberar conteúdo do que travar pipeline.
    return {
      passed: true,
      scores: [],
      blockingHits,
      warnHits,
      feedback: "QA semântico falhou tecnicamente — apenas anti-patterns regex aplicados.",
    }
  }

  const scores = parseJudgeResponse(raw, skip)
  const passed = scores.every((s) => s.score >= threshold)

  return {
    passed,
    scores,
    blockingHits,
    warnHits,
    feedback: buildFeedback({ scores, blockingHits, warnHits }, threshold),
  }
}

function buildJudgePrompt(text: string, skip: Set<EditorialParam>): string {
  const params = (Object.keys(PARAM_LABELS) as EditorialParam[]).filter(
    (p) => !skip.has(p)
  )
  const paramList = params
    .map((p, i) => `${i + 1}. **${p}** — ${PARAM_LABELS[p]}`)
    .join("\n")

  const example = params
    .map((p) => `{"param":"${p}","score":<0-10>,"rationale":"<curto>"}`)
    .join(",\n  ")

  return `Você é um editor jornalístico brasileiro avaliando qualidade textual.
Padrão de comparação: repórter da Folha de S.Paulo. Rejeite tudo que soe robótico, corporativo, telegráfico ou que não passaria no teste editorial de uma redação séria.

# TEXTO PARA AVALIAR

${text}

# PARÂMETROS

${paramList}

Para CADA parâmetro acima, atribua nota inteira de 0 a 10 e justifique em UMA frase curta (até 20 palavras).

Notas-chave:
- 10 = perfeito, qualidade de coluna premiada
- 8-9 = aprovado, qualidade profissional
- 6-7 = abaixo do padrão, precisa rewrite
- ≤5 = inaceitável

# RESPOSTA

Responda APENAS com JSON válido, sem markdown:

{
  "scores": [
  ${example}
  ]
}`
}

function parseJudgeResponse(raw: string, skip: Set<EditorialParam>): EditorialScore[] {
  // LLMs às vezes embrulham em \`\`\`json
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Tentativa de extrair primeiro objeto JSON do texto
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return []
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return []
    }
  }

  const data = parsed as { scores?: Array<{ param?: string; score?: unknown; rationale?: unknown }> }
  if (!data?.scores || !Array.isArray(data.scores)) return []

  const validParams = new Set<EditorialParam>(
    (Object.keys(PARAM_LABELS) as EditorialParam[]).filter((p) => !skip.has(p))
  )

  return data.scores
    .filter((s): s is { param: string; score: number; rationale: string } => {
      return (
        typeof s.param === "string" &&
        validParams.has(s.param as EditorialParam) &&
        typeof s.score === "number" &&
        typeof s.rationale === "string"
      )
    })
    .map((s) => ({
      param: s.param as EditorialParam,
      score: Math.max(0, Math.min(10, Math.round(s.score))),
      rationale: s.rationale,
    }))
}

function buildFeedback(
  result: {
    scores: EditorialScore[]
    blockingHits: ReturnType<typeof findAntiPatterns>
    warnHits: ReturnType<typeof findAntiPatterns>
  },
  threshold: number
): string {
  const lines: string[] = []
  if (result.blockingHits.length > 0) {
    lines.push("ANTI-PATTERNS BLOQUEANTES:")
    lines.push(summarizeHits(result.blockingHits))
    lines.push("")
  }
  const failed = result.scores.filter((s) => s.score < threshold)
  if (failed.length > 0) {
    lines.push(`PARÂMETROS REPROVADOS (< ${threshold}):`)
    for (const s of failed) {
      lines.push(`  - ${s.param} (${s.score}/10): ${s.rationale}`)
    }
    lines.push("")
  }
  if (result.warnHits.length > 0) {
    lines.push("WARNS (não bloqueiam, mas evite):")
    lines.push(summarizeHits(result.warnHits))
  }
  if (lines.length === 0) return "Aprovado em todos os parâmetros."
  return lines.join("\n")
}
