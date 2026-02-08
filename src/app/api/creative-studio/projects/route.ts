/**
 * GET /api/creative-studio/projects — List projects
 * POST /api/creative-studio/projects — Create project
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { creativeProjects, creativeOutputs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { toAppError, getErrorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const userId = await ensureAuthenticatedUser();

    const projects = await db
      .select({
        id: creativeProjects.id,
        title: creativeProjects.title,
        mode: creativeProjects.mode,
        status: creativeProjects.status,
        selectedModel: creativeProjects.selectedModel,
        createdAt: creativeProjects.createdAt,
        outputCount: sql<number>`(
          SELECT COUNT(*) FROM creative_outputs
          WHERE creative_outputs.project_id = ${creativeProjects.id}
        )`.as("output_count"),
      })
      .from(creativeProjects)
      .where(eq(creativeProjects.userId, userId))
      .orderBy(desc(creativeProjects.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_PROJECTS_LIST_FAILED");
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError) },
      { status: appError.statusCode }
    );
  }
}
