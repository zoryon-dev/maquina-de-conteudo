/**
 * Article Wizard — Unified SEO+GEO Optimizer Service
 *
 * Applies unified SEO+GEO fixes to the article using the V2 prompt.
 */

import type { ServiceResult } from "../types";
import { getArticleSystemPromptV2, getUnifiedOptimizerPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

export interface OptimizationResult {
  optimizedArticle: string;
  changesMade: Array<{
    fixId?: string;
    type: string;
    location: string;
    description: string;
    beforeSnippet?: string;
    afterSnippet?: string;
  }>;
  manualReviewNeeded?: Array<{
    fixId: string;
    reason: string;
    suggestion: string;
    placeholderUsed?: string | null;
  }>;
  newSeoScoreEstimate: number;
  newGeoScoreEstimate: number;
  newUnifiedScoreEstimate?: number;
  aiCitationProbability?: string;
  tradeoffs: string[];
}

interface OptimizerResponse {
  optimized_article: string;
  changes_made: Array<{
    fix_id?: string;
    type: string;
    location: string;
    description: string;
    before_snippet?: string;
    after_snippet?: string;
  }>;
  manual_review_needed?: Array<{
    fix_id: string;
    reason: string;
    suggestion: string;
    placeholder_used?: string | null;
  }>;
  new_scores_estimate?: {
    seo_score: number;
    geo_score: number;
    unified_score: number;
    ai_citation_probability?: string;
  };
  // Legacy flat fields (backwards compat)
  new_seo_score_estimate?: number;
  new_geo_score_estimate?: number;
  tradeoffs: string[] | Array<{
    description: string;
    seo_impact?: string;
    geo_impact?: string;
    reasoning?: string;
  }>;
}

export async function optimizeSeo(params: {
  articleContent: string;
  unifiedReport: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  brandVoiceProfile?: string;
  eeatProfile?: string;
  model: string;
}): Promise<ServiceResult<OptimizationResult>> {
  try {
    const systemPrompt = getArticleSystemPromptV2();
    const userMessage = getUnifiedOptimizerPrompt({
      articleContent: params.articleContent,
      unifiedReport: params.unifiedReport,
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandVoiceProfile: params.brandVoiceProfile,
      eeatProfile: params.eeatProfile,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

    const parsed = extractArticleJSON<OptimizerResponse>(response);
    if (!parsed?.optimized_article) {
      return { success: false, error: "Failed to parse optimizer response" };
    }

    // Extract scores from new nested format or legacy flat fields
    const seoScore = parsed.new_scores_estimate?.seo_score ?? parsed.new_seo_score_estimate ?? 0;
    const geoScore = parsed.new_scores_estimate?.geo_score ?? parsed.new_geo_score_estimate ?? 0;
    const unifiedScore = parsed.new_scores_estimate?.unified_score;

    // Normalize tradeoffs (can be strings or objects)
    const tradeoffs = (parsed.tradeoffs || []).map((t) =>
      typeof t === "string" ? t : t.description,
    );

    return {
      success: true,
      data: {
        optimizedArticle: parsed.optimized_article,
        changesMade: (parsed.changes_made || []).map((c) => ({
          fixId: c.fix_id,
          type: c.type,
          location: c.location,
          description: c.description,
          beforeSnippet: c.before_snippet,
          afterSnippet: c.after_snippet,
        })),
        manualReviewNeeded: parsed.manual_review_needed?.map((m) => ({
          fixId: m.fix_id,
          reason: m.reason,
          suggestion: m.suggestion,
          placeholderUsed: m.placeholder_used,
        })),
        newSeoScoreEstimate: seoScore,
        newGeoScoreEstimate: geoScore,
        newUnifiedScoreEstimate: unifiedScore,
        aiCitationProbability: parsed.new_scores_estimate?.ai_citation_probability,
        tradeoffs,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Unified Optimizer] Error:", msg);
    return { success: false, error: msg };
  }
}
