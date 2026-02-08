/**
 * Derive-to-Wizard Service
 *
 * Extracts wizard fields from a completed article using AI (Gemini 3 Flash).
 * Used when the user clicks "Carrossel", "Post Social", or "Script de Vídeo"
 * on a completed article to pre-fill the content creation wizard.
 *
 * Pattern: generateObject() + Zod (same as briefing.service.ts)
 */

import { generateObject } from "ai"
import { z } from "zod"
import { openrouter } from "@/lib/ai/config"
import type { Article, PostType } from "@/db/schema"
import type { ServiceResult } from "@/lib/article-services/types"

// ============================================================================
// TYPES
// ============================================================================

export type DerivationType = "social_post" | "video_script" | "carousel"

export interface WizardExtractionResult {
  contentType: PostType
  theme: string
  context: string
  objective: string
  cta: string
  targetAudience: string
  negativeTerms: string[]
  numberOfSlides?: number
  videoDuration?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DERIVE_MODEL = "google/gemini-3-flash-preview"

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const baseExtractionSchema = z.object({
  theme: z
    .string()
    .describe("Tema principal extraído do artigo, conciso e direto"),
  context: z
    .string()
    .describe(
      "Resumo do artigo em 2-3 frases para dar contexto ao wizard de criação"
    ),
  objective: z
    .string()
    .describe("Objetivo do conteúdo derivado para redes sociais"),
  cta: z
    .string()
    .describe("Call to action baseado na conclusão do artigo"),
  targetAudience: z
    .string()
    .describe("Público-alvo refinado para o formato de conteúdo"),
  negativeTerms: z
    .array(z.string())
    .describe("Termos a evitar no conteúdo derivado"),
})

const carouselSchema = baseExtractionSchema.extend({
  numberOfSlides: z
    .number()
    .min(5)
    .max(15)
    .describe("Número ideal de slides para o carrossel baseado na densidade do conteúdo"),
})

const videoSchema = baseExtractionSchema.extend({
  videoDuration: z
    .enum(["2-5min", "5-10min", "+10min", "+30min"])
    .describe("Duração ideal do vídeo baseado na complexidade do artigo"),
})

// ============================================================================
// DERIVATION TYPE → POST TYPE MAPPING
// ============================================================================

function mapDerivationType(type: DerivationType): PostType {
  switch (type) {
    case "carousel":
      return "carousel"
    case "video_script":
      return "video"
    case "social_post":
      return "text"
  }
}

// ============================================================================
// CONTENT PREPARATION
// ============================================================================

/**
 * Build article summary for the AI prompt.
 * Truncates content to ~8k chars to stay within fast-response budgets.
 */
function buildArticleSummary(article: Article): string {
  const content =
    article.finalContent ||
    article.optimizedContent ||
    article.assembledContent ||
    ""

  const truncated =
    content.length > 8000 ? content.slice(0, 8000) + "\n\n[...]" : content

  const outlineHeaders = article.generatedOutlines
    ?.find((o) => o.id === article.selectedOutlineId)
    ?.sections.map((s) => `- ${s.heading}`)
    .join("\n") || ""

  return [
    `TÍTULO: ${article.finalTitle || article.title || "Sem título"}`,
    `KEYWORD: ${article.primaryKeyword || "N/A"}`,
    `TIPO: ${article.articleType || "N/A"}`,
    article.targetWordCount
      ? `PALAVRAS-ALVO: ${article.targetWordCount}`
      : "",
    outlineHeaders ? `\nESTRUTURA:\n${outlineHeaders}` : "",
    `\nCONTEÚDO:\n${truncated}`,
  ]
    .filter(Boolean)
    .join("\n")
}

// ============================================================================
// PROMPTS
// ============================================================================

function buildPrompt(
  articleSummary: string,
  derivationType: DerivationType
): string {
  const formatLabel = {
    social_post: "Post para Redes Sociais (texto)",
    video_script: "Script de Vídeo",
    carousel: "Carrossel Visual",
  }[derivationType]

  return `Você é um especialista em marketing de conteúdo. Analise o artigo abaixo e extraia campos para pré-preencher um wizard de criação de ${formatLabel}.

REGRAS:
- "theme" deve ser conciso (3-8 palavras) — é o tema central do conteúdo derivado
- "context" deve resumir o artigo em 2-3 frases para dar background ao criador
- "objective" deve ser específico para o formato (ex: para carrossel: "Gerar engajamento visual com dados do artigo")
- "cta" deve ser actionable e adequado para o formato
- "targetAudience" deve ser refinado para quem consome este formato
- "negativeTerms" são termos técnicos demais ou inapropriados para o formato social

${derivationType === "carousel" ? "- Sugira o número ideal de slides (5-15) baseado na densidade do conteúdo" : ""}
${derivationType === "video_script" ? '- Sugira a duração ideal do vídeo ("2-5min", "5-10min", "+10min", "+30min")' : ""}

${articleSummary}`
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export async function extractWizardFieldsFromArticle(params: {
  article: Article
  derivationType: DerivationType
}): Promise<ServiceResult<WizardExtractionResult>> {
  const { article, derivationType } = params
  const contentType = mapDerivationType(derivationType)

  // Check if AI is available
  if (!openrouter) {
    console.warn("[DeriveToWizard] OpenRouter not configured, using fallback")
    return buildFallback(article, contentType, derivationType)
  }

  const model = openrouter(DERIVE_MODEL)
  const articleSummary = buildArticleSummary(article)
  const prompt = buildPrompt(articleSummary, derivationType)

  // Pick the right schema
  const schema =
    derivationType === "carousel"
      ? carouselSchema
      : derivationType === "video_script"
        ? videoSchema
        : baseExtractionSchema

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.3,
    })

    const obj = result.object as z.infer<typeof carouselSchema> &
      z.infer<typeof videoSchema>

    return {
      success: true,
      data: {
        contentType,
        theme: obj.theme,
        context: obj.context,
        objective: obj.objective,
        cta: obj.cta,
        targetAudience: obj.targetAudience,
        negativeTerms: obj.negativeTerms,
        ...(derivationType === "carousel" && obj.numberOfSlides
          ? { numberOfSlides: obj.numberOfSlides }
          : {}),
        ...(derivationType === "video_script" && obj.videoDuration
          ? { videoDuration: obj.videoDuration }
          : {}),
      },
    }
  } catch (error) {
    console.error("[DeriveToWizard] AI extraction failed, using fallback:", error)
    return buildFallback(article, contentType, derivationType)
  }
}

// ============================================================================
// FALLBACK
// ============================================================================

function buildFallback(
  _article: Article,
  _contentType: PostType,
  _derivationType: DerivationType
): ServiceResult<WizardExtractionResult> {
  return {
    success: false,
    error: "Falha ao extrair campos do artigo com IA. Tente novamente.",
  }
}
