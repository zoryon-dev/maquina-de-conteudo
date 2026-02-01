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
import { eq } from "drizzle-orm";
import type { StudioState } from "@/lib/studio-templates/types";

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
      { success: false, error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    const body: SaveRequest = await request.json();
    const { projectId, state } = body;

    if (!state || !state.slides || state.slides.length === 0) {
      return NextResponse.json(
        { success: false, error: "Estado do projeto inválido" },
        { status: 400 }
      );
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
      // Atualizar projeto existente
      const [existing] = await db
        .select()
        .from(libraryItems)
        .where(eq(libraryItems.id, projectId))
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Projeto não encontrado" },
          { status: 404 }
        );
      }

      if (existing.userId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para editar este projeto" },
          { status: 403 }
        );
      }

      await db
        .update(libraryItems)
        .set({
          title: state.projectTitle,
          content: JSON.stringify(contentData),
          updatedAt: new Date(),
        })
        .where(eq(libraryItems.id, projectId));

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
    console.error("[STUDIO-SAVE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao salvar projeto",
      },
      { status: 500 }
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
      { success: false, error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "ID do projeto não especificado" },
        { status: 400 }
      );
    }

    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, parseInt(projectId)))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Projeto não encontrado" },
        { status: 404 }
      );
    }

    if (item.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para acessar este projeto" },
        { status: 403 }
      );
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
      } catch {
        // Content não é JSON válido
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
    console.error("[STUDIO-LOAD] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao carregar projeto",
      },
      { status: 500 }
    );
  }
}
