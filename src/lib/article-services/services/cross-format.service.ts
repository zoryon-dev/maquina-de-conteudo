/**
 * Article Wizard — Cross-Format Service
 *
 * Derives LinkedIn posts, video scripts, and carousels from articles.
 * All 3 formats can run in parallel via Promise.all.
 */

import type {
  ServiceResult,
  LinkedInDerivation,
  VideoScriptDerivation,
  CarouselDerivation,
} from "../types";
import { getArticleSystemPrompt, extractArticleJSON } from "../prompts";
import {
  getLinkedInDeriverPrompt,
  getVideoScriptDeriverPrompt,
  getCarouselDeriverPrompt,
} from "../prompts/cross-format";
import { articleLlmCall } from "./llm";

interface CrossFormatOptions {
  brandVoiceProfile?: string;
  authorPersona?: string;
  instagramHandle?: string;
  targetPlatform?: string;
}

// ============================================================================
// CROSS-01 — LinkedIn Post
// ============================================================================

export async function deriveLinkedInPost(params: {
  articleContent: string;
  articleUrl: string;
  options?: CrossFormatOptions;
  model: string;
}): Promise<ServiceResult<LinkedInDerivation>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getLinkedInDeriverPrompt({
      articleContent: params.articleContent,
      articleUrl: params.articleUrl,
      brandVoiceProfile: params.options?.brandVoiceProfile,
      authorPersona: params.options?.authorPersona,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.5 });
    const parsed = extractArticleJSON<any>(response);
    if (!parsed) return { success: false, error: "Failed to parse LinkedIn derivation response" };

    const result: LinkedInDerivation = {
      hook: parsed.text?.split("\n")[0] || "",
      body: parsed.text || "",
      cta: parsed.first_comment_text || "",
      hashtags: parsed.hashtags || [],
      fullPost: parsed.text || "",
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cross-Format LinkedIn] Error:", msg);
    return { success: false, error: msg };
  }
}

// ============================================================================
// CROSS-02 — Video Script
// ============================================================================

export async function deriveVideoScript(params: {
  articleContent: string;
  articleUrl: string;
  options?: CrossFormatOptions;
  model: string;
}): Promise<ServiceResult<VideoScriptDerivation>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getVideoScriptDeriverPrompt({
      articleContent: params.articleContent,
      articleUrl: params.articleUrl,
      brandVoiceProfile: params.options?.brandVoiceProfile,
      presenterPersona: params.options?.authorPersona,
      targetPlatform: params.options?.targetPlatform,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.5 });
    const parsed = extractArticleJSON<any>(response);
    if (!parsed) return { success: false, error: "Failed to parse video script response" };

    const result: VideoScriptDerivation = {
      title: parsed.suggested_caption?.split("\n")[0] || "",
      hook: parsed.script?.[0]?.spoken || "",
      sections: (parsed.script || []).map((s: any) => ({
        topic: s.type,
        content: s.spoken,
        duration: s.timecode,
        visualNotes: s.visual || "",
      })),
      cta: parsed.script?.[parsed.script.length - 1]?.spoken || "",
      estimatedDuration: parsed.duration_estimate || "60s",
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cross-Format Video] Error:", msg);
    return { success: false, error: msg };
  }
}

// ============================================================================
// CROSS-03 — Carousel
// ============================================================================

export async function deriveCarousel(params: {
  articleContent: string;
  articleUrl: string;
  options?: CrossFormatOptions;
  model: string;
}): Promise<ServiceResult<CarouselDerivation>> {
  try {
    const systemPrompt = getArticleSystemPrompt();
    const userMessage = getCarouselDeriverPrompt({
      articleContent: params.articleContent,
      articleUrl: params.articleUrl,
      brandVoiceProfile: params.options?.brandVoiceProfile,
      instagramHandle: params.options?.instagramHandle,
    });

    const response = await articleLlmCall({ model: params.model, systemPrompt, userMessage, temperature: 0.5 });
    const parsed = extractArticleJSON<any>(response);
    if (!parsed) return { success: false, error: "Failed to parse carousel response" };

    const result: CarouselDerivation = {
      slides: (parsed.slides || []).map((s: any) => ({
        number: s.number,
        title: s.headline || "",
        content: s.body || s.subheadline || "",
        imagePrompt: s.visual_note,
      })),
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
    };

    return { success: true, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cross-Format Carousel] Error:", msg);
    return { success: false, error: msg };
  }
}

// ============================================================================
// PARALLEL DERIVATION — Run all selected formats simultaneously
// ============================================================================

export type DerivationResults = {
  linkedin?: LinkedInDerivation;
  videoScript?: VideoScriptDerivation;
  carousel?: CarouselDerivation;
  errors: string[];
};

export async function deriveAllFormats(params: {
  formats: Array<"linkedin" | "video_script" | "carousel">;
  articleContent: string;
  articleUrl: string;
  options?: CrossFormatOptions;
  model: string;
}): Promise<DerivationResults> {
  const results: DerivationResults = { errors: [] };

  const tasks: Promise<void>[] = [];

  if (params.formats.includes("linkedin")) {
    tasks.push(
      deriveLinkedInPost({
        articleContent: params.articleContent,
        articleUrl: params.articleUrl,
        options: params.options,
        model: params.model,
      }).then((r) => {
        if (r.success) results.linkedin = r.data;
        else results.errors.push(`LinkedIn: ${r.error}`);
      })
    );
  }

  if (params.formats.includes("video_script")) {
    tasks.push(
      deriveVideoScript({
        articleContent: params.articleContent,
        articleUrl: params.articleUrl,
        options: params.options,
        model: params.model,
      }).then((r) => {
        if (r.success) results.videoScript = r.data;
        else results.errors.push(`Video: ${r.error}`);
      })
    );
  }

  if (params.formats.includes("carousel")) {
    tasks.push(
      deriveCarousel({
        articleContent: params.articleContent,
        articleUrl: params.articleUrl,
        options: params.options,
        model: params.model,
      }).then((r) => {
        if (r.success) results.carousel = r.data;
        else results.errors.push(`Carousel: ${r.error}`);
      })
    );
  }

  await Promise.all(tasks);
  return results;
}
