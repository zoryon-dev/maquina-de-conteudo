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
  Layers,
  SplitSquareHorizontal,
  ImageIcon,
  Newspaper,
  Megaphone,
  LucideIcon,
} from "lucide-react";
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import type { FigmaTemplate, TemplateMotor } from "@/lib/studio-templates/types";
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
  // Image templates
  "IMAGE_OVERLAY": Layers,
  "IMAGE_SPLIT": SplitSquareHorizontal,
  "IMAGE_MINIMAL": ImageIcon,
  // BrandsDecoded v4
  "BD_CAPA": Newspaper,
  "BD_DARK": Moon,
  "BD_LIGHT": Sun,
  "BD_CTA": Megaphone,
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
  // Image templates
  "IMAGE_OVERLAY": { bg: "#1a1a2e", accent: "#ffffff" },
  "IMAGE_SPLIT": { bg: "#f5f5f5", accent: "#1a1a2e" },
  "IMAGE_MINIMAL": { bg: "#2a2a3e", accent: "#e0e0e0" },
  // BrandsDecoded v4
  "BD_CAPA": { bg: "#0F0D0C", accent: "#C8321E" },
  "BD_DARK": { bg: "#0F0D0C", accent: "#C8321E" },
  "BD_LIGHT": { bg: "#F5F2EF", accent: "#C8321E" },
  "BD_CTA": { bg: "#8B2412", accent: "#ffffff" },
};

type CategoryKey = "figma" | "generic" | "image" | "brandsdecoded";

interface TemplateCategory {
  label: string;
  description: string;
  templates: FigmaTemplate[];
  /**
   * Se definido, esta categoria só aparece quando motorFilter casa.
   * Categorias sem motor (Com Perfil/Genéricos/Com Imagem) sempre aparecem.
   */
  motor?: TemplateMotor;
}

// Categorias de templates
const TEMPLATE_CATEGORIES: Record<CategoryKey, TemplateCategory> = {
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
  image: {
    label: "Com Imagem",
    description: "Templates com imagem de fundo",
    templates: ["IMAGE_OVERLAY", "IMAGE_SPLIT", "IMAGE_MINIMAL"] as FigmaTemplate[],
  },
  brandsdecoded: {
    label: "BrandsDecoded",
    description: "Alternado dark/light, tom editorial",
    templates: ["BD_CAPA", "BD_DARK", "BD_LIGHT", "BD_CTA"] as FigmaTemplate[],
    motor: "brandsdecoded_v4",
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
        className="w-full aspect-[3/4] rounded-md mb-2 flex items-center justify-center overflow-hidden"
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

interface TemplateGalleryProps {
  /**
   * Filtra categorias compatíveis com o motor.
   * - Categoria com `motor` igual ao filtro: incluída
   * - Categoria sem `motor` (genéricas): sempre incluída
   * - Categoria com motor diferente: oculta
   * Se omitido, mostra todas.
   */
  motorFilter?: TemplateMotor;
}

export function TemplateGallery({ motorFilter }: TemplateGalleryProps = {}) {
  const activeSlide = useActiveSlide();
  const setSlideTemplate = useStudioStore((state) => state.setSlideTemplate);

  const visibleCategoryKeys = (
    Object.entries(TEMPLATE_CATEGORIES) as [CategoryKey, TemplateCategory][]
  )
    .filter(([, cat]) => !motorFilter || !cat.motor || cat.motor === motorFilter)
    .map(([key]) => key);

  // Default: BD se filtro=BD, senão figma
  const defaultCategory: CategoryKey =
    motorFilter === "brandsdecoded_v4" ? "brandsdecoded" : "figma";
  const initialCategory: CategoryKey = visibleCategoryKeys.includes(defaultCategory)
    ? defaultCategory
    : (visibleCategoryKeys[0] ?? "figma");

  const [activeCategory, setActiveCategory] = useState<CategoryKey>(initialCategory);

  if (!activeSlide) return null;

  const handleTemplateSelect = (template: FigmaTemplate) => {
    setSlideTemplate(activeSlide.id, template);
  };

  // Se motorFilter mudar e tornar categoria invisível, fallback para primeira visível
  const safeCategory: CategoryKey = visibleCategoryKeys.includes(activeCategory)
    ? activeCategory
    : (visibleCategoryKeys[0] ?? "figma");
  const currentCategory = TEMPLATE_CATEGORIES[safeCategory];

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        {visibleCategoryKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors",
              safeCategory === key
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            )}
          >
            {TEMPLATE_CATEGORIES[key].label}
          </button>
        ))}
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
