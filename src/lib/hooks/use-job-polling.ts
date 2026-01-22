/**
 * useJobPolling Hook
 *
 * Polls the job status endpoint until the job completes or fails.
 * Shows toast notifications when the job finishes.
 */

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { JobStatus } from "@/lib/queue/types";

interface JobStatusResponse {
  id: number;
  type: string;
  status: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseJobPollingOptions {
  /** Job ID to poll */
  jobId: number | null;
  /** Polling interval in milliseconds (default: 3000) */
  interval?: number;
  /** Callback when job completes successfully */
  onComplete?: (result: unknown) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Whether to show toast notifications (default: true) */
  showToast?: boolean;
  /** Action button for success toast */
  actionLabel?: string;
  /** Action handler for success toast */
  onAction?: () => void;
}

/**
 * Polls job status and shows notifications when complete.
 *
 * @example
 * ```tsx
 * useJobPolling({
 *   jobId: 123,
 *   onComplete: (result) => console.log("Done!", result),
 *   actionLabel: "Ver na Biblioteca",
 *   onAction: () => router.push("/library"),
 * });
 * ```
 */
export function useJobPolling({
  jobId,
  interval = 3000,
  onComplete,
  onError,
  successMessage,
  errorMessage,
  showToast = true,
  actionLabel,
  onAction,
}: UseJobPollingOptions) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);

  const getContentTypeLabel = useCallback((jobType: string) => {
    const labels: Record<string, string> = {
      wizard_image_generation: "Carrossel",
      ai_image_generation: "Imagem",
      carousel_creation: "Carrossel",
      ai_text_generation: "Texto",
    };
    return labels[jobType] || "Conteúdo";
  }, []);

  useEffect(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Reset notification flag when jobId changes
    hasNotifiedRef.current = false;

    if (!jobId) {
      return;
    }

    // Poll job status
    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
          console.error("[JOB-POLLING] Failed to fetch job status");
          return;
        }

        const job: JobStatusResponse = await response.json();

        // Job completed successfully
        if (job.status === JobStatus.COMPLETED && !hasNotifiedRef.current) {
          hasNotifiedRef.current = true;

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          const contentTypeLabel = getContentTypeLabel(job.type);

          if (showToast) {
            toast.success(successMessage || `${contentTypeLabel} foi finalizado!`, {
              description: "Seu conteúdo está disponível na biblioteca.",
              action: onAction
                ? {
                    label: actionLabel,
                    onClick: onAction,
                  }
                : undefined,
            });
          }

          onComplete?.(job.result);
        }

        // Job failed
        if (job.status === JobStatus.FAILED && !hasNotifiedRef.current) {
          hasNotifiedRef.current = true;

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (showToast) {
            toast.error(errorMessage || "Erro na geração", {
              description: job.error || "Tente novamente ou contate o suporte.",
            });
          }

          onError?.(job.error || "Unknown error");
        }
      } catch (error) {
        console.error("[JOB-POLLING] Error polling job status:", error);
      }
    };

    // Initial poll
    pollJobStatus();

    // Set up interval for polling
    pollingRef.current = setInterval(pollJobStatus, interval);

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId, interval, onComplete, onError, successMessage, errorMessage, showToast, onAction, getContentTypeLabel]);

  return {
    /** Whether polling is active */
    isPolling: pollingRef.current !== null,
  };
}
