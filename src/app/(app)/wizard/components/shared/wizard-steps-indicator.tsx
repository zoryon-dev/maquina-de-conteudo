/**
 * Wizard Steps Indicator
 *
 * Visual indicator showing the current step in the wizard flow.
 * Displays progress through steps with clickable visited steps.
 *
 * States:
 * - Visited (past): Clickable, check icon, hover effect
 * - Current: Active/highlighted with glow, not clickable
 * - Future: Disabled, grayed out, not clickable
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
  | "visual-editor"      // Legacy - kept for backwards compatibility
  | "image-generation"   // Legacy - kept for backwards compatibility
  | "visual-studio"      // New unified visual editor step
  | "completed";

interface WizardStep {
  value: WizardStepValue;
  label: string;
  description: string;
}

// Steps for non-video content (text, image, carousel, story)
// Unified flow: Briefing → Processing → Narratives → Text Approval → Visual Studio
const NON_VIDEO_STEPS: WizardStep[] = [
  {
    value: "input",
    label: "Briefing",
    description: "Configure seu conteudo",
  },
  {
    value: "processing",
    label: "Processando",
    description: "Analisando referencias",
  },
  {
    value: "narratives",
    label: "Narrativas",
    description: "Escolha uma opcao",
  },
  {
    value: "generation",
    label: "Geracao",
    description: "Gerando seu conteudo",
  },
  {
    value: "content-approval",
    label: "Texto",
    description: "Aprove o conteudo",
  },
  {
    value: "visual-studio",
    label: "Visual",
    description: "Design final",
  },
];

// Steps for video content
const VIDEO_STEPS: WizardStep[] = [
  {
    value: "video-duration",
    label: "Duracao",
    description: "Tempo do video",
  },
  {
    value: "input",
    label: "Briefing",
    description: "Configure seu conteudo",
  },
  {
    value: "processing",
    label: "Processando",
    description: "Analisando referencias",
  },
  {
    value: "narratives",
    label: "Narrativas",
    description: "Escolha uma opcao",
  },
  {
    value: "content-approval",
    label: "Aprovacao",
    description: "Revise o conteudo",
  },
  {
    value: "titles-selection",
    label: "Titulo",
    description: "Escolha o titulo",
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

// Steps that should NOT be navigable (processing/auto-transition steps)
const NON_NAVIGABLE_STEPS: WizardStepValue[] = ["processing", "generation"];

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
            const isFuture = index > currentStepIndex && !isCompleted;
            const isNonNavigable = NON_NAVIGABLE_STEPS.includes(step.value);
            const isClickable =
              onStepClick && isPast && !isNonNavigable;

            return (
              <div key={step.value} className="flex items-center">
                {/* Step Circle */}
                <motion.button
                  onClick={() => isClickable && onStepClick(step.value)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                    // Past (visited) steps
                    isPast && !isClickable &&
                      "border-primary bg-primary text-primary-foreground",
                    isPast && isClickable &&
                      "border-primary bg-primary text-primary-foreground cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-primary/30 active:scale-95",
                    // Current step
                    isCurrent &&
                      "border-primary bg-primary text-primary-foreground cursor-default",
                    // Future steps
                    isFuture &&
                      "border-white/20 bg-white/5 text-white/40 cursor-default"
                  )}
                  whileHover={isClickable ? { scale: 1.1 } : undefined}
                  whileTap={isClickable ? { scale: 0.95 } : undefined}
                >
                  {isPast || (isCompleted && index <= currentStepIndex) ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full bg-current"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
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

                {/* Step Label */}
                <div
                  className={cn(
                    "ml-2 mr-3 min-w-0 max-w-[100px] sm:max-w-[120px]",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={() => isClickable && onStepClick(step.value)}
                >
                  <p
                    className={cn(
                      "text-xs font-medium truncate transition-colors hidden sm:block",
                      isCurrent
                        ? "text-white"
                        : isPast && isClickable
                          ? "text-white/70 hover:text-white"
                          : isPast
                            ? "text-white/60"
                            : "text-white/40"
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

                {/* Connector Line */}
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
