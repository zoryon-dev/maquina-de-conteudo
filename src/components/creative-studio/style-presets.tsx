"use client";

import { cn } from "@/lib/utils";
import {
  STYLE_PRESETS,
  getPresetsByCategory,
} from "@/lib/creative-studio/presets";
import { Check } from "lucide-react";

interface StylePresetsProps {
  selectedPreset: string | null;
  onSelect: (presetId: string | null) => void;
}

export function StylePresets({ selectedPreset, onSelect }: StylePresetsProps) {
  const tribalPresets = getPresetsByCategory("tribal");
  const genericPresets = getPresetsByCategory("generic");

  const handleClick = (id: string) => {
    // Toggle: click same preset deselects
    onSelect(selectedPreset === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Tribal Section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Ângulos Tribais
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tribalPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              id={preset.id}
              name={preset.name}
              gradient={preset.previewGradient}
              isSelected={selectedPreset === preset.id}
              onClick={() => handleClick(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* Generic Section */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Estilos
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {genericPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              id={preset.id}
              name={preset.name}
              gradient={preset.previewGradient}
              isSelected={selectedPreset === preset.id}
              onClick={() => handleClick(preset.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  id,
  name,
  gradient,
  isSelected,
  onClick,
}: {
  id: string;
  name: string;
  gradient: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all",
        "border",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      )}
    >
      {/* Gradient preview */}
      <div
        className={cn(
          "w-16 h-16 rounded-lg transition-all",
          isSelected && "ring-2 ring-primary/40"
        )}
        style={{ background: gradient }}
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-2.5 text-black" />
        </div>
      )}

      <span
        className={cn(
          "text-[10px] font-medium",
          isSelected ? "text-primary" : "text-white/60"
        )}
      >
        {name}
      </span>
    </button>
  );
}
