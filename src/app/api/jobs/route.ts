/**
 * POST /api/jobs
 *
 * Cria um novo job assíncrono.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createJob } from "@/lib/queue/jobs";
import { JobType, type JobPayload } from "@/lib/queue/types";
import { z } from "zod";

// Whitelist of job types allowed via API
const ALLOWED_JOB_TYPES = [
  JobType.CREATIVE_STUDIO_GENERATE,
  JobType.WIZARD_NARRATIVES,
  JobType.WIZARD_GENERATION,
] as const;

const createJobSchema = z.object({
  type: z.enum(ALLOWED_JOB_TYPES),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(0).max(10).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  // Verificar autenticação
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = createJobSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid job type or payload" },
        { status: 400 }
      );
    }
    const { type, payload, priority, scheduledFor } = result.data;

    // Criar job
    const jobId = await createJob(userId, type, payload as unknown as JobPayload, {
      priority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    return NextResponse.json({
      jobId,
      status: "pending",
      message: "Job created successfully",
    });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs
 *
 * Lista jobs do usuário autenticado.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // TODO: Implementar listUserJobs
    return NextResponse.json({
      jobs: [],
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error("Error listing jobs:", error);
    return NextResponse.json(
      { error: "Failed to list jobs" },
      { status: 500 }
    );
  }
}
