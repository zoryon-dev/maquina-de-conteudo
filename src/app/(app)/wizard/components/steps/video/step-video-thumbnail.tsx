/**
 * Step 5 - Video Thumbnail Configuration
 *
 * Final step: Configure and generate video thumbnail using Nano Banana v4.3 format.
 * After submission, triggers background processing and shows modal.
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Sparkles,
  Loader2,
  ImageIcon,
  Eye,
  Palette,
  Wand2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sliders,
  Layers,
  Image as ImageIcon2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NanoBananaStyle } from "@/lib/wizard-services/image-types";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";

// ============================================================================
// TYPES
// ============================================================================

export interface StepVideoThumbnailProps {
  wizardId: number;
  selectedTitle: VideoTitleOption;
  theme?: string;
  generatedScript?: string;
  onSubmit: (config: {
    estilo: string;
    expressao?: string;
    referenciaImagem1?: string;
    referenciaImagem2?: string;
    instrucoesCustomizadas?: string;
    tipoFundo?: string;
    corTexto?: string;
    posicaoTexto?: string;
    tipoIluminacao?: string;
  }) => void;
  className?: string;
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
// SUBCOMPONENTS
// ============================================================================

interface ImageUploadProps {
  label: string;
  description: string;
  image: string | null;
  onChange: (image: string | null) => void;
  onRemove: () => void;
  accept?: string;
}

function ImageUpload({
  label,
  description,
  image,
  onChange,
  onRemove,
  accept = "image/*",
}: ImageUploadProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onChange(base64);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-white mb-1">{label}</p>
          <p className="text-xs text-white/40">{description}</p>
        </div>
        {image && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {image ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-video rounded-lg overflow-hidden bg-black/50"
          >
            <img
              src={image}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all">
              <input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
              />
              <ImageIcon className="w-8 h-8 text-white/40 mb-2" />
              <p className="text-sm text-white/60 text-center">
                Clique para fazer upload
              </p>
              <p className="text-xs text-white/40 mt-1">JPG, PNG ou WebP</p>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </p>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepVideoThumbnail({
  wizardId,
  selectedTitle,
  theme,
  generatedScript,
  onSubmit,
  className,
}: StepVideoThumbnailProps) {
  const [estilo, setEstilo] = useState<NanoBananaStyle>("profissional");
  const [expressao, setExpressao] = useState("");
  const [referenciaImagem1, setReferenciaImagem1] = useState<string | null>(null);
  const [referenciaImagem2, setReferenciaImagem2] = useState<string | null>(null);

  // Advanced configuration fields
  const [instrucoesCustomizadas, setInstrucoesCustomizadas] = useState("");
  const [tipoFundo, setTipoFundo] = useState<string>("");
  const [corTexto, setCorTexto] = useState<string>("");
  const [posicaoTexto, setPosicaoTexto] = useState<string>("");
  const [tipoIluminacao, setTipoIluminacao] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expression suggestions based on tribal angle
  const expressionSuggestions = [
    "Confiante, olhar direto",
    "Sério, expressão pensativa",
    "Sorrindo, acolhedor",
    "Surpreso, boca entreaberta",
    "Determinado, focado",
    "Curioso, inclinado",
  ];

  // Suggestions for advanced fields
  const backgroundTypeSuggestions = [
    "Solid color",
    "Gradient",
    "Blurred background",
    "Studio backdrop",
    "Office environment",
    "Outdoor scene",
    "Abstract",
    "Minimal",
  ];

  const textColorSuggestions = [
    "White",
    "Yellow",
    "Red",
    "Green",
    "Blue",
    "Black with white outline",
    "Multi-color gradient",
  ];

  const textPositionSuggestions = [
    "Center overlay",
    "Top left",
    "Top right",
    "Bottom left",
    "Bottom right",
    "Above subject",
    "Below subject",
  ];

  const lightingTypeSuggestions = [
    "Studio lighting",
    "Natural light",
    "Dramatic side light",
    "Soft diffused light",
    "High contrast",
    "Backlit",
    "Ring light",
  ];

  const handleSubmit = () => {
    setIsSubmitting(true);

    onSubmit({
      estilo,
      expressao: expressao || undefined,
      referenciaImagem1: referenciaImagem1 || undefined,
      referenciaImagem2: referenciaImagem2 || undefined,
      instrucoesCustomizadas: instrucoesCustomizadas || undefined,
      tipoFundo: tipoFundo || undefined,
      corTexto: corTexto || undefined,
      posicaoTexto: posicaoTexto || undefined,
      tipoIluminacao: tipoIluminacao || undefined,
    });
  };

  return (
    <div className={cn("w-full max-w-5xl mx-auto px-4 py-8", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6"
        >
          <ImageIcon2 className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Configure sua Thumbnail
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          Último passo! Configure o estilo visual da thumbnail e aguarde o processamento.
          Você será redirecionado para a Biblioteca.
        </motion.p>
      </div>

      {/* Selected Title Display */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6">
        <p className="text-xs text-primary/80 mb-1">TÍTULO SELECIONADO</p>
        <p className="text-lg font-bold text-white">{selectedTitle.title}</p>
        <p className="text-xs text-white/60 mt-1">Hook Factor: {selectedTitle.hook_factor}/100</p>
      </div>

      {/* Configuration Sections */}
      <div className="space-y-4">
        {/* Nano Banana Style Selector */}
        <CollapsibleSection title="Estilo Visual" icon={Palette} defaultOpen={true}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(NANO_BANANA_STYLES).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setEstilo(key as NanoBananaStyle)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  estilo === key
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <p className="text-2xl mb-2">{value.icon}</p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    estilo === key ? "text-white" : "text-white/70"
                  )}
                >
                  {value.label}
                </p>
                <p className="text-[10px] text-white/40 mt-1">
                  {value.colors}
                </p>
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Expression Input */}
        <CollapsibleSection title="Expressão Facial" icon={Wand2} defaultOpen={true}>
          <div className="space-y-3">
            <input
              type="text"
              value={expressao}
              onChange={(e) => setExpressao(e.target.value)}
              placeholder="Ex: Confiante, olhar direto, sorrindo levemente"
              className={cn(
                "w-full h-12 rounded-xl border",
                "bg-white/[0.02] border-white/10",
                "text-white placeholder:text-white/40",
                "focus:border-primary/50 focus:outline-none",
                "px-4 text-sm"
              )}
            />
            <div className="flex flex-wrap gap-2">
              {expressionSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setExpressao(suggestion)}
                  className="text-xs px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Advanced Configuration */}
        <CollapsibleSection
          title="Configurações Avançadas"
          icon={Sliders}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Custom Instructions */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">
                Instruções Customizadas (Opcional)
              </label>
              <textarea
                value={instrucoesCustomizadas}
                onChange={(e) => setInstrucoesCustomizadas(e.target.value)}
                placeholder="Ex: Adicionar elementos tech, incluir laptop no fundo, usar fontes modernas..."
                className={cn(
                  "w-full min-h-[100px] rounded-xl border",
                  "bg-white/[0.02] border-white/10",
                  "text-white placeholder:text-white/40",
                  "focus:border-primary/50 focus:outline-none",
                  "px-4 py-3 text-sm resize-none"
                )}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Visual Configuration */}
        <CollapsibleSection
          title="Configurações Visuais"
          icon={Layers}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Background Type */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">
                Tipo de Fundo
              </label>
              <input
                type="text"
                value={tipoFundo}
                onChange={(e) => setTipoFundo(e.target.value)}
                placeholder="Ex: Solid color, gradient, studio backdrop..."
                className={cn(
                  "w-full h-11 rounded-lg border",
                  "bg-white/[0.02] border-white/10",
                  "text-white placeholder:text-white/40",
                  "focus:border-primary/50 focus:outline-none",
                  "px-3 text-sm mb-2"
                )}
              />
              <div className="flex flex-wrap gap-1">
                {backgroundTypeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTipoFundo(suggestion)}
                    className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">
                Cor do Texto
              </label>
              <input
                type="text"
                value={corTexto}
                onChange={(e) => setCorTexto(e.target.value)}
                placeholder="Ex: White, yellow, red..."
                className={cn(
                  "w-full h-11 rounded-lg border",
                  "bg-white/[0.02] border-white/10",
                  "text-white placeholder:text-white/40",
                  "focus:border-primary/50 focus:outline-none",
                  "px-3 text-sm mb-2"
                )}
              />
              <div className="flex flex-wrap gap-1">
                {textColorSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setCorTexto(suggestion)}
                    className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Position */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">
                Posição do Texto
              </label>
              <input
                type="text"
                value={posicaoTexto}
                onChange={(e) => setPosicaoTexto(e.target.value)}
                placeholder="Ex: Center overlay, top left..."
                className={cn(
                  "w-full h-11 rounded-lg border",
                  "bg-white/[0.02] border-white/10",
                  "text-white placeholder:text-white/40",
                  "focus:border-primary/50 focus:outline-none",
                  "px-3 text-sm mb-2"
                )}
              />
              <div className="flex flex-wrap gap-1">
                {textPositionSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setPosicaoTexto(suggestion)}
                    className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting Type */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">
                Tipo de Iluminação
              </label>
              <input
                type="text"
                value={tipoIluminacao}
                onChange={(e) => setTipoIluminacao(e.target.value)}
                placeholder="Ex: Studio lighting, natural light..."
                className={cn(
                  "w-full h-11 rounded-lg border",
                  "bg-white/[0.02] border-white/10",
                  "text-white placeholder:text-white/40",
                  "focus:border-primary/50 focus:outline-none",
                  "px-3 text-sm mb-2"
                )}
              />
              <div className="flex flex-wrap gap-1">
                {lightingTypeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTipoIluminacao(suggestion)}
                    className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Image Uploads */}
        <CollapsibleSection
          title="Imagens de Referência"
          icon={Eye}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <ImageUpload
              label="Sua Foto (Opcional)"
              description="Upload sua foto para usar na thumbnail. Se não fornecida, será usada uma pessoa genérica."
              image={referenciaImagem1}
              onChange={setReferenciaImagem1}
              onRemove={() => setReferenciaImagem1(null)}
            />
            <ImageUpload
              label="Referência Visual (Opcional)"
              description="Upload uma imagem de referência para estilo/composição."
              image={referenciaImagem2}
              onChange={setReferenciaImagem2}
              onRemove={() => setReferenciaImagem2(null)}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20"
      >
        <p className="text-sm text-white/80 text-center">
          <Sparkles className="w-4 h-4 inline mr-2" />
          Ao clicar em "Gerar Thumbnail", iniciaremos o processamento em segundo plano.
          Você será redirecionado para a Biblioteca em instantes!
        </p>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center pt-6"
      >
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="min-w-[300px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Gerar Thumbnail e Concluir
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
