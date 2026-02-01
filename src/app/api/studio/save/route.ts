/**
 * POST /api/studio/save
 *
 * Salva o projeto do Studio como rascunho na biblioteca.
 * Permite continuar editando depois.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { StudioState } from "@/lib/studio-templates/types";
import { MAX_SLIDES } from "@/lib/studio-templates/types";
import { toAppError, getErrorMessage, ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";

// ============================================================================
// TYPES
// ============================================================================

interface SaveRequest {
  projectId?: number; // Se existir, atualiza; senão, cria novo
  state: StudioState;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  try {
    const body: SaveRequest = await request.json();
    const { projectId, state } = body;

    if (!state || !state.slides || state.slides.length === 0) {
      throw new ValidationError("Estado do projeto inválido");
    }

    // Validar limite de slides
    if (state.slides.length > MAX_SLIDES) {
      throw new ValidationError(`Máximo de ${MAX_SLIDES} slides permitido`);
    }

    // Determinar tipo baseado no contentType
    const type = state.contentType === "single"
      ? "image"
      : state.contentType === "story"
      ? "story"
      : "carousel";

    // Preparar dados para salvar
    const contentData = {
      studio: {
        slides: state.slides,
        profile: state.profile,
        header: state.header,
        aspectRatio: state.aspectRatio,
      },
      caption: state.caption,
      hashtags: state.hashtags,
    };

    if (projectId) {
      // Atualizar projeto existente - usar atomic update para evitar race condition
      const result = await db
        .update(libraryItems)
        .set({
          title: state.projectTitle,
          content: JSON.stringify(contentData),
          updatedAt: new Date(),
        })
        .where(and(
          eq(libraryItems.id, projectId),
          eq(libraryItems.userId, userId)
        ))
        .returning({ id: libraryItems.id });

      if (result.length === 0) {
        // Verificar se existe para diferenciar 404 de 403
        const [exists] = await db
          .select({ id: libraryItems.id })
          .from(libraryItems)
          .where(eq(libraryItems.id, projectId))
          .limit(1);

        if (!exists) {
          throw new NotFoundError("Projeto", String(projectId));
        }
        throw new ForbiddenError("Sem permissão para editar este projeto");
      }

      return NextResponse.json({
        success: true,
        projectId,
        message: "Projeto salvo com sucesso",
      });

    } else {
      // Criar novo projeto
      const [newItem] = await db
        .insert(libraryItems)
        .values({
          userId,
          type,
          status: "draft",
          title: state.projectTitle,
          content: JSON.stringify(contentData),
          metadata: JSON.stringify({
            source: "studio",
            version: "1.0",
            slideCount: state.slides.length,
          }),
        })
        .returning({ id: libraryItems.id });

      return NextResponse.json({
        success: true,
        projectId: newItem.id,
        message: "Projeto criado com sucesso",
      });
    }

  } catch (error) {
    const appError = toAppError(error, "STUDIO_SAVE_FAILED");
    console.error("[StudioSave]", appError.code, ":", appError.message);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(appError),
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
}

// ============================================================================
// GET - Load project
// ============================================================================

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      throw new ValidationError("ID do projeto não especificado");
    }

    // Validar que projectId é um número válido
    const projectIdNum = parseInt(projectId, 10);
    if (isNaN(projectIdNum) || projectIdNum <= 0) {
      throw new ValidationError("ID do projeto inválido", { projectId });
    }

    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, projectIdNum))
      .limit(1);

    if (!item) {
      throw new NotFoundError("Projeto", projectId);
    }

    if (item.userId !== userId) {
      throw new ForbiddenError("Sem permissão para acessar este projeto");
    }

    // Parse content
    let studioState = null;
    if (item.content) {
      try {
        const content = JSON.parse(item.content);
        if (content.studio) {
          studioState = {
            contentType: item.type === "carousel" ? "carousel" : item.type === "story" ? "story" : "single",
            ...content.studio,
            caption: content.caption || "",
            hashtags: content.hashtags || [],
            projectTitle: item.title || "Projeto sem título",
          };
        }
      } catch (parseError) {
        console.warn("[StudioLoad] Failed to parse project content:", {
          projectId: item.id,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        studioState,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });

  } catch (error) {
    const appError = toAppError(error, "STUDIO_LOAD_FAILED");
    console.error("[StudioLoad]", appError.code, ":", appError.message);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(appError),
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
}
