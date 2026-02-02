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
  const [activeTab, setActiveTab] = useState<"preview" | "colors" | "text">("preview");
  const [scale, setScale] = useState(0.3);
  const [autoScale, setAutoScale] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

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
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
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
