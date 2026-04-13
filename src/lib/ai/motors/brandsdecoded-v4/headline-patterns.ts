/**
 * BrandsDecoded v4 — Etapa 2 do pipeline interno: Geração de Headlines.
 *
 * Gera exatamente 10 headlines em dois formatos rígidos:
 *   - Opções 1-5: Investigação Cultural (IC) — [Reenquadramento]: [Hook], ~20-24 palavras.
 *   - Opções 6-10: Narrativa Magnética (NM) — 3 frases concretas, até ~45 palavras.
 *
 * Referência: temporaria/brandformat/system-prompt-maquina-carrosseis-v4.md
 * Blocos BLOCO 4 → Etapa 2 e BLOCO 5 → Engine de Headlines.
 */

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { buildHeadlineLibraryPromptBlock } from "@/lib/ai/shared/headline-library"
import type { TriagemResult } from "./espinha"

/**
 * Headline gerada individual. `patternId` opcional permite trackear qual
 * padrão da biblioteca compartilhada inspirou a headline — útil pra
 * analytics e para a coluna 'Gatilho' da apresentação.
 */
export type GeneratedHeadline = {
  /** Número 1-10 na ordem de apresentação. 1-5 = IC, 6-10 = NM. */
  id: number
  /** Formato rígido: IC (Investigação Cultural) ou NM (Narrativa Magnética). */
  format: "IC" | "NM"
  /** Texto da headline. */
  text: string
  /** Link opcional para padrão da headline-library compartilhada. */
  patternId?: string
}

export type HeadlineGenerationInput = {
  /** Briefing original do usuário (tema + contexto + objetivo). */
  briefing: string
  /** Resultado da Etapa 1 — Triagem. */
  triagem: TriagemResult
  /** Variáveis de marca injetadas pelo orquestrador. */
  brandPromptVariables?: Record<string, string | undefined>
  /** Override de modelo. Default: DEFAULT_TEXT_MODEL. */
  model?: string
}

export type HeadlineGenerationResult = {
  /** Sempre 10 headlines: 5 IC + 5 NM. */
  headlines: GeneratedHeadline[]
  /** Prompt final enviado ao LLM — útil pra debug e observabilidade. */
  promptUsed: string
}

/**
 * Parser tolerante de JSON vindo do LLM. Duplicado intencionalmente (não
 * importamos de wizard-services/prompts.ts) para evitar dependência cruzada
 * entre o motor e serviços legados.
 */
function extractJSON<T = unknown>(text: string): T {
  if (!text || text.trim().length === 0) {
    throw new Error("LLM returned empty response.")
  }

  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim()

  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    const preview = cleaned.slice(0, 200)
    throw new Error(`No JSON object found in LLM response. Preview: ${preview}`)
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(jsonStr) as T
  } catch (err) {
    console.error("[brandsdecoded-v4/headlines] JSON parse failed:", jsonStr.slice(0, 500))
    throw err
  }
}

function renderBrandBlock(vars?: Record<string, string | undefined>): string {
  if (!vars) return ""
  const entries = Object.entries(vars).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0
  )
  if (entries.length === 0) return ""

  const lines = ["# CONTEXTO DE MARCA (injetar no tom, sem citar literalmente)"]
  for (const [k, v] of entries) {
    lines.push(`- ${k}: ${v}`)
  }
  return lines.join("\n") + "\n\n"
}

