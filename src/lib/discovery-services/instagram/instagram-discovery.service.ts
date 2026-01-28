/**
 * Instagram Discovery Service
 *
 * Uses Apify's instagram-search-scraper (FREE) to find trending hashtags.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Single-stage process using only the free search-scraper actor
 * - Actor: apify/instagram-search-scraper
 * - Filters out results with postsCount: 0 (no meaningful engagement data)
 * - Ranks by combined score (postsPerDay + postsCount), takes top 20
 * - Calculates trending score from postsPerDay, postsCount, and difficulty
 *
 * Environment Variables:
 * - APIFY_API_TOKEN (preferred): Your Apify API token
 * - APIFY_API_KEY (alternative): Also accepted as fallback
 */

import { InstagramSearchScraperService } from './search-scraper.service';
import type { TrendingTopic } from '../types';
import type { SearchScraperResult } from './search-scraper.service';

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for discovering trending topics on Instagram.
 *
 * @example
 * ```ts
 * const service = new InstagramDiscoveryService();
 * const topics = await service.discoverByKeyword('AI marketing');
 * // topics.length → quantidade de tópicos encontrados
 * ```
 */
export class InstagramDiscoveryService {
  private searchScraper: InstagramSearchScraperService;

  constructor() {
    this.searchScraper = new InstagramSearchScraperService();
  }

  /**
   * Discover trending topics by keyword.
   *
   * Process:
   * 1. Search for related hashtags (up to 50)
   * 2. Filter out results with postsCount: 0 (no meaningful data)
   * 3. Rank by combined score (postsPerDay + postsCount), take top 20
   * 4. Map to TrendingTopic format, return top 10
   *
   * @param keyword - Search keyword
   * @returns Array of trending topics
   */
  async discoverByKeyword(keyword: string): Promise<TrendingTopic[]> {
    // Search related hashtags
    const searchResult = await this.searchScraper.searchHashtags(keyword, {
      resultsLimit: 50,
    });

    if (!searchResult.success || !searchResult.data) {
      return [];
    }

    // Filter out results without meaningful data (no posts or no postsPerDay)
    // Hashtags with postsCount: 0 are typically placeholders without actual engagement
    const meaningfulResults = searchResult.data.filter(
      (item) => item.postsCount && item.postsCount > 0
    );

    if (meaningfulResults.length === 0) {
      return [];
    }

    // Rank by combined score (postsPerDay + postsCount) and take top 20
    // Then we'll take top 10 after mapping
    const rankedResults = meaningfulResults
      .map((item) => ({
        ...item,
        score:
          (typeof item.postsPerDay === 'number' ? item.postsPerDay : 0) * 10 +
          (item.postsCount || 0) * 0.001,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    if (rankedResults.length === 0) {
      return [];
    }

    // Map to TrendingTopic format
    const topics = rankedResults
      .map(this.mapSearchResultToTrendingTopic.bind(this))
      .filter((topic): topic is TrendingTopic => topic !== null)
      .sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore)
      .slice(0, 10);

    return topics;
  }

  /**
   * Map search-scraper result to TrendingTopic format.
   */
  private mapSearchResultToTrendingTopic(
    searchResult: SearchScraperResult
  ): TrendingTopic | null {
    const hashtag = searchResult.name.replace('#', '');
    const score = this.calculateTrendingScore(searchResult);

    // Collect related hashtags from all categories
    const relatedHashtags = [
      ...(searchResult.relatedAverageHashtags || []).slice(0, 2),
      ...(searchResult.relatedFrequentHashtags || []).slice(0, 2),
      ...(searchResult.relatedRareHashtags || []).slice(0, 1),
    ]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 4)
      .map((h) => h.name.replace('#', ''));

    return {
      id: `ig-${hashtag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `Trending: #${hashtag}`,
      theme: hashtag,
      context: `Hashtag trending no Instagram com ${searchResult.postsCount?.toLocaleString() || '0'} posts e ${typeof searchResult.postsPerDay === 'number' ? searchResult.postsPerDay.toLocaleString() : 'N/A'} posts por dia.`,
      targetAudience: '', // Will be populated by AI
      source: {
        type: 'instagram',
        url: searchResult.url,
        rawData: {
          hashtag,
          totalPosts: searchResult.postsCount || 0,
          postsPerDay: typeof searchResult.postsPerDay === 'number' ? searchResult.postsPerDay : 0,
          difficulty: searchResult.difficulty,
          relatedHashtags,
        },
      },
      metrics: {
        engagementScore: score,
        recency: new Date(),
      },
    };
  }

  /**
   * Calculate trending score from search-scraper data.
   *
   * Uses available metrics from the free actor:
   * - postsPerDay: 60% (primary indicator of activity)
   * - postsCount: 25% (overall popularity)
   * - difficulty: 15% (competition level - rare is better)
   */
  private calculateTrendingScore(searchResult: SearchScraperResult): number {
    const weights = {
      postsPerDay: 0.60,
      postsCount: 0.25,
      difficulty: 0.15,
    };

    // Normalize postsPerDay (log scale for better distribution)
    // Handle case where postsPerDay might be "—" (string) instead of number
    const ppd = typeof searchResult.postsPerDay === 'number' ? searchResult.postsPerDay : 0;
    const normalizedPPD = Math.min(Math.log10(ppd + 1) * 20, 100);

    // Normalize postsCount (log scale)
    const totalPosts = searchResult.postsCount || 0;
    const normalizedTotal = Math.min(Math.log10(totalPosts + 1) * 10, 100);

    // Normalize difficulty (rare = highest score)
    let difficultyScore = 50; // default for 'average'
    if (searchResult.difficulty === 'rare') {
      difficultyScore = 100;
    } else if (searchResult.difficulty === 'frequent') {
      difficultyScore = 25;
    }

    return (
      normalizedPPD * weights.postsPerDay +
      normalizedTotal * weights.postsCount +
      difficultyScore * weights.difficulty
    );
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if Instagram discovery is available.
 */
export function isInstagramDiscoveryAvailable(): boolean {
  return !!(process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY);
}
