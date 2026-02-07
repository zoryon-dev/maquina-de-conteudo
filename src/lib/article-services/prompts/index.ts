/**
 * Article Prompts — Barrel Exports
 *
 * Central export for all article wizard prompts.
 */

// Base pipeline prompts (01-10)
export {
  getArticleSystemPrompt,
  getBaseArticleAnalyzerPrompt,
  getMotherArticleAnalyzerPrompt,
  getArticleSynthesizerPrompt,
  getOutlineGeneratorPrompt,
  getSectionProducerPrompt,
  getAssemblerPrompt,
  getSeoAnalyzerPrompt,
  getSeoOptimizerPrompt,
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

// Metadata prompt (META-01)
export { getMetadataGeneratorPrompt } from "./metadata";

// GEO prompts (GEO-01, GEO-02)
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
