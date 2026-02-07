/**
 * Article Wizard — Metadata Service
 *
 * Generates complete SEO metadata package for an article.
 * Uses prompt META-01 for metadata generation.
 */

import type { ServiceResult, SeoMetadataPackage, BrandVoiceProfile } from "../types"
import {
  getArticleSystemPrompt,
  getMetadataGeneratorPrompt,
  extractArticleJSON,
} from "../prompts"
import { articleLlmCall } from "./llm"

export async function generateArticleMetadata(params: {
  articleContent: string
  primaryKeyword: string
  secondaryKeywords: string[]
  brandName: string
  authorName: string
  siteCategories?: string[]
  brandVoiceProfile?: BrandVoiceProfile
  model?: string
}): Promise<ServiceResult<SeoMetadataPackage>> {
  try {
    const systemPrompt = getArticleSystemPrompt()
    const userMessage = getMetadataGeneratorPrompt({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandName: params.brandName,
      authorName: params.authorName,
      siteCategories: params.siteCategories,
      brandVoiceProfile: params.brandVoiceProfile
        ? JSON.stringify(params.brandVoiceProfile)
        : undefined,
    })

    const response = await articleLlmCall({
      model: params.model || "google/gemini-2.0-flash-001",
      systemPrompt,
      userMessage,
      temperature: 0.4,
    })

    const parsed = extractArticleJSON<{
      meta_titles: Array<{
        text: string
        chars: number
        ctr_score: number
        style: string
      }>
      meta_descriptions: Array<{
        text: string
        chars: number
        style: string
      }>
      slug: string
      alt_texts: Array<{
        image_ref: string
        alt: string
        chars: number
      }>
      schema_markup: {
        article: Record<string, unknown>
        faq: Record<string, unknown> | null
        howto: Record<string, unknown> | null
        breadcrumb: Record<string, unknown>
      }
      reverse_anchor_suggestions: Array<{
        anchor_text: string
        usage_context: string
        target_article_types: string[]
      }>
      suggested_category: string
    }>(response)

    if (!parsed?.meta_titles) {
      return { success: false, error: "Failed to parse metadata response" }
    }

    return {
      success: true,
      data: {
        metaTitles: parsed.meta_titles.map((t) => ({
          text: t.text,
          charCount: t.chars,
          includesKeyword: t.text
            .toLowerCase()
            .includes(params.primaryKeyword.toLowerCase()),
          ctrScore: t.ctr_score,
          style: t.style,
        })),
        metaDescriptions: parsed.meta_descriptions.map((d) => ({
          text: d.text,
          charCount: d.chars,
          includesKeyword: d.text
            .toLowerCase()
            .includes(params.primaryKeyword.toLowerCase()),
          includesCta: true,
          style: d.style,
        })),
        slug: parsed.slug,
        altTexts: (parsed.alt_texts || []).map((a) => ({
          imageDescription: a.image_ref,
          altText: a.alt,
        })),
        schemaArticle: parsed.schema_markup?.article || {},
        schemaFaq: parsed.schema_markup?.faq || undefined,
        schemaHowto: parsed.schema_markup?.howto || undefined,
        schemaBreadcrumb: parsed.schema_markup?.breadcrumb || undefined,
        reverseAnchors: (parsed.reverse_anchor_suggestions || []).map((r) => ({
          sourceUrl: "",
          anchorText: r.anchor_text,
          context: r.usage_context,
          targetArticleTypes: r.target_article_types,
        })),
        suggestedCategory: parsed.suggested_category,
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Metadata] Error:", msg)
    return { success: false, error: msg }
  }
}
