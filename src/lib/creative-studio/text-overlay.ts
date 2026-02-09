/**
 * Creative Studio — Text Overlay via Sharp
 *
 * Applies text overlay on images using Sharp + SVG compositing.
 * No native canvas required — uses SVG text rendering.
 */

import sharp from "sharp";
import type { TextOverlayConfig, TextPosition } from "./types";
import { TEXT_SAFE_ZONE_PERCENT } from "./constants";

export async function applyTextOverlay(
  imageBuffer: Buffer,
  config: TextOverlayConfig,
  outputWidth: number,
  outputHeight: number
): Promise<Buffer> {
  if (!config.content.trim()) {
    return imageBuffer;
  }

  const safeZone = TEXT_SAFE_ZONE_PERCENT / 100;
  const padX = Math.round(outputWidth * safeZone);
  const padY = Math.round(outputHeight * safeZone);
  const maxTextWidth = config.maxWidth
    ? Math.round(outputWidth * (config.maxWidth / 100))
    : outputWidth - padX * 2;

  // Calculate position
  const { x, y, anchor, dominantBaseline } = getPositionCoords(
    config.position,
    outputWidth,
    outputHeight,
    padX,
    padY
  );

  // Build SVG text overlay
  const svgText = buildSvgOverlay({
    content: config.content,
    x,
    y,
    anchor,
    dominantBaseline,
    fontFamily: mapToSafeFont(config.fontFamily),
    fontSize: config.fontSize,
    fontWeight: config.fontWeight === "black" ? "900" : config.fontWeight,
    textColor: config.textColor,
    textTransform: config.textTransform,
    shadow: config.shadow,
    shadowConfig: config.shadowConfig,
    backgroundColor: config.backgroundColor,
    backgroundOpacity: config.backgroundOpacity,
    maxWidth: maxTextWidth,
    outputWidth,
    outputHeight,
    lineHeight: config.lineHeight ?? 1.3,
  });

  const svgBuffer = Buffer.from(svgText);

  // Composite SVG onto image
  const result = await sharp(imageBuffer)
    .resize(outputWidth, outputHeight, { fit: "cover" })
    .composite([
      {
        input: svgBuffer,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

// ========================================
// POSITION CALCULATION
// ========================================

interface PositionResult {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  dominantBaseline: "hanging" | "middle" | "auto";
}

function getPositionCoords(
  position: TextPosition,
  width: number,
  height: number,
  padX: number,
  padY: number
): PositionResult {
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  const map: Record<TextPosition, PositionResult> = {
    "top-left": { x: padX, y: padY, anchor: "start", dominantBaseline: "hanging" },
    "top-center": { x: cx, y: padY, anchor: "middle", dominantBaseline: "hanging" },
    "top-right": { x: width - padX, y: padY, anchor: "end", dominantBaseline: "hanging" },
    "center-left": { x: padX, y: cy, anchor: "start", dominantBaseline: "middle" },
    center: { x: cx, y: cy, anchor: "middle", dominantBaseline: "middle" },
    "center-right": { x: width - padX, y: cy, anchor: "end", dominantBaseline: "middle" },
    "bottom-left": { x: padX, y: height - padY, anchor: "start", dominantBaseline: "auto" },
    "bottom-center": { x: cx, y: height - padY, anchor: "middle", dominantBaseline: "auto" },
    "bottom-right": { x: width - padX, y: height - padY, anchor: "end", dominantBaseline: "auto" },
  };

  return map[position];
}

// ========================================
// SVG BUILDER
// ========================================

interface SvgParams {
  content: string;
  x: number;
  y: number;
  anchor: string;
  dominantBaseline: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  textTransform?: string;
  shadow?: boolean;
  shadowConfig?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  backgroundColor?: string;
  backgroundOpacity?: number;
  maxWidth: number;
  outputWidth: number;
  outputHeight: number;
  lineHeight: number;
}

function buildSvgOverlay(params: SvgParams): string {
  const {
    content,
    x,
    y,
    anchor,
    dominantBaseline,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    textTransform,
    shadow,
    shadowConfig,
    backgroundColor,
    backgroundOpacity,
    outputWidth,
    outputHeight,
    lineHeight,
  } = params;

  const displayContent = applyTextTransform(content, textTransform);
  const lines = wrapText(displayContent, params.maxWidth, fontSize);
  const lineHeightPx = fontSize * lineHeight;

  // Shadow filter
  const filterId = "text-shadow";
  const shadowFilter = shadow
    ? `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="${shadowConfig?.offsetX ?? 2}" dy="${shadowConfig?.offsetY ?? 2}"
          stdDeviation="${(shadowConfig?.blur ?? 4) / 2}" flood-color="${escapeXml(shadowConfig?.color ?? "rgba(0,0,0,0.8)")}" />
      </filter>`
    : "";

  // Background rectangle (optional)
  let bgRect = "";
  if (backgroundColor && backgroundOpacity && backgroundOpacity > 0) {
    const bgPadX = fontSize * 0.5;
    const bgPadY = fontSize * 0.3;
    const totalHeight = lines.length * lineHeightPx;

    // Estimate max text width from lines
    const estMaxLineWidth = Math.max(
      ...lines.map((line) => line.length * fontSize * 0.55)
    );

    let rectX = x - bgPadX;
    const rectW = Math.min(estMaxLineWidth, params.maxWidth) + bgPadX * 2;
    const rectH = totalHeight + bgPadY * 2;

    // Adjust rect X based on anchor
    if (anchor === "middle") {
      rectX = x - rectW / 2;
    } else if (anchor === "end") {
      rectX = x - rectW;
    }

    let rectY = y - bgPadY;
    if (dominantBaseline === "middle") {
      rectY = y - totalHeight / 2 - bgPadY;
    } else if (dominantBaseline === "auto") {
      rectY = y - totalHeight - bgPadY;
    }

    bgRect = `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8"
      fill="${escapeXml(backgroundColor)}" fill-opacity="${backgroundOpacity}" />`;
  }

  // Build text lines
  const textLines = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineHeightPx;
      return `<tspan x="${x}" dy="${i === 0 ? "0" : dy}">${escapeXml(line)}</tspan>`;
    })
    .join("\n      ");

  // Adjust Y for multi-line offset when baseline is middle or auto
  let adjustedY = y;
  const totalTextHeight = (lines.length - 1) * lineHeightPx;
  if (dominantBaseline === "middle") {
    adjustedY = y - totalTextHeight / 2;
  } else if (dominantBaseline === "auto") {
    adjustedY = y - totalTextHeight;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}">
  <defs>
    ${shadowFilter}
  </defs>
  ${bgRect}
  <text
    x="${x}" y="${adjustedY}"
    text-anchor="${anchor}"
    dominant-baseline="${dominantBaseline}"
    font-family="${escapeXml(fontFamily)}, sans-serif"
    font-size="${fontSize}"
    font-weight="${escapeXml(fontWeight)}"
    fill="${escapeXml(textColor)}"
    ${shadow ? `filter="url(#${filterId})"` : ""}
  >
    ${textLines}
  </text>
</svg>`;
}

// ========================================
// HELPERS
// ========================================

function applyTextTransform(text: string, transform?: string): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

/**
 * Simple word-wrap based on estimated character width.
 * SVG doesn't have native text wrapping, so we do it manually.
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.55; // approximate for most fonts
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  if (maxChars <= 0) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.length > 0 ? lines : [text];
}

/**
 * Map custom font names to web-safe equivalents for SVG rendering.
 * Sharp renders SVG with system fonts only.
 */
function mapToSafeFont(fontFamily: string): string {
  const safeMap: Record<string, string> = {
    Inter: "Arial",
    Montserrat: "Arial",
    "Roboto Mono": "Courier New",
    "Playfair Display": "Georgia",
  };
  return safeMap[fontFamily] ?? fontFamily;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
