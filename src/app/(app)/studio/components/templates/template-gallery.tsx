/**
 * Template Gallery Component
 *
 * Galeria de templates disponíveis para seleção.
 * Permite trocar o template do slide ativo.
 *
 * Templates organizados em 2 categorias:
 * - Figma: Com perfil/avatar (01_CAPA, 201, 202, 203)
 * - Generic: Headline/descrição (DARK_MODE, WHITE_MODE, TWITTER, SUPER_HEADLINE)
 */

"use client";

import { useState } from "react";
import {
  Check,
  Layout,
  LayoutTemplate,
  Columns,
  ArrowRight,
  Moon,
  Sun,
  Twitter,
  Type,
  LucideIcon,
} from "lucide-react";
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import type { FigmaTemplate } from "@/lib/studio-templates/types";
import { TEMPLATE_METADATA } from "@/lib/studio-templates/types";
import { cn } from "@/lib/utils";

// Ícones para cada template
const TEMPLATE_ICONS: Record<FigmaTemplate, LucideIcon> = {
  // Figma templates
  "01_CAPA": LayoutTemplate,
  "201": Columns,
  "202": Layout,
  "203": ArrowRight,
  // Generic templates
  "DARK_MODE": Moon,
  "WHITE_MODE": Sun,
  "TWITTER": Twitter,
  "SUPER_HEADLINE": Type,
};

// Cores de preview para cada template
const TEMPLATE_PREVIEW_COLORS: Record<
  FigmaTemplate,
  { bg: string; accent: string }
> = {
  // Figma templates
  "01_CAPA": { bg: "#1a1a2e", accent: "#FFD700" },
  "201": { bg: "#ffffff", accent: "#000000" },
  "202": { bg: "#ffffff", accent: "#000000" },
  "203": { bg: "#ffffff", accent: "#FFD700" },
  // Generic templates
  "DARK_MODE": { bg: "#0f0f0f", accent: "#2dd4bf" },
  "WHITE_MODE": { bg: "#fafafa", accent: "#f97316" },
  "TWITTER": { bg: "#ffffff", accent: "#1d9bf0" },
  "SUPER_HEADLINE": { bg: "#ffffff", accent: "#a3e635" },
};

// Categorias de templates
const TEMPLATE_CATEGORIES = {
  figma: {
    label: "Com Perfil",
    description: "Templates com avatar e handle",
    templates: ["01_CAPA", "201", "202", "203"] as FigmaTemplate[],
  },
  generic: {
    label: "Genéricos",
    description: "Templates headline/descrição",
    templates: ["DARK_MODE", "WHITE_MODE", "TWITTER", "SUPER_HEADLINE"] as FigmaTemplate[],
  },
};

interface TemplateCardProps {
  template: FigmaTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  const meta = TEMPLATE_METADATA[template];
  const Icon = TEMPLATE_ICONS[template];
  const colors = TEMPLATE_PREVIEW_COLORS[template];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-2.5 rounded-lg border transition-all text-left",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      )}
    >
      {/* Template Preview */}
      <div
        className="w-full aspect-[4/5] rounded-md mb-2 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: colors.bg }}
      >
        <Icon
          className="w-7 h-7"
          style={{ color: colors.accent }}
        />
      </div>

      {/* Template Info */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white truncate">
            {meta.label}
          </span>
          {isSelected && (
            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">
          {meta.description}
        </p>
      </div>

      {/* Recommended Badge */}
      {meta.recommendedUse === "cover" && (
        <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400">
          Capa
        </div>
      )}
    </button>
  );
}

export function TemplateGallery() {
  const activeSlide = useActiveSlide();
  const setSlideTemplate = useStudioStore((state) => state.setSlideTemplate);
  const [activeCategory, setActiveCategory] = useState<"figma" | "generic">("figma");

  if (!activeSlide) return null;

  const handleTemplateSelect = (template: FigmaTemplate) => {
    setSlideTemplate(activeSlide.id, template);
  };

  const currentCategory = TEMPLATE_CATEGORIES[activeCategory];

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        <button
          onClick={() => setActiveCategory("figma")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors",
            activeCategory === "figma"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/70"
          )}
        >
          Com Perfil
        </button>
        <button
          onClick={() => setActiveCategory("generic")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors",
            activeCategory === "generic"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/70"
          )}
        >
          Genéricos
        </button>
      </div>

      <p className="text-[10px] text-white/40">
        {currentCategory.description}
      </p>

      {/* Template Grid */}
      <div className="grid grid-cols-2 gap-2">
        {currentCategory.templates.map((template) => (
          <TemplateCard
            key={template}
            template={template}
            isSelected={activeSlide.template === template}
            onClick={() => handleTemplateSelect(template)}
          />
        ))}
      </div>

      {/* Template Info */}
      <div className="p-2.5 bg-white/5 rounded-lg">
        <p className="text-[10px] text-white/50">
          <strong className="text-white/70">Dica:</strong> Templates "Com Perfil" exibem
          seu avatar e @handle. Templates "Genéricos" focam no conteúdo.
        </p>
      </div>
    </div>
  );
}
