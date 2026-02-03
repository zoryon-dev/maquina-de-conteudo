/**
 * Step: Visual Editor
 *
 * Mini editor visual para ajustar o conteúdo mapeado do Wizard.
 * Permite visualizar o carrossel em templates do Studio, ajustar cores,
 * trocar templates e editar textos.
 *
 * Fase 3: Visual Editor Integration
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sparkles,
  LayoutTemplate,
  Eye,
  X,
  Upload,
  Loader2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import {
  type StudioSlide,
  type StudioProfile,
  type StudioHeader,
  type SlideStyle,
  type FigmaTemplate,
  DIMENSIONS,
  TEMPLATE_METADATA,
  DEFAULT_PROFILE,
  DEFAULT_HEADER,
} from "@/lib/studio-templates/types";
import type { MappedContent } from "@/lib/wizard-services/content-mapper";

// ============================================================================
// TYPES
// ============================================================================

interface StepVisualEditorProps {
  mappedContent: MappedContent;
  onSave: (content: MappedContent) => void;
  onBack: () => void;
  onSkip?: () => void;
  /** Brand colors from user settings (hex values) */
  brandColors?: string[];
  className?: string;
}

// ============================================================================
// COLOR PRESETS
// ============================================================================

const BACKGROUND_PRESETS = [
  "#FFFFFF", "#F5F5F5", "#FAFAFA",
  "#0A0A0F", "#1A1A2E", "#16213E",
  "#FEF3C7", "#DBEAFE", "#D1FAE5",
];

const TEXT_PRESETS = [
  "#000000", "#1A1A1A", "#374151",
  "#FFFFFF", "#F9FAFB", "#E5E7EB",
];

const PRIMARY_PRESETS = [
  "#FFD700", "#A3E635", "#2DD4BF",
  "#F97316", "#EC4899", "#8B5CF6",
];

// Available templates for switching
const AVAILABLE_TEMPLATES: { value: FigmaTemplate; label: string; description: string }[] = [
  { value: "01_CAPA", label: "Capa", description: "Slide de abertura com destaque" },
  { value: "201", label: "Bold Start", description: "Título em destaque" },
  { value: "202", label: "Standard", description: "Layout equilibrado" },
  { value: "203", label: "Swipe CTA", description: "Call-to-action com swipe" },
  { value: "DARK_MODE", label: "Dark Mode", description: "Fundo escuro premium" },
  { value: "WHITE_MODE", label: "White Mode", description: "Fundo claro minimalista" },
  { value: "TWITTER", label: "Twitter Style", description: "Estilo de tweet" },
  { value: "SUPER_HEADLINE", label: "Super Headline", description: "Apenas título impactante" },
];

