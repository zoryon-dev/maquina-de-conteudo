/**
 * Article Wizard — Extension Service
 *
 * Diagnoses, plans, and expands existing articles.
 * Three-step pipeline: EXT-01 → EXT-02 → EXT-03.
 */

import type { ServiceResult, ArticleDiagnosis, SiteUrlMapEntry } from "../types";
import { getArticleSystemPrompt, extractArticleJSON } from "../prompts";
import {
  getArticleDiagnosticianPrompt,
  getExpansionPlannerPrompt,
  getContentExpanderPrompt,
} from "../prompts/extension";
import { articleLlmCall } from "./llm";

// ============================================================================
// EXT-01 — Diagnose Article
// ============================================================================

interface DiagnosisResponse {
  article_url: string;
  target_keyword: string;
  current_metrics: {
    word_count: number;
    heading_count: { h2: number; h3: number };
    internal_links: number;
    external_links: number;
    images: number;
    estimated_seo_score: number;
    estimated_geo_score: number;
  };
  competitor_benchmark: {
    avg_word_count: number;
    avg_heading_count: number;
    avg_internal_links: number;
    top_competitor: { url: string; word_count: number; strengths: string[] };
  };
  weak_sections: Array<{
    heading: string;
    current_word_count: number;
    competitor_avg_word_count: number;
    depth_assessment: string;
    issues: string[];
    proposed_expansion: string;
    estimated_word_count_after: number;
    impact: string;
  }>;
  missing_sections: Array<{
    topic: string;
    covered_by: string[];
    proposed_heading: string;
    proposed_outline: string[];
    estimated_word_count: number;
    impact: string;
    rationale: string;
  }>;
  seo_fixes: Array<{
    category: string;
    issue: string;
    fix: string;
    impact: string;
    effort: string;
  }>;
  geo_fixes: Array<{
    criterion: string;
    issue: string;
    fix: string;
    impact: string;
    effort: string;
  }>;
  interlinking_opportunities: Array<{
    type: string;
    target_url: string;
    target_title: string;
    suggested_anchor: string;
    impact: string;
  }>;
  projected_after_all_fixes: {
    word_count: number;
    seo_score: number;
    geo_score: number;
    improvement_summary: string;
  };
  priority_ranking: string[];
}

export interface ExtensionDiagnosis {
  articleUrl: string;
  targetKeyword: string;
  currentMetrics: {
    wordCount: number;
    headingCount: { h2: number; h3: number };
    internalLinks: number;
    externalLinks: number;
    images: number;
    estimatedSeoScore: number;
    estimatedGeoScore: number;
  };
  competitorBenchmark: {
    avgWordCount: number;
    avgHeadingCount: number;
    avgInternalLinks: number;
    topCompetitor: { url: string; wordCount: number; strengths: string[] };
  };
  weakSections: Array<{
    heading: string;
    currentWordCount: number;
    competitorAvgWordCount: number;
    depthAssessment: string;
    issues: string[];
    proposedExpansion: string;
    estimatedWordCountAfter: number;
    impact: string;
  }>;
  missingSections: Array<{
    topic: string;
    coveredBy: string[];
    proposedHeading: string;
    proposedOutline: string[];
    estimatedWordCount: number;
    impact: string;
    rationale: string;
  }>;
  seoFixes: Array<{ category: string; issue: string; fix: string; impact: string; effort: string }>;
  geoFixes: Array<{ criterion: string; issue: string; fix: string; impact: string; effort: string }>;
  interlinkingOpportunities: Array<{ type: string; targetUrl: string; targetTitle: string; suggestedAnchor: string; impact: string }>;
  projectedAfterFixes: {
    wordCount: number;
    seoScore: number;
    geoScore: number;
    improvementSummary: string;
  };
  priorityRanking: string[];
}

