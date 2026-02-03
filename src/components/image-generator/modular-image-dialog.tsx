"use client";

/**
 * Modular Image Dialog
 *
 * Dialog para geração de imagens com o sistema modular.
 * Inclui tanto o modo modular (campos estruturados) quanto o modo simples.
 */

import * as React from "react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Wand2, Loader2, Sliders, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ImagePromptForm } from "./image-prompt-form";
import type { ImagePromptFields } from "@/types/image-generation";

// ============================================================================
// TYPES
// ============================================================================

interface ModularImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (url: string) => void;
  isGenerating?: boolean;
  /** Título customizado */
  title?: string;
  /** Descrição customizada */
  description?: string;
  /** Modelos disponíveis */
  models?: Array<{ value: string; label: string; description?: string }>;
  /** Modelo padrão */
  defaultModel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_AI_MODELS = [
  { value: "google/gemini-3-pro-image-preview", label: "Gemini", description: "Google - Rápido e versátil" },
  { value: "openai/gpt-5-image", label: "GPT-5 Image", description: "OpenAI - Alta qualidade" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream", description: "ByteDance - Artístico" },
  { value: "black-forest-labs/flux.2-max", label: "Flux", description: "Black Forest - Fotorrealista" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ModularImageDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating: externalIsGenerating,
  title = "Gerar Imagem com IA",
  description = "Escolha entre o modo modular (campos estruturados) ou o modo simples (prompt livre).",
  models = DEFAULT_AI_MODELS,
  defaultModel = "google/gemini-3-pro-image-preview",
}: ModularImageDialogProps) {
  // Estado
  const [activeTab, setActiveTab] = useState<"modular" | "simple">("modular");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel);

  // Estado do modo simples
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleStyle, setSimpleStyle] = useState<"realistic" | "artistic" | "minimal" | "vibrant">("minimal");

  // Usar estado externo ou interno
  const generating = externalIsGenerating ?? isGenerating;

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleModularGenerate = async (fields: ImagePromptFields) => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, model: selectedModel }),
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || "Erro ao gerar imagem");
      }

      toast.success("Imagem gerada com sucesso!");
      onGenerate(data.url);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar imagem";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimpleGenerate = async () => {
    if (!simplePrompt.trim()) {
      toast.error("Digite uma descrição para a imagem");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: simplePrompt,
          style: simpleStyle,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error(data.error || "Erro ao gerar imagem");
      }

      toast.success("Imagem gerada com sucesso!");
      onGenerate(data.url);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar imagem";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de Modelo */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <Label className="text-sm text-white/60 whitespace-nowrap">Modelo IA:</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={generating}>
            <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-white/10">
              {models.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-white hover:bg-white/10">
                  <div className="flex flex-col">
                    <span>{m.label}</span>
                    {m.description && (
                      <span className="text-[10px] text-white/40">{m.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "modular" | "simple")}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="modular"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={generating}
            >
              <Sliders className="w-4 h-4" />
              Modular
            </TabsTrigger>
            <TabsTrigger
              value="simple"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={generating}
            >
              <MessageSquare className="w-4 h-4" />
              Simples
            </TabsTrigger>
          </TabsList>

          {/* Tab Modular */}
          <TabsContent value="modular" className="mt-4">
            <ImagePromptForm
              onGenerate={handleModularGenerate}
              isGenerating={generating}
              showPromptPreview={true}
            />
          </TabsContent>

          {/* Tab Simples */}
          <TabsContent value="simple" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Descrição da imagem</Label>
              <Textarea
                placeholder="Ex: Uma xícara de café em uma mesa de madeira, luz natural entrando pela janela, estilo minimalista"
                value={simplePrompt}
                onChange={(e) => setSimplePrompt(e.target.value)}
                className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary"
                disabled={generating}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Estilo visual</Label>
              <Select value={simpleStyle} onValueChange={(v: any) => setSimpleStyle(v)} disabled={generating}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="minimal" className="text-white hover:bg-white/10">Minimalista</SelectItem>
                  <SelectItem value="realistic" className="text-white hover:bg-white/10">Realista</SelectItem>
                  <SelectItem value="artistic" className="text-white hover:bg-white/10">Artístico</SelectItem>
                  <SelectItem value="vibrant" className="text-white hover:bg-white/10">Vibrante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sugestões rápidas */}
            <div className="space-y-2">
              <Label className="text-white/50 text-xs">Sugestões rápidas</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Abstrato geométrico",
                  "Natureza minimalista",
                  "Tecnologia futurista",
                  "Pessoa trabalhando",
                  "Café e livros",
                  "Paisagem urbana",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setSimplePrompt(suggestion)}
                    disabled={generating}
                    className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Botão de gerar */}
            <Button
              onClick={handleSimpleGenerate}
              disabled={generating || !simplePrompt.trim()}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando imagem...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar Imagem
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
