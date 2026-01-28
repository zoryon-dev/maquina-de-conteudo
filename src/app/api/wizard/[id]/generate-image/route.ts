/**
 * Wizard Image Generation API Route
 *
 * POST /api/wizard/[id]/generate-image
 *
 * Generates an image for a wizard using either AI (OpenRouter) or HTML templates (ScreenshotOne).
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  generateAiImage,
  generateHtmlTemplateImage,
  isImageGenerationAvailable,
  isScreenshotOneAvailable,
} from "@/lib/wizard-services";
import type {
  ImageGenerationConfig,
  ImageGenerationInput,
  GeneratedImage as ServiceGeneratedImage,
} from "@/lib/wizard-services";

/**
 * POST /api/wizard/[id]/generate-image
 *
 * Generates an image based on the provided configuration.
 * Supports both AI generation (via OpenRouter) and HTML templates (via ScreenshotOne).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // Verify ownership and get wizard data
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    const body = await request.json();
    const { config }: { config: ImageGenerationConfig } = body;

    if (!config) {
      return NextResponse.json({ error: "Configuration is required" }, { status: 400 });
    }

    // Determine number of slides to generate
    let numberOfSlides = 1;
    if (wizard.generatedContent && typeof wizard.generatedContent === "object") {
      const content = wizard.generatedContent as Record<string, unknown>;
      if (content.slides && Array.isArray(content.slides)) {
        numberOfSlides = content.slides.length;
      }
    }

    // Validate configuration - support both legacy and coverPosts format
    let effectiveConfig: ImageGenerationConfig = config;

    // If using new coverPosts format, convert to legacy format for first slide (cover)
    if (config.coverPosts && !config.method) {
      const cp = config.coverPosts;
      effectiveConfig = {
        method: cp.coverMethod,
        aiOptions: cp.coverAiOptions,
        htmlOptions: cp.coverHtmlOptions,
        coverPosts: cp,
      };
    }

    // Validate configuration
    const hasValidAiConfig = effectiveConfig.method === "ai" && effectiveConfig.aiOptions;
    const hasValidHtmlConfig = effectiveConfig.method === "html-template" && effectiveConfig.htmlOptions;

    if (!hasValidAiConfig && !hasValidHtmlConfig) {
      return NextResponse.json(
        { error: "Invalid configuration for selected method" },
        { status: 400 }
      );
    }

    // Check service availability
    if (effectiveConfig.method === "ai" && !isImageGenerationAvailable()) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 503 }
      );
    }

    if (effectiveConfig.method === "html-template" && !isScreenshotOneAvailable()) {
      return NextResponse.json(
        { error: "ScreenshotOne access key not configured" },
        { status: 503 }
      );
    }

    // Prepare slides for generation
    let slides: Array<{ content: string; title?: string }> = [];
    if (wizard.generatedContent) {
      if (typeof wizard.generatedContent === "string") {
        slides = [{ content: wizard.generatedContent }];
      } else if (typeof wizard.generatedContent === "object") {
        const content = wizard.generatedContent as Record<string, unknown>;
        if (content.slides && Array.isArray(content.slides)) {
          slides = content.slides.map((s: unknown) => {
            const slide = s as Record<string, unknown>;
            return {
              content: String(slide.content || ""),
              title: slide.title ? String(slide.title) : undefined,
            };
          });
        } else if (content.content) {
          slides = [{ content: String(content.content) }];
        }
      }
    }

    // Fallback to theme if no slides found
    if (slides.length === 0) {
      slides = [{ content: wizard.theme || "Conteúdo gerado" }];
    }

    // Generate images for each slide
    const newImages: ServiceGeneratedImage[] = [];
    const cp = config.coverPosts;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideNumber = i + 1;
      const isCover = slideNumber === 1;
      const isLast = slideNumber === slides.length;

      // Determine configuration for this slide
      let slideConfig: ImageGenerationConfig = effectiveConfig;
      if (cp) {
        // Use cover config for first slide, last card config for last slide (if set), posts config for rest
        const isLastCardWithCustomTemplate = isLast && cp.lastCardTemplate && cp.postsMethod === "html-template";

        const method = isLastCardWithCustomTemplate ? "html-template" : (isCover ? cp.coverMethod : cp.postsMethod);
        const aiOptions = isCover ? cp.coverAiOptions : cp.postsAiOptions;

        // For last card with custom template, use lastCardHtmlOptions or fall back to posts
        let htmlOptions = isCover ? cp.coverHtmlOptions : cp.postsHtmlOptions;
        if (isLastCardWithCustomTemplate) {
          htmlOptions = cp.lastCardHtmlOptions || {
            template: cp.lastCardTemplate!,
            primaryColor: cp.postsHtmlOptions?.primaryColor || "#2dd4bf",
            secondaryColor: cp.postsHtmlOptions?.secondaryColor,
          };
          // Override template with lastCardTemplate
          htmlOptions = { ...htmlOptions, template: cp.lastCardTemplate! };
        }

        slideConfig = { method, aiOptions, htmlOptions, coverPosts: cp };
      }

      // Prepare generation input
      const generationInput: ImageGenerationInput = {
        slideTitle: (slide.title || wizard.theme || undefined) as string | undefined,
        slideContent: slide.content,
        slideNumber,
        totalSlides: slides.length, // Pass total slides to determine last card
        config: slideConfig,
        wizardContext: {
          theme: wizard.theme || undefined,
          objective: wizard.objective || undefined,
          targetAudience: wizard.targetAudience || undefined,
        },
      };

      // Generate image based on method
      let result: ServiceGeneratedImage | null = null;

      if (slideConfig.method === "ai") {
        const aiResult = await generateAiImage(generationInput);
        if (!aiResult.success || !aiResult.data) {
          return NextResponse.json(
            { error: aiResult.error || "Failed to generate AI image" },
            { status: 500 }
          );
        }
        result = aiResult.data;
      } else {
        const htmlResult = await generateHtmlTemplateImage(generationInput);
        if (!htmlResult.success || !htmlResult.data) {
          return NextResponse.json(
            { error: htmlResult.error || "Failed to generate template image" },
            { status: 500 }
          );
        }
        result = htmlResult.data;
      }

      if (!result) {
        return NextResponse.json(
          { error: "Failed to generate image" },
          { status: 500 }
        );
      }

      newImages.push(result);
    }

    // Get existing images or initialize empty array
    const existingImages = (wizard.generatedImages as unknown as ServiceGeneratedImage[]) || [];

    // Add new images
    const updatedImages = [...existingImages, ...newImages];

    // Update wizard with new images
    await db
      .update(contentWizards)
      .set({
        imageGenerationConfig: config as any,
        generatedImages: updatedImages as any,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    return NextResponse.json({
      success: true,
      images: newImages,
      allImages: updatedImages,
    });
  } catch (error) {
    // Log detailed error for debugging
    console.error("[IMAGE-API] Error generating image:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate image",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
