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
import { getUserVariables, splitCsv } from "@/lib/wizard-services/user-variables.service";
import { getBrandPromptVariables } from "@/lib/brands/injection";
import { isAppError } from "@/lib/errors";

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
          getBrandPromptVariables().catch((err) => {
            // ConfigError/NotFoundError indicam misconfiguração — re-throw
            // para o try/catch externo surfaçar o 500 com contexto correto.
            // Outros erros (transientes) caem para brand vars vazio.
            if (isAppError(err) && (err.code === "CONFIG_ERROR" || err.code === "NOT_FOUND")) {
              throw err
            }
            console.error("[VIDEO TITLES-API] failed to load brand variables:", err)
            return {} as Record<string, string | undefined>
          }),
          getUserVariables(),
        ]);

        // brandVoice é um campo SEPARADO (descrição da voz da marca),
        // NÃO é fallback de tone. Precedência alinhada com llm.service:
        //   input (não aplicável aqui) < userVars.tone < brandVars.tone
        const merged = {
          voiceTone: userVars.tone || brandVars.tone,
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
        // Re-throw ConfigError/NotFoundError para o try/catch externo
        // tratar como 500 com contexto; demais erros seguem sem brand context.
        if (isAppError(error) && (error.code === "CONFIG_ERROR" || error.code === "NOT_FOUND")) {
          throw error
        }
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
