/**
 * Creative Studio — Smart Resize
 *
 * Resizes images using Sharp with smart crop or fill mode.
 * - Crop: uses Sharp attention-based smart crop
 * - Fill: places image centered with blurred background fill
 */

import sharp from "sharp";
import { FORMAT_DIMENSIONS } from "./constants";

interface SmartResizeParams {
  imageBuffer: Buffer;
  targetFormat: string; // "1:1", "4:5", etc.
  fitMode: "crop" | "fill";
}

interface SmartResizeResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function smartResize(params: SmartResizeParams): Promise<SmartResizeResult> {
  const dim = FORMAT_DIMENSIONS[params.targetFormat];
  if (!dim) {
    throw new Error(`Unknown format: ${params.targetFormat}`);
  }

  const { width, height } = dim;

  if (params.fitMode === "crop") {
    return smartCrop(params.imageBuffer, width, height);
  } else {
    return fillWithBlur(params.imageBuffer, width, height);
  }
}

/**
 * Smart crop using Sharp's "attention" strategy.
 * Focuses on the most visually interesting part of the image.
 */
async function smartCrop(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<SmartResizeResult> {
  const buffer = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .png()
    .toBuffer();

  return { buffer, width: targetWidth, height: targetHeight };
}

/**
 * Fill mode: places the original image centered on a blurred/enlarged version of itself.
 * Creates a "letterbox" effect with a contextual background.
 */
async function fillWithBlur(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number
): Promise<SmartResizeResult> {
  // Create blurred background
  const background = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: "cover" })
    .blur(30)
    .modulate({ brightness: 0.5 })
    .png()
    .toBuffer();

  // Resize original to fit within target (contain)
  const foreground = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: "inside" })
    .png()
    .toBuffer();

  // Get foreground dimensions for centering
  const fgMeta = await sharp(foreground).metadata();
  const fgWidth = fgMeta.width ?? targetWidth;
  const fgHeight = fgMeta.height ?? targetHeight;

  const offsetX = Math.round((targetWidth - fgWidth) / 2);
  const offsetY = Math.round((targetHeight - fgHeight) / 2);

  // Composite: foreground over blurred background
  const buffer = await sharp(background)
    .composite([
      {
        input: foreground,
        left: offsetX,
        top: offsetY,
      },
    ])
    .png()
    .toBuffer();

  return { buffer, width: targetWidth, height: targetHeight };
}
