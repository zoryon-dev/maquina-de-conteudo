/**
 * API Route: Queue Thumbnail Generation (Async)
 *
 * POST /api/wizard/[id]/queue-thumbnail-generation
 *
 * Creates a job for asynchronous YouTube thumbnail generation using Nano Banana format.
 * This prevents timeouts by processing the thumbnail generation in the background.
 */

import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/queue/jobs";
import { triggerWorker } from "@/lib/queue/client";
import { JobType } from "@/lib/queue/types";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

// ============================================================================
// TYPES
// ============================================================================

interface QueueThumbnailGenerationRequestBody {
  thumbnailTitle: string;
  estilo?: string;
  contextoTematico: string;
  expressao?: string;
  referenciaImagem1?: string;
  referenciaImagem2?: string;
  roteiroContext?: {
    valorCentral?: string;
    hookTexto?: string;
    thumbnailTitulo?: string;
    thumbnailEstilo?: string;
  };
  instrucoesCustomizadas?: string;
  tipoFundo?: string;
  corTexto?: string;
  posicaoTexto?: string;
  tipoIluminacao?: string;
  model?: string;
}

interface QueueThumbnailGenerationResponse {
  success: boolean;
  jobId?: number;
  message?: string;
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
    const body: QueueThumbnailGenerationRequestBody = await request.json();

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
          stage: "thumbnail" as any, // "thumbnail" stage not in processingProgress type
          percent: 10,
          message: "Thumbnail enfileirada para geração assíncrona...",
        },
        jobError: null,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, parseInt(wizardId)));

    // Create job for thumbnail generation
    const jobId = await createJob(
      dbUserId,
      JobType.WIZARD_THUMBNAIL_GENERATION,
      {
        wizardId: parseInt(wizardId),
        userId: dbUserId,
        thumbnailTitle: body.thumbnailTitle,
        estilo: body.estilo,
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
        model: body.model,
      }
    );

    // Trigger worker immediately to process jobs
    // Fire and forget - don't wait for completion
    triggerWorker().catch((err) => {
      console.error("[QUEUE-THUMBNAIL] Failed to trigger worker:", err);
    });

    const response: QueueThumbnailGenerationResponse = {
      success: true,
      jobId,
      message: "Thumbnail generation job created successfully",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[QUEUE-THUMBNAIL] Error creating job:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error creating thumbnail generation job",
      },
      { status: 500 }
    );
  }
}
