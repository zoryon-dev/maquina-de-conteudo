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
 * - research-planner.service.ts: Strategic query generation (7 queries in 3 layers)
 * - synthesizer.service.ts: Research synthesis
 * - image-generation.service.ts: AI image generation via OpenRouter
 * - screenshotone.service.ts: HTML template rendering via ScreenshotOne
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
  getResearchPlannerPrompt,
  getInstagramTribalSystemPrompt,
  getYouTubeTribalSystemPrompt,
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
// RESEARCH PLANNER SERVICE
// ============================================================================

export {
  generateResearchQueries,
  isResearchPlannerAvailable,
  getResearchPlannerModel,
} from "./research-planner.service";

export type {
  ResearchPlannerInput,
} from "./research-planner.service";

// ============================================================================
// SYNTHESIZER SERVICE
// ============================================================================

export {
  synthesizeResearch,
} from "./synthesizer.service";

export type {
  SynthesizedResearch,
  SynthesizerInput,
  ConcreteDataPoint,
  RealExample,
  ErrorRisk,
  FrameworkMetodo,
  Hook,
  ResearchPlannerOutput,
  ResearchQuery,
  QueryIntent,
  QueryLayer,
  // Note: ImageGenerationConfig, GeneratedImage, ImageGenerationInput are now in image-types.ts
  // Note: ContentDensityRules, ContentDensityValidation will be implemented in Phase 3
} from "./synthesis-types";

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
  formatYouTubeForPrompt,
} from "./apify.service";

// ============================================================================
// LIBRARY SYNC SERVICE
// ============================================================================

export {
  createLibraryItemFromWizard,
  resyncWizardToLibrary,
  generateTitle,
  mapGeneratedContentToLibraryItem,
} from "./library-sync";

export type {
  WizardMetadata,
  CreateLibraryItemFromWizardOptions,
  CreateLibraryItemResult,
} from "./library-sync";

// Import configuration checkers for internal use
import { isFirecrawlConfigured as checkFirecrawl } from "./firecrawl.service";
import { isTavilyConfigured as checkTavily } from "./tavily.service";
import { isApifyConfigured as checkApify } from "./apify.service";

// ============================================================================
// IMAGE GENERATION SERVICES
// ============================================================================

// AI Image Generation (OpenRouter)
export {
  generateAiImage,
  generateImagePrompt,
  isImageGenerationAvailable,
  getAvailableImageModels,
  getModelLabel,
  validateImageOptions,
  generateVideoThumbnailNanoBanana,
} from "./image-generation.service";

export type {
  AiImageModel,
  ImageGenerationMethod,
  ColorOption,
  VisualStyle,
  CompositionOption,
  MoodOption,
  AiImageOptions,
  ImageGenerationConfig,
  ImageGenerationInput,
  ImageGenerationResult,
  GeneratedImage,
  PromptGenerationInput,
  PromptGenerationResult,
  CoverPostsConfig,
  TemplateData,
  NanoBananaThumbnailInput,
  NanoBananaThumbnailOutput,
} from "./image-types";

// HTML Template Generation (ScreenshotOne)
export {
  generateHtmlTemplateImage,
  getScreenshotOneUrl,
  isScreenshotOneAvailable,
  getAvailableTemplates,
  getTemplateLabel,
  validateHtmlOptions,
} from "./screenshotone.service";

export type {
  HtmlTemplate,
  HtmlTemplateOptions,
  ScreenshotOneConfig,
  ScreenshotOneRenderOptions,
} from "./image-types";

// Constants
export { INSTAGRAM_DIMENSIONS } from "./image-types";

// ============================================================================
// VIDEO SPECIFIC SERVICES
// ============================================================================

export {
  generateVideoTitles,
} from "./video-titles.service";

export type {
  VideoTitleOption,
  GenerateVideoTitlesParams,
  GenerateVideoTitlesResult,
} from "./video-titles.service";

export {
  generateVideoThumbnail,
} from "./video-thumbnail.service";

export type {
  GenerateVideoThumbnailParams,
  GenerateVideoThumbnailResult,
} from "./video-thumbnail.service";

export {
  generateYouTubeSEO,
} from "./youtube-seo.service";

export type {
  NarrativeAngle as YouTubeSEONarrativeAngle,
  SearchIntent,
  GenerateYouTubeSEOParams,
  YouTubeSEOOutput,
  GenerateYouTubeSEOResult,
} from "./youtube-seo.service";

// ============================================================================
// VIDEO SCRIPT SERVICE
// ============================================================================

export {
  generateVideoScript,
  refactorVideoScript,
} from "./video-script.service";

export type {
  VideoScriptInput,
  VideoScriptRefactorInput,
  VideoScriptOutput,
  GenerateVideoScriptResult,
  RefactorVideoScriptResult,
} from "./video-script.service";

// ============================================================================
// USER VARIABLES SERVICE
// ============================================================================

export {
  getUserVariables,
  formatVariablesForPrompt,
  enhancePromptWithVariables,
  getNegativeTermsArray,
  checkForNegativeTerms,
} from "./user-variables.service";

export type {
  UserVariables,
  FormattedVariablesContext,
} from "./user-variables.service";

// ============================================================================
// CONTENT MAPPER (Wizard → Studio Integration)
// ============================================================================

export {
  mapCarouselToStudio,
  mapGeneratedContentToStudio,
  createStudioStateFromMappedContent,
  selectTemplateForSlide,
  generateImagePromptForSlide,
  extractImagePrompts,
  updateSlidesWithImages,
  validateMappedContent,
  DEFAULT_MAPPING_CONFIG,
} from "./content-mapper";

export type {
  ContentMappingConfig,
  MappedContent,
} from "./content-mapper";

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
