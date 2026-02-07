/**
 * Article Wizard — GEO Analyzer Service (GEO-01)
 *
 * Evaluates article AI-readiness across 6 criteria with weighted scoring.
 */

import type { ServiceResult } from "../types";
import { getArticleSystemPrompt, extractArticleJSON } from "../prompts";
import { getGeoAnalyzerPrompt } from "../prompts/geo";
import { articleLlmCall } from "./llm";

// Raw response from GEO-01
interface GeoAnalyzerResponse {
  geo_score_overall: number;
  target_queries_evaluated: string[];
  breakdown: {
    direct_answers: {
      score: number;
      issues: string[];
      recommendations: string[];
      examples?: {
        good: string[];
        needs_improvement: string[];
      };
    };
    citable_data: {
      score: number;
      issues: string[];
      recommendations: string[];
      stats_found?: number;
      stats_without_source?: number;
    };
    extractable_structure: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    authority_eeat: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    topic_coverage: {
      score: number;
      issues: string[];
      recommendations: string[];
      missing_subtopics?: string[];
    };
    schema_metadata: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
  };
  priority_fixes: Array<{
    fix: string;
    impact: string;
    effort: string;
    criterion: string;
    estimated_score_improvement: number;
  }>;
  ai_citation_probability: {
    score: number;
    assessment: string;
  };
}

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

export async function analyzeGeo(params: {
  articleContent: string;
  primaryKeyword: string;
  targetQueries?: string[];
  model: string;
}): Promise<ServiceResult<GeoAnalysisResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getGeoAnalyzerPrompt({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      targetQueries: params.targetQueries,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.2,
    });

    const parsed = extractArticleJSON<GeoAnalyzerResponse>(response);
    if (!parsed) {
      return { success: false, error: "Failed to parse GEO analyzer response" };
    }

    const b = parsed.breakdown;
    const result: GeoAnalysisResult = {
      overallScore: parsed.geo_score_overall,
      targetQueries: parsed.target_queries_evaluated || [],
      breakdown: {
        directAnswers: { score: b.direct_answers.score, issues: b.direct_answers.issues, recommendations: b.direct_answers.recommendations },
        citableData: { score: b.citable_data.score, issues: b.citable_data.issues, recommendations: b.citable_data.recommendations, statsFound: b.citable_data.stats_found, statsWithoutSource: b.citable_data.stats_without_source },
        extractableStructure: { score: b.extractable_structure.score, issues: b.extractable_structure.issues, recommendations: b.extractable_structure.recommendations },
        authorityEeat: { score: b.authority_eeat.score, issues: b.authority_eeat.issues, recommendations: b.authority_eeat.recommendations },
        topicCoverage: { score: b.topic_coverage.score, issues: b.topic_coverage.issues, recommendations: b.topic_coverage.recommendations, missingSubtopics: b.topic_coverage.missing_subtopics },
        schemaMetadata: { score: b.schema_metadata.score, issues: b.schema_metadata.issues, recommendations: b.schema_metadata.recommendations },
      },
      priorityFixes: (parsed.priority_fixes || []).map((f) => ({
        fix: f.fix,
        impact: f.impact as "alto" | "médio" | "baixo",
        effort: f.effort as "alto" | "médio" | "baixo",
        criterion: f.criterion,
        estimatedScoreImprovement: f.estimated_score_improvement,
      })),
      aiCitationProbability: parsed.ai_citation_probability || { score: 0, assessment: "Não avaliado" },
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article GEO Analyzer] Error:", msg);
    return { success: false, error: msg };
  }
}
