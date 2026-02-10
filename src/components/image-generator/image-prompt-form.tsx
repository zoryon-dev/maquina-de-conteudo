"use client";

/**
 * Image Prompt Form
 *
 * Formulário modular para geração de imagens.
 * Campos são concatenados de forma previsível para formar o prompt final.
 */

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Sun,
  Palette,
  ImageIcon,
  Square,
  Type,
  Sparkles,
  ChevronDown,
  Info,
  Wand2,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ImagePromptFields, ImagePreset } from "@/types/image-generation";
import { DEFAULT_IMAGE_FIELDS } from "@/types/image-generation";
import { IMAGE_PRESETS, getPresetById, applyPreset } from "@/lib/image-generation/presets";
import { buildPrompt } from "@/lib/image-generation/build-prompt";

// ============================================================================
// TYPES
// ============================================================================

interface ImagePromptFormProps {
  /** Valores iniciais dos campos */
  initialValues?: Partial<ImagePromptFields>;
  /** Callback quando os campos mudam */
  onChange?: (fields: Partial<ImagePromptFields>) => void;
  /** Callback quando o usuário clica em gerar */
  onGenerate: (fields: ImagePromptFields) => Promise<void>;
  /** Se está gerando a imagem */
  isGenerating?: boolean;
  /** Mostrar preview do prompt */
  showPromptPreview?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================================================
// OPTIONS
// ============================================================================

const SHOT_TYPE_OPTIONS = [
  { value: "close-up", label: "Close-up", icon: "🔍" },
  { value: "medium", label: "Médio", icon: "📷" },
  { value: "wide", label: "Amplo", icon: "🌄" },
  { value: "detail", label: "Detalhe", icon: "🔬" },
  { value: "overhead", label: "Vista Superior", icon: "⬇️" },
] as const;

const LIGHTING_OPTIONS = [
  { value: "natural", label: "Natural", icon: "☀️" },
  { value: "studio", label: "Estúdio", icon: "💡" },
  { value: "golden-hour", label: "Golden Hour", icon: "🌅" },
  { value: "dramatic", label: "Dramática", icon: "🎭" },
  { value: "soft", label: "Suave", icon: "☁️" },
  { value: "neon", label: "Neon", icon: "🌈" },
] as const;

const COLOR_PALETTE_OPTIONS = [
  { value: "warm", label: "Quente", icon: "🔥" },
  { value: "cool", label: "Frio", icon: "❄️" },
  { value: "vibrant", label: "Vibrante", icon: "🌈" },
  { value: "muted", label: "Suave", icon: "🌫️" },
  { value: "pastel", label: "Pastel", icon: "🎨" },
  { value: "dark", label: "Escuro", icon: "🌑" },
  { value: "b&w", label: "P&B", icon: "⬛" },
] as const;

const PHOTO_STYLE_OPTIONS = [
  { value: "editorial", label: "Editorial", icon: "📰" },
  { value: "lifestyle", label: "Lifestyle", icon: "✨" },
  { value: "corporate", label: "Corporativo", icon: "💼" },
  { value: "candid", label: "Espontâneo", icon: "📸" },
  { value: "artistic", label: "Artístico", icon: "🎨" },
  { value: "minimal", label: "Minimalista", icon: "◻️" },
  { value: "bold", label: "Bold", icon: "⚡" },
] as const;

const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1", description: "Quadrado" },
  { value: "3:4", label: "3:4", description: "Feed Instagram" },
  { value: "9:16", label: "9:16", description: "Stories/Reels" },
  { value: "16:9", label: "16:9", description: "Paisagem" },
] as const;

const TEXT_STYLE_OPTIONS = [
  { value: "bold-sans", label: "Bold Sans" },
  { value: "elegant-serif", label: "Elegant Serif" },
  { value: "handwritten", label: "Manuscrito" },
  { value: "minimal", label: "Minimalista" },
] as const;

