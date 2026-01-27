/**
 * Step: Video Duration Selection
 *
 * First step for video content creation.
 * User selects the video duration pattern, which will be used
 * to generate the script with appropriate depth and detail.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Film, ArrowRight, Check, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { VideoDuration } from "@/lib/wizard-services/types";

// Predefined video intentions
const VIDEO_INTENTIONS = [
  {
    id: "educar",
    label: "Educar",
    description: "Ensinar algo novo ao público",
    icon: Lightbulb,
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    id: "entreter",
    label: "Entreter",
    description: "Diversão e entretenimento",
    icon: "😄",
    gradient: "from-pink-400 to-rose-500",
  },
  {
    id: "inspirar",
    label: "Inspirar",
    description: "Motivar e inspirar ação",
    icon: "⚡",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    id: "vender",
    label: "Vender/Converter",
    description: "Promover produto ou serviço",
    icon: "🎯",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    id: "noticiar",
    label: "Noticiar/Informar",
    description: "Compartilhar novidades e atualizações",
    icon: "📰",
    gradient: "from-purple-400 to-indigo-500",
  },
  {
    id: "posicionar",
    label: "Posicionar Marca",
    description: "Construir autoridade no nicho",
    icon: "🏆",
    gradient: "from-amber-400 to-yellow-500",
  },
];

interface VideoDurationOption {
  value: VideoDuration;
  label: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  sections: string;
  gradient: string;
}

const DURATION_OPTIONS: VideoDurationOption[] = [
  {
    value: "2-5min",
    label: "2-5 Minutos",
    description: "Conteúdo direto e objetivo, sem enrolação",
    duration: "2-5 min",
    icon: Clock,
    sections: "3-4 seções",
    gradient: "from-lime-400 to-green-500",
  },
  {
    value: "5-10min",
    label: "5-10 Minutos",
    description: "Conteúdo médio com exemplos práticos",
    duration: "5-10 min",
    icon: Film,
    sections: "5-7 seções",
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    value: "+10min",
    label: "Mais de 10 Minutos",
    description: "Conteúdo profundo com storytelling",
    duration: "10+ min",
    icon: Film,
    sections: "8-12 seções",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    value: "+30min",
    label: "Mais de 30 Minutos",
    description: "Conteúdo muito profundo com casos",
    duration: "30+ min",
    icon: Film,
    sections: "12-18 seções",
    gradient: "from-orange-400 to-red-500",
  },
];

interface StepVideoDurationProps {
  initialDuration?: VideoDuration;
  initialIntention?: string;
  initialCustomIntention?: string;
  onSelect: (duration: VideoDuration, intention?: string, customIntention?: string) => void;
  onBack?: () => void;
  className?: string;
}

export function StepVideoDuration({
  initialDuration,
  initialIntention,
  initialCustomIntention,
  onSelect,
  onBack,
  className,
}: StepVideoDurationProps) {
  const [selectedDuration, setSelectedDuration] = useState<VideoDuration | undefined>(
    initialDuration
  );
  const [selectedIntention, setSelectedIntention] = useState<string | undefined>(
    initialIntention
  );
  const [customIntention, setCustomIntention] = useState(initialCustomIntention || "");
  const [showCustomIntention, setShowCustomIntention] = useState(false);

  const handleSelect = (duration: VideoDuration) => {
    setSelectedDuration(duration);
  };

  const handleIntentionSelect = (intentionId: string) => {
    if (intentionId === "custom") {
      setShowCustomIntention(true);
    } else {
      setSelectedIntention(intentionId);
      setShowCustomIntention(false);
    }
  };

  const handleContinue = () => {
    if (selectedDuration) {
      const finalIntention = showCustomIntention
        ? customIntention.trim() || undefined
        : selectedIntention;

      onSelect(
        selectedDuration,
        finalIntention,
        showCustomIntention ? customIntention.trim() : undefined
      );
    }
  };

  const canContinue = selectedDuration !== undefined;

  return (
    <div className={cn("w-full max-w-4xl mx-auto px-4 py-8", className)}>
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6"
        >
          <Clock className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Qual a duração do seu vídeo?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/70 max-w-2xl mx-auto"
        >
          A duração define a profundidade do conteúdo que será gerado.
          Escolha baseado no quanto você quer explorar o tema.
        </motion.p>
      </div>

      {/* Duration Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <AnimatePresence>
          {DURATION_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = selectedDuration === option.value;

            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <button
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative w-full p-6 rounded-xl border-2 transition-all duration-200 text-left",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  {/* Selection Checkmark */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4",
                      `bg-gradient-to-br ${option.gradient}`
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {option.label}
                  </h3>

                  <p className="text-sm text-white/60 mb-4">
                    {option.description}
                  </p>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{option.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      <span>{option.sections}</span>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Intention Section */}
      {selectedDuration && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-white">
              Qual a intenção deste vídeo?
            </h2>
          </div>

          {/* Intention Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {VIDEO_INTENTIONS.map((intention, index) => {
              const isSelected = selectedIntention === intention.id && !showCustomIntention;

              return (
                <motion.button
                  key={intention.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  onClick={() => handleIntentionSelect(intention.id)}
                  className={cn(
                    "relative p-3 rounded-lg border transition-all text-left",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    {typeof intention.icon === "string" ? (
                      <span className="text-lg">{intention.icon}</span>
                    ) : (
                      <intention.icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium text-white">{intention.label}</span>
                  </div>
                  <p className="text-xs text-white/50">{intention.description}</p>
                </motion.button>
              );
            })}

            {/* Custom Intention Option */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => handleIntentionSelect("custom")}
              className={cn(
                "relative p-3 rounded-lg border transition-all text-left",
                "hover:scale-[1.02] active:scale-[0.98]",
                showCustomIntention
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              {showCustomIntention && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✏️</span>
                <span className="text-sm font-medium text-white">Outra...</span>
              </div>
              <p className="text-xs text-white/50">Descrever intenção personalizada</p>
            </motion.button>
          </div>

          {/* Custom Intention Textarea */}
          <AnimatePresence>
            {showCustomIntention && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <Label htmlFor="custom-intention" className="text-white/70 text-sm mb-2 block">
                    Descreva a intenção do seu vídeo:
                  </Label>
                  <Textarea
                    id="custom-intention"
                    value={customIntention}
                    onChange={(e) => setCustomIntention(e.target.value)}
                    placeholder="Ex: Explicar um conceito complexo de forma simples, mostrar um tutorial passo a passo, compartilhar uma experiência pessoal..."
                    rows={3}
                    className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 focus:border-primary resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8 p-4 rounded-lg bg-white/[0.02] border border-white/10"
      >
        <p className="text-sm text-white/50 text-center">
          💡 <span className="text-white/70">Dica:</span> A intenção do vídeo ajuda a IA a ajustar
          o tom, estrutura e elementos persuasivos do roteiro.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-between"
      >
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-white/70 hover:text-white"
          >
            Voltar
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90",
            !canContinue && "opacity-50 cursor-not-allowed"
          )}
        >
          Continuar
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
