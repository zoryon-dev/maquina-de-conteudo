import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { buildBrandContextBlock } from "./_shared/brand-block"
import { BD_TEMP_LEGENDA } from "./_shared/temperatures"

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
import {
  buildTribalAngleInjection,
  TRIBAL_ANGLE_IDS,
  type TribalAngleId,
} from "@/lib/ai/shared/tribal-angles"
import { ValidationError } from "@/lib/errors"

export type BrandsDecodedInput = {
  briefing: string
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
  // auto-select default = primeira IC (id=1); senão exige forcedHeadlineId.
  autoSelectHeadline?: boolean
  forcedHeadlineId?: number
  // Ângulo tribal opcional. Quando setado, modula o tom da geração
  // (concatenado ao briefing antes de cada step do pipeline). Permite
  // combinação cross-motor: BD usa estrutura jornalística + postura tribal.
  tribalAngle?: TribalAngleId
  /** Número de slides a gerar (6-10). Default: 9. */
  numberOfSlides?: number
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
    briefing: rawBriefing,
    brandPromptVariables,
    model,
    autoSelectHeadline = true,
    forcedHeadlineId,
    tribalAngle,
    numberOfSlides,
  } = input

  if (
    !brandPromptVariables ||
    Object.values(brandPromptVariables).every((v) => !v)
  ) {
    console.warn(
      "[bd/orchestrator] brandPromptVariables ausente — pipeline rodará sem contexto de marca"
    )
  }

  // Prefixa bloco do ângulo tribal ao briefing quando solicitado.
  // Cada step do pipeline (triagem, headlines, espinha, copy) recebe o
  // briefing aumentado e absorve a postura via system prompt natural.
  const briefing = composeBriefingWithTribalAngle(rawBriefing, tribalAngle)

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

  // Etapa 3.6 — blocos de copy (2 × numberOfSlides, default 18).
  const { blocks } = await generateCopyBlocks({
    espinha,
    brandPromptVariables,
    model,
    numberOfSlides,
  })

  // Etapa 6 — Legenda Instagram (~150 palavras).
  const legendaInstagram = await generateLegendaInstagram({
    espinha,
    blocks,
    brandPromptVariables,
    model,
  })

  // QA editorial dry-mode — mesmo padrão do Tribal v4 em llm.service.ts.
  // Roda anti-patterns + LLM judge, LOGA o resultado e não bloqueia.
  // Dynamic import pra evitar risco de circular dep.
  try {
    const fullText = [
      ...blocks.map((b) => b.text),
      legendaInstagram,
    ].join("\n\n")
    const { runEditorialQA } = await import("@/lib/ai/quality")
    const qa = await runEditorialQA(fullText, {
      model: process.env.QA_DRY_MODEL || "openai/gpt-4.1-mini",
    })
    console.log(
      "[qa-dry:brandsdecoded-v4]",
      JSON.stringify({
        passed: qa.passed,
        blockingHits: qa.blockingHits.length,
        warnHits: qa.warnHits.length,
        failedParams: qa.scores
          .filter((s) => s.score < 8)
          .map((s) => `${s.param}:${s.score}`),
      })
    )
  } catch (err) {
    console.error("[qa-dry:brandsdecoded-v4] falhou silently:", err)
  }

  return {
    triagem,
    headlines,
    selectedHeadline,
    espinha,
    blocks,
    legendaInstagram,
  }
}

/**
 * Helper puro: compõe o briefing final prefixando o bloco de ângulo tribal
 * quando `tribalAngle` é fornecido. Quando ausente, retorna o briefing
 * inalterado. Extraído para permitir testes unitários e reuso.
 */
export function composeBriefingWithTribalAngle(
  rawBriefing: string,
  tribalAngle?: TribalAngleId
): string {
  if (!tribalAngle) return rawBriefing
  if (!TRIBAL_ANGLE_IDS.includes(tribalAngle)) {
    throw new ValidationError(
      `tribalAngle inválido: "${tribalAngle}"`,
      { providedId: tribalAngle, validIds: [...TRIBAL_ANGLE_IDS] }
    )
  }
  const tribalBlock = buildTribalAngleInjection(tribalAngle)
  return `${tribalBlock}\n\n${rawBriefing}`
}

export function pickHeadline(
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
  const byId = headlines.find((h) => h.id === 1)
  if (byId) return byId
  console.warn(
    "[bd/orchestrator] id=1 não encontrado, usando headlines[0]",
    { ids: headlines.map((h) => h.id) }
  )
  const fallback = headlines[0]
  if (!fallback) {
    throw new Error(
      "[bd/orchestrator] Nenhuma headline válida gerada"
    )
  }
  return fallback
}

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
    // Default 0.7 (env BD_TEMP_LEGENDA): texto corrido editorial.
    temperature: BD_TEMP_LEGENDA,
  })

  const legenda = raw.trim()
  const wordCount = legenda.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) {
    console.warn("[bd/orchestrator] legenda muito curta", {
      wordCount,
      preview: legenda.slice(0, 100),
    })
  }
  if (legenda.length === 0) {
    throw new Error("[bd/orchestrator] legenda vazia após trim")
  }
  return legenda
}

function buildLegendaPrompt(
  espinha: EspinhaDorsal,
  blocks: CopyBlock[],
  brandVars?: Record<string, string | undefined>
): string {
  const blocksSummary = blocks
    .map((b) => `  texto ${b.index} (slide ${b.slide}) — ${b.text}`)
    .join("\n")

  const brandInjection = buildBrandContextBlock(brandVars, {
    stage: "legenda",
    heading: "## MARCA — variáveis do briefing",
    fallback: "## MARCA — contexto não fornecido",
  })
  console.log("[bd/legenda] brand-block", {
    stage: "legenda",
    varsKeys: Object.keys(brandVars ?? {}),
    blockChars: brandInjection.length,
  })
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

