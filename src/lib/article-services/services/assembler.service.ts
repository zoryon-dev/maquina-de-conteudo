/**
 * Article Wizard — Assembler Service
 *
 * Assembles produced sections into a cohesive article.
 * Handles transitions, tone unification, and interlinking.
 */

import type { ServiceResult, ProducedSection, SiteUrlMapEntry } from "../types";
import { getArticleSystemPromptV2, getAssemblerPrompt, extractArticleJSON } from "../prompts";
import { articleLlmCall } from "./llm";

export interface AssemblyResult {
  assembledArticle: string;
  wordCount: number;
  interlinking: {
    linksInserted: Array<{ anchorText: string; targetUrl: string; section: string }>;
    suggestions: Array<{ anchorText: string; targetUrl: string; contextSentence: string; relevanceScore: number }>;
    reverseSuggestions: Array<{ sourceUrl: string; anchorText: string; insertionContext: string }>;
  };
  // V2 GEO metadata extracted from HTML comments
  citableSnippets?: Array<{ query: string; location: number }>;
  schemaHints?: Array<{ type: string; location: number }>;
}

interface AssemblerResponse {
  assembled_article: string;
  word_count: number;
  transitions_added: number;
  interlinking: {
    links_inserted: Array<{ anchor_text: string; target_url: string; section: string }>;
    suggestions: Array<{ anchor_text: string; target_url: string; context_sentence: string; relevance_score: number }>;
    reverse_suggestions: Array<{ source_url: string; anchor_text: string; insertion_context: string }>;
  };
}

/** Extract V2 GEO HTML comments from assembled article content */
function extractGeoComments(content: string) {
  const citableSnippets: Array<{ query: string; location: number }> = [];
  const schemaHints: Array<{ type: string; location: number }> = [];

  const citableRe = /<!--\s*citable-snippet:\s*(.+?)\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = citableRe.exec(content)) !== null) {
    citableSnippets.push({ query: match[1], location: match.index });
  }

  const schemaRe = /<!--\s*schema-hint:\s*(.+?)\s*-->/g;
  while ((match = schemaRe.exec(content)) !== null) {
    schemaHints.push({ type: match[1], location: match.index });
  }

  return { citableSnippets, schemaHints };
}

export async function assembleArticle(params: {
  sections: ProducedSection[];
  primaryKeyword: string;
  articleType: string;
  authorName?: string;
  siteUrlMap?: SiteUrlMapEntry[];
  interlinkingMode?: "auto" | "manual";
  maxLinks?: number;
  model: string;
}): Promise<ServiceResult<AssemblyResult>> {
  try {
    const systemPrompt = getArticleSystemPromptV2();
    const userMessage = getAssemblerPrompt({
      sections: params.sections,
      primaryKeyword: params.primaryKeyword,
      articleType: params.articleType,
      authorName: params.authorName,
      siteUrlMap: params.siteUrlMap,
      interlinkingMode: params.interlinkingMode,
      maxLinks: params.maxLinks,
    });

    const response = await articleLlmCall({
      model: params.model,
      systemPrompt,
      userMessage,
      temperature: 0.4,
    });

    const parsed = extractArticleJSON<AssemblerResponse>(response);
    if (!parsed?.assembled_article) {
      return { success: false, error: "Failed to parse assembler response" };
    }

    const il = parsed.interlinking || { links_inserted: [], suggestions: [], reverse_suggestions: [] };
    const geoComments = extractGeoComments(parsed.assembled_article);

    return {
      success: true,
      data: {
        assembledArticle: parsed.assembled_article,
        wordCount: parsed.word_count || parsed.assembled_article.split(/\s+/).length,
        citableSnippets: geoComments.citableSnippets.length > 0 ? geoComments.citableSnippets : undefined,
        schemaHints: geoComments.schemaHints.length > 0 ? geoComments.schemaHints : undefined,
        interlinking: {
          linksInserted: (il.links_inserted || []).map((l) => ({
            anchorText: l.anchor_text,
            targetUrl: l.target_url,
            section: l.section,
          })),
          suggestions: (il.suggestions || []).map((s) => ({
            anchorText: s.anchor_text,
            targetUrl: s.target_url,
            contextSentence: s.context_sentence,
            relevanceScore: s.relevance_score,
          })),
          reverseSuggestions: (il.reverse_suggestions || []).map((r) => ({
            sourceUrl: r.source_url,
            anchorText: r.anchor_text,
            insertionContext: r.insertion_context,
          })),
        },
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Article Assembler] Error:", msg);
    return { success: false, error: msg };
  }
}
