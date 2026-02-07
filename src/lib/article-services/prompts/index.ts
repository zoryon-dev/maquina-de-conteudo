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
