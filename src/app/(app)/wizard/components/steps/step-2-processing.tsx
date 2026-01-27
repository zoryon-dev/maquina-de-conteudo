/**
 * Step 2 - Processing
 *
 * Shows loading/polling state while the wizard_narratives job processes.
 * Polls GET /api/wizard/[id] until narratives are ready.
 * Handles job status updates and error states.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  FileText,
  Search,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    label: "Extraindo conteúdo",
    description: "Firecrawl está analisando as URLs de referência",
  },
  {
    key: "researching",
    icon: Search,
    label: "Pesquisando contexto",
    description: "Tavily está buscando informações complementares",
  },
  {
    key: "generating",
    icon: Sparkles,
    label: "Gerando narrativas",
    description: "IA está criando opções de narrativas para seu conteúdo",
  },
];

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
  const [retryCount, setRetryCount] = useState(0);

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());

  // Maximum polling time (5 minutes)
  const POLLING_TIMEOUT = 5 * 60 * 1000;

  // Poll wizard status until narratives are ready
  useEffect(() => {
    isMountedRef.current = true;

    const pollWizardStatus = async () => {
      try {
        // Check for timeout
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > POLLING_TIMEOUT) {
          if (isMountedRef.current) {
            setStatus({
              step: "failed",
              message: "Tempo limite excedido",
              error: "O processamento está demorando mais que o normal. Verifique se o worker está configurado corretamente.",
            });
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            onError?.("Tempo limite excedido");
          }
          return;
        }

        const response = await fetch(`/api/wizard/${wizardId}`);

        if (!response.ok) {
          if (response.status === 404 && isMountedRef.current) {
            setStatus({
              step: "failed",
              message: "Wizard não encontrado",
              error: "O wizard não existe ou foi excluído.",
            });
            onError?.("Wizard não encontrado");
          }
          return;
        }

        const wizard = await response.json();

        // Check if narratives are ready
        if (wizard.narratives && Array.isArray(wizard.narratives) && wizard.narratives.length > 0) {
          if (isMountedRef.current) {
            setStatus({
              step: "completed",
              message: "Narrativas prontas!",
              progress: 100,
            });
            // Clear polling and trigger completion after a brief delay
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
          return;
        }

        // Check for job failure
        if (wizard.currentStep === "abandoned" || wizard.jobStatus === "failed") {
          if (isMountedRef.current) {
            setStatus({
              step: "failed",
              message: "Processamento falhou",
              error: wizard.jobError || "Ocorreu um erro ao processar seu wizard.",
            });
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            onError?.(wizard.jobError || "Processamento falhou");
          }
          return;
        }

        // Determine current processing step based on job status
        const jobStatus = wizard.jobStatus || "pending";
        let newStatus: ProcessingStatus;

        switch (jobStatus) {
          case "pending":
            newStatus = {
              step: "idle",
              message: "Aguardando início do processamento...",
            };
            break;
          case "processing":
            // Check processingProgress if available
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
                message: "Processando informações...",
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
            // Only update if actually changed to avoid unnecessary re-renders
            if (prev.step !== newStatus.step || prev.message !== newStatus.message) {
              return newStatus;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error polling wizard status:", error);

        if (isMountedRef.current && retryCount < 3) {
          // Retry with exponential backoff
          const backoffDelay = 1000 * Math.pow(2, retryCount);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount((prev) => prev + 1);
            }
          }, backoffDelay);
        } else if (isMountedRef.current) {
          setStatus({
            step: "failed",
            message: "Erro de conexão",
            error: "Não foi possível conectar ao servidor. Tente novamente.",
          });
          onError?.("Erro de conexão");
        }
      }
    };

    // Initial poll
    pollWizardStatus();

    // Set up polling interval (every 2 seconds)
    pollIntervalRef.current = setInterval(pollWizardStatus, 2000);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [wizardId, retryCount, onComplete, onError]);

  const handleRetry = () => {
    setRetryCount(0);
    setStatus({
      step: "idle",
      message: "Tentando novamente...",
    });
  };

  const isFailed = status.step === "failed";
  const currentStepIndex = PROCESSING_STEPS.findIndex((s) => s.key === status.step);
  const isActive = status.step !== "idle" && status.step !== "failed" && status.step !== "completed";

  return (
    <div className={cn("space-y-6", className)}>
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
                Processamento concluído!
              </h3>
              <p className="text-xs text-white/70">
                As narrativas estão prontas para sua seleção.
              </p>
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-red-500/30 bg-red-500/5"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">
                {status.message}
              </h3>
              {status.error && (
                <p className="text-xs text-white/60 mb-3">{status.error}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </motion.div>
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
            Este processo pode levar alguns segundos, dependendo da quantidade de
            referências e da complexidade do conteúdo.
          </p>
        </div>
      )}
    </div>
  );
}

function getStageMessage(stage: string): string {
  const messages: Record<string, string> = {
    extraction: "Extraindo conteúdo das URLs de referência...",
    transcription: "Transcrevendo conteúdo do vídeo...",
    research: "Buscando informações contextuais...",
    narratives: "Gerando narrativas com IA...",
  };
  return messages[stage] || "Processando...";
}
