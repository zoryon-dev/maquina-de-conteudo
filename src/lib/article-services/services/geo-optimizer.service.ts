/**
 * Article Wizard — GEO Optimizer Service (GEO-02)
 *
 * Applies GEO fixes with before/after traceability.
 */

import type { ServiceResult } from "../types";
import { getArticleSystemPrompt, extractArticleJSON } from "../prompts";
import { getGeoOptimizerPrompt } from "../prompts/geo";
import { articleLlmCall } from "./llm";

interface GeoOptimizerResponse {
  optimized_article: string;
  changes_applied: Array<{
    fix_id: number;
    description: string;
    criterion_improved: string;
    location: string;
    before_snippet: string;
    after_snippet: string;
  }>;
  estimated_new_scores: {
    geo_score_overall: number;
    direct_answers: number;
    citable_data: number;
    extractable_structure: number;
    authority_eeat: number;
    topic_coverage: number;
    schema_metadata: number;
  };
  editor_notes: string[];
}

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

export async function optimizeGeo(params: {
  articleContent: string;
  geoReport: string;
  priorityFixes: string;
  brandVoiceProfile?: string;
  model: string;
}): Promise<ServiceResult<GeoOptimizationResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getGeoOptimizerPrompt({
      articleContent: params.articleContent,
      geoReport: params.geoReport,
      priorityFixes: params.priorityFixes,
      brandVoiceProfile: params.brandVoiceProfile,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.3,
    });

    const parsed = extractArticleJSON<GeoOptimizerResponse>(response);
    if (!parsed) {
      return { success: false, error: "Failed to parse GEO optimizer response" };
    }

    const scores = parsed.estimated_new_scores;
    const result: GeoOptimizationResult = {
      optimizedArticle: parsed.optimized_article,
      changesApplied: (parsed.changes_applied || []).map((c) => ({
        fixId: c.fix_id,
        description: c.description,
        criterionImproved: c.criterion_improved,
        location: c.location,
        beforeSnippet: c.before_snippet,
        afterSnippet: c.after_snippet,
      })),
      estimatedNewScores: {
        geoScoreOverall: scores.geo_score_overall,
        directAnswers: scores.direct_answers,
        citableData: scores.citable_data,
        extractableStructure: scores.extractable_structure,
        authorityEeat: scores.authority_eeat,
        topicCoverage: scores.topic_coverage,
        schemaMetadata: scores.schema_metadata,
      },
      editorNotes: parsed.editor_notes || [],
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article GEO Optimizer] Error:", msg);
    return { success: false, error: msg };
  }
}