const SYSTEM_PROMPT = `Você é o gerador de headlines da Máquina de Carrosséis BrandsDecoded.

Sua missão: gerar exatamente 10 headlines a partir de um briefing + triagem. As 10 passam por dois formatos RÍGIDOS.

========================================
FORMATO 1 — INVESTIGAÇÃO CULTURAL (IC) — Opções 1 a 5
========================================
Estrutura OBRIGATÓRIA: [Reenquadramento provocativo]: [Hook de curiosidade]
- Separadas por dois-pontos.
- Frase 1 (antes dos dois-pontos): redefine o fenômeno com tensão.
- Frase 2 (depois dos dois-pontos): cria lacuna — como/por que/quem.
- Tamanho: ~20-24 palavras.

Exemplos CORRETOS (seguir esse padrão):
- "A Morte do Gosto Pessoal: Como a Dopamina Digital Nos Tornou Indiferentes"
- "A corrida virou a nova balada: por que a Geração Z trocou o bar pelo asfalto às 6h da manhã"
- "O dado que nenhum guru quer admitir: posts sobre o nicho performam 4× pior que posts sobre cultura"

Exemplos ERRADOS (rejeitar):
- "As academias reabriram. Ninguém parou de correr." → sem dois-pontos, sem hook
- "A corrida é o novo fenômeno do Brasil" → declaração direta, sem tensão
- "Por que todo mundo está correndo" → pergunta genérica, sem reenquadramento

========================================
FORMATO 2 — NARRATIVA MAGNÉTICA (NM) — Opções 6 a 10
========================================
Estrutura OBRIGATÓRIA: [Cenário concreto]. [Mecanismo]. [Tensão aberta].
- Exatamente 3 frases terminadas em ponto.
- Frase 1: descreve o que aconteceu com âncoras concretas (nome, local, número).
- Frase 2: explica o mecanismo — como funciona.
- Frase 3: abre tensão — deixa o leitor querendo o próximo slide.
- Tamanho: até ~45 palavras no total.

Exemplos CORRETOS:
- "Padre Reginaldo faz live de oração todo dia às 4h da manhã. Tem mais audiência simultânea que streamer profissional, final de campeonato, lançamento de série. Não viralizou, criou rotina — pessoas acordam pra isso."
- "A Hoka triplicou o faturamento no Brasil três anos seguidos. Nenhum influenciador de lifestyle recomendou. O boca a boca saiu dos clubes de corrida."

Exemplos ERRADOS:
- "A corrida está mudando o Brasil" → frase única, sem 3 partes
- "Correr virou tendência entre jovens brasileiros" → genérico, sem cenário concreto

========================================
REGRAS TRANSVERSAIS (aplicar às 10)
========================================
1. PT-BR. Tom jornalístico coloquial (Folha de S.Paulo). NUNCA tradução do inglês.
2. PELO MENOS 1 dos padrões de lift POSITIVO em cada headline:
   - Brasil/Contexto Nacional (+155%), Fim/Morte/Crise (+119%), Geracional (+119%), Novidade (+99%)
3. PELO MENOS 2 gatilhos emocionais ativos: Nostalgia, Medo/Alerta, Indignação, Identidade, Curiosidade, Aspiração.
4. REJEITAR clichês de IA e padrões mortos:
   - Nada de "descubra", "saiba", "conheça", "tudo que você precisa saber"
   - Nada de "não é X, é Y" ou "sem X. sem Y."
   - Nada de "a ascensão de", "o impacto de", "quando X vira Y", "virou" como verbo principal
   - Nada de listas ("5 dicas para…"), nada de revelação genérica, nada de motivacional vazio
5. Variar os padrões entre as 10 — não repetir "A Morte de..." em todas.
6. Densidade concreta: cada headline com âncora específica (nome, número, local, prática).
7. NUNCA inventar números, nomes ou fatos que não estejam na Triagem/Briefing.

========================================
FORMATO DE SAÍDA
========================================
JSON estrito, sem markdown wrap, sem texto antes/depois:
{
  "headlines": [
    { "id": 1, "format": "IC", "text": "...", "patternId": "morte_de_x" },
    { "id": 2, "format": "IC", "text": "...", "patternId": "dois_pontos_enquadramento" },
    { "id": 3, "format": "IC", "text": "...", "patternId": "investigando_x" },
    { "id": 4, "format": "IC", "text": "...", "patternId": "por_que_geracao_x" },
    { "id": 5, "format": "IC", "text": "...", "patternId": "contraste_antitese" },
    { "id": 6, "format": "NM", "text": "frase 1. frase 2. frase 3." },
    { "id": 7, "format": "NM", "text": "frase 1. frase 2. frase 3." },
    { "id": 8, "format": "NM", "text": "frase 1. frase 2. frase 3." },
    { "id": 9, "format": "NM", "text": "frase 1. frase 2. frase 3." },
    { "id": 10, "format": "NM", "text": "frase 1. frase 2. frase 3." }
  ]
}

O campo "patternId" é OPCIONAL e só deve aparecer se a headline claramente ancora num padrão da biblioteca (valores válidos: morte_de_x, por_que_geracao_x, investigando_x, nome_marca_revelacao, contraste_antitese, dois_pontos_enquadramento, por_que_x_tendencia, provocacao_existencial).`

