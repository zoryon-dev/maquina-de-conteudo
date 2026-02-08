/**
 * POST /api/creative-studio/overlay
 *
 * Applies text overlay on an image using Sharp + SVG compositing.
 * Returns the URL of the processed image.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { getStorageProvider } from "@/lib/storage";
import { applyTextOverlay } from "@/lib/creative-studio/text-overlay";
import { getOverlayKey, FORMAT_DIMENSIONS } from "@/lib/creative-studio/constants";
import { overlaySchema } from "@/lib/creative-studio/validation";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const userId = await ensureAuthenticatedUser();

    const body = await request.json();
    const parsed = overlaySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(". "));
    }

    const { imageUrl, textConfig, format } = parsed.data;

    // Determine output dimensions
    const dim = format ? FORMAT_DIMENSIONS[format] : null;
    const outputWidth = dim?.width ?? 1080;
    const outputHeight = dim?.height ?? 1080;

    // Fetch image
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("data:")) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      imageBuffer = Buffer.from(await resp.arrayBuffer());
    }

    // Apply overlay
    const resultBuffer = await applyTextOverlay(
      imageBuffer,
      textConfig,
      outputWidth,
      outputHeight
    );

    // Upload result
    const storage = getStorageProvider();
    const key = getOverlayKey(userId);
    const uploadResult = await storage.uploadFile(resultBuffer, key, {
      contentType: "image/png",
    });

    return NextResponse.json({
      success: true,
      resultUrl: uploadResult.url,
      storageKey: key,
      width: outputWidth,
      height: outputHeight,
    });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_OVERLAY_FAILED");
    console.error("[CreativeStudio:Overlay]", appError.code, ":", appError.message);
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    );
  }
}
