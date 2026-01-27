/**
 * Discovery Service
 *
 * Main orchestrator for discovering trending topics across multiple platforms.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Orchestrates parallel discovery across platforms
 * - Filters and ranks by engagement + similarity
 * - Enriches topics with AI-generated briefings
 * - Returns metadata on search performance
 */

import { YouTubeDiscoveryService } from './youtube/youtube-discovery.service';
import { InstagramDiscoveryService } from './instagram/instagram-discovery.service';
import { PerplexityDiscoveryService } from './perplexity/perplexity-discovery.service';
import { SimilarityService } from './similarity.service';
import { BriefingService } from './briefing.service';
import type { DiscoveryOptions, DiscoveryResult, Platform, TrendingTopic, TrendingTopicWithBriefing } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default values for discovery options.
 */
const DEFAULT_OPTIONS = {
  platforms: ['youtube', 'instagram', 'perplexity'] as Platform[],
  timeRange: 'week' as const,
  maxResults: 10,
  minSimilarity: 0.3,
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Main service for discovering trending topics.
 *
 * @example
 * ```ts
 * const service = new DiscoveryService();
 * const result = await service.discover({
 *   keyword: 'AI marketing',
 *   platforms: ['youtube', 'instagram'],
 *   maxResults: 10
 * });
 * console.log(`Found ${result.topics.length} topics in ${result.metadata.searchTime}ms`);
 * ```
 */
export class DiscoveryService {
  private youtube: YouTubeDiscoveryService;
  private instagram: InstagramDiscoveryService;
  private perplexity: PerplexityDiscoveryService;
  private similarity: SimilarityService;
  private briefing: BriefingService;

  constructor() {
    this.youtube = new YouTubeDiscoveryService();
    this.instagram = new InstagramDiscoveryService();
    this.perplexity = new PerplexityDiscoveryService();
    this.similarity = new SimilarityService();
    this.briefing = new BriefingService();
  }

  /**
   * Discover trending topics by keyword.
   *
   * Process:
   * 1. Parallel search across all selected platforms
   * 2. Aggregate results
   * 3. Filter by similarity to keyword
   * 4. Rank by engagement + similarity
   * 5. Enrich with AI briefings
   *
   * @param options - Discovery options
   * @returns Discovery result with topics and metadata
   */
  async discover(options: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check service availability
    const status = getDiscoveryServiceStatus();
    console.log('[Discovery] Service status:', status);
    console.log('[Discovery] Starting discovery with options:', opts);

    // Build array of platform searches with their names
    const platformSearches: Array<{ name: Platform; promise: Promise<TrendingTopic[]> }> = [];

    if (opts.platforms.includes('youtube')) {
      platformSearches.push({
        name: 'youtube',
        promise: this.youtube.discoverByKeyword(opts.keyword, opts.timeRange)
      });
    }
    if (opts.platforms.includes('instagram')) {
      platformSearches.push({
        name: 'instagram',
        promise: this.instagram.discoverByKeyword(opts.keyword)
      });
    }
    if (opts.platforms.includes('perplexity')) {
      platformSearches.push({
        name: 'perplexity',
        promise: this.perplexity.discoverByKeyword(opts.keyword)
      });
    }

    console.log('[Discovery] Searching platforms:', platformSearches.map(p => p.name));

    // Step 1: Parallel search across platforms
    const platformResults = await Promise.allSettled(
      platformSearches.map(p => p.promise)
    );

    // Step 2: Aggregate all results
    const allTopics: TrendingTopic[] = [];
    platformResults.forEach((result, index) => {
      const platform = platformSearches[index].name;
      if (result.status === 'fulfilled' && result.value) {
        console.log(
          `[Discovery] ${platform} returned ${result.value.length} topics`
        );
        allTopics.push(...result.value);
      } else if (result.status === 'rejected') {
        console.error(`[Discovery] ${platform} failed:`, result.reason);
      }
    });

    console.log('[Discovery] Total topics fetched:', allTopics.length);

    // Step 3: Filter by similarity
    const topicsWithSimilarity = await this.similarity.filterBySimilarity(
      allTopics,
      opts.keyword,
      opts.minSimilarity ?? DEFAULT_OPTIONS.minSimilarity
    );

    console.log('[Discovery] After similarity filter:', topicsWithSimilarity.length);

    // Step 4: Rank by composite score (60% engagement + 40% similarity)
    const ranked = this.rankTopics(topicsWithSimilarity);

    // Step 5: Limit results
    const topTopics = ranked.slice(0, opts.maxResults ?? DEFAULT_OPTIONS.maxResults);

    console.log('[Discovery] Top topics after ranking:', topTopics.length);

    // Step 6: Enrich with AI briefings
    const enriched = await this.briefing.enrichBatch(topTopics);

    console.log('[Discovery] After briefing enrichment:', {
      inputLength: topTopics.length,
      outputLength: enriched.length,
    });

    return {
      topics: enriched as TrendingTopicWithBriefing[],
      metadata: {
        totalFetched: allTopics.length,
        afterFiltering: topicsWithSimilarity.length,
        platformsSearched: opts.platforms,
        searchTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Rank topics by composite score (engagement + similarity).
   */
  private rankTopics(topics: TrendingTopic[]): TrendingTopic[] {
    return topics.sort((a, b) => {
      const scoreA = (a.metrics.engagementScore || 0) * 0.6 + (a.similarity || 0) * 100 * 0.4;
      const scoreB = (b.metrics.engagementScore || 0) * 0.6 + (b.similarity || 0) * 100 * 0.4;
      return scoreB - scoreA;
    });
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Convenience function to discover trending topics.
 *
 * @example
 * ```ts
 * const result = await discoverTrendingTopics({
 *   keyword: 'AI marketing',
 *   platforms: ['youtube', 'instagram'],
 *   maxResults: 10
 * });
 * ```
 */
export async function discoverTrendingTopics(
  options: DiscoveryOptions
): Promise<DiscoveryResult> {
  const service = new DiscoveryService();
  return service.discover(options);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check which discovery services are available.
 */
export function getDiscoveryServiceStatus(): {
  youtube: boolean;
  instagram: boolean;
  perplexity: boolean;
  similarity: boolean;
  briefing: boolean;
} {
  const hasGoogleApi = !!(
    process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_API_KEY
  );
  const hasApify = !!(
    process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY
  );
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  const hasVoyage = !!process.env.VOYAGE_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  return {
    youtube: hasGoogleApi,
    instagram: hasApify,
    perplexity: hasPerplexity,
    similarity: hasVoyage,
    briefing: hasOpenRouter,
  };
}
