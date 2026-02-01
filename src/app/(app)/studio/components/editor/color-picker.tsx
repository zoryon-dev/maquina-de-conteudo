/**
 * Color Picker Component
 *
 * Seletor de cores para o slide:
 * - Cor de fundo
 * - Cor do texto
 * - Cor primária (destaque/swipe)
 * - Opção de aplicar a todos os slides
 */

"use client";

import { useState } from "react";
import { Paintbrush, Copy } from "lucide-react";
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
}

function ColorInput({ label, value, onChange, presets }: ColorInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-white/70">{label}</Label>
      <div className="flex gap-2">
        {/* Color Preview + Picker */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div
            className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>

        {/* Hex Input */}
        <Input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="flex-1 bg-white/5 border-white/10 text-white font-mono text-sm"
          maxLength={7}
        />
      </div>

      {/* Presets */}
      {presets && presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`w-6 h-6 rounded border transition-all ${
                value.toUpperCase() === preset.toUpperCase()
                  ? "border-white/60 ring-2 ring-primary/50"
                  : "border-white/10 hover:border-white/30"
              }`}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Paleta de cores pré-definidas
const BACKGROUND_PRESETS = [
  "#FFFFFF",
  "#F5F5F5",
  "#0A0A0F",
  "#1A1A2E",
  "#0F172A",
  "#1E293B",
];

const TEXT_PRESETS = [
  "#000000",
  "#1A1A1A",
  "#FFFFFF",
  "#F5F5F5",
  "#374151",
  "#6B7280",
];

const PRIMARY_PRESETS = [
  "#FFD700",
  "#A3E635",
  "#2DD4BF",
  "#8B7CF7",
  "#F97316",
  "#EF4444",
];

export function ColorPicker() {
  const activeSlide = useActiveSlide();
  const updateSlideStyle = useStudioStore((state) => state.updateSlideStyle);
  const applyStyleToAllSlides = useStudioStore(
    (state) => state.applyStyleToAllSlides
  );
  const slides = useStudioStore((state) => state.slides);

  const [applyToAll, setApplyToAll] = useState(false);

  if (!activeSlide) return null;

  const handleColorChange = (
    field: "backgroundColor" | "textColor" | "primaryColor",
    value: string
  ) => {
    if (applyToAll) {
      applyStyleToAllSlides({ [field]: value });
    } else {
      updateSlideStyle(activeSlide.id, { [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Apply to All Toggle */}
      {slides.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-white/50" />
            <span className="text-sm text-white/70">
              Aplicar a todos os slides
            </span>
          </div>
          <Switch
            checked={applyToAll}
            onCheckedChange={setApplyToAll}
          />
        </div>
      )}

      {/* Background Color */}
      <ColorInput
        label="Cor de Fundo"
        value={activeSlide.style.backgroundColor}
        onChange={(value) => handleColorChange("backgroundColor", value)}
        presets={BACKGROUND_PRESETS}
      />

      {/* Text Color */}
      <ColorInput
        label="Cor do Texto"
        value={activeSlide.style.textColor}
        onChange={(value) => handleColorChange("textColor", value)}
        presets={TEXT_PRESETS}
      />

      {/* Primary Color */}
      <ColorInput
        label="Cor de Destaque (Swipe)"
        value={activeSlide.style.primaryColor}
        onChange={(value) => handleColorChange("primaryColor", value)}
        presets={PRIMARY_PRESETS}
      />

      {/* Swipe Indicator Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-white/70">
          Mostrar "Arraste pro lado"
        </Label>
        <Switch
          checked={activeSlide.style.showSwipeIndicator}
          onCheckedChange={(checked) =>
            updateSlideStyle(activeSlide.id, { showSwipeIndicator: checked })
          }
        />
      </div>

      {/* Quick Theme */}
      <div className="pt-4 border-t border-white/10">
        <Label className="text-sm text-white/70 mb-3 block">Temas Rápidos</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const style = {
                backgroundColor: "#FFFFFF",
                textColor: "#000000",
                primaryColor: "#FFD700",
              };
              applyToAll
                ? applyStyleToAllSlides(style)
                : updateSlideStyle(activeSlide.id, style);
            }}
            className="justify-start gap-2 bg-white text-black border-white/20 hover:bg-white/90"
          >
            <Paintbrush className="w-3 h-3" />
            Claro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const style = {
                backgroundColor: "#0A0A0F",
                textColor: "#FFFFFF",
                primaryColor: "#A3E635",
              };
              applyToAll
                ? applyStyleToAllSlides(style)
                : updateSlideStyle(activeSlide.id, style);
            }}
            className="justify-start gap-2 bg-[#0A0A0F] text-white border-white/20 hover:bg-[#1a1a2e]"
          >
            <Paintbrush className="w-3 h-3" />
            Escuro
          </Button>
        </div>
      </div>
    </div>
  );
}
