/**
 * POST /api/wizard/[id]/queue-image-generation
 *
 * Queues the image generation job for a wizard.
 * Returns immediately with the job ID, processing happens in background.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createJob } from "@/lib/queue/jobs";
import type { WizardImageGenerationPayload } from "@/lib/queue/types";
import { JobType } from "@/lib/queue/types";

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
      userId,
      config,
    };

    const jobId = await createJob(userId, "wizard_image_generation" as JobType, payload);

    console.log(`[WIZARD-QUEUE] Image generation job ${jobId} queued for wizard ${wizardId}`);

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
