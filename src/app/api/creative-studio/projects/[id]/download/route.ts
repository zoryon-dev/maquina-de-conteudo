/**
 * GET /api/creative-studio/projects/[id]/download
 *
 * Downloads all outputs of a project as a ZIP file.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { db } from "@/db";
import { creativeProjects, creativeOutputs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import archiver from "archiver";
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

    // Verify ownership
    const [project] = await db
      .select({ id: creativeProjects.id, title: creativeProjects.title })
      .from(creativeProjects)
      .where(and(eq(creativeProjects.id, projectId), eq(creativeProjects.userId, userId)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado" }, { status: 404 });
    }

    // Get outputs
    const outputs = await db
      .select({
        id: creativeOutputs.id,
        imageUrl: creativeOutputs.imageUrl,
        format: creativeOutputs.format,
      })
      .from(creativeOutputs)
      .where(eq(creativeOutputs.projectId, projectId));

    if (outputs.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma imagem para download" }, { status: 404 });
    }

    // Create ZIP
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Add each image to ZIP
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];
      try {
        const resp = await fetch(output.imageUrl);
        if (!resp.ok) continue;
        const buffer = Buffer.from(await resp.arrayBuffer());
        const safeFormat = output.format.replace(/[:/]/g, "x");
        archive.append(buffer, { name: `${safeFormat}_${i + 1}.png` });
      } catch {
        // Skip failed downloads
      }
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(chunks);

    const filename = (project.title || `creative-project-${projectId}`)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}.zip"`,
      },
    });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_DOWNLOAD_FAILED");
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError) },
      { status: appError.statusCode }
    );
  }
}
