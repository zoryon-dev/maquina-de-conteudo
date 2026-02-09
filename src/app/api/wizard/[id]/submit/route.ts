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
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { z } from "zod";

const submitRequestSchema = z.object({
  submitType: z.enum(["narratives", "generation"]),
  selectedVideoTitle: z.object({
    id: z.string(),
    title: z.string().max(500),
    hook_factor: z.number(),
    reason: z.string().max(1000),
  }).optional(),
});

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
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure user exists in database (handles account recreation scenario)
    const dbUserId = await ensureAuthenticatedUser();

    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    console.log(`[WizardSubmit] POST request for wizard ${wizardId}, clerkUserId: ${clerkUserId}, dbUserId: ${dbUserId}`);

    // Get wizard - try with dbUserId first (may differ from clerkUserId if email was reused)
    let wizard: any | undefined;
    const wizardResult = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, dbUserId)))
      .limit(1);
    wizard = wizardResult[0];

    // If not found, try without userId filter (might be from recreated account)
    if (!wizard) {
      console.log(`[WizardSubmit] Wizard ${wizardId} not found with dbUserId, trying without userId filter...`);
      const wizardByAnyUserResult = await db
        .select()
        .from(contentWizards)
        .where(eq(contentWizards.id, wizardId))
        .limit(1);
      const wizardByAnyUser = wizardByAnyUserResult[0];

      if (wizardByAnyUser) {
        console.log(`[WizardSubmit] Found wizard with different userId, updating from ${wizardByAnyUser.userId} to ${dbUserId}`);
        // Update wizard to use current dbUserId (account was recreated)
        const updatedResult = await db
          .update(contentWizards)
          .set({ userId: dbUserId, updatedAt: new Date() })
          .where(eq(contentWizards.id, wizardId))
          .returning();
        wizard = updatedResult[0];
      } else {
        console.log(`[WizardSubmit] Wizard ${wizardId} not found`);
        return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
      }
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

    const rawBody = await request.json();
    const parseResult = submitRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body. Required: submitType ('narratives' | 'generation')" },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { submitType } = body;

    let jobId: number;

    if (submitType === "narratives") {
      // Enqueue wizard_narratives job
      jobId = await createJob(
        dbUserId,
        JobType.WIZARD_NARRATIVES,
        {
          wizardId: wizard.id,
          userId: dbUserId,
          contentType: wizard.contentType ?? "text",
          referenceUrl: wizard.referenceUrl ?? undefined,
          referenceVideoUrl: wizard.referenceVideoUrl ?? undefined,
          theme: wizard.theme ?? undefined,
          context: wizard.context ?? undefined,
          objective: wizard.objective ?? undefined,
          cta: wizard.cta ?? undefined,
          targetAudience: wizard.targetAudience ?? undefined,
          videoDuration: wizard.videoDuration ?? undefined,
          numberOfSlides: wizard.numberOfSlides ?? undefined,
          customInstructions: wizard.customInstructions ?? undefined,
          model: wizard.model ?? undefined,
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
        dbUserId,
        JobType.WIZARD_GENERATION,
        {
          wizardId: wizard.id,
          userId: dbUserId,
          selectedNarrativeId: wizard.selectedNarrativeId!,
          contentType: wizard.contentType ?? "text",
          numberOfSlides: wizard.numberOfSlides ?? 10,
          model: wizard.model ?? undefined,
          ragConfig: wizard.ragConfig as any,
          selectedVideoTitle: body.selectedVideoTitle, // Pass selected video title for video content
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
