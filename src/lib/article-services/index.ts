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

// Pipeline handlers (used by worker)
export {
  handleArticleResearch,
  handleArticleOutline,
  handleArticleSectionProduction,
  handleArticleAssembly,
  handleArticleSeoGeoCheck,
  handleArticleOptimization,
} from "./services/pipeline.service";
