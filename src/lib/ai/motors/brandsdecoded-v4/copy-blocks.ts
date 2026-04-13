// Geração dos 18 blocos / 9 slides do carrossel BrandsDecoded v4.
//
// Anatomia obrigatória (Manual de Qualidade — Seção 2):
//   Slide 1 — Capa           (texto 1  ~7p  + texto 2  ~9p)
//   Slide 2 — Hook           (texto 3  ~28p + texto 4  ~25p)
//   Slide 3 — Mecanismo pt1  (texto 5  ~20p + texto 6  ~18p)
//   Slide 4 — Mecanismo pt2  (texto 7  ~24p + texto 8  ~34p)
//   Slide 5 — Prova          (texto 9  ~30p + texto 10 ~21p)
//   Slide 6 — Expansão       (texto 11 ~25p + texto 12 ~23p)
//   Slide 7 — Aplicação      (texto 13 ~24p + texto 14 ~18p)
//   Slide 8 — Direção/CTA    (texto 15 ~22p + texto 16 ~20p)
//   Slide 9 — Fechamento     (texto 17 ~28p + texto 18 ~27p)

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { buildReferenciasPromptBlock } from "./referencias"
import type { EspinhaDorsal } from "./espinha"

export type CopyBlock = {
  index: number // 1-18
  slide: number // 1-9
  position: "a" | "b" // primeiro ou segundo bloco do slide
  targetWords: number
  text: string
}

export type CopyBlocksInput = {
  espinha: EspinhaDorsal
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
}

export type CopyBlocksResult = {
  blocks: CopyBlock[] // 18 blocos
  promptUsed: string
}

/**
 * Tabela imutável com a especificação de cada um dos 18 blocos.
 * Usada para construir o prompt E para normalizar a saída do LLM
 * (slide/position/targetWords são derivados deste índice).
 */
export const BLOCK_SPEC: ReadonlyArray<{
  index: number
  slide: number
  position: "a" | "b"
  targetWords: number
  sectionLabel: string
}> = [
  { index: 1, slide: 1, position: "a", targetWords: 7, sectionLabel: "Capa — chapéu" },
  { index: 2, slide: 1, position: "b", targetWords: 9, sectionLabel: "Capa — headline" },
  { index: 3, slide: 2, position: "a", targetWords: 28, sectionLabel: "Hook — abertura" },
  { index: 4, slide: 2, position: "b", targetWords: 25, sectionLabel: "Hook — tensão" },
  { index: 5, slide: 3, position: "a", targetWords: 20, sectionLabel: "Mecanismo pt1 — enunciação" },
  { index: 6, slide: 3, position: "b", targetWords: 18, sectionLabel: "Mecanismo pt1 — desdobramento" },
  { index: 7, slide: 4, position: "a", targetWords: 24, sectionLabel: "Mecanismo pt2 — aprofundamento" },
  { index: 8, slide: 4, position: "b", targetWords: 34, sectionLabel: "Mecanismo pt2 — ilustração" },
  { index: 9, slide: 5, position: "a", targetWords: 30, sectionLabel: "Prova — enquadramento dos dados" },
  { index: 10, slide: 5, position: "b", targetWords: 21, sectionLabel: "Prova — síntese dos números" },
  { index: 11, slide: 6, position: "a", targetWords: 25, sectionLabel: "Expansão — virada de perspectiva" },
  { index: 12, slide: 6, position: "b", targetWords: 23, sectionLabel: "Expansão — consequência" },
  { index: 13, slide: 7, position: "a", targetWords: 24, sectionLabel: "Aplicação — exemplo concreto" },
  { index: 14, slide: 7, position: "b", targetWords: 18, sectionLabel: "Aplicação — generalização do exemplo" },
  { index: 15, slide: 8, position: "a", targetWords: 22, sectionLabel: "Direção — regra final" },
  { index: 16, slide: 8, position: "b", targetWords: 20, sectionLabel: "Direção — primeiro passo" },
  { index: 17, slide: 9, position: "a", targetWords: 28, sectionLabel: "Fechamento — pivot genuíno" },
  { index: 18, slide: 9, position: "b", targetWords: 27, sectionLabel: "Fechamento — implicação aberta" },
] as const

