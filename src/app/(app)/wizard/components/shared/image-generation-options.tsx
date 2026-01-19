/**
 * Image Generation Options Component
 *
 * Allows users to configure image generation options:
 * - Choose between AI generation (OpenRouter) or HTML templates (ScreenshotOne)
 * - For AI: select model, color, style, composition, mood
 * - For HTML: select template and colors
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Palette, Wand2, Layout, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ImageGenerationConfig,
  AiImageOptions,
  HtmlTemplateOptions,
  AiImageModel,
  ColorOption,
  VisualStyle,
  CompositionOption,
  MoodOption,
  HtmlTemplate,
} from "@/lib/wizard-services/client";

// ============================================================================
// CONSTANTS
// ============================================================================

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

const HTML_TEMPLATES: { value: HtmlTemplate; label: string; category: string }[] = [
  { value: "gradiente-solid", label: "Gradido Sólido", category: "Gradientes" },
  { value: "gradiente-linear", label: "Gradiente Linear", category: "Gradientes" },
  { value: "gradiente-radial", label: "Gradiente Radial", category: "Gradientes" },
  { value: "gradiente-mesh", label: "Gradiente Mesh", category: "Gradientes" },
  { value: "tipografia-bold", label: "Tipografia Bold", category: "Tipografia" },
  { value: "tipografia-clean", label: "Tipografia Clean", category: "Tipografia" },
  { value: "tipografia-overlay", label: "Tipografia Overlay", category: "Tipografia" },
  { value: "padrão-geométrico", label: "Padrão Geométrico", category: "Padrões" },
  { value: "padrão-círculos", label: "Padrão Círculos", category: "Padrões" },
  { value: "padrão-linhas", label: "Padrão Linhas", category: "Padrões" },
  { value: "padrão-ondas", label: "Padrão Ondas", category: "Padrões" },
  { value: "glassmorphism", label: "Glassmorphism", category: "Estilos" },
  { value: "neomorphism", label: "Neomorphism", category: "Estilos" },
  { value: "brutalista", label: "Brutalista", category: "Estilos" },
  { value: "neumorphism", label: "Neumorphism", category: "Estilos" },
  { value: "dark-mode", label: "Dark Mode", category: "Temas" },
  { value: "light-mode", label: "Light Mode", category: "Temas" },
  { value: "neon-glow", label: "Neon Glow", category: "Temas" },
  { value: "sunset-vibes", label: "Sunset Vibes", category: "Temas" },
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
// MAIN COMPONENT
// ============================================================================

export function ImageGenerationOptions({
  config,
  onChange,
  className,
}: ImageGenerationOptionsProps) {
  const [customColor, setCustomColor] = useState("#a3e635");

  // Update config helper
  const updateConfig = (updates: Partial<ImageGenerationConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateAiOptions = (updates: Partial<AiImageOptions>) => {
    const aiOptions = { ...config.aiOptions, ...updates } as AiImageOptions;
    updateConfig({ aiOptions });
  };

  const updateHtmlOptions = (updates: Partial<HtmlTemplateOptions>) => {
    const htmlOptions = { ...config.htmlOptions, ...updates } as HtmlTemplateOptions;
    updateConfig({ htmlOptions });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Method Selection */}
      <Section title="Método de Geração" icon={Wand2}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateConfig({ method: "ai", htmlOptions: undefined })}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              config.method === "ai"
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className={cn(
                "w-4 h-4",
                config.method === "ai" ? "text-primary" : "text-white/40"
              )} />
              <span className="text-sm font-medium text-white">IA Generativa</span>
            </div>
            <p className="text-xs text-white/60">
              Modelos via OpenRouter: Gemini, GPT-5, Seedream, Flux
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateConfig({ method: "html-template", aiOptions: undefined })}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              config.method === "html-template"
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layout className={cn(
                "w-4 h-4",
                config.method === "html-template" ? "text-primary" : "text-white/40"
              )} />
              <span className="text-sm font-medium text-white">Template HTML</span>
            </div>
            <p className="text-xs text-white/60">
              Templates prontos via ScreenshotOne (1080x1350px)
            </p>
          </button>
        </div>
      </Section>

      {/* AI Options */}
      {config.method === "ai" && (
        <>
          <Section title="Modelo de IA" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-2">
              {AI_IMAGE_MODELS.map((model) => (
                <button
                  key={model.value}
                  type="button"
                  onClick={() => updateAiOptions({ model: model.value })}
                  className={cn(
                    "p-3 rounded-lg border text-sm transition-all",
                    config.aiOptions?.model === model.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                  )}
                >
                  {model.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Cor Principal" icon={Palette}>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => updateAiOptions({ color: color.value })}
                  className={cn(
                    "relative h-12 rounded-lg overflow-hidden border-2 transition-all",
                    config.aiOptions?.color === color.value
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

            {config.aiOptions?.color === "personalizado" && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
                <input
                  type="color"
                  value={config.aiOptions.customColor || customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    updateAiOptions({ customColor: e.target.value });
                  }}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.aiOptions.customColor || customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    updateAiOptions({ customColor: e.target.value });
                  }}
                  placeholder="#RRGGBB"
                  className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
                  maxLength={7}
                />
              </div>
            )}
          </Section>

          <Section title="Estilo Visual" icon={Palette} defaultExpanded={false}>
            <div className="grid grid-cols-3 gap-2">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => updateAiOptions({ style: style.value })}
                  className={cn(
                    "p-3 rounded-lg border text-sm transition-all text-left",
                    config.aiOptions?.style === style.value
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

          <Section title="Composição" icon={Layout} defaultExpanded={false}>
            <div className="grid grid-cols-3 gap-2">
              {COMPOSITION_OPTIONS.map((comp) => (
                <button
                  key={comp.value}
                  type="button"
                  onClick={() => updateAiOptions({ composition: comp.value })}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-all",
                    config.aiOptions?.composition === comp.value
                      ? "border-primary bg-primary/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                  )}
                >
                  {comp.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Mood" icon={Sparkles} defaultExpanded={false}>
            <div className="grid grid-cols-3 gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => updateAiOptions({ mood: mood.value })}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-all",
                    config.aiOptions?.mood === mood.value
                      ? "border-primary bg-primary/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                  )}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* HTML Template Options */}
      {config.method === "html-template" && (
        <>
          <Section title="Template" icon={Layout}>
            <div className="space-y-4">
              {Object.entries(
                HTML_TEMPLATES.reduce((acc, t) => {
                  if (!acc[t.category]) acc[t.category] = [];
                  acc[t.category].push(t);
                  return acc;
                }, {} as Record<string, typeof HTML_TEMPLATES>)
              ).map(([category, templates]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.value}
                        type="button"
                        onClick={() => updateHtmlOptions({ template: template.value })}
                        className={cn(
                          "p-3 rounded-lg border text-sm transition-all",
                          config.htmlOptions?.template === template.value
                            ? "border-primary bg-primary/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                        )}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Cores do Template" icon={Palette}>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60 mb-2 block">Cor Primária</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.htmlOptions?.primaryColor || "#a3e635"}
                    onChange={(e) => updateHtmlOptions({ primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.htmlOptions?.primaryColor || "#a3e635"}
                    onChange={(e) => updateHtmlOptions({ primaryColor: e.target.value })}
                    className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                    maxLength={7}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 mb-2 block">Cor Secundária (opcional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.htmlOptions?.secondaryColor || "#6366f1"}
                    onChange={(e) => updateHtmlOptions({ secondaryColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.htmlOptions?.secondaryColor || "#6366f1"}
                    onChange={(e) => updateHtmlOptions({ secondaryColor: e.target.value })}
                    className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                    maxLength={7}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 mb-2 block">Cor de Fundo (opcional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.htmlOptions?.backgroundColor || "#1a1a2e"}
                    onChange={(e) => updateHtmlOptions({ backgroundColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.htmlOptions?.backgroundColor || "#1a1a2e"}
                    onChange={(e) => updateHtmlOptions({ backgroundColor: e.target.value })}
                    className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* Additional Context (both methods) */}
      <Section title="Contexto Adicional" icon={Sparkles} defaultExpanded={false}>
        <textarea
          value={config.aiOptions?.additionalContext || ""}
          onChange={(e) => updateAiOptions({ additionalContext: e.target.value })}
          placeholder="Descreva elementos específicos que deseja na imagem..."
          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
          rows={3}
        />
      </Section>
    </div>
  );
}

// Export types for external use
export type { ImageGenerationOptionsProps };
