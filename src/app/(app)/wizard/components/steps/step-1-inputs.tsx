/**
 * Step 1 - Inputs Form
 *
 * Main form for collecting user input about the content they want to create.
 * Refactored with better spacing, collapsible sections, and improved UX.
 */

"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Film,
  PlayCircle,
  Sparkles,
  Target,
  Megaphone,
  Users,
  Link as LinkIcon,
  X,
  ChevronRight,
  Plus,
  Minus,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CollapsibleSection,
} from "@/components/ui/collapsible";
import type { PostType } from "@/db/schema";
import { TEXT_MODELS, DEFAULT_TEXT_MODEL, type ModelProvider } from "@/lib/models";

export interface WizardFormData {
  contentType?: PostType;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: {
    mode?: "auto" | "manual";
    threshold?: number;
    maxChunks?: number;
    documents?: number[];
    collections?: number[];
  };
  negativeTerms?: string[];
}

interface Step1InputsProps {
  data: WizardFormData;
  onChange: (data: WizardFormData) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  availableModels?: Array<{ id: string; name: string }>;
  className?: string;
}

const CONTENT_TYPES: Array<{
  value: PostType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  color: string;
  gradient: string;
  defaultSlides?: number;
}> = [
  {
    value: "text",
    label: "Post Texto",
    shortLabel: "Texto",
    icon: FileText,
    description: "Post tradicional para redes sociais",
    color: "from-blue-500 to-cyan-500",
    gradient: "from-blue-500/10 to-cyan-500/10",
    defaultSlides: 1,
  },
  {
    value: "image",
    label: "Post Imagem",
    shortLabel: "Imagem",
    icon: ImageIcon,
    description: "Imagem única com legenda",
    color: "from-purple-500 to-pink-500",
    gradient: "from-purple-500/10 to-pink-500/10",
    defaultSlides: 1,
  },
  {
    value: "carousel",
    label: "Carrossel",
    shortLabel: "Carrossel",
    icon: Film,
    description: "Sequência de slides swipeable",
    color: "from-orange-500 to-amber-500",
    gradient: "from-orange-500/10 to-amber-500/10",
    defaultSlides: 10,
  },
  {
    value: "video",
    label: "Vídeo",
    shortLabel: "Vídeo",
    icon: PlayCircle,
    description: "Vídeo curto (Reels, TikTok)",
    color: "from-red-500 to-rose-500",
    gradient: "from-red-500/10 to-rose-500/10",
    defaultSlides: 1,
  },
];

