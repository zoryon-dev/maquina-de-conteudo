/**
 * POST /api/studio/publish
 *
 * Publica o projeto do Studio na biblioteca.
 * Renderiza as imagens finais usando ScreenshotOne e salva no storage.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { StudioState } from "@/lib/studio-templates/types";
import { toAppError, getErrorMessage, ValidationError, NotFoundError, ForbiddenError, ConfigError } from "@/lib/errors";
import { isScreenshotOneAvailable, renderAndUploadAllSlides } from "@/lib/studio-templates/render-to-image";

// ============================================================================
// TYPES
// ============================================================================

interface PublishRequest {
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
    const body: PublishRequest = await request.json();
    const { projectId, state } = body;

    if (!state || !state.slides || state.slides.length === 0) {
      throw new ValidationError("Estado do projeto inválido");
    }

    // Verificar configuração
    if (!isScreenshotOneAvailable()) {
      throw new ConfigError("ScreenshotOne não configurado. Configure SCREENSHOT_ONE_ACCESS_KEY.");
    }

    console.log(`[StudioPublish] Starting publish for ${state.slides.length} slides`);

    // Renderizar todos os slides via shared utility
    const timestamp = Date.now();
    const renderResult = await renderAndUploadAllSlides({
      slides: state.slides,
      profile: state.profile,
      header: state.header,
      userId,
      storagePrefix: `studio/${userId}/published/${timestamp}`,
    });

    // Publish requires ALL slides to render successfully
    if (renderResult.errors.length > 0) {
      const firstError = renderResult.errors[0];
      throw new ConfigError(
        `Erro ao renderizar slide ${firstError.slideIndex + 1}: ${firstError.error}`
      );
    }

    const imageUrls = renderResult.imageUrls;

    // Determinar tipo
    const type = state.contentType === "single"
      ? "image"
      : state.contentType === "story"
      ? "story"
      : "carousel";

    // Preparar dados
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

    let savedProjectId: number;

    if (projectId) {
      // Atualizar projeto existente - usar atomic update
      const result = await db
        .update(libraryItems)
        .set({
          title: state.projectTitle,
          content: JSON.stringify(contentData),
          mediaUrl: JSON.stringify(imageUrls),
          status: "draft", // Publicado como rascunho (usuário pode agendar depois)
          updatedAt: new Date(),
          metadata: JSON.stringify({
            source: "studio",
            version: "1.0",
            slideCount: state.slides.length,
            publishedAt: new Date().toISOString(),
          }),
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

      savedProjectId = projectId;

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
          mediaUrl: JSON.stringify(imageUrls),
          metadata: JSON.stringify({
            source: "studio",
            version: "1.0",
            slideCount: state.slides.length,
            publishedAt: new Date().toISOString(),
          }),
        })
        .returning({ id: libraryItems.id });

      savedProjectId = newItem.id;
    }

    console.log(`[StudioPublish] Published successfully. Project ID: ${savedProjectId}`);

    return NextResponse.json({
      success: true,
      projectId: savedProjectId,
      imageUrls,
      message: "Projeto publicado com sucesso!",
      redirectUrl: `/library/${savedProjectId}`,
    });

  } catch (error) {
    const appError = toAppError(error, "STUDIO_PUBLISH_FAILED");
    console.error("[StudioPublish]", appError.code, ":", appError.message);

    // Erro específico de renderização (ScreenshotOne)
    if (appError.message.includes("ScreenshotOne") || appError.message.includes("renderizar slide")) {
      return NextResponse.json(
        { success: false, error: "Erro ao renderizar slides. Tente novamente.", code: "RENDER_FAILED" },
        { status: 503 }
      );
    }

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
