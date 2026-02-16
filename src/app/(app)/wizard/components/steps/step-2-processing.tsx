/**
 * Step 2 - Processing
 *
 * Shows loading/polling state while the wizard_narratives job processes.
 * Uses SSE (Server-Sent Events) via /api/jobs/[id]/stream for real-time updates.
 * Falls back to polling GET /api/wizard/[id] if SSE fails.
 * Handles job status updates and error states.
 *
 * Includes time estimates and elapsed timer for better UX.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  FileText,
  Search,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  ErrorFeedback,
  getSpecificErrorMessage,
} from "@/components/ui/error-feedback";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";

export interface ProcessingStatus {
  step: "idle" | "extracting" | "researching" | "generating" | "completed" | "failed";
  message: string;
  progress?: number;
  error?: string;
}

interface Step2ProcessingProps {
  wizardId: number;
  onComplete: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const PROCESSING_STEPS = [
  {
    key: "extracting",
    icon: FileText,
    label: "Extraindo conteudo",
    description: "Firecrawl esta analisando as URLs de referencia",
    timeEstimate: "~15 segundos",
    estimatedSeconds: 15,
  },
  {
    key: "researching",
    icon: Search,
    label: "Pesquisando contexto",
    description: "Tavily esta buscando informacoes complementares",
    timeEstimate: "~15 segundos",
    estimatedSeconds: 15,
  },
  {
    key: "generating",
    icon: Sparkles,
    label: "Gerando narrativas",
    description: "IA esta criando opcoes de narrativas para seu conteudo",
    timeEstimate: "~30-60 segundos",
    estimatedSeconds: 45,
  },
];

/** Format seconds to mm:ss or just Xs */
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

// SSE event data shape
interface JobSSEEvent {
  type: string;
  data?: {
    status?: string;
    result?: unknown;
    error?: string;
    jobId?: number;
    message?: string;
    attempts?: number;
  };
}

