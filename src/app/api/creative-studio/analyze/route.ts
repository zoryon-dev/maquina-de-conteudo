/**
 * POST /api/creative-studio/analyze
 *
 * Analyzes a reference image using Gemini Vision for Replicate mode.
 * Returns structured analysis: layout, colors, typography, texts, style.
 */

import { NextResponse } from "next/server";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { analyzeImage } from "@/lib/creative-studio/image-analysis";
import { toAppError, getErrorMessage, ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    await ensureAuthenticatedUser();

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new ValidationError("imageUrl é obrigatório");
    }

    // If it's a regular URL, fetch and convert to base64
    let imageBase64 = imageUrl;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const imageResp = await fetch(imageUrl);
      if (!imageResp.ok) throw new Error(`Failed to fetch image: ${imageResp.status}`);
      const buffer = Buffer.from(await imageResp.arrayBuffer());
      const contentType = imageResp.headers.get("content-type") || "image/png";
      imageBase64 = `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    const analysis = await analyzeImage(imageBase64);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    const appError = toAppError(error, "CREATIVE_ANALYZE_FAILED");
    console.error("[CreativeStudio:Analyze]", appError.code, ":", appError.message);
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    );
  }
}
