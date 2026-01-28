/**
 * Upstash Redis Client for Queue System
 *
 * Cliente HTTP para Upstash Redis - otimizado para serverless/edge.
 */

import { Redis } from "@upstash/redis";
import {
  AppError,
  ConfigError,
  JobError,
  NetworkError,
  toAppError,
  getErrorMessage,
} from "@/lib/errors";

// Verificar se as variáveis de ambiente estão configuradas
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Verifica se o sistema de filas está configurado corretamente
 */
export function isQueueConfigured(): boolean {
  return !!(url && token);
}

/**
 * Error customizado para quando a fila não está configurada
 */
export class QueueNotConfiguredError extends Error {
  constructor() {
    super(
      "Queue system not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
    );
    this.name = "QueueNotConfiguredError";
  }
}


// Criar cliente Redis
export const redis = new Redis({
  url: url || "",
  token: token || "",
});

// Chaves do Redis para o sistema de filas
const QUEUE_PREFIX = "queue:";
const JOB_QUEUE = "jobs:pending";
const PROCESSING_QUEUE = "jobs:processing";

/**
 * Adiciona um job à fila de processamento
 * @param jobId - ID do job no banco de dados
 * @param priority - Prioridade do job (maior = mais urgente)
 * @throws {QueueNotConfiguredError} Se Redis não estiver configurado
 */
export async function enqueueJob(jobId: number, priority = 0): Promise<void> {
  if (!isQueueConfigured()) {
    throw new QueueNotConfiguredError();
  }

  try {
    // Usar LPUSH com score de prioridade (formato: priority:timestamp:jobId)
    const score = `${String(999999 - priority).padStart(6, "0")}:${Date.now()}:${jobId}`;
    await redis.lpush(JOB_QUEUE, score);
  } catch (error) {
    const appError = toAppError(error, "QUEUE_ENQUEUE_FAILED");
    console.error("[Queue] Erro ao enfileirar job:", appError);
    throw new JobError(`Failed to enqueue job ${jobId}`, jobId, appError);
  }
}

/**
 * Remove e retorna o próximo job da fila
 * @returns ID do job ou null se fila vazia
 * @throws {JobError} Se houver erro de comunicação com o Redis
 */
export async function dequeueJob(): Promise<number | null> {
  try {
    const value = await redis.rpop<string>(JOB_QUEUE);
    if (!value) return null;

    // Extrair jobId do formato priority:timestamp:jobId
    const parts = value.split(":");
    const jobId = parseInt(parts[2] || "0", 10);
    return jobId;
  } catch (error) {
    const appError = toAppError(error, "QUEUE_DEQUEUE_FAILED");
    console.error("[Queue] Erro ao desenfileirar job:", appError);
    return null;
  }
}

/**
 * Adiciona um job à fila de processamento
 * @param jobId - ID do job
 */
export async function markAsProcessing(jobId: number): Promise<void> {
  if (!isQueueConfigured()) return;
  await redis.lpush(PROCESSING_QUEUE, String(jobId));
}

/**
 * Remove um job da fila de processamento (quando completado ou falhou)
 * @param jobId - ID do job
 */
export async function removeFromProcessing(jobId: number): Promise<void> {
  if (!isQueueConfigured()) return;
  await redis.lrem(PROCESSING_QUEUE, 1, String(jobId));
}

/**
 * Retorna o tamanho da fila pendente
 */
export async function getQueueSize(): Promise<number> {
  if (!isQueueConfigured()) return 0;
  return await redis.llen(JOB_QUEUE);
}

/**
 * Retorna o número de jobs em processamento
 */
export async function getProcessingCount(): Promise<number> {
  if (!isQueueConfigured()) return 0;
  return await redis.llen(PROCESSING_QUEUE);
}

/**
 * Triggers the worker endpoint to process pending jobs.
 * In development, this can be called after enqueueing jobs to process them immediately.
 * In production, Vercel Cron handles this automatically.
 *
 * @returns { success: boolean, message: string }
 */
export async function triggerWorker(options?: { waitForJobId?: number; timeoutMs?: number }): Promise<{
  success: boolean;
  message: string;
  jobId?: number;
  result?: unknown;
}> {
  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workers`;
  const workerSecret = process.env.WORKER_SECRET || "dev-secret";

  try {
    // If waitForJobId is provided, poll until that job completes or timeout
    if (options?.waitForJobId) {
      const startTime = Date.now();
      const timeout = options.timeoutMs ?? 120000; // Default 2 minutes
      const pollInterval = 2000; // Check every 2 seconds

      // First, trigger the worker to start processing
      await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${workerSecret}`,
          "Content-Type": "application/json",
        },
      });

      // Then poll for job completion
      while (Date.now() - startTime < timeout) {
        // Trigger worker again to keep processing
        await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {
          // Ignore errors during polling
        });

        // Check job status
        const { getJob } = await import("./jobs");
        const job = await getJob(options.waitForJobId!);

        if (job?.status === "completed") {
          return {
            success: true,
            message: "Job completed successfully",
            jobId: job.id,
            result: job.result,
          };
        }

        if (job?.status === "failed") {
          return {
            success: false,
            message: `Job failed: ${job.error || "Unknown error"}`,
            jobId: job.id,
          };
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      return {
        success: false,
        message: "Job processing timed out",
        jobId: options.waitForJobId,
      };
    }

    // Simple trigger - just fire and forget
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${workerSecret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as any;

    return {
      success: response.ok,
      message: data.message || response.statusText,
      jobId: data.jobId,
      result: data.result,
    };
  } catch (error) {
    const appError = toAppError(error, "WORKER_TRIGGER_FAILED");
    console.error("[Queue] Error triggering worker:", appError);
    return {
      success: false,
      message: `Failed to trigger worker: ${getErrorMessage(appError)}`,
    };
  }
}
