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
import { jobs, documents, documentEmbeddings, contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { splitDocumentIntoChunks } from "@/lib/voyage/chunking";
import { generateEmbeddingsBatch } from "@/lib/voyage/embeddings";
import type { DocumentEmbeddingPayload, WizardNarrativesPayload, WizardGenerationPayload } from "@/lib/queue/types";

// Wizard services - background job processing
import {
  generateNarratives,
  generateContent,
  generateWizardRagContext,
  formatRagForPrompt,
  formatRagSourcesForMetadata,
  extractFromUrl,
  transcribeYouTube,
  contextualSearch,
  formatSearchForPrompt,
} from "@/lib/wizard-services";

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

  /**
   * Document Embedding Handler
   *
   * Processes a document by:
   * 1. Fetching the document from database
   * 2. Splitting content into chunks (category-specific)
   * 3. Generating embeddings using Voyage AI voyage-4-large
   * 4. Storing embeddings in database
   * 5. Updating document status
   */
  document_embedding: async (payload: unknown) => {
    const { documentId, userId, force = false } =
      payload as DocumentEmbeddingPayload;

    // Always use voyage-4-large for embeddings
    const model = "voyage-4-large";

    // 1. Get document
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      throw new Error(`Document ${documentId} not found for user ${userId}`);
    }

    // Check if already embedded (unless force is true)
    if (doc.embedded && !force) {
      return {
        success: true,
        alreadyEmbedded: true,
        chunksProcessed: doc.chunksCount ?? 0,
      };
    }

    // 2. Get category-specific chunking options
    const { getChunkingOptionsForCategory } = await import("@/lib/voyage/chunking")
    const category = doc.category ?? "general"
    const chunkingOptions = getChunkingOptionsForCategory(category)

    // 3. Split into chunks with category-specific options
    const chunks = await splitDocumentIntoChunks(doc.content || "", chunkingOptions);

    if (chunks.length === 0) {
      throw new Error("Document content is empty or could not be chunked");
    }

    // 3. Update document with chunk count and status
    await db
      .update(documents)
      .set({
        chunksCount: chunks.length,
        embeddingProgress: 0,
        embeddingStatus: "processing",
      })
      .where(eq(documents.id, documentId));

    // 4. Delete old embeddings if re-embedding
    await db
      .delete(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, documentId));

    // 5. Generate embeddings for all chunks
    const texts = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddingsBatch(texts, model);

    // 6. Insert embeddings with progress tracking
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(documentEmbeddings).values({
        documentId,
        embedding: JSON.stringify(embeddings[i]),
        model,
        chunkIndex: chunks[i].index,
        chunkText: chunks[i].text,
        startPos: chunks[i].startPosition,
        endPos: chunks[i].endPosition,
      });

      // Update progress every few chunks to reduce DB writes
      if (i % 3 === 0 || i === chunks.length - 1) {
        await db
          .update(documents)
          .set({ embeddingProgress: i + 1 })
          .where(eq(documents.id, documentId));
      }
    }

    // 7. Mark document as fully embedded
    await db
      .update(documents)
      .set({
        embedded: true,
        embeddingStatus: "completed",
        lastEmbeddedAt: new Date(),
        embeddingModel: model,
        embeddingProgress: chunks.length,
      })
      .where(eq(documents.id, documentId));

    return {
      success: true,
      chunksProcessed: chunks.length,
      model,
      documentId,
    };
  },

  /**
   * Wizard Narratives Handler
   *
   * Processes wizard_narratives job by:
   * 1. Fetching the wizard from database
   * 2. Extracting content from reference URLs (Firecrawl)
   * 3. Transcribing YouTube videos (Apify)
   * 4. Searching for context (Tavily)
   * 5. Generating RAG context if configured
   * 6. Generating 4 narrative options using AI
   * 7. Updating wizard with narratives
   */
  wizard_narratives: async (payload: unknown) => {
    const { wizardId, userId, contentType, referenceUrl, referenceVideoUrl, theme, context, objective, targetAudience, cta, ragConfig } =
      payload as WizardNarrativesPayload;

    // 1. Get wizard
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      throw new Error(`Wizard ${wizardId} not found for user ${userId}`);
    }

    let extractedContent = "";
    let researchData = "";
    let ragContext: string | null = null;

    // 2. Extract content from reference URL (Firecrawl)
    if (referenceUrl) {
      const firecrawlResult = await extractFromUrl(referenceUrl);
      if (firecrawlResult.success && firecrawlResult.data) {
        extractedContent = firecrawlResult.data.content;
      }
    }

    // 3. Transcribe video (Apify)
    if (referenceVideoUrl) {
      const transcriptionResult = await transcribeYouTube(referenceVideoUrl);
      if (transcriptionResult.success && transcriptionResult.data) {
        if (extractedContent) {
          extractedContent += `\n\n`;
        }
        extractedContent += `Video Transcription:\n${transcriptionResult.data.transcription}`;
      }
    }

    // 4. Search for context (Tavily)
    if (theme) {
      const searchQuery = objective
        ? `${theme} ${objective} ${contentType === "video" ? "video content" : contentType}`
        : `${theme} ${contentType === "video" ? "video content" : contentType}`;

      const searchResult = await contextualSearch(searchQuery, {
        maxResults: 5,
        searchDepth: "basic",
      });

      if (searchResult.success && searchResult.data) {
        researchData = formatSearchForPrompt(searchResult.data);
      }
    }

    // 5. Generate RAG context if configured
    if (ragConfig && (ragConfig.documents || ragConfig.collections)) {
      const ragQuery = `Context for ${contentType} content: ${theme || context || objective || "general content"}`;
      const ragResult = await generateWizardRagContext(userId, ragQuery, ragConfig);

      if (ragResult.success && ragResult.data) {
        ragContext = formatRagForPrompt(ragResult.data);
        // Store RAG source info in researchResults for reference
        const ragSourceInfo = formatRagSourcesForMetadata(ragResult.data);
        if (ragSourceInfo.length > 0) {
          researchData += (researchData ? "\n\n" : "") + `RAG Sources: ${ragSourceInfo.map(s => s.title).join(", ")}`;
        }
      }
    }

    // 6. Generate narratives using AI
    const narrativesResult = await generateNarratives({
      contentType: contentType as any,
      theme,
      context,
      objective,
      targetAudience,
      cta,
      extractedContent: extractedContent || undefined,
      researchData: researchData || undefined,
    });

    if (!narrativesResult.success) {
      throw new Error(`Failed to generate narratives: ${narrativesResult.error}`);
    }

    const narratives = narrativesResult.data!;

    // 7. Update wizard with narratives
    await db
      .update(contentWizards)
      .set({
        narratives: narratives as any, // JSONB column
        extractedContent: extractedContent || null,
        researchQueries: researchData ? [researchData] : [],
        currentStep: "narratives",
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    return {
      success: true,
      narratives,
      wizardId,
    };
  },

  /**
   * Wizard Generation Handler
   *
   * Processes wizard_generation job by:
   * 1. Fetching the wizard with selected narrative
   * 2. Generating RAG context if configured
   * 3. Generating the actual content (slides, caption, etc.)
   * 4. Saving the generated content
   * 5. Updating wizard status
   */
  wizard_generation: async (payload: unknown) => {
    const { wizardId, userId, selectedNarrativeId, contentType, numberOfSlides, model, ragConfig } =
      payload as WizardGenerationPayload;

    // 1. Get wizard
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      throw new Error(`Wizard ${wizardId} not found for user ${userId}`);
    }

    if (!wizard.narratives) {
      throw new Error(`Wizard ${wizardId} has no narratives`);
    }

    // Parse narratives
    const narratives = wizard.narratives as any[];
    const selectedNarrative = narratives.find((n: any) => n.id === selectedNarrativeId);

    if (!selectedNarrative) {
      throw new Error(`Narrative ${selectedNarrativeId} not found`);
    }

    // 2. Generate RAG context if configured
    let ragContextForPrompt: string | undefined;
    if (ragConfig && (ragConfig.documents || ragConfig.collections)) {
      const ragQuery = `Context for ${contentType} generation: ${wizard.theme || wizard.objective || "general content"}`;
      const ragResult = await generateWizardRagContext(userId, ragQuery, ragConfig);

      if (ragResult.success && ragResult.data) {
        ragContextForPrompt = formatRagForPrompt(ragResult.data);
      }
    }

    // 3. Generate content using AI
    const contentResult = await generateContent({
      contentType: contentType as any,
      selectedNarrative: selectedNarrative as any,
      numberOfSlides,
      cta: wizard.cta || undefined,
      negativeTerms: wizard.negativeTerms as string[] | undefined,
      ragContext: ragContextForPrompt,
    }, model);

    if (!contentResult.success) {
      throw new Error(`Failed to generate content: ${contentResult.error}`);
    }

    const generatedContent = contentResult.data!;

    // 4. Update wizard with generated content
    await db
      .update(contentWizards)
      .set({
        generatedContent: JSON.stringify(generatedContent),
        currentStep: "generation",
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    return {
      success: true,
      generatedContent,
      wizardId,
    };
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
