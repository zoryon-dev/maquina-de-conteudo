/**
 * Wizard Services
 *
 * Centralized exports for all Wizard background job services.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE STRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - types.ts: Shared type definitions
 * - prompts.ts: Isolated prompts for each content type
 * - llm.service.ts: AI generation (narratives + content)
 * - rag.service.ts: RAG context wrapper
 * - firecrawl.service.ts: Web scraping (optional)
 * - tavily.service.ts: Contextual search (optional)
 * - apify.service.ts: YouTube transcription (optional)
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  NarrativeAngle,
  ContentType,
  ProcessingStep,
} from "./types";

export type {
  NarrativeOption,
  GeneratedSlide,
  GeneratedContent,
  ExtractedContent,
  VideoTranscription,
  SearchResult,
  ProcessingProgress,
  RagConfig,
  RagResult,
  ServiceResult,
  WizardInputData,
  WizardNarrativesInput,
  WizardGenerationInput,
} from "./types";

// ============================================================================
// PROMPTS
// ============================================================================

export {
  getNarrativesSystemPrompt,
  getCarouselPrompt,
  getTextPrompt,
  getImagePrompt,
  getVideoPrompt,
  getContentPrompt,
  getAngleDescription,
  getContentTypeName,
  extractJSONFromResponse,
} from "./prompts";

// ============================================================================
// LLM SERVICE
// ============================================================================

export {
  generateNarratives,
  generateContent,
  isLlmServiceAvailable,
  getAvailableWizardModels,
} from "./llm.service";

// ============================================================================
// RAG SERVICE
// ============================================================================

export {
  generateWizardRagContext,
  generateWizardRagContextFromSelection,
  isWizardRagAvailable,
  getWizardRagStats,
  formatRagForPrompt,
  formatRagSourcesForMetadata,
} from "./rag.service";

// ============================================================================
// FIRECRAWL SERVICE (Optional)
// ============================================================================

export {
  extractFromUrl,
  extractFromMultipleUrls,
  isFirecrawlConfigured,
  isUrlAccessible,
  getUrlPreview,
} from "./firecrawl.service";

// ============================================================================
// TAVILY SERVICE (Optional)
// ============================================================================

export {
  contextualSearch,
  searchTrends,
  searchCompetitorInfo,
  getResearchSummary,
  isTavilyConfigured,
  formatSearchForPrompt,
} from "./tavily.service";

// ============================================================================
// APIFY SERVICE (Optional)
// ============================================================================

export {
  transcribeYouTube,
  transcribeMultipleVideos,
  extractYouTubeVideoId,
  isYouTubeUrl,
  isApifyConfigured,
  getYouTubeThumbnail,
} from "./apify.service";

// Import configuration checkers for internal use
import { isFirecrawlConfigured as checkFirecrawl } from "./firecrawl.service";
import { isTavilyConfigured as checkTavily } from "./tavily.service";
import { isApifyConfigured as checkApify } from "./apify.service";

// ============================================================================
// SERVICE STATUS
// ============================================================================

/**
 * Get configuration status of all optional services.
 *
 * Returns a summary of which services are available and configured.
 */
export async function getWizardServicesStatus(): Promise<{
  llm: boolean;
  rag: boolean;
  firecrawl: boolean;
  tavily: boolean;
  apify: boolean;
  any: boolean;
}> {
  // Dynamic imports to avoid loading all dependencies
  const [isLlmAvailable, isFirecrawl, isTavily, isApify] = await Promise.all([
    import("./llm.service").then((m) => m.isLlmServiceAvailable()),
    Promise.resolve(checkFirecrawl()),
    Promise.resolve(checkTavily()),
    Promise.resolve(checkApify()),
  ]);

  return {
    llm: isLlmAvailable,
    rag: true, // RAG is always available (degrades gracefully)
    firecrawl: isFirecrawl,
    tavily: isTavily,
    apify: isApify,
    any: isLlmAvailable || isFirecrawl || isTavily || isApify,
  };
}

// ============================================================================
// RE-EXPORT CONSTANTS
// ============================================================================

/**
 * Default model for Wizard content generation.
 */
export const WIZARD_DEFAULT_MODEL = process.env.WIZARD_DEFAULT_MODEL ||
  process.env.DEFAULT_TEXT_MODEL ||
  "openai/gpt-4.1";

/**
 * Maximum retries for service calls.
 */
export const WIZARD_MAX_RETRIES = 2;

/**
 * Default timeout for service operations (ms).
 */
export const WIZARD_DEFAULT_TIMEOUT = 60000;