// AI Image generation models
const AI_IMAGE_MODELS = [
  { value: "google/gemini-3-pro-image-preview", label: "Gemini", description: "Google - Rápido e versátil" },
  { value: "openai/gpt-5-image", label: "GPT-5 Image", description: "OpenAI - Alta qualidade" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream", description: "ByteDance - Artístico" },
  { value: "black-forest-labs/flux.2-max", label: "Flux", description: "Black Forest - Fotorrealista" },
];

// ============================================================================
// AI GENERATION DIALOG
// ============================================================================

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
// MAIN COMPONENT
// ============================================================================

export function StepVisualEditor({
  mappedContent,
  onSave,
  onBack,
  onSkip,
  brandColors = [],
  className,
}: StepVisualEditorProps) {
  // Local state for editing
  const [slides, setSlides] = useState<StudioSlide[]>(mappedContent.slides);
  const [profile, setProfile] = useState<StudioProfile>(mappedContent.profile);
  const [header, setHeader] = useState<StudioHeader>(mappedContent.header);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<"preview" | "colors" | "text" | "images">("preview");
  const [scale, setScale] = useState(0.3);
  const [autoScale, setAutoScale] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Image generation state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [targetImageField, setTargetImageField] = useState<"imageUrl" | "backgroundImageUrl">("imageUrl");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSlide = slides[activeSlideIndex];

  // Auto-scale calculation
  useEffect(() => {
    if (!autoScale || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - 40;
      const availableHeight = rect.height - 40;

      const dimensions = DIMENSIONS["4:5"];
      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      const newScale = Math.min(scaleX, scaleY, 0.4);
      setScale(Math.max(newScale, 0.15));
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [autoScale]);

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    if (!activeSlide) return null;

    const result = renderSlideToHtml({
      slide: activeSlide,
      profile,
      header,
      slideIndex: activeSlideIndex,
      totalSlides: slides.length,
    });

    return result.html;
  }, [activeSlide, profile, header, activeSlideIndex, slides.length]);

  // Navigation
  const goToPrevSlide = useCallback(() => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
  }, [activeSlideIndex]);

  const goToNextSlide = useCallback(() => {
    if (activeSlideIndex < slides.length - 1) {
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  }, [activeSlideIndex, slides.length]);

  // Update slide content
  const updateSlideContent = useCallback((field: string, value: string | boolean) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        index === activeSlideIndex
          ? {
              ...slide,
              content: {
                ...slide.content,
                [field]: value,
              },
            }
          : slide
      )
    );
  }, [activeSlideIndex]);

  // Update slide style
  const updateSlideStyle = useCallback((field: keyof SlideStyle, value: string | boolean) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        index === activeSlideIndex
          ? {
              ...slide,
              style: {
                ...slide.style,
                [field]: value,
              },
            }
          : slide
      )
    );
  }, [activeSlideIndex]);

  // Apply style to all slides
  const applyStyleToAll = useCallback((style: Partial<SlideStyle>) => {
    setSlides((prev) =>
      prev.map((slide) => ({
        ...slide,
        style: {
          ...slide.style,
          ...style,
        },
      }))
    );
  }, []);

  // Update slide template
  const updateSlideTemplate = useCallback((template: FigmaTemplate) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        index === activeSlideIndex
          ? { ...slide, template }
          : slide
      )
    );
  }, [activeSlideIndex]);

  // Apply template to all slides (except cover)
  const applyTemplateToAll = useCallback((template: FigmaTemplate) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        // Skip first slide (cover)
        index === 0 ? slide : { ...slide, template }
      )
    );
  }, []);

  // Check if current template supports images
  const currentTemplateSupportsImage = useMemo(() => {
    const metadata = TEMPLATE_METADATA[activeSlide?.template];
    return metadata?.supportsImage || metadata?.supportsBackgroundImage;
  }, [activeSlide]);

  const currentTemplateMeta = useMemo(() => {
    return activeSlide ? TEMPLATE_METADATA[activeSlide.template] : null;
  }, [activeSlide]);

  // Handle image upload
  const handleImageUpload = useCallback(async (
    file: File,
    field: "imageUrl" | "backgroundImageUrl"
  ) => {
    try {
      setIsUploadingImage(true);

      // Upload to storage via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", field === "backgroundImageUrl" ? "background" : "slide");

      const response = await fetch("/api/studio/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      // Update slide with image URL
      setSlides((prev) =>
        prev.map((slide, idx) =>
          idx === activeSlideIndex
            ? { ...slide, content: { ...slide.content, [field]: result.url } }
            : slide
        )
      );
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("[VisualEditor] Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  }, [activeSlideIndex]);

  // Handle image removal
  const handleImageRemove = useCallback((field: "imageUrl" | "backgroundImageUrl") => {
    setSlides((prev) =>
      prev.map((slide, idx) =>
        idx === activeSlideIndex
          ? { ...slide, content: { ...slide.content, [field]: undefined } }
          : slide
      )
    );
  }, [activeSlideIndex]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem válida");
        return;
      }
      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      handleImageUpload(file, targetImageField);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleImageUpload, targetImageField]);

  // Handle AI image generation
  const handleAiGenerate = useCallback(async (prompt: string, style: string, model: string) => {
    try {
      setIsGeneratingImage(true);
      setShowAiDialog(false);

      toast.info("Gerando imagem... Isso pode levar alguns segundos.");

      const response = await fetch("/api/studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, model }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }

      // Update slide with generated image
      setSlides((prev) =>
        prev.map((slide, idx) =>
          idx === activeSlideIndex
            ? { ...slide, content: { ...slide.content, [targetImageField]: result.url } }
            : slide
        )
      );
      toast.success("Imagem gerada com sucesso!");
    } catch (error) {
      console.error("[VisualEditor] AI generation error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar imagem");
    } finally {
      setIsGeneratingImage(false);
    }
  }, [activeSlideIndex, targetImageField]);

  // Open AI dialog
  const openAiDialog = useCallback((field: "imageUrl" | "backgroundImageUrl") => {
    setTargetImageField(field);
    setShowAiDialog(true);
  }, []);

  // Trigger file upload
  const triggerFileUpload = useCallback((field: "imageUrl" | "backgroundImageUrl") => {
    setTargetImageField(field);
    fileInputRef.current?.click();
  }, []);

  // Handle save
  const handleSave = () => {
    onSave({
      slides,
      profile,
      header,
      caption: mappedContent.caption,
      hashtags: mappedContent.hashtags,
    });
  };

  const dimensions = DIMENSIONS["4:5"];
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  if (!activeSlide || !previewHtml) {
    return (
      <div className="flex items-center justify-center h-96 text-white/40">
        <p>Nenhum conteúdo para visualizar</p>
      </div>
    );
  }

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;

  return (
    <div className={cn("w-full max-w-6xl mx-auto px-4 py-6", className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4"
        >
          <Eye className="w-7 h-7 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Visualize e Ajuste
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/60"
        >
          Veja como seu carrossel ficará e ajuste cores e textos se necessário
        </motion.p>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Preview Panel (60%) */}
        <div className="flex-1 min-w-0">
          {/* Preview Container */}
          <div
            ref={containerRef}
            className="relative bg-white/[0.02] border border-white/10 rounded-2xl p-4 min-h-[500px] flex items-center justify-center"
          >
            {/* Zoom Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setAutoScale(false);
                  setScale((s) => Math.min(s + 0.05, 0.5));
                }}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <span className="text-xs text-white/40 font-mono w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setAutoScale(false);
                  setScale((s) => Math.max(s - 0.05, 0.1));
                }}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setAutoScale(true)}
              >
                Auto
              </Button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-xs text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setFullscreenOpen(true)}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Device Frame */}
            <div
              className="relative bg-black rounded-2xl shadow-2xl"
              style={{
                width: scaledWidth + 12,
                height: scaledHeight + 12,
                padding: 6,
              }}
            >
              <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

              <div
                className="relative rounded-xl bg-white overflow-hidden"
                style={{ width: scaledWidth, height: scaledHeight }}
              >
                <iframe
                  src={dataUrl}
                  title="Preview"
                  className="border-0 pointer-events-none"
                  style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Slide Info Badge */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/60">
              <span>Slide {activeSlideIndex + 1} de {slides.length}</span>
            </div>
          </div>

          {/* Slide Navigator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white/60 hover:text-white"
              onClick={goToPrevSlide}
              disabled={activeSlideIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSlideIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === activeSlideIndex
                      ? "w-6 bg-primary"
                      : "bg-white/20 hover:bg-white/40"
                  )}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white/60 hover:text-white"
              onClick={goToNextSlide}
              disabled={activeSlideIndex === slides.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Editor Panel (40%) */}
        <div className="w-80 flex-shrink-0 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {[
              { id: "preview", label: "Info", icon: Eye },
              { id: "colors", label: "Cores", icon: Palette },
              { id: "text", label: "Texto", icon: Type },
              { id: "images", label: "Imagens", icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Template Selector */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70 flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                    Trocar Template
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {AVAILABLE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.value}
                        type="button"
                        onClick={() => updateSlideTemplate(tpl.value)}
                        title={tpl.description}
                        className={cn(
                          "p-2 rounded-lg border text-left transition-all",
                          activeSlide.template === tpl.value
                            ? "border-primary bg-primary/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <p className="text-[11px] font-medium truncate">{tpl.label}</p>
                        <p className="text-[9px] text-white/40 truncate">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-white/50 hover:text-white/70 hover:bg-white/5"
                    onClick={() => applyTemplateToAll(activeSlide.template)}
                    disabled={activeSlideIndex === 0}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Aplicar a todos (exceto capa)
                  </Button>
                </div>

                {/* Slide Info */}
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Palette className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-white/70">Fundo:</span>
                    <div
                      className="w-3.5 h-3.5 rounded border border-white/20"
                      style={{ backgroundColor: activeSlide.style.backgroundColor }}
                    />
                    <span className="text-white/50 font-mono text-[10px]">
                      {activeSlide.style.backgroundColor}
                    </span>
                  </div>

                  {activeSlide.content.texto1 && (
                    <div className="text-[10px] text-white/50 line-clamp-2">
                      <span className="text-white/70">Texto: </span>
                      {activeSlide.content.texto1}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white/[0.02] border border-white/10 rounded-lg text-center">
                    <p className="text-xl font-bold text-white">{slides.length}</p>
                    <p className="text-[10px] text-white/50">Slides</p>
                  </div>
                  <div className="p-2.5 bg-white/[0.02] border border-white/10 rounded-lg text-center">
                    <p className="text-xl font-bold text-primary">4:5</p>
                    <p className="text-[10px] text-white/50">Proporção</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "colors" && (
              <motion.div
                key="colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Brand Colors (if available) */}
                {brandColors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      Cores da Marca
                    </Label>
                    <div className="flex gap-1 flex-wrap p-2 bg-primary/5 border border-primary/20 rounded-lg">
                      {brandColors.map((color, i) => (
                        <button
                          key={`brand-${i}`}
                          type="button"
                          title={`Cor da marca: ${color}`}
                          onClick={() => updateSlideStyle("primaryColor", color)}
                          className={cn(
                            "w-8 h-8 rounded-lg border-2 transition-all ring-1 ring-primary/30",
                            activeSlide.style.primaryColor === color
                              ? "border-primary scale-110"
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">Cor de Fundo</Label>
                  <div className="flex gap-1 flex-wrap">
                    {BACKGROUND_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("backgroundColor", color)}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          activeSlide.style.backgroundColor === color
                            ? "border-primary scale-110"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    type="text"
                    value={activeSlide.style.backgroundColor}
                    onChange={(e) => updateSlideStyle("backgroundColor", e.target.value)}
                    className="h-8 text-xs bg-white/5 border-white/10"
                    placeholder="#FFFFFF"
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">Cor do Texto</Label>
                  <div className="flex gap-1 flex-wrap">
                    {TEXT_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("textColor", color)}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          activeSlide.style.textColor === color
                            ? "border-primary scale-110"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">Cor de Destaque</Label>
                  <div className="flex gap-1 flex-wrap">
                    {PRIMARY_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("primaryColor", color)}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all",
                          activeSlide.style.primaryColor === color
                            ? "border-primary scale-110"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Apply to All */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  onClick={() => applyStyleToAll(activeSlide.style)}
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Aplicar cores a todos os slides
                </Button>
              </motion.div>
            )}

            {activeTab === "text" && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Texto 1 */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">
                    Texto Principal
                    {activeSlide.content.texto1Bold && (
                      <span className="ml-1 text-primary">(Bold)</span>
                    )}
                  </Label>
                  <Textarea
                    value={activeSlide.content.texto1}
                    onChange={(e) => updateSlideContent("texto1", e.target.value)}
                    className="min-h-[80px] text-sm bg-white/5 border-white/10 resize-none"
                    placeholder="Texto principal do slide..."
                  />
                </div>

                {/* Texto 2 */}
                {activeSlide.content.texto2 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">Texto Secundário</Label>
                    <Textarea
                      value={activeSlide.content.texto2}
                      onChange={(e) => updateSlideContent("texto2", e.target.value)}
                      className="min-h-[60px] text-sm bg-white/5 border-white/10 resize-none"
                      placeholder="Texto secundário..."
                    />
                  </div>
                )}

                {/* Texto 3 */}
                {activeSlide.content.texto3 !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">
                      Texto de Conexão
                      {activeSlide.content.texto3Bold && (
                        <span className="ml-1 text-primary">(Bold)</span>
                      )}
                    </Label>
                    <Input
                      value={activeSlide.content.texto3 || ""}
                      onChange={(e) => updateSlideContent("texto3", e.target.value)}
                      className="h-9 text-sm bg-white/5 border-white/10"
                      placeholder="Conexão com próximo slide..."
                    />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "images" && (
              <motion.div
                key="images"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {currentTemplateSupportsImage ? (
                  <>
                    {/* Background Image (for templates that support it) */}
                    {currentTemplateMeta?.supportsBackgroundImage && (
                      <div className="space-y-2">
                        <Label className="text-xs text-white/70 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          Imagem de Fundo
                        </Label>

                        {activeSlide.content.backgroundImageUrl ? (
                          <div className="relative group">
                            <div className="aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
                              <img
                                src={activeSlide.content.backgroundImageUrl}
                                alt="Background"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => handleImageRemove("backgroundImageUrl")}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => triggerFileUpload("backgroundImageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploadingImage && targetImageField === "backgroundImageUrl" ? (
                              <>
                                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                <span className="text-xs text-white/50">Enviando...</span>
                              </>
                            ) : isGeneratingImage && targetImageField === "backgroundImageUrl" ? (
                              <>
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <span className="text-xs text-primary">Gerando com IA...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 text-white/40" />
                                <span className="text-xs text-white/50">Clique para upload</span>
                              </>
                            )}
                          </button>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerFileUpload("backgroundImageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-7 text-[10px] bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <Upload className="w-3 h-3" />
                            Upload
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAiDialog("backgroundImageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-7 text-[10px] bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          >
                            <Sparkles className="w-3 h-3" />
                            Gerar IA
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Main Image (for templates that support it) */}
                    {currentTemplateMeta?.supportsImage && (
                      <div className="space-y-2">
                        <Label className="text-xs text-white/70 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          Imagem Central
                        </Label>

                        {activeSlide.content.imageUrl ? (
                          <div className="relative group">
                            <div className="aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
                              <img
                                src={activeSlide.content.imageUrl}
                                alt="Image"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => handleImageRemove("imageUrl")}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => triggerFileUpload("imageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploadingImage && targetImageField === "imageUrl" ? (
                              <>
                                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                <span className="text-xs text-white/50">Enviando...</span>
                              </>
                            ) : isGeneratingImage && targetImageField === "imageUrl" ? (
                              <>
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <span className="text-xs text-primary">Gerando com IA...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 text-white/40" />
                                <span className="text-xs text-white/50">Clique para upload</span>
                              </>
                            )}
                          </button>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerFileUpload("imageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-7 text-[10px] bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <Upload className="w-3 h-3" />
                            Upload
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAiDialog("imageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-7 text-[10px] bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          >
                            <Sparkles className="w-3 h-3" />
                            Gerar IA
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <p className="text-[10px] text-white/40">
                      Upload: JPG, PNG, WebP (max 5MB). Clique em &quot;Gerar IA&quot; para criar imagens com inteligência artificial.
                    </p>
                  </>
                ) : (
                  <div className="py-8 px-4 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.02]">
                    <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/50 mb-1">
                      Template sem suporte a imagem
                    </p>
                    <p className="text-xs text-white/30">
                      O template <span className="text-white/50">{currentTemplateMeta?.label}</span> não utiliza imagens.
                      Troque para outro template na aba &quot;Info&quot; se precisar de imagem.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Box */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[10px] text-white/60 leading-relaxed">
              <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
              As alterações são aplicadas em tempo real. Clique em{" "}
              <strong className="text-white/80">Salvar e Continuar</strong> quando estiver satisfeito.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between mt-8 pt-6 border-t border-white/10"
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-white/70 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          {onSkip && (
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/5"
            >
              Pular Edição
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleSave}
            className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Check className="w-4 h-4 mr-2" />
            Salvar e Continuar
          </Button>
        </div>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* AI Generation Dialog */}
      <AiGenerateDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        onGenerate={handleAiGenerate}
        isGenerating={isGeneratingImage}
      />

      {/* Fullscreen Dialog */}
      <FullscreenPreviewDialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        slides={slides}
        profile={profile}
        header={header}
        activeSlideIndex={activeSlideIndex}
        onSlideChange={setActiveSlideIndex}
      />
    </div>
  );
}

// ============================================================================
// FULLSCREEN PREVIEW DIALOG
// ============================================================================

interface FullscreenPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  slides: StudioSlide[];
  profile: StudioProfile;
  header: StudioHeader;
  activeSlideIndex: number;
  onSlideChange: (index: number) => void;
}

function FullscreenPreviewDialog({
  open,
  onClose,
  slides,
  profile,
  header,
  activeSlideIndex,
  onSlideChange,
}: FullscreenPreviewDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);

  const activeSlide = slides[activeSlideIndex];

  const previewHtml = useMemo(() => {
    if (!activeSlide) return null;

    const result = renderSlideToHtml({
      slide: activeSlide,
      profile,
      header,
      slideIndex: activeSlideIndex,
      totalSlides: slides.length,
    });

    return result.html;
  }, [activeSlide, profile, header, activeSlideIndex, slides.length]);

  // Calculate scale
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - 160;
      const availableHeight = rect.height - 100;

      const dimensions = DIMENSIONS["4:5"];
      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      setScale(Math.min(scaleX, scaleY, 1));
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activeSlideIndex > 0) {
        onSlideChange(activeSlideIndex - 1);
      } else if (e.key === "ArrowRight" && activeSlideIndex < slides.length - 1) {
        onSlideChange(activeSlideIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeSlideIndex, slides.length, onSlideChange, onClose]);

  if (!previewHtml) return null;

  const dimensions = DIMENSIONS["4:5"];
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-0">
        <DialogTitle className="sr-only">Preview em tela cheia</DialogTitle>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 w-10 h-10 text-white/60 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Navigation */}
        {activeSlideIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onSlideChange(activeSlideIndex - 1)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        {activeSlideIndex < slides.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onSlideChange(activeSlideIndex + 1)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}

        {/* Preview */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            <iframe
              src={dataUrl}
              title="Preview Fullscreen"
              className="border-0 pointer-events-none"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Slide Info */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80">
          <span className="font-medium">
            Slide {activeSlideIndex + 1} de {slides.length}
          </span>
          <span className="text-white/30">|</span>
          <span className="text-white/40 text-xs">← → navegar • ESC fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
