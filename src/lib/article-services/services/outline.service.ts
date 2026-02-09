/**
 * Article Wizard — Outline Service
 *
 * Generates 3 outline proposals using the Outline Generator prompt.
 */

import type { ServiceResult, ArticleOutline, OutlineSection, KeywordGap } from "../types";
import { getArticleSystemPromptV2, getOutlineGeneratorPromptV2, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

interface OutlineGeneratorResponse {
  outlines: Array<{
    id: string;
    title: string;
    approach?: string;
    description: string;
    differentiator: string;
    seo_strength?: string;
    geo_strength?: string;
    recommended_schemas?: string[];
    sections: Array<{
      heading: string;
      heading_type?: string;
      subheadings: string[];
      estimated_words: number;
      key_points: string[];
      geo_format?: string;
      target_queries_addressed?: string[];
      schema_hint?: string | null;
      citable_snippet_slots?: number;
    }>;
    faq_section?: {
      questions: Array<{
        question: string;
        answer_preview: string;
        source_query: string;
      }>;
    };
    estimated_total_words: number;
    estimated_geo_score?: string;
    estimated_schema_count?: number;
  }>;
  recommendation?: {
    best_for_seo: string;
    best_for_geo: string;
    best_balanced: string;
    reasoning: string;
  };
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
  targetQueries?: string[];
  citabilityLevel?: string;
  customInstructions?: string;
  model: string;
}): Promise<ServiceResult<ArticleOutline[]>> {
  try {
    const systemPrompt = getArticleSystemPromptV2();
    const userMessage = getOutlineGeneratorPromptV2({
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      articleType: params.articleType,
      targetWordCount: params.targetWordCount,
      synthesizedResearch: params.synthesizedResearch,
      baseArticleAnalysis: params.baseArticleAnalysis,
      motherArticleAnalysis: params.motherArticleAnalysis,
      keywordGaps: params.keywordGaps,
      targetQueries: params.targetQueries,
      citabilityLevel: params.citabilityLevel,
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
      approach: o.approach as ArticleOutline["approach"],
      seoStrength: o.seo_strength,
      geoStrength: o.geo_strength,
      recommendedSchemas: o.recommended_schemas,
      sections: o.sections.map((s) => ({
        heading: s.heading,
        headingType: s.heading_type as OutlineSection["headingType"],
        subheadings: s.subheadings || [],
        estimatedWords: s.estimated_words,
        keyPoints: s.key_points || [],
        geoFormat: s.geo_format as OutlineSection["geoFormat"],
        targetQueriesAddressed: s.target_queries_addressed,
        schemaHint: s.schema_hint ?? undefined,
        citableSnippetSlots: s.citable_snippet_slots,
      })),
      faqSection: o.faq_section?.questions?.length ? {
        questions: o.faq_section.questions.map((q) => ({
          question: q.question,
          answerPreview: q.answer_preview,
          sourceQuery: q.source_query,
        })),
      } : undefined,
      estimatedTotalWords: o.estimated_total_words,
      estimatedGeoScore: o.estimated_geo_score,
      estimatedSchemaCount: o.estimated_schema_count,
    }));

    return { success: true, data: outlines };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Outline] Error:", msg);
    return { success: false, error: msg };
  }
}
