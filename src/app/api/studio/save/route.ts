/**
 * POST /api/studio/save
 *
 * Salva o projeto do Studio como rascunho na biblioteca.
 * Permite continuar editando depois.
 * Agora também gera uma preview image do primeiro slide.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { StudioState } from "@/lib/studio-templates/types";
import { MAX_SLIDES } from "@/lib/studio-templates/types";
import { toAppError, getErrorMessage, ValidationError, NotFoundError, ForbiddenError, ConfigError } from "@/lib/errors";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import { getStorageProvider } from "@/lib/storage";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREENSHOT_ONE_API = "https://api.screenshotone.com/take";
const SCREENSHOT_ONE_ACCESS_KEY = process.env.SCREENSHOT_ONE_ACCESS_KEY;
const REQUEST_TIMEOUT = 30000; // 30 seconds for preview

// ============================================================================
// TYPES
// ============================================================================

interface SaveRequest {
  projectId?: number; // Se existir, atualiza; senão, cria novo
  state: StudioState;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera uma preview image do primeiro slide
 * Retorna null se falhar (não bloqueia o save)
 */
async function generatePreviewImage(
  state: StudioState,
  userId: string
): Promise<string | null> {
  // Se ScreenshotOne não configurado, pular preview
  if (!SCREENSHOT_ONE_ACCESS_KEY) {
    console.log("[StudioSave] ScreenshotOne not configured, skipping preview");
    return null;
  }

  try {
    const firstSlide = state.slides[0];

    // Renderizar HTML do primeiro slide
    const { html } = renderSlideToHtml({
      slide: firstSlide,
      profile: state.profile,
      header: state.header,
      slideIndex: 0,
      totalSlides: state.slides.length,
    });

    // Chamar ScreenshotOne API
    const response = await fetch(SCREENSHOT_ONE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_key: SCREENSHOT_ONE_ACCESS_KEY,
        html,
        viewport_width: 1080,
        viewport_height: 1440,
        format: "png",
        device_scale_factor: 1, // Menor escala para preview
        cache: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      console.warn("[StudioSave] ScreenshotOne failed:", response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Upload para storage
    const storage = getStorageProvider();
    const timestamp = Date.now();
    const key = `studio/${userId}/previews/${timestamp}-preview.png`;
    const uploadResult = await storage.uploadFile(imageBuffer, key, {
      contentType: "image/png",
    });

    console.log("[StudioSave] Preview generated:", uploadResult.url);
    return uploadResult.url;

  } catch (error) {
    // Log mas não bloqueia o save
    console.warn("[StudioSave] Preview generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
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

    // Gerar preview image do primeiro slide (não bloqueia se falhar)
    console.log("[StudioSave] Generating preview image...");
    const previewUrl = await generatePreviewImage(state, userId);

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

    // Preparar mediaUrl (preview ou null)
    const mediaUrl = previewUrl ? JSON.stringify([previewUrl]) : null;

    if (projectId) {
      // Atualizar projeto existente - usar atomic update para evitar race condition
      const updateData: Record<string, unknown> = {
        title: state.projectTitle,
        content: JSON.stringify(contentData),
        updatedAt: new Date(),
      };

      // Só atualiza mediaUrl se gerou preview nova
      if (mediaUrl) {
        updateData.mediaUrl = mediaUrl;
      }

      const result = await db
        .update(libraryItems)
        .set(updateData)
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
          mediaUrl, // Preview image (pode ser null)
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
