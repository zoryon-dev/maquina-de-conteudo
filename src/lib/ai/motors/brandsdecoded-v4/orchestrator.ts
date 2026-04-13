// Orquestrador do motor BrandsDecoded v4.
//
// Pipeline completo do Bloco 4 do system-prompt v4:
//   Etapa 1 — Triagem
//   Etapa 2 — Headlines (10 opções: 5 IC + 5 NM)
//   Escolha  — auto (primeira IC) ou manual (forcedHeadlineId)
//   Etapa 3 — Espinha dorsal
//   Etapa 3.6 — Copy dos 18 blocos
//   Etapa 6 — Legenda Instagram (~150 palavras)
//
// Os módulos de triagem, headlines e espinha são entregues pelo agent A
// (paralelo). Este arquivo apenas os encadeia.

import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"

import {
  generateHeadlinesForBD,
  type GeneratedHeadline,
} from "./headline-patterns"
import {
  buildEspinhaDorsal,
  runTriagem,
  type EspinhaDorsal,
  type TriagemResult,
} from "./espinha"

import { generateCopyBlocks, type CopyBlock } from "./copy-blocks"

export type BrandsDecodedInput = {
  /** Briefing bruto: tema + contexto + objetivo (texto livre). */
  briefing: string
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
  /**
   * Se true (default), escolhe automaticamente a primeira headline IC
   * (id=1). Se false e não houver `forcedHeadlineId`, a orquestração falha —
   * cabe ao caller escolher manualmente e re-chamar `buildEspinhaDorsal`
   * em um fluxo interativo.
   */
  autoSelectHeadline?: boolean
  /** Se setado, busca a headline com esse id na lista gerada. */
  forcedHeadlineId?: number
}

export type BrandsDecodedResult = {
  triagem: TriagemResult
  headlines: GeneratedHeadline[]
  selectedHeadline: GeneratedHeadline
  espinha: EspinhaDorsal
  blocks: CopyBlock[] // 18
  legendaInstagram: string
}

/**
 * Executa o pipeline completo do motor BD v4 e retorna o pacote agregado
 * (triagem, headlines, espinha, 18 blocos, legenda).
 */
export async function generateWithBrandsDecoded(
  input: BrandsDecodedInput
): Promise<BrandsDecodedResult> {
  const {
    briefing,
    brandPromptVariables,
    model,
    autoSelectHeadline = true,
    forcedHeadlineId,
  } = input

  // Etapa 1 — Triagem (extrai transformação, fricção, ângulo, evidências).
  const triagem = await runTriagem({
    briefing,
    brandPromptVariables,
    model,
  })

  // Etapa 2 — Headlines (10 opções: 5 IC + 5 NM).
  const headlineResult = await generateHeadlinesForBD({
    briefing,
    triagem,
    brandPromptVariables,
    model,
  })
  const headlines = headlineResult.headlines

  // Escolha da headline.
  const selectedHeadline = pickHeadline(headlines, {
    autoSelectHeadline,
    forcedHeadlineId,
  })

  // Etapa 3 — Espinha dorsal a partir da headline escolhida.
  const espinha = await buildEspinhaDorsal({
    triagem,
    selectedHeadline: selectedHeadline.text,
    brandPromptVariables,
    model,
  })

  // Etapa 3.6 — 18 blocos de copy.
  const { blocks } = await generateCopyBlocks({
    espinha,
    brandPromptVariables,
    model,
  })

  // Etapa 6 — Legenda Instagram (~150 palavras).
  const legendaInstagram = await generateLegendaInstagram({
    espinha,
    blocks,
    brandPromptVariables,
    model,
  })

  return {
    triagem,
    headlines,
    selectedHeadline,
    espinha,
    blocks,
    legendaInstagram,
  }
}

// ---------------------------------------------------------------------------
// Seleção de headline
// ---------------------------------------------------------------------------

function pickHeadline(
  headlines: GeneratedHeadline[],
  opts: { autoSelectHeadline: boolean; forcedHeadlineId?: number }
): GeneratedHeadline {
  if (!Array.isArray(headlines) || headlines.length === 0) {
    throw new Error(
      "[brandsdecoded-v4/orchestrator] Nenhuma headline foi gerada — abortando pipeline."
    )
  }

  if (typeof opts.forcedHeadlineId === "number") {
    const forced = headlines.find((h) => h.id === opts.forcedHeadlineId)
    if (!forced) {
      throw new Error(
        `[brandsdecoded-v4/orchestrator] forcedHeadlineId=${opts.forcedHeadlineId} não encontrado nas 10 headlines geradas.`
      )
    }
    return forced
  }

  if (!opts.autoSelectHeadline) {
    throw new Error(
      "[brandsdecoded-v4/orchestrator] autoSelectHeadline=false exige forcedHeadlineId. Nenhum dos dois foi fornecido."
    )
  }

  // Default: primeira IC (id=1). Se não houver id=1, usa a primeira da lista.
  return headlines.find((h) => h.id === 1) ?? headlines[0]
}

