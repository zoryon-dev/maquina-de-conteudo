/**
 * POST /api/workers
 *
 * Worker que processa jobs da fila.
 *
 * Este endpoint deve ser chamado por um agendador externo (cron job)
 * ou por um webhook do Upstash para processar jobs pendentes.
 *
 * Exemplo de chamada com Upstash QStash:
 * - Configurar um cron job que chama este endpoint a cada minuto
 * - O worker processará um job da fila por vez
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dequeueJob, markAsProcessing, removeFromProcessing, enqueueJob } from "@/lib/queue/client";
import { getJob, incrementJobAttempts, updateJobStatus } from "@/lib/queue/jobs";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Secret para validar chamadas internas do worker
 */
const WORKER_SECRET = process.env.WORKER_SECRET || "dev-secret";

// Handlers para cada tipo de job
const jobHandlers: Record<string, (payload: unknown) => Promise<unknown>> = {
  ai_text_generation: async () => {
    // TODO: Implementar geração de texto com OpenRouter
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulação
    return { text: "Generated text placeholder" };
  },

  ai_image_generation: async () => {
    // TODO: Implementar geração de imagem
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulação
    return { imageUrl: "https://example.com/image.png" };
  },

  carousel_creation: async () => {
    // TODO: Implementar criação de carrossel
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulação
    return { carouselUrl: "https://example.com/carousel.pdf" };
  },

  scheduled_publish: async () => {
    // TODO: Implementar publicação agendada
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulação
    return { published: true, postId: "post_123" };
  },

  web_scraping: async () => {
    // TODO: Implementar web scraping
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulação
    return { scraped: true, data: [] };
  },
};

export async function POST(request: Request) {
  // Verificar autenticação via secret (para chamadas internas)
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");

  if (secret !== WORKER_SECRET) {
    // Alternativamente, aceitar autenticação Clerk para testes manuais
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Desenfileirar próximo job
    const jobId = await dequeueJob();

    if (!jobId) {
      return NextResponse.json({
        message: "No jobs to process",
        processed: false,
      });
    }

    // Buscar job no banco
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verificar se o job ainda está pendente
    if (job.status !== "pending") {
      return NextResponse.json({
        message: "Job already processed",
        jobId,
        status: job.status,
      });
    }

    // Marcar como processando
    await markAsProcessing(jobId);
    await updateJobStatus(jobId, "processing");

    // Buscar handler para o tipo de job
    const handler = jobHandlers[job.type];

    if (!handler) {
      await updateJobStatus(jobId, "failed", {
        error: `No handler for job type: ${job.type}`,
      });
      await removeFromProcessing(jobId);
      return NextResponse.json(
        { error: "No handler for job type", jobType: job.type },
        { status: 400 }
      );
    }

    // Processar job
    const startTime = Date.now();
    let result: unknown;
    let error: string | undefined;

    try {
      result = await handler(job.payload);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }

    const duration = Date.now() - startTime;

    // Atualizar status do job
    if (error) {
      // Verificar se deve tentar novamente
      const shouldRetry = (job.attempts ?? 0) + 1 < (job.maxAttempts ?? 3);

      if (shouldRetry) {
        // Re-enfileirar para tentar novamente
        await incrementJobAttempts(jobId);
        // Atualizar para pending diretamente no banco
        await db.update(jobs).set({ status: "pending" as any }).where(eq(jobs.id, jobId));
        await removeFromProcessing(jobId);

        // Re-enfileirar no Redis
        await enqueueJob(jobId, job.priority ?? undefined);

        return NextResponse.json({
          message: "Job failed, will retry",
          jobId,
          attempt: (job.attempts ?? 0) + 1,
          maxAttempts: job.maxAttempts ?? 3,
          error,
        });
      } else {
        // Falha definitiva
        await updateJobStatus(jobId, "failed", { error });
        await removeFromProcessing(jobId);

        return NextResponse.json({
          message: "Job failed permanently",
          jobId,
          error,
        });
      }
    } else {
      // Sucesso
      await updateJobStatus(jobId, "completed", { result });
      await removeFromProcessing(jobId);

      return NextResponse.json({
        message: "Job completed",
        jobId,
        result,
        duration,
      });
    }
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json(
      { error: "Worker processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers
 *
 * Retorna status da fila (útil para monitoramento).
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getQueueSize, getProcessingCount } = await import("@/lib/queue/client");

    const [queueSize, processingCount] = await Promise.all([
      getQueueSize(),
      getProcessingCount(),
    ]);

    return NextResponse.json({
      queue: {
        pending: queueSize,
        processing: processingCount,
      },
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    return NextResponse.json(
      { error: "Failed to get queue status" },
      { status: 500 }
    );
  }
}
