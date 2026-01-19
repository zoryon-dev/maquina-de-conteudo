/**
 * Step 5 - Image Generation
 *
 * Allows users to generate images for their content slides.
 * Supports AI generation via OpenRouter and HTML templates via ScreenshotOne.
 * Instagram standard size: 1080x1350px (4:5 aspect ratio).
 *
 * Displays generated content in a horizontal slider with editable cards.
 */

"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  Type,
  AlignLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageGenerationOptions } from "../shared/image-generation-options";
import type {
  ImageGenerationConfig,
  GeneratedImage,
} from "@/lib/wizard-services/client";
import { INSTAGRAM_DIMENSIONS } from "@/lib/wizard-services/client";
import type { PostType } from "@/db/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedSlide {
  title?: string;
  content: string;
  imagePrompt?: string;
}

export interface GeneratedContent {
  type: PostType;
  slides: GeneratedSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
  metadata?: {
    narrative?: string;
    model?: string;
    generatedAt?: string;
  };
}

export interface Step5ImageGenerationProps {
  slideTitle?: string;
  slideContent?: string | GeneratedContent; // Can be JSON string or parsed object
  slideNumber: number;
  totalSlides?: number;
  initialConfig?: ImageGenerationConfig;
  generatedImages?: GeneratedImage[];
  isGenerating?: boolean;
  onGenerate: (config: ImageGenerationConfig) => void;
  onRegenerate?: (imageId: string) => void;
  onSelect?: (image: GeneratedImage) => void;
  onSubmit: () => void;
  onContentChange?: (content: GeneratedContent) => void; // New: callback when content is edited
  className?: string;
}

