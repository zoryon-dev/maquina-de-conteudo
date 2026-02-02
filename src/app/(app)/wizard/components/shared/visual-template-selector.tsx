/**
 * Visual Template Selector
 *
 * Componente para seleção de templates visuais do Studio no Wizard.
 * Permite ao usuário escolher um template HTML para aplicar ao conteúdo gerado.
 *
 * Fase 1: Seleção apenas (sem preview em tempo real)
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
  Palette,
  Image as ImageIcon,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type FigmaTemplate,
  TEMPLATE_METADATA,
} from "@/lib/studio-templates/types";

// Ícones para cada template
const TEMPLATE_ICONS: Record<FigmaTemplate, LucideIcon> = {
  "01_CAPA": LayoutTemplate,
  "201": Columns,
  "202": Layout,
  "203": ArrowRight,
  "DARK_MODE": Moon,
  "WHITE_MODE": Sun,
  "TWITTER": Twitter,
  "SUPER_HEADLINE": Type,
};

// Cores de preview para cada template
const TEMPLATE_PREVIEW_COLORS: Record<
  FigmaTemplate,
  { bg: string; accent: string; textPreview: string }
> = {
  "01_CAPA": { bg: "#1a1a2e", accent: "#FFD700", textPreview: "Capa impactante" },
  "201": { bg: "#ffffff", accent: "#000000", textPreview: "Bold no início" },
  "202": { bg: "#ffffff", accent: "#000000", textPreview: "Layout padrão" },
  "203": { bg: "#ffffff", accent: "#FFD700", textPreview: "Com swipe" },
  "DARK_MODE": { bg: "#0f0f0f", accent: "#2dd4bf", textPreview: "Tema escuro" },
  "WHITE_MODE": { bg: "#fafafa", accent: "#f97316", textPreview: "Tema claro" },
  "TWITTER": { bg: "#ffffff", accent: "#1d9bf0", textPreview: "Estilo tweet" },
  "SUPER_HEADLINE": { bg: "#ffffff", accent: "#a3e635", textPreview: "Headline grande" },
};

// Categorias de templates
const TEMPLATE_CATEGORIES = {
  figma: {
    label: "Com Perfil",
    description: "Templates com avatar e @handle visíveis",
    templates: ["01_CAPA", "201", "202", "203"] as FigmaTemplate[],
  },
  generic: {
    label: "Genéricos",
    description: "Foco no conteúdo, sem perfil",
    templates: ["DARK_MODE", "WHITE_MODE", "TWITTER", "SUPER_HEADLINE"] as FigmaTemplate[],
  },
};

// Templates recomendados para carrossel
const CAROUSEL_RECOMMENDED = ["202", "201", "203"] as FigmaTemplate[];

export interface VisualTemplateConfig {
  applyToAllSlides?: boolean;
  autoGenerateImages?: boolean;
  useBrandColors?: boolean;
}

interface VisualTemplateSelectorProps {
  selectedTemplate?: string;
  config?: VisualTemplateConfig;
  onTemplateChange: (template: string | undefined) => void;
  onConfigChange: (config: VisualTemplateConfig) => void;
  contentType: "carousel" | "image" | "text";
  className?: string;
}

interface TemplateCardProps {
  template: FigmaTemplate;
  isSelected: boolean;
  isRecommended: boolean;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, isRecommended, onClick }: TemplateCardProps) {
  const meta = TEMPLATE_METADATA[template];
  const Icon = TEMPLATE_ICONS[template];
  const colors = TEMPLATE_PREVIEW_COLORS[template];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl border-2 transition-all text-left group",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
      )}
    >
      {/* Template Preview */}
      <div
        className="w-full aspect-[4/5] rounded-lg mb-2.5 flex flex-col items-center justify-center overflow-hidden relative"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Mini layout preview */}
        <div className="absolute inset-2 flex flex-col gap-1 opacity-30">
          <div
            className="h-1 w-1/2 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
          <div
            className="h-0.5 w-3/4 rounded-full opacity-50"
            style={{ backgroundColor: colors.accent }}
          />
          <div className="flex-1" />
          <div
            className="h-0.5 w-1/3 rounded-full opacity-30"
            style={{ backgroundColor: colors.accent }}
          />
        </div>

        <Icon
          className="w-8 h-8 z-10"
          style={{ color: colors.accent }}
        />
        <span
          className="text-[9px] mt-1 font-medium z-10"
          style={{ color: colors.accent }}
        >
          {colors.textPreview}
        </span>
      </div>

      {/* Template Info */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-white truncate">
            {meta.label}
          </span>
          {isSelected && (
            <Check className="w-4 h-4 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-white/50 line-clamp-2 leading-tight">
          {meta.description}
        </p>
      </div>

      {/* Badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {isRecommended && (
          <div className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-primary/20 text-primary">
            Recomendado
          </div>
        )}
        {meta.recommendedUse === "cover" && (
          <div className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-amber-500/20 text-amber-400">
            Capa
          </div>
        )}
        {meta.supportsImage && (
          <div className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-blue-500/20 text-blue-400">
            Imagem
          </div>
        )}
      </div>
    </button>
  );
}

export function VisualTemplateSelector({
  selectedTemplate,
  config = {},
  onTemplateChange,
  onConfigChange,
  contentType,
  className,
}: VisualTemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<"figma" | "generic">("figma");
  const [isExpanded, setIsExpanded] = useState(!!selectedTemplate);

  const currentCategory = TEMPLATE_CATEGORIES[activeCategory];

  const handleTemplateSelect = (template: FigmaTemplate) => {
    if (selectedTemplate === template) {
      // Deselect if clicking same template
      onTemplateChange(undefined);
    } else {
      onTemplateChange(template);
      // Auto-expand options when selecting
      if (!isExpanded) setIsExpanded(true);
    }
  };

  const handleConfigChange = (key: keyof VisualTemplateConfig, value: boolean) => {
    onConfigChange({ ...config, [key]: value });
  };

  // Show only if carousel or image
  if (contentType === "text") {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Palette className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Estilo Visual
              <span className="ml-2 text-[10px] font-normal text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                Opcional
              </span>
            </h3>
            <p className="text-xs text-white/50">
              Template HTML para renderizar o conteúdo
            </p>
          </div>
        </div>

        {selectedTemplate && (
          <button
            type="button"
            onClick={() => onTemplateChange(undefined)}
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveCategory("figma")}
          className={cn(
            "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all",
            activeCategory === "figma"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/50 hover:text-white/70"
          )}
        >
          {TEMPLATE_CATEGORIES.figma.label}
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory("generic")}
          className={cn(
            "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all",
            activeCategory === "generic"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/50 hover:text-white/70"
          )}
        >
          {TEMPLATE_CATEGORIES.generic.label}
        </button>
      </div>

      {/* Category Description */}
      <p className="text-[10px] text-white/40 -mt-2">
        {currentCategory.description}
      </p>

      {/* Template Grid */}
      <div className="grid grid-cols-4 gap-2">
        {currentCategory.templates.map((template) => (
          <TemplateCard
            key={template}
            template={template}
            isSelected={selectedTemplate === template}
            isRecommended={
              contentType === "carousel" && CAROUSEL_RECOMMENDED.includes(template)
            }
            onClick={() => handleTemplateSelect(template)}
          />
        ))}
      </div>

      {/* Options (when template selected) */}
      {selectedTemplate && (
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-4">
          <p className="text-xs font-medium text-white/70 flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            Opções do Template
          </p>

          <div className="space-y-3">
            {/* Apply to All Slides */}
            {contentType === "carousel" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-white/50" />
                  <Label className="text-xs text-white/70">
                    Aplicar a todos os slides
                  </Label>
                </div>
                <Switch
                  checked={config.applyToAllSlides ?? true}
                  onCheckedChange={(checked) =>
                    handleConfigChange("applyToAllSlides", checked)
                  }
                  className="data-[state=checked]:bg-primary/50"
                />
              </div>
            )}

            {/* Auto Generate Images */}
            {TEMPLATE_METADATA[selectedTemplate as FigmaTemplate]?.supportsImage && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white/50" />
                  <Label className="text-xs text-white/70">
                    Gerar imagens automaticamente
                  </Label>
                </div>
                <Switch
                  checked={config.autoGenerateImages ?? false}
                  onCheckedChange={(checked) =>
                    handleConfigChange("autoGenerateImages", checked)
                  }
                  className="data-[state=checked]:bg-primary/50"
                />
              </div>
            )}

            {/* Use Brand Colors */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-white/50" />
                <Label className="text-xs text-white/70">
                  Usar cores da marca
                </Label>
              </div>
              <Switch
                checked={config.useBrandColors ?? false}
                onCheckedChange={(checked) =>
                  handleConfigChange("useBrandColors", checked)
                }
                className="data-[state=checked]:bg-primary/50"
              />
            </div>
          </div>

          {/* Info */}
          <p className="text-[10px] text-white/40 leading-relaxed">
            O template será aplicado após a geração do conteúdo. Você poderá
            ajustar cores, imagens e textos no editor visual.
          </p>
        </div>
      )}

      {/* Help Text (when no template selected) */}
      {!selectedTemplate && (
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg">
          <p className="text-[10px] text-white/50 leading-relaxed">
            <strong className="text-white/70">Dica:</strong> Selecionar um template
            permite visualizar seu conteúdo em um design profissional após a geração.
            Se não selecionar, o conteúdo será salvo apenas como texto estruturado.
          </p>
        </div>
      )}
    </div>
  );
}
