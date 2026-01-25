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
import { dequeueJob, markAsProcessing, removeFromProcessing } from "@/lib/queue/client";
import { getJob, incrementJobAttempts, updateJobStatus } from "@/lib/queue/jobs";
import { db } from "@/db";
import { jobs, documents, documentEmbeddings, contentWizards, libraryItems } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { splitDocumentIntoChunks } from "@/lib/voyage/chunking";
import { generateEmbeddingsBatch } from "@/lib/voyage/embeddings";
import type { DocumentEmbeddingPayload, WizardNarrativesPayload, WizardGenerationPayload, WizardImageGenerationPayload } from "@/lib/queue/types";
import type { WizardProcessingProgress } from "@/db/schema";

// Wizard services - background job processing
import {
  generateNarratives,
  generateContent,
  generateWizardRagContext,
  formatRagForPrompt,
  formatRagSourcesForMetadata,
  extractFromUrl,
  transcribeYouTube,
  formatYouTubeForPrompt,
  contextualSearch,
  formatSearchForPrompt,
  createLibraryItemFromWizard,
  synthesizeResearch,
  generateResearchQueries,
  generateAiImage,
  generateHtmlTemplateImage,
  isImageGenerationAvailable,
  isScreenshotOneAvailable,
} from "@/lib/wizard-services";

import type { SynthesizerInput, SynthesizedResearch, ResearchPlannerOutput, ResearchQuery } from "@/lib/wizard-services";
import type { SearchResult } from "@/lib/wizard-services/types";

// Social media workers
import { publishToInstagram, type InstagramPublishPayload } from "@/lib/social/workers/publish-instagram";
import { publishToFacebook, type FacebookPublishPayload } from "@/lib/social/workers/publish-facebook";
import { fetchSocialMetrics, type MetricsFetchPayload } from "@/lib/social/workers/fetch-metrics";

// Storage
import { getStorageProvider } from "@/lib/storage";

/**
 * Secret para validar chamadas internas do worker
 *
 * Accepts two authentication methods:
 * 1. CRON_SECRET environment variable (recommended for Vercel Cron)
 * 2. WORKER_SECRET environment variable (legacy)
 *
 * For Vercel Cron jobs, use: /api/workers?secret={CRON_SECRET}
 * For direct calls, use: Authorization: Bearer {CRON_SECRET}
 */
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret";
const WORKER_SECRET = process.env.WORKER_SECRET || process.env.CRON_SECRET || "dev-secret";

/**
 * Validates that required API keys are configured
 * Returns error message if any required key is missing, null if all OK
 */
function validateRequiredApiKeys(jobType: string): string | null {
  const missing: string[] = [];

  // OPENROUTER is always required for AI operations
  if (!process.env.OPENROUTER_API_KEY) {
    missing.push("OPENROUTER_API_KEY");
  }

  // Job-specific validations
  if (jobType === "wizard_narratives") {
    // These are optional but log warnings if missing
    if (!process.env.TAVILY_API_KEY) {
      console.warn("TAVILY_API_KEY not configured - contextual search will be skipped");
    }
    if (!process.env.FIRECRAWL_API_KEY) {
      console.warn("FIRECRAWL_API_KEY not configured - URL extraction will be skipped");
    }
    if (!process.env.APIFY_API_KEY) {
      console.warn("APIFY_API_KEY not configured - YouTube transcription will be skipped");
    }
  }

  if (jobType === "document_embedding") {
    // VOYAGE is required for document embedding
    if (!process.env.VOYAGE_API_KEY) {
      missing.push("VOYAGE_API_KEY");
    }
  }

  return missing.length > 0 ? `Missing required API keys: ${missing.join(", ")}` : null;
}

/**
 * Helper para atualizar o progresso do wizard durante processamento
 */
async function updateWizardProgress(
  wizardId: number,
  data: {
    jobStatus?: "pending" | "processing" | "completed" | "failed";
    processingProgress?: WizardProcessingProgress;
    jobError?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.jobStatus) {
    updateData.jobStatus = data.jobStatus;
  }
  if (data.processingProgress) {
    updateData.processingProgress = data.processingProgress as any;
  }
  if (data.jobError) {
    updateData.jobError = data.jobError;
  }

  await db.update(contentWizards).set(updateData).where(eq(contentWizards.id, wizardId));
}

/**
 * Helper para fazer upload de imagem base64 para o storage
 *
 * Converte data:image/png;base64,... em Buffer e faz upload
 * Retorna a URL pública da imagem
 */
async function uploadBase64ImageToStorage(
  base64DataUrl: string,
  wizardId: number,
  slideNumber: number
): Promise<string> {
  // Extrair os dados base64 da URL
  const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 data URL format");
  }

  const format = matches[1]; // png, jpeg, etc.
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');

  // Gerar chave única para o arquivo
  const timestamp = Date.now();
  const key = `wizard-${wizardId}/slide-${slideNumber}-${timestamp}.${format}`;

  // Fazer upload usando o storage provider configurado
  const storage = getStorageProvider();
  const result = await storage.uploadFile(buffer, key, {
    contentType: `image/${format}`,
  });

  console.log(`[STORAGE] Uploaded image to ${result.url}`);

  return result.url;
}

/**
 * Helper para formatar pesquisa sintetizada para o prompt de narrativas
 * Transforma a estrutura JSON do Synthesizer em texto formatado
 * v3.1: Updated for v4.1 carousel fields
 */
