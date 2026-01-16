/**
 * POST /api/jobs
 *
 * Cria um novo job assíncrono.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createJob } from "@/lib/queue/jobs";
import type { JobType, JobPayload } from "@/lib/queue/types";

export async function POST(request: Request) {
  // Verificar autenticação
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, payload, priority, scheduledFor } = body as {
      type: JobType;
      payload: JobPayload;
      priority?: number;
      scheduledFor?: string;
    };

    // Validar tipo de job
    if (!type || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: type, payload" },
        { status: 400 }
      );
    }

    // Criar job
    const jobId = await createJob(userId, type, payload, {
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
