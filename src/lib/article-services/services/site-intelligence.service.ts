/**
 * Article Wizard — Site Intelligence Service
 *
 * Crawls a site, extracts brand voice, and analyzes keyword gaps.
 * Uses Firecrawl for crawling and Tavily for competitor research.
 */

import type { ServiceResult, BrandVoiceProfile, KeywordGap, SiteUrlMapEntry } from "../types"
import {
  getArticleSystemPrompt,
  getBrandVoiceExtractorPrompt,
  getKeywordGapAnalyzerPrompt,
  extractArticleJSON,
} from "../prompts"
import { articleLlmCall } from "./llm"
import {
  extractFromUrl,
  extractFromMultipleUrls,
  isFirecrawlConfigured,
} from "@/lib/wizard-services/firecrawl.service"
import { contextualSearch } from "@/lib/wizard-services/tavily.service"

// ============================================================================
// CRAWL SITE — URL MAPPER
// ============================================================================

/**
 * Crawl a site and build a URL map using Firecrawl's /map endpoint.
 * Falls back to single-page scrape if map isn't available.
 */
export async function crawlSite(
  siteUrl: string,
  options?: { crawlDepth?: number; maxPages?: number },
): Promise<ServiceResult<SiteUrlMapEntry[]>> {
  if (!isFirecrawlConfigured()) {
    return { success: false, error: "Firecrawl not configured" }
  }

  try {
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
    const maxPages = options?.maxPages ?? 50

    // Use Firecrawl /v1/map to get all URLs
    const mapResponse = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: siteUrl,
        limit: maxPages,
      }),
    })

    if (!mapResponse.ok) {
      console.error("[SI Crawl] Map API error:", mapResponse.status)
      return { success: false, error: `Firecrawl map failed: ${mapResponse.status}` }
    }

    const mapData = await mapResponse.json()
    const urls: string[] = mapData.links || mapData.urls || []

    if (!urls.length) {
      return { success: true, data: [] }
    }

    // Scrape each URL to get metadata (batch of 3 concurrent)
    const entries: SiteUrlMapEntry[] = []
    const batchSize = 3

    for (let i = 0; i < Math.min(urls.length, maxPages); i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const result = await extractFromUrl(url)
          if (!result.success || !result.data) return null

          const entry: SiteUrlMapEntry = {
            url,
            title: result.data.metadata?.title || "",
            wordCount: result.data.content.split(/\s+/).length,
            category: extractCategory(url),
          }
          return entry
        }),
      )

      entries.push(...batchResults.filter((e): e is SiteUrlMapEntry => e !== null))
    }

    return { success: true, data: entries }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[SI Crawl] Error:", msg)
    return { success: false, error: msg }
  }
}

/** Extract category from URL path */
function extractCategory(url: string): string {
  try {
    const path = new URL(url).pathname
    const segments = path.split("/").filter(Boolean)
    return segments[0] || "root"
  } catch {
    return "unknown"
  }
}

// ============================================================================
// BRAND VOICE EXTRACTION
// ============================================================================

/**
 * Analyze sample articles to extract a brand voice profile.
 */
export async function extractBrandVoice(params: {
  brandName: string
  sampleUrls: string[]
  model: string
}): Promise<ServiceResult<BrandVoiceProfile>> {
  try {
    // Extract content from sample URLs
    const extractResult = await extractFromMultipleUrls(params.sampleUrls)
    if (!extractResult.success || !extractResult.data?.length) {
      return { success: false, error: "Failed to extract sample articles" }
    }

    const sampleArticles = extractResult.data.map((e) => ({
      url: e.sourceUrl,
      title: e.metadata?.title || "Untitled",
      content: e.content,
    }))

    const systemPrompt = getArticleSystemPrompt()
    const userMessage = getBrandVoiceExtractorPrompt({
      brandName: params.brandName,
      sampleArticles,
    })

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    })

    const parsed = extractArticleJSON<{
      voice_profile: Record<string, unknown>
      writing_guidelines: string[]
      sample_phrases: Record<string, string[]>
    }>(response)

    if (!parsed?.voice_profile) {
      return { success: false, error: "Failed to parse brand voice response" }
    }

    return {
      success: true,
      data: {
        tone: String(parsed.voice_profile.tone || ""),
        formalityLevel: String(parsed.voice_profile.formality_level || "semi-formal"),
        personality: String(parsed.voice_profile.personality || "didático"),
        person: String(parsed.voice_profile.person || "segunda_pessoa"),
        vocabularyPatterns: (parsed.voice_profile.vocabulary_patterns as string[]) || [],
        avoidedTerms: (parsed.voice_profile.avoided_terms as string[]) || [],
        writingGuidelines: parsed.writing_guidelines || [],
        samplePhrases: parsed.sample_phrases || {},
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[SI Brand Voice] Error:", msg)
    return { success: false, error: msg }
  }
}

