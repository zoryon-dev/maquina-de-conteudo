/**
 * YouTube Discovery Service
 *
 * Discovers trending topics from YouTube using the YouTube Data API v3.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses googleapis package for YouTube Data API v3
 * - Engagement scoring: views * 0.5 + likes * 2 + comments * 5
 * - Returns top 10 trending videos by keyword
 * - Graceful degradation when API key not configured
 */

import { google } from 'googleapis';
import type { TrendingTopic } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for YouTube thumbnail quality
 */
const DEFAULT_THUMBNAIL_QUALITY = 'maxres';

/**
 * Maximum number of results to fetch from YouTube API
 */
const MAX_RESULTS = 25;

/**
 * Days offset for filtering recent videos
 */
const DEFAULT_TIME_RANGE_DAYS = 7;

// ============================================================================
// YOUTUBE DISCOVERY SERVICE
// ============================================================================

/**
 * Service for discovering trending topics on YouTube.
 *
 * @example
 * ```ts
 * const service = new YouTubeDiscoveryService();
 * const topics = await service.discoverByKeyword('AI marketing 2025');
 * console.log(`Found ${topics.length} trending topics`);
 * ```
 */
export class YouTubeDiscoveryService {
  private youtube: any;

  constructor() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      this.youtube = google.youtube({
        version: 'v3',
        auth: apiKey,
      });
    }
  }

  /**
   * Get API key from environment.
   * Checks both YOUTUBE_DATA_API_KEY and GOOGLE_API_KEY.
   */
  private getApiKey(): string | undefined {
    return process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_API_KEY;
  }

  /**
   * Discover trending topics by keyword.
   *
   * Searches YouTube for videos matching the keyword and returns
   * the top results ranked by engagement score.
   *
   * @param keyword - Search keyword
   * @param timeRange - Time range filter (day/week/month)
   * @returns Array of trending topics
   */
  async discoverByKeyword(
    keyword: string,
    timeRange: 'day' | 'week' | 'month' = 'week'
  ): Promise<TrendingTopic[]> {
    // Graceful degradation when API not configured
    if (!this.youtube) {
      console.warn('[YouTubeDiscovery] API not configured, returning empty results');
      return [];
    }

    try {
      // Search for videos by keyword
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: keyword,
        type: ['video'],
        order: 'relevance',
        maxResults: MAX_RESULTS,
        publishedAfter: this.getDateOffset(timeRange),
      });

      const searchItems = searchResponse.data.items || [];
      if (searchItems.length === 0) {
        return [];
      }

      // Extract video IDs for statistics batch fetch
      const videoIds = searchItems
        .map((item: any) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length === 0) {
        return [];
      }

      // Fetch statistics for all videos in one request
      const statsResponse = await this.youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds.join(','),
      });

      const statsItems = statsResponse.data.items || [];
      const statsMap = new Map(
        statsItems.map((item: any) => [item.id, item])
      );

      // Convert to TrendingTopic format
      const topics: TrendingTopic[] = searchItems
        .map((item: any) => this.mapToTrendingTopic(item, statsMap.get(item.id.videoId)))
        .filter((topic: TrendingTopic | null): topic is TrendingTopic => topic !== null && topic.metrics.engagementScore > 0)
        .sort((a: TrendingTopic, b: TrendingTopic) => b.metrics.engagementScore - a.metrics.engagementScore)
        .slice(0, 10);

      return topics;
    } catch (error) {
      console.error('[YouTubeDiscovery] Error:', error);
      return [];
    }
  }

  /**
   * Map YouTube video data to TrendingTopic format.
   */
  private mapToTrendingTopic(snippet: any, stats: any): TrendingTopic | null {
    if (!snippet || !stats) {
      return null;
    }

    const viewCount = parseInt(stats.statistics?.viewCount || '0');
    const likeCount = parseInt(stats.statistics?.likeCount || '0');
    const commentCount = parseInt(stats.statistics?.commentCount || '0');

    // Engagement score: weighted to prioritize engagement over raw views
    const engagementScore = viewCount * 0.5 + likeCount * 2 + commentCount * 5;

    const videoId = snippet.id.videoId;
    const title = snippet.snippet.title;
    const description = snippet.snippet.description || '';
    const publishedAt = snippet.snippet.publishedAt;

    return {
      id: `yt-${videoId}`,
      title,
      theme: title,
      context: description.substring(0, 500),
      targetAudience: '',
      source: {
        type: 'youtube',
        url: `https://youtube.com/watch?v=${videoId}`,
        rawData: {
          videoId,
          viewCount,
          likeCount,
          commentCount,
          publishedAt,
        },
      },
      metrics: {
        engagementScore,
        recency: new Date(publishedAt),
      },
    };
  }

  /**
   * Get date offset string for YouTube API filter.
   */
  private getDateOffset(range: 'day' | 'week' | 'month'): string {
    const now = new Date();
    const offsets = { day: 1, week: 7, month: 30 };
    now.setDate(now.getDate() - offsets[range]);
    return now.toISOString();
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if YouTube service is available and configured.
 */
export function isYouTubeDiscoveryAvailable(): boolean {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_API_KEY;
  return !!apiKey;
}
