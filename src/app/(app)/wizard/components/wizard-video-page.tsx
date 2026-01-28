/**
 * Wizard Video Page - Video-Specific Content Creation
 *
 * Dedicated wizard for video script creation.
 * Separate from the general wizard to provide a tailored experience.
 *
 * Flow:
 * 1. Configuration (duration, intention, theme, RAG, etc)
 * 2. Narratives (AI-generated narrative options)
 * 3. Script (generated script with approve/refactor)
 * 4. Titles (5 thumbnail title options)
 * 5. Thumbnail (style, photo, references, prompt)
 * 6. Processing modal → Library
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProcessingModal } from "@/components/ui/processing-modal";
import type { PostType } from "@/db/schema";

// Video-specific steps
import { StepVideoConfiguration } from "./steps/video/step-video-configuration";
import { Step3Narratives, type Narrative, type SynthesizedResearch } from "./steps/step-3-narratives";
import { type RagConfig } from "./shared/document-config-form";
import { StepVideoScript } from "./steps/video/step-video-script";
import { StepVideoTitles } from "./steps/video/step-video-titles";
import { StepVideoThumbnail } from "./steps/video/step-video-thumbnail";

import type { VideoDuration } from "@/lib/wizard-services/types";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";
import type { VideoScriptStructured } from "@/lib/wizard-services/types";

// ============================================================================
// TYPES
// ============================================================================

export type VideoWizardStep =
  | "configuration"
  | "narratives"
  | "script"
  | "titles"
  | "thumbnail";

export interface VideoWizardFormData {
  // Basic content info
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;

  // Video-specific
  videoDuration?: VideoDuration;
  videoIntention?: string;
  customVideoIntention?: string;

  // RAG/Knowledge
  ragConfig?: RagConfig;

  // Narratives
  selectedNarrativeId?: string;
  customInstructions?: string;

  // Generated content
  generatedScript?: string; // VideoScriptStructured as JSON string

  // Thumbnail
  selectedTitle?: VideoTitleOption;
  thumbnailConfig?: {
    estilo: string;
    expressao?: string;
    referenciaImagem1?: string;
    referenciaImagem2?: string;
    instrucoesCustomizadas?: string;
    tipoFundo?: string;
    corTexto?: string;
    posicaoTexto?: string;
    tipoIluminacao?: string;
  };
}

interface VideoWizard {
  id: number;
  currentStep: string;
  contentType?: PostType;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  videoDuration?: string;
  videoIntention?: string;
  customVideoIntention?: string;
  ragConfig?: RagConfig;
  narratives?: Narrative[];
  selectedNarrativeId?: string;
  customInstructions?: string;
  generatedContent?: string;
  synthesizedResearch?: SynthesizedResearch | null;
}

interface VideoWizardPageProps {
  wizardId?: number;
  initialStep?: VideoWizardStep;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WizardVideoPage({
  wizardId: propWizardId,
  initialStep = "configuration",
  onClose,
  className,
}: VideoWizardPageProps) {
  const router = useRouter();
  const [wizardId, setWizardId] = useState<number | null>(propWizardId ?? null);
  const [currentStep, setCurrentStep] = useState<VideoWizardStep>(initialStep);
  const [wizard, setWizard] = useState<VideoWizard | null>(null);
  const [formData, setFormData] = useState<VideoWizardFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  // Polling refs for async data updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());
  const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Load wizard data if wizardId is provided
  useEffect(() => {
    if (!propWizardId) return;

    const loadWizard = async () => {
      try {
        const response = await fetch(`/api/wizard/${propWizardId}`);
        if (!response.ok) throw new Error("Failed to load wizard");

        const data: VideoWizard = await response.json();
        if (isMountedRef.current) {
          setWizard(data);
          setWizardId(data.id);
          setCurrentStep(data.currentStep as VideoWizardStep);

          // Restore form data
          setFormData({
            theme: data.theme,
            context: data.context,
            objective: data.objective,
            cta: data.cta,
            targetAudience: data.targetAudience,
            videoDuration: data.videoDuration as VideoDuration | undefined,
            videoIntention: data.videoIntention,
            customVideoIntention: data.customVideoIntention,
            ragConfig: data.ragConfig,
            selectedNarrativeId: data.selectedNarrativeId,
            customInstructions: data.customInstructions,
            generatedScript: data.generatedContent || undefined,
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

  // Auto-save effect
  const autoSave = useCallback(async (data: VideoWizardFormData) => {
    if (!wizardId) return;

    try {
      await fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  }, [wizardId]);

  useEffect(() => {
    autoSave(formData);
  }, [formData, autoSave]);

  // Poll for wizard data updates (narratives, script, etc.)
  // This ensures the UI updates when background jobs complete
  useEffect(() => {
    if (!wizardId) return;

    const pollWizard = async () => {
      try {
        // Check timeout
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > POLLING_TIMEOUT) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        const response = await fetch(`/api/wizard/${wizardId}`);
        if (!response.ok) return;

        const data: VideoWizard = await response.json();

        // Update wizard state with fresh data
        if (isMountedRef.current) {
          // Check if narratives are now available (and we didn't have them before)
          const hadNarratives = wizard?.narratives && wizard.narratives.length > 0;
          const hasNarrativesNow = data.narratives && data.narratives.length > 0;

          // Update wizard data
          setWizard(data);

          // Restore form data from fresh wizard data
          setFormData((prev) => ({
            ...prev,
            theme: data.theme,
            context: data.context,
            objective: data.objective,
            cta: data.cta,
            targetAudience: data.targetAudience,
            videoDuration: data.videoDuration as VideoDuration | undefined,
            videoIntention: data.videoIntention,
            customVideoIntention: data.customVideoIntention,
            ragConfig: data.ragConfig,
            selectedNarrativeId: data.selectedNarrativeId || prev.selectedNarrativeId,
            customInstructions: data.customInstructions || prev.customInstructions,
            generatedScript: data.generatedContent || prev.generatedScript,
          }));

          // Stop polling if narratives are ready and we're on narratives step
          if (hasNarrativesNow && !hadNarratives && currentStep === "narratives") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }

          // Stop polling if script is ready and we're on script step
          const hadScript = wizard?.generatedContent;
          const hasScriptNow = data.generatedContent;
          if (hasScriptNow && !hadScript && currentStep === "script") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Error polling wizard:", err);
      }
    };

    // Only poll if we're in a step that needs async data
    const needsPolling =
      (currentStep === "narratives" && (!wizard?.narratives || wizard.narratives.length === 0)) ||
      (currentStep === "script" && !wizard?.generatedContent);

    if (needsPolling) {
      // Initial poll
      pollWizard();

      // Set up interval (every 2 seconds)
      pollIntervalRef.current = setInterval(pollWizard, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [wizardId, currentStep, wizard]);

  // Reset polling timer when step changes
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentStep]);

  // Step 1: Configuration → Create wizard and generate narratives
  const handleConfigurationSubmit = async (data: VideoWizardFormData) => {
    setError(null);

    try {
      // Create or update wizard
      const url = wizardId ? `/api/wizard/${wizardId}` : "/api/wizard";
      const response = await fetch(url, {
        method: wizardId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          contentType: "video",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.details || "Failed to save configuration");
      }

      const newWizard: VideoWizard = await response.json();

      if (isMountedRef.current) {
        setWizardId(newWizard.id);
        setWizard(newWizard);
        setFormData(data);

        // Trigger narratives job
        await fetch(`/api/wizard/${newWizard.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submitType: "narratives" }),
        });

        setCurrentStep("narratives");
      }
    } catch (err) {
      console.error("Error submitting configuration:", err);
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    }
  };

  // Step 2: Narratives → Generate script
  const handleNarrativesSubmit = async () => {
    if (!wizardId || !formData.selectedNarrativeId) return;

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

      // Trigger script generation
      await fetch(`/api/wizard/${wizardId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitType: "generation",
          selectedNarrativeId: formData.selectedNarrativeId,
        }),
      });

      setCurrentStep("script");
    } catch (err) {
      console.error("Error submitting narratives:", err);
      setError("Failed to generate script. Please try again.");
    }
  };

  // Step 3: Script → Proceed to titles
  const handleScriptApprove = (script: string) => {
    setFormData((prev) => ({ ...prev, generatedScript: script }));
    setCurrentStep("titles");
  };

  // Step 4: Titles → Proceed to thumbnail
  const handleTitleSelected = (title: VideoTitleOption) => {
    setFormData((prev) => ({ ...prev, selectedTitle: title }));
    setCurrentStep("thumbnail");
  };

  // Step 5: Thumbnail → Queue generation and show modal
  const handleThumbnailSubmit = async (thumbnailConfig: {
    estilo: string;
    expressao?: string;
    referenciaImagem1?: string;
    referenciaImagem2?: string;
    instrucoesCustomizadas?: string;
    tipoFundo?: string;
    corTexto?: string;
    posicaoTexto?: string;
    tipoIluminacao?: string;
  }) => {
    if (!wizardId) return;
    setError(null);

    try {
      // Parse roteiro context
      let roteiroContext: Record<string, unknown> = {};
      if (formData.generatedScript) {
        try {
          const parsed = JSON.parse(formData.generatedScript);
          if (parsed.meta && parsed.roteiro && parsed.thumbnail) {
            roteiroContext = {
              valorCentral: parsed.meta?.valor_central || "",
              hookTexto: parsed.roteiro?.hook?.texto || "",
              thumbnailTitulo: parsed.thumbnail?.titulo || "",
              thumbnailEstilo: parsed.thumbnail?.estilo || "",
            };
          }
        } catch {
          // Could not parse generatedScript - continue with empty context
        }
      }

      // Queue thumbnail generation
      const response = await fetch(`/api/wizard/${wizardId}/queue-thumbnail-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thumbnailTitle: formData.selectedTitle?.title || "",
          estilo: thumbnailConfig.estilo,
          contextoTematico: formData.theme || "",
          expressao: thumbnailConfig.expressao,
          referenciaImagem1: thumbnailConfig.referenciaImagem1,
          referenciaImagem2: thumbnailConfig.referenciaImagem2,
          roteiroContext,
          instrucoesCustomizadas: thumbnailConfig.instrucoesCustomizadas,
          tipoFundo: thumbnailConfig.tipoFundo,
          corTexto: thumbnailConfig.corTexto,
          posicaoTexto: thumbnailConfig.posicaoTexto,
          tipoIluminacao: thumbnailConfig.tipoIluminacao,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to queue thumbnail generation");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to queue job");
      }

      setQueuedJobId(data.jobId);
      setShowProcessingModal(true);
    } catch (err) {
      console.error("Error queuing thumbnail generation:", err);
      setError(err instanceof Error ? err.message : "Failed to queue thumbnail generation");
    }
  };

  const handleClose = () => {
    if (wizardId) {
      fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: "abandoned" }),
      }).catch(console.error);
    }
    if (onClose) {
      onClose();
    } else {
      router.push("/wizard");
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-semibold text-white">Wizard de Vídeo</h1>
          </div>
          <p className="text-sm text-white/60">
            Crie roteiros de vídeo com IA
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

      {/* Progress Indicator */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          {[
            { step: "configuration", label: "Configuração" },
            { step: "narratives", label: "Narrativas" },
            { step: "script", label: "Roteiro" },
            { step: "titles", label: "Títulos" },
            { step: "thumbnail", label: "Thumbnail" },
          ].map((item, index) => {
            const isCurrent = currentStep === item.step;
            const isPast = [
              "configuration",
              "narratives",
              "script",
              "titles",
              "thumbnail",
            ].indexOf(currentStep) > index;

            return (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                      isCurrent
                        ? "bg-primary text-black"
                        : isPast
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-white/40"
                    )}
                  >
                    {isPast ? <span>✓</span> : index + 1}
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-1 transition-colors",
                      isCurrent
                        ? "text-white"
                        : isPast
                        ? "text-primary"
                        : "text-white/40"
                    )}
                  >
                    {item.label}
                  </p>
                </div>
                {index < 4 && (
                  <div
                    className={cn(
                      "h-px w-8 mx-2 transition-colors",
                      isPast ? "bg-primary/50" : "bg-white/10"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
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
        {currentStep === "configuration" && (
          <motion.div
            key="configuration"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVideoConfiguration
              initialData={formData}
              wizardId={wizardId ?? undefined}
              onSubmit={handleConfigurationSubmit}
            />
          </motion.div>
        )}

        {currentStep === "narratives" && wizardId && (
          <motion.div
            key="narratives"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step3Narratives
              narratives={wizard?.narratives ?? []}
              synthesizedResearch={wizard?.synthesizedResearch}
              initialData={formData}
              onChange={setFormData}
              onSubmit={handleNarrativesSubmit}
            />
          </motion.div>
        )}

        {currentStep === "script" && wizardId && (
          <motion.div
            key="script"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVideoScript
              wizardId={wizardId}
              generatedScript={formData.generatedScript}
              onApprove={handleScriptApprove}
            />
          </motion.div>
        )}

        {currentStep === "titles" && wizardId && (
          <motion.div
            key="titles"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVideoTitles
              wizardId={wizardId}
              generatedScript={formData.generatedScript}
              theme={formData.theme}
              targetAudience={formData.targetAudience}
              objective={formData.objective}
              onTitleSelected={handleTitleSelected}
            />
          </motion.div>
        )}

        {currentStep === "thumbnail" && wizardId && formData.selectedTitle && (
          <motion.div
            key="thumbnail"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVideoThumbnail
              wizardId={wizardId}
              selectedTitle={formData.selectedTitle}
              theme={formData.theme}
              generatedScript={formData.generatedScript}
              onSubmit={handleThumbnailSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={showProcessingModal}
        title="Gerando Thumbnail e SEO"
        message="Estamos construindo sua thumbnail, gerando metadata de SEO e organizando tudo na Biblioteca. Você será redirecionado em instantes!"
        redirectPath="/library"
        jobId={queuedJobId ?? undefined}
        jobType="wizard_thumbnail_generation"
      />
    </div>
  );
}
