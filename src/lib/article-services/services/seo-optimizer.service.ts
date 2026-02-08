/**
 * Article Wizard — SEO Optimizer Service
 *
 * Applies SEO fixes (and optionally GEO fixes) to the article.
 */

import type { ServiceResult } from "../types";
import { getArticleSystemPrompt, getSeoOptimizerPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

export interface OptimizationResult {
  optimizedArticle: string;
  changesMade: Array<{
    type: string;
    location: string;
    description: string;
  }>;
  newSeoScoreEstimate: number;
  newGeoScoreEstimate: number;
  tradeoffs: string[];
}

interface OptimizerResponse {
  optimized_article: string;
  changes_made: Array<{
    type: string;
    location: string;
    description: string;
  }>;
  new_seo_score_estimate: number;
  new_geo_score_estimate: number;
  tradeoffs: string[];
}

export async function optimizeSeo(params: {
  articleContent: string;
  seoReport: string;
  primaryKeyword: string;
  geoReport?: string;
  geoFixes?: string;
  model: string;
}): Promise<ServiceResult<OptimizationResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getSeoOptimizerPrompt({
      articleContent: params.articleContent,
      seoReport: params.seoReport,
      primaryKeyword: params.primaryKeyword,
      geoReport: params.geoReport,
      geoFixes: params.geoFixes,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

    const parsed = extractArticleJSON<OptimizerResponse>(response);
    if (!parsed?.optimized_article) {
      return { success: false, error: "Failed to parse SEO optimizer response" };
    }

    return {
      success: true,
      data: {
        optimizedArticle: parsed.optimized_article,
        changesMade: parsed.changes_made || [],
        newSeoScoreEstimate: parsed.new_seo_score_estimate || 0,
        newGeoScoreEstimate: parsed.new_geo_score_estimate || 0,
        tradeoffs: parsed.tradeoffs || [],
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article SEO Optimizer] Error:", msg);
    return { success: false, error: msg };
  }
}
