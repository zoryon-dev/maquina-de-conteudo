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
import { ProcessingModal } from "@/components/ui/processing-modal";
import {
  ErrorFeedback,
  getSpecificErrorMessage,
} from "@/components/ui/error-feedback";
import type { WizardStepValue } from "./shared/wizard-steps-indicator";
import { WizardStepsIndicator } from "./shared/wizard-steps-indicator";
import { Step1Inputs } from "./steps/step-1-inputs";
import { Step2Processing } from "./steps/step-2-processing";
import { StepVideoDuration } from "./steps/step-video-duration";
import { StepContentApproval } from "./steps/step-content-approval";
import type { PostType } from "@/db/schema";
import {
  Step3Narratives,
  type Narrative,
  type SynthesizedResearch,
} from "./steps/step-3-narratives";
import type { RagConfig } from "@/lib/wizard-services/types";
import {
  Step4Generation,
  type GeneratedContent,
} from "./steps/step-4-generation";
import { StepTitlesSelection } from "./steps/step-titles-selection";
import type { VideoTitleOption } from "@/lib/wizard-services/video-titles.service";
import {
  StepThumbnailConfig,
  type GeneratedThumbnailData,
} from "./steps/step-thumbnail-config";
import {
  Step5ImageGeneration,
  type GeneratedContent as Step5GeneratedContent,
} from "./steps/step-5-image-generation";
import { StepVisualEditor } from "./steps/step-visual-editor";
import { StepVisualStudio } from "./steps/step-visual-studio";
import type { ImageGenerationConfig, GeneratedImage } from "@/lib/wizard-services/client";
import type { VideoDuration } from "@/lib/wizard-services/types";

// Combined form data type for the wizard
export interface WizardFormData {
  contentType?: PostType;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  videoDuration?: VideoDuration; // NEW: Video duration selection
  videoIntention?: string; // NEW: Video intention (predefined)
  customVideoIntention?: string; // NEW: Custom video intention
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: RagConfig;
  negativeTerms?: string[];
  selectedNarrativeId?: string;
  customInstructions?: string;
  generatedContent?: string;
  imageGenerationConfig?: ImageGenerationConfig;
  generatedImages?: GeneratedImage[];
  selectedVideoTitle?: VideoTitleOption; // NEW: Selected title for video thumbnail
  generatedThumbnailData?: GeneratedThumbnailData; // NEW: Generated thumbnail data
  // v4.1: Visual template integration
  visualTemplate?: string;
  visualTemplateConfig?: {
    applyToAllSlides?: boolean;
    autoGenerateImages?: boolean;
    useBrandColors?: boolean;
  };
  mappedStudioContent?: import("@/lib/wizard-services/content-mapper").MappedContent;
  /** Edited/custom narratives from Step 3 - saved to server on submit */
  editedNarratives?: Narrative[];
}

