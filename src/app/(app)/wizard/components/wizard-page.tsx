/**
 * Wizard Page - Main Orchestrator Component
 *
 * Full-page wizard experience for content creation.
 * Manages wizard state, step transitions, and API communication.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardStepValue } from "./shared/wizard-steps-indicator";
import { WizardStepsIndicator } from "./shared/wizard-steps-indicator";
import { Step1Inputs } from "./steps/step-1-inputs";
import { Step2Processing } from "./steps/step-2-processing";
import type { PostType } from "@/db/schema";
import {
  Step3Narratives,
  type Narrative,
  type RagConfig,
} from "./steps/step-3-narratives";
import {
  Step4Generation,
  type GeneratedContent,
} from "./steps/step-4-generation";

// Combined form data type for the wizard
export interface WizardFormData {
  contentType?: PostType;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: RagConfig;
  negativeTerms?: string[];
  selectedNarrativeId?: string;
  customInstructions?: string;
}

interface Wizard {
  id: number;
  currentStep: string;
  contentType?: string;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: RagConfig;
  negativeTerms?: string[];
  narratives?: Narrative[];
  selectedNarrativeId?: string;
  customInstructions?: string;
  generatedContent?: string;
  jobStatus?: string;
}

interface WizardPageProps {
  wizardId?: number;
  initialStep?: WizardStepValue;
  onComplete?: (wizardId: number, content: GeneratedContent) => void;
  onClose?: () => void;
  className?: string;
  /** @internal When true, use router navigation instead of callbacks */
  _standalone?: boolean;
}


