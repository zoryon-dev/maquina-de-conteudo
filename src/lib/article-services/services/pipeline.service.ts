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
import { analyzeGeo } from "./geo-analyzer.service";
import { optimizeGeo } from "./geo-optimizer.service";
import { generateTitles } from "./title-generator.service";
import { analyzeInterlinking } from "./interlinking.service";
import { generateArticleMetadata } from "./metadata.service";
import type { ArticleOutline, ProducedSection, SiteUrlMapEntry, BrandVoiceProfile } from "../types";
import { siteIntelligence, articleLinks, articleMetadata } from "@/db/schema";

// ============================================================================
// SAFE JSONB PARSING (ref: known-error 032-json-parse-object-error)
// ============================================================================

export function parseJSONB<T>(value: unknown): T | null {
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

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "seo_check", percent: 10, message: "Analisando SEO e GEO em paralelo..." },
  });

  // Run SEO and GEO analysis in parallel
  const [seoResult, geoResult] = await Promise.all([
    analyzeSeo({
      articleContent: content,
      primaryKeyword: article.primaryKeyword!,
      secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
      targetWordCount: article.targetWordCount || 2000,
      model,
    }),
    analyzeGeo({
      articleContent: content,
      primaryKeyword: article.primaryKeyword!,
      model,
    }),
  ]);

  if (!seoResult.success) throw new Error(seoResult.error);

  // GEO is optional — don't fail the pipeline if it fails
  const geoData = geoResult.success ? geoResult.data : null;
  if (!geoResult.success) {
    console.warn("[Article Pipeline] GEO analysis failed, continuing with SEO only:", geoResult.error);
  }

  const seoMsg = `SEO: ${seoResult.data.overallScore}/100`;
  const geoMsg = geoData ? ` | GEO: ${geoData.overallScore}/100` : "";

  await updateArticleProgress(articleId, {
    seoScore: seoResult.data.overallScore,
    seoReport: seoResult.data,
    geoScore: geoData?.overallScore ?? null,
    geoReport: geoData ? {
      overallScore: geoData.overallScore,
      targetQueries: geoData.targetQueries,
      directAnswers: geoData.breakdown.directAnswers,
      citableData: geoData.breakdown.citableData,
      extractableStructure: geoData.breakdown.extractableStructure,
      authorityEeat: geoData.breakdown.authorityEeat,
      topicCoverage: geoData.breakdown.topicCoverage,
      schemaMetadata: geoData.breakdown.schemaMetadata,
      priorityFixes: geoData.priorityFixes,
      aiCitationProbability: geoData.aiCitationProbability,
    } : null,
    processingProgress: { stage: "seo_check", percent: 100, message: seoMsg + geoMsg },
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
  const geoReport = parseJSONB<Record<string, unknown>>(article.geoReport);

  if (!content || !seoReport) throw new Error("No content or SEO report found");

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "optimization", percent: 10, message: "Otimizando SEO" + (geoReport ? " + GEO" : "") + "..." },
  });

  // Pass GEO data to the unified SEO+GEO optimizer if available
  const geoFixes = geoReport
    ? JSON.stringify((geoReport as any).priorityFixes || [])
    : undefined;

  const result = await optimizeSeo({
    articleContent: content,
    seoReport: JSON.stringify(seoReport),
    primaryKeyword: article.primaryKeyword!,
    geoReport: geoReport ? JSON.stringify(geoReport) : undefined,
    geoFixes,
    model,
  });

  if (!result.success) throw new Error(result.error);

  let finalContent = result.data.optimizedArticle;
  let finalGeoScore = result.data.newGeoScoreEstimate;

  // If GEO report exists and score is below threshold, run dedicated GEO-02 optimizer
  if (geoReport && (geoReport as any).overallScore < 70) {
    // Load brand voice if available
    let brandVoice: string | undefined;
    if (article.projectId) {
      const [si] = await db
        .select({ brandVoiceProfile: siteIntelligence.brandVoiceProfile })
        .from(siteIntelligence)
        .where(eq(siteIntelligence.projectId, article.projectId))
        .limit(1);
      if (si?.brandVoiceProfile) {
        brandVoice = JSON.stringify(parseJSONB<BrandVoiceProfile>(si.brandVoiceProfile));
      }
    }

    const geoOptResult = await optimizeGeo({
      articleContent: finalContent,
      geoReport: JSON.stringify(geoReport),
      priorityFixes: geoFixes || "[]",
      brandVoiceProfile: brandVoice,
      model,
    });

    if (geoOptResult.success) {
      finalContent = geoOptResult.data.optimizedArticle;
      finalGeoScore = geoOptResult.data.estimatedNewScores.geoScoreOverall;
    } else {
      console.warn("[Article Pipeline] GEO optimization failed, using SEO-only result:", geoOptResult.error);
    }
  }

  // Generate titles
  const titlesResult = await generateTitles({
    articleContent: finalContent,
    primaryKeyword: article.primaryKeyword!,
    articleType: article.articleType || "guia",
    currentTitle: article.title ?? undefined,
    model,
  });

  await updateArticleProgress(articleId, {
    optimizedContent: finalContent,
    finalContent,
    finalWordCount: finalContent.split(/\s+/).length,
    seoScore: result.data.newSeoScoreEstimate,
    geoScore: finalGeoScore,
    finalTitle: titlesResult.success ? titlesResult.data.titles.find((t) => t.id === titlesResult.data.recommended)?.text : article.title,
    currentStep: "metadata",
    processingProgress: { stage: "optimization", percent: 100, message: "Artigo otimizado!" },
  });
}

