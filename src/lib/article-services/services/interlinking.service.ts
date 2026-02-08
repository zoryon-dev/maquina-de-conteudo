/**
 * Article Wizard — Interlinking Service
 *
 * Analyzes article content against site URL map to suggest/insert internal links.
 * Uses prompt IL-01 for contextual link analysis.
 */

import type {
  ServiceResult,
  InterlinkingSuggestion,
  ReverseLinkSuggestion,
  SiteUrlMapEntry,
} from "../types"
import {
  getArticleSystemPrompt,
  getInterlinkingPrompt,
  extractArticleJSON,
} from "../prompts"
import { articleLlmCall, ARTICLE_DEFAULT_MODEL } from "./llm"

export interface InterlinkingResult {
  mode: "auto" | "manual"
  totalSuggestions: number
  articleWithLinks: string | null
  suggestions: InterlinkingSuggestion[]
  reverseSuggestions: ReverseLinkSuggestion[]
  linkingStats: {
    totalLinksInserted: number
    avgRelevanceScore: number
    sectionsCovered: string[]
    sectionsWithoutLinks: string[]
  }
}

export async function analyzeInterlinking(
  articleContent: string,
  articleKeyword: string,
  siteUrlMap: SiteUrlMapEntry[],
  mode: "auto" | "manual",
  maxLinks?: number,
  model?: string,
): Promise<ServiceResult<InterlinkingResult>> {
  try {
    if (!siteUrlMap.length) {
      return {
        success: true,
        data: {
          mode,
          totalSuggestions: 0,
          articleWithLinks: mode === "auto" ? articleContent : null,
          suggestions: [],
          reverseSuggestions: [],
          linkingStats: {
            totalLinksInserted: 0,
            avgRelevanceScore: 0,
            sectionsCovered: [],
            sectionsWithoutLinks: [],
          },
        },
      }
    }

    const systemPrompt = getArticleSystemPrompt()
    const userMessage = getInterlinkingPrompt({
      articleContent,
      articleKeyword,
      siteUrlMap: JSON.stringify(
        siteUrlMap.map((e) => ({
          url: e.url,
          title: e.title,
          word_count: e.wordCount,
          category: e.category,
        })),
      ),
      mode,
      maxLinks,
    })

    const response = await articleLlmCall({
      model: model || ARTICLE_DEFAULT_MODEL,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    })

    const parsed = extractArticleJSON<{
      mode: string
      total_suggestions: number
      article_with_links: string | null
      suggestions: Array<{
        target_url: string
        target_title: string
        anchor_text: string
        context_sentence: string
        relevance_score: number
        naturalness_score: number
        reader_value_score: number
        link_health_score: number
        combined_score: number
        insertion_point: string
        rationale: string
      }>
      reverse_suggestions: Array<{
        source_url: string
        source_title: string
        suggested_anchor: string
        suggested_context: string
        relevance_score: number
        rationale: string
      }>
      linking_stats: {
        total_internal_links_inserted: number
        avg_relevance_score: number
        sections_covered: string[]
        sections_without_links: string[]
      }
    }>(response)

    if (!parsed) {
      return { success: false, error: "Failed to parse interlinking response" }
    }

    return {
      success: true,
      data: {
        mode: parsed.mode as "auto" | "manual",
        totalSuggestions: parsed.total_suggestions,
        articleWithLinks: parsed.article_with_links,
        suggestions: (parsed.suggestions || []).map((s) => ({
          targetUrl: s.target_url,
          anchorText: s.anchor_text,
          relevanceScore: s.combined_score,
          insertionPoint: s.insertion_point,
          rationale: s.rationale,
          targetTitle: s.target_title,
          contextSentence: s.context_sentence,
          naturalnessScore: s.naturalness_score,
          readerValueScore: s.reader_value_score,
        })),
        reverseSuggestions: (parsed.reverse_suggestions || []).map((r) => ({
          sourceUrl: r.source_url,
          anchorText: r.suggested_anchor,
          insertionContext: r.suggested_context,
          sourceTitle: r.source_title,
          relevanceScore: r.relevance_score,
          rationale: r.rationale,
        })),
        linkingStats: {
          totalLinksInserted: parsed.linking_stats?.total_internal_links_inserted ?? 0,
          avgRelevanceScore: parsed.linking_stats?.avg_relevance_score ?? 0,
          sectionsCovered: parsed.linking_stats?.sections_covered ?? [],
          sectionsWithoutLinks: parsed.linking_stats?.sections_without_links ?? [],
        },
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[Interlinking] Error:", msg)
    return { success: false, error: msg }
  }
}
