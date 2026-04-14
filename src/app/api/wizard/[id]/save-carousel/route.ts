/**
 * API Route: Save Carousel from Visual Studio
 *
 * POST /api/wizard/[id]/save-carousel
 *
 * Saves the carousel content from the Visual Studio step to the library.
 * This endpoint is called after the user finishes editing templates, colors,
 * text, and images in the unified Visual Studio step.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards, libraryItems, themes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { StudioSlide, StudioProfile, StudioHeader } from "@/lib/studio-templates/types";
import type { PostType, ContentStatus } from "@/db/schema";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";
import { isScreenshotOneAvailable, renderAndUploadAllSlides } from "@/lib/studio-templates/render-to-image";
import { getBrandConfig, resolveBrandIdForUser } from "@/lib/brands/queries";
import { isFeatureEnabled } from "@/lib/features";

interface SaveCarouselRequest {
  slides: StudioSlide[];
  profile: StudioProfile;
  header: StudioHeader;
  caption: string;
  hashtags: string[];
  contentType: PostType;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check OUTSIDE try-catch (consistent with other wizard routes)
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get database userId (may differ from clerkUserId if account was recreated)
    const userId = await ensureAuthenticatedUser();

    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // Parse request body
    const body: SaveCarouselRequest = await req.json();
    const { slides, profile, header, caption, hashtags, contentType } = body;

    // Validate input
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: "Slides are required" },
        { status: 400 }
      );
    }

    // Validate contentType
    const VALID_CONTENT_TYPES: PostType[] = ["carousel", "image", "text", "video", "story"];
    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      throw new ValidationError(
        `Invalid content type: "${contentType}". Must be one of: ${VALID_CONTENT_TYPES.join(", ")}`
      );
    }

    // Fetch wizard to verify ownership and get metadata
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    // Check if already has a library item
    if (wizard.libraryItemId) {
      return NextResponse.json(
        { error: "Wizard already saved to library", libraryItemId: wizard.libraryItemId },
        { status: 409 }
      );
    }

    // Build title from wizard metadata
    const title = wizard.theme
      ? `Carrossel: ${wizard.theme.substring(0, 80)}${wizard.theme.length > 80 ? "..." : ""}`
      : wizard.objective
      ? `Carrossel: ${wizard.objective.substring(0, 80)}${wizard.objective.length > 80 ? "..." : ""}`
      : "Carrossel sem titulo";

    // Resolve brand ativa para este user (Fase 3). Se houver, persistir em
    // library_items.brand_id e, quando a flag visualTokensV2 estiver on,
    // passar o BrandConfig para o renderer — os PNGs saem do ScreenshotOne
    // já com os tokens aplicados.
    const brandId = await resolveBrandIdForUser(userId);
    const brandForRender = brandId != null ? await getBrandConfig(brandId) : null;
    const featureFlags = {
      visualTokensV2: isFeatureEnabled("NEXT_PUBLIC_FEATURE_VISUAL_TOKENS_V2"),
    };

    // Render slides as PNG images via ScreenshotOne
    let imageUrls: string[] = [];

    if (isScreenshotOneAvailable()) {
      console.log(`[SaveCarousel] Rendering ${slides.length} slides via ScreenshotOne...`);
      const timestamp = Date.now();

      const renderResult = await renderAndUploadAllSlides({
        slides,
        profile,
        header,
        userId,
        storagePrefix: `studio/${userId}/carousel/${timestamp}`,
        brand: brandForRender,
        featureFlags,
      });

      imageUrls = renderResult.imageUrls;

      if (renderResult.errors.length > 0) {
        console.warn(
          `[SaveCarousel] ${renderResult.errors.length}/${slides.length} slides failed to render`
        );
      }
    }

    // Fallback: if ScreenshotOne not available or all renders failed,
    // extract image URLs from slide content (legacy behavior)
    if (imageUrls.length === 0) {
      console.log("[SaveCarousel] Using fallback: extracting image URLs from slide content");
      for (const slide of slides) {
        if (slide.content?.imageUrl) {
          imageUrls.push(slide.content.imageUrl);
        } else if (slide.content?.backgroundImageUrl) {
          imageUrls.push(slide.content.backgroundImageUrl);
        }
      }
      if (profile?.avatarUrl && imageUrls.length === 0) {
        imageUrls.push(profile.avatarUrl);
      }
    }

    // Build content structure for library
    const libraryContent = {
      type: contentType,
      slides: slides.map((slide, index) => ({
        slideNumber: index + 1,
        template: slide.template,
        content: slide.content,
        style: slide.style,
      })),
      profile,
      header,
      caption,
      hashtags,
      metadata: {
        wizardId,
        source: "visual-studio",
        createdAt: new Date().toISOString(),
        slidesCount: slides.length,
      },
    };

    // Build metadata for library item
    const libraryMetadata = {
      wizardId,
      wizardTheme: wizard.theme,
      wizardObjective: wizard.objective,
      wizardTargetAudience: wizard.targetAudience,
      wizardContext: wizard.context,
      source: "wizard-visual-studio" as const,
      slideCount: slides.length,
      caption,
      hashtags,
      // Store visual studio specific data
      visualStudio: {
        profile,
        header,
        templates: slides.map((s) => s.template),
      },
    };

    // Sequential operations (neon-http driver does not support transactions)
    // Order matters: insert first, then update references

    // 1. Insert into library
    const [libraryItem] = await db
      .insert(libraryItems)
      .values({
        userId,
        brandId: brandId ?? null,
        type: contentType,
        status: "draft" as ContentStatus,
        title,
        content: JSON.stringify(libraryContent),
        mediaUrl: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        metadata: JSON.stringify(libraryMetadata),
      })
      .returning();

    // 2. Update wizard with library item reference
    await db
      .update(contentWizards)
      .set({
        libraryItemId: libraryItem.id,
        currentStep: "completed",
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    // 3. Mark the origin theme as produced (if wizard was created from a theme)
    if (wizard.themeId) {
      await db
        .update(themes)
        .set({ producedAt: new Date() })
        .where(eq(themes.id, wizard.themeId));
      console.log(`[SaveCarousel] Theme ${wizard.themeId} marked as produced`);
    }

    const result = { libraryItemId: libraryItem.id };

    console.log(`[SaveCarousel] Wizard ${wizardId} saved to library item ${result.libraryItemId}`);

    return NextResponse.json({
      success: true,
      libraryItemId: result.libraryItemId,
      message: "Carousel saved to library successfully",
    });
  } catch (error) {
    const appError = toAppError(error, "SAVE_CAROUSEL_FAILED");
    console.error("[SaveCarousel] Error:", appError.code, "-", appError.message);

    return NextResponse.json(
      {
        error: getErrorMessage(appError),
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
}
