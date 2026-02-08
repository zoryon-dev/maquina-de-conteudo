/**
 * Article Wizard — Outline Service
 *
 * Generates 3 outline proposals using the Outline Generator prompt.
 */

import type { ServiceResult, ArticleOutline, KeywordGap } from "../types";
import { getArticleSystemPrompt, getOutlineGeneratorPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

interface OutlineGeneratorResponse {
  outlines: Array<{
    id: string;
    title: string;
    description: string;
    differentiator: string;
    sections: Array<{
      heading: string;
      subheadings: string[];
      estimated_words: number;
      key_points: string[];
    }>;
    estimated_total_words: number;
  }>;
}

export async function generateOutlines(params: {
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  targetWordCount: number;
  synthesizedResearch: string;
  baseArticleAnalysis?: string;
  motherArticleAnalysis?: string;
  keywordGaps?: KeywordGap[];
  customInstructions?: string;
  model: string;
}): Promise<ServiceResult<ArticleOutline[]>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getOutlineGeneratorPrompt({
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      articleType: params.articleType,
      targetWordCount: params.targetWordCount,
      synthesizedResearch: params.synthesizedResearch,
      baseArticleAnalysis: params.baseArticleAnalysis,
      motherArticleAnalysis: params.motherArticleAnalysis,
      keywordGaps: params.keywordGaps,
      customInstructions: params.customInstructions,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.7,
    });

    const parsed = extractArticleJSON<OutlineGeneratorResponse>(response);
    if (!parsed?.outlines?.length) {
      return { success: false, error: "Failed to parse outline response" };
    }

    const outlines: ArticleOutline[] = parsed.outlines.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      differentiator: o.differentiator,
      sections: o.sections.map((s) => ({
        heading: s.heading,
        subheadings: s.subheadings || [],
        estimatedWords: s.estimated_words,
        keyPoints: s.key_points || [],
      })),
      estimatedTotalWords: o.estimated_total_words,
    }));

    return { success: true, data: outlines };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Outline] Error:", msg);
    return { success: false, error: msg };
  }
}
