/**
 * Video Thumbnail Generation with Nano Banana v4.3
 *
 * Component for generating YouTube thumbnails using Nano Banana format.
 * Supports reference images, style selection, and shows detailed specifications.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon,
  Upload,
  X,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Check,
  Palette,
  Eye,
  ChevronDown,
  ChevronUp,
  Hash,
  Type,
  FileImage,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  NanoBananaStyle,
  NanoBananaThumbnailOutput,
  GeneratedImage,
} from "@/lib/wizard-services/image-types";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoThumbnailGenerationProps {
  wizardId: number;
  thumbnailTitle: string; // From video script
  contextoTematico: string; // Thematic context
  wizardContext?: {
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
  };
  onThumbnailGenerated?: (imageUrl: string, promptUsed: string) => void;
  className?: string;
}

export interface VideoThumbnailInput {
  thumbnailTitle: string;
  estilo: NanoBananaStyle;
  contextoTematico: string;
  expressao?: string;
  referenciaImagem1?: string;
  referenciaImagem2?: string;
  variacaoIndex?: number; // For generating variations
}

// ============================================================================
// NANO BANANA STYLES
// ============================================================================

const NANO_BANANA_STYLES: Record<
  NanoBananaStyle,
  { label: string; description: string; colors: string; icon: string }
> = {
  profissional: {
    label: "Profissional",
    description: "Clean business aesthetic com cores sóbrias",
    colors: "Navy, White, Gold",
    icon: "💼",
  },
  minimalista: {
    label: "Minimalista",
    description: "Clean, simple, com espaço negativo",
    colors: "Black, White, Accent",
    icon: "◻️",
  },
  moderno: {
    label: "Moderno",
    description: "Vibrant, bold, contemporary",
    colors: "Bright gradients",
    icon: "🔷",
  },
  energético: {
    label: "Energético",
    description: "High contrast, punchy, dynamic",
    colors: "Orange, Yellow, Red",
    icon: "⚡",
  },
  educacional: {
    label: "Educacional",
    description: "Friendly, approachable, clear",
    colors: "Blue, Green, White",
    icon: "📚",
  },
  provocativo: {
    label: "Provocativo",
    description: "Bold, dramatic, intense",
    colors: "Red, Black, White",
    icon: "🔥",
  },
  inspirador: {
    label: "Inspirador",
    description: "Warm, uplifting, hopeful",
    colors: "Gold, Orange, Cream",
    icon: "✨",
  },
  tech: {
    label: "Tech",
    description: "Futuristic, sleek, modern",
    colors: "Cyan, Purple, Dark",
    icon: "🚀",
  },
};

// ============================================================================
// STYLE SELECTOR COMPONENT
// ============================================================================

interface StyleSelectorProps {
  selectedStyle: NanoBananaStyle;
  onSelect: (style: NanoBananaStyle) => void;
}

function StyleSelector({ selectedStyle, onSelect }: StyleSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Estilo Nano Banana
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
            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(NANO_BANANA_STYLES) as NanoBananaStyle[]).map(
                (style) => {
                  const styleInfo = NANO_BANANA_STYLES[style];
                  const isSelected = selectedStyle === style;

                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => onSelect(style)}
                      className={cn(
                        "relative p-3 rounded-lg border-2 transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-2xl mb-1">{styleInfo.icon}</div>
                      <p className="text-xs font-medium text-white">
                        {styleInfo.label}
                      </p>
                      <p className="text-[10px] text-white/50 line-clamp-2 mt-1">
                        {styleInfo.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// REFERENCE IMAGE UPLOAD COMPONENT
// ============================================================================

interface ReferenceImageUploadProps {
  label: string;
  description: string;
  imageUrl?: string;
  onChange: (url: string | undefined) => void;
  icon?: React.ReactNode;
}

function ReferenceImageUpload({
  label,
  description,
  imageUrl,
  onChange,
  icon,
}: ReferenceImageUploadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState(imageUrl || "");

  const handleSave = () => {
    onChange(inputValue.trim() || undefined);
    setIsExpanded(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange(undefined);
    setIsExpanded(false);
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon || <FileImage className="w-4 h-4 text-primary" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{label}</p>
            {imageUrl && (
              <p className="text-xs text-primary/60">✓ Imagem definida</p>
            )}
          </div>
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
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-3">
              <p className="text-xs text-white/60">{description}</p>

              {/* Image Preview */}
              {imageUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-white/[0.02] border border-white/10">
                  <img
                    src={imageUrl}
                    alt={label}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Cole a URL da imagem aqui..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSave}
                    size="sm"
                    className="flex-1"
                    disabled={!inputValue.trim()}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClear}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Upload Instructions */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-white/40">
                  💡 Cole uma URL de imagem (ex: do Google Drive, Dropbox, ou
                  hospedagem de imagens)
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// SPECIFICATIONS DISPLAY COMPONENT
// ============================================================================

