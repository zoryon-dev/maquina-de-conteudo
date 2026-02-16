/**
 * Text Overlay Preview
 *
 * Live preview of how text will look on an image.
 * Uses a gradient placeholder background and renders text in real-time.
 */

"use client";

import { cn } from "@/lib/utils";
import { TEXT_SAFE_ZONE_PERCENT } from "@/lib/creative-studio/constants";
import type { TextOverlayConfig, TextPosition } from "@/lib/creative-studio/types";
import { Type, Info } from "lucide-react";

interface TextOverlayPreviewProps {
  config: TextOverlayConfig;
  backgroundImage?: string;
  aspectRatio?: string;
  className?: string;
}

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTransform(text: string, transform: string): string {
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

export function TextOverlayPreview({
  config,
  backgroundImage,
  aspectRatio = "1 / 1",
  className,
}: TextOverlayPreviewProps) {
  // Use a consistent gradient based on config content hash
  const gradientIndex = config.content.length % GRADIENTS.length;
  const gradient = GRADIENTS[gradientIndex];

  const pad = `${TEXT_SAFE_ZONE_PERCENT}%`;

  const positionStyles: Record<TextPosition, React.CSSProperties> = {
    "top-left": { top: pad, left: pad },
    "top-center": { top: pad, left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: pad, right: pad },
    "center-left": { top: "50%", left: pad, transform: "translateY(-50%)" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "center-right": { top: "50%", right: pad, transform: "translateY(-50%)" },
    "bottom-left": { bottom: pad, left: pad },
    "bottom-center": {
      bottom: pad,
      left: "50%",
      transform: "translateX(-50%)",
    },
    "bottom-right": { bottom: pad, right: pad },
  };

  const appliedText =
    config.textTransform && config.content
      ? applyTransform(config.content, config.textTransform)
      : config.content;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
        Preview do texto
      </label>

      <div
        className="relative w-full rounded-xl overflow-hidden border border-white/10"
        style={{
          aspectRatio,
          background: backgroundImage
            ? `url(${backgroundImage}) center/cover`
            : gradient,
        }}
      >
        {/* Dark overlay for better text visibility on gradient */}
        {!backgroundImage && (
          <div className="absolute inset-0 bg-black/30" />
        )}

        {/* Text content */}
        {config.content.trim() ? (
          <div
            className="absolute whitespace-pre-wrap break-words z-10"
            style={{
              ...positionStyles[config.position],
              maxWidth: `${config.maxWidth ?? 90}%`,
              fontFamily: config.fontFamily,
              fontSize: `${Math.max(8, config.fontSize * 0.4)}px`,
              fontWeight:
                config.fontWeight === "black" ? 900 : config.fontWeight,
              color: config.textColor,
              textAlign: config.textAlign,
              lineHeight: config.lineHeight ?? 1.3,
              letterSpacing: config.letterSpacing
                ? `${config.letterSpacing}px`
                : undefined,
              textShadow: config.shadow
                ? `${config.shadowConfig?.offsetX ?? 2}px ${config.shadowConfig?.offsetY ?? 2}px ${config.shadowConfig?.blur ?? 4}px ${config.shadowConfig?.color ?? "rgba(0,0,0,0.8)"}`
                : undefined,
              backgroundColor:
                config.backgroundColor && config.backgroundOpacity
                  ? hexToRgba(
                      config.backgroundColor,
                      config.backgroundOpacity
                    )
                  : undefined,
              padding:
                config.backgroundColor && config.backgroundOpacity
                  ? "4px 8px"
                  : undefined,
              borderRadius:
                config.backgroundColor && config.backgroundOpacity
                  ? "4px"
                  : undefined,
            }}
          >
            {appliedText}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-white/30">
              <Type className="size-5" />
              <span className="text-sm">Digite um texto para ver o preview</span>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-1.5">
        <Info className="size-3 text-white/25 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-white/25">
          Preview aproximado — resultado final pode variar
        </p>
      </div>
    </div>
  );
}