interface Wizard {
  id: number;
  currentStep: string;
  contentType?: string;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  videoDuration?: string; // NEW: Video duration
  videoIntention?: string; // NEW: Video intention
  customVideoIntention?: string; // NEW: Custom video intention
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
  synthesizedResearch?: SynthesizedResearch | null;
  imageGenerationConfig?: ImageGenerationConfig | null;
  generatedImages?: GeneratedImage[] | null;
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
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load wizard data if wizardId is provided
  useEffect(() => {
    if (!propWizardId) return;
    isMountedRef.current = true;

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
            videoDuration: data.videoDuration as VideoDuration | undefined,
            videoIntention: data.videoIntention,
            customVideoIntention: data.customVideoIntention,
            theme: data.theme,
            context: data.context,
            objective: data.objective,
            cta: data.cta,
            targetAudience: data.targetAudience,
            ragConfig: data.ragConfig,
            negativeTerms: data.negativeTerms,
            selectedNarrativeId: data.selectedNarrativeId,
            customInstructions: data.customInstructions,
            generatedContent: data.generatedContent || undefined,
            imageGenerationConfig: data.imageGenerationConfig || undefined,
            generatedImages: data.generatedImages || undefined,
          });
        }
      } catch (err) {
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

  // Auto-save effect (debounced) — skip while loading existing wizard
  const autoSave = useCallback(async (data: WizardFormData) => {
    if (!wizardId) return;
    if (propWizardId && !wizard) return;

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
        // Silent fail - auto-save error
      }
    }, 1000);
  }, [wizardId, propWizardId, wizard]);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error", details: "No details" }));
        throw new Error(errorData.details || errorData.error || "Failed to create wizard");
      }

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
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start processing. Please try again.";
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Step 1.5: Handle video duration and intention selection
  const handleVideoDurationSelected = async (
    duration: VideoDuration,
    intention?: string,
    customIntention?: string
  ) => {
    // Save duration and intention to formData
    setFormData((prev) => ({
      ...prev,
      videoDuration: duration,
      videoIntention: intention,
      customVideoIntention: customIntention,
      contentType: "video", // Auto-set content type to video
    }));

    // Proceed to input step for additional configuration
    setCurrentStep("input");
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
      // Silent fail - narratives loading error
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
      // Update wizard with selected narrative (and edited narratives if any)
      const patchBody: Record<string, unknown> = {
        selectedNarrativeId: formData.selectedNarrativeId,
        customInstructions: formData.customInstructions,
        ragConfig: formData.ragConfig,
      };
      // If narratives were edited/added locally, save them to the server
      if (formData.editedNarratives && formData.editedNarratives.length > 0) {
        patchBody.narratives = formData.editedNarratives;
      }
      await fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });

      // Trigger generation job for ALL content types (including video)
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
      if (isMountedRef.current) {
        setError("Failed to start generation. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Step 3.5: Handle content approval
  const handleContentApproval = async (approvedContent: string) => {
    if (!wizardId) return;

    // Save approved content to formData
    setFormData((prev) => ({
      ...prev,
      generatedContent: approvedContent,
    }));

    // Determine next step based on content type
    const contentType = formData.contentType;

    if (contentType === "video") {
      // Videos go to title selection
      setCurrentStep("titles-selection");
    } else if (contentType === "carousel" || contentType === "image") {
      // Carousels and images go to the unified Visual Studio
      // Template selection now happens AFTER content approval, not in briefing
      setCurrentStep("visual-studio");
    } else {
      // Text posts go directly to completion
      setCurrentStep("completed");
    }
  };

  // Step 3.6: Handle visual editor save (legacy)
  const handleVisualEditorSave = (updatedContent: import("@/lib/wizard-services/content-mapper").MappedContent) => {
    // Update formData with edited content from visual editor
    setFormData((prev) => ({
      ...prev,
      mappedStudioContent: updatedContent,
    }));

    // Proceed to image generation
    setCurrentStep("image-generation");
  };

  // Step: Handle Visual Studio completion (new unified flow)
  const handleVisualStudioComplete = (libraryItemId: number) => {
    console.log("[Wizard] Visual Studio completed, library item:", libraryItemId);
    setCurrentStep("completed");

    // Call onComplete callback with the generated content
    if (onComplete && formData.generatedContent) {
      try {
        const content = typeof formData.generatedContent === 'string'
          ? JSON.parse(formData.generatedContent)
          : formData.generatedContent;
        onComplete(wizardId!, content);
      } catch {
        // If parse fails, pass as string
        onComplete(wizardId!, formData.generatedContent as any);
      }
    }
  };

  // Step 3.5: Handle title selection and proceed to thumbnail configuration
  const handleTitleSelected = async (title: VideoTitleOption) => {
    if (!wizardId) return;

    // Save selected title to formData
    setFormData((prev) => ({
      ...prev,
      selectedVideoTitle: title,
    }));

    // Proceed to thumbnail configuration (script already generated)
    setCurrentStep("thumbnail-config");
  };

  // Step 6: Queue thumbnail generation (async via queue like carousels)
  const handleQueueThumbnailGeneration = async (config: {
    thumbnailTitle: string;
    estilo: string;
    contextoTematico: string;
    expressao?: string;
    referenciaImagem1?: string;
    referenciaImagem2?: string;
    roteiroContext?: Record<string, unknown>;
    instrucoesCustomizadas?: string;
    tipoFundo?: string;
    corTexto?: string;
    posicaoTexto?: string;
    tipoIluminacao?: string;
  }) => {
    if (!wizardId) return;
    setError(null);

    try {
      // Parse roteiro context from generated content if available
      let roteiroContext = config.roteiroContext || {};
      if (!roteiroContext || Object.keys(roteiroContext).length === 0) {
        if (formData.generatedContent) {
          try {
            const parsed = JSON.parse(formData.generatedContent);
            if (parsed.meta && parsed.roteiro && parsed.thumbnail) {
              roteiroContext = {
                valorCentral: parsed.meta?.valor_central || "",
                hookTexto: parsed.roteiro?.hook?.texto || "",
                thumbnailTitulo: parsed.thumbnail?.titulo || "",
                thumbnailEstilo: parsed.thumbnail?.estilo || "",
              };
            }
          } catch {
            // Could not parse generatedContent - continue with empty context
          }
        }
      }

      // Queue thumbnail generation via API (returns immediately with jobId)
      const response = await fetch(`/api/wizard/${wizardId}/queue-thumbnail-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          roteiroContext,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to queue thumbnail generation";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Store jobId for processing modal
      setQueuedJobId(data.jobId);

      // Show processing modal - it will auto-redirect to library
      setShowProcessingModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue thumbnail generation");
    }
  };

  // Step 4: Handle generation completion - transition based on content type
  const handleGenerationComplete = (content: GeneratedContent) => {
    // Store generated content in formData for use in next steps
    // Preserve structured content (object) when possible, only stringify if it's already a string
    const contentToStore = typeof content === 'string' ? content : JSON.stringify(content);

    setFormData((prev) => ({
      ...prev,
      generatedContent: contentToStore,
    }));

    // ALL content types go to content-approval FIRST
    // The content-approval step will handle routing to the next appropriate step
    setCurrentStep("content-approval");
  };

  // Step 5: Handle content editing
  const handleContentChange = (content: Step5GeneratedContent) => {
    // Update formData with edited content
    setFormData((prev) => ({
      ...prev,
      generatedContent: JSON.stringify(content),
    }));
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

  // Step 5: Handle image generation (async via queue)
  const handleGenerateImage = async (config: ImageGenerationConfig) => {
    if (!wizardId) return;
    setError(null);

    try {

      // Save config to wizard
      await fetch(`/api/wizard/${wizardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageGenerationConfig: config,
        }),
      });

      // Queue image generation via API (returns immediately with jobId)
      const response = await fetch(`/api/wizard/${wizardId}/queue-image-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        // Try to get detailed error from response
        let errorMessage = "Failed to queue image generation";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Store jobId for processing modal
      setQueuedJobId(data.jobId);

      // Show processing modal - it will auto-redirect to dashboard
      setShowProcessingModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue image generation");
    }
  };

  const handleSelectImage = (image: GeneratedImage) => {
    setFormData((prev) => ({
      ...prev,
      selectedImage: image,
    }));
  };

  const handleImageGenerationComplete = () => {
    setCurrentStep("completed");
    // Call onComplete callback with the generated content
    if (onComplete && formData.generatedContent) {
      try {
        const content = typeof formData.generatedContent === 'string'
          ? JSON.parse(formData.generatedContent)
          : formData.generatedContent;
        onComplete(wizardId!, content);
      } catch {
        // If parse fails, pass as string
        onComplete(wizardId!, formData.generatedContent as any);
      }
    }
  };

  // Handle step click on indicator (navigate back to any visited step)
  const handleStepClick = (step: WizardStepValue) => {
    // Determine step order based on content type
    const steps = formData.contentType === "video"
      ? ["video-duration", "input", "processing", "narratives", "content-approval", "titles-selection", "generation", "thumbnail-config", "image-generation"]
      : ["input", "processing", "narratives", "generation", "content-approval", "visual-studio"];

    const currentIndex = steps.indexOf(currentStep);
    const targetIndex = steps.indexOf(step);

    // Only allow navigating back (to visited steps), never forward
    // Also skip processing/generation steps (they are auto-transition)
    if (targetIndex < currentIndex && step !== "processing" && step !== "generation") {
      setCurrentStep(step);
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
      }).catch(() => {});
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
    <div className={cn("space-y-6", className)}>
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
          contentType={formData.contentType}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <ErrorFeedback
            message={getSpecificErrorMessage(error).message}
            suggestion={getSpecificErrorMessage(error).suggestion}
            onDismiss={() => setError(null)}
            onRetry={
              currentStep === "processing" || currentStep === "generation"
                ? () => {
                    setError(null);
                    setCurrentStep("input");
                  }
                : undefined
            }
            retryLabel="Voltar ao Briefing"
            variant="inline"
          />
        )}
      </AnimatePresence>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === "video-duration" && (
          <motion.div
            key="video-duration"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVideoDuration
              initialDuration={formData.videoDuration}
              initialIntention={formData.videoIntention}
              initialCustomIntention={formData.customVideoIntention}
              onSelect={handleVideoDurationSelected}
            />
          </motion.div>
        )}

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
              synthesizedResearch={wizard?.synthesizedResearch}
              initialData={formData}
              onChange={setFormData}
              onSubmit={handleSubmitNarratives}
              isSubmitting={isSubmitting}
              wizardId={wizardId ?? undefined}
            />
          </motion.div>
        )}

        {currentStep === "content-approval" && wizardId && formData.generatedContent && (
          <motion.div
            key="content-approval"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepContentApproval
              wizardId={wizardId}
              contentType={formData.contentType ?? "text"}
              generatedContent={formData.generatedContent}
              onApprove={handleContentApproval}
              onRegenerate={handleRegenerate}
              onBack={() => setCurrentStep("narratives")}
            />
          </motion.div>
        )}

        {currentStep === "visual-editor" && formData.mappedStudioContent && (
          <motion.div
            key="visual-editor"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVisualEditor
              mappedContent={formData.mappedStudioContent}
              onSave={handleVisualEditorSave}
              onBack={() => setCurrentStep("content-approval")}
              onSkip={() => setCurrentStep("image-generation")}
            />
          </motion.div>
        )}

        {currentStep === "visual-studio" && wizardId && formData.generatedContent && (
          <motion.div
            key="visual-studio"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepVisualStudio
              wizardId={wizardId}
              generatedContent={formData.generatedContent}
              contentType={formData.contentType ?? "carousel"}
              onComplete={handleVisualStudioComplete}
              onBack={() => setCurrentStep("content-approval")}
            />
          </motion.div>
        )}

        {currentStep === "titles-selection" && wizardId && (
          <motion.div
            key="titles-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepTitlesSelection
              wizardId={wizardId}
              generatedContent={formData.generatedContent || "{}"}
              narrativeAngle={wizard?.narratives?.find(n => n.id === formData.selectedNarrativeId)?.angle || "tradutor"}
              narrativeTitle={wizard?.narratives?.find(n => n.id === formData.selectedNarrativeId)?.title || ""}
              narrativeDescription={wizard?.narratives?.find(n => n.id === formData.selectedNarrativeId)?.description || ""}
              theme={formData.theme}
              targetAudience={formData.targetAudience}
              objective={formData.objective}
              onTitleSelected={handleTitleSelected}
              onBack={() => setCurrentStep("narratives")}
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

        {currentStep === "thumbnail-config" && wizardId && formData.selectedVideoTitle && (
          <motion.div
            key="thumbnail-config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StepThumbnailConfig
              wizardId={wizardId}
              selectedTitle={formData.selectedVideoTitle}
              contextoTematico={formData.theme ?? ""}
              theme={formData.theme}
              generatedContent={formData.generatedContent}
              onQueue={handleQueueThumbnailGeneration}
              onBack={() => setCurrentStep("titles-selection")}
            />
          </motion.div>
        )}

        {currentStep === "image-generation" && wizardId && (
          <motion.div
            key="image-generation"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Step5ImageGeneration
              slideContent={formData.generatedContent}
              slideNumber={1}
              totalSlides={formData.numberOfSlides}
              initialConfig={formData.imageGenerationConfig}
              generatedImages={formData.generatedImages}
              isGenerating={isSubmitting}
              onGenerate={handleGenerateImage}
              onSelect={handleSelectImage}
              onSubmit={handleImageGenerationComplete}
              onContentChange={handleContentChange}
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

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={showProcessingModal}
        title={
          formData.contentType === "video"
            ? "Gerando Thumbnail e SEO"
            : "Gerando Imagens"
        }
        message={
          formData.contentType === "video"
            ? "Estamos construindo sua thumbnail, gerando metadata de SEO e organizando tudo na Biblioteca. Você será redirecionado em instantes!"
            : "Suas imagens estão sendo geradas em segundo plano. Você será notificado quando estiverem prontas!"
        }
        redirectPath={formData.contentType === "video" ? "/library" : "/dashboard"}
        jobId={queuedJobId ?? undefined}
        jobType={
          formData.contentType === "video"
            ? "wizard_thumbnail_generation"
            : "wizard_image_generation"
        }
      />
    </div>
  );
}

// Re-export types for external use
export type { GeneratedContent };
