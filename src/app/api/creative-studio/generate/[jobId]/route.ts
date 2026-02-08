/**
 * GET /api/creative-studio/generate/[jobId]
 *
 * Returns the status of a generation job + its outputs.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { jobs, creativeProjects, creativeOutputs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { toAppError, getErrorMessage } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const userId = await ensureAuthenticatedUser();
    const { jobId: jobIdStr } = await params;
    const jobId = parseInt(jobIdStr, 10);

    if (isNaN(jobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid jobId" },
        { status: 400 }
      );
    }

    // Fetch job
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Fetch project + outputs
    const [project] = await db
      .select()
      .from(creativeProjects)
      .where(eq(creativeProjects.jobId, jobId))
      .limit(1);

    let outputs: Array<{
      id: number;
      imageUrl: string;
      format: string;
      width: number | null;
      height: number | null;
      modelUsed: string | null;
      generationTimeMs: number | null;
      isFavorite: boolean | null;
    }> = [];

    if (project) {
      outputs = await db
        .select({
          id: creativeOutputs.id,
          imageUrl: creativeOutputs.imageUrl,
          format: creativeOutputs.format,
          width: creativeOutputs.width,
          height: creativeOutputs.height,
          modelUsed: creativeOutputs.modelUsed,
          generationTimeMs: creativeOutputs.generationTimeMs,
          isFavorite: creativeOutputs.isFavorite,
        })
        .from(creativeOutputs)
        .where(eq(creativeOutputs.projectId, project.id));
    }

    // Calculate progress
    const totalExpected = project
      ? (project.selectedFormats as string[] | null)?.length ?? 1 * (project.quantityPerFormat ?? 1)
      : 0;

    return NextResponse.json({
      success: true,
      status: job.status,
      error: job.error,
      projectId: project?.id,
      progress: {
        current: outputs.length,
        total: totalExpected,
      },
      outputs,
    });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_STATUS_FAILED");
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError) },
      { status: appError.statusCode }
    );
  }
}
