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