export async function diagnoseArticle(params: {
  originalArticle: string;
  originalUrl: string;
  competitorArticles: string;
  targetKeyword: string;
  siteUrlMap?: SiteUrlMapEntry[];
  model: string;
}): Promise<ServiceResult<ExtensionDiagnosis>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getArticleDiagnosticianPrompt({
      originalArticle: params.originalArticle,
      originalUrl: params.originalUrl,
      competitorArticles: params.competitorArticles,
      targetKeyword: params.targetKeyword,
      siteUrlMap: params.siteUrlMap,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.2 });
    const parsed = extractArticleJSON<DiagnosisResponse>(response);
    if (!parsed) return { success: false, error: "Failed to parse diagnosis response" };

    const m = parsed.current_metrics;
    const cb = parsed.competitor_benchmark;
    const p = parsed.projected_after_all_fixes;

    const result: ExtensionDiagnosis = {
      articleUrl: parsed.article_url,
      targetKeyword: parsed.target_keyword,
      currentMetrics: {
        wordCount: m.word_count,
        headingCount: m.heading_count,
        internalLinks: m.internal_links,
        externalLinks: m.external_links,
        images: m.images,
        estimatedSeoScore: m.estimated_seo_score,
        estimatedGeoScore: m.estimated_geo_score,
      },
      competitorBenchmark: {
        avgWordCount: cb.avg_word_count,
        avgHeadingCount: cb.avg_heading_count,
        avgInternalLinks: cb.avg_internal_links,
        topCompetitor: { url: cb.top_competitor.url, wordCount: cb.top_competitor.word_count, strengths: cb.top_competitor.strengths },
      },
      weakSections: (parsed.weak_sections || []).map((s) => ({
        heading: s.heading,
        currentWordCount: s.current_word_count,
        competitorAvgWordCount: s.competitor_avg_word_count,
        depthAssessment: s.depth_assessment,
        issues: s.issues,
        proposedExpansion: s.proposed_expansion,
        estimatedWordCountAfter: s.estimated_word_count_after,
        impact: s.impact,
      })),
      missingSections: (parsed.missing_sections || []).map((s) => ({
        topic: s.topic,
        coveredBy: s.covered_by,
        proposedHeading: s.proposed_heading,
        proposedOutline: s.proposed_outline,
        estimatedWordCount: s.estimated_word_count,
        impact: s.impact,
        rationale: s.rationale,
      })),
      seoFixes: parsed.seo_fixes || [],
      geoFixes: parsed.geo_fixes || [],
      interlinkingOpportunities: (parsed.interlinking_opportunities || []).map((o) => ({
        type: o.type,
        targetUrl: o.target_url,
        targetTitle: o.target_title,
        suggestedAnchor: o.suggested_anchor,
        impact: o.impact,
      })),
      projectedAfterFixes: {
        wordCount: p.word_count,
        seoScore: p.seo_score,
        geoScore: p.geo_score,
        improvementSummary: p.improvement_summary,
      },
      priorityRanking: parsed.priority_ranking || [],
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Extension Diagnostician] Error:", msg);
    return { success: false, error: msg };
  }
}

// ============================================================================
// EXT-02 — Plan Expansion
// ============================================================================

export interface ExpansionPlanResult {
  summary: {
    totalFixes: number;
    estimatedTotalWordAddition: number;
    estimatedFinalWordCount: number;
    estimatedFinalSeoScore: number;
    estimatedFinalGeoScore: number;
  };
  sectionExpansions: Array<{
    id: string;
    type: string;
    heading: string;
    currentState: string;
    proposedState: string;
    outline: string[];
    previewContent: string;
    insertionPoint: string;
    estimatedWordCount: number;
    impact: string;
    effort: string;
    dataSourcesSuggested: string[];
    dependencies: string[];
  }>;
  seoFixesDetailed: Array<{
    id: string;
    category: string;
    description: string;
    before: string;
    after: string;
    impact: string;
    effort: string;
  }>;
  geoFixesDetailed: Array<{
    id: string;
    criterion: string;
    technique: string;
    description: string;
    location: string;
    before: string;
    after: string;
    impact: string;
    effort: string;
  }>;
  recommendedOrder: string[];
}

