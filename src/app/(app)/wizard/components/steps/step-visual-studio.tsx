/**
 * Step: Visual Studio
 *
 * Unified visual editor for the Wizard that consolidates template selection,
 * image generation/upload, text editing, and color customization into a single step.
 *
 * This replaces the previous visual-editor + image-generation steps with a
 * more streamlined experience similar to the standalone Studio page.
 *
 * Key differences from step-visual-editor.tsx:
 * - Uses local state instead of global studio-store
 * - Always parses generatedContent directly (no mappedStudioContent dependency)
 * - Includes save to library functionality
 * - Simplified flow without skip option
 */

"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Type,
  Image as ImageIcon,
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
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  mapCarouselToStudio,
  mapGeneratedContentToStudio,
  type ContentMappingConfig,
  type MappedContent,
} from "@/lib/wizard-services/content-mapper";
import type { ZoryonCarousel, GeneratedContent } from "@/lib/wizard-services/types";
import type { PostType } from "@/db/schema";
import { ModularImageDialog } from "@/components/image-generator";

// ============================================================================
// TYPES
// ============================================================================

interface StepVisualStudioProps {
  wizardId: number;
  generatedContent: string;
  contentType: PostType;
  onComplete: (libraryItemId: number) => void;
  onBack: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
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

const AVAILABLE_TEMPLATES: { value: FigmaTemplate; label: string; description: string }[] = [
  { value: "01_CAPA", label: "Capa", description: "Slide de abertura com destaque" },
  { value: "201", label: "Bold Start", description: "Titulo em destaque" },
  { value: "202", label: "Standard", description: "Layout equilibrado" },
  { value: "203", label: "Swipe CTA", description: "Call-to-action com swipe" },
  { value: "DARK_MODE", label: "Dark Mode", description: "Fundo escuro premium" },
  { value: "WHITE_MODE", label: "White Mode", description: "Fundo claro minimalista" },
  { value: "TWITTER", label: "Twitter Style", description: "Estilo de tweet" },
  { value: "SUPER_HEADLINE", label: "Super Headline", description: "Apenas titulo impactante" },
];


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

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - 160;
      const availableHeight = rect.height - 100;