/**
 * Gera os 18 blocos de copy a partir da espinha dorsal aprovada.
 *
 * Pipeline: monta prompt com BLOCK_SPEC + espinha + few-shots + regras
 * editoriais, chama OpenRouter com temperature 0.7, parseia JSON tolerante
 * (extrai de markdown wrap se vier), normaliza e retorna 18 blocos.
 */
export async function generateCopyBlocks(
  input: CopyBlocksInput
): Promise<CopyBlocksResult> {
  const { espinha, brandPromptVariables, model } = input

  const prompt = buildCopyBlocksPrompt(espinha, brandPromptVariables)

  if (!openrouter) {
    throw new Error(
      "[brandsdecoded-v4/copy-blocks] OpenRouter não configurado (OPENROUTER_API_KEY ausente)."
    )
  }

  const chosenModel = model ?? DEFAULT_TEXT_MODEL

  const { text: raw } = await generateText({
    model: openrouter.chat(chosenModel),
    prompt,
    temperature: 0.7,
  })

  const blocks = parseCopyBlocksResponse(raw)
  return { blocks, promptUsed: prompt }
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

function buildCopyBlocksPrompt(
  espinha: EspinhaDorsal,
  brandVars?: Record<string, string | undefined>
): string {
  const blockSpecTable = BLOCK_SPEC.map(
    (b) =>
      `- texto ${b.index} · slide ${b.slide} · pos ${b.position.toUpperCase()} · ~${b.targetWords} palavras · ${b.sectionLabel}`
  ).join("\n")

  const brandInjection = buildBrandInjection(brandVars)
  const referencias = buildReferenciasPromptBlock(2)

  return [
    `# TAREFA — Gerar os 18 blocos de copy do carrossel BrandsDecoded v4`,
    ``,
    `Você é um jornalista brasileiro escrevendo para a BrandsDecoded. Não é`,
    `uma IA traduzindo texto americano. O padrão de comparação é "um repórter`,
    `da Folha de S.Paulo escreveria assim?". A primeira aceita muito lixo — a`,
    `segunda rejeita quase tudo que soa robótico, corporativo ou telegráfico.`,
    ``,
    `## ANATOMIA OBRIGATÓRIA — 18 BLOCOS / 9 SLIDES`,
    ``,
    blockSpecTable,
    ``,
    `Contagens de palavras são metas, não limites rígidos: ±5 palavras aceitável.`,
    `A sequência narrativa é: Capa → Hook → Mecanismo (2 slides) → Prova →`,
    `Expansão → Aplicação → Direção → Fechamento. Cada seção tem função clara`,
    `e precisa CUMPRIR a promessa do hook antes do slide de direção.`,
    ``,
    `## ESPINHA DORSAL APROVADA (use como base, NÃO copie frases literais)`,
    ``,
    `**Headline:** ${espinha.headline}`,
    `**Hook:** ${espinha.hook}`,
    `**Mecanismo:** ${espinha.mecanismo}`,
    `**Prova:** ${espinha.prova}`,
    `**Aplicação:** ${espinha.aplicacao}`,
    `**Direção:** ${espinha.direcao}`,
    ``,
    brandInjection,
    ``,
    referencias,
    ``,
    `## REGRAS EDITORIAIS — TOLERÂNCIA ZERO`,
    ``,
    `(Extraídas do Manual de Qualidade BrandsDecoded, Seção 3 — os 7 parâmetros)`,
    ``,
    `1. **Gramática** — todo substantivo tem artigo. NUNCA: "em período inferior`,
    `   a 1 ano" → SEMPRE: "em um período inferior a 1 ano". Nunca frase sem verbo.`,
    `2. **Fluidez** — cada bloco é parágrafo de reportagem, com sujeito, verbo,`,
    `   complemento e conectivos naturais (porque, só que, por isso, enquanto,`,
    `   quando, e, mas, aí, então, mesmo assim, ainda assim). Zero texto picotado.`,
    `3. **Zero estruturas binárias.** PROIBIDAS absolutamente: "não é X, é Y",`,
    `   "não é sobre X, é sobre Y", "menos X. mais Y.", "sem X. sem Y.",`,
    `   "deixa de ser X para ser Y", "X diminui, Y acelera".`,
    `4. **Zero cacoetes de IA.** PROIBIDAS: "a lógica funciona assim:",`,
    `   "o mecanismo funciona assim:", "a pergunta que fica:", "a questão é:",`,
    `   "o ponto é:", "e isso muda tudo", "no fim das contas", "ao final do dia",`,
    `   "usando as mesmas 24 horas que qualquer pessoa tem".`,
    `5. **Zero jargão corporativo e zero anglicismos numéricos em texto corrido.**`,
    `   Evitar "ativo comercial", "vantagem competitiva estrutural", "hit rate"`,
    `   em texto corrido, "10+ anos", "5x maior", "2-3 anos". Use equivalentes`,
    `   em português fluente.`,
    `6. **Zero construções genéricas.** Evitar "de forma clara", "de forma`,
    `   consistente", "de forma natural".`,
    `7. **Zero segunda pessoa no corpo** — nada de "você", "seu/sua" nos blocos`,
    `   3 a 18. (A headline de capa já foi definida na espinha; mantenha-a como está.)`,
    `8. **Zero metalinguagem** — nada de "o texto mostra", "este carrossel explica",`,
    `   "vou processar", "analisando".`,
    `9. **Dados com fonte e ano** — todo número, percentual, data ou valor precisa`,
    `   vir com referência mínima (fonte/ano ou base amostral). Se o dado não está`,
    `   na espinha, NÃO invente.`,
    `10. **Densidade** — cada bloco tem âncora concreta (nome, número, mecanismo`,
    `    específico). Se o bloco funcionaria com qualquer outro sujeito no lugar,`,
    `    está genérico — reescreva.`,
    `11. **Ritmo** — prefira duas frases curtas com ponto a uma frase longa com`,
    `    vírgula. Em dash (—) é permitido para adicionar contexto sem quebrar fluxo.`,
    `12. **Fechamento (blocos 17 e 18)** — fazem um pivot temático genuíno, NÃO`,
    `    resumem o carrossel. Proibido: "em algum escritório do Brasil, alguém`,
    `    está..." (cinematográfico), "a pergunta que fica é..." (retórica vazia),`,
    `    "no final, o que os dados mostram é que..." (resumo disfarçado).`,
    ``,
    `## DECOMPOSIÇÃO SUGERIDA (para caber nas metas de palavras)`,
    ``,
    `- textos 1-2: capa. 1 é o chapéu curto (~7 palavras) que antecipa o tema;`,
    `  2 é a headline propriamente dita (~9 palavras). Podem vir em MAIÚSCULAS.`,
    `- textos 3-4: hook. 3 abre o cenário; 4 fecha a tensão/contradição.`,
    `- textos 5-6: mecanismo pt1. 5 enuncia o motor; 6 desdobra a implicação.`,
    `- textos 7-8: mecanismo pt2. 7 aprofunda; 8 traz ilustração concreta com`,
    `  exemplo nomeado (o bloco mais longo do deck, ~34 palavras).`,
    `- textos 9-10: prova. 9 enquadra os dados; 10 sintetiza os números.`,
    `- textos 11-12: expansão. 11 vira a perspectiva; 12 desenha a consequência.`,
    `- textos 13-14: aplicação. 13 dá exemplo concreto; 14 generaliza.`,
    `- textos 15-16: direção. 15 nomeia a regra; 16 orienta o primeiro passo.`,
    `- textos 17-18: fechamento com pivot. 17 abre novo ângulo; 18 deixa`,
    `  implicação aberta (nunca resumo, nunca pergunta retórica vazia).`,
    ``,
    `## FORMATO DE SAÍDA — JSON ESTRITO`,
    ``,
    `Responda APENAS com um JSON válido no formato exato abaixo, sem texto`,
    `antes ou depois, sem markdown, sem comentários:`,
    ``,
    `{"blocks":[{"index":1,"text":"..."},{"index":2,"text":"..."},{"index":3,"text":"..."},{"index":4,"text":"..."},{"index":5,"text":"..."},{"index":6,"text":"..."},{"index":7,"text":"..."},{"index":8,"text":"..."},{"index":9,"text":"..."},{"index":10,"text":"..."},{"index":11,"text":"..."},{"index":12,"text":"..."},{"index":13,"text":"..."},{"index":14,"text":"..."},{"index":15,"text":"..."},{"index":16,"text":"..."},{"index":17,"text":"..."},{"index":18,"text":"..."}]}`,
    ``,
    `Os 18 blocos devem estar presentes, na ordem, com os índices corretos.`,
  ].join("\n")
}

function buildBrandInjection(
  brandVars?: Record<string, string | undefined>
): string {
  if (!brandVars) return "## MARCA — contexto não fornecido"

  const entries = Object.entries(brandVars).filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim().length > 0
  )
  if (entries.length === 0) return "## MARCA — contexto não fornecido"

  const lines = entries.map(([k, v]) => `- **${k}:** ${v}`)
  return [
    `## MARCA — variáveis do briefing`,
    ``,
    `Use estes dados apenas para ajustar vocabulário, referências e tom —`,
    `nunca para forçar segunda pessoa nem metalinguagem comercial.`,
    ``,
    ...lines,
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Parser tolerante
// ---------------------------------------------------------------------------

/**
 * Parser tolerante: aceita JSON puro, JSON embrulhado em markdown (```json ... ```)
 * ou com texto antes/depois. Normaliza cada bloco com slide/position/targetWords
 * derivados do BLOCK_SPEC.
 */
export function parseCopyBlocksResponse(raw: string): CopyBlock[] {
  const cleaned = extractJsonPayload(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(
      `[brandsdecoded-v4/copy-blocks] Falha ao parsear JSON do LLM: ${
        err instanceof Error ? err.message : String(err)
      }. Raw (primeiros 400 chars): ${raw.slice(0, 400)}`
    )
  }

  const rawBlocks = extractBlocksArray(parsed)
  if (!rawBlocks) {
    throw new Error(
      `[brandsdecoded-v4/copy-blocks] Resposta não contém array "blocks". Raw: ${raw.slice(
        0,
        400
      )}`
    )
  }

  const byIndex = new Map<number, string>()
  for (const b of rawBlocks) {
    if (!b || typeof b !== "object") continue
    const obj = b as Record<string, unknown>
    const idx = Number(obj.index)
    const text = typeof obj.text === "string" ? obj.text.trim() : ""
    if (!Number.isFinite(idx) || idx < 1 || idx > 18 || !text) continue
    byIndex.set(idx, text)
  }

  const blocks: CopyBlock[] = BLOCK_SPEC.map((spec) => {
    const text = byIndex.get(spec.index)
    if (!text) {
      throw new Error(
        `[brandsdecoded-v4/copy-blocks] Bloco ${spec.index} ausente ou vazio na resposta do LLM.`
      )
    }
    return {
      index: spec.index,
      slide: spec.slide,
      position: spec.position,
      targetWords: spec.targetWords,
      text,
    }
  })

  return blocks
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim()

  // Caso 1: markdown fence ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim()

  // Caso 2: texto antes/depois do JSON — pega do primeiro { ao último }.
  const first = trimmed.indexOf("{")
  const last = trimmed.lastIndexOf("}")
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1)

  return trimmed
}

function extractBlocksArray(parsed: unknown): unknown[] | null {
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>

  if (Array.isArray(obj.blocks)) return obj.blocks
  // Fallback: alguns modelos respondem com array no topo.
  if (Array.isArray(parsed)) return parsed as unknown[]
  return null
}
