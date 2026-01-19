/**
 * Image Generation Options Component
 *
 * NEW FLOW: Two-step selection for Cover and Posts
 * - CAPA (Cover): First image - user chooses AI or one of 4 HTML templates
 * - POSTS COMUNS (Common Posts): Remaining images - user chooses AI or one of 4 HTML templates
 * - These can be DIFFERENT methods/templates for cover vs posts
 *
 * Templates simplified to 4 options:
 * - dark-mode: Dark background with green/teal accents
 * - white-mode: Light background with orange accents
 * - twitter: Twitter-style post with avatar and verified badge
 * - super-headline: Giant headline with grid background
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Palette, Layout, Sparkles, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ImageGenerationConfig,
  AiImageOptions,
  HtmlTemplateOptions,
  CoverPostsConfig,
  AiImageModel,
  ColorOption,
  VisualStyle,
  CompositionOption,
  MoodOption,
  HtmlTemplate,
  ImageGenerationMethod,
} from "@/lib/wizard-services/client";

// ============================================================================
// CONSTANTS
// ============================================================================

// Default AI options for type safety
const DEFAULT_AI_OPTIONS: AiImageOptions = {
  model: "google/gemini-3-pro-image-preview",
  color: "vibrante",
  style: "moderno",
};

// Default HTML template colors
const DEFAULT_HTML_COLORS = {
  primaryColor: "#2dd4bf",  // Teal for dark-mode
  secondaryColor: "#f97316", // Orange
} as const;

const AI_IMAGE_MODELS: { value: AiImageModel; label: string }[] = [
  { value: "google/gemini-3-pro-image-preview", label: "Gemini 3 Pro" },
  { value: "openai/gpt-5-image", label: "GPT-5 Image" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream 4.5" },
  { value: "black-forest-labs/flux.2-max", label: "Flux 2.0 Max" },
];

const COLOR_OPTIONS: { value: ColorOption; label: string; color: string }[] = [
  { value: "vibrante", label: "Vibrante", color: "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" },
  { value: "pastel", label: "Pastel", color: "bg-gradient-to-r from-pink-200 to-purple-200" },
  { value: "escuro", label: "Escuro", color: "bg-gradient-to-r from-gray-800 to-black" },
  { value: "claro", label: "Claro", color: "bg-gradient-to-r from-gray-100 to-white" },
  { value: "neon", label: "Neon", color: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" },
  { value: "terroso", label: "Terroso", color: "bg-gradient-to-r from-amber-700 to-orange-900" },
  { value: "monocromático", label: "Monocromático", color: "bg-gradient-to-r from-gray-400 to-gray-600" },
  { value: "personalizado", label: "Personalizado", color: "bg-gradient-to-r from-primary to-primary/50" },
];

const VISUAL_STYLES: { value: VisualStyle; label: string; description: string }[] = [
  { value: "minimalista", label: "Minimalista", description: "Limpo e simples" },
  { value: "moderno", label: "Moderno", description: "Contemporâneo e atual" },
  { value: "vintage", label: "Vintage", description: "Estilo retrô" },
  { value: "abstrato", label: "Abstrato", description: "Formas e cores abstratas" },
  { value: "realista", label: "Realista", description: "Fotorealista" },
  { value: "cartoon", label: "Cartoon", description: "Estilo animação" },
  { value: "aquarela", label: "Aquarela", description: "Pintura em aquarela" },
  { value: "cyberpunk", label: "Cyberpunk", description: "Futurista e neon" },
  { value: "grunge", label: "Grunge", description: "Texturizado e brutal" },
  { value: "elegante", label: "Elegante", description: "Sofisticado e refinado" },
  { value: "lúdico", label: "Lúdico", description: "Divertido e colorido" },
  { value: "profissional", label: "Profissional", description: "Corporativo e sério" },
];

const COMPOSITION_OPTIONS: { value: CompositionOption; label: string }[] = [
  { value: "centralizado", label: "Centralizado" },
  { value: "terços", label: "Regra dos Terços" },
  { value: "simétrico", label: "Simétrico" },
  { value: "assimétrico", label: "Assimétrico" },
  { value: "dinâmico", label: "Dinâmico" },
  { value: "minimal", label: "Minimal" },
];

const MOOD_OPTIONS: { value: MoodOption; label: string }[] = [
  { value: "energético", label: "Energético" },
  { value: "calmo", label: "Calmo" },
  { value: "misterioso", label: "Misterioso" },
  { value: "alegre", label: "Alegre" },
  { value: "sério", label: "Sério" },
  { value: "dramático", label: "Dramático" },
  { value: "romântico", label: "Romântico" },
  { value: "lúdico", label: "Lúdico" },
  { value: "profissional", label: "Profissional" },
];

// Simplified to 4 templates only
const HTML_TEMPLATES: { value: HtmlTemplate; label: string; description: string; preview: string }[] = [
  {
    value: "dark-mode",
    label: "Dark Mode",
    description: "Fundo escuro com gradiente verde e tipografia elegante",
    preview: "bg-gradient-to-br from-gray-900 to-emerald-950"
  },
  {
    value: "white-mode",
    label: "White Mode",
    description: "Fundo claro com estilo minimalista e moderno",
    preview: "bg-gradient-to-br from-gray-50 to-gray-100"
  },
  {
    value: "twitter",
    label: "Twitter",
    description: "Estilo de post do Twitter com avatar e verificado",
    preview: "bg-gradient-to-br from-blue-50 to-blue-100"
  },
  {
    value: "super-headline",
    label: "Super Headline",
    description: "Headline gigante com grid de fundo e CTA",
    preview: "bg-gradient-to-br from-white to-gray-100"
  },
];

// ============================================================================
// TYPES
// ============================================================================

interface ImageGenerationOptionsProps {
  config: ImageGenerationConfig;
  onChange: (config: ImageGenerationConfig) => void;
  className?: string;
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon: Icon, children, defaultExpanded = true }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 p-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MethodSelectorProps {
  method: ImageGenerationMethod | undefined;
  onMethodChange: (method: ImageGenerationMethod) => void;
}

function MethodSelector({ method, onMethodChange }: MethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onMethodChange("ai")}
        className={cn(
          "p-4 rounded-lg border-2 transition-all text-left",
          method === "ai"
            ? "border-primary bg-primary/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className={cn(
            "w-4 h-4",
            method === "ai" ? "text-primary" : "text-white/40"
          )} />
          <span className="text-sm font-medium text-white">IA Generativa</span>
        </div>
        <p className="text-xs text-white/60">
          Gemini, GPT-5, Seedream, Flux
        </p>
      </button>

      <button
        type="button"
        onClick={() => onMethodChange("html-template")}
        className={cn(
          "p-4 rounded-lg border-2 transition-all text-left",
          method === "html-template"
            ? "border-primary bg-primary/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Layout className={cn(
            "w-4 h-4",
            method === "html-template" ? "text-primary" : "text-white/40"
          )} />
          <span className="text-sm font-medium text-white">Template HTML</span>
        </div>
        <p className="text-xs text-white/60">
          4 templates prontos (1080x1350px)
        </p>
      </button>
    </div>
  );
}

interface AiOptionsProps {
  options: AiImageOptions | undefined;
  onChange: (options: Partial<AiImageOptions>) => void;
}

function AiOptions({ options, onChange }: AiOptionsProps) {
  const [customColor, setCustomColor] = useState(options?.customColor || "#a3e635");

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div>
        <h4 className="text-xs font-medium text-white/60 mb-2">Modelo de IA</h4>
        <div className="grid grid-cols-2 gap-2">
          {AI_IMAGE_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => onChange({ model: model.value })}
              className={cn(
                "p-3 rounded-lg border text-sm transition-all",
                options?.model === model.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
              )}
            >
              {model.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div>
        <h4 className="text-xs font-medium text-white/60 mb-2">Cor Principal</h4>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange({ color: color.value })}
              className={cn(
                "relative h-12 rounded-lg overflow-hidden border-2 transition-all",
                options?.color === color.value
                  ? "border-white scale-105"
                  : "border-white/10 hover:border-white/30"
              )}
              title={color.label}
            >
              <div className={cn("absolute inset-0", color.color)} />
              <span className="relative z-10 text-xs font-medium text-white/90 mix-blend-difference">
                {color.label.slice(0, 3)}
              </span>
            </button>
          ))}
        </div>

        {options?.color === "personalizado" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <input
              type="color"
              value={options?.customColor || customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onChange({ customColor: e.target.value });
              }}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={options?.customColor || customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onChange({ customColor: e.target.value });
              }}
              placeholder="#RRGGBB"
              className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
              maxLength={7}
            />
          </div>
        )}
      </div>

      {/* Visual Style */}
      <Section title="Estilo Visual" icon={Palette} defaultExpanded={false}>
        <div className="grid grid-cols-3 gap-2">
          {VISUAL_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => onChange({ style: style.value })}
              className={cn(
                "p-3 rounded-lg border text-sm transition-all text-left",
                options?.style === style.value
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
              )}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-xs text-white/40">{style.description}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Composition */}
      <Section title="Composição" icon={Layout} defaultExpanded={false}>
        <div className="grid grid-cols-3 gap-2">
          {COMPOSITION_OPTIONS.map((comp) => (
            <button
              key={comp.value}
              type="button"
              onClick={() => onChange({ composition: comp.value })}
              className={cn(
                "p-2 rounded-lg border text-sm transition-all",
                options?.composition === comp.value
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
              )}
            >
              {comp.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Mood */}
      <Section title="Mood" icon={Sparkles} defaultExpanded={false}>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => onChange({ mood: mood.value })}
              className={cn(
                "p-2 rounded-lg border text-sm transition-all",
                options?.mood === mood.value
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
              )}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Additional Context */}
      <div>
        <label className="text-xs text-white/60 mb-2 block">Contexto Adicional (opcional)</label>
        <textarea
          value={options?.additionalContext || ""}
          onChange={(e) => onChange({ additionalContext: e.target.value })}
          placeholder="Descreva elementos específicos que deseja na imagem..."
          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}

