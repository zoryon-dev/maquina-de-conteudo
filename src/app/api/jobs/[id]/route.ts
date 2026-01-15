/**
 * GET /api/jobs/[id]
 *
 * Consulta o status de um job específico.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getJob } from "@/lib/queue/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);

    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verificar se o job pertence ao usuário
    if (job.userId !== userId) {
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
