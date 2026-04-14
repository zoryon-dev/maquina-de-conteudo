import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { buildReferenciasPromptBlock } from "./referencias"
import { extractLooseJSON } from "./_shared/parse-json"
import { buildBrandContextBlock } from "./_shared/brand-block"
import { BD_TEMP_COPY } from "./_shared/temperatures"
import type { EspinhaDorsal } from "./espinha"

// BLOCK_SPEC é source of truth: slide/position/targetWords derivam deste índice
// e CopyBlock é derivado dele via CopyBlockSpec.
export const BLOCK_SPEC = [
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

export type CopyBlockSpec = (typeof BLOCK_SPEC)[number]
export type CopyBlock = CopyBlockSpec & { text: string }

export type CopyBlocksInput = {
  espinha: EspinhaDorsal
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
  /** Número de slides a gerar. Clampeado entre 6 e 10. Default: 9. */
  numberOfSlides?: number
}

export type CopyBlocksResult = {
  blocks: CopyBlock[]
  promptUsed: string
}

export async function generateCopyBlocks(
  input: CopyBlocksInput
): Promise<CopyBlocksResult> {
  const { espinha, brandPromptVariables, model, numberOfSlides } = input
  const n = Math.min(10, Math.max(6, numberOfSlides ?? 9))

  const prompt = buildCopyBlocksPrompt(espinha, brandPromptVariables, n)

  if (!openrouter) {
    throw new Error(
      "[brandsdecoded-v4/copy-blocks] OpenRouter não configurado (OPENROUTER_API_KEY ausente)."
    )
  }

  const chosenModel = model ?? DEFAULT_TEXT_MODEL

  const { text: raw } = await generateText({
    model: openrouter.chat(chosenModel),
    prompt,
    // Default 0.7 (env BD_TEMP_COPY): redação jornalística com voz consistente.
    temperature: BD_TEMP_COPY,
  })

  const blocks = parseCopyBlocksResponse(raw, n)
  return { blocks, promptUsed: prompt }
}

function buildCopyBlocksPrompt(
  espinha: EspinhaDorsal,
  brandVars?: Record<string, string | undefined>,
  n: number = 9
): string {
  // Derive a dynamic block spec from BLOCK_SPEC limited to n slides (2n blocks).
  const activeSpec = BLOCK_SPEC.filter((b) => b.slide <= n)
  const totalBlocks = n * 2

  const blockSpecTable = activeSpec.map(
    (b) =>
      `- texto ${b.index} · slide ${b.slide} · pos ${b.position.toUpperCase()} · ~${b.targetWords} palavras · ${b.sectionLabel}`
  ).join("\n")

  const brandInjection = buildBrandContextBlock(brandVars, {
    stage: "copy-blocks",
    heading: "## MARCA — variáveis do briefing",
    note: "Use estes dados apenas para ajustar vocabulário, referências e tom — nunca para forçar segunda pessoa nem metalinguagem comercial.",
    fallback: "## MARCA — contexto não fornecido",
  })
  console.log("[bd/copy-blocks] brand-block", {
    stage: "copy-blocks",
    varsKeys: Object.keys(brandVars ?? {}),
    blockChars: brandInjection.length,
  })
  const referencias = buildReferenciasPromptBlock(2)

  // Build the JSON format example string dynamically
  const jsonExample = `{"blocks":[${activeSpec.map(b => `{"index":${b.index},"text":"..."}`).join(",")}]}`

  return [
    `# TAREFA — Gerar os ${totalBlocks} blocos de copy do carrossel BrandsDecoded v4`,
    ``,
    `Você é um jornalista brasileiro escrevendo para a BrandsDecoded. Não é`,
    `uma IA traduzindo texto americano. O padrão de comparação é "um repórter`,
    `da Folha de S.Paulo escreveria assim?". A primeira aceita muito lixo — a`,
    `segunda rejeita quase tudo que soa robótico, corporativo ou telegráfico.`,
    ``,
    `## ANATOMIA OBRIGATÓRIA — ${totalBlocks} BLOCOS / ${n} SLIDES`,
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
    jsonExample,
    ``,
    `Os ${totalBlocks} blocos devem estar presentes, na ordem, com os índices corretos.`,
  ].join("\n")
}

export function parseCopyBlocksResponse(raw: string, n: number = 9): CopyBlock[] {
  const clampedN = Math.min(10, Math.max(6, n))
  const totalBlocks = clampedN * 2
  const activeSpec = BLOCK_SPEC.filter((b) => b.slide <= clampedN)

  const parsed = extractLooseJSON<unknown>(raw, "brandsdecoded-v4/copy-blocks")
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
    if (!b || typeof b !== "object") {
      console.warn(
        "[bd/copy-blocks] bloco descartado: não é objeto",
        { got: typeof b }
      )
      continue
    }
    const obj = b as Record<string, unknown>
    const idx = Number(obj.index)
    const text = typeof obj.text === "string" ? obj.text.trim() : ""
    if (!Number.isFinite(idx) || idx < 1 || idx > totalBlocks) {
      console.error(
        "[bd/copy-blocks] bloco descartado: index inválido (possível n=10 latente ou resposta LLM fora do range)",
        { got: obj.index, maxExpected: totalBlocks, n: clampedN }
      )
      continue
    }
    if (!text) {
      console.warn(
        "[bd/copy-blocks] bloco descartado: text vazio",
        { index: idx }
      )
      continue
    }
    byIndex.set(idx, text)
  }

  const blocks: CopyBlock[] = activeSpec.map((spec) => {
    const text = byIndex.get(spec.index)
    if (!text) {
      throw new Error(
        `[brandsdecoded-v4/copy-blocks] Bloco ${spec.index} ausente ou vazio na resposta do LLM.`
      )
    }
    return { ...spec, text }
  })

  return blocks
}

function extractBlocksArray(parsed: unknown): unknown[] | null {
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>

  if (Array.isArray(obj.blocks)) return obj.blocks
  // Fallback: alguns modelos respondem com array no topo.
  if (Array.isArray(parsed)) return parsed as unknown[]
  return null
}
