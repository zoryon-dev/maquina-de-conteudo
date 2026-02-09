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
import { getArticleModel, getModelForStep, type ArticlePipelineStep } from "./llm";
import { createJob } from "@/lib/queue/jobs";
import { triggerWorker } from "@/lib/queue/client";
import { JobType } from "@/lib/queue/types";
import { runArticleResearch } from "./research.service";
import { generateOutlines } from "./outline.service";
import { produceSections } from "./section-producer.service";
import { assembleArticle } from "./assembler.service";
import { analyzeSeo } from "./seo-analyzer.service";
import { optimizeSeo } from "./seo-optimizer.service";
import { generateTitles } from "./title-generator.service";
import { analyzeInterlinking } from "./interlinking.service";
import { generateArticleMetadata } from "./metadata.service";
import type { ArticleOutline, ProducedSection, SiteUrlMapEntry, BrandVoiceProfile } from "../types";
import { siteIntelligence, articleLinks, articleMetadata } from "@/db/schema";
import { getUserVariables, enhancePromptWithVariables, type UserVariables } from "@/lib/wizard-services/user-variables.service";
import { assembleRagContext } from "@/lib/rag/assembler";

// ============================================================================
// SAFE JSONB PARSING (ref: known-error 032-json-parse-object-error)
// Drizzle pode retornar JSONB como objeto já-parsed ou como string serializada,
// dependendo do contexto. Esta função lida com ambos os casos.
// ============================================================================

export function parseJSONB<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      const preview = value.slice(0, 200);
      console.error(
        `[parseJSONB] Failed to parse string value (${value.length} chars): "${preview}${value.length > 200 ? "..." : ""}"`,
      );
      return null;
    }
  }
  return null;
}

// ============================================================================
// USER CONTEXT — Variables + RAG
// ============================================================================

interface UserContext {
  variables: UserVariables;
  variablesPrompt: string;
  ragContext: string;
}

async function getUserContext(
  userId: string,
  ragConfig: { mode?: string; threshold?: number; maxChunks?: number; documents?: number[]; collections?: number[] } | null,
  ragQuery: string,
): Promise<UserContext> {
  // Fetch user variables (always — graceful if empty)
  const variables = await getUserVariables(userId);
  const { context: variablesPrompt } = await import("@/lib/wizard-services/user-variables.service").then(
    (m) => m.formatVariablesForPrompt(variables),
  );

  // Fetch RAG context if configured
  let ragContext = "";
  const shouldUseRag = ragConfig && ragConfig.mode !== "off";
  if (shouldUseRag) {
    try {
      const ragResult = await assembleRagContext(userId, ragQuery, {
        threshold: ragConfig.threshold,
        maxChunks: ragConfig.maxChunks,
        documentIds: ragConfig.documents,
      });
      if (ragResult.context) {
        ragContext = ragResult.context;
      }
    } catch (err) {
      console.warn("[Article Pipeline] RAG context fetch failed, continuing without:", err instanceof Error ? err.message : err);
    }
  }

  return { variables, variablesPrompt, ragContext };
}

// ============================================================================
// MODEL RESOLUTION HELPER
// ============================================================================

type ModelConfigType = { default?: string; research?: string; outline?: string; production?: string; optimization?: string; image?: string };

