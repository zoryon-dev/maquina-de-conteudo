/**
 * Article Wizard — Pipeline Orchestrator
 *
 * Orchestrates article pipeline stages, updating progress in the database.
 * Each stage is independent and can be triggered separately via the worker.
 *
 * Follows the same handler pattern as wizard-services worker:
 * - Handlers throw errors (caught by worker infrastructure)
 * - Progress tracked via updateArticleProgress()
 * - JSONB parsed safely (object or string)
 */

import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getArticleModel } from "./llm";
import { runArticleResearch } from "./research.service";
import { generateOutlines } from "./outline.service";
import { produceSections } from "./section-producer.service";
import { assembleArticle } from "./assembler.service";
import { analyzeSeo } from "./seo-analyzer.service";
import { optimizeSeo } from "./seo-optimizer.service";
import { generateTitles } from "./title-generator.service";
import type { ArticleOutline, ProducedSection } from "../types";

// ============================================================================
// SAFE JSONB PARSING (ref: known-error 032-json-parse-object-error)
// ============================================================================

function parseJSONB<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================================
// PROGRESS UPDATE
// ============================================================================

async function updateArticleProgress(
  articleId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .update(articles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(articles.id, articleId));
}

// ============================================================================
// HANDLER: ARTICLE_RESEARCH
// ============================================================================

export async function handleArticleResearch(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);

  const result = await runArticleResearch({
    referenceUrl: article.referenceUrl ?? undefined,
    referenceMotherUrl: article.referenceMotherUrl ?? undefined,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    model,
    onProgress: async (stage, percent, message) => {
      await updateArticleProgress(articleId, {
        processingProgress: { stage, percent, message },
      });
    },
  });

  if (!result.success) throw new Error(result.error);

  await updateArticleProgress(articleId, {
    extractedBaseContent: result.data.extractedBaseContent ? { content: result.data.extractedBaseContent } : null,
    extractedMotherContent: result.data.extractedMotherContent ? { content: result.data.extractedMotherContent } : null,
    researchResults: result.data.researchResults ? { raw: result.data.researchResults } : null,
    synthesizedResearch: result.data.synthesizedResearch ? { raw: result.data.synthesizedResearch } : null,
    currentStep: "outline",
  });
}

// ============================================================================
// HANDLER: ARTICLE_OUTLINE
// ============================================================================

export async function handleArticleOutline(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const synthesized = parseJSONB<{ raw: string }>(article.synthesizedResearch);

  const result = await generateOutlines({
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    targetWordCount: article.targetWordCount || 2000,
    synthesizedResearch: synthesized?.raw || "",
    customInstructions: article.customInstructions ?? undefined,
    model,
  });

  if (!result.success) throw new Error(result.error);

  await updateArticleProgress(articleId, {
    generatedOutlines: result.data,
    processingProgress: { stage: "outline", percent: 100, message: "Outlines gerados!" },
  });
}

// ============================================================================
// HANDLER: ARTICLE_SECTION_PRODUCTION
// ============================================================================

export async function handleArticleSectionProduction(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const outlines = parseJSONB<ArticleOutline[]>(article.generatedOutlines);
  const selectedId = article.selectedOutlineId;

  if (!outlines?.length || !selectedId) {
    throw new Error("No outline selected. Select an outline before producing sections.");
  }

  const selectedOutline = outlines.find((o) => o.id === selectedId);
  if (!selectedOutline) throw new Error(`Outline ${selectedId} not found`);

  const synthesized = parseJSONB<{ raw: string }>(article.synthesizedResearch);

  const result = await produceSections({
    outline: selectedOutline,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    synthesizedResearch: synthesized?.raw || "",
    customInstructions: article.customInstructions ?? undefined,
    model,
    onProgress: async (sectionIndex, totalSections, heading) => {
      await updateArticleProgress(articleId, {
        processingProgress: {
          stage: "section_production",
          percent: Math.round(((sectionIndex + 1) / totalSections) * 100),
          message: `Produzindo seção ${sectionIndex + 1}/${totalSections}: ${heading}`,
          currentSection: sectionIndex + 1,
          totalSections,
        },
      });
    },
  });

  if (!result.success) throw new Error(result.error);

  await updateArticleProgress(articleId, {
    producedSections: result.data,
    currentStep: "assembly",
  });
}

// ============================================================================
// HANDLER: ARTICLE_ASSEMBLY
// ============================================================================

export async function handleArticleAssembly(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const sections = parseJSONB<ProducedSection[]>(article.producedSections);
  if (!sections?.length) throw new Error("No produced sections found");

  const result = await assembleArticle({
    sections,
    primaryKeyword: article.primaryKeyword!,
    articleType: article.articleType || "guia",
    authorName: article.authorName ?? undefined,
    model,
  });

  if (!result.success) throw new Error(result.error);

  await updateArticleProgress(articleId, {
    assembledContent: result.data.assembledArticle,
    currentStep: "seo_geo_check",
    processingProgress: { stage: "assembly", percent: 100, message: "Artigo montado!" },
  });
}

// ============================================================================
// HANDLER: ARTICLE_SEO_GEO_CHECK
// ============================================================================

export async function handleArticleSeoGeoCheck(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const content = article.assembledContent || article.optimizedContent;
  if (!content) throw new Error("No assembled content found");

  const seoResult = await analyzeSeo({
    articleContent: content,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    targetWordCount: article.targetWordCount || 2000,
    model,
  });

  if (!seoResult.success) throw new Error(seoResult.error);

  await updateArticleProgress(articleId, {
    seoScore: seoResult.data.overallScore,
    seoReport: seoResult.data,
    processingProgress: { stage: "seo_check", percent: 100, message: `SEO Score: ${seoResult.data.overallScore}/100` },
  });
}

// ============================================================================
// HANDLER: ARTICLE_OPTIMIZATION
// ============================================================================

export async function handleArticleOptimization(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const content = article.assembledContent;
  const seoReport = parseJSONB<Record<string, unknown>>(article.seoReport);

  if (!content || !seoReport) throw new Error("No content or SEO report found");

  const result = await optimizeSeo({
    articleContent: content,
    seoReport: JSON.stringify(seoReport),
    primaryKeyword: article.primaryKeyword!,
    model,
  });

  if (!result.success) throw new Error(result.error);

  // Generate titles
  const titlesResult = await generateTitles({
    articleContent: result.data.optimizedArticle,
    primaryKeyword: article.primaryKeyword!,
    articleType: article.articleType || "guia",
    currentTitle: article.title ?? undefined,
    model,
  });

  await updateArticleProgress(articleId, {
    optimizedContent: result.data.optimizedArticle,
    finalContent: result.data.optimizedArticle,
    finalWordCount: result.data.optimizedArticle.split(/\s+/).length,
    seoScore: result.data.newSeoScoreEstimate,
    geoScore: result.data.newGeoScoreEstimate,
    finalTitle: titlesResult.success ? titlesResult.data.titles.find((t) => t.id === titlesResult.data.recommended)?.text : article.title,
    currentStep: "metadata",
    processingProgress: { stage: "optimization", percent: 100, message: "Artigo otimizado!" },
  });
}
