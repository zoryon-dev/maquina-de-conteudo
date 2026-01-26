/**
 * API Route: Generate Video Titles (for Thumbnails)
 *
 * POST /api/wizard/[id]/generate-titles
 *
 * Generates 5 title options for video thumbnails based on the selected narrative.
 * These titles are designed to create curiosity while being tribal.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateVideoTitles } from "@/lib/wizard-services/video-titles.service";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";
import { getUserVariables } from "@/lib/wizard-services/user-variables.service";

// ============================================================================
// TYPES
// ============================================================================

interface GenerateTitlesRequestBody {
  narrativeAngle: "herege" | "visionario" | "tradutor" | "testemunha";
  narrativeTitle: string;
  narrativeDescription: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  roteiroContext?: {
    valorCentral?: string;
    hookTexto?: string;
    thumbnailTitulo?: string;
    thumbnailEstilo?: string;
  };
  brandContext?: {
    voiceTone?: string;
    targetAudience?: string;
    fearsAndPains?: string[];
    desiresAndAspirations?: string[];
    forbiddenTerms?: string[];
  };
}

interface GenerateTitlesResponse {
  success: boolean;
  data?: {
    titles: VideoTitleOption[];
  };
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

    // Parse request body
    const body: GenerateTitlesRequestBody = await request.json();

    // Validate required fields
    if (!body.narrativeAngle || !body.narrativeTitle || !body.narrativeDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: narrativeAngle, narrativeTitle, and narrativeDescription",
        },
        { status: 400 }
      );
    }

    // Fetch user variables if brandContext not provided
    let brandContext = body.brandContext;
    if (!brandContext) {
      try {
        const userVars = await getUserVariables();

        // Convert user variables to brand context
        if (Object.keys(userVars).length > 0) {
          brandContext = {
            voiceTone: userVars.tone || userVars.brandVoice,
            targetAudience: userVars.targetAudience,
            fearsAndPains: userVars.audienceFears
              ? userVars.audienceFears.split(",").map((s) => s.trim())
              : undefined,
            desiresAndAspirations: userVars.audienceDesires
              ? userVars.audienceDesires.split(",").map((s) => s.trim())
              : undefined,
            forbiddenTerms: userVars.negativeTerms
              ? userVars.negativeTerms.split(",").map((s) => s.trim())
              : undefined,
          };
        }
      } catch (error) {
        console.error("[VIDEO TITLES-API] Error fetching user variables:", error);
        // Continue without brand context on error
      }
    }

    // Call video titles generation service
    const result = await generateVideoTitles({
      narrativeAngle: body.narrativeAngle,
      narrativeTitle: body.narrativeTitle,
      narrativeDescription: body.narrativeDescription,
      theme: body.theme,
      targetAudience: body.targetAudience,
      objective: body.objective,
      roteiroContext: body.roteiroContext,
      brandContext,
    });

    if (!result.success || !result.titles) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate titles",
        },
        { status: 500 }
      );
    }

    const response: GenerateTitlesResponse = {
      success: true,
      data: {
        titles: result.titles,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[VIDEO TITLES-API] Error generating titles:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error generating titles",
      },
      { status: 500 }
    );
  }
}
