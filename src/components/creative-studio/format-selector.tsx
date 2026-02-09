"use client";

import { cn } from "@/lib/utils";
import { FORMAT_DIMENSIONS } from "@/lib/creative-studio/constants";
import { Check } from "lucide-react";

interface FormatSelectorProps {
  selectedFormats: string[];
  onChange: (formats: string[]) => void;
  disabled?: boolean;
  max?: number;
}

export function FormatSelector({
  selectedFormats,
  onChange,
  disabled,
  max,
}: FormatSelectorProps) {
  const toggleFormat = (format: string) => {
    if (disabled) return;

    if (selectedFormats.includes(format)) {
      // Don't allow deselecting the last one
      if (selectedFormats.length > 1) {
        onChange(selectedFormats.filter((f) => f !== format));
      }
    } else {
      if (max && selectedFormats.length >= max) return;
      onChange([...selectedFormats, format]);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(FORMAT_DIMENSIONS).map(([key, dim]) => {
        const isSelected = selectedFormats.includes(key);
        // Scale proportionally for preview (max height 64px)
        const maxPreviewH = 56;
        const ratio = dim.width / dim.height;
        const previewH = maxPreviewH;
        const previewW = Math.round(previewH * ratio);
        const clampedW = Math.min(previewW, 80);
        const clampedH = Math.round(clampedW / ratio);

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => toggleFormat(key)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all",
              "border backdrop-blur-sm",
              isSelected
                ? "border-primary/50 bg-primary/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="size-3 text-black" />
              </div>
            )}

            {/* Proportional preview */}
            <div
              className={cn(
                "rounded border transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/5"
                  : "border-white/10 bg-white/5"
              )}
              style={{
                width: `${clampedW}px`,
                height: `${clampedH}px`,
              }}
            />

            {/* Labels */}
            <div className="text-center">
              <p
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-white/70"
                )}
              >
                {key}
              </p>
              <p className="text-[10px] text-white/40">{dim.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