interface HtmlOptionsProps {
  options: HtmlTemplateOptions | undefined;
  onChange: (options: Partial<HtmlTemplateOptions>) => void;
}

function HtmlOptions({ options, onChange }: HtmlOptionsProps) {
  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div>
        <h4 className="text-xs font-medium text-white/60 mb-2">Escolha o Template</h4>
        <div className="grid grid-cols-2 gap-3">
          {HTML_TEMPLATES.map((template) => (
            <button
              key={template.value}
              type="button"
              onClick={() => onChange({ template: template.value })}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all text-left overflow-hidden",
                options?.template === template.value
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              )}
            >
              <div className={cn(
                "absolute inset-0 opacity-20",
                template.preview
              )} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-white">{template.label}</span>
                </div>
                <p className="text-xs text-white/60">{template.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Template Colors */}
      <div>
        <h4 className="text-xs font-medium text-white/60 mb-2">Cores do Template</h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Cor Primária</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={options?.primaryColor || "#2dd4bf"}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={options?.primaryColor || "#2dd4bf"}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Cor Secundária (opcional)</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={options?.secondaryColor || "#f97316"}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={options?.secondaryColor || "#f97316"}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ImageGenerationOptions({
  config,
  onChange,
  className,
}: ImageGenerationOptionsProps) {
  // Get or initialize coverPosts config
  const coverPosts = config.coverPosts || {
    coverMethod: "html-template",
    coverTemplate: "dark-mode",
    postsMethod: "html-template",
    postsTemplate: "dark-mode",
  } as CoverPostsConfig;

  // Update config helper
  const updateConfig = (updates: Partial<ImageGenerationConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Update coverPosts config
  const updateCoverPosts = (updates: Partial<CoverPostsConfig>) => {
    const newCoverPosts = { ...coverPosts, ...updates } as CoverPostsConfig;
    updateConfig({ coverPosts: newCoverPosts });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* COVER SECTION */}
      <div className="border border-primary/30 rounded-lg overflow-hidden bg-primary/[0.02]">
        <div className="bg-primary/20 px-4 py-2 border-b border-primary/20">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            CAPA (Primeira Imagem)
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Cover Method Selection */}
          <MethodSelector
            method={coverPosts.coverMethod}
            onMethodChange={(method) => updateCoverPosts({ coverMethod: method })}
          />

          {/* Cover AI Options */}
          {coverPosts.coverMethod === "ai" && (
            <AiOptions
              options={coverPosts.coverAiOptions ?? DEFAULT_AI_OPTIONS}
              onChange={(updates) => updateCoverPosts({
                coverAiOptions: { ...DEFAULT_AI_OPTIONS, ...coverPosts.coverAiOptions, ...updates }
              })}
            />
          )}

          {/* Cover HTML Options */}
          {coverPosts.coverMethod === "html-template" && (
            <HtmlOptions
              options={coverPosts.coverHtmlOptions ?? { template: coverPosts.coverTemplate || "dark-mode", ...DEFAULT_HTML_COLORS }}
              onChange={(updates) => {
                const currentTemplate = coverPosts.coverHtmlOptions?.template || coverPosts.coverTemplate || "dark-mode";
                const newTemplate = updates.template ?? currentTemplate;
                const newHtmlOptions: HtmlTemplateOptions = {
                  template: newTemplate,
                  primaryColor: updates.primaryColor ?? coverPosts.coverHtmlOptions?.primaryColor ?? DEFAULT_HTML_COLORS.primaryColor,
                  secondaryColor: updates.secondaryColor ?? coverPosts.coverHtmlOptions?.secondaryColor,
                  backgroundColor: updates.backgroundColor ?? coverPosts.coverHtmlOptions?.backgroundColor,
                  textColor: updates.textColor ?? coverPosts.coverHtmlOptions?.textColor,
                  overlay: updates.overlay ?? coverPosts.coverHtmlOptions?.overlay,
                  opacity: updates.opacity ?? coverPosts.coverHtmlOptions?.opacity,
                };
                updateCoverPosts({
                  coverTemplate: newTemplate,
                  coverHtmlOptions: newHtmlOptions,
                });
              }}
            />
          )}
        </div>
      </div>

      {/* POSTS SECTION */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
        <div className="bg-white/5 px-4 py-2 border-b border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layout className="w-4 h-4 text-white/60" />
            POSTS COMUNS (Demais Imagens)
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Posts Method Selection */}
          <MethodSelector
            method={coverPosts.postsMethod}
            onMethodChange={(method) => updateCoverPosts({ postsMethod: method })}
          />

          {/* Posts AI Options */}
          {coverPosts.postsMethod === "ai" && (
            <AiOptions
              options={coverPosts.postsAiOptions ?? DEFAULT_AI_OPTIONS}
              onChange={(updates) => updateCoverPosts({
                postsAiOptions: { ...DEFAULT_AI_OPTIONS, ...coverPosts.postsAiOptions, ...updates }
              })}
            />
          )}

          {/* Posts HTML Options */}
          {coverPosts.postsMethod === "html-template" && (
            <HtmlOptions
              options={coverPosts.postsHtmlOptions ?? { template: coverPosts.postsTemplate || "dark-mode", ...DEFAULT_HTML_COLORS }}
              onChange={(updates) => {
                const currentTemplate = coverPosts.postsHtmlOptions?.template || coverPosts.postsTemplate || "dark-mode";
                const newTemplate = updates.template ?? currentTemplate;
                const newHtmlOptions: HtmlTemplateOptions = {
                  template: newTemplate,
                  primaryColor: updates.primaryColor ?? coverPosts.postsHtmlOptions?.primaryColor ?? DEFAULT_HTML_COLORS.primaryColor,
                  secondaryColor: updates.secondaryColor ?? coverPosts.postsHtmlOptions?.secondaryColor,
                  backgroundColor: updates.backgroundColor ?? coverPosts.postsHtmlOptions?.backgroundColor,
                  textColor: updates.textColor ?? coverPosts.postsHtmlOptions?.textColor,
                  overlay: updates.overlay ?? coverPosts.postsHtmlOptions?.overlay,
                  opacity: updates.opacity ?? coverPosts.postsHtmlOptions?.opacity,
                };
                updateCoverPosts({
                  postsTemplate: newTemplate,
                  postsHtmlOptions: newHtmlOptions,
                });
              }}
            />
          )}
        </div>
      </div>

      {/* QUICK COPY - Apply same settings to both */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            updateCoverPosts({
              postsMethod: coverPosts.coverMethod,
              postsTemplate: coverPosts.coverTemplate,
              postsHtmlOptions: coverPosts.coverHtmlOptions,
              postsAiOptions: coverPosts.coverAiOptions,
            });
          }}
          className="text-xs text-white/40 hover:text-primary transition-colors underline"
        >
          Aplicar configurações da capa aos posts comuns
        </button>
      </div>
    </div>
  );
}

// Export types for external use
export type { ImageGenerationOptionsProps };
