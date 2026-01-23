/**
 * Discovery Services Barrel Export
 *
 * Centralized exports for all discovery services and types.
 */

// Types
export type {
  Platform,
  TimeRange,
  TrendingTopic,
  TrendingTopicWithBriefing,
  DiscoveryOptions,
  DiscoveryResult,
} from './types';

export type {
  YouTubeVideoData,
} from './types';

export type {
  InstagramHashtagSearch,
  InstagramHashtagStats,
  SemanticHashtag,
  LiteralHashtag,
  TopPost,
} from './types';

export type {
  BriefingResult,
} from './briefing.service';

// Main service
export {
  DiscoveryService,
  discoverTrendingTopics,
  getDiscoveryServiceStatus,
} from './discovery.service';

// Platform services
export { YouTubeDiscoveryService, isYouTubeDiscoveryAvailable } from './youtube/youtube-discovery.service';
export { InstagramDiscoveryService, isInstagramDiscoveryAvailable } from './instagram/instagram-discovery.service';
export { InstagramSearchScraperService, isInstagramSearchScraperAvailable } from './instagram/search-scraper.service';
export { PerplexityDiscoveryService, isPerplexityDiscoveryAvailable } from './perplexity/perplexity-discovery.service';

// Supporting services
export { SimilarityService, isSimilarityServiceAvailable } from './similarity.service';
export { BriefingService, isBriefingServiceAvailable } from './briefing.service';
