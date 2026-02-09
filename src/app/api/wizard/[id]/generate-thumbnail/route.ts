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
import { auth } from "@clerk/nextjs/server";
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
  roteiroContext?: {
    valorCentral?: string;
    hookTexto?: string;
    thumbnailTitulo?: string;
    thumbnailEstilo?: string;
  };
  // NEW: Advanced configuration fields
  instrucoesCustomizadas?: string;
  tipoFundo?: string;
  corTexto?: string;
  posicaoTexto?: string;
  tipoIluminacao?: string;
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
      roteiroContext: body.roteiroContext,
      instrucoesCustomizadas: body.instrucoesCustomizadas,
      tipoFundo: body.tipoFundo,
      corTexto: body.corTexto,
      posicaoTexto: body.posicaoTexto,
      tipoIluminacao: body.tipoIluminacao,
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
        error: "Failed to generate thumbnail",
      },
      { status: 500 }
    );
  }
}
