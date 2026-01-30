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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:createJob-entry',message:'Creating job',data:{userId,type,hasPayload:!!payload},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:createJob-inserted',message:'Job inserted in DB',data:{jobId:newJob.id,type,userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});

  // Se não for agendado, enfileirar imediatamente
  // Se a fila não estiver configurada (Redis não disponível),
  // o job fica no banco com status pending mas não é enfileirado
  if (!options?.scheduledFor) {
    try {
      const { enqueueJob, isQueueConfigured } = await import("./client");
      const queueConfigured = isQueueConfigured();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:createJob-enqueue',message:'Checking queue config',data:{jobId:newJob.id,queueConfigured},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (queueConfigured) {
        await enqueueJob(newJob.id, options?.priority);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:createJob-enqueued',message:'Job enqueued to Redis',data:{jobId:newJob.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      // Se falhar ao enfileirar, logar mas não falhar a criação do job
      console.error(`[Queue] Failed to enqueue job ${newJob.id}:`, error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b2c64537-d28c-42e1-9ead-aad99c22c73e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobs.ts:createJob-enqueue-error',message:'Failed to enqueue',data:{jobId:newJob.id,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
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

/**
 * Reserva atomicamente o próximo job pendente para processamento.
 *
 * Usa UPDATE com RETURNING para garantir atomicidade - apenas uma
 * transação consegue reservar cada job, evitando condições de corrida
 * quando múltiplos workers processam jobs simultaneamente.
 *
 * @returns O job reservado ou null se nenhum disponível
 */
export async function reserveNextJob() {
  const now = new Date();

  // Usar CTE para UPDATE com ORDER BY - garante que pegamos o job
  // de maior prioridade de forma atômica
  const result = await db.execute(sql`
    WITH next_job AS (
      SELECT id
      FROM jobs
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at DESC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs
    SET status = 'processing',
        started_at = ${now},
        updated_at = ${now}
    WHERE id = (SELECT id FROM next_job)
    RETURNING *
  `);

  if (!result.rows[0]) {
    return null;
  }

  // Converter row para objeto no formato do schema
  return result.rows[0] as unknown as Awaited<ReturnType<typeof getJob>>;
}