export function WizardPage({
  wizardId: propWizardId,
  initialStep = "input",
  onComplete,
  onClose,
  className,
  _standalone = false,
}: WizardPageProps) {
  const router = useRouter();
  const [wizardId, setWizardId] = useState<number | null>(propWizardId ?? null);
  const [currentStep, setCurrentStep] = useState<WizardStepValue>(initialStep);
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [formData, setFormData] = useState<WizardFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load wizard data if wizardId is provided
  useEffect(() => {
    if (!propWizardId) return;

    const loadWizard = async () => {
      try {
        const response = await fetch(`/api/wizard/${propWizardId}`);
        if (!response.ok) throw new Error("Failed to load wizard");

        const data: Wizard = await response.json();
        if (isMountedRef.current) {
          setWizard(data);
          setWizardId(data.id);
          setCurrentStep(data.currentStep as WizardStepValue);

          // Restore form data
          setFormData({
            contentType: data.contentType as any,
            numberOfSlides: data.numberOfSlides,
            model: data.model,
            referenceUrl: data.referenceUrl,
            referenceVideoUrl: data.referenceVideoUrl,
            theme: data.theme,
            context: data.context,
            objective: data.objective,
            cta: data.cta,
            targetAudience: data.targetAudience,
            ragConfig: data.ragConfig,
            negativeTerms: data.negativeTerms,
            selectedNarrativeId: data.selectedNarrativeId,
            customInstructions: data.customInstructions,
          });
        }
      } catch (err) {
        console.error("Error loading wizard:", err);
        if (isMountedRef.current) {
          setError("Failed to load wizard");
        }
      }
    };

    loadWizard();

    return () => {
      isMountedRef.current = false;
    };
  }, [propWizardId]);

  // Auto-save effect (debounced)
  const autoSave = useCallback(async (data: WizardFormData) => {
    if (!wizardId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/wizard/${wizardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    }, 1000);
  }, [wizardId]);

  useEffect(() => {
    autoSave(formData);
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, autoSave]);

  // Step 1: Submit input form and create wizard
  const handleSubmitInputs = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create wizard
      const response = await fetch("/api/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create wizard");

      const newWizard: Wizard = await response.json();

      if (isMountedRef.current) {
        setWizardId(newWizard.id);
        setWizard(newWizard);

        // Trigger narratives job
        await fetch(`/api/wizard/${newWizard.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submitType: "narratives" }),
        });

        setCurrentStep("processing");
      }
    } catch (err) {
      console.error("Error submitting inputs:", err);
      if (isMountedRef.current) {
        setError("Failed to start processing. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Step 2: Handle processing completion
  const handleProcessingComplete = async () => {
    if (!wizardId) return;

    // Refresh wizard data to get narratives
    try {
      const response = await fetch(`/api/wizard/${wizardId}`);
      if (response.ok) {
        const data: Wizard = await response.json();
        if (isMountedRef.current) {
          setWizard(data);
          setCurrentStep("narratives");
        }
      }
    } catch (err) {
      console.error("Error loading narratives:", err);
    }
  };

  // Step 2: Handle processing error
  const handleProcessingError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Step 3: Submit narrative selection and trigger generation
  const handleSubmitNarratives = async () => {
    if (!wizardId || !formData.selectedNarrativeId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update wizard with selected narrative
      await fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedNarrativeId: formData.selectedNarrativeId,
          customInstructions: formData.customInstructions,
          ragConfig: formData.ragConfig,
        }),
      });

      // Trigger generation job
      await fetch(`/api/wizard/${wizardId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitType: "generation",
          selectedNarrativeId: formData.selectedNarrativeId,
        }),
      });

      setCurrentStep("generation");
    } catch (err) {
      console.error("Error submitting narrative:", err);
      if (isMountedRef.current) {
        setError("Failed to start generation. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Step 4: Handle generation completion
  const handleGenerationComplete = (content: GeneratedContent) => {
    setCurrentStep("completed");
    if (onComplete) {
      onComplete(wizardId!, content);
    } else {
      // Navigate to library after short delay to show completed state
      setTimeout(() => {
        router.push("/library");
      }, 1500);
    }
  };

  // Step 4: Save content to library
  const handleSaveToLibrary = async (_content: GeneratedContent) => {
    // This would integrate with the library API
    // For now, just mark wizard as completed
    if (!wizardId) return;

    await fetch(`/api/wizard/${wizardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: "completed" }),
    });
  };

  // Step 4: Regenerate content
  const handleRegenerate = () => {
    setCurrentStep("narratives");
  };

  // Handle step click on indicator (navigate back)
  const handleStepClick = (step: WizardStepValue) => {
    // Only allow going back to input or narratives
    if (step === "input" && currentStep === "narratives") {
      setCurrentStep("input");
    }
  };

  // Handle close
  const handleClose = () => {
    // Mark wizard as abandoned if not completed
    if (wizardId && currentStep !== "completed") {
      fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: "abandoned" }),
      }).catch(console.error);
    }
    // Use callback if provided, otherwise navigate
    if (onClose) {
      onClose();
    } else {
      router.push("/chat");
    }
  };

  // Get available narratives from wizard
  const narratives = wizard?.narratives ?? [];

  return (
    <div className={cn("space-y-6 mt-[25px] mb-[25px]", className)}>
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Wizard de Criação</h1>
          <p className="text-sm text-white/60">
            Crie conteúdo para redes sociais com IA
          </p>
        </div>
        <div className="flex items-center gap-3">
          {wizardId && (
            <span className="text-xs text-white/40">
              Wizard #{wizardId}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <WizardStepsIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
          >
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-4 text-red-300 hover:text-red-100"
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step1Inputs
              data={formData}
              onChange={setFormData}
              onSubmit={handleSubmitInputs}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}

        {currentStep === "processing" && wizardId && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step2Processing
              wizardId={wizardId}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
            />
          </motion.div>
        )}

        {currentStep === "narratives" && (
          <motion.div
            key="narratives"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step3Narratives
              narratives={narratives}
              initialData={formData}
              onChange={setFormData}
              onSubmit={handleSubmitNarratives}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}

        {currentStep === "generation" && wizardId && (
          <motion.div
            key="generation"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step4Generation
              wizardId={wizardId}
              contentType={formData.contentType ?? "text"}
              numberOfSlides={formData.numberOfSlides}
              onComplete={handleGenerationComplete}
              onSaveToLibrary={handleSaveToLibrary}
              onRegenerate={handleRegenerate}
            />
          </motion.div>
        )}

        {currentStep === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Wizard Concluído!
            </h2>
            <p className="text-white/60 mb-8">
              Seu conteúdo foi gerado e está pronto para uso.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/library")}
              >
                Ver na Biblioteca
              </Button>
              <Button onClick={() => router.push("/wizard")}>
                Criar Novo Conteúdo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Re-export types for external use
export type { GeneratedContent };
