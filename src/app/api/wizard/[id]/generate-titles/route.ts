/**
 * API Route: Generate Video Titles (for Thumbnails)
 *
 * POST /api/wizard/[id]/generate-titles
 *
 * Generates 5 title options for video thumbnails based on the selected narrative.
 * These titles are designed to create curiosity while being tribal.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateVideoTitles } from "@/lib/wizard-services/video-titles.service";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";
import { getUserVariables } from "@/lib/wizard-services/user-variables.service";
import { getBrandPromptVariables } from "@/lib/brands/injection";

function splitCsv(value: string | undefined | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Fetch brand + user variables if brandContext not provided.
    // Precedência: brand ativo (base) < user variables (override).
    let brandContext = body.brandContext;
    if (!brandContext) {
      try {
        const [brandVars, userVars] = await Promise.all([
          getBrandPromptVariables().catch(() => ({} as Record<string, string | undefined>)),
          getUserVariables(),
        ]);

        const merged = {
          voiceTone: userVars.tone || userVars.brandVoice || brandVars.tone,
          targetAudience: userVars.targetAudience || brandVars.targetAudience,
          fearsAndPains: splitCsv(userVars.audienceFears) ?? splitCsv(brandVars.audienceFears),
          desiresAndAspirations: splitCsv(userVars.audienceDesires) ?? splitCsv(brandVars.audienceDesires),
          forbiddenTerms: splitCsv(userVars.negativeTerms) ?? splitCsv(brandVars.negativeTerms),
        };

        if (Object.values(merged).some((v) => v !== undefined)) {
          brandContext = merged;
        }
      } catch (error) {
        console.error("[VIDEO TITLES-API] Error fetching brand/user variables:", error);
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
        error: "Failed to generate titles",
      },
      { status: 500 }
    );
  }
}
