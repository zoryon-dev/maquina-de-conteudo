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

export type WizardStepValue = "input" | "processing" | "narratives" | "generation" | "image-generation" | "completed";

interface WizardStep {
  value: WizardStepValue;
  label: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
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
    value: "generation",
    label: "Geração",
    description: "Criando seu conteúdo",
  },
  {
    value: "image-generation",
    label: "Imagem",
    description: "Gere visual (opcional)",
  },
];

interface WizardStepsIndicatorProps {
  currentStep: WizardStepValue;
  onStepClick?: (step: WizardStepValue) => void;
  className?: string;
}

export function WizardStepsIndicator({
  currentStep,
  onStepClick,
  className,
}: WizardStepsIndicatorProps) {
  // Determine the current step index
  const currentStepIndex = WIZARD_STEPS.findIndex(
    (s) => s.value === currentStep
  );

  // For completed state, show all as completed
  const isCompleted = currentStep === "completed";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isPast = index < currentStepIndex || isCompleted;
          const isCurrent = index === currentStepIndex;
          const isClickable = onStepClick && isPast && step.value !== "processing";

          return (
            <div key={step.value} className="flex-1 flex items-center">
              {/* Step Circle */}
              <motion.button
                layoutId="wizard-step"
                onClick={() => isClickable && onStepClick(step.value)}
                disabled={!isClickable}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  isPast || isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/20 bg-white/5 text-white/40",
                  isClickable && "cursor-pointer hover:scale-110 active:scale-95",
                  !isClickable && "cursor-default"
                )}
              >
                {isPast || (isCompleted && index <= currentStepIndex) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
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

              {/* Step Label */}
              <div className="ml-3 flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate transition-colors",
                    isCurrent ? "text-white" : "text-white/60"
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    "text-xs truncate transition-colors",
                    isCurrent ? "text-white/40" : "text-white/20"
                  )}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors",
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

      {/* Progress Bar */}
      <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{
            width: isCompleted
              ? "100%"
              : `${((currentStepIndex + 1) / WIZARD_STEPS.length) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
