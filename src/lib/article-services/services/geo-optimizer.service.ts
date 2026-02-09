/**
 * Article Wizard — GEO Optimizer Service (GEO-02)
 *
 * @deprecated GEO optimization is now part of the unified SEO+GEO optimizer.
 * Use `optimizeSeo()` from `seo-optimizer.service.ts` which applies both
 * SEO and GEO fixes in a single pass.
 */

import type { ServiceResult } from "../types";

export interface GeoOptimizationResult {
  optimizedArticle: string;
  changesApplied: Array<{
    fixId: number;
    description: string;
    criterionImproved: string;
    location: string;
    beforeSnippet: string;
    afterSnippet: string;
  }>;
  estimatedNewScores: {
    geoScoreOverall: number;
    directAnswers: number;
    citableData: number;
    extractableStructure: number;
    authorityEeat: number;
    topicCoverage: number;
    schemaMetadata: number;
  };
  editorNotes: string[];
}

/**
 * @deprecated GEO-02 is now part of the unified SEO+GEO optimizer (Prompt 09).
 * Use `optimizeSeo()` from `seo-optimizer.service.ts` instead.
 * The unified optimizer applies both SEO and GEO fixes in a single pass.
 */
export async function optimizeGeo(_params: {
  articleContent: string;
  geoReport: string;
  priorityFixes: string;
  brandVoiceProfile?: string;
  model: string;
}): Promise<ServiceResult<GeoOptimizationResult>> {
  return {
    success: false,
    error: "optimizeGeo() is deprecated. Use optimizeSeo() from seo-optimizer.service.ts which now applies unified SEO+GEO optimization in a single pass.",
  };
}
