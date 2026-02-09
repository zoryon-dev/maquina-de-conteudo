/**
 * POST /api/creative-studio/resize
 *
 * Smart resize of an image to multiple target formats.
 * Supports "crop" (attention-based) and "fill" (blurred background) modes.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { getStorageProvider } from "@/lib/storage";
import { smartResize } from "@/lib/creative-studio/image-resize";
import { getResizedKey } from "@/lib/creative-studio/constants";
import { resizeSchema, validateImageUrl } from "@/lib/creative-studio/validation";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const userId = await ensureAuthenticatedUser();

    const body = await request.json();
    const parsed = resizeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(". "));
    }

    const { imageUrl, targetFormats, fitMode } = parsed.data;

    // Validate URL before server-side fetch (SSRF protection)
    validateImageUrl(imageUrl);

    // Fetch source image
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("data:")) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      imageBuffer = Buffer.from(await resp.arrayBuffer());
    }

    const storage = getStorageProvider();
    const results: Array<{
      format: string;
      url: string;
      width: number;
      height: number;
    }> = [];

    for (const format of targetFormats) {
      const resized = await smartResize({
        imageBuffer,
        targetFormat: format,
        fitMode,
      });

      const key = getResizedKey(userId, format);
      const uploadResult = await storage.uploadFile(resized.buffer, key, {
        contentType: "image/png",
      });

      results.push({
        format,
        url: uploadResult.url,
        width: resized.width,
        height: resized.height,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_RESIZE_FAILED");
    console.error("[CreativeStudio:Resize]", appError.code, ":", appError.message);
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    );
  }
}
