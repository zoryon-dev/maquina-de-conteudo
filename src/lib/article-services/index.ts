/**
 * Article Services — Barrel Exports
 *
 * Central export point for all article wizard types and services.
 */

// Types
export * from "./types";

// Prompts
export * from "./prompts";

// Services
export { runArticleResearch } from "./services/research.service";
export { generateOutlines } from "./services/outline.service";
export { produceSections } from "./services/section-producer.service";
export { assembleArticle } from "./services/assembler.service";
export { analyzeSeo } from "./services/seo-analyzer.service";
export { optimizeSeo } from "./services/seo-optimizer.service";
export { generateTitles } from "./services/title-generator.service";

// Site Intelligence
export {
  crawlSite,
  extractBrandVoice,
  analyzeKeywordGaps,
  isSiteIntelligenceFresh,
} from "./services/site-intelligence.service";

// Interlinking
export { analyzeInterlinking } from "./services/interlinking.service";
export type { InterlinkingResult } from "./services/interlinking.service";

// Metadata
export { generateArticleMetadata } from "./services/metadata.service";

// GEO
export { analyzeGeo } from "./services/geo-analyzer.service";
export type { GeoAnalysisResult } from "./services/geo-analyzer.service";
export { optimizeGeo } from "./services/geo-optimizer.service";
export type { GeoOptimizationResult } from "./services/geo-optimizer.service";

// Extension
export { diagnoseArticle, planExpansion, expandArticle } from "./services/extension.service";
export type { ExtensionDiagnosis, ExpansionPlanResult, ExpansionResult } from "./services/extension.service";

// Cross-Format
export {
  deriveLinkedInPost,
  deriveVideoScript,
  deriveCarousel,
  deriveAllFormats,
} from "./services/cross-format.service";
export type { DerivationResults } from "./services/cross-format.service";

// Pipeline handlers (used by worker)
export {
  handleArticleResearch,
  handleArticleOutline,
  handleArticleSectionProduction,
  handleArticleAssembly,
  handleArticleSeoGeoCheck,
  handleArticleOptimization,
  handleArticleInterlinking,
  handleArticleMetadata,
} from "./services/pipeline.service";
