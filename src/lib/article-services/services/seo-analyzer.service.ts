/**
 * Article Wizard — SEO Analyzer Service
 *
 * Analyzes article content for SEO score and issues.
 */

import type { ServiceResult, SeoReport, KeywordGap } from "../types";
import { getArticleSystemPrompt, getSeoAnalyzerPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

interface SeoAnalyzerResponse {
  overall_score: number;
  checks: Array<{
    criterion: string;
    status: "pass" | "warn" | "fail";
    message: string;
    priority: "high" | "medium" | "low";
  }>;
  keyword_density: {
    primary: number;
    secondary: Record<string, number>;
  };
  suggestions: string[];
  competitive_coverage?: {
    gaps_addressed: number;
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
  model: string;
}): Promise<ServiceResult<SeoReport>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getSeoAnalyzerPrompt({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      targetWordCount: params.targetWordCount,
      keywordGaps: params.keywordGaps,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.2,
    });

    const parsed = extractArticleJSON<SeoAnalyzerResponse>(response);
    if (!parsed) {
      return { success: false, error: "Failed to parse SEO analyzer response" };
    }

    const report: SeoReport = {
      overallScore: parsed.overall_score,
      checks: parsed.checks.map((c) => ({
        criterion: c.criterion,
        status: c.status,
        message: c.message,
        priority: c.priority,
      })),
      suggestions: parsed.suggestions || [],
      keywordDensity: {
        primary: parsed.keyword_density?.primary || 0,
        secondary: parsed.keyword_density?.secondary || {},
      },
    };

    return { success: true, data: report };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article SEO Analyzer] Error:", msg);
    return { success: false, error: msg };
  }
}
