/**
 * Article Wizard — Metadata Service
 *
 * Generates complete SEO+GEO metadata package for an article.
 * Uses prompt META-01-B for schema-adaptive metadata generation.
 */

import type { ServiceResult, SeoMetadataPackage, BrandVoiceProfile } from "../types"
import {
  getArticleSystemPromptV2,
  getMetadataGeneratorPromptV2,
  extractArticleJSON,
} from "../prompts"
import { articleLlmCall, ARTICLE_DEFAULT_MODEL } from "./llm"

export async function generateArticleMetadata(params: {
  articleContent: string
  primaryKeyword: string
  secondaryKeywords: string[]
  brandName: string
  authorName: string
  articleType?: string
  siteCategories?: string[]
  brandVoiceProfile?: BrandVoiceProfile
  eeatProfile?: string
  schemaHints?: string[]
  freshness?: { publishDate?: string; versionNote?: string }
  model?: string
}): Promise<ServiceResult<SeoMetadataPackage>> {
  try {
    const systemPrompt = getArticleSystemPromptV2()
    const userMessage = getMetadataGeneratorPromptV2({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandName: params.brandName,
      authorName: params.authorName,
      articleType: params.articleType || "guia",
      siteCategories: params.siteCategories,
      brandVoiceProfile: params.brandVoiceProfile
        ? JSON.stringify(params.brandVoiceProfile)
        : undefined,
      eeatProfile: params.eeatProfile,
      schemaHints: params.schemaHints,
      freshness: params.freshness,
    })

    const response = await articleLlmCall({
      model: params.model || ARTICLE_DEFAULT_MODEL,
      systemPrompt,
      userMessage,
      temperature: 0.4,
    })

    const parsed = extractArticleJSON<{
      meta_titles: Array<{
        text: string
        // V2: char_count, approach, keyword_position | V1: chars, ctr_score, style
        char_count?: number
        chars?: number
        approach?: string
        ctr_score?: number
        keyword_position?: string
        style?: string
      }>
      meta_descriptions: Array<{
        text: string
        // V2: char_count, has_cta, keyword_present | V1: chars, style
        char_count?: number
        chars?: number
        has_cta?: boolean
        keyword_present?: boolean
        style?: string
      }>
      // V2: object { suggested, keyword_present, word_count } | V1: string
      slug: string | { suggested: string; keyword_present?: boolean; word_count?: number }
      alt_texts: Array<{
        // V2: image_context, alt_text | V1: image_ref, alt
        image_context?: string
        image_ref?: string
        alt_text?: string
        alt?: string
      }>
      schema_markup: {
        article: Record<string, unknown>
        faq: Record<string, unknown> | null
        howto: Record<string, unknown> | null
        breadcrumb: Record<string, unknown>
        person?: Record<string, unknown>
        item_list?: Record<string, unknown>
        review?: Record<string, unknown>
      }
      open_graph?: {
        og_title: string
        og_description: string
        og_type: string
        og_image_suggestion?: string
      }
      reverse_anchor_suggestions: Array<{
        anchor_text: string
        // V2: context | V1: usage_context
        context?: string
        usage_context?: string
      }>
      suggested_category: string
      suggested_tags?: string[]
      geo_metadata_notes?: string[]
    }>(response)

    if (!parsed?.meta_titles) {
      return { success: false, error: "Failed to parse metadata response" }
    }

    // Extract slug: V2 returns object, V1 returns string
    const slug = typeof parsed.slug === "object" && parsed.slug !== null
      ? parsed.slug.suggested
      : parsed.slug

    return {
      success: true,
      data: {
        metaTitles: parsed.meta_titles.map((t) => ({
          text: t.text,
          charCount: t.char_count ?? t.chars ?? t.text.length,
          includesKeyword: t.text
            .toLowerCase()
            .includes(params.primaryKeyword.toLowerCase()),
          ctrScore: t.ctr_score,
          style: t.approach ?? t.style,
        })),
        metaDescriptions: parsed.meta_descriptions.map((d) => ({
          text: d.text,
          charCount: d.char_count ?? d.chars ?? d.text.length,
          includesKeyword: d.text
            .toLowerCase()
            .includes(params.primaryKeyword.toLowerCase()),
          includesCta: d.has_cta ?? true,
          style: d.style,
        })),
        slug,
        altTexts: (parsed.alt_texts || []).map((a) => ({
          imageDescription: a.image_context ?? a.image_ref ?? "",
          altText: a.alt_text ?? a.alt ?? "",
        })),
        schemaArticle: parsed.schema_markup?.article || {},
        schemaFaq: parsed.schema_markup?.faq || undefined,
        schemaHowto: parsed.schema_markup?.howto || undefined,
        schemaBreadcrumb: parsed.schema_markup?.breadcrumb || undefined,
        reverseAnchors: (parsed.reverse_anchor_suggestions || []).map((r) => ({
          sourceUrl: "",
          anchorText: r.anchor_text,
          context: r.context ?? r.usage_context ?? "",
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
