"use client";

import { cn } from "@/lib/utils";
import { AVAILABLE_FONTS, TEXT_SAFE_ZONE_PERCENT } from "@/lib/creative-studio/constants";
import type { TextOverlayConfig, TextPosition } from "@/lib/creative-studio/types";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Bold,
  Minus,
  Plus,
} from "lucide-react";

interface TextOverlayEditorProps {
  config: TextOverlayConfig;
  onChange: (config: TextOverlayConfig) => void;
  previewImage?: string;
}

const POSITIONS: { value: TextPosition; label: string }[] = [
  { value: "top-left", label: "↖" },
  { value: "top-center", label: "↑" },
  { value: "top-right", label: "↗" },
  { value: "center-left", label: "←" },
  { value: "center", label: "●" },
  { value: "center-right", label: "→" },
  { value: "bottom-left", label: "↙" },
  { value: "bottom-center", label: "↓" },
  { value: "bottom-right", label: "↘" },
];

const FONT_WEIGHTS: { value: "normal" | "bold" | "black"; label: string }[] = [
  { value: "normal", label: "Regular" },
  { value: "bold", label: "Bold" },
  { value: "black", label: "Black" },
];

export function TextOverlayEditor({
  config,
  onChange,
  previewImage,
}: TextOverlayEditorProps) {
  const update = (partial: Partial<TextOverlayConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div
        className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/10"
        style={{
          background: previewImage
            ? `url(${previewImage}) center/cover`
            : "linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 100%)",
        }}
      >
        <TextPreview config={config} />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Texto
        </label>
        <textarea
          value={config.content}
          onChange={(e) => update({ content: e.target.value })}
          placeholder="Digite seu texto..."
          rows={2}
          className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm outline-none resize-none"
        />
      </div>

      {/* Font + Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Fonte</label>
          <select
            value={config.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white px-3 py-2 text-sm outline-none"
          >
            {AVAILABLE_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Peso</label>
          <div className="flex gap-1">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => update({ fontWeight: w.value })}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-xs transition-colors border",
                  config.fontWeight === w.value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-white/50">
            Tamanho: {config.fontSize}px
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => update({ fontSize: Math.max(12, config.fontSize - 2) })}
            className="size-8 rounded-lg border border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 flex items-center justify-center"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="range"
            min={12}
            max={120}
            value={config.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="flex-1 accent-[hsl(84,76%,55%)]"
          />
          <button
            type="button"
            onClick={() => update({ fontSize: Math.min(120, config.fontSize + 2) })}
            className="size-8 rounded-lg border border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 flex items-center justify-center"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Text Align */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50">Alinhamento</label>
        <div className="flex gap-1">
          {(
            [
              { value: "left", icon: AlignLeft },
              { value: "center", icon: AlignCenter },
              { value: "right", icon: AlignRight },
            ] as const
          ).map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ textAlign: value })}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 flex items-center justify-center transition-colors border",
                config.textAlign === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Position Grid 3x3 */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50">Posição</label>
        <div className="grid grid-cols-3 gap-1 w-fit">
          {POSITIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ position: value })}
              className={cn(
                "size-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors border",
                config.position === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Cor do texto</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.textColor}
              onChange={(e) => update({ textColor: e.target.value })}
              className="size-8 rounded border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={config.textColor}
              onChange={(e) => update({ textColor: e.target.value })}
              className="flex-1 rounded-lg !border-white/10 !bg-white/[0.02] !text-white px-2 py-1.5 text-xs font-mono outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50">Fundo do texto</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.backgroundColor || "#000000"}
              onChange={(e) =>
                update({ backgroundColor: e.target.value, backgroundOpacity: config.backgroundOpacity ?? 0.5 })
              }
              className="size-8 rounded border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={(config.backgroundOpacity ?? 0) * 100}
              onChange={(e) => update({ backgroundOpacity: Number(e.target.value) / 100 })}
              className="flex-1 accent-[hsl(84,76%,55%)]"
              title={`Opacidade: ${Math.round((config.backgroundOpacity ?? 0) * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Text Transform */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50">Transform</label>
        <div className="flex gap-1">
          {(
            [
              { value: "none", label: "Aa" },
              { value: "uppercase", label: "AA" },
              { value: "lowercase", label: "aa" },
              { value: "capitalize", label: "Aa." },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ textTransform: value })}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors border",
                config.textTransform === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium text-white/50">
          <input
            type="checkbox"
            checked={config.shadow ?? false}
            onChange={(e) => update({ shadow: e.target.checked })}
            className="accent-[hsl(84,76%,55%)]"
          />
          Sombra
        </label>
      </div>
    </div>
  );
}

/**
 * Live preview of text overlay positioned in a container.
 */
function TextPreview({ config }: { config: TextOverlayConfig }) {
  if (!config.content.trim()) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/20">
          <Type className="size-5" />
          <span className="text-sm">Preview do texto</span>
        </div>
      </div>
    );
  }

  const pad = `${TEXT_SAFE_ZONE_PERCENT}%`;

  // Map position to CSS flex positioning
  const positionStyles: Record<TextPosition, React.CSSProperties> = {
    "top-left": { top: pad, left: pad },
    "top-center": { top: pad, left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: pad, right: pad },
    "center-left": { top: "50%", left: pad, transform: "translateY(-50%)" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "center-right": { top: "50%", right: pad, transform: "translateY(-50%)" },
    "bottom-left": { bottom: pad, left: pad },
    "bottom-center": { bottom: pad, left: "50%", transform: "translateX(-50%)" },
    "bottom-right": { bottom: pad, right: pad },
  };

  const appliedText = config.textTransform
    ? applyTransform(config.content, config.textTransform)
    : config.content;

  return (
    <div
      className="absolute whitespace-pre-wrap break-words"
      style={{
        ...positionStyles[config.position],
        maxWidth: `${config.maxWidth ?? 90}%`,
        fontFamily: config.fontFamily,
        fontSize: `${Math.max(8, config.fontSize * 0.35)}px`, // Scaled for preview
        fontWeight: config.fontWeight === "black" ? 900 : config.fontWeight,
        color: config.textColor,
        textAlign: config.textAlign,
        lineHeight: config.lineHeight ?? 1.3,
        letterSpacing: config.letterSpacing ? `${config.letterSpacing}px` : undefined,
        textShadow: config.shadow
          ? `${config.shadowConfig?.offsetX ?? 2}px ${config.shadowConfig?.offsetY ?? 2}px ${config.shadowConfig?.blur ?? 4}px ${config.shadowConfig?.color ?? "rgba(0,0,0,0.8)"}`
          : undefined,
        backgroundColor: config.backgroundColor && config.backgroundOpacity
          ? hexToRgba(config.backgroundColor, config.backgroundOpacity)
          : undefined,
        padding: config.backgroundColor && config.backgroundOpacity
          ? "4px 8px"
          : undefined,
        borderRadius: config.backgroundColor && config.backgroundOpacity
          ? "4px"
          : undefined,
      }}
    >
      {appliedText}
    </div>
  );
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