export async function planExpansion(params: {
  originalArticle: string;
  diagnosis: string;
  targetKeyword: string;
  brandVoiceProfile?: string;
  model: string;
}): Promise<ServiceResult<ExpansionPlanResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getExpansionPlannerPrompt({
      originalArticle: params.originalArticle,
      diagnosis: params.diagnosis,
      targetKeyword: params.targetKeyword,
      brandVoiceProfile: params.brandVoiceProfile,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.3 });
    const parsed = extractArticleJSON<any>(response);
    if (!parsed) return { success: false, error: "Failed to parse expansion plan response" };

    const ep = parsed.expansion_plan;
    const result: ExpansionPlanResult = {
      summary: {
        totalFixes: ep.total_fixes,
        estimatedTotalWordAddition: ep.estimated_total_word_addition,
        estimatedFinalWordCount: ep.estimated_final_word_count,
        estimatedFinalSeoScore: ep.estimated_final_seo_score,
        estimatedFinalGeoScore: ep.estimated_final_geo_score,
      },
      sectionExpansions: (parsed.section_expansions || []).map((s: any) => ({
        id: s.id,
        type: s.type,
        heading: s.heading,
        currentState: s.current_state,
        proposedState: s.proposed_state,
        outline: s.outline,
        previewContent: s.preview_content,
        insertionPoint: s.insertion_point,
        estimatedWordCount: s.estimated_word_count,
        impact: s.impact,
        effort: s.effort,
        dataSourcesSuggested: s.data_sources_suggested || [],
        dependencies: s.dependencies || [],
      })),
      seoFixesDetailed: (parsed.seo_fixes_detailed || []).map((f: any) => ({
        id: f.id,
        category: f.category,
        description: f.description,
        before: f.before,
        after: f.after,
        impact: f.impact,
        effort: f.effort,
      })),
      geoFixesDetailed: (parsed.geo_fixes_detailed || []).map((f: any) => ({
        id: f.id,
        criterion: f.criterion,
        technique: f.technique,
        description: f.description,
        location: f.location,
        before: f.before,
        after: f.after,
        impact: f.impact,
        effort: f.effort,
      })),
      recommendedOrder: parsed.recommended_execution_order || [],
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Extension Planner] Error:", msg);
    return { success: false, error: msg };
  }
}

// ============================================================================
// EXT-03 — Expand Article
// ============================================================================

export interface ExpansionResult {
  expandedArticle: string;
  changesLog: Array<{
    fixId: string;
    type: string;
    description: string;
    wordCountAdded: number;
    location: string;
  }>;
  metricsAfter: {
    totalWordCount: number;
    wordCountAdded: number;
    newSectionsCount: number;
    expandedSectionsCount: number;
    seoFixesApplied: number;
    geoFixesApplied: number;
  };
  editorReviewNotes: string[];
}

export async function expandArticle(params: {
  originalArticle: string;
  selectedFixes: string[];
  expansionPlan: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  brandVoiceProfile?: string;
  model: string;
}): Promise<ServiceResult<ExpansionResult>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getContentExpanderPrompt({
      originalArticle: params.originalArticle,
      selectedFixes: JSON.stringify(params.selectedFixes),
      expansionPlan: params.expansionPlan,
      targetKeyword: params.targetKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandVoiceProfile: params.brandVoiceProfile,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.4 });
    const parsed = extractArticleJSON<any>(response);
    if (!parsed) return { success: false, error: "Failed to parse expansion response" };

    const result: ExpansionResult = {
      expandedArticle: parsed.expanded_article,
      changesLog: (parsed.changes_log || []).map((c: any) => ({
        fixId: c.fix_id,
        type: c.type,
        description: c.description,
        wordCountAdded: c.word_count_added,
        location: c.location,
      })),
      metricsAfter: {
        totalWordCount: parsed.metrics_after?.total_word_count || 0,
        wordCountAdded: parsed.metrics_after?.word_count_added || 0,
        newSectionsCount: parsed.metrics_after?.new_sections_count || 0,
        expandedSectionsCount: parsed.metrics_after?.expanded_sections_count || 0,
        seoFixesApplied: parsed.metrics_after?.seo_fixes_applied || 0,
        geoFixesApplied: parsed.metrics_after?.geo_fixes_applied || 0,
      },
      editorReviewNotes: parsed.editor_review_notes || [],
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Extension Expander] Error:", msg);
    return { success: false, error: msg };
  }
}
