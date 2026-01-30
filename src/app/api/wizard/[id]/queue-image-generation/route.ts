/**
 * POST /api/wizard/[id]/queue-image-generation
 *
 * Queues the image generation job for a wizard.
 * Returns immediately with the job ID, processing happens in background.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createJob } from "@/lib/queue/jobs";
import type { WizardImageGenerationPayload } from "@/lib/queue/types";
import { JobType } from "@/lib/queue/types";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const dbUserId = await ensureAuthenticatedUser();

  try {
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queue-image-generation/route.ts:entry',message:'Queue image generation called',data:{wizardId,dbUserId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    // Verify ownership and get wizard data
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, dbUserId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    // Check if wizard has generated content
    if (!wizard.generatedContent) {
      return NextResponse.json(
        { error: "Wizard content not yet generated. Please complete the content generation step first." },
        { status: 400 }
      );
    }

    // Get request body with configuration
    const body = await request.json();
    const { config } = body as { config: WizardImageGenerationPayload["config"] };

    if (!config) {
      return NextResponse.json({ error: "Configuration is required" }, { status: 400 });
    }

    // Create the job
    const payload: WizardImageGenerationPayload = {
      wizardId,
      userId: dbUserId,
      config,
    };

    const jobId = await createJob(dbUserId, "wizard_image_generation" as JobType, payload);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queue-image-generation/route.ts:job-created',message:'Job created successfully',data:{jobId,wizardId,dbUserId,payloadUserId:payload.userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      jobId,
      message: "Image generation queued successfully",
    });
  } catch (error) {
    console.error("[WIZARD-QUEUE] Error queuing image generation:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to queue image generation",
      },
      { status: 500 }
    );
  }
}
