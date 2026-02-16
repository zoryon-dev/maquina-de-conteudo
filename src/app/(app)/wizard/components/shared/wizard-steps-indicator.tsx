/**
 * Wizard Steps Indicator
 *
 * Visual indicator showing the current step in the wizard flow.
 * Displays progress through 4 condensed UI steps with clickable visited steps.
 *
 * Condensed 4-step flow (v2.1):
 * 1. Configurar = inputs + processing (inline loading)
 * 2. Narrativa = narrative selection + editing
 * 3. Conteudo = text generation + content approval + image generation
 * 4. Finalizar = visual studio + publish actions
 *
 * States:
 * - Visited (past): Clickable, check icon, hover effect
 * - Current: Active/highlighted with glow, not clickable
 * - Future: Disabled, grayed out, not clickable
 */

"use client";

import { motion } from "framer-motion";
import { Check, Settings, BookOpen, FileText, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

// Internal wizard step values (unchanged for backward compatibility)
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
  | "finalizar"          // New finalization step
  | "completed";

// Condensed UI step identifiers
type UIStep = "configurar" | "narrativa" | "conteudo" | "finalizar";

interface UIStepConfig {
  id: UIStep;
  label: string;
  description: string;
  icon: React.ElementType;
}

// The 4 condensed UI steps for non-video content
const CONDENSED_STEPS: UIStepConfig[] = [
  {
    id: "configurar",
    label: "Configurar",
    description: "Defina o briefing",
    icon: Settings,
  },
  {
    id: "narrativa",
    label: "Narrativa",
    description: "Escolha a abordagem",
    icon: BookOpen,
  },
  {
    id: "conteudo",
    label: "Conteudo",
    description: "Revise o conteudo",
    icon: FileText,
  },
  {
    id: "finalizar",
    label: "Finalizar",
    description: "Publique ou salve",
    icon: Flag,
  },
];

// The 4 condensed UI steps for video content
const CONDENSED_VIDEO_STEPS: UIStepConfig[] = [
  {
    id: "configurar",
    label: "Configurar",
    description: "Defina o briefing",
    icon: Settings,
  },
  {
    id: "narrativa",
    label: "Narrativa",
    description: "Escolha a abordagem",
    icon: BookOpen,
  },
  {
    id: "conteudo",
    label: "Conteudo",
    description: "Revise o roteiro",
    icon: FileText,
  },
  {
    id: "finalizar",
    label: "Finalizar",
    description: "Thumbnail e publicacao",
    icon: Flag,
  },
];

/**
 * Maps an internal wizard step value to a condensed UI step index (0-3).
 * This allows the indicator to show which of the 4 UI steps is active
 * regardless of how many internal states exist.
 */
function mapToUIStepIndex(step: WizardStepValue, isVideo: boolean): number {
  if (isVideo) {
    // Video flow mapping
    switch (step) {
      case "video-duration":
      case "input":
      case "processing":
        return 0; // Configurar
      case "narratives":
        return 1; // Narrativa
      case "generation":
      case "content-approval":
        return 2; // Conteudo
      case "titles-selection":
      case "thumbnail-config":
      case "image-generation":
      case "visual-editor":
      case "visual-studio":
      case "finalizar":
        return 3; // Finalizar
      case "completed":
        return 4; // Past all steps
      default:
        return 0;
    }
  }

  // Non-video flow mapping
  switch (step) {
    case "input":
    case "processing":
      return 0; // Configurar
    case "narratives":
      return 1; // Narrativa
    case "generation":
    case "content-approval":
    case "image-generation":
      return 2; // Conteudo
    case "visual-editor":
    case "visual-studio":
    case "finalizar":
      return 3; // Finalizar
    case "completed":
      return 4; // Past all steps
    default:
      return 0;
  }
}

/**
 * Maps a condensed UI step index back to the first internal wizard step for navigation.
 */
function uiStepToWizardStep(uiStepIndex: number, isVideo: boolean): WizardStepValue {
  if (isVideo) {
    const mapping: WizardStepValue[] = ["video-duration", "narratives", "generation", "titles-selection"];
    return mapping[uiStepIndex] ?? "video-duration";
  }

  const mapping: WizardStepValue[] = ["input", "narratives", "generation", "visual-studio"];
  return mapping[uiStepIndex] ?? "input";
}

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
  const isVideo = contentType === "video";
  const steps = isVideo ? CONDENSED_VIDEO_STEPS : CONDENSED_STEPS;

  // Determine the current UI step index (0-3)
  const currentUIIndex = mapToUIStepIndex(currentStep, isVideo);

  // For completed state, show all as completed
  const isCompleted = currentStep === "completed" || currentUIIndex >= steps.length;

  return (
    <div className={cn("w-full", className)}>
      {/* Steps container */}
      <div className="flex items-center justify-between px-1">
        {steps.map((step, index) => {
          const isPast = index < currentUIIndex || isCompleted;
          const isCurrent = index === currentUIIndex && !isCompleted;
          const isFuture = index > currentUIIndex && !isCompleted;
          // Allow clicking on past steps to navigate back
          const isClickable = onStepClick && isPast;

          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              {/* Step Circle + Label */}
              <div
                className={cn(
                  "flex items-center gap-2.5",
                  isClickable && "cursor-pointer group"
                )}
                onClick={() => {
                  if (isClickable) {
                    const wizardStep = uiStepToWizardStep(index, isVideo);
                    onStepClick(wizardStep);
                  }
                }}
              >
                {/* Step Circle */}
                <motion.div
                  className={cn(
                    "relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                    // Past (visited) steps
                    isPast && !isClickable &&
                      "border-primary bg-primary text-primary-foreground",
                    isPast && isClickable &&
                      "border-primary bg-primary text-primary-foreground cursor-pointer group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30",
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
                  {isPast ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Icon className="w-4 h-4" />
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
                </motion.div>

                {/* Step Label */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate transition-colors",
                      isCurrent
                        ? "text-white"
                        : isPast && isClickable
                          ? "text-white/70 group-hover:text-white"
                          : isPast
                            ? "text-white/60"
                            : "text-white/40"
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] truncate transition-colors hidden sm:block",
                      isCurrent ? "text-white/50" : "text-white/25"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3">
                  <div
                    className={cn(
                      "h-0.5 transition-colors rounded-full",
                      index < currentUIIndex || isCompleted
                        ? "bg-primary"
                        : "bg-white/10"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{
            width: isCompleted
              ? "100%"
              : `${((currentUIIndex + 1) / steps.length) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