function formatSynthesizedResearchForPrompt(synthesized: SynthesizedResearch): string {
  const sections: string[] = [];

  // Summary (v3.1: prefer resumo_executivo, fallback to summary)
  if (synthesized.resumo_executivo) {
    sections.push(`## RESUMO DA PESQUISA\n${synthesized.resumo_executivo}\n`);
  } else if (synthesized.summary) {
    sections.push(`## RESUMO DA PESQUISA\n${synthesized.summary}\n`);
  }

  // Narrative suggestion
  if (synthesized.narrative_suggestion) {
    sections.push(`## SUGESTÃO DE NARRATIVA\n${synthesized.narrative_suggestion}\n`);
  }

  // v3.1: Throughlines potenciais
  if (synthesized.throughlines_potenciais?.length > 0) {
    sections.push("## THROUGHLINES SUGERIDOS");
    synthesized.throughlines_potenciais.forEach((t, i) => {
      sections.push(`${i + 1}. "${t.throughline}"`);
      if (t.potencial_viral) sections.push(`   Potencial viral: ${t.potencial_viral}`);
      if (t.justificativa) sections.push(`   Justificativa: ${t.justificativa}`);
    });
    sections.push("");
  }

  // v3.1: Tensões narrativas
  if (synthesized.tensoes_narrativas?.length > 0) {
    sections.push("## TENSÕES NARRATIVAS");
    synthesized.tensoes_narrativas.forEach((t, i) => {
      sections.push(`${i + 1}. ${t.tensao}`);
      if (t.tipo) sections.push(`   Tipo: ${t.tipo}`);
      if (t.uso_sugerido) sections.push(`   Uso: ${t.uso_sugerido}`);
    });
    sections.push("");
  }

  // Concrete data
  if (synthesized.concrete_data?.length > 0) {
    sections.push("## DADOS CONCRETOS");
    synthesized.concrete_data.forEach((d, i) => {
      sections.push(`${i + 1}. ${d.dado}`);
      sections.push(`   Fonte: ${d.fonte}`);
      sections.push(`   Uso sugerido: ${d.uso_sugerido}`);
    });
    sections.push("");
  }

  // v3.1: Dados contextualizados (ready phrases)
  if (synthesized.dados_contextualizados?.length > 0) {
    sections.push("## DADOS CONTEXTUALIZADOS");
    synthesized.dados_contextualizados.forEach((d, i) => {
      sections.push(`${i + 1}. ${d.frase_pronta}`);
      sections.push(`   Fonte: ${d.fonte}`);
      if (d.contraste) sections.push(`   Contraste: ${d.contraste}`);
    });
    sections.push("");
  }

  // v3.1: Exemplos narrativos (complete stories)
  if (synthesized.exemplos_narrativos?.length > 0) {
    sections.push("## EXEMPLOS NARRATIVOS");
    synthesized.exemplos_narrativos.forEach((e, i) => {
      sections.push(`${i + 1}. ${e.protagonista}`);
      sections.push(`   Situação: ${e.situacao_inicial}`);
      sections.push(`   Ação: ${e.acao}`);
      sections.push(`   Resultado: ${e.resultado}`);
      sections.push(`   Lição: ${e.aprendizado}`);
    });
    sections.push("");
  }

  // Legacy real examples (fallback)
  const realExamples = synthesized.real_examples;
  if (realExamples && realExamples.length > 0) {
    sections.push("## EXEMPLOS REAIS");
    realExamples.forEach((e, i) => {
      sections.push(`${i + 1}. ${e.exemplo}`);
      if (e.contexto) sections.push(`   Contexto: ${e.contexto}`);
    });
    sections.push("");
  }

  // v3.1: Erros e armadilhas (counter-intuitive mistakes)
  const errosArmadilhas = synthesized.erros_armadilhas;
  if (errosArmadilhas && errosArmadilhas.length > 0) {
    sections.push("## ERROS E ARMADILHAS");
    errosArmadilhas.forEach((e, i) => {
      sections.push(`${i + 1}. ${e.erro}`);
      if (e.por_que_parece_certo) sections.push(`   Por que parece certo: ${e.por_que_parece_certo}`);
      if (e.consequencia_real) sections.push(`   Consequência: ${e.consequencia_real}`);
      if (e.alternativa) sections.push(`   Alternativa: ${e.alternativa}`);
    });
    sections.push("");
  }

  // Legacy errors and risks (fallback)
  const errorsRisks = synthesized.errors_risks;
  if (errorsRisks && errorsRisks.length > 0) {
    sections.push("## ERROS E RISCOS A EVITAR");
    errorsRisks.forEach((e, i) => {
      sections.push(`${i + 1}. ${e.erro}`);
      if (e.consequencia) sections.push(`   Consequência: ${e.consequencia}`);
      if (e.como_evitar) sections.push(`   Como evitar: ${e.como_evitar}`);
    });
    sections.push("");
  }

  // Frameworks and methods (v3.1: uses problema_que_resolve instead of descricao)
  const frameworksMetodos = synthesized.frameworks_metodos;
  if (frameworksMetodos && frameworksMetodos.length > 0) {
    sections.push("## FRAMEWORKS E MÉTODOS");
    frameworksMetodos.forEach((f, i) => {
      sections.push(`${i + 1}. ${f.nome}`);
      if (f.problema_que_resolve) sections.push(`   Resolve: ${f.problema_que_resolve}`);
      if (f.passos?.length) sections.push(`   Passos: ${f.passos.join(" → ")}`);
      if (f.exemplo_aplicacao) sections.push(`   Exemplo: ${f.exemplo_aplicacao}`);
    });
    sections.push("");
  }

  // Hooks
  const hooks = synthesized.hooks;
  if (hooks && hooks.length > 0) {
    sections.push("## GANCHOS PARA ENGAJAMENTO");
    hooks.forEach((h, i) => {
      sections.push(`${i + 1}. ${h.gancho}`);
      if (h.tipo) sections.push(`   Tipo: ${h.tipo}`);
      if (h.potencial_viral) sections.push(`   Potencial: ${h.potencial_viral}`);
    });
    sections.push("");
  }

  // v3.1: Perguntas respondidas (for open loops)
  if (synthesized.perguntas_respondidas?.length > 0) {
    sections.push("## PERGUNTAS RESPONDIDAS");
    synthesized.perguntas_respondidas.forEach((p, i) => {
      sections.push(`${i + 1}. ${p}`);
    });
    sections.push("");
  }

  // v3.1: Progressão sugerida
  if (synthesized.progressao_sugerida) {
    const ps = synthesized.progressao_sugerida;
    sections.push("## PROGRESSÃO SUGERIDA");
    sections.push(`Ato 1 (Captura):`);
    if (ps.ato1_captura.gancho_principal) sections.push(`  Gancho: ${ps.ato1_captura.gancho_principal}`);
    if (ps.ato1_captura.tensao_inicial) sections.push(`  Tensão: ${ps.ato1_captura.tensao_inicial}`);
    if (ps.ato1_captura.promessa) sections.push(`  Promessa: ${ps.ato1_captura.promessa}`);
    sections.push(`Ato 2 (Desenvolvimento):`);
    if (ps.ato2_desenvolvimento?.length > 0) {
      ps.ato2_desenvolvimento.forEach((item, i) => {
        sections.push(`  ${i + 1}. ${item}`);
      });
    }
    sections.push(`Ato 3 (Resolução):`);
    if (ps.ato3_resolucao.verdade_central) sections.push(`  Verdade: ${ps.ato3_resolucao.verdade_central}`);
    if (ps.ato3_resolucao.call_to_action_natural) sections.push(`  CTA: ${ps.ato3_resolucao.call_to_action_natural}`);
    sections.push("");
  }

  // Gaps and opportunities
  if (synthesized.gaps_oportunidades?.length > 0) {
    sections.push("## GAPS E OPORTUNIDADES");
    synthesized.gaps_oportunidades.forEach((g, i) => {
      sections.push(`${i + 1}. ${g}`);
    });
    sections.push("");
  }

  return sections.join("\n");
}

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

  /**
   * Social Media - Instagram Publish Handler
   *
   * Publishes a post to Instagram via the Instagram Graph API.
   * Handles both single media and carousel posts.
   */
  social_publish_instagram: async (payload: unknown) => {
    const { publishedPostId, userId } = payload as InstagramPublishPayload;
    return await publishToInstagram({ publishedPostId, userId });
  },

  /**
   * Social Media - Facebook Publish Handler
   *
   * Publishes a post to Facebook via the Facebook Graph API.
   * Facebook supports native scheduling via scheduled_publish_time.
   */
  social_publish_facebook: async (payload: unknown) => {
    const { publishedPostId, userId } = payload as FacebookPublishPayload;
    return await publishToFacebook({ publishedPostId, userId });
  },

  /**
   * Social Media - Metrics Fetch Handler
   *
   * Fetches metrics for published posts from Instagram and Facebook.
   * Updates the metrics in the database.
   */
  social_metrics_fetch: async (payload: unknown) => {
    return await fetchSocialMetrics(payload as MetricsFetchPayload);
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

    // ==============================================================================
    // WIZARD DEBUG: WORKER RECEBEU JOB (NARRATIVAS)
    // ==============================================================================
    console.log(`[WIZARD] JOB wizard_narratives START - wizardId: ${wizardId}, userId: ${userId}, type: ${contentType}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: PAYLOAD RECEBIDO DO JOB`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] referenceUrl: ${referenceUrl || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] referenceVideoUrl: ${referenceVideoUrl || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] theme: ${theme || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] context: ${context || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] objective: ${objective || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] targetAudience: ${targetAudience || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] cta: ${cta || "(não informado)"}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);

    // 1. Get wizard
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      throw new Error(`Wizard ${wizardId} not found for user ${userId}`);
    }

    // Set initial status to processing
    await updateWizardProgress(wizardId, {
      jobStatus: "processing",
      processingProgress: {
        stage: "extraction",
        percent: 10,
        message: "Iniciando processamento...",
      },
    });

    let extractedContent = "";
    let researchData = "";
    let synthesizedResearchData: SynthesizedResearch | null = null;

    // ==============================================================================
    // WIZARD DEBUG: VERIFICANDO SE PRECISA EXTRAIR URL DE REFERÊNCIA
    // ==============================================================================
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: VERIFICANDO URL DE REFERÊNCIA`);
    console.log(`[WIZARD-DEBUG] referenceUrl existe? ${referenceUrl ? "SIM ✅" : "NÃO ❌"}`);
    if (referenceUrl) {
      console.log(`[WIZARD-DEBUG] referenceUrl valor: ${referenceUrl}`);
    }
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);

    // 2. Extract content from reference URL (Firecrawl)
    if (referenceUrl) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "extraction",
          percent: 25,
          message: "Extraindo conteúdo da URL de referência...",
        },
      });

      console.log(`[WIZARD-DEBUG] WORKER: Iniciando extração de URL: ${referenceUrl}`);
      const firecrawlResult = await extractFromUrl(referenceUrl);

      console.log(`[WIZARD-DEBUG] WORKER: Resultado Firecrawl - success=${firecrawlResult.success}`);
      if (!firecrawlResult.success) {
        console.log(`[WIZARD-DEBUG] WORKER: Erro Firecrawl: ${firecrawlResult.error}`);
      }

      if (firecrawlResult.success && firecrawlResult.data) {
        extractedContent = firecrawlResult.data.content;
        console.log(`[WIZARD-DEBUG] WORKER: ✅ Conteúdo extraído com sucesso (${extractedContent.length} chars)`);
        console.log(extractedContent.substring(0, 500) + (extractedContent.length > 500 ? "..." : ""));
      } else {
        console.log(`[WIZARD-DEBUG] WORKER: ❌ Falha na extração: ${!firecrawlResult.success ? firecrawlResult.error : "no data"}`);
      }
    } else {
      console.log(`[WIZARD-DEBUG] WORKER: ⏭️ Pulando extração de URL (nenhuma URL fornecida)`);
    }

    // 3. Transcribe video (Apify)
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: VERIFICANDO SE PRECISA TRANSCREVER VÍDEO`);
    console.log(`[WIZARD-DEBUG] referenceVideoUrl existe? ${referenceVideoUrl ? "SIM ✅" : "NÃO ❌"}`);
    if (referenceVideoUrl) {
      console.log(`[WIZARD-DEBUG] referenceVideoUrl valor: ${referenceVideoUrl}`);
    }
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);

    if (referenceVideoUrl) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "transcription",
          percent: 40,
          message: "Transcrevendo vídeo do YouTube...",
        },
      });

      console.log(`[WIZARD-DEBUG] WORKER: Transcrevendo vídeo: ${referenceVideoUrl}`);
      const transcriptionResult = await transcribeYouTube(referenceVideoUrl);
      if (transcriptionResult.success && transcriptionResult.data) {
        // Log metadata extraídos
        console.log(`[WIZARD-YOUTUBE] ✅ Transcrição bem-sucedida!`);
        console.log(`[WIZARD-YOUTUBE] 📺 Título: ${transcriptionResult.data.metadata?.title || "(não informado)"}`);
        console.log(`[WIZARD-YOUTUBE] 👤 Canal: ${transcriptionResult.data.metadata?.channelName || "(não informado)"}`);
        console.log(`[WIZARD-YOUTUBE] 📊 Views: ${transcriptionResult.data.metadata?.viewCount?.toLocaleString('pt-BR') || "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] ❤️ Likes: ${transcriptionResult.data.metadata?.likeCount?.toLocaleString('pt-BR') || "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] 💬 Comentários: ${transcriptionResult.data.metadata?.commentCount?.toLocaleString('pt-BR') || "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] ⏱️ Duração: ${transcriptionResult.data.metadata?.duration ? `${Math.floor(transcriptionResult.data.metadata.duration / 60)}:${(transcriptionResult.data.metadata.duration % 60).toString().padStart(2, '0')}` : "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] 📅 Publicado: ${transcriptionResult.data.metadata?.publishedAt ? new Date(transcriptionResult.data.metadata.publishedAt).toLocaleDateString('pt-BR') : "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] 🌐 Idioma: ${transcriptionResult.data.metadata?.language?.toUpperCase() || "N/A"}`);
        console.log(`[WIZARD-YOUTUBE] 📝 Tamanho transcrição: ${transcriptionResult.data.transcription.length} caracteres`);

        if (extractedContent) {
          extractedContent += `\n\n`;
        }
        // Use formatYouTubeForPrompt for structured metadata
        extractedContent += formatYouTubeForPrompt(transcriptionResult.data);
        console.log(`[WIZARD-YOUTUBE] 📦 Conteúdo formatado adicionado ao extractedContent (+${formatYouTubeForPrompt(transcriptionResult.data).length} chars)`);
      } else {
        console.log(`[WIZARD-DEBUG] WORKER: Falha na transcrição: ${!transcriptionResult.success ? transcriptionResult.error : "no data"}`);
      }
    } else {
      console.log(`[WIZARD-YOUTUBE] ⏭️ Pulando transcrição de vídeo (nenhuma URL fornecida)`);
    }

    // ==============================================================================
    // WIZARD DEBUG: RESUMO DA FASE DE EXTRAÇÃO
    // ==============================================================================
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: RESUMO DA EXTRAÇÃO`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] extractedContent final: ${extractedContent ? `${extractedContent.length} caracteres` : "(vazio)"}`);
    if (extractedContent) {
      console.log(`[WIZARD-DEBUG] Preview (primeiros 300 chars):`);
      console.log(extractedContent.substring(0, 300) + (extractedContent.length > 300 ? "..." : ""));
    }
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);

    // 4. Search for context (Tavily)
    if (theme) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "research",
          percent: 60,
          message: "Pesquisando informações contextuais...",
        },
      });

      // ==============================================================================
      // RESEARCH PLANNER v2.0: Gerar 7 queries estratégicas em 3 camadas
      // ==============================================================================
      console.log(`[WIZARD] RESEARCH-PLANNER v2.0 - theme: ${theme}, objective: ${objective || "(none)"}`);

      // Declare variables in outer scope for synthesizer access
      let researchPlan: ResearchPlannerOutput | undefined;
      const allSearchResults: Array<{
        query: string;
        layer: string;
        intent: string;
        result?: any;
        sources: any[];
      }> = [];

      const researchPlannerResult = await generateResearchQueries({
        theme,
        niche: context,
        objective,
        tone: context,
        numberOfSlides: 10, // Will be read from wizard in future
        cta,
        targetAudience,
      });

      if (!researchPlannerResult.success || !researchPlannerResult.data) {
        const errorMsg = !researchPlannerResult.success
          ? (researchPlannerResult as any).error || "Unknown error"
          : "No data returned";
        console.log(`[WIZARD] RESEARCH-PLANNER failed: ${errorMsg}`);
        // Fallback to simple query
        const fallbackQuery = objective ? `${theme} ${objective}` : theme;
        const fallbackResult = await contextualSearch(fallbackQuery, { maxResults: 5, searchDepth: "basic" });
        if (fallbackResult.success && fallbackResult.data) {
          researchData = formatSearchForPrompt(fallbackResult.data);
        }
      } else {
        researchPlan = researchPlannerResult.data;
        console.log(`[WIZARD] RESEARCH-PLANNER generated ${researchPlan.queries.length} queries`);

        // ==============================================================================
        // MULTI-QUERY EXECUTION: Executar 7 searches no Tavily
        // ==============================================================================

        for (let i = 0; i < researchPlan.queries.length; i++) {
          const q = researchPlan.queries[i];
          await updateWizardProgress(wizardId, {
            processingProgress: {
              stage: "research",
              percent: 55 + (i * 3), // 55% to 76%
              message: `Pesquisando: ${q.q.substring(0, 30)}... (${i + 1}/${researchPlan.queries.length})`,
            },
          });

          console.log(`[WIZARD] QUERY ${i + 1}/${researchPlan.queries.length} [${q.layer}/${q.intent}]: "${q.q}"`);

          const searchResult = await contextualSearch(q.q, {
            maxResults: 3, // Fewer results per query to avoid too much data
            searchDepth: "basic",
          });

          if (searchResult.success && searchResult.data) {
            allSearchResults.push({
              query: q.q,
              layer: q.layer,
              intent: q.intent,
              result: searchResult.data,
              sources: searchResult.data?.sources || [],
            });
            console.log(`[WIZARD] QUERY ${i + 1}: Found ${searchResult.data?.sources?.length || 0} sources`);
          } else {
            console.log(`[WIZARD] QUERY ${i + 1}: No results`);
          }
        }

        // ==============================================================================
        // AGGREGATION: Combinar todos os resultados
        // ==============================================================================
        console.log(`[WIZARD] AGGREGATING ${allSearchResults.length} query results`);

        const aggregatedSources = allSearchResults.flatMap((r, idx) =>
          r.sources.map((s: any) => ({
            ...s,
            queryContext: r.query,
            layer: r.layer,
            intent: r.intent,
            queryIndex: idx,
          }))
        );

        const totalSources = aggregatedSources.length;
        console.log(`[WIZARD] TOTAL SOURCES: ${totalSources}`);

        // Format aggregated research data for prompt
        researchData = allSearchResults
          .filter((r) => r.result?.answer)
          .map((r) => `[${r.layer}/${r.intent}] ${r.result?.answer || ""}`)
          .join("\n\n");

        // Add all sources
        if (aggregatedSources.length > 0) {
          researchData += "\n\nFONTES:\n" + aggregatedSources
            .slice(0, 20) // Limit to 20 sources max
            .map((s: any, i: number) =>
              `${i + 1}. ${s.title || "Untitled"}\n   URL: ${s.url}\n   Query: ${s.queryContext}`
            )
            .join("\n");
        }

        console.log(`[WIZARD] RESEARCH DATA SIZE: ${researchData.length} chars`);
      }

      // ==============================================================================
      // SYNTHESIZER: Condensar Queries (Nova etapa crítica)
      // Transforma resultados brutos do Tavily em campos estruturados
      // ==============================================================================
      if (researchData) {
        await updateWizardProgress(wizardId, {
          processingProgress: {
            stage: "research",
            percent: 78,
            message: "Sintetizando pesquisa em insights acionáveis...",
          },
        });

        console.log(`[WIZARD] SYNTHESIZER - Starting research synthesis...`);

        // Prepare aggregated search results for synthesizer
        const researchResultsForSynthesizer = researchPlan?.queries
          ?.map((q: ResearchQuery) => {
            const queryResult = (allSearchResults as any)?.find((r: any) => r.query === q.q);
            const answer = queryResult?.result?.answer || "";
            const sources = (queryResult?.sources || []).map((item: any) => ({
              title: item.title,
              url: item.url,
              content: item.snippet || item.content || "",
            }));

            // Include result if it has an answer OR has sources
            // This ensures we don't lose data when Tavily returns only AI answers
            if (answer || sources.length > 0) {
              return {
                query: q.q,
                answer,
                sources,
              };
            }
            return null;
          })
          .filter((r): r is { query: string; answer: string; sources: any[] } => r !== null) || [];

        if (researchResultsForSynthesizer.length > 0) {
          console.log(`[WIZARD] SYNTHESIZER - Processing ${researchResultsForSynthesizer.length} research results`);

          // Build research results array for synthesizer
          // Include both: results with sources AND results with only AI answers
          const synthesizerResearchResults: any[] = [];

          for (const r of researchResultsForSynthesizer) {
            // Add each source as a separate result
            if (r.sources.length > 0) {
              for (const s of r.sources) {
                synthesizerResearchResults.push({
                  query: r.query,
                  answer: r.answer,
                  title: s.title,
                  url: s.url,
                  content: s.content,
                });
              }
            } else if (r.answer) {
              // If no sources but has AI answer, add it as a result
              synthesizerResearchResults.push({
                query: r.query,
                answer: r.answer,
                title: "AI Analysis",
                url: "",
                content: r.answer,
              });
            }
          }

          console.log(`[WIZARD] SYNTHESIZER - Total items to synthesize: ${synthesizerResearchResults.length}`);

          const synthesizerInput: SynthesizerInput = {
            topic: theme || "",
            niche: context || "geral",
            objective: objective || "engajamento",
            researchResults: synthesizerResearchResults,
            extractedContent: extractedContent || undefined,
            targetAudience: targetAudience || undefined,
            tone: context || "profissional",
          };

          const synthesisResult = await synthesizeResearch(synthesizerInput);

          if (synthesisResult.success) {
            const synthesisData = synthesisResult.data;
            const synthesizerEnhancedResearchData = formatSynthesizedResearchForPrompt(synthesisData);

            // Add synthesized insights to research data
            if (synthesizerEnhancedResearchData) {
              researchData += "\n\n" + synthesizerEnhancedResearchData;
            }

            console.log(`[WIZARD] SYNTHESIZER SUCCESS`);
            console.log(`  - Dados concretos: ${synthesisData.concrete_data.length}`);
            console.log(`  - Exemplos reais: ${synthesisData.real_examples?.length ?? 0}`);
            console.log(`  - Erros e riscos: ${synthesisData.errors_risks?.length ?? 0}`);
            console.log(`  - Frameworks: ${synthesisData.frameworks_metodos.length}`);
            console.log(`  - Ganchos: ${synthesisData.hooks.length}`);

            // Store synthesized research in wizard (will be saved at the end)
            synthesizedResearchData = synthesisData;
          } else {
            console.log(`[WIZARD] SYNTHESIZER failed, using raw data`);
          }
        }
      }
    }

    // 5. Generate RAG context if configured
    if (ragConfig && (ragConfig.documents || ragConfig.collections)) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "research",
          percent: 70,
          message: "Buscando contexto na base de conhecimento...",
        },
      });

      const ragQuery = `Context for ${contentType} content: ${theme || context || objective || "general content"}`;
      const ragResult = await generateWizardRagContext(userId, ragQuery, ragConfig);

      if (ragResult.success && ragResult.data) {
        const ragContext = formatRagForPrompt(ragResult.data);
        // Store RAG source info in researchResults for reference
        const ragSourceInfo = formatRagSourcesForMetadata(ragResult.data);
        if (ragSourceInfo.length > 0) {
          researchData += (researchData ? "\n\n" : "") + `RAG Sources: ${ragSourceInfo.map(s => s.title).join(", ")}`;
        }
      }
    }

    // 6. Generate narratives using AI
    await updateWizardProgress(wizardId, {
      processingProgress: {
        stage: "narratives",
        percent: 85,
        message: "Gerando narrativas com IA...",
      },
    });

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
      // Update wizard with error status
      await updateWizardProgress(wizardId, {
        jobStatus: "failed",
        jobError: `Failed to generate narratives: ${narrativesResult.error}`,
      });
      throw new Error(`Failed to generate narratives: ${narrativesResult.error}`);
    }

    const narratives = narrativesResult.data!;

    // ==============================================================================
    // WIZARD DEBUG: NARRATIVAS GERADAS COM SUCESSO
    // ==============================================================================
    console.log(`[WIZARD] Generated ${narratives.length} narratives for wizard ${wizardId}: ${narratives.map(n => `${n.angle}:${n.id}`).join(", ")}`);

    // 7. Update wizard with narratives and mark as completed
    await db
      .update(contentWizards)
      .set({
        narratives: narratives as any, // JSONB column
        extractedContent: extractedContent || null,
        researchQueries: researchData ? [researchData] : [],
        synthesizedResearch: synthesizedResearchData || null,
        currentStep: "narratives",
        jobStatus: "completed",
        processingProgress: {
          stage: "narratives",
          percent: 100,
          message: "Narrativas geradas com sucesso!",
        },
        jobError: null,
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

    // ==============================================================================
    // WIZARD DEBUG: WORKER RECEBEU JOB (GENERATION)
    // ==============================================================================
    console.log(`[WIZARD] JOB wizard_generation START - wizardId: ${wizardId}, narrative: ${selectedNarrativeId}, model: ${model}`);

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

    // Set initial status to processing
    await updateWizardProgress(wizardId, {
      jobStatus: "processing",
      processingProgress: {
        stage: "generation",
        percent: 10,
        message: "Iniciando geração de conteúdo...",
      },
    });

    // Parse narratives
    const narratives = wizard.narratives as any[];
    const selectedNarrative = narratives.find((n: any) => n.id === selectedNarrativeId);

    // ==============================================================================
    // WIZARD DEBUG: NARRATIVA SELECIONADA
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: NARRATIVA SELECIONADA PELO USUÁRIO`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] selectedNarrativeId: ${selectedNarrativeId}`);
    console.log(`[WIZARD-DEBUG] Narrativa encontrada:`, JSON.stringify(selectedNarrative, null, 2));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    if (!selectedNarrative) {
      await updateWizardProgress(wizardId, {
        jobStatus: "failed",
        jobError: `Narrative ${selectedNarrativeId} not found`,
      });
      throw new Error(`Narrative ${selectedNarrativeId} not found`);
    }

    // 2. Generate RAG context if configured
    let ragContextForPrompt: string | undefined;
    // Check if RAG should be used: auto mode OR has explicit documents/collections selected
    const shouldUseRag = ragConfig && (
      ragConfig.mode === "auto" ||
      ragConfig.mode === undefined ||
      (ragConfig.documents && ragConfig.documents.length > 0) ||
      (ragConfig.collections && ragConfig.collections.length > 0)
    );

    if (shouldUseRag) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "generation",
          percent: 30,
          message: "Buscando contexto na base de conhecimento...",
        },
      });

      const ragQuery = `Context for ${contentType} generation: ${wizard.theme || wizard.objective || "general content"}`;
      console.log(`[WIZARD-DEBUG] RAG: Buscando contexto com query: ${ragQuery}`);
      console.log(`[WIZARD-DEBUG] RAG: Config mode=${ragConfig?.mode}, documents=${ragConfig?.documents?.length || 0}, collections=${ragConfig?.collections?.length || 0}`);

      const ragResult = await generateWizardRagContext(userId, ragQuery, ragConfig);

      if (ragResult.success && ragResult.data) {
        ragContextForPrompt = formatRagForPrompt(ragResult.data);
        console.log(`[WIZARD-DEBUG] RAG: Contexto gerado com sucesso (${ragResult.data.chunksIncluded} chunks, ${ragResult.data.tokensUsed} tokens)`);
      } else {
        console.log(`[WIZARD-DEBUG] RAG: Nenhum contexto encontrado ou erro na busca`);
      }
    } else {
      console.log(`[WIZARD-DEBUG] RAG: Não configurado ou desabilitado (ragConfig=${ragConfig ? 'sim' : 'não'})`);
    }

    // 3. Generate content using AI
    await updateWizardProgress(wizardId, {
      processingProgress: {
        stage: "generation",
        percent: 60,
        message: "Gerando conteúdo final com IA...",
      },
    });

    const contentResult = await generateContent({
      contentType: contentType as any,
      selectedNarrative: selectedNarrative as any,
      numberOfSlides,
      cta: wizard.cta || undefined,
      negativeTerms: wizard.negativeTerms as string[] | undefined,
      ragContext: ragContextForPrompt,
    }, model);

    if (!contentResult.success) {
      // Update wizard with error status
      await updateWizardProgress(wizardId, {
        jobStatus: "failed",
        jobError: `Failed to generate content: ${contentResult.error}`,
      });
      throw new Error(`Failed to generate content: ${contentResult.error}`);
    }

    const generatedContent = contentResult.data!;

    // 4. Update wizard with generated content and mark as completed
    await db
      .update(contentWizards)
      .set({
        generatedContent: JSON.stringify(generatedContent),
        currentStep: "generation",
        jobStatus: "completed",
        processingProgress: {
          stage: "generation",
          percent: 100,
          message: "Conteúdo gerado com sucesso!",
        },
        jobError: null,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    // 5. Sync to library (create library item from generated content)
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: INICIANDO SINCRONIZAÇÃO COM BIBLIOTECA`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] wizardId: ${wizardId}`);
    console.log(`[WIZARD-DEBUG] userId: ${userId}`);
    console.log(`[WIZARD-DEBUG] contentType: ${contentType}`);
    console.log(`[WIZARD-DEBUG] wizardMetadata:`, JSON.stringify({
      theme: wizard.theme,
      objective: wizard.objective,
      targetAudience: wizard.targetAudience,
      context: wizard.context,
    }, null, 2));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    const libraryResult = await createLibraryItemFromWizard({
      wizardId,
      userId,
      generatedContent,
      contentType: contentType as any,
      wizardMetadata: {
        theme: wizard.theme,
        objective: wizard.objective,
        targetAudience: wizard.targetAudience,
        context: wizard.context,
      },
    });

    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: RESULTADO DA SINCRONIZAÇÃO`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] success: ${libraryResult.success}`);
    console.log(`[WIZARD-DEBUG] libraryItemId: ${libraryResult.libraryItemId || "(não criado)"}`);
    if (libraryResult.error) {
      console.log(`[WIZARD-DEBUG] error: ${libraryResult.error}`);
    }
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    if (libraryResult.success && libraryResult.libraryItemId) {
      // Update wizard with the library item ID
      await db
        .update(contentWizards)
        .set({ libraryItemId: libraryResult.libraryItemId })
        .where(eq(contentWizards.id, wizardId));

      console.log(`[WIZARD-DEBUG] WORKER: Library item ${libraryResult.libraryItemId} vinculado ao wizard ${wizardId}`);
    } else {
      // Log error but don't fail the wizard - content was successfully generated
      console.error(`[WIZARD-DEBUG] WORKER: Library sync failed for wizard ${wizardId}:`, libraryResult.error);
    }

    // ==============================================================================
    // WIZARD DEBUG: WORKER CONCLUIU JOB COM SUCESSO
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] WORKER: JOB wizard_generation CONCLUÍDO COM SUCESSO`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] wizardId: ${wizardId}`);
    console.log(`[WIZARD-DEBUG] libraryItemId: ${libraryResult.libraryItemId || "(não criado)"}`);
    console.log(`[WIZARD-DEBUG] contentType: ${generatedContent.type}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    return {
      success: true,
      generatedContent,
      wizardId,
      libraryItemId: libraryResult.success ? libraryResult.libraryItemId : undefined,
    };
  },

  /**
   * Wizard Image Generation Handler
   *
   * Processes wizard_image_generation job by:
   * 1. Fetching the wizard with generated content
   * 2. Generating images (AI or HTML template) for each slide
   * 3. Updating wizard.generatedImages
   * 4. Syncing to library (updating libraryItems.mediaUrl)
   * 5. Marking job as completed
   */
  wizard_image_generation: async (payload: unknown) => {
    const { wizardId, userId, config } =
      payload as WizardImageGenerationPayload;

    console.log(`[WIZARD-IMAGE] JOB wizard_image_generation START - wizardId: ${wizardId}, userId: ${userId}`);

    // 1. Get wizard
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
      .limit(1);

    if (!wizard) {
      throw new Error(`Wizard ${wizardId} not found for user ${userId}`);
    }

    // 2. Determine number of slides to generate
    let numberOfSlides = 1;
    let slides: Array<{ content: string; title?: string }> = [];

    if (wizard.generatedContent && typeof wizard.generatedContent === "object") {
      const content = wizard.generatedContent as Record<string, unknown>;
      if (content.slides && Array.isArray(content.slides)) {
        numberOfSlides = content.slides.length;
        slides = content.slides.map((s: unknown) => {
          const slide = s as Record<string, unknown>;
          return {
            content: String(slide.content || ""),
            title: slide.title ? String(slide.title) : undefined,
          };
        });
      }
    }

    // Fallback to theme if no slides found
    if (slides.length === 0) {
      slides = [{ content: wizard.theme || "Conteúdo gerado" }];
      numberOfSlides = 1;
    }

    console.log(`[WIZARD-IMAGE] Generating ${numberOfSlides} images for ${slides.length} slides`);

    // 3. Determine effective configuration (support both legacy and coverPosts format)
    let effectiveConfig: typeof config = config;

    if (config.coverPosts && !config.method) {
      const cp = config.coverPosts;
      effectiveConfig = {
        method: cp.coverMethod,
        aiOptions: cp.coverAiOptions,
        htmlOptions: cp.coverHtmlOptions,
        coverPosts: cp,
      } as typeof config;
    }

    // Validate configuration
    const hasValidAiConfig = effectiveConfig.method === "ai" && effectiveConfig.aiOptions;
    const hasValidHtmlConfig = effectiveConfig.method === "html-template" && effectiveConfig.htmlOptions;

    if (!hasValidAiConfig && !hasValidHtmlConfig) {
      throw new Error("Invalid configuration for selected method");
    }

    // Check service availability
    if (effectiveConfig.method === "ai" && !isImageGenerationAvailable()) {
      throw new Error("OpenRouter API key not configured");
    }

    if (effectiveConfig.method === "html-template" && !isScreenshotOneAvailable()) {
      throw new Error("ScreenshotOne access key not configured");
    }

    // 4. Update wizard with processing status
    await updateWizardProgress(wizardId, {
      jobStatus: "processing",
      processingProgress: {
        stage: "generation",
        percent: 10,
        message: "Iniciando geração de imagens...",
      },
    });

    // Update library item metadata to show processing
    if (wizard.libraryItemId) {
      const [libraryItem] = await db
        .select()
        .from(libraryItems)
        .where(eq(libraryItems.id, wizard.libraryItemId!))
        .limit(1);

      if (libraryItem) {
        const currentMetadata = JSON.parse(libraryItem.metadata || '{}');
        await db
          .update(libraryItems)
          .set({
            metadata: JSON.stringify({
              ...currentMetadata,
              imageProcessing: {
                status: "processing",
                wizardId,
                startedAt: new Date().toISOString(),
              },
            }),
            updatedAt: new Date(),
          })
          .where(eq(libraryItems.id, wizard.libraryItemId!));
      }
    }

    // 5. Generate images for each slide
    const newImages: any[] = [];
    const cp = config.coverPosts;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideNumber = i + 1;
      const isCover = slideNumber === 1;

      // Update progress
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "generation",
          percent: 10 + Math.floor((i / slides.length) * 80),
          message: `Gerando imagem ${slideNumber}/${slides.length}...`,
        },
      });

      // Determine configuration for this slide
      let slideConfig: typeof config = effectiveConfig;
      if (cp) {
        const method = isCover ? cp.coverMethod : cp.postsMethod;
        const aiOptions = isCover ? cp.coverAiOptions : cp.postsAiOptions;
        const htmlOptions = isCover ? cp.coverHtmlOptions : cp.postsHtmlOptions;
        slideConfig = { method, aiOptions, htmlOptions, coverPosts: cp } as typeof config;
      }

      // Prepare generation input
      const generationInput = {
        slideTitle: (slide.title || wizard.theme || undefined) as string | undefined,
        slideContent: slide.content,
        slideNumber,
        config: slideConfig as any, // Cast to avoid type issues with union
        wizardContext: {
          theme: wizard.theme || undefined,
          objective: wizard.objective || undefined,
          targetAudience: wizard.targetAudience || undefined,
        },
      };

      // Generate image based on method
      let result: any = null;

      if (slideConfig.method === "ai") {
        const aiResult = await generateAiImage(generationInput);
        if (!aiResult.success || !aiResult.data) {
          throw new Error(`Failed to generate AI image for slide ${slideNumber}: ${aiResult.error}`);
        }
        result = aiResult.data;
      } else {
        const htmlResult = await generateHtmlTemplateImage(generationInput);
        if (!htmlResult.success || !htmlResult.data) {
          throw new Error(`Failed to generate template image for slide ${slideNumber}: ${htmlResult.error}`);
        }
        result = htmlResult.data;
      }

      if (!result) {
        throw new Error(`Failed to generate image for slide ${slideNumber}`);
      }

      newImages.push(result);
      console.log(`[WIZARD-IMAGE] Generated image ${slideNumber}/${slides.length}: ${result.imageUrl}`);
    }

    // 6. Update wizard with generated images
    const existingImages = (wizard.generatedImages as unknown as any[]) || [];
    const updatedImages = [...existingImages, ...newImages];

    await db
      .update(contentWizards)
      .set({
        imageGenerationConfig: config as any,
        generatedImages: updatedImages as any,
        jobStatus: "completed",
        processingProgress: {
          stage: "generation",
          percent: 100,
          message: "Imagens geradas com sucesso!",
        },
        jobError: null,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    // 7. Upload images to storage and sync to library
    console.log(`[WIZARD-IMAGE] Checking library sync condition:`, {
      wizardId,
      libraryItemId: wizard.libraryItemId,
      hasLibraryItem: !!wizard.libraryItemId,
      newImagesCount: newImages.length
    });

    if (wizard.libraryItemId) {
      // First, upload all base64 images to storage
      console.log(`[WIZARD-IMAGE] Uploading ${newImages.length} images to storage...`);
      const uploadedImageUrls: string[] = [];

      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const slideNumber = i + 1;

        // Check if imageUrl is a base64 data URL
        if (img.imageUrl.startsWith('data:image/')) {
          try {
            const storageUrl = await uploadBase64ImageToStorage(img.imageUrl, wizardId, slideNumber);
            uploadedImageUrls.push(storageUrl);
            console.log(`[WIZARD-IMAGE] Uploaded image ${slideNumber}/${newImages.length} to storage`);
          } catch (uploadError) {
            console.error(`[WIZARD-IMAGE] Failed to upload image ${slideNumber}:`, uploadError);
            // Fall back to base64 URL if upload fails
            uploadedImageUrls.push(img.imageUrl);
          }
        } else {
          // Already a regular URL, use as-is
          uploadedImageUrls.push(img.imageUrl);
        }
      }

      // Now update the library item with the storage URLs
      const [libraryItem] = await db
        .select()
        .from(libraryItems)
        .where(eq(libraryItems.id, wizard.libraryItemId!))
        .limit(1);

      if (libraryItem) {
        const currentMetadata = JSON.parse(libraryItem.metadata || '{}');

        // Merge with existing mediaUrls if any
        const existingMediaUrls = libraryItem.mediaUrl
          ? JSON.parse(libraryItem.mediaUrl)
          : [];
        const allMediaUrls = [...existingMediaUrls, ...uploadedImageUrls];

        await db
          .update(libraryItems)
          .set({
            mediaUrl: JSON.stringify(allMediaUrls),
            metadata: JSON.stringify({
              ...currentMetadata,
              imageProcessing: null, // Remove processing flag
              imagesGeneratedAt: new Date().toISOString(),
              imageCount: allMediaUrls.length,
            }),
            updatedAt: new Date(),
          })
          .where(eq(libraryItems.id, wizard.libraryItemId!));

        console.log(`[WIZARD-IMAGE] Synced ${uploadedImageUrls.length} images to library item ${wizard.libraryItemId}`);
      }
    } else {
      console.warn(`[WIZARD-IMAGE] ⚠️ Library sync skipped: No libraryItemId found for wizard ${wizardId}`);
      console.warn(`[WIZARD-IMAGE] ⚠️ Images were generated but NOT saved to library. This is likely a bug in wizard_generation job.`);
    }

    console.log(`[WIZARD-IMAGE] JOB wizard_image_generation COMPLETED - wizardId: ${wizardId}`);

    return {
      success: true,
      images: newImages,
      wizardId,
      libraryItemId: wizard.libraryItemId,
    };
  },
};

export async function POST(request: Request) {
  // Verificar autenticação - múltiplos métodos suportados:

  // 1. Vercel Cron header (x-vercel-cron) - enviado automaticamente pelo Vercel Cron Jobs
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";

  // 2. Vercel Cron Secret (x-vercel-cron-secret) - configurado nas settings do projeto Vercel
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  const configuredCronSecret = process.env.CRON_SECRET;

  // 3. Authorization header (para chamadas manuais)
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.replace("Bearer ", "");

  // 4. Query parameter (para compatibilidade)
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");

  // 5. Test mode in development
  const testMode = searchParams.get("test") === "true" && process.env.NODE_ENV === "development";

  // Validar autenticação
  const isValidSecret =
    isVercelCron || // Vercel Cron autenticado pelo header
    vercelCronSecret === configuredCronSecret || // Vercel Cron com secret
    bearerSecret === CRON_SECRET || // Authorization header
    bearerSecret === WORKER_SECRET ||
    querySecret === CRON_SECRET || // Query parameter
    querySecret === WORKER_SECRET ||
    testMode; // Development test mode

  if (!isValidSecret) {
    // Alternativamente, aceitar autenticação Clerk para testes manuais
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Desenfileirar próximo job
    let jobId = await dequeueJob();

    // Fallback: se Redis não estiver configurado ou fila vazia,
    // buscar jobs pendentes diretamente do banco
    if (!jobId) {
      const { isQueueConfigured } = await import("@/lib/queue/client");
      if (!isQueueConfigured()) {
        console.warn("[Worker] Redis not configured, falling back to direct database polling");

        // Buscar jobs pendentes do banco ordenados por prioridade e data de criação
        const [fallbackJob] = await db
          .select({ id: jobs.id })
          .from(jobs)
          .where(eq(jobs.status, "pending"))
          .orderBy(desc(jobs.priority), desc(jobs.createdAt))
          .limit(1);

        if (fallbackJob) {
          jobId = fallbackJob.id;
          console.log(`[Worker] Processing job ${jobId} from database (Redis fallback)`);
        }
      }
    }

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

    // Validate required API keys for this job type
    const validationError = validateRequiredApiKeys(job.type);
    if (validationError) {
      await updateJobStatus(jobId, "failed", { error: validationError });
      return NextResponse.json(
        { error: validationError, jobType: job.type },
        { status: 500 }
      );
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

        // Re-enfileirar no Redis (se configurado)
        const { isQueueConfigured, enqueueJob: enqueueJobFn } = await import("@/lib/queue/client");
        if (isQueueConfigured()) {
          try {
            await enqueueJobFn(jobId, job.priority ?? undefined);
          } catch (enqueueError) {
            console.warn(`[Worker] Failed to re-enqueue job ${jobId} to Redis:`, enqueueError);
            // Job stays in DB as pending, will be picked up by fallback
          }
        }

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
 *
 * Query params:
 * - test=true: Permite acesso sem autenticação em desenvolvimento
 * - includeJobs=true: Inclui lista de jobs pendentes
 */
export async function GET(request: Request) {
  // Allow test mode in development
  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get("test") === "true" && process.env.NODE_ENV === "development";

  if (!testMode) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { getQueueSize, getProcessingCount, isQueueConfigured } = await import("@/lib/queue/client");

    const [queueSize, processingCount] = await Promise.all([
      getQueueSize(),
      getProcessingCount(),
    ]);

    // Get pending jobs from database if requested
    let pendingJobs: unknown[] = [];
    if (searchParams.get("includeJobs") === "true") {
      const { db } = await import("@/db");
      const { jobs } = await import("@/db/schema");
      const { eq, desc } = await import("drizzle-orm");

      pendingJobs = await db
        .select({
          id: jobs.id,
          type: jobs.type,
          status: jobs.status,
          createdAt: jobs.createdAt,
          attempts: jobs.attempts,
        })
        .from(jobs)
        .where(eq(jobs.status, "pending"))
        .orderBy(desc(jobs.createdAt))
        .limit(10);
    }

    return NextResponse.json({
      queue: {
        pending: queueSize,
        processing: processingCount,
      },
      redis: {
        configured: isQueueConfigured(),
        url: !!process.env.UPSTASH_REDIS_REST_URL,
      },
      pendingJobs,
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    return NextResponse.json(
      { error: "Failed to get queue status" },
      { status: 500 }
    );
  }
}