// ============================================================================
// HANDLER: ARTICLE_INTERLINKING
// ============================================================================

export async function handleArticleInterlinking(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "interlinking", percent: 10, message: "Analisando links internos..." },
  });

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const content = article.optimizedContent || article.assembledContent;
  if (!content) throw new Error("No article content found");

  // Load site URL map from project's site intelligence
  let urlMap: SiteUrlMapEntry[] = [];
  if (article.projectId) {
    const [si] = await db
      .select()
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, article.projectId))
      .limit(1);

    if (si?.urlMap && Array.isArray(si.urlMap)) {
      urlMap = si.urlMap as SiteUrlMapEntry[];
    }
  }

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "interlinking", percent: 40, message: "Buscando links relevantes..." },
  });

  const result = await analyzeInterlinking(
    content,
    article.primaryKeyword || "",
    urlMap,
    "auto",
    6,
    model,
  );

  if (!result.success) throw new Error(result.error);

  // Save article with links
  if (result.data.articleWithLinks) {
    await updateArticleProgress(articleId, {
      assembledWithLinks: result.data.articleWithLinks,
    });
  }

  // Save link suggestions to articleLinks table
  for (const suggestion of result.data.suggestions) {
    await db.insert(articleLinks).values({
      articleId,
      targetUrl: suggestion.targetUrl,
      anchorText: suggestion.anchorText,
      relevanceScore: Math.round(suggestion.relevanceScore),
      insertionPoint: suggestion.insertionPoint,
      rationale: suggestion.rationale,
      isReverse: false,
      status: result.data.mode === "auto" ? "approved" : "suggested",
    });
  }

  // Save reverse suggestions
  for (const reverse of result.data.reverseSuggestions) {
    await db.insert(articleLinks).values({
      articleId,
      targetUrl: reverse.sourceUrl,
      anchorText: reverse.anchorText,
      relevanceScore: Math.round(reverse.relevanceScore ?? 0),
      insertionPoint: reverse.insertionContext,
      rationale: reverse.rationale ?? "",
      isReverse: true,
      status: "suggested",
    });
  }

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "interlinking", percent: 100, message: "Links internos inseridos!" },
  });
}

// ============================================================================
// HANDLER: ARTICLE_METADATA
// ============================================================================

export async function handleArticleMetadata(payload: unknown): Promise<void> {
  const { articleId } = payload as { articleId: number };

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "metadata", percent: 10, message: "Gerando metadados SEO..." },
  });

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);

  const model = getArticleModel(article.model ?? undefined);
  const content = article.optimizedContent || article.assembledContent;
  if (!content) throw new Error("No article content found");

  // Load brand voice if project has SI
  let brandVoiceProfile;
  let siteCategories: string[] | undefined;
  if (article.projectId) {
    const [si] = await db
      .select()
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, article.projectId))
      .limit(1);

    if (si?.brandVoiceProfile) {
      brandVoiceProfile = si.brandVoiceProfile as any;
    }
    if (si?.urlMap && Array.isArray(si.urlMap)) {
      const categories = [...new Set((si.urlMap as SiteUrlMapEntry[]).map((e) => e.category).filter(Boolean))];
      if (categories.length > 0) siteCategories = categories as string[];
    }
  }

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "metadata", percent: 40, message: "Analisando artigo para metadados..." },
  });

  const result = await generateArticleMetadata({
    articleContent: content,
    primaryKeyword: article.primaryKeyword || "",
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) || [],
    brandName: article.authorName || "Blog",
    authorName: article.authorName || "Autor",
    siteCategories,
    brandVoiceProfile,
    model,
  });

  if (!result.success) throw new Error(result.error);

  // Save to articleMetadata table
  await db.insert(articleMetadata).values({
    articleId,
    metaTitles: result.data.metaTitles as any,
    metaDescriptions: result.data.metaDescriptions as any,
    slug: result.data.slug,
    altTexts: result.data.altTexts as any,
    schemaArticle: result.data.schemaArticle as any,
    schemaFaq: result.data.schemaFaq as any ?? null,
    schemaHowto: result.data.schemaHowto as any ?? null,
    schemaBreadcrumb: result.data.schemaBreadcrumb as any ?? null,
    reverseAnchors: result.data.reverseAnchors as any,
  });

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "metadata", percent: 100, message: "Metadados gerados!" },
  });
}