export function Step1Inputs({
  data,
  onChange,
  onSubmit,
  isSubmitting = false,
  className,
}: Step1InputsProps) {
  const [negativeTermInput, setNegativeTermInput] = useState("");

  // Default model if not set
  const selectedModel = data.model ?? DEFAULT_TEXT_MODEL.id;

  // Auto-save effect
  useEffect(() => {
    // Auto-save handled by parent component
  }, [data]);

  const handleAddNegativeTerm = () => {
    if (negativeTermInput.trim()) {
      onChange({
        ...data,
        negativeTerms: [...(data.negativeTerms ?? []), negativeTermInput.trim()],
      });
      setNegativeTermInput("");
    }
  };

  const handleRemoveNegativeTerm = (term: string) => {
    onChange({
      ...data,
      negativeTerms: (data.negativeTerms ?? []).filter((t) => t !== term),
    });
  };

  const isValid = data.contentType;

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">
          Configure seu Conteúdo
        </h2>
        <p className="text-white/60">
          Preencha as informações abaixo para criar conteúdo com IA
        </p>
      </div>

      {/* Content Type Selection - Always Visible */}
      <section className="mb-8">
        <Label className="text-sm font-medium text-white/80 mb-4 block">
          1. Escolha o tipo de conteúdo
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = data.contentType === type.value;
            return (
              <motion.button
                key={type.value}
                type="button"
                onClick={() => {
                  onChange({
                    ...data,
                    contentType: type.value,
                    numberOfSlides:
                      data.numberOfSlides ?? type.defaultSlides ?? 10,
                  });
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-5 rounded-2xl border-2 transition-all duration-300 group overflow-hidden",
                  isSelected
                    ? `border-transparent bg-gradient-to-br ${type.gradient} shadow-lg`
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="content-type-glow"
                    className="absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative flex flex-col items-center gap-3">
                  <div
                    className={cn(
                      "p-3 rounded-xl transition-all duration-300",
                      isSelected
                        ? `bg-gradient-to-br ${type.color} text-white shadow-lg`
                        : "bg-white/5 group-hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-white" : "text-white/70"
                    )}
                  >
                    {type.shortLabel}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Slides Count (for carousel) - Inline when carousel selected */}
      {data.contentType === "carousel" && (
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
            <div>
              <Label className="text-sm font-medium text-white">Número de Slides</Label>
              <p className="text-xs text-white/70 mt-1">Carrosséis de 5 a 10 slides têm melhor performance</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    numberOfSlides: Math.max(3, (data.numberOfSlides ?? 10) - 1),
                  })
                }
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-semibold text-white min-w-[40px] text-center">
                {data.numberOfSlides ?? 10}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    numberOfSlides: Math.min(20, (data.numberOfSlides ?? 10) + 1),
                  })
                }
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Collapsible Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Referências */}
          <CollapsibleSection
            title="2. Referências (Opcional)"
            description="URLs para extrair conteúdo e inspiração"
            icon={LinkIcon}
            defaultOpen={true}
          >
            <div className="space-y-5">
              {/* Reference URL */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  URL de Referência
                  <span className="text-white/70 font-normal">(Firecrawl)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/conteudo"
                    value={data.referenceUrl ?? ""}
                    onChange={(e) =>
                      onChange({ ...data, referenceUrl: e.target.value })
                    }
                    className="flex-1 h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                  {data.referenceUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onChange({ ...data, referenceUrl: undefined })}
                      className="h-11 w-11 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Reference Video URL */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" />
                  URL de Vídeo
                  <span className="text-white/70 font-normal">(Transcrição)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={data.referenceVideoUrl ?? ""}
                    onChange={(e) =>
                      onChange({ ...data, referenceVideoUrl: e.target.value })
                    }
                    className="flex-1 h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                  />
                  {data.referenceVideoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onChange({ ...data, referenceVideoUrl: undefined })
                      }
                      className="h-11 w-11 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Detalhes do Conteúdo */}
          <CollapsibleSection
            title="3. Detalhes do Conteúdo"
            description="Informações para orientar a geração"
            icon={FileText}
            defaultOpen={true}
          >
            <div className="space-y-5">
              {/* Theme */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Tema Principal
                  <span className="text-white/70 font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ex: Lançamento de nova coleção de verão"
                  value={data.theme ?? ""}
                  onChange={(e) => onChange({ ...data, theme: e.target.value })}
                  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>

              {/* Objective */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  Objetivo do Conteúdo
                  <span className="text-white/70 font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ex: Aumentar engajamento, promover produto..."
                  value={data.objective ?? ""}
                  onChange={(e) => onChange({ ...data, objective: e.target.value })}
                  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>

              {/* CTA */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-orange-400" />
                  Call to Action
                  <span className="text-white/70 font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ex: Link na bio, Clique em saiba mais..."
                  value={data.cta ?? ""}
                  onChange={(e) => onChange({ ...data, cta: e.target.value })}
                  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Contexto e Público */}
          <CollapsibleSection
            title="4. Contexto e Público"
            description="Informações adicionais para personalizar"
            icon={Users}
            defaultOpen={true}
          >
            <div className="space-y-5">
              {/* Target Audience */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  Público-Alvo
                  <span className="text-white/70 font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ex: Mulheres 25-40 interessadas em skincare"
                  value={data.targetAudience ?? ""}
                  onChange={(e) => onChange({ ...data, targetAudience: e.target.value })}
                  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>

              {/* Context */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Contexto Adicional
                  <span className="text-white/70 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  placeholder="Informações adicionais que possam ajudar a criar um conteúdo mais direcionado...&#10;&#10;Ex: Tema deve ser leve e descontraído, usar emojis, evitar linguagem muito técnica."
                  value={data.context ?? ""}
                  onChange={(e) => onChange({ ...data, context: e.target.value })}
                  rows={5}
                  className="resize-none min-h-[120px] !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Restrições */}
          <CollapsibleSection
            title="5. Restrições (Opcional)"
            description="Termos e palavras para evitar no conteúdo"
            icon={X}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar termo ou expressão..."
                  value={negativeTermInput}
                  onChange={(e) => setNegativeTermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNegativeTerm();
                    }
                  }}
                  className="flex-1 h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddNegativeTerm}
                  disabled={!negativeTermInput.trim()}
                  className="h-11 px-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {data.negativeTerms && data.negativeTerms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {data.negativeTerms.map((term) => (
                      <motion.span
                        key={term}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                      >
                        {term}
                        <button
                          type="button"
                          onClick={() => handleRemoveNegativeTerm(term)}
                          className="hover:text-red-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-sm text-white/70 text-center py-4">
                  Nenhum termo adicionado
                </p>
              )}
            </div>
          </CollapsibleSection>

          {/* AI Configuration */}
          <CollapsibleSection
            title="6. Configurações de IA"
            description="Modelo de IA para gerar conteúdo"
            icon={Cpu}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-white/70 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Modelo de IA
                  <span className="text-white/70 font-normal">(geração de narrativas e conteúdo)</span>
                </Label>

                {/* Model Selector Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] text-white text-sm hover:border-white/20 hover:bg-white/[0.05] transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary/70" />
                        {TEXT_MODELS.find(m => m.id === selectedModel)?.name || DEFAULT_TEXT_MODEL.name}
                      </span>
                      <span className="text-xs text-white/50">Trocar →</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Escolha o Modelo de IA</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto -mx-2">
                      {(() => {
                        const providers: Array<ModelProvider> = ["openai", "anthropic", "google", "x-ai"];
                        const providerNames: Record<ModelProvider, string> = {
                          openai: "OpenAI",
                          anthropic: "Anthropic",
                          google: "Google",
                          "x-ai": "xAI",
                          "black-forest-labs": "Black Forest Labs",
                          "sourceful": "Sourceful",
                          "bytedance-seed": "ByteDance",
                        };

                        return providers.map(provider => {
                          const providerModels = TEXT_MODELS.filter(m => m.provider === provider);
                          if (providerModels.length === 0) return null;

                          return (
                            <div key={provider} className="mb-4 last:mb-0">
                              {/* Provider Header */}
                              <div className="px-3 py-2 bg-white/[0.03] border border-white/10 rounded-t-lg">
                                <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                  {providerNames[provider]}
                                </span>
                              </div>

                              {/* Models */}
                              <div className="border border-t-0 border-white/10 rounded-b-lg overflow-hidden">
                                {providerModels.map(model => (
                                  <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => {
                                      onChange({ ...data, model: model.id });
                                      // Close dialog by finding the close button
                                      document.querySelector('[data-slot="dialog-close"]')?.dispatchEvent(
                                        new MouseEvent('click', { bubbles: true })
                                      );
                                    }}
                                    className={cn(
                                      "w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0",
                                      selectedModel === model.id
                                        ? "bg-primary/20 text-primary"
                                        : "text-white/80 hover:bg-white/[0.03] hover:text-white"
                                    )}
                                  >
                                    <Cpu className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1">{model.name}</span>
                                    {selectedModel === model.id && (
                                      <span className="text-primary">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Model info badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <Cpu className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs text-white/70">
                  Usando <span className="text-white font-medium">{TEXT_MODELS.find(m => m.id === selectedModel)?.name || DEFAULT_TEXT_MODEL.name}</span>
                </span>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Submit Button - Spaced at bottom */}
      <div className="pt-8 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/60">
            {isValid ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Pronto para gerar narrativas
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/20" />
                Selecione o tipo de conteúdo
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full sm:w-auto min-w-[200px] h-12 text-base"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Gerando narrativas...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Narrativas
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