const TEXT_PLACEMENT_OPTIONS = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Inferior" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function ImagePromptForm({
  initialValues,
  onChange,
  onGenerate,
  isGenerating = false,
  showPromptPreview = true,
  className,
}: ImagePromptFormProps) {
  // Estado local dos campos
  const [fields, setFields] = useState<Partial<ImagePromptFields>>(() => ({
    ...DEFAULT_IMAGE_FIELDS,
    ...initialValues,
  }));

  // Estado do preset selecionado
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Estado de expansão das seções avançadas
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Atualizar campo
  const updateField = useCallback(
    <K extends keyof ImagePromptFields>(key: K, value: ImagePromptFields[K]) => {
      setFields((prev) => {
        const updated = { ...prev, [key]: value };
        onChange?.(updated);
        return updated;
      });
      // Limpar preset quando usuário edita manualmente
      if (selectedPreset) {
        setSelectedPreset(null);
      }
    },
    [onChange, selectedPreset]
  );

  // Aplicar preset
  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const applied = applyPreset(fields, presetId);
      setFields(applied);
      setSelectedPreset(presetId);
      onChange?.(applied);
    },
    [fields, onChange]
  );

  // Preview do prompt
  const promptPreview = useMemo(() => {
    if (!fields.subject || !fields.setting) return null;

    // Criar campos completos para preview
    const completeFields: ImagePromptFields = {
      ...DEFAULT_IMAGE_FIELDS,
      ...fields,
    } as ImagePromptFields;

    return buildPrompt(completeFields);
  }, [fields]);

  // Validar campos obrigatórios
  const isValid = useMemo(() => {
    return Boolean(fields.subject?.trim() && fields.setting?.trim());
  }, [fields.subject, fields.setting]);

  // Handler de submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || isGenerating) return;

      const completeFields: ImagePromptFields = {
        ...DEFAULT_IMAGE_FIELDS,
        ...fields,
      } as ImagePromptFields;

      await onGenerate(completeFields);
    },
    [fields, isValid, isGenerating, onGenerate]
  );

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PRESETS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <Label className="text-sm font-medium text-white/70 mb-3 block">
            Presets rápidos
          </Label>
          <div className="flex flex-wrap gap-2">
            {IMAGE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant={selectedPreset === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  "transition-all",
                  selectedPreset === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <span className="mr-1.5">{preset.icon}</span>
                {preset.name}
              </Button>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CAMPOS OBRIGATÓRIOS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div>
            <Label htmlFor="subject" className="text-sm font-medium text-white/70 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              O que aparece na imagem *
            </Label>
            <Textarea
              id="subject"
              placeholder="Ex: mulher empreendedora trabalhando no laptop"
              value={fields.subject || ""}
              onChange={(e) => updateField("subject", e.target.value)}
              className="mt-2 min-h-[80px] resize-none"
              required
            />
          </div>

          <div>
            <Label htmlFor="setting" className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Cenário/Ambiente *
            </Label>
            <Input
              id="setting"
              placeholder="Ex: café moderno com plantas"
              value={fields.setting || ""}
              onChange={(e) => updateField("setting", e.target.value)}
              className="mt-2"
              required
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CAMPOS VISUAIS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-2 gap-4">
          {/* Shot Type */}
          <div>
            <Label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4" />
              Enquadramento
            </Label>
            <Select
              value={fields.shotType || "medium"}
              onValueChange={(v) => updateField("shotType", v as ImagePromptFields["shotType"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lighting */}
          <div>
            <Label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4" />
              Iluminação
            </Label>
            <Select
              value={fields.lighting || "natural"}
              onValueChange={(v) => updateField("lighting", v as ImagePromptFields["lighting"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIGHTING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Palette */}
          <div>
            <Label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4" />
              Paleta de Cores
            </Label>
            <Select
              value={fields.colorPalette || "warm"}
              onValueChange={(v) => updateField("colorPalette", v as ImagePromptFields["colorPalette"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_PALETTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photo Style */}
          <div>
            <Label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              Estilo Fotográfico
            </Label>
            <Select
              value={fields.photoStyle || "lifestyle"}
              onValueChange={(v) => updateField("photoStyle", v as ImagePromptFields["photoStyle"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_STYLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ASPECT RATIO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <Label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Square className="w-4 h-4" />
            Proporção
          </Label>
          <div className="flex gap-2">
            {ASPECT_RATIO_OPTIONS.map((opt) => (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={fields.aspectRatio === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("aspectRatio", opt.value)}
                    className={cn(
                      "flex-1 transition-all",
                      fields.aspectRatio === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {opt.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{opt.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TEXTO NA IMAGEM */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeText" className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Incluir texto na imagem
            </Label>
            <Switch
              id="includeText"
              checked={fields.includeText || false}
              onCheckedChange={(v) => updateField("includeText", v)}
            />
          </div>

          <AnimatePresence>
            {fields.includeText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <Label htmlFor="textContent" className="text-sm text-white/60">
                    Texto a incluir
                  </Label>
                  <Input
                    id="textContent"
                    placeholder="Ex: Comece hoje"
                    value={fields.textContent || ""}
                    onChange={(e) => updateField("textContent", e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-white/60 mb-2 block">Posição</Label>
                    <Select
                      value={fields.textPlacement || "center"}
                      onValueChange={(v) => updateField("textPlacement", v as ImagePromptFields["textPlacement"])}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEXT_PLACEMENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-white/60 mb-2 block">Estilo</Label>
                    <Select
                      value={fields.textStyle || "bold-sans"}
                      onValueChange={(v) => updateField("textStyle", v as ImagePromptFields["textStyle"])}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEXT_STYLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CAMPOS AVANÇADOS (Collapsed) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between text-white/60 hover:text-white/80"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Opções Avançadas
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  advancedOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="mood" className="text-sm text-white/60">
                Mood/Sentimento
              </Label>
              <Input
                id="mood"
                placeholder="Ex: confiante e determinada"
                value={fields.mood || ""}
                onChange={(e) => updateField("mood", e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="avoidElements" className="text-sm text-white/60">
                Elementos a evitar
              </Label>
              <Input
                id="avoidElements"
                placeholder="Ex: sem pessoas ao fundo, sem logos"
                value={fields.avoidElements || ""}
                onChange={(e) => updateField("avoidElements", e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes" className="text-sm text-white/60">
                Instruções adicionais
              </Label>
              <Textarea
                id="additionalNotes"
                placeholder="Ex: estilo similar a fotos da Forbes"
                value={fields.additionalNotes || ""}
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                className="mt-2 min-h-[60px] resize-none"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PREVIEW DO PROMPT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showPromptPreview && promptPreview && (
          <section className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <Label className="text-sm font-medium text-primary flex items-center gap-2 mb-2">
              <Wand2 className="w-4 h-4" />
              Preview do Prompt
            </Label>
            <p className="text-sm text-white/70 leading-relaxed">
              {promptPreview.previewText}
            </p>
            <details className="mt-2">
              <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                Ver prompt completo
              </summary>
              <pre className="mt-2 text-xs text-white/50 whitespace-pre-wrap bg-black/20 p-2 rounded">
                {promptPreview.prompt}
              </pre>
            </details>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOTÃO DE GERAR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Button
          type="submit"
          disabled={!isValid || isGenerating}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {isGenerating ? (
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
      </form>
    </TooltipProvider>
  );
}
