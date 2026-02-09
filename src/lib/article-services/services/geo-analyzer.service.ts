/**
 * Article Wizard — GEO Analyzer Service (GEO-01)
 *
 * @deprecated GEO analysis is now part of the unified SEO+GEO analyzer.
 * Use `analyzeSeo()` from `seo-analyzer.service.ts` which returns geoScore,
 * geoAnalysis, and priorityFixes as part of the unified SeoReport.
 */

import type { ServiceResult } from "../types";

export interface GeoAnalysisResult {
  overallScore: number;
  targetQueries: string[];
  breakdown: {
    directAnswers: { score: number; issues: string[]; recommendations: string[] };
    citableData: { score: number; issues: string[]; recommendations: string[]; statsFound?: number; statsWithoutSource?: number };
    extractableStructure: { score: number; issues: string[]; recommendations: string[] };
    authorityEeat: { score: number; issues: string[]; recommendations: string[] };
    topicCoverage: { score: number; issues: string[]; recommendations: string[]; missingSubtopics?: string[] };
    schemaMetadata: { score: number; issues: string[]; recommendations: string[] };
  };
  priorityFixes: Array<{
    fix: string;
    impact: "alto" | "médio" | "baixo";
    effort: "alto" | "médio" | "baixo";
    criterion: string;
    estimatedScoreImprovement: number;
  }>;
  aiCitationProbability: { score: number; assessment: string };
}

/**
 * @deprecated GEO-01 is now part of the unified SEO+GEO analyzer (Prompt 08).
 * Use `analyzeSeo()` from `seo-analyzer.service.ts` instead.
 * The unified analyzer returns geoScore, geoAnalysis, and priorityFixes
 * as part of the SeoReport.
 */
export async function analyzeGeo(_params: {
  articleContent: string;
  primaryKeyword: string;
  targetQueries?: string[];
  model: string;
}): Promise<ServiceResult<GeoAnalysisResult>> {
  return {
    success: false,
    error: "analyzeGeo() is deprecated. Use analyzeSeo() from seo-analyzer.service.ts which now includes unified GEO analysis (geoScore, geoAnalysis, priorityFixes).",
  };
}
