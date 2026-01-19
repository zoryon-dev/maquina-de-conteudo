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

    // Validate configuration
    const hasValidAiConfig = config.method === "ai" && config.aiOptions;
    const hasValidHtmlConfig = config.method === "html-template" && config.htmlOptions;

    if (!hasValidAiConfig && !hasValidHtmlConfig) {
      return NextResponse.json(
        { error: "Invalid configuration for selected method" },
        { status: 400 }
      );
    }

    // Check service availability
    if (config.method === "ai" && !isImageGenerationAvailable()) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 503 }
      );
    }

    if (config.method === "html-template" && !isScreenshotOneAvailable()) {
      return NextResponse.json(
        { error: "ScreenshotOne access key not configured" },
        { status: 503 }
      );
    }

    // Prepare input for image generation
    // Handle generatedContent which may be a JSON object or string
    let slideContent = wizard.theme || "Conteúdo gerado";
    if (wizard.generatedContent) {
      if (typeof wizard.generatedContent === "string") {
        slideContent = wizard.generatedContent;
      } else if (typeof wizard.generatedContent === "object") {
        // Extract text from GeneratedContent structure
        const content = wizard.generatedContent as Record<string, unknown>;
        if (content.slides && Array.isArray(content.slides)) {
          slideContent = (content.slides[0] as Record<string, unknown>).content as string || slideContent;
        } else if (content.content) {
          slideContent = String(content.content);
        } else {
          slideContent = JSON.stringify(content);
        }
      }
    }
    const generationInput: ImageGenerationInput = {
      slideTitle: wizard.theme || undefined,
      slideContent,
      slideNumber: 1,
      config,
    };

    // Generate image based on method
    let result: ServiceGeneratedImage | null = null;

    if (config.method === "ai") {
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

    // Get existing images or initialize empty array
    const existingImages = (wizard.generatedImages as unknown as ServiceGeneratedImage[]) || [];

    // Add new image
    const updatedImages = [...existingImages, result];

    // Update wizard with new image
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
      image: result,
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
