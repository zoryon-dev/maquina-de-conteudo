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
import { getStorageProvider } from "@/lib/storage";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import type { StudioState, StudioSlide, StudioProfile, StudioHeader } from "@/lib/studio-templates/types";
import { toAppError, getErrorMessage, ValidationError, NotFoundError, ForbiddenError, ConfigError, NetworkError } from "@/lib/errors";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREENSHOT_ONE_API = "https://api.screenshotone.com/take";
const SCREENSHOT_ONE_ACCESS_KEY = process.env.SCREENSHOT_ONE_ACCESS_KEY;
const REQUEST_TIMEOUT = 60000; // 1 minute per image

// ============================================================================
// TYPES
// ============================================================================

interface PublishRequest {
  projectId?: number; // Se existir, atualiza; senão, cria novo
  state: StudioState;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Renderiza um slide para imagem PNG via ScreenshotOne
 */
async function renderSlideToImage(
  slide: StudioSlide,
  profile: StudioProfile,
  header: StudioHeader,
  slideIndex: number,
  totalSlides: number
): Promise<Buffer> {
  // Gerar HTML
  const result = renderSlideToHtml({
    slide,
    profile,
    header,
    slideIndex,
    totalSlides,
  });

  if (!SCREENSHOT_ONE_ACCESS_KEY) {
    throw new Error("ScreenshotOne não configurado");
  }

  // Chamar ScreenshotOne API
  const response = await fetch(SCREENSHOT_ONE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_key: SCREENSHOT_ONE_ACCESS_KEY,
      html: result.html,
      viewport_width: 1080,
      viewport_height: 1440,
      format: "png",
      device_scale_factor: 2,
      cache: false,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ScreenshotOne failed: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
    if (!SCREENSHOT_ONE_ACCESS_KEY) {
      throw new ConfigError("ScreenshotOne não configurado. Configure SCREENSHOT_ONE_ACCESS_KEY.");
    }

    console.log(`[StudioPublish] Starting publish for ${state.slides.length} slides`);

    // Renderizar todos os slides
    const storage = getStorageProvider();
    const imageUrls: string[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < state.slides.length; i++) {
      const slide = state.slides[i];

      console.log(`[StudioPublish] Rendering slide ${i + 1}/${state.slides.length}`);

      try {
        // Renderizar para imagem
        const imageBuffer = await renderSlideToImage(
          slide,
          state.profile,
          state.header,
          i,
          state.slides.length
        );

        // Upload para storage
        const key = `studio/${userId}/published/${timestamp}/slide-${i + 1}.png`;
        const uploadResult = await storage.uploadFile(imageBuffer, key, {
          contentType: "image/png",
        });

        imageUrls.push(uploadResult.url);

        console.log(`[StudioPublish] Slide ${i + 1} uploaded: ${uploadResult.url}`);

      } catch (slideError) {
        console.error(`[StudioPublish] Error rendering slide ${i + 1}:`, slideError);
        // Erro de renderização específico
        throw new NetworkError(
          `Erro ao renderizar slide ${i + 1}: ${slideError instanceof Error ? slideError.message : "Erro desconhecido"}`,
          { slideIndex: i, slideId: slide.id }
        );
      }
    }

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
