/**
 * Wizard Submit API Route
 *
 * POST /api/wizard/[id]/submit
 *
 * Triggers the wizard processing by enqueuing background jobs.
 * This endpoint is called when:
 * - User clicks "Generate Narratives" (enqueues wizard_narratives job)
 * - User selects a narrative (enqueues wizard_generation job)
 *
 * In development mode, automatically triggers the worker to process jobs immediately.
 * In production, Vercel Cron handles worker execution.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards, jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createJob } from "@/lib/queue/jobs";
import { JobType } from "@/lib/queue/types";
import { isQueueConfigured, QueueNotConfiguredError, triggerWorker } from "@/lib/queue/client";
import type { PostType } from "@/db/schema";

interface SubmitRequestBody {
  /** Submit type: "narratives" to generate narratives, "generation" to generate final content */
  submitType: "narratives" | "generation";
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * POST /api/wizard/[id]/submit
 *
 * Triggers wizard processing by enqueuing appropriate background jobs.
 * In development, also triggers the worker immediately.
 */
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

    // Get wizard
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    // Verify queue system is configured before creating jobs
    if (!isQueueConfigured()) {
      return NextResponse.json(
        {
          error: "Queue system not configured",
          message: "Please configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables to enable background processing.",
        },
        { status: 503 }
      );
    }

    const body = await request.json() as SubmitRequestBody;
    const { submitType } = body;

    let jobId: number;

    if (submitType === "narratives") {
      // ==============================================================================
      // WIZARD DEBUG: DADOS ENVIADOS PARA O JOB
      // ==============================================================================
      console.log(`[WIZARD-SUBMIT] ════════════════════════════════════════════════════════`);
      console.log(`[WIZARD-SUBMIT] CRIANDO JOB: wizard_narratives`);
      console.log(`[WIZARD-SUBMIT] wizardId: ${wizard.id}`);
      console.log(`[WIZARD-SUBMIT] ════════════════════════════════════════════════════════`);
      console.log(`[WIZARD-SUBMIT] DADOS DO WIZARD:`);
      console.log(`[WIZARD-SUBMIT]   referenceUrl: ${wizard.referenceUrl || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   referenceVideoUrl: ${wizard.referenceVideoUrl || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   theme: ${wizard.theme || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   context: ${wizard.context || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   objective: ${wizard.objective || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   targetAudience: ${wizard.targetAudience || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   cta: ${wizard.cta || "(não informado)"}`);
      console.log(`[WIZARD-SUBMIT]   ragConfig.mode: ${wizard.ragConfig?.mode || "(não configurado)"}`);
      console.log(`[WIZARD-SUBMIT]   ragConfig.documents: ${wizard.ragConfig?.documents?.length || 0}`);
      console.log(`[WIZARD-SUBMIT]   ragConfig.collections: ${wizard.ragConfig?.collections?.length || 0}`);
      console.log(`[WIZARD-SUBMIT] ════════════════════════════════════════════════════════`);

      // Enqueue wizard_narratives job
      jobId = await createJob(
        userId,
        JobType.WIZARD_NARRATIVES,
        {
          wizardId: wizard.id,
          userId,
          contentType: wizard.contentType ?? "text",
          referenceUrl: wizard.referenceUrl ?? undefined,
          referenceVideoUrl: wizard.referenceVideoUrl ?? undefined,
          theme: wizard.theme ?? undefined,
          context: wizard.context ?? undefined,
          objective: wizard.objective ?? undefined,
          cta: wizard.cta ?? undefined,
          targetAudience: wizard.targetAudience ?? undefined,
          ragConfig: wizard.ragConfig as any,
        }
      );

      // Update wizard with job ID and step
      await db
        .update(contentWizards)
        .set({
          jobId,
          currentStep: "processing",
          updatedAt: new Date(),
        })
        .where(eq(contentWizards.id, wizardId));

      // In development, trigger worker immediately to process the job
      if (isDevelopment()) {
        // Fire and forget - don't wait for completion
        triggerWorker().catch((err) => {
          console.error("Failed to trigger worker in development:", err);
        });
      }

      return NextResponse.json({
        success: true,
        jobId,
        message: "Narratives generation started",
      });

    } else if (submitType === "generation") {
      // Validate that narratives exist and one is selected
      if (!wizard.narratives || !wizard.selectedNarrativeId) {
        return NextResponse.json(
          { error: "No narratives available or no narrative selected" },
          { status: 400 }
        );
      }

      // Enqueue wizard_generation job
      jobId = await createJob(
        userId,
        JobType.WIZARD_GENERATION,
        {
          wizardId: wizard.id,
          userId,
          selectedNarrativeId: wizard.selectedNarrativeId!,
          contentType: wizard.contentType ?? "text",
          numberOfSlides: wizard.numberOfSlides ?? 10,
          model: wizard.model ?? undefined,
          ragConfig: wizard.ragConfig as any,
        }
      );

      // Update wizard with job ID and step
      await db
        .update(contentWizards)
        .set({
          jobId,
          currentStep: "generation",
          updatedAt: new Date(),
        })
        .where(eq(contentWizards.id, wizardId));

      // In development, trigger worker immediately to process the job
      if (isDevelopment()) {
        // Fire and forget - don't wait for completion
        triggerWorker().catch((err) => {
          console.error("Failed to trigger worker in development:", err);
        });
      }

      return NextResponse.json({
        success: true,
        jobId,
        message: "Content generation started",
      });

    } else {
      return NextResponse.json(
        { error: "Invalid submit type. Use 'narratives' or 'generation'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error submitting wizard:", error);
    return NextResponse.json(
      { error: "Failed to submit wizard" },
      { status: 500 }
    );
  }
}