interface SpecificationsDisplayProps {
  especificacoes?: NanoBananaThumbnailOutput["especificacoes"];
  variacoes?: string[];
  onVariationClick?: (index: number) => void;
  gerandoVariacao?: number;
}

function SpecificationsDisplay({
  especificacoes,
  variacoes = [],
  onVariationClick,
  gerandoVariacao,
}: SpecificationsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!especificacoes) return null;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          Especificações Nano Banana
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
            <div className="p-4 space-y-3">
              {/* Texto */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
                <div className="flex-1">
                  <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                    <Type className="w-3 h-3" />
                    Texto na Thumbnail
                  </p>
                  <p className="text-sm font-bold text-white">{especificacoes.texto}</p>
                </div>
              </div>

              {/* Cores */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-white/50 mb-2">🎨 Cor do Texto</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: especificacoes.cor_texto }}
                    />
                    <code className="text-xs text-white/80">
                      {especificacoes.cor_texto}
                    </code>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-white/50 mb-2">🖼️ Cor do Fundo</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: especificacoes.cor_fundo }}
                    />
                    <code className="text-xs text-white/80">
                      {especificacoes.cor_fundo}
                    </code>
                  </div>
                </div>
              </div>

              {/* Posição e Expressão */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-white/50 mb-1">📍 Posição</p>
                  <p className="text-xs text-white/80 capitalize">
                    {especificacoes.posicao_texto === "terco_superior"
                      ? "Terço Superior"
                      : especificacoes.posicao_texto === "terco_inferior"
                      ? "Terço Inferior"
                      : "Centro"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-white/50 mb-1">😶 Expressão</p>
                  <p className="text-xs text-white/80">
                    {especificacoes.expressao}
                  </p>
                </div>
              </div>

              {/* Variações */}
              {variacoes && variacoes.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-primary/80 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Variações Alternativas
                  </p>
                  <div className="space-y-2">
                    {variacoes.map((variacao, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => onVariationClick?.(index)}
                        disabled={gerandoVariacao === index}
                        className="w-full p-2 rounded-lg bg-white/[0.02] border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-white/80">{variacao}</p>
                          {gerandoVariacao === index ? (
                            <Loader2 className="w-3 h-3 text-primary animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3 text-white/40" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// THUMBNAIL PREVIEW COMPONENT
// ============================================================================

interface ThumbnailPreviewProps {
  imageUrl?: string;
  especificacoes?: NanoBananaThumbnailOutput["especificacoes"];
  isGenerating?: boolean;
  onDownload?: () => void;
}

function ThumbnailPreview({
  imageUrl,
  especificacoes,
  isGenerating,
  onDownload,
}: ThumbnailPreviewProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Preview (16:9)
        </p>
        <span className="text-xs text-white/40">1280x720px</span>
      </div>

      {/* Preview Content */}
      <div className="p-4">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-white/[0.02] border border-white/10">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-white/60">Gerando thumbnail...</p>
            </div>
          ) : imageUrl && !imageError ? (
            <>
              <img
                src={imageUrl}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {/* Action Buttons Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onDownload && (
                  <Button
                    type="button"
                    onClick={onDownload}
                    size="sm"
                    variant="secondary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {imageError ? (
                <>
                  <AlertCircle className="w-12 h-12 text-red-500/50" />
                  <p className="text-sm text-white/40">Erro ao carregar imagem</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-white/20" />
                  <p className="text-sm text-white/40">
                    A thumbnail aparecerá aqui
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Specifications (if available) */}
        {especificacoes && (
          <SpecificationsDisplay especificacoes={especificacoes} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VideoThumbnailGeneration({
  wizardId,
  thumbnailTitle,
  contextoTematico,
  wizardContext,
  onThumbnailGenerated,
  className,
}: VideoThumbnailGenerationProps) {
  const [estilo, setEstilo] = useState<NanoBananaStyle>("profissional");
  const [referenciaImagem1, setReferenciaImagem1] = useState<string>();
  const [referenciaImagem2, setReferenciaImagem2] = useState<string>();
  const [expressao, setExpressao] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedValue] = useState<GeneratedImage | null>(
    null
  );
  const [especificacoes, setEspecificacoes] =
    useState<NanoBananaThumbnailOutput["especificacoes"]>();
  const [variacoes, setVariacoes] = useState<string[]>();
  const [gerandoVariacao, setGerandoVariacao] = useState<number>();

  // Handle generate thumbnail via API
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratedValue(null);
    setEspecificacoes(undefined);
    setVariacoes(undefined);

    try {
      const response = await fetch(
        `/api/wizard/${wizardId}/generate-thumbnail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            thumbnailTitle,
            estilo,
            contextoTematico,
            expressao,
            referenciaImagem1,
            referenciaImagem2,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate thumbnail");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setGeneratedValue({
          id: `thumb-${Date.now()}`,
          slideNumber: 0,
          method: "ai",
          model: data.data.model,
          imageUrl: data.data.imageUrl,
          thumbnailUrl: data.data.thumbnailUrl,
          promptUsed: data.data.promptUsed,
          config: {
            method: "ai",
            aiOptions: {
              model: data.data.model,
              color: "personalizado",
              style: estilo,
            },
          },
          createdAt: new Date(),
        });

        // Set specifications if available
        if (data.data.especificacoes) {
          setEspecificacoes(data.data.especificacoes);
        }

        // Set variations if available
        if (data.data.variacoes) {
          setVariacoes(data.data.variacoes);
        }

        // Notify parent component
        if (onThumbnailGenerated) {
          onThumbnailGenerated(data.data.imageUrl, data.data.promptUsed);
        }
      }
    } catch (error) {
      console.error("[THUMBNAIL-GEN] Error:", error);
      alert(
        `Erro ao gerar thumbnail: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    wizardId,
    thumbnailTitle,
    estilo,
    contextoTematico,
    expressao,
    referenciaImagem1,
    referenciaImagem2,
    onThumbnailGenerated,
  ]);

  // Handle variation click via API
  const handleVariationClick = useCallback(
    async (index: number) => {
      setGerandoVariacao(index);
      setIsGenerating(true);

      try {
        const response = await fetch(
          `/api/wizard/${wizardId}/generate-thumbnail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              thumbnailTitle,
              estilo,
              contextoTematico,
              expressao,
              referenciaImagem1,
              referenciaImagem2,
              variacaoIndex: index,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate variation");
        }

        const data = await response.json();

        if (data.success && data.data) {
          setGeneratedValue({
            id: `thumb-${Date.now()}`,
            slideNumber: 0,
            method: "ai",
            model: data.data.model,
            imageUrl: data.data.imageUrl,
            thumbnailUrl: data.data.thumbnailUrl,
            promptUsed: data.data.promptUsed,
            config: {
              method: "ai",
              aiOptions: {
                model: data.data.model,
                color: "personalizado",
                style: estilo,
              },
            },
            createdAt: new Date(),
          });

          // Notify parent component
          if (onThumbnailGenerated) {
            onThumbnailGenerated(data.data.imageUrl, data.data.promptUsed);
          }
        }
      } catch (error) {
        console.error("[THUMBNAIL-GEN] Error generating variation:", error);
        alert(
          `Erro ao gerar variação: ${error instanceof Error ? error.message : "Erro desconhecido"}`
        );
      } finally {
        setGerandoVariacao(undefined);
        setIsGenerating(false);
      }
    },
    [
      wizardId,
      thumbnailTitle,
      estilo,
      contextoTematico,
      expressao,
      referenciaImagem1,
      referenciaImagem2,
      onThumbnailGenerated,
    ]
  );

  // Handle download
  const handleDownload = useCallback(() => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage.imageUrl;
    link.download = `thumbnail-${Date.now()}.png`;
    link.click();
  }, [generatedImage]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium"
        >
          <Palette className="w-4 h-4" />
          Thumbnail Nano Banana v4.3
        </motion.div>
        <h3 className="text-lg font-semibold text-white">
          Gerar Thumbnail para YouTube
        </h3>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          Formato Nano Banana de alto CTR com referências visuais e
          especificações detalhadas
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left Column - Configuration */}
        <div className="space-y-4">
          {/* Style Selector */}
          <StyleSelector selectedStyle={estilo} onSelect={setEstilo} />

          {/* Reference Images */}
          <div className="space-y-3">
            <ReferenceImageUpload
              label="Foto do Usuário (Pessoa)"
              description="Upload uma foto sua para ser a pessoa na thumbnail. Use link público do Google Drive, Dropbox, etc."
              imageUrl={referenciaImagem1}
              onChange={setReferenciaImagem1}
              icon="👤"
            />
            <ReferenceImageUpload
              label="Referência de Estilo"
              description="Upload uma thumbnail de referência para copiar o estilo visual (cores, composição, etc)."
              imageUrl={referenciaImagem2}
              onChange={setReferenciaImagem2}
              icon="🎨"
            />
          </div>

          {/* Expression (Optional) */}
          <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            <label className="text-sm text-white/80 mb-2 block flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Expressão Facial (opcional)
            </label>
            <input
              type="text"
              value={expressao || ""}
              onChange={(e) => setExpressao(e.target.value)}
              placeholder="Ex: confiante, surpreso, sério..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-white/40 mt-2">
              💡 Deixe em branco para a IA sugerir baseado no tema
            </p>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-4">
          <ThumbnailPreview
            imageUrl={generatedImage?.imageUrl}
            especificacoes={especificacoes}
            isGenerating={isGenerating}
            onDownload={handleDownload}
          />
        </div>
      </div>

      {/* Generate Button */}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Gerando thumbnail...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Thumbnail
          </>
        )}
      </Button>

      {/* Specifications Display (if generated) */}
      {especificacoes && (
        <SpecificationsDisplay
          especificacoes={especificacoes}
          variacoes={variacoes}
          onVariationClick={handleVariationClick}
          gerandoVariacao={gerandoVariacao}
        />
      )}
    </div>
  );
}
