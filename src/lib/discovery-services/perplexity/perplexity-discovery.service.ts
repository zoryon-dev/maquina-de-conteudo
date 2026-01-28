/**
 * Perplexity Discovery Service
 *
 * Uses Perplexity API to search for trending topics with AI-powered results.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Perplexity's sonar model for web search
 * - Returns search results with citations, titles, URLs, and snippets
 * - Includes AI-generated summary in the response
 * - Environment Variable: PERPLEXITY_API_KEY
 */

import type { TrendingTopic } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface PerplexitySearchResult {
  title: string;
  url: string;
  date?: string;
  snippet: string;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  citations: string[];
  search_results: PerplexitySearchResult[];
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for discovering trending topics using Perplexity API.
 *
 * @example
 * ```ts
 * const service = new PerplexityDiscoveryService();
 * const topics = await service.discoverByKeyword('IA para negócios');
 * // topics.length → quantidade de tópicos encontrados
 * ```
 */
export class PerplexityDiscoveryService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
  }

  /**
   * Discover trending topics by keyword.
   *
   * Process:
   * 1. Search Perplexity for the keyword with trending/news context
   * 2. Extract search results with citations
   * 3. Extract AI-generated summary
   * 4. Map to TrendingTopic format
   *
   * @param keyword - Search keyword
   * @returns Array of trending topics
   */
  async discoverByKeyword(keyword: string): Promise<TrendingTopic[]> {
    // Graceful degradation when not configured
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: `Search for the latest trending topics, news, and discussions about: "${keyword}". Focus on recent developments, popular opinions, and what people are talking about right now. Return specific results with URLs.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PerplexityDiscovery] API error:', response.status, errorText);
        return [];
      }

      const data: PerplexityResponse = await response.json();

      const topics = this.mapSearchResultsToTopics(data, keyword);

      return topics;
    } catch (error) {
      console.error('[PerplexityDiscovery] Error:', error);
      return [];
    }
  }

  /**
   * Map Perplexity search results to TrendingTopic format.
   */
  private mapSearchResultsToTopics(data: PerplexityResponse, keyword: string): TrendingTopic[] {
    const topics: TrendingTopic[] = [];
    const searchResults = data.search_results || [];
    const aiSummary = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // First, create a topic with the AI-generated summary
    if (aiSummary && aiSummary.length > 100) {
      topics.push({
        id: `perp-summary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `Resumo IA: ${keyword}`,
        theme: keyword,
        context: aiSummary.substring(0, 1000), // Limit context size
        targetAudience: '',
        source: {
          type: 'perplexity',
          url: citations[0] || 'https://www.perplexity.ai',
          rawData: {
            summary: aiSummary.substring(0, 500),
            citationsCount: citations.length,
            allCitations: citations,
          },
        },
        metrics: {
          engagementScore: 100, // Summary gets highest score
          recency: new Date(),
        },
      });
    }

    // Then, create topics from each search result
    for (let i = 0; i < Math.min(searchResults.length, 10); i++) {
      const result = searchResults[i];
      const score = Math.max(10, 90 - i * 8); // Decreasing score: 90, 82, 74, ...

      topics.push({
        id: `perp-result-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        title: result.title,
        theme: keyword,
        context: result.snippet,
        targetAudience: '',
        source: {
          type: 'perplexity',
          url: result.url,
          rawData: {
            date: result.date,
            snippet: result.snippet,
            position: i + 1,
          },
        },
        metrics: {
          engagementScore: score,
          recency: result.date ? new Date(result.date) : new Date(),
        },
      });
    }

    return topics;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if Perplexity discovery is available.
 */
export function isPerplexityDiscoveryAvailable(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}
