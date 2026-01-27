/**
 * Step 4 - Video Titles Selection
 *
 * Displays 5 generated thumbnail title options for user to choose from.
 * Each title has a hook_factor score showing its effectiveness.
 * User selects one title to proceed to thumbnail configuration.
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  Sparkles,
  Check,
  Loader2,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";

// ============================================================================
// TYPES
// ============================================================================

export interface StepVideoTitlesProps {
  wizardId: number;
  generatedScript?: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  onTitleSelected: (title: VideoTitleOption) => void;
  className?: string;
}

interface RoteiroContext {
  valorCentral?: string;
  hookTexto?: string;
  thumbnailTitulo?: string;
  thumbnailEstilo?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseRoteiroContext(generatedScript?: string): RoteiroContext {
  if (!generatedScript) return {};

  try {
    const parsed = JSON.parse(generatedScript);
    if (parsed.meta && parsed.roteiro && parsed.thumbnail) {
      return {
        valorCentral: parsed.meta?.valor_central || "",
        hookTexto: parsed.roteiro?.hook?.texto || "",
        thumbnailTitulo: parsed.thumbnail?.titulo || "",
        thumbnailEstilo: parsed.thumbnail?.estilo || "",
      };
    }
  } catch {
    // If parsing fails, return empty context
  }

  return {};
}

function getHookFactorColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 80) return "text-lime-400";
  if (score >= 70) return "text-yellow-400";
  return "text-orange-400";
}

function getHookFactorLabel(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Forte";
  if (score >= 70) return "Bom";
  return "Médio";
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface TitleCardProps {
  title: VideoTitleOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
}

function TitleCard({
  title,
  index,
  isSelected,
  onSelect,
  isRecommended = false,
}: TitleCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative p-5 rounded-xl border-2 transition-all cursor-pointer",
        "hover:scale-[1.01] active:scale-[0.99]",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      )}
      onClick={onSelect}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-primary text-black text-xs font-bold rounded-full">
          RECOMENDADO
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-black" />
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-3">
        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {title.title}
        </h3>

        {/* Hook Factor Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${title.hook_factor}%` }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
              className={cn(
                "h-full rounded-full",
                title.hook_factor >= 80
                  ? "bg-primary"
                  : title.hook_factor >= 70
                  ? "bg-yellow-400"
                  : "bg-orange-400"
              )}
            />
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              getHookFactorColor(title.hook_factor)
            )}
          >
            <TrendingUp className="w-4 h-4" />
            {title.hook_factor}
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-white/60">{title.reason}</p>

        {/* Expandable Details */}
        {(title.word_count ||
          title.formula_used ||
          title.triggers ||
          title.tribal_angle) && (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Detalhes técnicos
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-1.5 text-xs">
                    {title.word_count && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Palavras:</span>
                        <span className="text-white/70">{title.word_count}</span>
                      </div>
                    )}
                    {title.formula_used && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Fórmula:</span>
                        <span className="text-white/70">{title.formula_used}</span>
                      </div>
                    )}
                    {title.tribal_angle && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Ângulo:</span>
                        <span className="text-primary capitalize">
                          {title.tribal_angle}
                        </span>
                      </div>
                    )}
                    {title.triggers && title.triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {title.triggers.map((trigger, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10"
                          >
                            {trigger}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StepVideoTitles({
  wizardId,
  generatedScript,
  theme,
  targetAudience,
  objective,
  onTitleSelected,
  className,
}: StepVideoTitlesProps) {
  const [titles, setTitles] = useState<VideoTitleOption[]>([]);
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // For demo/mock purposes, use default narrative info
  // In production, this would come from the wizard's selected narrative
  const narrativeInfo = {
    angle: "herege" as const,
    title: theme || "Como criar conteúdo viral",
    description: "",
  };

  useEffect(() => {
    generateTitles();
  }, [wizardId]);

  const generateTitles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const roteiroContext = parseRoteiroContext(generatedScript);

      const response = await fetch(`/api/wizard/${wizardId}/generate-titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          narrativeAngle: narrativeInfo.angle,
          narrativeTitle: narrativeInfo.title,
          narrativeDescription: narrativeInfo.description,
          theme,
          targetAudience,
          objective,
          roteiroContext,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate titles");
      }

      setTitles(data.data?.titles || []);
    } catch (err) {
      console.error("[VIDEO TITLES] Error generating titles:", err);
      setError(err instanceof Error ? err.message : "Erro ao gerar títulos");

      // Set fallback titles for demo
      setTitles([
        {
          id: "fallback-1",
          title: "O QUE NINGUÉM FALA",
          hook_factor: 85,
          reason: "Cria forte curiosidade com lacuna de informação",
        },
        {
          id: "fallback-2",
          title: "5 ERROS QUE TODO MUNDO COMETE",
          hook_factor: 82,
          reason: "Número específico + padrão contrarianista",
        },
        {
          id: "fallback-3",
          title: "A VERDADE SOBRE CRIAR CONTEÚDO",
          hook_factor: 78,
          reason: "Promessa de revelação com tema popular",
        },
        {
          id: "fallback-4",
          title: "PARE DE PERDER TEMPO",
          hook_factor: 75,
          reason: "Comando direto com urgência implícita",
        },
        {
          id: "fallback-5",
          title: "COMO EU CONSEGUI 100K SEGUIDORES",
          hook_factor: 80,
          reason: "Transformação pessoal com prova social",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    generateTitles().finally(() => setIsRegenerating(false));
  };

  const handleSelectTitle = (title: VideoTitleOption) => {
    setSelectedTitleId(title.id);
  };

  const handleContinue = () => {
    const selectedTitle = titles.find((t) => t.id === selectedTitleId);
    if (selectedTitle) {
      onTitleSelected(selectedTitle);
    }
  };

  const selectedTitle = titles.find((t) => t.id === selectedTitleId);
  const recommendedTitle = titles.length > 0 ? titles[0] : null;

  return (
    <div className={cn("w-full max-w-5xl mx-auto px-4 py-8", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6"
        >
          <Type className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Escolha o Título da Thumbnail
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          Selecione o título que mais se destaca para sua thumbnail. O score
          indica o potencial de clique.
        </motion.p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-white/60">Gerando títulos com IA...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-6">
          <p className="font-medium mb-2">Erro ao gerar títulos</p>
          <p className="text-red-300/80">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="mt-4 border-red-400/30 text-red-300 hover:bg-red-500/10"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Titles Grid */}
      {!isLoading && titles.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {titles.map((title, index) => (
              <TitleCard
                key={title.id}
                title={title}
                index={index}
                isSelected={selectedTitleId === title.id}
                onSelect={() => handleSelectTitle(title)}
                isRecommended={recommendedTitle?.id === title.id}
              />
            ))}
          </div>

          {/* Selected Title Summary */}
          <AnimatePresence>
            {selectedTitle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-primary font-medium">
                      Título selecionado
                    </p>
                    <p className="text-lg font-bold text-white">
                      {selectedTitle.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary/70" />
                    <span
                      className={cn(
                        "text-lg font-bold",
                        getHookFactorColor(selectedTitle.hook_factor)
                      )}
                    >
                      {selectedTitle.hook_factor}/100
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="border-white/20 text-white hover:bg-white/10"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Novamente
                </>
              )}
            </Button>

            <Button
              type="button"
              size="lg"
              onClick={handleContinue}
              disabled={!selectedTitleId}
              className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continuar
            </Button>
          </motion.div>
        </>
      )}
    </div>
  );
}
