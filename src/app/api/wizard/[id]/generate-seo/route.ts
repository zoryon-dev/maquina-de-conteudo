/**
 * API Route: Generate YouTube SEO Metadata
 *
 * POST /api/wizard/[id]/generate-seo
 *
 * Generates comprehensive YouTube SEO metadata (title, description, tags, hashtags)
 * using the YouTube SEO service with GPT-4.1-mini.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateYouTubeSEO } from "@/lib/wizard-services";
import type { GenerateYouTubeSEOParams } from "@/lib/wizard-services";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

// ============================================================================
// TYPES
// ============================================================================

interface GenerateSEORequestBody {
  thumbnailTitle: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  searchIntent?: "informational" | "transactional" | "navigational";
  narrativeAngle?: string;
  narrativeTitle?: string;
  narrativeDescription?: string;
  theme: string;
  targetAudience: string;
  objective?: string;
  niche?: string;
  roteiroContext?: {
    valorCentral?: string;
    hookTexto?: string;
    topicos?: string[];
    duracao?: string;
  };
  brand?: {
    voiceTone?: string;
    brandVoice?: string;
    channelName?: string;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      youtube?: string;
    };
    targetAudience?: string;
    preferredCTAs?: string;
    forbiddenTerms?: string[];
  };
}

interface GenerateSEOResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id: wizardId } = await params;

    // Authenticate user
    const dbUserId = await ensureAuthenticatedUser();

    // Parse request body
    const body: GenerateSEORequestBody = await request.json();

    // Validate required fields
    if (!body.thumbnailTitle || !body.primaryKeyword || !body.theme || !body.targetAudience) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: thumbnailTitle, primaryKeyword, theme, and targetAudience are required",
        },
        { status: 400 }
      );
    }

    // Verify wizard ownership
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(eq(contentWizards.id, parseInt(wizardId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json(
        {
          success: false,
          error: "Wizard not found",
        },
        { status: 404 }
      );
    }

    if (wizard.userId !== dbUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: wizard belongs to different user",
        },
        { status: 403 }
      );
    }

    // Update wizard status to processing
    await db
      .update(contentWizards)
      .set({
        jobStatus: "processing" as any,
        processingProgress: {
          stage: "seo" as any, // "seo" stage not in processingProgress type
          percent: 20,
          message: "Gerando metadados SEO do YouTube...",
        },
        jobError: null,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, parseInt(wizardId)));

    // Build SEO generation parameters
    const seoParams: GenerateYouTubeSEOParams = {
      thumbnailTitle: body.thumbnailTitle,
      primaryKeyword: body.primaryKeyword,
      secondaryKeywords: body.secondaryKeywords,
      searchIntent: body.searchIntent || "informational",
      narrativeAngle: body.narrativeAngle as any,
      narrativeTitle: body.narrativeTitle,
      narrativeDescription: body.narrativeDescription,
      coreBelief: (body as any).coreBelief,
      statusQuoChallenged: (body as any).statusQuoChallenged,
      theme: body.theme,
      targetAudience: body.targetAudience,
      objective: body.objective,
      niche: body.niche,
      roteiroContext: body.roteiroContext || {},
      brand: body.brand,
    };

    // Generate YouTube SEO metadata
    const seoResult = await generateYouTubeSEO(seoParams);

    if (!seoResult.success || !seoResult.data) {
      // Update wizard with error
      await db
        .update(contentWizards)
        .set({
          jobStatus: "failed",
          jobError: seoResult.error || "Failed to generate YouTube SEO metadata",
          updatedAt: new Date(),
        })
        .where(eq(contentWizards.id, parseInt(wizardId)));

      return NextResponse.json(
        {
          success: false,
          error: seoResult.error || "Failed to generate YouTube SEO metadata",
        },
        { status: 500 }
      );
    }

    // Update wizard with generated SEO metadata
    await db
      .update(contentWizards)
      .set({
        generatedSEO: seoResult.data as any,
        jobStatus: "completed",
        processingProgress: {
          stage: "seo" as any, // "seo" stage not in processingProgress type
          percent: 100,
          message: "SEO gerado com sucesso!",
        },
        updatedAt: new Date(),
      } as any) // generatedSEO not in schema
      .where(eq(contentWizards.id, parseInt(wizardId)));

    const response: GenerateSEOResponse = {
      success: true,
      data: seoResult.data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[YOUTUBE-SEO-API] Error generating SEO:", error);

    // Update wizard with error
    try {
      const { id: wizardId } = await params;
      await db
        .update(contentWizards)
        .set({
          jobStatus: "failed",
          jobError: error instanceof Error ? error.message : "Unknown error generating YouTube SEO",
          updatedAt: new Date(),
        })
        .where(eq(contentWizards.id, parseInt(wizardId)));
    } catch (dbError) {
      console.error("[YOUTUBE-SEO-API] Failed to update wizard error status:", dbError);
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error generating YouTube SEO metadata",
      },
      { status: 500 }
    );
  }
}
