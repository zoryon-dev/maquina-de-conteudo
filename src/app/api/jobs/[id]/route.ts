/**
 * GET /api/jobs/[id]
 *
 * Consulta o status de um job específico.
 */

import { NextResponse } from "next/server";
import { getJob } from "@/lib/queue/jobs";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get database user ID (handles Clerk ID → DB ID mapping)
    const dbUserId = await ensureAuthenticatedUser();

    const { id } = await params;
    const jobId = parseInt(id, 10);

    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verificar se o job pertence ao usuário (compare DB user IDs)
    if (job.userId !== dbUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      payload: job.payload,
      result: job.result,
      error: job.error,
      attempts: job.attempts,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error("Error getting job:", error);
    return NextResponse.json(
      { error: "Failed to get job" },
      { status: 500 }
    );
  }
}
