/**
 * Discovery Services Types
 *
 * Shared types for Trending Topics Discovery feature.
 * Supports YouTube, Instagram, Google, and future platforms.
 */

// ============================================================================
// PLATFORM TYPES
// ============================================================================

export type Platform = 'youtube' | 'instagram' | 'perplexity';

export type TimeRange = 'day' | 'week' | 'month';

// ============================================================================
// TRENDING TOPIC TYPES
// ============================================================================

/**
 * Core trending topic interface.
 * Represents a single trending topic discovered from social platforms.
 */
export interface TrendingTopic {
  id: string;
  title: string;
  theme: string;
  context: string;
  targetAudience: string;
  source: {
    type: Platform;
    url: string;
    rawData: any;
  };
  metrics: {
    engagementScore: number;
    recency: Date;
  };
  similarity?: number;
  // Populated after AI briefing
  briefing?: string;
  keyPoints?: string[];
  suggestedAngles?: string[];
}

/**
 * Trending topic with AI-generated briefing.
 */
export interface TrendingTopicWithBriefing extends TrendingTopic {
  briefing: string;
  keyPoints: string[];
  suggestedAngles: string[];
}

// ============================================================================
// DISCOVERY OPTIONS
// ============================================================================

/**
 * Options for discovering trending topics.
 */
export interface DiscoveryOptions {
  keyword: string;
  platforms: Platform[];
  timeRange?: TimeRange;
  maxResults?: number;
  minSimilarity?: number;
}

// ============================================================================
// DISCOVERY RESULT
// ============================================================================

/**
 * Result of a discovery operation with metadata.
 */
export interface DiscoveryResult {
  topics: TrendingTopicWithBriefing[];
  metadata: {
    totalFetched: number;
    afterFiltering: number;
    platformsSearched: Platform[];
    searchTime: number;
  };
}

// ============================================================================
// PLATFORM-SPECIFIC TYPES
// ============================================================================

/**
 * YouTube video data from API.
 */
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
}

/**
 * Instagram hashtag data from search scraper.
 */
export interface InstagramHashtagSearch {
  id: string;
  name: string;
  url: string;
  searchResultsCount?: number;
  postsCount?: number;
  postsPerDay?: number;
  difficulty?: 'average' | 'frequent' | 'rare';
}

/**
 * Instagram hashtag stats from stats scraper.
 */
export interface InstagramHashtagStats {
  hashtag: string;
  url: string;
  totalPosts: number;
  postsPerDay: number;
  postsPerWeek: number;
  growthRate?: number;
  trendScore?: number;
  relatedHashtags: {
    semantic: SemanticHashtag[];
    literal: LiteralHashtag[];
  };
  topPosts?: TopPost[];
  scrapedAt: string;
}

/**
 * Semantic hashtag from Instagram stats scraper.
 */
export interface SemanticHashtag {
  name: string;
  usageCount: number;
  relevanceScore: number;
  postsCount: number;
}

/**
 * Literal hashtag from Instagram stats scraper.
 */
export interface LiteralHashtag {
  name: string;
  usageCount: number;
  similarity: number;
  postsCount: number;
}

/**
 * Top post from Instagram stats scraper.
 */
export interface TopPost {
  id: string;
  url: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  engagement: number;
}

// ============================================================================
// SERVICE RESULT (re-export from wizard-services)
// ============================================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