      const dimensions = DIMENSIONS["3:4"];
      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      setScale(Math.min(scaleX, scaleY, 1));
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [open]);

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

  const dimensions = DIMENSIONS["3:4"];
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-0">
        <DialogTitle className="sr-only">Preview em tela cheia</DialogTitle>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 w-10 h-10 text-white/60 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

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

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/80">
          <span className="font-medium">
            Slide {activeSlideIndex + 1} de {slides.length}
          </span>
          <span className="text-white/30">|</span>
          <span className="text-white/40 text-xs">setas para navegar / ESC fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepVisualStudio({
  wizardId,
  generatedContent,
  contentType,
  onComplete,
  onBack,
  className,
}: StepVisualStudioProps) {
  // Local state for editing (not using global studio-store)
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [profile, setProfile] = useState<StudioProfile>(DEFAULT_PROFILE);
  const [header, setHeader] = useState<StudioHeader>(DEFAULT_HEADER);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"template" | "colors" | "text" | "images">("template");
  const [scale, setScale] = useState(0.3);
  const [autoScale, setAutoScale] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Image generation state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [targetImageField, setTargetImageField] = useState<"imageUrl" | "backgroundImageUrl">("imageUrl");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSlide = slides[activeSlideIndex];

  // Initialize from generatedContent
  useEffect(() => {
    if (isInitialized) return;

    try {
      const parsed = JSON.parse(generatedContent);

      // Default mapping config
      const mappingConfig: Partial<ContentMappingConfig> = {
        contentTemplate: "202",
        uniformTemplate: false,
      };

      let mapped: MappedContent | null = null;

      // Check if it's a ZoryonCarousel structure (v4.2+)
      // ZoryonCarousel has: throughline, capa, slides
      if (parsed.throughline && parsed.capa && parsed.slides) {
        const carousel = parsed as ZoryonCarousel;
        mapped = mapCarouselToStudio(carousel, mappingConfig);

        console.log("[VisualStudio] Detected ZoryonCarousel format:", {
          throughline: carousel.throughline.substring(0, 50),
          slidesCount: carousel.slides.length,
        });
      }
      // Check if it's a GeneratedContent structure (legacy format)
      // GeneratedContent has: type, metadata, and optionally slides (carousel) or imagePrompt (image)
      else if (parsed.type && parsed.metadata) {
        const content = parsed as GeneratedContent;

        // Support carousel (has slides array) and image (has imagePrompt in metadata)
        if (content.type === "carousel" && content.slides && Array.isArray(content.slides)) {
          mapped = mapGeneratedContentToStudio(content, mappingConfig);

          console.log("[VisualStudio] Detected GeneratedContent carousel:", {
            type: content.type,
            slidesCount: content.slides.length,
          });
        } else if (content.type === "image") {
          // Image type: single image post with caption
          mapped = mapGeneratedContentToStudio(content, mappingConfig);

          console.log("[VisualStudio] Detected GeneratedContent image:", {
            type: content.type,
            hasImagePrompt: !!(content.metadata as any)?.imagePrompt,
          });
        } else {
          console.warn("[VisualStudio] Unsupported content type:", content.type);
          toast.error(`Tipo de conteudo nao suportado: ${content.type}`);
        }
      }
      // Unknown format
      else {
        console.warn("[VisualStudio] Unknown content format:", {
          hasType: !!parsed.type,
          hasThroughline: !!parsed.throughline,
          hasCapa: !!parsed.capa,
          hasSlides: !!parsed.slides,
          keys: Object.keys(parsed).slice(0, 10),
        });
        toast.error("Formato de conteudo nao reconhecido");
      }

      // Apply mapped content if successful
      if (mapped && mapped.slides.length > 0) {
        setSlides(mapped.slides);
        setProfile(mapped.profile);
        setHeader(mapped.header);
        setCaption(mapped.caption);
        setHashtags(mapped.hashtags);

        console.log("[VisualStudio] Content mapped successfully:", {
          slidesCount: mapped.slides.length,
        });
      } else if (mapped) {
        console.warn("[VisualStudio] Mapping returned no slides");
        toast.error("Nenhum slide encontrado no conteudo");
      }
    } catch (err) {
      console.error("[VisualStudio] Failed to parse content:", err);
      toast.error("Erro ao carregar conteudo");
    }

    setIsInitialized(true);
  }, [generatedContent, isInitialized]);

  // Auto-scale calculation
  useEffect(() => {
    if (!autoScale || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width - 40;
      const availableHeight = rect.height - 40;

      const dimensions = DIMENSIONS["3:4"];
      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      const newScale = Math.min(scaleX, scaleY, 0.5);
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
        index === 0 ? slide : { ...slide, template }
      )
    );
    toast.success("Template aplicado a todos os slides");
  }, []);

  // Check if current template supports images
  const currentTemplateSupportsImage = useMemo(() => {
    const metadata = activeSlide ? TEMPLATE_METADATA[activeSlide.template] : null;
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

      setSlides((prev) =>
        prev.map((slide, idx) =>
          idx === activeSlideIndex
            ? { ...slide, content: { ...slide.content, [field]: result.url } }
            : slide
        )
      );
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("[VisualStudio] Upload error:", error);
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
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem valida");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no maximo 5MB");
        return;
      }
      handleImageUpload(file, targetImageField);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleImageUpload, targetImageField]);

  // Handle AI image generation - receives URL from ModularImageDialog
  const handleAiGenerate = useCallback((url: string) => {
    setSlides((prev) =>
      prev.map((slide, idx) =>
        idx === activeSlideIndex
          ? { ...slide, content: { ...slide.content, [targetImageField]: url } }
          : slide
      )
    );
    setShowAiDialog(false);
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

  // Handle save to library
  const handleSaveToLibrary = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/wizard/${wizardId}/save-carousel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides,
          profile,
          header,
          caption,
          hashtags,
          contentType,
        }),
      });

      const result = await response.json().catch(() => ({}));

      // Handle different response statuses
      if (response.status === 409 && result.libraryItemId) {
        // Already saved - treat as success and redirect to existing item
        toast.info("Este conteudo ja foi salvo na biblioteca!");
        onComplete(result.libraryItemId);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || "Save failed");
      }

      toast.success("Carrossel salvo na biblioteca!");
      onComplete(result.libraryItemId);
    } catch (error) {
      console.error("[VisualStudio] Save error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const dimensions = DIMENSIONS["3:4"];
  const scaledWidth = dimensions.width * scale;
  const scaledHeight = dimensions.height * scale;

  // Loading state
  if (!isInitialized || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-white/40">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <p>Carregando editor visual...</p>
      </div>
    );
  }

  if (!activeSlide || !previewHtml) {
    return (
      <div className="flex items-center justify-center h-96 text-white/40">
        <p>Nenhum conteudo para visualizar</p>
      </div>
    );
  }

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;

  return (
    <div className={cn("w-full max-w-7xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4"
        >
          <LayoutTemplate className="w-7 h-7 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Visual Studio
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/60"
        >
          Finalize o design do seu carrossel escolhendo templates, cores e imagens
        </motion.p>
      </div>

      {/* Main Content - Split View */}
      <div className="flex gap-6 min-h-[600px]">
        {/* Editor Panel (40%) */}
        <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-[700px] pr-2">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg sticky top-0 z-10">
            {[
              { id: "template", label: "Template", icon: LayoutTemplate },
              { id: "images", label: "Imagens", icon: ImageIcon },
              { id: "text", label: "Texto", icon: Type },
              { id: "colors", label: "Cores", icon: Palette },
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
            {activeTab === "template" && (
              <motion.div
                key="template"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Template Grid */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70 flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                    Escolha o Template
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.value}
                        type="button"
                        onClick={() => updateSlideTemplate(tpl.value)}
                        title={tpl.description}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all",
                          activeSlide.template === tpl.value
                            ? "border-primary bg-primary/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <p className="text-sm font-medium truncate">{tpl.label}</p>
                        <p className="text-[10px] text-white/40 truncate">{tpl.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply to All Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  onClick={() => applyTemplateToAll(activeSlide.template)}
                  disabled={activeSlideIndex === 0}
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Aplicar a todos (exceto capa)
                </Button>

                {/* Current Template Info */}
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span className="text-white/70">Template atual:</span>
                    <span className="text-white font-medium">
                      {AVAILABLE_TEMPLATES.find(t => t.value === activeSlide.template)?.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50">
                    {AVAILABLE_TEMPLATES.find(t => t.value === activeSlide.template)?.description}
                  </p>
                </div>
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
                    {/* Background Image */}
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
                            className="flex-1 gap-1.5 h-8 text-xs bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAiDialog("backgroundImageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Gerar IA
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Main Image */}
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
                            className="flex-1 gap-1.5 h-8 text-xs bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAiDialog("imageUrl")}
                            disabled={isUploadingImage || isGeneratingImage}
                            className="flex-1 gap-1.5 h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Gerar IA
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-white/40">
                      Upload: JPG, PNG, WebP (max 5MB)
                    </p>
                  </>
                ) : (
                  <div className="py-8 px-4 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.02]">
                    <ImageIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/50 mb-1">
                      Template sem suporte a imagem
                    </p>
                    <p className="text-xs text-white/30">
                      Troque para outro template na aba Template
                    </p>
                  </div>
                )}
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
                    className="min-h-[100px] text-sm bg-white/5 border-white/10 resize-none"
                    placeholder="Texto principal do slide..."
                  />
                </div>

                {/* Texto 2 */}
                {activeSlide.content.texto2 !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">Texto Secundario</Label>
                    <Textarea
                      value={activeSlide.content.texto2 || ""}
                      onChange={(e) => updateSlideContent("texto2", e.target.value)}
                      className="min-h-[80px] text-sm bg-white/5 border-white/10 resize-none"
                      placeholder="Texto secundario..."
                    />
                  </div>
                )}

                {/* Texto 3 */}
                {activeSlide.content.texto3 !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">
                      Texto de Conexao
                      {activeSlide.content.texto3Bold && (
                        <span className="ml-1 text-primary">(Bold)</span>
                      )}
                    </Label>
                    <Input
                      value={activeSlide.content.texto3 || ""}
                      onChange={(e) => updateSlideContent("texto3", e.target.value)}
                      className="h-10 text-sm bg-white/5 border-white/10"
                      placeholder="Conexao com proximo slide..."
                    />
                  </div>
                )}
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
                {/* Background Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">Cor de Fundo</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {BACKGROUND_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("backgroundColor", color)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
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
                    className="h-9 text-xs bg-white/5 border-white/10"
                    placeholder="#FFFFFF"
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Label className="text-xs text-white/70">Cor do Texto</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEXT_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("textColor", color)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
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
                  <div className="flex gap-1.5 flex-wrap">
                    {PRIMARY_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => updateSlideStyle("primaryColor", color)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
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
                  onClick={() => {
                    applyStyleToAll(activeSlide.style);
                    toast.success("Cores aplicadas a todos os slides");
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Aplicar cores a todos
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Box */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[10px] text-white/60 leading-relaxed">
              <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
              As alteracoes sao aplicadas em tempo real. Navegue pelos slides e ajuste cada um conforme necessario.
            </p>
          </div>
        </div>

        {/* Canvas Panel (60%) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Container */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-center"
          >
            {/* Zoom Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setAutoScale(false);
                  setScale((s) => Math.min(s + 0.05, 0.6));
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
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/60">
              <span>Slide {activeSlideIndex + 1} de {slides.length}</span>
              <span className="text-white/30">|</span>
              <span className="text-white/40">1080 x 1440</span>
            </div>
          </div>

          {/* Slide Navigator */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-white/60 hover:text-white"
              onClick={goToPrevSlide}
              disabled={activeSlideIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex gap-2 overflow-x-auto max-w-[400px] py-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlideIndex(index)}
                  className={cn(
                    "min-w-[32px] h-8 rounded-md border transition-all flex items-center justify-center text-xs font-medium",
                    index === activeSlideIndex
                      ? "bg-primary border-primary text-black min-w-[48px]"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-white/60 hover:text-white"
              onClick={goToNextSlide}
              disabled={activeSlideIndex === slides.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
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

        <Button
          type="button"
          size="lg"
          onClick={handleSaveToLibrary}
          disabled={isSaving}
          className="min-w-[220px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Library className="w-4 h-4 mr-2" />
              Salvar na Biblioteca
            </>
          )}
        </Button>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* AI Generation Dialog - Modular */}
      <ModularImageDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        onGenerate={handleAiGenerate}
        title="Gerar Imagem com IA"
        description="Use o modo modular para controle preciso ou o modo simples para um prompt livre."
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
