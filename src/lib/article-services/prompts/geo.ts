/**
 * Article Wizard — GEO Prompts (GEO-01, GEO-02)
 *
 * @deprecated GEO-01 and GEO-02 are now absorbed into the unified pipeline:
 * - GEO-01 (Analyzer) → Use `getUnifiedAnalyzerPrompt()` from base-pipeline
 * - GEO-02 (Optimizer) → Use `getUnifiedOptimizerPrompt()` from base-pipeline
 *
 * These functions remain for backwards compatibility and delegate to the
 * unified equivalents.
 */

import { getUnifiedAnalyzerPrompt, getUnifiedOptimizerPrompt } from "./base-pipeline";

// ============================================================================
// PROMPT GEO-01 — AI-Readiness Analyzer (DEPRECATED)
// ============================================================================

/**
 * @deprecated Absorbed by `getUnifiedAnalyzerPrompt()` in base-pipeline.
 * The unified analyzer evaluates 14 SEO + 10 GEO criteria in a single pass.
 */
export function getGeoAnalyzerPrompt(params: {
  articleContent: string;
  primaryKeyword: string;
  targetQueries?: string[];
}): string {
  return getUnifiedAnalyzerPrompt({
    articleContent: params.articleContent,
    primaryKeyword: params.primaryKeyword,
    targetQueries: params.targetQueries,
    targetWordCount: 0, // sentinel: GEO-only analysis doesn't need word count
  });
}

// ============================================================================
// PROMPT GEO-02 — AI-Readiness Optimizer (DEPRECATED)
// ============================================================================

/**
 * @deprecated Absorbed by `getUnifiedOptimizerPrompt()` in base-pipeline.
 * The unified optimizer applies SEO + GEO fixes in a single pass.
 */
export function getGeoOptimizerPrompt(params: {
  articleContent: string;
  geoReport: string;
  priorityFixes: string;
  brandVoiceProfile?: string;
}): string {
  return getUnifiedOptimizerPrompt({
    articleContent: params.articleContent,
    unifiedReport: `${params.geoReport}\n\n--- PRIORITY FIXES ---\n${params.priorityFixes}`,
    primaryKeyword: "", // sentinel: GEO optimizer doesn't use keyword for optimization
    brandVoiceProfile: params.brandVoiceProfile,
  });
}
