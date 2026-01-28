/**
 * Instagram Search Scraper Service
 *
 * Uses Apify's instagram-search-scraper actor to find related hashtags.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Actor: apify/instagram-search-scraper
 * - Searches for hashtags related to a keyword
 * - Returns up to 50 hashtags sorted by postsPerDay
 * - Graceful degradation when APIFY_API_TOKEN or APIFY_API_KEY not configured
 *
 * Environment Variables:
 * - APIFY_API_TOKEN (preferred): Your Apify API token
 * - APIFY_API_KEY (alternative): Also accepted as fallback
 */

import { ApifyClient } from 'apify-client';
import type { ServiceResult } from '@/lib/wizard-services/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchScraperInput {
  search: string;
  searchType: 'hashtag';
  resultsLimit: number;
}

export interface SearchScraperResult {
  id: string;
  name: string;
  url: string;
  searchResultsCount?: number;
  postsCount?: number;
  postsPerDay?: number;
  difficulty?: 'average' | 'frequent' | 'rare';
  relatedAverageHashtags?: RelatedHashtag[];
  relatedFrequentHashtags?: RelatedHashtag[];
  relatedRareHashtags?: RelatedHashtag[];
}

export interface RelatedHashtag {
  name: string;
  volume: number;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for searching Instagram hashtags via Apify.
 *
 * @example
 * ```ts
 * const service = new InstagramSearchScraperService();
 * const result = await service.searchHashtags('AI marketing', { resultsLimit: 50 });
 * if (result.success) {
 *   // result.data.length → quantidade de hashtags encontradas
 * }
 * ```
 */
export class InstagramSearchScraperService {
  private client: ApifyClient | null = null;

  constructor() {
    // Support both APIFY_API_TOKEN (SDK default) and APIFY_API_KEY (common alternative)
    const token = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
    if (token) {
      this.client = new ApifyClient({ token });
    }
  }

  /**
   * Search for hashtags related to a keyword.
   *
   * @param searchTerm - Keyword to search for
   * @param options - Optional parameters
   * @returns Service result with hashtag array
   */
  async searchHashtags(
    searchTerm: string,
    options: { resultsLimit?: number } = {}
  ): Promise<ServiceResult<SearchScraperResult[]>> {
    // Graceful degradation when not configured
    if (!this.client) {
      return { success: true, data: [] };
    }

    try {
      const actor = this.client.actor('apify/instagram-search-scraper');

      const run = await actor.call({
        search: searchTerm,
        searchType: 'hashtag',
        resultsLimit: options.resultsLimit ?? 50,
        addParentData: false,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      return {
        success: true,
        data: items as unknown as SearchScraperResult[],
      };
    } catch (error) {
      console.error('[InstagramSearchScraper] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if Instagram search scraper is available.
 */
export function isInstagramSearchScraperAvailable(): boolean {
  return !!(process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY);
}
