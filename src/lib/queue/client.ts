/**
 * Upstash Redis Client for Queue System
 *
 * Cliente HTTP para Upstash Redis - otimizado para serverless/edge.
 */

import { Redis } from "@upstash/redis";

// Verificar se as variáveis de ambiente estão configuradas
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn(
    "UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN devem ser configurados para usar o sistema de filas."
  );
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
 */
export async function enqueueJob(jobId: number, priority = 0): Promise<void> {
  try {
    // Usar LPUSH com score de prioridade (formato: priority:timestamp:jobId)
    const score = `${String(999999 - priority).padStart(6, "0")}:${Date.now()}:${jobId}`;
    await redis.lpush(JOB_QUEUE, score);
  } catch (error) {
    console.error("Erro ao enfileirar job:", error);
    throw error;
  }
}

/**
 * Remove e retorna o próximo job da fila
 * @returns ID do job ou null se fila vazia
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
    console.error("Erro ao desenfileirar job:", error);
    return null;
  }
}

/**
 * Adiciona um job à fila de processamento
 * @param jobId - ID do job
 */
export async function markAsProcessing(jobId: number): Promise<void> {
  await redis.lpush(PROCESSING_QUEUE, String(jobId));
}

/**
 * Remove um job da fila de processamento (quando completado ou falhou)
 * @param jobId - ID do job
 */
export async function removeFromProcessing(jobId: number): Promise<void> {
  await redis.lrem(PROCESSING_QUEUE, 1, String(jobId));
}

/**
 * Retorna o tamanho da fila pendente
 */
export async function getQueueSize(): Promise<number> {
  return await redis.llen(JOB_QUEUE);
}

/**
 * Retorna o número de jobs em processamento
 */
export async function getProcessingCount(): Promise<number> {
  return await redis.llen(PROCESSING_QUEUE);
}
