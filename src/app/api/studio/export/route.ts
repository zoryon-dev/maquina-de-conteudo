/**
 * POST /api/studio/export
 *
 * Renderiza todos os slides do Studio como PNGs via ScreenshotOne
 * e retorna as imagens como base64 para o cliente gerar o ZIP.
 *
 * Diferente de /api/studio/publish, este endpoint nao salva nada
 * no banco de dados nem no storage. Apenas retorna as imagens.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import type {
  StudioSlide,
  StudioProfile,
  StudioHeader,
} from "@/lib/studio-templates/types";
import {
  toAppError,
  getErrorMessage,
  ValidationError,
  ConfigError,
} from "@/lib/errors";

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREENSHOT_ONE_API = "https://api.screenshotone.com/take";
const SCREENSHOT_ONE_ACCESS_KEY = process.env.SCREENSHOT_ONE_ACCESS_KEY;
const REQUEST_TIMEOUT = 60000; // 1 minute per image

// ============================================================================
// TYPES
// ============================================================================

interface ExportRequest {
  slides: StudioSlide[];
  profile: StudioProfile;
  header: StudioHeader;
}

interface ExportedSlide {
  index: number;
  base64: string;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Nao autenticado", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  try {
    const body: ExportRequest = await request.json();
    const { slides, profile, header } = body;

    if (!slides || slides.length === 0) {
      throw new ValidationError("Nenhum slide para exportar");
    }

    if (!SCREENSHOT_ONE_ACCESS_KEY) {
      throw new ConfigError(
        "ScreenshotOne nao configurado. Configure SCREENSHOT_ONE_ACCESS_KEY."
      );
    }

    console.log(
      `[StudioExport] Rendering ${slides.length} slides for export`
    );

    const exportedSlides: ExportedSlide[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      const result = renderSlideToHtml({
        slide,
        profile,
        header,
        slideIndex: i,
        totalSlides: slides.length,
      });

      const response = await fetch(SCREENSHOT_ONE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        console.error(
          `[StudioExport] ScreenshotOne failed for slide ${i + 1}:`,
          response.status,
          errorText
        );
        throw new Error(
          `Erro ao renderizar slide ${i + 1}: ${response.status}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      exportedSlides.push({ index: i, base64 });

      console.log(
        `[StudioExport] Slide ${i + 1}/${slides.length} rendered`
      );
    }

    return NextResponse.json({
      success: true,
      slides: exportedSlides,
    });
  } catch (error) {
    const appError = toAppError(error, "STUDIO_EXPORT_FAILED");
    console.error("[StudioExport]", appError.code, ":", appError.message);

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
