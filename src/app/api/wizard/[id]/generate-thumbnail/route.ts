/**
 * API Route: Generate Video Thumbnail (Nano Banana v4.3)
 *
 * POST /api/wizard/[id]/generate-thumbnail
 *
 * Generates YouTube thumbnails using Nano Banana format with support for:
 * - 8 visual styles (profissional, minimalista, moderno, etc.)
 * - Reference images (user photo + style reference)
 * - Structured output with specifications (hex colors, position, expression)
 * - Alternative variations
 */

import { NextRequest, NextResponse } from "next/server";
import { generateVideoThumbnailNanoBanana } from "@/lib/wizard-services/image-generation.service";
import type {
  NanoBananaThumbnailInput,
  NanoBananaThumbnailOutput,
} from "@/lib/wizard-services/image-types";
import type { ServiceResult } from "@/lib/wizard-services/types";

// ============================================================================
// TYPES
// ============================================================================

interface GenerateThumbnailRequestBody {
  thumbnailTitle: string;
  estilo?: "profissional" | "minimalista" | "moderno" | "energético" | "educacional" | "provocativo" | "inspirador" | "tech";
  contextoTematico: string;
  expressao?: string;
  referenciaImagem1?: string;
  referenciaImagem2?: string;
  variacaoIndex?: number;
  model?: string; // Optional AI model override
}

interface GenerateThumbnailResponse {
  success: boolean;
  data?: {
    imageUrl: string;
    thumbnailUrl?: string;
    model: string;
    promptUsed: string;
    especificacoes?: NanoBananaThumbnailOutput["especificacoes"];
    variacoes?: string[];
  };
  error?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wizardId = parseInt(params.id);

    if (isNaN(wizardId)) {
      return NextResponse.json(
        { success: false, error: "Invalid wizard ID" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: GenerateThumbnailRequestBody = await request.json();

    // Validate required fields
    if (!body.thumbnailTitle || !body.contextoTematico) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: thumbnailTitle and contextoTematico",
        },
        { status: 400 }
      );
    }

    // Prepare input for Nano Banana generation
    const nanoBananaInput: NanoBananaThumbnailInput = {
      thumbnailTitle: body.thumbnailTitle,
      estilo: body.estilo || "profissional",
      contextoTematico: body.contextoTematico,
      expressao: body.expressao,
      referenciaImagem1: body.referenciaImagem1,
      referenciaImagem2: body.referenciaImagem2,
    };

    // Call Nano Banana thumbnail generation
    const result = await generateVideoThumbnailNanoBanana(
      nanoBananaInput,
      body.model as any // Optional model override
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate thumbnail",
        },
        { status: 500 }
      );
    }

    // Extract specifications from prompt (if available in response)
    let especificacoes: NanoBananaThumbnailOutput["especificacoes"] | undefined;
    let variacoes: string[] | undefined;

    // Try to parse the Nano Banana output from the generation process
    // Note: The generateVideoThumbnailNanoBanana function returns GeneratedImage,
    // but we need to extract the Nano Banana specifications somehow.
    // For now, we'll return what we have.

    const response: GenerateThumbnailResponse = {
      success: true,
      data: {
        imageUrl: result.data.imageUrl,
        thumbnailUrl: result.data.thumbnailUrl,
        model: result.data.model || "unknown",
        promptUsed: result.data.promptUsed || "",
        // TODO: Extract especificacoes and variacoes from the generation process
        especificacoes,
        variacoes,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[THUMBNAIL-API] Error generating thumbnail:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error generating thumbnail",
      },
      { status: 500 }
    );
  }
}