export function Step2Processing({
  wizardId,
  onComplete,
  onError,
  className,
}: Step2ProcessingProps) {
  const [status, setStatus] = useState<ProcessingStatus>({
    step: "idle",
    message: "Iniciando processamento...",
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);
  const [sseUrl, setSseUrl] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);
  const completionHandledRef = useRef(false);

  // Maximum polling time (5 minutes)
  const POLLING_TIMEOUT = 5 * 60 * 1000;

  // Total estimated time for all steps
  const totalEstimatedSeconds = PROCESSING_STEPS.reduce(
    (sum, s) => sum + s.estimatedSeconds,
    0
  );

  // Whether processing is taking longer than expected
  const isTakingLong = elapsedSeconds > totalEstimatedSeconds;

  // ====================================================================
  // POLLING FALLBACK — extracted as a reusable function for the SSE hook
  // ====================================================================
  const pollWizardStatus = useCallback(async (): Promise<JobSSEEvent | null> => {
    try {
      const response = await fetch(`/api/wizard/${wizardId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return { type: "failed", data: { status: "failed", error: "O wizard nao existe ou foi excluido." } };
        }
        return null;
      }

      const wizard = await response.json();

      // Check if narratives are ready
      if (wizard.narratives && Array.isArray(wizard.narratives) && wizard.narratives.length > 0) {
        return { type: "completed", data: { status: "completed" } };
      }

      // Check for job failure
      if (wizard.currentStep === "abandoned" || wizard.jobStatus === "failed") {
        return { type: "failed", data: { status: "failed", error: wizard.jobError || "Ocorreu um erro ao processar seu wizard." } };
      }

      // Still processing — also capture the jobId if we don't have it
      if (wizard.jobId && !jobId) {
        setJobId(wizard.jobId);
      }

      // Return status event with wizard-level processing progress
      const jobStatus = wizard.jobStatus || "pending";
      if (jobStatus === "processing" && wizard.processingProgress) {
        return {
          type: "status",
          data: {
            status: "processing",
          },
        };
      }

      return { type: "status", data: { status: jobStatus } };
    } catch {
      return null;
    }
  }, [wizardId, jobId]);

  // ====================================================================
  // INITIAL FETCH — get jobId from the wizard to set up SSE
  // ====================================================================
  useEffect(() => {
    isMountedRef.current = true;
    completionHandledRef.current = false;

    const fetchJobId = async () => {
      try {
        const response = await fetch(`/api/wizard/${wizardId}`);
        if (!response.ok) return;
        const wizard = await response.json();

        if (!isMountedRef.current) return;

        // If narratives are already ready, handle completion immediately
        if (wizard.narratives && Array.isArray(wizard.narratives) && wizard.narratives.length > 0) {
          handleCompletion();
          return;
        }

        // If already failed
        if (wizard.currentStep === "abandoned" || wizard.jobStatus === "failed") {
          setStatus({
            step: "failed",
            message: "Processamento falhou",
            error: wizard.jobError || "Ocorreu um erro ao processar seu wizard.",
          });
          onError?.(wizard.jobError || "Processamento falhou");
          return;
        }

        // Update progress from wizard data
        if (wizard.jobStatus === "processing" && wizard.processingProgress) {
          const { stage } = wizard.processingProgress;
          setStatus({
            step: stage === "narratives" ? "generating" : stage === "research" ? "researching" : "extracting",
            message: getStageMessage(stage),
            progress: wizard.processingProgress.percent,
          });
        }

        // Set up SSE if we have a jobId
        if (wizard.jobId) {
          setJobId(wizard.jobId);
          setSseUrl(`/api/jobs/${wizard.jobId}/stream`);
        }
      } catch {
        // Will fall through to polling fallback via SSE hook
      }
    };

    fetchJobId();

    return () => {
      isMountedRef.current = false;
    };
    // Only run on mount / wizardId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardId]);

  // ====================================================================
  // COMPLETION HANDLER
  // ====================================================================
  const handleCompletion = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;

    if (isMountedRef.current) {
      setStatus({
        step: "completed",
        message: "Narrativas prontas!",
        progress: 100,
      });
      // Disable SSE
      setSseUrl(null);
      // Clear any polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setTimeout(() => {
        if (isMountedRef.current) {
          onComplete();
        }
      }, 500);
    }
  }, [onComplete]);

  // ====================================================================
  // SSE HOOK — real-time job status with polling fallback
  // ====================================================================
  const handleSSEMessage = useCallback(
    async (event: JobSSEEvent) => {
      if (!isMountedRef.current) return;

      const eventType = event.type;
      const eventData = event.data;

      if (eventType === "completed") {
        // Job completed — verify narratives are actually ready
        try {
          const response = await fetch(`/api/wizard/${wizardId}`);
          if (response.ok) {
            const wizard = await response.json();
            if (wizard.narratives && Array.isArray(wizard.narratives) && wizard.narratives.length > 0) {
              handleCompletion();
              return;
            }
          }
        } catch {
          // If verification fails, still trigger completion (job said it's done)
        }
        handleCompletion();
        return;
      }

      if (eventType === "failed") {
        const errorMsg = eventData?.error || "Ocorreu um erro ao processar seu wizard.";
        if (isMountedRef.current) {
          setSseUrl(null);
          setStatus({
            step: "failed",
            message: "Processamento falhou",
            error: errorMsg,
          });
          onError?.(errorMsg);
        }
        return;
      }

      if (eventType === "timeout") {
        if (isMountedRef.current) {
          setSseUrl(null);
          setStatus({
            step: "failed",
            message: "Tempo limite excedido",
            error: "O processamento esta demorando mais que o normal. Verifique se o worker esta configurado corretamente.",
          });
          onError?.("Tempo limite excedido");
        }
        return;
      }

      if (eventType === "status") {
        // Fetch wizard-level processing progress for better UI
        try {
          const response = await fetch(`/api/wizard/${wizardId}`);
          if (response.ok) {
            const wizard = await response.json();

            // Check if narratives became ready
            if (wizard.narratives && Array.isArray(wizard.narratives) && wizard.narratives.length > 0) {
              handleCompletion();
              return;
            }

            // Check if job failed at wizard level
            if (wizard.currentStep === "abandoned" || wizard.jobStatus === "failed") {
              if (isMountedRef.current) {
                setSseUrl(null);
                setStatus({
                  step: "failed",
                  message: "Processamento falhou",
                  error: wizard.jobError || "Ocorreu um erro ao processar seu wizard.",
                });
                onError?.(wizard.jobError || "Processamento falhou");
              }
              return;
            }

            // Update processing progress
            const jobStatus = wizard.jobStatus || "pending";
            let newStatus: ProcessingStatus;

            switch (jobStatus) {
              case "pending":
                newStatus = {
                  step: "idle",
                  message: "Aguardando inicio do processamento...",
                };
                break;
              case "processing":
                if (wizard.processingProgress) {
                  const { stage } = wizard.processingProgress;
                  newStatus = {
                    step: stage === "narratives" ? "generating" : stage === "research" ? "researching" : "extracting",
                    message: getStageMessage(stage),
                    progress: wizard.processingProgress.percent,
                  };
                } else {
                  newStatus = {
                    step: "extracting",
                    message: "Processando informacoes...",
                    progress: 33,
                  };
                }
                break;
              default:
                newStatus = {
                  step: "idle",
                  message: "Processando...",
                };
            }

            if (isMountedRef.current) {
              setStatus((prev) => {
                if (prev.step !== newStatus.step || prev.message !== newStatus.message) {
                  return newStatus;
                }
                return prev;
              });
            }
          }
        } catch {
          // Silent fail on wizard status fetch — SSE is still working
        }
      }
    },
    [wizardId, handleCompletion, onError]
  );

  // Polling fallback function for the SSE hook
  const fallbackPoll = useCallback(async (): Promise<JobSSEEvent | null> => {
    // Check for timeout
    const elapsed = Date.now() - startTimeRef.current;
    if (elapsed > POLLING_TIMEOUT) {
      if (isMountedRef.current) {
        setStatus({
          step: "failed",
          message: "Tempo limite excedido",
          error: "O processamento esta demorando mais que o normal. Verifique se o worker esta configurado corretamente.",
        });
        onError?.("Tempo limite excedido");
      }
      return null;
    }

    return pollWizardStatus();
  }, [pollWizardStatus, onError, POLLING_TIMEOUT]);

  useSSE<JobSSEEvent>({
    url: sseUrl,
    onMessage: handleSSEMessage,
    onError: (err) => {
      console.warn("[Step2Processing] SSE error:", err.message);
      // The useSSE hook handles fallback automatically
    },
    fallbackPollingMs: 2000,
    fallbackPollFn: fallbackPoll,
  });

  // ====================================================================
  // ELAPSED TIME COUNTER
  // ====================================================================
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Stop timer when completed or failed
  useEffect(() => {
    if (status.step === "completed" || status.step === "failed") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [status.step]);

  // ====================================================================
  // POLLING FALLBACK — if no SSE URL is available yet (no jobId)
  // Falls back to polling the wizard endpoint directly
  // ====================================================================
  useEffect(() => {
    // Only run polling when we don't have an SSE URL (no jobId yet)
    if (sseUrl) return;
    // Don't poll if already completed or failed
    if (status.step === "completed" || status.step === "failed") return;

    isMountedRef.current = true;

    const directPoll = async () => {
      const result = await pollWizardStatus();
      if (!result || !isMountedRef.current) return;

      // Pass through to the SSE message handler (same logic)
      handleSSEMessage(result);
    };

    // Initial poll
    directPoll();

    // Poll every 2 seconds until we get an SSE URL
    pollIntervalRef.current = setInterval(directPoll, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [sseUrl, status.step, pollWizardStatus, handleSSEMessage]);

  // ====================================================================
  // RETRY HANDLER
  // ====================================================================
  const handleRetry = useCallback(() => {
    setElapsedSeconds(0);
    completionHandledRef.current = false;
    startTimeRef.current = Date.now();
    setStatus({
      step: "idle",
      message: "Tentando novamente...",
    });
    // Re-enable SSE if we have a jobId
    if (jobId) {
      setSseUrl(`/api/jobs/${jobId}/stream`);
    }
    // Restart timer
    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }
  }, [jobId]);

  const isFailed = status.step === "failed";
  const currentStepIndex = PROCESSING_STEPS.findIndex((s) => s.key === status.step);
  const isActive = status.step !== "idle" && status.step !== "failed" && status.step !== "completed";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Elapsed Time Counter */}
      {!isFailed && status.step !== "completed" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary/70" />
            <span className="text-sm text-white/70">
              Tempo decorrido:{" "}
              <span className="text-white font-medium">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </span>
          </div>
          <span className="text-xs text-white/50">
            Estimativa total: ~{formatElapsedTime(totalEstimatedSeconds)}
          </span>
        </motion.div>
      )}

      {/* Taking Longer Warning */}
      {isTakingLong && !isFailed && status.step !== "completed" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
        >
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Levando mais que o esperado... Por favor, aguarde. O processamento continuara em segundo plano.
          </p>
        </motion.div>
      )}

      {/* Processing Steps Visualization */}
      <div className="space-y-4">
        {PROCESSING_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isPast = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isPast
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-white/5 bg-white/[0.02]"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                      ? "bg-green-500 text-white"
                      : "bg-white/5 text-white/40"
                )}
              >
                {isCurrent && status.step !== "completed" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPast ? (
                  <svg
                    className="w-5 h-5"
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
                ) : (
                  <Icon className="w-5 h-5" />
                )}

                {/* Pulsing glow for current step */}
                {isCurrent && isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/50 blur-md -z-10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "text-sm font-semibold mb-1",
                    isCurrent || isPast ? "text-white" : "text-white/50"
                  )}
                >
                  {step.label}
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    isCurrent || isPast ? "text-white/70" : "text-white/30"
                  )}
                >
                  {step.description}
                </p>
                {/* Time estimate */}
                <p
                  className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    isCurrent
                      ? "text-primary/80"
                      : isPast
                        ? "text-green-400/60"
                        : "text-white/20"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {isPast ? "Concluido" : step.timeEstimate}
                </p>
              </div>

              {/* Current Step Indicator */}
              {isCurrent && isActive && (
                <motion.div
                  className="flex-shrink-0 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs text-primary font-medium"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Em andamento
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Completed State */}
        {status.step === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-green-500/30 bg-green-500/5"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center">
              <svg
                className="w-6 h-6"
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
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">
                Processamento concluido!
              </h3>
              <p className="text-xs text-white/70">
                As narrativas estao prontas para sua selecao.
                {elapsedSeconds > 0 && (
                  <span className="text-white/50 ml-2">
                    ({formatElapsedTime(elapsedSeconds)})
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {isFailed && (
          <ErrorFeedback
            message={
              getSpecificErrorMessage(status.error || status.message).message
            }
            suggestion={
              getSpecificErrorMessage(status.error || status.message)
                .suggestion ||
              status.error
            }
            onRetry={handleRetry}
            retryLabel="Tentar novamente"
          />
        )}
      </div>

      {/* Progress Bar (when not failed) */}
      {!isFailed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Progresso geral</span>
            <span className="text-primary font-medium">
              {status.progress ?? 0}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${status.progress ?? 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Info Message */}
      {!isFailed && status.step !== "completed" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200/70">
            Analisando contexto e buscando referencias... O tempo total depende da quantidade de
            referencias e da complexidade do conteudo.
          </p>
        </div>
      )}
    </div>
  );
}

function getStageMessage(stage: string): string {
  const messages: Record<string, string> = {
    extraction: "Extraindo conteudo das URLs de referencia...",
    transcription: "Transcrevendo conteudo do video...",
    research: "Buscando informacoes contextuais...",
    narratives: "Gerando narrativas com IA...",
  };
  return messages[stage] || "Processando...";
}