// ---------------------------------------------------------------------------
// Legenda Instagram
// ---------------------------------------------------------------------------

export async function generateLegendaInstagram(input: {
  espinha: EspinhaDorsal
  blocks: CopyBlock[]
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
}): Promise<string> {
  const { espinha, blocks, brandPromptVariables, model } = input

  if (!openrouter) {
    throw new Error(
      "[brandsdecoded-v4/orchestrator] OpenRouter não configurado (OPENROUTER_API_KEY ausente)."
    )
  }

  const chosenModel = model ?? DEFAULT_TEXT_MODEL
  const prompt = buildLegendaPrompt(espinha, blocks, brandPromptVariables)

  const { text: raw } = await generateText({
    model: openrouter.chat(chosenModel),
    prompt,
    temperature: 0.7,
  })

  return raw.trim()
}

function buildLegendaPrompt(
  espinha: EspinhaDorsal,
  blocks: CopyBlock[],
  brandVars?: Record<string, string | undefined>
): string {
  const blocksSummary = blocks
    .map((b) => `  texto ${b.index} (slide ${b.slide}) — ${b.text}`)
    .join("\n")

  const brandInjection = buildBrandInjection(brandVars)
  const ctaHint =
    brandVars?.cta ||
    brandVars?.CTA ||
    'Comenta uma palavra-chave relacionada ao tema para receber conteúdo extra'

  return [
    `# TAREFA — Escrever a legenda Instagram do carrossel BrandsDecoded v4`,
    ``,
    `Você é um jornalista brasileiro escrevendo a legenda que acompanha um`,
    `carrossel de 9 slides. A legenda complementa o deck — NÃO repete os`,
    `slides — e guia o leitor até o CTA final.`,
    ``,
    `## ESTRUTURA OBRIGATÓRIA (~150 palavras no total)`,
    ``,
    `1. **Gancho** — primeira frase, no máximo 125 caracteres, forte o suficiente`,
    `   pra parar o scroll no feed.`,
    `2. **Contexto** — 2 a 3 frases explicando o tema e a tensão central.`,
    `3. **Análise** — 2 a 3 frases com a interpretação profunda (o mecanismo,`,
    `   a implicação cultural, o dado que vira a chave).`,
    `4. **CTA** — frase final que conecta com o CTA definido pela marca.`,
    ``,
    `## ESPINHA DORSAL DO CARROSSEL`,
    ``,
    `**Headline:** ${espinha.headline}`,
    `**Hook:** ${espinha.hook}`,
    `**Mecanismo:** ${espinha.mecanismo}`,
    `**Prova:** ${espinha.prova}`,
    `**Aplicação:** ${espinha.aplicacao}`,
    `**Direção:** ${espinha.direcao}`,
    ``,
    `## COPY DOS 18 BLOCOS (para calibrar tom e dados)`,
    ``,
    blocksSummary,
    ``,
    brandInjection,
    ``,
    `**CTA a ancorar no final:** ${ctaHint}`,
    ``,
    `## REGRAS EDITORIAIS`,
    ``,
    `- Tom jornalístico, sem segunda pessoa no corpo da legenda (CTA pode ter).`,
    `- Zero metalinguagem ("neste carrossel", "este post mostra", "você vai ver").`,
    `- Zero estruturas binárias ("não é X, é Y").`,
    `- Zero cacoetes ("a lógica funciona assim", "a pergunta que fica").`,
    `- Dados devem estar presentes na espinha ou nos blocos — não invente.`,
    `- Aproximadamente 150 palavras no total (±20 palavras aceitável).`,
    `- Não inclua hashtags, emojis ou formatação markdown.`,
    ``,
    `## SAÍDA`,
    ``,
    `Responda APENAS com o texto corrido da legenda, sem títulos, sem markdown,`,
    `sem aspas no começo/fim. Parágrafos separados por linha em branco quando`,
    `fizer sentido.`,
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
  return ["## MARCA — variáveis do briefing", "", ...lines].join("\n")
}
