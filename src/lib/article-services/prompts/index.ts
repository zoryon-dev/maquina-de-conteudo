/**
 * Article Prompts — Barrel Exports
 *
 * Central export for all article wizard prompts.
 */

// Base pipeline prompts (01-10) — V2 unified SEO+GEO
export {
  // V2 functions (primary)
  getArticleSystemPromptV2,
  getArticleSynthesizerPromptV2,
  getOutlineGeneratorPromptV2,
  getSectionProducerPromptV2,
  getUnifiedAnalyzerPrompt,
  getUnifiedOptimizerPrompt,
  // Backwards-compat aliases
  getArticleSystemPrompt,
  getArticleSynthesizerPrompt,
  getOutlineGeneratorPrompt,
  getSectionProducerPrompt,
  getSeoAnalyzerPrompt,
  getSeoOptimizerPrompt,
  // Unchanged functions
  getBaseArticleAnalyzerPrompt,
  getMotherArticleAnalyzerPrompt,
  getAssemblerPrompt,
  getTitleGeneratorPrompt,
  extractArticleJSON,
} from "./base-pipeline";

// Site Intelligence prompts (SI-02, SI-03)
export {
  getBrandVoiceExtractorPrompt,
  getKeywordGapAnalyzerPrompt,
} from "./site-intelligence";

// Interlinking prompt (IL-01)
export { getInterlinkingPrompt } from "./interlinking";

// Metadata prompt (META-01-B) + schema mapping
export {
  getMetadataGeneratorPromptV2,
  getMetadataGeneratorPrompt,
  SCHEMA_MAPPING,
} from "./metadata";

// GEO prompts (DEPRECATED — use unified functions from base-pipeline)
export { getGeoAnalyzerPrompt, getGeoOptimizerPrompt } from "./geo";

// Extension prompts (EXT-01, EXT-02, EXT-03)
export {
  getArticleDiagnosticianPrompt,
  getExpansionPlannerPrompt,
  getContentExpanderPrompt,
} from "./extension";

// Cross-format prompts (CROSS-01, CROSS-02, CROSS-03)
export {
  getLinkedInDeriverPrompt,
  getVideoScriptDeriverPrompt,
  getCarouselDeriverPrompt,
} from "./cross-format";
