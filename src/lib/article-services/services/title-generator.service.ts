/**
 * Article Wizard — Title Generator Service
 *
 * Generates 5 title options with CTR and SEO scores.
 */

import type { ServiceResult } from "../types";
import { getArticleSystemPrompt, getTitleGeneratorPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

export interface TitleOption {
  id: string;
  text: string;
  charCount: number;
  approach: string;
  ctrScore: number;
  seoScore: number;
  reason: string;
}

export interface TitleGeneratorResult {
  titles: TitleOption[];
  recommended: string;
  recommendationReason: string;
}

interface TitleResponse {
  titles: Array<{
    id: string;
    text: string;
    char_count: number;
    approach: string;
    ctr_score: number;
    seo_score: number;
    reason: string;
  }>;
  recommended: string;
  recommendation_reason: string;
}

export async function generateTitles(params: {
  articleContent: string;
  primaryKeyword: string;
  articleType: string;
  currentTitle?: string;
  model: string;
}): Promise<ServiceResult<TitleGeneratorResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getTitleGeneratorPrompt({
      articleContent: params.articleContent,
      primaryKeyword: params.primaryKeyword,
      articleType: params.articleType,
      currentTitle: params.currentTitle,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.8,
    });

    const parsed = extractArticleJSON<TitleResponse>(response);
    if (!parsed?.titles?.length) {
      return { success: false, error: "Failed to parse title generator response" };
    }

    return {
      success: true,
      data: {
        titles: parsed.titles.map((t) => ({
          id: t.id,
          text: t.text,
          charCount: t.char_count,
          approach: t.approach,
          ctrScore: t.ctr_score,
          seoScore: t.seo_score,
          reason: t.reason,
        })),
        recommended: parsed.recommended,
        recommendationReason: parsed.recommendation_reason,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Title Generator] Error:", msg);
    return { success: false, error: msg };
  }
}
