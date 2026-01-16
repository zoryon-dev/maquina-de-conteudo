/**
 * Job Management Functions
 *
 * Funções para criar e gerenciar jobs no sistema de filas.
 */

import { db } from "@/db";
import { jobs, type NewJob } from "@/db/schema";
import { enqueueJob } from "./client";
import type { JobType, JobPayload } from "./types";
import { eq, desc, sql, and } from "drizzle-orm";

/**
 * Cria um novo job e o adiciona à fila de processamento
 *
 * @param userId - ID do usuário que criou o job
 * @param type - Tipo do job
 * @param payload - Dados de entrada do job
 * @param options - Opções adicionais (prioridade, agendamento)
 * @returns ID do job criado
 */
export async function createJob<T extends JobPayload>(
  userId: string,
  type: JobType,
  payload: T,
  options?: {
    priority?: number;
    scheduledFor?: Date;
    maxAttempts?: number;
  }
): Promise<number> {
  // Inserir job no banco
  const [newJob] = await db
    .insert(jobs)
    .values({
      type,
      status: "pending",
      userId,
      payload: payload as any,
      priority: options?.priority ?? 0,
      scheduledFor: options?.scheduledFor,
      maxAttempts: options?.maxAttempts ?? 3,
    })
    .returning({ id: jobs.id });

  // Se não for agendado, enfileirar imediatamente
  if (!options?.scheduledFor) {
    await enqueueJob(newJob.id, options?.priority);
  }

  return newJob.id;
}

/**
 * Atualiza o status de um job
 */
export async function updateJobStatus(
  jobId: number,
  status: "processing" | "completed" | "failed",
  data?: {
    result?: unknown;
    error?: string;
  }
): Promise<void> {
  const updateData: Partial<NewJob> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "processing") {
    updateData.startedAt = new Date();
  } else if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date();
  }

  if (data?.result) {
    updateData.result = data.result as any;
  }

  if (data?.error) {
    updateData.error = data.error;
  }

  await db.update(jobs).set(updateData).where(eq(jobs.id, jobId));
}

/**
 * Incrementa o contador de tentativas de um job
 */
export async function incrementJobAttempts(jobId: number): Promise<void> {
  await db
    .update(jobs)
    .set({
      attempts: sql`${jobs.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Busca um job por ID
 */
export async function getJob(jobId: number) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return job;
}

/**
 * Lista jobs de um usuário com filtros
 */
export async function listUserJobs(
  userId: string,
  filters?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }
) {
  const conditions = [eq(jobs.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(jobs.status, filters.status as any));
  }

  if (filters?.type) {
    conditions.push(eq(jobs.type, filters.type as any));
  }

  return await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(filters?.limit ?? 20)
    .offset(filters?.offset ?? 0);
}
