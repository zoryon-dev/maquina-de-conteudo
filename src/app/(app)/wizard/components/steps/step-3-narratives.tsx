/**
 * Step 3 - Narratives Selection
 *
 * Displays generated narrative options for user to choose from.
 * Each narrative has a title, description, and angle (herege, visionario, tradutor, testemunha).
 * Based on Seth Godin's "Tribes" philosophy for tribal content leadership.
 * User selects one narrative to proceed to content generation.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NarrativeCard, type Narrative } from "../shared/narrative-card";
import { SynthesisSummary, type SynthesizedResearch } from "../shared/synthesis-summary";

// Re-export types for external use
export type { Narrative, SynthesizedResearch };

export interface WizardFormData {
  selectedNarrativeId?: string;
  customInstructions?: string;
}

interface Step3NarrativesProps {
  narratives: Narrative[];
  synthesizedResearch?: SynthesizedResearch | null;
  initialData?: WizardFormData;
  onChange: (data: WizardFormData) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const ANGLE_INFO: Record<string, { label: string; description: string; color: string }> = {
  herege: {
    label: "Herege",
    description: "Desafia o senso comum e provoca reflexão",
    color: "text-red-400",
  },
  visionario: {
    label: "Visionário",
    description: "Mostra um futuro possível e inspira mudança",
    color: "text-purple-400",
  },
  tradutor: {
    label: "Tradutor",
    description: "Simplifica o complexo e democratiza conhecimento",
    color: "text-blue-400",
  },
  testemunha: {
    label: "Testemunha",
    description: "Compartilha jornada pessoal e cria identificação",
    color: "text-green-400",
  },
};

export function Step3Narratives({
  narratives,
  synthesizedResearch,
  initialData,
  onChange,
  onSubmit,
  isSubmitting = false,
  className,
}: Step3NarrativesProps) {
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);

  const selectedNarrativeId = initialData?.selectedNarrativeId;
  const selectedNarrative = narratives.find((n) => n.id === selectedNarrativeId);

  const handleSelectNarrative = (narrativeId: string) => {
    onChange({
      ...initialData,
      selectedNarrativeId: narrativeId,
    });
  };

  const handleCustomInstructionsChange = (value: string) => {
    onChange({
      ...initialData,
      customInstructions: value,
    });
  };

  const isValid = selectedNarrativeId !== undefined;

  // Group narratives by angle
  const narrativesByAngle = narratives.reduce((acc, narrative) => {
    if (!acc[narrative.angle]) {
      acc[narrative.angle] = [];
    }
    acc[narrative.angle].push(narrative);
    return acc;
  }, {} as Record<string, Narrative[]>);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          {narratives.length} opções de narrativa
        </motion.div>
        <h2 className="text-xl font-semibold text-white">
          Escolha a narrativa para seu conteúdo
        </h2>
        <p className="text-sm text-white/60">
          Cada opção oferece uma abordagem diferente. Selecione a que melhor se
          adapta ao seu objetivo.
        </p>
      </div>

      {/* Angle Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(ANGLE_INFO).map(([angle, info]) => {
          const hasThisAngle = narratives.some((n) => n.angle === angle);
          if (!hasThisAngle) return null;

          return (
            <div
              key={angle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/10"
            >
              <span className={cn("text-xs font-medium capitalize", info.color)}>
                {info.label}
              </span>
              <span className="text-xs text-white/40">{info.description}</span>
            </div>
          );
        })}
      </div>

      {/* Synthesis Summary - Show if research was synthesized */}
      {synthesizedResearch && (
        <SynthesisSummary data={synthesizedResearch} />
      )}

      {/* Narratives by Angle */}
      <div className="space-y-6">
        {Object.entries(narrativesByAngle).map(([angle, angleNarratives], groupIndex) => {
          const angleInfo = ANGLE_INFO[angle];
          if (!angleInfo) return null;

          return (
            <div key={angle} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-1 h-4 rounded-full",
                    angleInfo.color.replace("text-", "bg-")
                  )}
                />
                <h3 className="text-sm font-semibold text-white capitalize">
                  {angleInfo.label}s
                </h3>
                <span className="text-xs text-white/40">
                  ({angleNarratives.length})
                </span>
              </div>
              <div className="grid gap-3">
                {angleNarratives.map((narrative, index) => (
                  <NarrativeCard
                    key={narrative.id}
                    narrative={narrative}
                    isSelected={narrative.id === selectedNarrativeId}
                    onSelect={handleSelectNarrative}
                    index={groupIndex * 10 + index}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Instructions Toggle */}
      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowCustomInstructions(!showCustomInstructions)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <Info className="w-4 h-4" />
          {showCustomInstructions ? "Ocultar" : "Mostrar"} instruções adicionais
        </button>

        <AnimatePresence>
          {showCustomInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2">
                <Label className="text-xs text-white/60">
                  Instruções adicionais para a geração (opcional)
                </Label>
                <Textarea
                  placeholder="Ex: Use um tom mais casual, inclua emojis, foque em benefícios..."
                  value={initialData?.customInstructions ?? ""}
                  onChange={(e) =>
                    handleCustomInstructionsChange(e.target.value)
                  }
                  rows={3}
                  className="resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Narrative Summary */}
      <AnimatePresence>
        {selectedNarrative && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs text-primary font-medium">
                  Narrativa selecionada
                </p>
                <h4 className="text-sm font-semibold text-white">
                  {selectedNarrative.title}
                </h4>
                <p className="text-xs text-white/60 line-clamp-2">
                  {selectedNarrative.description}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full capitalize",
                    ANGLE_INFO[selectedNarrative.angle]?.color ??
                      "text-primary",
                    "bg-white/10"
                  )}
                >
                  {selectedNarrative.angle}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <div className="pt-4 border-t border-white/10">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Gerando conteúdo...
            </>
          ) : (
            <>
              Gerar Conteúdo
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
        {!isValid && (
          <p className="text-xs text-center text-white/40 mt-2">
            Selecione uma narrativa para continuar
          </p>
        )}
      </div>
    </div>
  );
}
