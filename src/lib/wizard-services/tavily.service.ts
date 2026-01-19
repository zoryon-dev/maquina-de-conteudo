/**
 * Tavily Service for Wizard
 *
 * Contextual search integration using Tavily API.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Tavily Search API for contextual research
 * - Graceful degradation: returns null if not configured
 * - Provides AI-generated answers with source citations
 * - Handles errors without blocking the wizard job
 */

import type { SearchResult, ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Tavily API key from environment.
 */
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

/**
 * Tavily API endpoint.
 */
const TAVILY_API_URL = "https://api.tavily.com/search";

/**
 * Check if Tavily is configured.
 */
export function isTavilyConfigured(): boolean {
  return !!TAVILY_API_KEY;
}

// ============================================================================
// CONTEXTUAL SEARCH
// ============================================================================

/**
 * Perform contextual search using Tavily.
 *
 * @param query - Search query
 * @param options - Search options
 * @returns Service result with search data or null
 *
 * @example
 * ```ts
 * const result = await contextualSearch("social media trends 2025")
 *
 * if (result.success && result.data) {
 *   console.log(result.data.answer) // AI-generated answer
 *   console.log(result.data.sources) // Source citations
 * }
 * ```
 */
export async function contextualSearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
    includeSources?: boolean;
  } = {}
): Promise<ServiceResult<SearchResult | null>> {
  // ==============================================================================
  // WIZARD DEBUG: TAVILY SEARCH
  // ==============================================================================
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] TAVILY CONTEXTUAL SEARCH`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] Query: ${query}`);
  console.log(`[WIZARD-DEBUG] Options: ${JSON.stringify(options)}`);
  console.log(`[WIZARD-DEBUG] API Configured: ${!!TAVILY_API_KEY}`);
  console.log(`${"=".repeat(80)}\n`);

  // Check if Tavily is configured
  if (!TAVILY_API_KEY) {
    console.log(`[WIZARD-DEBUG] TAVILY: API key não configurada, retornando null`);
    return {
      success: true,
      data: null, // Not an error - just not available
    };
  }

  // Validate query
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error: "Search query cannot be empty",
    };
  }

  const {
    maxResults = 10,
    searchDepth = "basic",
    includeAnswer = true,
    includeSources = true,
  } = options;

  try {
    // Call Tavily API
    console.log(`[WIZARD-DEBUG] TAVILY: Enviando requisição para API...`);
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query.trim(),
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: includeAnswer,
        include_sources: includeSources,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.error("Tavily API error:", response.status, response.statusText);
      console.log(`[WIZARD-DEBUG] TAVILY: Erro na resposta - Status ${response.status}`);
      return {
        success: true,
        data: null,
      };
    }

    const data = await response.json();

    // ==============================================================================
    // WIZARD DEBUG: TAVILY RESPONSE
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] TAVILY RESPOSTA RECEBIDA`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] Answer (${data.answer?.length || 0} chars):`);
    console.log(data.answer || "(no answer)");
    console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
    console.log(`[WIZARD-DEBUG] Sources (${data.results?.length || 0} encontradas):`);
    (data.results || []).forEach((item: any, i: number) => {
      console.log(`[WIZARD-DEBUG]   [${i + 1}] ${item.title}`);
      console.log(`[WIZARD-DEBUG]       URL: ${item.url}`);
      console.log(`[WIZARD-DEBUG]       Snippet: ${item.content?.substring(0, 150)}${item.content?.length > 150 ? "..." : ""}`);
    });
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Parse response
    const searchResult: SearchResult = {
      query,
      answer: data.answer || "",
      sources: (data.results || []).map((item: any) => ({
        title: item.title || "",
        url: item.url || "",
        snippet: item.content || "",
      })),
    };

    return {
      success: true,
      data: searchResult,
    };
  } catch (error) {
    console.error("Error performing Tavily search:", error);

    // Don't fail the job - return null with success
    return {
      success: true,
      data: null,
    };
  }
}

/**
 * Search for trending topics in a specific domain.
 *
 * @param domain - Topic or industry domain
 * @param timeRange - Time range for trends (e.g., "week", "month")
 * @returns Service result with trending search data
 */
export async function searchTrends(
  domain: string,
  timeRange: "week" | "month" | "year" = "month"
): Promise<ServiceResult<SearchResult | null>> {
  const query = `${domain} trends ${timeRange} 2025`;

  return contextualSearch(query, {
    maxResults: 5,
    searchDepth: "advanced",
  });
}

/**
 * Search for competitor information.
 *
 * @param competitorName - Name of the competitor
 * @returns Service result with competitor research data
 */
export async function searchCompetitorInfo(
  competitorName: string
): Promise<ServiceResult<SearchResult | null>> {
  const query = `${competitorName} company overview products services strategy`;

  return contextualSearch(query, {
    maxResults: 5,
    searchDepth: "advanced",
  });
}

/**
 * Get research summary for a topic.
 *
 * This function performs multiple searches and combines the results
 * into a comprehensive research summary.
 *
 * @param topic - Main topic to research
 * @param aspects - Specific aspects to research
 * @returns Combined research summary
 */
export async function getResearchSummary(
  topic: string,
  aspects: string[] = []
): Promise<ServiceResult<string | null>> {
  // Build search queries for each aspect
  const queries = [
    `${topic} overview`,
    ...aspects.map((aspect) => `${topic} ${aspect}`),
  ];

  // Execute all searches in parallel
  const results = await Promise.all(
    queries.map((query) => contextualSearch(query, { maxResults: 3 }))
  );

  // Combine results
  const summaryParts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (result.success && result.data) {
      summaryParts.push(`## ${queries[i]}`);
      summaryParts.push(result.data.answer || "No answer generated");

      if (result.data.sources.length > 0) {
        summaryParts.push("\nSources:");
        result.data.sources.forEach((source) => {
          summaryParts.push(`- ${source.title}: ${source.url}`);
        });
      }

      summaryParts.push("\n");
    }
  }

  if (summaryParts.length === 0) {
    return {
      success: true,
      data: null,
    };
  }

  return {
    success: true,
    data: summaryParts.join("\n"),
  };
}

/**
 * Format search result for inclusion in prompt.
 *
 * @param searchResult - Result from contextualSearch
 * @returns Formatted string for prompt inclusion
 */
export function formatSearchForPrompt(searchResult: SearchResult | null): string {
  if (!searchResult) {
    return "";
  }

  const parts: string[] = [];

  parts.push("═══════════════════════════════════════════════════════════════");
  parts.push("PESQUISA DE CONTEXTO");
  parts.push("═══════════════════════════════════════════════════════════════");
  parts.push("");

  if (searchResult.answer) {
    parts.push("Resumo da Pesquisa:");
    parts.push(searchResult.answer);
    parts.push("");
  }

  if (searchResult.sources.length > 0) {
    parts.push("Fontes:");
    searchResult.sources.slice(0, 5).forEach((source) => {
      parts.push(`- ${source.title}`);
      parts.push(`  ${source.url}`);
    });
    parts.push("");
  }

  parts.push("═══════════════════════════════════════════════════════════════");

  return parts.join("\n");
}
