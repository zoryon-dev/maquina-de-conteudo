/**
 * Article Wizard — Research Service
 *
 * Handles article research: extraction (Firecrawl), search (Tavily), synthesis (LLM).
 * Reuses existing wizard-services instead of duplicating code.
 */

import { extractFromUrl } from "@/lib/wizard-services/firecrawl.service";
import { contextualSearch } from "@/lib/wizard-services/tavily.service";
import type { ServiceResult } from "../types";
import {
  getBaseArticleAnalyzerPrompt,
  getMotherArticleAnalyzerPrompt,
  getArticleSynthesizerPromptV2,
  getArticleSystemPromptV2,
} from "../prompts";
import { articleLlmCall } from "./llm";

export interface ArticleResearchResult {
  extractedBaseContent?: string;
  extractedMotherContent?: string;
  baseArticleAnalysis?: string;
  motherArticleAnalysis?: string;
  researchResults?: string;
  synthesizedResearch?: string;
}

export async function runArticleResearch(params: {
  referenceUrl?: string;
  referenceMotherUrl?: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  targetQueries?: string[];
  model: string;
  userVariablesPrompt?: string;
  ragContext?: string;
  onProgress?: (stage: string, percent: number, message: string) => Promise<void>;
}): Promise<ServiceResult<ArticleResearchResult>> {
  const result: ArticleResearchResult = {};
  let systemPrompt = getArticleSystemPromptV2();

  // Enrich system prompt with user variables if available
  if (params.userVariablesPrompt) {
    systemPrompt += `\n\n${params.userVariablesPrompt}`;
  }

  try {
    // Step 1: Extract base article content (Firecrawl)
    if (params.referenceUrl) {
      await params.onProgress?.("extraction", 10, "Extraindo conteúdo do artigo de referência...");
      const extraction = await extractFromUrl(params.referenceUrl);
      if (extraction.success && extraction.data) {
        result.extractedBaseContent = extraction.data.content;

        // Analyze base article
        await params.onProgress?.("extraction", 20, "Analisando artigo de referência...");
        const analysisPrompt = getBaseArticleAnalyzerPrompt({
          articleContent: extraction.data.content,
          articleUrl: params.referenceUrl,
          primaryKeyword: params.primaryKeyword,
        });
        const analysisResponse = await articleLlmCall({
          model: params.model,
          systemPrompt,
          userMessage: analysisPrompt,
        });
        result.baseArticleAnalysis = analysisResponse;
      }
    }

    // Step 2: Extract mother article content (Firecrawl)
    if (params.referenceMotherUrl) {
      await params.onProgress?.("extraction", 30, "Extraindo conteúdo do artigo mãe...");
      const motherExtraction = await extractFromUrl(params.referenceMotherUrl);
      if (motherExtraction.success && motherExtraction.data) {
        result.extractedMotherContent = motherExtraction.data.content;

        // Analyze mother article
        await params.onProgress?.("extraction", 40, "Analisando artigo mãe...");
        const motherPrompt = getMotherArticleAnalyzerPrompt({
          motherContent: motherExtraction.data.content,
          motherUrl: params.referenceMotherUrl,
          primaryKeyword: params.primaryKeyword,
        });
        const motherResponse = await articleLlmCall({
          model: params.model,
          systemPrompt,
          userMessage: motherPrompt,
        });
        result.motherArticleAnalysis = motherResponse;
      }
    }

    // Step 3: Search for context (Tavily)
    await params.onProgress?.("research", 50, "Pesquisando contexto e dados recentes...");
    const searchQueries = buildSearchQueries(params.primaryKeyword, params.secondaryKeywords);
    const searchResults: string[] = [];

    for (const query of searchQueries) {
      const search = await contextualSearch(query, { maxResults: 5, searchDepth: "advanced" });
      if (search.success && search.data) {
        searchResults.push(
          `Query: ${search.data.query}\nAnswer: ${search.data.answer}\nSources: ${search.data.sources.map((s) => `${s.title} (${s.url}): ${s.snippet}`).join("\n")}`
        );
      }
    }
    result.researchResults = searchResults.join("\n\n---\n\n");

    // Step 3.5: Append RAG context if available
    if (params.ragContext) {
      result.researchResults = (result.researchResults || "") +
        "\n\n--- CONTEXTO DA BASE DE CONHECIMENTO ---\n" + params.ragContext;
    }

    // Step 4: Synthesize research
    await params.onProgress?.("synthesis", 75, "Sintetizando pesquisa...");
    const synthesizerPrompt = getArticleSynthesizerPromptV2({
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      articleType: params.articleType,
      researchResults: result.researchResults,
      baseArticleAnalysis: result.baseArticleAnalysis,
      motherArticleAnalysis: result.motherArticleAnalysis,
      targetQueries: params.targetQueries,
      ragContext: params.ragContext,
    });
    const synthesisResponse = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage: synthesizerPrompt,
      temperature: 0.3,
    });
    result.synthesizedResearch = synthesisResponse;

    await params.onProgress?.("synthesis", 100, "Pesquisa concluída!");
    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Research] Error:", msg);
    return { success: false, error: msg };
  }
}

function buildSearchQueries(primaryKeyword: string, secondaryKeywords?: string[]): string[] {
  const queries = [
    `${primaryKeyword} guia completo 2026`,
    `${primaryKeyword} estatísticas dados recentes`,
    `${primaryKeyword} melhores práticas erros comuns`,
  ];
  if (secondaryKeywords?.length) {
    queries.push(`${primaryKeyword} ${secondaryKeywords[0]} relação`);
  }
  return queries.slice(0, 4); // Max 4 queries
}