interface ImageCardProps {
  image: GeneratedImage;
  isSelected?: boolean;
  onSelect: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

// ============================================================================
// EDITABLE FIELD COMPONENT
// ============================================================================

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

function EditableField({
  value,
  onChange,
  multiline = false,
  label,
  placeholder,
  className,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className={cn("group relative", className)}>
      {label && !isEditing && (
        <p className="text-xs text-white/40 mb-1">{label}</p>
      )}
      {isEditing ? (
        <div className="flex items-start gap-2">
          {multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditValue(value);
                  setIsEditing(false);
                }
              }}
              placeholder={placeholder}
              className="flex-1 bg-white/[0.02] border border-primary/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-white/[0.02] border border-primary/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              autoFocus
            />
          )}
          <button
            type="button"
            onClick={handleSave}
            className="p-2 rounded-lg bg-primary text-white hover:bg-primary/80"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-pointer hover:bg-white/[0.02] rounded-lg p-2 -m-2 transition-colors"
        >
          <p className="text-sm text-white/80 break-words">{value || placeholder}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white/10 hover:bg-white/20"
          >
            <Edit3 className="w-3 h-3 text-white/60" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SLIDE CARD COMPONENT (for Slider)
// ============================================================================

interface SlideCardProps {
  slide: GeneratedSlide;
  slideNumber: number;
  totalSlides: number;
  onUpdate: (slide: GeneratedSlide) => void;
}

function SlideCard({ slide, slideNumber, totalSlides, onUpdate }: SlideCardProps) {
  const updateSlide = (field: keyof GeneratedSlide, value: string) => {
    onUpdate({ ...slide, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-shrink-0 w-80 h-[500px] rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 flex flex-col overflow-hidden"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-primary/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            {slideNumber}
          </div>
          <span className="text-xs text-white/60">
            {totalSlides > 1 ? `${slideNumber} / ${totalSlides}` : "Slide único"}
          </span>
        </div>
        <Edit3 className="w-4 h-4 text-white/40" />
      </div>

      {/* Card Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Title Field */}
        <div>
          <label className="text-xs text-primary/80 mb-2 flex items-center gap-1">
            <Type className="w-3 h-3" />
            Título
          </label>
          <div
            className="min-h-[32px] px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-white focus-within:border-primary/50 focus-within:bg-white/[0.04] transition-colors cursor-text"
            onClick={(e) => {
              const input = e.currentTarget.querySelector('textarea');
              input?.focus();
            }}
          >
            <textarea
              value={slide.title || ""}
              onChange={(e) => updateSlide("title", e.target.value)}
              placeholder="Título do slide..."
              className="w-full bg-transparent border-none text-white text-sm focus:outline-none resize-none p-0"
              rows={2}
            />
          </div>
        </div>

        {/* Content Field */}
        <div>
          <label className="text-xs text-primary/80 mb-2 flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />
            Conteúdo
          </label>
          <div
            className="min-h-[120px] px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-white focus-within:border-primary/50 focus-within:bg-white/[0.04] transition-colors cursor-text"
            onClick={(e) => {
              const input = e.currentTarget.querySelector('textarea');
              input?.focus();
            }}
          >
            <textarea
              value={slide.content}
              onChange={(e) => updateSlide("content", e.target.value)}
              placeholder="Conteúdo do slide..."
              className="w-full bg-transparent border-none text-white text-sm focus:outline-none resize-none p-0"
              rows={8}
            />
          </div>
        </div>

        {/* Image Prompt (if exists) */}
        {slide.imagePrompt && (
          <div className="pt-3 border-t border-white/5">
            <p className="text-xs text-white/40 mb-1">📸 Prompt de Imagem:</p>
            <p className="text-xs text-white/50 italic line-clamp-2">{slide.imagePrompt}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// CAPTION & HASHTAGS EDITOR
// ============================================================================

interface CaptionEditorProps {
  caption?: string;
  hashtags?: string[];
  cta?: string;
  onUpdate: (field: "caption" | "hashtags" | "cta", value: string | string[]) => void;
}

function CaptionEditor({ caption, hashtags = [], cta, onUpdate }: CaptionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleHashtagsChange = (value: string) => {
    // Parse hashtags from comma or space separated string
    const tags = value
      .split(/[,,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    onUpdate("hashtags", tags);
  };

  const hashtagsString = hashtags.join(" ");

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Caption & Hashtags
        </p>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Caption */}
              <div>
                <label className="text-xs text-primary/80 mb-2 block">Caption</label>
                <EditableField
                  value={caption || ""}
                  onChange={(value) => onUpdate("caption", value)}
                  multiline
                  placeholder="Adicione uma caption para o post..."
                />
              </div>

              {/* CTA */}
              {cta && (
                <div>
                  <label className="text-xs text-primary/80 mb-2 block">Call-to-Action</label>
                  <EditableField
                    value={cta}
                    onChange={(value) => onUpdate("cta", value)}
                    placeholder="CTA do post..."
                  />
                </div>
              )}

              {/* Hashtags */}
              <div>
                <label className="text-xs text-primary/80 mb-2 block">Hashtags</label>
                <EditableField
                  value={hashtagsString}
                  onChange={handleHashtagsChange}
                  placeholder="#exemplo #hashtag"
                />
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs text-primary/80 bg-primary/10 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// IMAGE CARD COMPONENT
// ============================================================================

function ImageCard({ image, isSelected, onSelect, onRegenerate, isRegenerating }: ImageCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-white/10 hover:border-white/20"
      )}
      onClick={onSelect}
    >
      {/* Image Preview */}
      <div className="relative aspect-[4/5] bg-white/[0.02]">
        {!imageError ? (
          <img
            src={image.thumbnailUrl || image.imageUrl}
            alt={`Slide ${image.slideNumber}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* Selected Badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-primary text-white text-xs font-medium">
            Selecionado
          </div>
        )}

        {/* Method Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-xs">
          {image.method === "ai" ? "IA" : "Template"}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onRegenerate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={isRegenerating}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Regenerar imagem"
            >
              {isRegenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
          )}
          <a
            href={image.imageUrl}
            download={`slide-${image.slideNumber}.png`}
            onClick={(e) => e.stopPropagation()}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Baixar imagem"
          >
            <Download className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Image Info */}
      <div className="p-3 bg-white/[0.02] border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">
            {image.method === "ai" ? image.model?.split("/").pop() : image.template}
          </span>
          <span className="text-xs text-white/40">
            {INSTAGRAM_DIMENSIONS.width}x{INSTAGRAM_DIMENSIONS.height}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Step5ImageGeneration({
  slideTitle,
  slideContent,
  slideNumber,
  totalSlides = 1,
  initialConfig,
  generatedImages = [],
  isGenerating = false,
  onGenerate,
  onRegenerate,
  onSelect,
  onSubmit,
  onContentChange,
  className,
}: Step5ImageGenerationProps) {
  const [config, setConfig] = useState<ImageGenerationConfig>(
    initialConfig || {
      method: "html-template",
      htmlOptions: {
        template: "gradiente-solid",
        primaryColor: "#a3e635",
        secondaryColor: "#6366f1",
      },
    }
  );

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Parse generated content from slideContent
  const parsedContent = useMemo((): GeneratedContent | null => {
    if (!slideContent) return null;

    // If already parsed as object
    if (typeof slideContent === "object" && "slides" in slideContent) {
      return slideContent as GeneratedContent;
    }

    // If string, try to parse as JSON
    if (typeof slideContent === "string") {
      try {
        const parsed = JSON.parse(slideContent);
        if (parsed.slides && Array.isArray(parsed.slides)) {
          return parsed as GeneratedContent;
        }
      } catch {
        // Not valid JSON, treat as plain text content
        return {
          type: "text",
          slides: [{ content: slideContent }],
        };
      }
    }

    return null;
  }, [slideContent]);

  // Local state for editable content
  const [editableContent, setEditableContent] = useState<GeneratedContent | null>(parsedContent);

  // Update local content when parsed content changes (initial load only)
  useEffect(() => {
    if (parsedContent) {
      setEditableContent(parsedContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideContent]); // Only depend on the raw string prop, not the parsed object

  const selectedImage = generatedImages.find((img) => img.id === selectedImageId);

  // Handle slide update - also notify parent
  const handleSlideUpdate = useCallback((slideIndex: number, updatedSlide: GeneratedSlide) => {
    setEditableContent((prev) => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      newSlides[slideIndex] = updatedSlide;
      const updated = { ...prev, slides: newSlides };
      // Notify parent of the change
      if (onContentChange) {
        onContentChange(updated);
      }
      return updated;
    });
  }, [onContentChange]);

  // Handle caption/hashtags update - also notify parent
  const handleCaptionUpdate = useCallback((
    field: "caption" | "hashtags" | "cta",
    value: string | string[]
  ) => {
    setEditableContent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Notify parent of the change
      if (onContentChange) {
        onContentChange(updated);
      }
      return updated;
    });
  }, [onContentChange]);

  // Handle image selection
  const handleSelectImage = useCallback((image: GeneratedImage) => {
    setSelectedImageId(image.id);
    onSelect?.(image);
  }, [onSelect]);

  // Handle generate
  const handleGenerate = useCallback(() => {
    onGenerate(config);
  }, [config, onGenerate]);

  // Handle regenerate
  const handleRegenerate = useCallback((imageId: string) => {
    onRegenerate?.(imageId);
  }, [onRegenerate]);

  const isValid = config.method === "ai"
    ? !!config.aiOptions?.model && !!config.aiOptions?.color && !!config.aiOptions?.style
    : !!config.htmlOptions?.template && !!config.htmlOptions?.primaryColor;

  const contentTypeLabel = {
    text: "Post de Texto",
    image: "Post de Imagem",
    carousel: "Carrossel",
    video: "Vídeo",
    story: "Story",
  }[editableContent?.type || "text"];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium"
        >
          <ImageIcon className="w-4 h-4" />
          {editableContent?.slides.length
            ? `${editableContent.slides.length} Slide${editableContent.slides.length > 1 ? "s" : ""}`
            : `Slide ${slideNumber} de ${totalSlides}`}
        </motion.div>
        <h2 className="text-xl font-semibold text-white">
          Revise e edite seu conteúdo
        </h2>
        <p className="text-sm text-white/60">
          {contentTypeLabel} • Edite os textos antes de gerar a imagem (1080x1350px)
        </p>
      </div>

      {/* Editable Content Section - Slider */}
      {editableContent && (
        <div className="space-y-4">
          {/* Content Type Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 uppercase tracking-wider">
              Conteúdo Gerado
            </span>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              {contentTypeLabel}
            </span>
          </div>

          {/* Horizontal Slider */}
          <div className="relative">
            {/* Slider Navigation */}
            {editableContent.slides.length > 2 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    sliderRef.current?.scrollBy({ left: -340, behavior: "smooth" });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center border border-primary/30 backdrop-blur-sm transition-colors"
                >
                  <ChevronDown className="w-5 h-5 -rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sliderRef.current?.scrollBy({ left: 340, behavior: "smooth" });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center border border-primary/30 backdrop-blur-sm transition-colors"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </button>
              </>
            )}

            {/* Slider Container */}
            <div
              ref={sliderRef}
              className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {editableContent.slides.map((slide, index) => (
                <SlideCard
                  key={index}
                  slide={slide}
                  slideNumber={index + 1}
                  totalSlides={editableContent.slides.length}
                  onUpdate={(updatedSlide) => handleSlideUpdate(index, updatedSlide)}
                />
              ))}
            </div>

            {/* Slide Indicator */}
            <div className="flex justify-center gap-2">
              {editableContent.slides.map((_, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full bg-white/20 transition-colors"
                />
              ))}
            </div>
          </div>

          {/* Caption & Hashtags Editor */}
          <CaptionEditor
            caption={editableContent.caption}
            hashtags={editableContent.hashtags}
            cta={editableContent.cta}
            onUpdate={handleCaptionUpdate}
          />
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/40 uppercase tracking-wider">Geração de Imagem</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Imagens Geradas ({generatedImages.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {generatedImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedImageId === image.id}
                onSelect={() => handleSelectImage(image)}
                onRegenerate={onRegenerate ? () => handleRegenerate(image.id) : undefined}
                isRegenerating={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generation Options */}
      <ImageGenerationOptions
        config={config}
        onChange={setConfig}
      />

      {/* Generate Button */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando imagem...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Imagem
            </>
          )}
        </Button>

        {/* Submit Button (if image is selected) */}
        {selectedImage && (
          <Button
            type="button"
            onClick={onSubmit}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Continuar com esta imagem
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {/* Skip image generation button */}
        {!selectedImage && (
          <Button
            type="button"
            onClick={onSubmit}
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/5"
            size="sm"
          >
            Pular geração de imagem
          </Button>
        )}

        {!isValid && (
          <p className="text-xs text-center text-white/40">
            Preencha todas as opções obrigatórias para gerar a imagem
          </p>
        )}
      </div>

      {/* Selected Image Summary */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-primary font-medium mb-1">
                  Imagem Selecionada
                </p>
                <p className="text-sm text-white/80">
                  {selectedImage.method === "ai"
                    ? `Gerado por IA (${selectedImage.model?.split("/").pop()})`
                    : `Template HTML (${selectedImage.template})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImageId(null)}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Alterar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