// ============================================================================
// KEYWORD GAP ANALYSIS
// ============================================================================

/**
 * Analyze keyword gaps between client site and competitors.
 */
export async function analyzeKeywordGaps(params: {
  siteUrlMap: SiteUrlMapEntry[]
  competitorUrls: string[]
  targetNiche: string
  model: string
}): Promise<ServiceResult<KeywordGap[]>> {
  try {
    // Search competitor content via Tavily
    const competitorSearches = await Promise.all(
      params.competitorUrls.map((url) => {
        try {
          const hostname = new URL(url).hostname
          return contextualSearch(`site:${hostname} ${params.targetNiche}`, {
            maxResults: 10,
            searchDepth: "advanced",
          })
        } catch {
          return Promise.resolve({ success: false as const, error: "Invalid URL" })
        }
      }),
    )

    const competitorData = competitorSearches
      .filter((r) => r.success && r.data)
      .flatMap((r) => {
        const result = (r as { success: true; data: { sources: Array<{ title: string; url: string; snippet: string }> } }).data
        return (result.sources || []).map((s) => ({
          title: s.title || "",
          url: s.url || "",
          content: s.snippet?.slice(0, 500) || "",
        }))
      })

    if (!competitorData.length) {
      return { success: true, data: [] }
    }

    const systemPrompt = getArticleSystemPrompt()
    const userMessage = getKeywordGapAnalyzerPrompt({
      siteUrlMap: JSON.stringify(
        params.siteUrlMap.map((e) => ({
          url: e.url,
          title: e.title,
          wordCount: e.wordCount,
          category: e.category,
        })),
      ),
      competitorData: JSON.stringify(competitorData),
      targetNiche: params.targetNiche,
    })

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    })

    const parsed = extractArticleJSON<{
      critical_gaps: Array<{
        keyword: string
        search_volume_estimate: string
        competition_level: string
        suggested_article_type: string
        suggested_angle: string
        priority_score: number
      }>
      opportunistic_gaps: Array<{
        keyword: string
        search_volume_estimate: string
        suggested_article_type: string
        priority_score: number
      }>
    }>(response)

    if (!parsed) {
      return { success: false, error: "Failed to parse keyword gap response" }
    }

    const gaps: KeywordGap[] = [
      ...(parsed.critical_gaps || []).map((g) => ({
        keyword: g.keyword,
        searchVolumeEstimate: g.search_volume_estimate as "alto" | "médio" | "baixo",
        competitionLevel: g.competition_level as "alto" | "médio" | "baixo",
        suggestedArticleType: g.suggested_article_type,
        suggestedAngle: g.suggested_angle,
        priorityScore: g.priority_score,
        isCritical: true,
      })),
      ...(parsed.opportunistic_gaps || []).map((g) => ({
        keyword: g.keyword,
        searchVolumeEstimate: g.search_volume_estimate as "alto" | "médio" | "baixo",
        competitionLevel: "baixo" as const,
        suggestedArticleType: g.suggested_article_type,
        suggestedAngle: "",
        priorityScore: g.priority_score,
        isCritical: false,
      })),
    ]

    return { success: true, data: gaps }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[SI Keyword Gaps] Error:", msg)
    return { success: false, error: msg }
  }
}

// ============================================================================
// CACHE LOGIC
// ============================================================================

/**
 * Check if site intelligence data is fresh (less than 7 days old).
 */
export function isSiteIntelligenceFresh(crawledAt: Date | null): boolean {
  if (!crawledAt) return false
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return crawledAt > sevenDaysAgo
}