/**
 * Gera 10 headlines (5 IC + 5 NM) para o motor BrandsDecoded v4.
 *
 * Temperature 0.8 — precisamos de variação criativa genuína entre as 10
 * opções, sem sair do formato rígido. Os formatos IC/NM são guardrails
 * estruturais, então a criatividade fica nos reenquadramentos, não no
 * shape da saída.
 *
 * Validação shape: rejeita se retornar menos de 10, se IDs 1-5 não forem IC
 * ou 6-10 não forem NM. Deixa re-tentativas para o orquestrador (outro
 * agente está cuidando disso).
 */
export async function generateHeadlinesForBD(
  input: HeadlineGenerationInput
): Promise<HeadlineGenerationResult> {
  if (!openrouter) {
    throw new Error(
      "[brandsdecoded-v4/headlines] OpenRouter não configurado (OPENROUTER_API_KEY ausente)."
    )
  }

  const model = input.model ?? DEFAULT_TEXT_MODEL
  const brandBlock = renderBrandBlock(input.brandPromptVariables)
  const libraryBlock = buildHeadlineLibraryPromptBlock()

  const evidenciasBlock =
    input.triagem.evidencias.length > 0
      ? input.triagem.evidencias.map((e, i) => `  ${String.fromCharCode(65 + i)}) ${e}`).join("\n")
      : "  (sem evidências específicas — priorizar ângulo e mecanismo)"

  const prompt = `${brandBlock}${libraryBlock}

========================================
BRIEFING ORIGINAL
========================================
${input.briefing.trim()}

========================================
TRIAGEM (Etapa 1)
========================================
Transformação: ${input.triagem.transformacao}
Fricção: ${input.triagem.friccao}
Ângulo: ${input.triagem.angulo}
Evidências:
${evidenciasBlock}

========================================
TAREFA
========================================
Gere 10 headlines seguindo os formatos IC (opções 1-5) e NM (opções 6-10) do system prompt.
Varie os padrões da biblioteca entre as 10. Use o ângulo da triagem como fio condutor.
Responda APENAS com o JSON no formato especificado.`

  const { text } = await generateText({
    model: openrouter.chat(model),
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.8,
  })

  const parsed = extractJSON<{ headlines?: unknown }>(text)

  if (!Array.isArray(parsed.headlines)) {
    throw new Error("[brandsdecoded-v4/headlines] Resposta sem array 'headlines'.")
  }

  const headlines: GeneratedHeadline[] = []
  for (const raw of parsed.headlines) {
    if (!raw || typeof raw !== "object") continue
    const obj = raw as Record<string, unknown>
    const id = typeof obj.id === "number" ? obj.id : Number.NaN
    const format = obj.format === "IC" || obj.format === "NM" ? obj.format : null
    const textValue = typeof obj.text === "string" ? obj.text.trim() : ""
    const patternId =
      typeof obj.patternId === "string" && obj.patternId.trim().length > 0
        ? obj.patternId.trim()
        : undefined

    if (!Number.isInteger(id) || id < 1 || id > 10 || !format || textValue.length === 0) {
      continue
    }

    headlines.push({ id, format, text: textValue, patternId })
  }

  // Normalização de ordem + validação de distribuição (1-5 IC, 6-10 NM).
  headlines.sort((a, b) => a.id - b.id)

  if (headlines.length !== 10) {
    throw new Error(
      `[brandsdecoded-v4/headlines] Esperado 10 headlines, recebido ${headlines.length}.`
    )
  }

  const formatErrors: string[] = []
  for (const h of headlines) {
    const expected = h.id <= 5 ? "IC" : "NM"
    if (h.format !== expected) {
      formatErrors.push(`#${h.id} deveria ser ${expected}, veio ${h.format}`)
    }
  }
  if (formatErrors.length > 0) {
    throw new Error(
      `[brandsdecoded-v4/headlines] Distribuição IC/NM inválida: ${formatErrors.join("; ")}`
    )
  }

  return { headlines, promptUsed: prompt }
}
