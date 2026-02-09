/**
 * GET /api/creative-studio/projects/[id] — Get project detail
 * DELETE /api/creative-studio/projects/[id] — Delete project
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { creativeProjects, creativeOutputs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { toAppError, getErrorMessage } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureAuthenticatedUser();
    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const [project] = await db
      .select()
      .from(creativeProjects)
      .where(and(eq(creativeProjects.id, projectId), eq(creativeProjects.userId, userId)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado" }, { status: 404 });
    }

    const outputs = await db
      .select()
      .from(creativeOutputs)
      .where(eq(creativeOutputs.projectId, projectId));

    return NextResponse.json({ success: true, project, outputs });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_PROJECT_GET_FAILED");
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError) },
      { status: appError.statusCode }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureAuthenticatedUser();
    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    // Verify ownership
    const [project] = await db
      .select({ id: creativeProjects.id })
      .from(creativeProjects)
      .where(and(eq(creativeProjects.id, projectId), eq(creativeProjects.userId, userId)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado" }, { status: 404 });
    }

    // Delete project (cascades to outputs via FK)
    await db
      .delete(creativeProjects)
      .where(eq(creativeProjects.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_PROJECT_DELETE_FAILED");
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError) },
      { status: appError.statusCode }
    );
  }
}
