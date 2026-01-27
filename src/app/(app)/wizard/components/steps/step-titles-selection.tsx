/**
 * Step 3.5 - Video Title Selection
 *
 * Shows 5 generated title options for video thumbnail.
 * User selects one title before proceeding to script generation.
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Hash,
  Type,
  Award,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";

// ============================================================================
// TYPES
// ============================================================================

export interface TitlesSelectionProps {
  wizardId: number;
  generatedContent: string; // NOVO: VideoScriptStructured v4.3 como JSON string
  narrativeAngle: string;
  narrativeTitle: string;
  narrativeDescription: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  onTitleSelected: (title: VideoTitleOption) => void;
  onBack?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface TitleCardProps {
  option: VideoTitleOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function TitleCard({ option, isSelected, onSelect, index }: TitleCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : "border-white/10 bg-white/[0.02]"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5",
            isSelected
              ? "border-primary bg-primary"
              : "border-white/20 bg-white/[0.02]"
          )}
        >
          {isSelected && <Check className="w-4 h-4 text-black" />}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-base font-bold mb-2 leading-tight",
              isSelected ? "text-white" : "text-white/90"
            )}
          >
            {option.title}
          </p>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Hook Factor Badge */}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                option.hook_factor >= 90
                  ? "bg-lime-500/20 text-lime-400"
                  : option.hook_factor >= 80
                    ? "bg-green-500/20 text-green-400"
                    : option.hook_factor >= 70
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-gray-500/20 text-gray-400"
              )}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Hook: {option.hook_factor}/100</span>
            </div>

            {/* Word Count Badge */}
            {option.word_count && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                <Type className="w-3 h-3" />
                <span>{option.word_count} palavras</span>
              </div>
            )}

            {/* Tribal Angle Badge */}
            {option.tribal_angle && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                <Award className="w-3 h-3" />
                <span className="uppercase">{option.tribal_angle}</span>
              </div>
            )}
          </div>

          {/* Formula Used */}
          {option.formula_used && (
            <div className="mb-2 px-2 py-1 rounded bg-white/5 text-xs">
              <code className="text-white/70">{option.formula_used}</code>
            </div>
          )}

          {/* Triggers */}
          {option.triggers && option.triggers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {option.triggers.map((trigger, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-primary/10 text-primary/90 text-[10px] font-medium uppercase tracking-wide"
                >
                  {trigger}
                </span>
              ))}
            </div>
          )}

          {/* Reason */}
          <p className="text-xs text-white/40 line-clamp-2">{option.reason}</p>
        </div>

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0"
          >
            <Check className="w-5 h-5 text-primary" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepTitlesSelection({
  wizardId,
  narrativeAngle,
  narrativeTitle,
  narrativeDescription,
  theme,
  targetAudience,
  objective,
  onTitleSelected,
  onBack,
  className,
}: TitlesSelectionProps) {
  const [titles, setTitles] = useState<VideoTitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<VideoTitleOption | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate titles on mount
  useEffect(() => {
    const generateTitles = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        // Parse generated content to extract script context
        let roteiroContext = {};
        try {
          const parsed = JSON.parse(generatedContent);
          if (parsed.meta && parsed.roteiro && parsed.thumbnail) {
            // VideoScriptStructured v4.3
            roteiroContext = {
              valorCentral: parsed.meta?.valor_central || "",
              hookTexto: parsed.roteiro?.hook?.texto || "",
              thumbnailTitulo: parsed.thumbnail?.titulo || "",
              thumbnailEstilo: parsed.thumbnail?.estilo || "",
            };
          }
        } catch {
          // Not valid JSON or not VideoScriptStructured
          console.warn("[TITLES] Could not parse generatedContent as VideoScriptStructured");
        }

        const response = await fetch(
          `/api/wizard/${wizardId}/generate-titles`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              narrativeAngle,
              narrativeTitle,
              narrativeDescription,
              theme,
              targetAudience,
              objective,
              roteiroContext, // NOVO: Contexto do roteiro gerado
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate titles");
        }

        const data = await response.json();

        if (!data.success || !data.data?.titles) {
          throw new Error("Invalid response format");
        }

        setTitles(data.data.titles);
      } catch (err) {
        console.error("[TITLES] Error generating:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate titles"
        );
      } finally {
        setIsGenerating(false);
      }
    };

    generateTitles();
  }, [
    wizardId,
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    theme,
    targetAudience,
    objective,
  ]);

  const handleSubmit = () => {
    if (!selectedTitle) return;

    setIsSubmitting(true);
    onTitleSelected(selectedTitle);
  };

  const handleRegenerate = () => {
    // Trigger regeneration by clearing titles and letting useEffect run again
    setTitles([]);
    setIsGenerating(true);
    setError(null);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-white">
            Escolha o Título da Thumbnail
          </h2>
        </div>
        <p className="text-sm text-white/60">
          Selecione um dos títulos abaixo. Ele será usado para gerar a thumbnail
          do seu vídeo.
        </p>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
          >
            <p className="font-medium mb-2">Erro ao gerar títulos</p>
            <p className="text-white/70 mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              className="text-red-300 border-red-500/30 hover:bg-red-500/20"
            >
              Tentar Novamente
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-white/60">
            Gerando opções de título com IA...
          </p>
        </div>
      )}

      {/* Titles Grid */}
      {!isGenerating && titles.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
            5 Opções Geradas
          </p>

          <div className="grid grid-cols-1 gap-3">
            {titles.map((title, index) => (
              <TitleCard
                key={title.id}
                option={title}
                index={index}
                isSelected={selectedTitle?.id === title.id}
                onSelect={() => setSelectedTitle(title)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isGenerating || isSubmitting}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Voltar
          </Button>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {!isGenerating && titles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isSubmitting}
              className="text-white/60 border-white/10 hover:bg-white/5"
            >
              Gerar Novas Opções
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selectedTitle || isSubmitting || isGenerating}
            className="bg-primary text-black hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando Roteiro...
              </>
            ) : (
              <>
                Confirmar e Gerar Roteiro
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