function resolveModel(article: { model: string | null; modelConfig: unknown }, step: ArticlePipelineStep): string {
  const config = parseJSONB<ModelConfigType>(article.modelConfig);
  return getModelForStep(config, article.model, step);
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
// LOAD ARTICLE HELPER
// ============================================================================

async function loadArticle(
  payload: unknown,
  handlerName: string,
) {
  const { articleId } = payload as { articleId: number };
  console.log(`[Article Pipeline] ${handlerName}: starting for article ${articleId}`);
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new Error(`Article ${articleId} not found`);
  return { articleId, article };
}

// ============================================================================
// HANDLER: ARTICLE_RESEARCH
// ============================================================================

export async function handleArticleResearch(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleResearch");

  const model = resolveModel(article, "research");

  // Fetch user context (variables + RAG)
  const ragConfig = parseJSONB<{ mode?: string; threshold?: number; maxChunks?: number; documents?: number[]; collections?: number[] }>(article.ragConfig);
  const userCtx = await getUserContext(
    article.userId,
    ragConfig,
    `Research context for article about: ${article.primaryKeyword}`,
  );

  const result = await runArticleResearch({
    referenceUrl: article.referenceUrl ?? undefined,
    referenceMotherUrl: article.referenceMotherUrl ?? undefined,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    model,
    userVariablesPrompt: userCtx.variablesPrompt,
    ragContext: userCtx.ragContext,
    onProgress: async (stage, percent, message) => {
      await updateArticleProgress(articleId, {
        processingProgress: { stage, percent, message },
      });
    },
  });

  if (!result.success) throw new Error(result.error);

  console.log(`[Article Pipeline] Research complete for article ${articleId}, auto-chaining outline`);

  await updateArticleProgress(articleId, {
    extractedBaseContent: result.data.extractedBaseContent ? { content: result.data.extractedBaseContent } : null,
    extractedMotherContent: result.data.extractedMotherContent ? { content: result.data.extractedMotherContent } : null,
    researchResults: result.data.researchResults ? { raw: result.data.researchResults } : null,
    synthesizedResearch: result.data.synthesizedResearch ? { raw: result.data.synthesizedResearch } : null,
    currentStep: "outline",
    processingProgress: { stage: "outline", percent: 0, message: "Iniciando geração de outlines..." },
  });

  // Auto-create outline job so the pipeline continues
  await createJob(article.userId, JobType.ARTICLE_OUTLINE, {
    articleId: article.id,
    userId: article.userId,
  });
  if (process.env.NODE_ENV === "development") {
    triggerWorker().catch(console.error);
  }
}

// ============================================================================
// HANDLER: ARTICLE_OUTLINE
// ============================================================================

export async function handleArticleOutline(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleOutline");

  const model = resolveModel(article, "outline");
  const synthesized = parseJSONB<{ raw: string }>(article.synthesizedResearch);
  if (!synthesized?.raw) {
    throw new Error("synthesizedResearch is missing or corrupt — cannot generate outline without research data");
  }

  // Fetch user variables for prompt enrichment
  const userVariables = await getUserVariables(article.userId);
  const { context: variablesPrompt } = (await import("@/lib/wizard-services/user-variables.service")).formatVariablesForPrompt(userVariables);

  const result = await generateOutlines({
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    targetWordCount: article.targetWordCount || 2000,
    synthesizedResearch: synthesized.raw,
    customInstructions: article.customInstructions
      ? `${article.customInstructions}${variablesPrompt ? `\n\n${variablesPrompt}` : ""}`
      : variablesPrompt || undefined,
    model,
  });

  if (!result.success) throw new Error(result.error);

  console.log(`[Article Pipeline] Outline generation complete for article ${articleId} (${result.data.length} outlines)`);

  await updateArticleProgress(articleId, {
    generatedOutlines: result.data,
    processingProgress: { stage: "outline", percent: 100, message: "Outlines gerados!" },
  });
}

// ============================================================================
// HANDLER: ARTICLE_SECTION_PRODUCTION
// ============================================================================

export async function handleArticleSectionProduction(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleSectionProduction");

  const model = resolveModel(article, "production");
  const outlines = parseJSONB<ArticleOutline[]>(article.generatedOutlines);
  const selectedId = article.selectedOutlineId;

  if (!outlines?.length || !selectedId) {
    throw new Error("No outline selected. Select an outline before producing sections.");
  }

  const selectedOutline = outlines.find((o) => o.id === selectedId);
  if (!selectedOutline) throw new Error(`Outline ${selectedId} not found`);

  const synthesized = parseJSONB<{ raw: string }>(article.synthesizedResearch);
  if (!synthesized?.raw) {
    throw new Error("synthesizedResearch is missing or corrupt — cannot produce sections without research data");
  }

  // Fetch user context (variables + RAG + brand voice)
  const ragConfig = parseJSONB<{ mode?: string; threshold?: number; maxChunks?: number; documents?: number[]; collections?: number[] }>(article.ragConfig);
  const userCtx = await getUserContext(
    article.userId,
    ragConfig,
    `Content production for article about: ${article.primaryKeyword} - ${selectedOutline.title}`,
  );

  // Load brand voice from site intelligence
  let brandVoiceProfile: BrandVoiceProfile | undefined;
  if (article.projectId) {
    const [si] = await db
      .select({ brandVoiceProfile: siteIntelligence.brandVoiceProfile })
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, article.projectId))
      .limit(1);
    if (si?.brandVoiceProfile) {
      brandVoiceProfile = parseJSONB<BrandVoiceProfile>(si.brandVoiceProfile) ?? undefined;
    }
  }

  const result = await produceSections({
    outline: selectedOutline,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    articleType: article.articleType || "guia",
    synthesizedResearch: synthesized.raw,
    ragContext: userCtx.ragContext || undefined,
    brandVoiceProfile,
    customInstructions: article.customInstructions
      ? `${article.customInstructions}${userCtx.variablesPrompt ? `\n\n${userCtx.variablesPrompt}` : ""}`
      : userCtx.variablesPrompt || undefined,
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

  // Detect partial failure (some sections have status: "failed")
  const failedSections = result.data.filter((s) => s.status === "failed");
  if (failedSections.length > 0) {
    console.warn(
      `[Article Pipeline] Partial section production for article ${articleId}: ${failedSections.length}/${result.data.length} sections failed`,
    );
    // Save partial results so the user can retry or edit
    await updateArticleProgress(articleId, { producedSections: result.data });
    throw new Error(
      `Section production partially failed: ${failedSections.length} of ${result.data.length} sections could not be produced`,
    );
  }

  console.log(`[Article Pipeline] Section production complete for article ${articleId}, auto-chaining assembly`);

  await updateArticleProgress(articleId, {
    producedSections: result.data,
    // Keep currentStep as "production" — assembly will change it to "assembly" when done
    processingProgress: { stage: "assembly", percent: 0, message: "Montando artigo completo..." },
  });

  // Auto-create assembly job (same pattern as research → outline)
  await createJob(article.userId, JobType.ARTICLE_ASSEMBLY, {
    articleId: article.id,
    userId: article.userId,
  });
  if (process.env.NODE_ENV === "development") {
    triggerWorker().catch(console.error);
  }
}

// ============================================================================
// HANDLER: ARTICLE_ASSEMBLY
// ============================================================================

export async function handleArticleAssembly(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleAssembly");

  const model = resolveModel(article, "production");
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

  console.log(`[Article Pipeline] Assembly complete for article ${articleId}`);

  await updateArticleProgress(articleId, {
    assembledContent: result.data.assembledArticle,
    currentStep: "assembly", // Review step — user reviews assembled content then submits SEO
    processingProgress: { stage: "assembly", percent: 100, message: "Artigo montado!" },
  });
}

// ============================================================================
// GEO REPORT BUILDER — transforms unified V2 data to UI-compatible shape
// ============================================================================

const IMPACT_EN_TO_PT: Record<string, string> = { high: "alto", medium: "médio", low: "baixo", critical: "alto" };

function buildGeoReportForUI(seoReport: import("../types").SeoReport) {
  const geoFixes = (seoReport.priorityFixes || [])
    .filter((f) => f.category === "geo" || f.category === "both")
    .map((f) => ({
      fix: f.description,
      impact: IMPACT_EN_TO_PT[f.impact] || f.impact,
      effort: IMPACT_EN_TO_PT[f.effort] || f.effort,
      criterion: f.category,
      estimatedScoreImprovement: 0,
    }));

  const aiCitationProbability = seoReport.geoAnalysis?.aiCitationProbability
    ? { score: seoReport.geoScore ?? 0, assessment: seoReport.geoAnalysis.aiCitationProbability }
    : undefined;

  return {
    overallScore: seoReport.geoScore ?? 0,
    // V2 unified analyzer does not produce 6-criteria breakdown.
    // GeoScoreCard handles missing criteria via `if (!sub) return null`.
    priorityFixes: geoFixes,
    aiCitationProbability,
  };
}

// ============================================================================
// HANDLER: ARTICLE_SEO_GEO_CHECK
// ============================================================================

export async function handleArticleSeoGeoCheck(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleSeoGeoCheck");

  const model = resolveModel(article, "optimization");
  const content = article.assembledContent || article.optimizedContent;
  if (!content) throw new Error("No assembled content found");

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "seo_check", percent: 10, message: "Analisando SEO + GEO (unified)..." },
  });

  // V2: Single unified SEO+GEO analysis (replaces parallel SEO + GEO calls)
  const seoResult = await analyzeSeo({
    articleContent: content,
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    targetWordCount: article.targetWordCount || 2000,
    model,
  });

  if (!seoResult.success) throw new Error(seoResult.error);

  const seoMsg = `SEO: ${seoResult.data.overallScore}/100`;
  const geoMsg = seoResult.data.geoScore != null ? ` | GEO: ${seoResult.data.geoScore}/100` : "";
  const unifiedMsg = seoResult.data.unifiedScore != null ? ` | Unified: ${seoResult.data.unifiedScore}/100` : "";

  // Build GeoReport in the shape expected by the UI (GeoScoreCard)
  // V2 unified analyzer doesn't produce 6-criteria breakdown — UI handles missing criteria gracefully
  const geoReport = seoResult.data.geoAnalysis ? buildGeoReportForUI(seoResult.data) : null;

  await updateArticleProgress(articleId, {
    seoScore: seoResult.data.overallScore,
    seoReport: seoResult.data,
    geoScore: seoResult.data.geoScore ?? null,
    geoReport,
    processingProgress: { stage: "seo_check", percent: 100, message: seoMsg + geoMsg + unifiedMsg },
  });
}

