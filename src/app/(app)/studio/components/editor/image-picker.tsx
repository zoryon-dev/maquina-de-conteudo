/**
 * Image Picker Component
 *
 * Seletor de imagens para o slide:
 * - Upload de imagem
 * - Geração com IA
 * - Preview da imagem atual
 */

"use client";

import { useState, useRef } from "react";
import { Upload, Sparkles, X, ImageIcon, Loader2, Wand2 } from "lucide-react";
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEMPLATE_METADATA } from "@/lib/studio-templates/types";
import { toast } from "sonner";

// ============================================================================
// AI GENERATION DIALOG
// ============================================================================

// Modelos de IA disponíveis para geração de imagem
const AI_IMAGE_MODELS = [
  { value: "google/gemini-3-pro-image-preview", label: "Gemini", description: "Google - Rápido e versátil" },
  { value: "openai/gpt-5-image", label: "GPT-5 Image", description: "OpenAI - Alta qualidade" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream", description: "ByteDance - Artístico" },
  { value: "black-forest-labs/flux.2-max", label: "Flux", description: "Black Forest - Fotorrealista" },
];

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string, style: string, model: string) => Promise<void>;
  isGenerating: boolean;
}

function AiGenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: AiGenerateDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("minimal");
  const [model, setModel] = useState("google/gemini-3-pro-image-preview");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Digite uma descrição para a imagem");
      return;
    }
    await onGenerate(prompt, style, model);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Imagem com IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Descreva a imagem que você quer criar. A IA vai gerar uma imagem baseada na sua descrição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label className="text-white/70">Descrição da imagem</Label>
            <Textarea
              placeholder="Ex: Uma xícara de café em uma mesa de madeira, luz natural entrando pela janela, estilo minimalista"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary"
              disabled={isGenerating}
            />
          </div>

          {/* Style & Model Selectors - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Style Selector */}
            <div className="space-y-2">
              <Label className="text-white/70">Estilo visual</Label>
              <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="minimal" className="text-white hover:bg-white/10">
                    Minimalista
                  </SelectItem>
                  <SelectItem value="realistic" className="text-white hover:bg-white/10">
                    Realista
                  </SelectItem>
                  <SelectItem value="artistic" className="text-white hover:bg-white/10">
                    Artístico
                  </SelectItem>
                  <SelectItem value="vibrant" className="text-white hover:bg-white/10">
                    Vibrante
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selector */}
            <div className="space-y-2">
              <Label className="text-white/70">Modelo IA</Label>
              <Select value={model} onValueChange={setModel} disabled={isGenerating}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  {AI_IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-white hover:bg-white/10">
                      <div className="flex flex-col">
                        <span>{m.label}</span>
                        <span className="text-[10px] text-white/40">{m.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <Label className="text-white/50 text-xs">Sugestões rápidas</Label>
            <div className="flex flex-wrap gap-2">
              {[
                "Abstrato geométrico",
                "Natureza minimalista",
                "Tecnologia futurista",
                "Pessoa trabalhando",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  disabled={isGenerating}
                  className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="gap-2 bg-primary text-black hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Gerar Imagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// IMAGE SLOT
// ============================================================================

interface ImageSlotProps {
  label: string;
  imageUrl?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onGenerateAi: () => void;
  isLoading?: boolean;
  isGenerating?: boolean;
}

function ImageSlot({
  label,
  imageUrl,
  onUpload,
  onRemove,
  onGenerateAi,
  isLoading,
  isGenerating,
}: ImageSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem válida");
        return;
      }
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      onUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isBusy = isLoading || isGenerating;

  return (
    <div className="space-y-2">
      <Label className="text-sm text-white/70">{label}</Label>

      {imageUrl ? (
        // Image Preview
        <div className="relative group">
          <div className="aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        // Upload Area
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              <span className="text-sm text-white/50">Enviando...</span>
            </>
          ) : isGenerating ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm text-primary">Gerando com IA...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-white/40" />
              <span className="text-sm text-white/50">Clique para upload</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="flex-1 gap-2 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Upload className="w-3 h-3" />
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateAi}
          disabled={isBusy}
          className="flex-1 gap-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary"
        >
          <Sparkles className="w-3 h-3" />
          Gerar IA
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ImagePicker() {
  const activeSlide = useActiveSlide();
  const updateSlideContent = useStudioStore((state) => state.updateSlideContent);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [targetField, setTargetField] = useState<"imageUrl" | "backgroundImageUrl">("imageUrl");

  if (!activeSlide) return null;

  const templateMeta = TEMPLATE_METADATA[activeSlide.template];
  const supportsBackgroundImage = templateMeta?.supportsBackgroundImage ?? false;

  const handleImageUpload = async (
    file: File,
    field: "imageUrl" | "backgroundImageUrl"
  ) => {
    try {
      setIsLoading(true);

      // Upload para storage via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", field === "backgroundImageUrl" ? "background" : "slide");

      const response = await fetch("/api/studio/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao fazer upload");
      }

      // Atualizar slide com URL do storage
      updateSlideContent(activeSlide.id, { [field]: result.url });
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("[IMAGE-PICKER] Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar imagem");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageRemove = (field: "imageUrl" | "backgroundImageUrl") => {
    updateSlideContent(activeSlide.id, { [field]: undefined });
  };

  const handleOpenAiDialog = (field: "imageUrl" | "backgroundImageUrl") => {
    setTargetField(field);
    setShowAiDialog(true);
  };

  const handleAiGenerate = async (prompt: string, style: string, model: string) => {
    try {
      setIsGenerating(true);
      setShowAiDialog(false);

      toast.info("Gerando imagem... Isso pode levar alguns segundos.");

      const response = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, model }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao gerar imagem");
      }

      // Atualizar slide com a imagem gerada
      updateSlideContent(activeSlide.id, { [targetField]: result.url });
      toast.success("Imagem gerada com sucesso!");
    } catch (error) {
      console.error("[IMAGE-PICKER] AI generation error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Background Image (apenas para template 01_CAPA) */}
        {supportsBackgroundImage && (
          <ImageSlot
            label="Imagem de Fundo"
            imageUrl={activeSlide.content.backgroundImageUrl}
            onUpload={(file) => handleImageUpload(file, "backgroundImageUrl")}
            onRemove={() => handleImageRemove("backgroundImageUrl")}
            onGenerateAi={() => handleOpenAiDialog("backgroundImageUrl")}
            isLoading={isLoading}
            isGenerating={isGenerating}
          />
        )}

        {/* Main Image (para outros templates) */}
        {!supportsBackgroundImage && (
          <ImageSlot
            label="Imagem Central"
            imageUrl={activeSlide.content.imageUrl}
            onUpload={(file) => handleImageUpload(file, "imageUrl")}
            onRemove={() => handleImageRemove("imageUrl")}
            onGenerateAi={() => handleOpenAiDialog("imageUrl")}
            isLoading={isLoading}
            isGenerating={isGenerating}
          />
        )}

        {/* Info */}
        <p className="text-xs text-white/40">
          Upload: JPG, PNG, WebP (max 5MB). IA: descreva a imagem desejada.
        </p>
      </div>

      {/* AI Generation Dialog */}
      <AiGenerateDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        onGenerate={handleAiGenerate}
        isGenerating={isGenerating}
      />
    </>
  );
}
