/**
 * Article Wizard — Unified SEO+GEO Analyzer Service
 *
 * Analyzes article content for SEO and GEO scores using the unified V2 prompt.
 * Returns seoScore, geoScore, unifiedScore, geoAnalysis, and priorityFixes.
 */

import type { ServiceResult, SeoReport, KeywordGap } from "../types";
import { getArticleSystemPromptV2, getUnifiedAnalyzerPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

interface SeoAnalyzerResponse {
  overall_score: number;
  seo_score?: number;
  geo_score?: number;
  unified_score?: number;
  checks: Array<{
    id?: number;
    criterion: string;
    category?: string;
    status: "pass" | "warn" | "fail" | "warning";
    message: string;
    current_value?: string;
    recommended_value?: string;
    priority: "critical" | "high" | "medium" | "low";
    auto_fixable?: boolean;
  }>;
  keyword_density: {
    primary: number | { keyword: string; count: number; density: string };
    secondary: Record<string, number> | Array<{ keyword: string; count: number; density: string }>;
  };
  suggestions?: string[];
  geo_analysis?: {
    target_queries_evaluated: Array<{
      query: string;
      answered: boolean;
      answer_quality: string;
      location_in_article: string;
      improvement?: string | null;
    }>;
    citable_snippets_found: number;
    citable_snippets_target?: number;
    schemas_detected: string[];
    schemas_recommended?: string[];
    ai_citation_probability: string;
  };
  priority_fixes?: Array<{
    id: string;
    category: string;
    description: string;
    impact: string;
    effort: string;
    auto_fixable: boolean;
    fix_instruction: string;
  }>;
  competitive_coverage?: {
    gaps_addressed: number | string[];
    gaps_missed: string[];
    differentiation_score: number;
  };
}

export async function analyzeSeo(params: {
  articleContent: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount: number;
  keywordGaps?: KeywordGap[];
  targetQueries?: string[];
  citabilityLevel?: string;
  model: string;
}): Promise<ServiceResult<SeoReport>> {
  try {
    const systemPrompt = getArticleSystemPromptV2();
    const userMessage = getUnifiedAnalyzerPrompt({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      targetWordCount: params.targetWordCount,
      keywordGaps: params.keywordGaps,
      targetQueries: params.targetQueries,
      citabilityLevel: params.citabilityLevel,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.2,
    });

    const parsed = extractArticleJSON<SeoAnalyzerResponse>(response);
    if (!parsed) {
      return {
        success: false,
        error: `Failed to parse SEO analyzer response (length=${response.length}, start="${response.slice(0, 120)}…", end="…${response.slice(-120)}")`,
      };
    }

    const report: SeoReport = {
      overallScore: parsed.seo_score ?? parsed.overall_score,
      checks: (parsed.checks || []).map((c) => ({
        criterion: c.criterion,
        status: c.status === "warning" ? "warn" : c.status,
        message: c.message,
        priority: c.priority === "critical" ? "high" : c.priority,
      })),
      suggestions: parsed.suggestions || [],
      keywordDensity: {
        primary: typeof parsed.keyword_density?.primary === "number"
          ? parsed.keyword_density.primary
          : parseFloat(String((parsed.keyword_density?.primary as any)?.density || "0")),
        secondary: Array.isArray(parsed.keyword_density?.secondary)
          ? Object.fromEntries((parsed.keyword_density.secondary as any[]).map((s) => [s.keyword, parseFloat(s.density || "0")]))
          : (parsed.keyword_density?.secondary as Record<string, number>) || {},
      },
      // V2 unified fields
      geoScore: parsed.geo_score,
      unifiedScore: parsed.unified_score,
      geoAnalysis: parsed.geo_analysis ? {
        targetQueriesEvaluated: (parsed.geo_analysis.target_queries_evaluated || []).map((q) => ({
          query: q.query,
          answered: q.answered,
          answerQuality: q.answer_quality,
          locationInArticle: q.location_in_article,
        })),
        citableSnippetsFound: parsed.geo_analysis.citable_snippets_found || 0,
        schemasDetected: parsed.geo_analysis.schemas_detected || [],
        aiCitationProbability: parsed.geo_analysis.ai_citation_probability || "",
      } : undefined,
      priorityFixes: parsed.priority_fixes?.map((f) => ({
        fixId: f.id,
        category: f.category,
        description: f.description,
        impact: f.impact,
        effort: f.effort,
        autoFixable: f.auto_fixable,
        fixInstruction: f.fix_instruction,
      })),
    };

    return { success: true, data: report };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article SEO Analyzer] Error:", msg);
    return { success: false, error: msg };
  }
}
