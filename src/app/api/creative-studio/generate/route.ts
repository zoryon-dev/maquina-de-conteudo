/**
 * POST /api/creative-studio/generate
 *
 * Creates a creative studio project and enqueues generation job.
 * Returns projectId + jobId for client polling.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { creativeProjects } from "@/db/schema";
import { createJob } from "@/lib/queue/jobs";
import { JobType } from "@/lib/queue/types";
import type { CreativeStudioGeneratePayload } from "@/lib/queue/types";
import { buildCreativePrompt } from "@/lib/creative-studio/prompt-builder";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";
import { generateSchema } from "@/lib/creative-studio/validation";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const userId = await ensureAuthenticatedUser();

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join(". ")
      );
    }

    const {
      projectId: existingProjectId,
      mode,
      prompt: userPrompt,
      model,
      formats,
      quantity,
      textMode,
      textConfig,
      sourceImage,
      variationType,
      presetId,
      templateSlug,
      templateVars,
      analysisData,
    } = parsed.data;

    // Build the final prompt
    const built = buildCreativePrompt({
      userPrompt: userPrompt ?? undefined,
      presetId: presetId ?? undefined,
      templateSlug: templateSlug ?? undefined,
      templateVars: templateVars as Record<string, string> | undefined,
      format: formats[0],
      analysisData: analysisData as any,
    });

    if (!built.prompt.trim()) {
      throw new ValidationError("Prompt não pode ser vazio");
    }

    // Create or update project
    let projectId: number;

    if (existingProjectId) {
      // Update existing project
      await db
        .update(creativeProjects)
        .set({
          status: "generating",
          prompt: built.prompt,
          selectedModel: model,
          selectedFormats: formats,
          quantityPerFormat: quantity,
          textMode: textMode || null,
          textConfig: textConfig || null,
          presetUsed: presetId || null,
          updatedAt: new Date(),
        })
        .where(eq(creativeProjects.id, existingProjectId));
      projectId = existingProjectId;
    } else {
      // Create new project
      const [project] = await db
        .insert(creativeProjects)
        .values({
          userId,
          title: userPrompt?.slice(0, 80) || `Creative ${mode}`,
          mode,
          status: "generating",
          prompt: built.prompt,
          selectedModel: model,
          selectedFormats: formats,
          quantityPerFormat: quantity,
          textMode: textMode || null,
          textConfig: textConfig || null,
          presetUsed: presetId || null,
          sourceImageUrl: sourceImage || null,
          variationType: (variationType as "resize" | "restyle" | "inpaint") || null,
        })
        .returning({ id: creativeProjects.id });
      projectId = project.id;
    }

    // Create job
    const payload: CreativeStudioGeneratePayload = {
      projectId,
      userId,
      mode,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      model,
      formats,
      quantity,
      textMode: textMode ?? undefined,
      textConfig: (textConfig ?? undefined) as Record<string, unknown> | undefined,
      sourceImage: sourceImage ?? undefined,
      variationType: variationType ?? undefined,
      presetId: presetId ?? undefined,
    };

    const jobId = await createJob(userId, JobType.CREATIVE_STUDIO_GENERATE, payload);

    // Link job to project
    await db
      .update(creativeProjects)
      .set({ jobId, updatedAt: new Date() })
      .where(eq(creativeProjects.id, projectId));

    console.log(`[CreativeStudio] Project ${projectId} → Job ${jobId} (${formats.length} formats × ${quantity})`);

    return NextResponse.json({
      success: true,
      projectId,
      jobId,
      totalImages: formats.length * quantity,
    });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_GENERATE_FAILED");
    console.error("[CreativeStudio:Generate]", appError.code, ":", appError.message);
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    );
  }
}
