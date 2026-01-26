/**
 * Wizard Steps Indicator
 *
 * Visual indicator showing the current step in the wizard flow.
 * Displays progress through 5 steps: Input → Processing → Narratives → Generation → Image Generation
 */

"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStepValue =
  | "video-duration"
  | "input"
  | "processing"
  | "narratives"
  | "content-approval"
  | "titles-selection"
  | "generation"
  | "thumbnail-config"
  | "image-generation"
  | "completed";

interface WizardStep {
  value: WizardStepValue;
  label: string;
  description: string;
}

// Steps for non-video content (text, image, carousel, story)
const NON_VIDEO_STEPS: WizardStep[] = [
  {
    value: "input",
    label: "Briefing",
    description: "Configure seu conteúdo",
  },
  {
    value: "processing",
    label: "Processando",
    description: "Analisando referências",
  },
  {
    value: "narratives",
    label: "Narrativas",
    description: "Escolha uma opção",
  },
  {
    value: "content-approval",
    label: "Aprovação",
    description: "Revise o conteúdo",
  },
  {
    value: "generation",
    label: "Geração",
    description: "Gerando seu conteúdo",
  },
  {
    value: "image-generation",
    label: "Imagem",
    description: "Gere visual (opcional)",
  },
];

// Steps for video content
const VIDEO_STEPS: WizardStep[] = [
  {
    value: "video-duration",
    label: "Duração",
    description: "Tempo do vídeo",
  },
  {
    value: "input",
    label: "Briefing",
    description: "Configure seu conteúdo",
  },
  {
    value: "processing",
    label: "Processando",
    description: "Analisando referências",
  },
  {
    value: "narratives",
    label: "Narrativas",
    description: "Escolha uma opção",
  },
  {
    value: "content-approval",
    label: "Aprovação",
    description: "Revise o conteúdo",
  },
  {
    value: "titles-selection",
    label: "Título",
    description: "Escolha o título",
  },
  {
    value: "generation",
    label: "Roteiro",
    description: "Gerando seu roteiro",
  },
  {
    value: "thumbnail-config",
    label: "Thumbnail",
    description: "Configure a capa",
  },
  {
    value: "image-generation",
    label: "Imagem",
    description: "Gere visual (opcional)",
  },
];

interface WizardStepsIndicatorProps {
  currentStep: WizardStepValue;
  contentType?: "video" | "text" | "image" | "carousel" | "story";
  onStepClick?: (step: WizardStepValue) => void;
  className?: string;
}

export function WizardStepsIndicator({
  currentStep,
  contentType = "text",
  onStepClick,
  className,
}: WizardStepsIndicatorProps) {
  // Choose steps based on content type
  const steps = contentType === "video" ? VIDEO_STEPS : NON_VIDEO_STEPS;

  // Determine the current step index
  const currentStepIndex = steps.findIndex(
    (s) => s.value === currentStep
  );

  // For completed state, show all as completed
  const isCompleted = currentStep === "completed";

  return (
    <div className={cn("w-full", className)}>
      {/* Scrollable container for steps */}
      <div className="overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex items-center min-w-max px-1">
          {steps.map((step, index) => {
            const isPast = index < currentStepIndex || isCompleted;
            const isCurrent = index === currentStepIndex;
            const isClickable = onStepClick && isPast && step.value !== "processing";

            return (
              <div key={step.value} className="flex items-center">
                {/* Step Circle - Reduced size for compact layout */}
                <motion.button
                  layoutId="wizard-step"
                  onClick={() => isClickable && onStepClick(step.value)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    isPast || isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20 bg-white/5 text-white/40",
                    isClickable && "cursor-pointer hover:scale-110 active:scale-95",
                    !isClickable && "cursor-default"
                  )}
                >
                  {isPast || (isCompleted && index <= currentStepIndex) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}

                  {/* Current Step Glow */}
                  {isCurrent && (
                    <motion.div
                      layoutId="wizard-step-glow"
                      className="absolute inset-0 rounded-full bg-primary/50 blur-md -z-10"
                      initial={false}
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                {/* Step Label - Hidden on very small screens, compact on others */}
                <div className="ml-2 mr-3 min-w-0 max-w-[100px] sm:max-w-[120px]">
                  <p
                    className={cn(
                      "text-xs font-medium truncate transition-colors hidden sm:block",
                      isCurrent ? "text-white" : "text-white/60"
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] truncate transition-colors hidden md:block",
                      isCurrent ? "text-white/40" : "text-white/20"
                    )}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Connector Line - Reduced spacing */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-shrink-0 w-6 h-0.5 transition-colors",
                      index < currentStepIndex || isCompleted
                        ? "bg-primary"
                        : "bg-white/10"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{
            width: isCompleted
              ? "100%"
              : `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