// ============================================================================
// HANDLER: ARTICLE_OPTIMIZATION
// ============================================================================

export async function handleArticleOptimization(payload: unknown): Promise<void> {
  const { articleId, article } = await loadArticle(payload, "handleArticleOptimization");

  const model = resolveModel(article, "optimization");
  const content = article.assembledContent;
  const seoReport = parseJSONB<Record<string, unknown>>(article.seoReport);

  if (!content || !seoReport) throw new Error("No content or SEO report found");

  await updateArticleProgress(articleId, {
    processingProgress: { stage: "optimization", percent: 10, message: "Otimizando SEO + GEO (unified)..." },
  });

  // Load brand voice if available
  let brandVoiceProfile: string | undefined;
  if (article.projectId) {
    const [si] = await db
      .select({ brandVoiceProfile: siteIntelligence.brandVoiceProfile })
      .from(siteIntelligence)
      .where(eq(siteIntelligence.projectId, article.projectId))
      .limit(1);
    if (si?.brandVoiceProfile) {
      brandVoiceProfile = JSON.stringify(parseJSONB<BrandVoiceProfile>(si.brandVoiceProfile));
    }
  }

  // V2: Single unified optimizer call (replaces SEO-only + conditional GEO-02)
  const result = await optimizeSeo({
    articleContent: content,
    unifiedReport: JSON.stringify(seoReport),
    primaryKeyword: article.primaryKeyword!,
    secondaryKeywords: parseJSONB<string[]>(article.secondaryKeywords) ?? undefined,
    brandVoiceProfile,
    model,
  });

  if (!result.success) throw new Error(result.error);

  const finalContent = result.data.optimizedArticle;

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
    geoScore: result.data.newGeoScoreEstimate,
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

  const { article } = await loadArticle(payload, "handleArticleInterlinking");

  const model = resolveModel(article, "optimization");
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

  // Delete existing links for this article (in case of re-run)
  await db.delete(articleLinks).where(eq(articleLinks.articleId, articleId));

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

  const { article } = await loadArticle(payload, "handleArticleMetadata");

  const model = resolveModel(article, "optimization");
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
    articleType: article.articleType || "guia",
    siteCategories,
    brandVoiceProfile,
    model,
  });

  if (!result.success) throw new Error(result.error);

  // Delete existing metadata for this article (in case of re-run)
  await db.delete(articleMetadata).where(eq(articleMetadata.articleId, articleId));

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
