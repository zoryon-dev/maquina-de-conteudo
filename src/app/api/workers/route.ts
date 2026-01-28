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
import { getJob, incrementJobAttempts, reserveNextJob, updateJobStatus } from "@/lib/queue/jobs";
import { db } from "@/db";
import { jobs, documents, documentEmbeddings, contentWizards, libraryItems } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { splitDocumentIntoChunks } from "@/lib/voyage/chunking";
import { generateEmbeddingsBatch } from "@/lib/voyage/embeddings";
import type { DocumentEmbeddingPayload, WizardNarrativesPayload, WizardGenerationPayload, WizardImageGenerationPayload, WizardThumbnailGenerationPayload } from "@/lib/queue/types";
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
  generateVideoThumbnailNanoBanana,
  generateYouTubeSEO,
} from "@/lib/wizard-services";

import type { SynthesizerInput, SynthesizedResearch, ResearchPlannerOutput, ResearchQuery } from "@/lib/wizard-services";
import type { SearchResult } from "@/lib/wizard-services/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON metadata safely with validation
 * Returns empty object on parse error instead of crashing
 */
function parseMetadataSafely(metadataJson: string | null | undefined): Record<string, unknown> {
  if (!metadataJson) return {};

  try {
    const parsed = JSON.parse(metadataJson);
    // Ensure result is an object
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch (error) {
    console.error("[Workers] Failed to parse metadata JSON:", error);
    return {};
  }
}

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
    // Optional API keys - Tavily, Firecrawl, and Apify are not required
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
    const { wizardId, userId, contentType, referenceUrl, referenceVideoUrl, theme, context, objective, targetAudience, cta, videoDuration, numberOfSlides, customInstructions, ragConfig } =
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

    // 2. Extract content from reference URL (Firecrawl)
    if (referenceUrl) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "extraction",
          percent: 25,
          message: "Extraindo conteúdo da URL de referência...",
        },
      });
      const firecrawlResult = await extractFromUrl(referenceUrl);

      if (firecrawlResult.success && firecrawlResult.data) {
        extractedContent = firecrawlResult.data.content;
      }
    }

    // 3. Transcribe video (Apify)
    if (referenceVideoUrl) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "transcription",
          percent: 40,
          message: "Transcrevendo vídeo do YouTube...",
        },
      });
      const transcriptionResult = await transcribeYouTube(referenceVideoUrl);
      if (transcriptionResult.success && transcriptionResult.data) {
        if (extractedContent) {
          extractedContent += `\n\n`;
        }
        // Use formatYouTubeForPrompt for structured metadata
        extractedContent += formatYouTubeForPrompt(transcriptionResult.data);
      }
    }

    // 4. Search for context (Tavily)
    if (theme) {
      await updateWizardProgress(wizardId, {
        processingProgress: {
          stage: "research",
          percent: 60,
          message: "Pesquisando informações contextuais...",
        },
      });

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
        // Fallback to simple query
        const fallbackQuery = objective ? `${theme} ${objective}` : theme;
        const fallbackResult = await contextualSearch(fallbackQuery, { maxResults: 5, searchDepth: "basic" });
        if (fallbackResult.success && fallbackResult.data) {
          researchData = formatSearchForPrompt(fallbackResult.data);
        }
      } else {
        researchPlan = researchPlannerResult.data;

        for (let i = 0; i < researchPlan.queries.length; i++) {
          const q = researchPlan.queries[i];
          await updateWizardProgress(wizardId, {
            processingProgress: {
              stage: "research",
              percent: 55 + (i * 3), // 55% to 76%
              message: `Pesquisando: ${q.q.substring(0, 30)}... (${i + 1}/${researchPlan.queries.length})`,
            },
          });

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
          }
        }

        const aggregatedSources = allSearchResults.flatMap((r, idx) =>
          r.sources.map((s: any) => ({
            ...s,
            queryContext: r.query,
            layer: r.layer,
            intent: r.intent,
            queryIndex: idx,
          }))
        );

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

            // Store synthesized research in wizard (will be saved at the end)
            synthesizedResearchData = synthesisData;
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
        // FIX: Add the actual RAG content to researchData (was missing before!)
        if (ragContext) {
          researchData += (researchData ? "\n\n" : "") + ragContext;
        }
        // Store RAG source info in researchResults for reference
        const ragSourceInfo = formatRagSourcesForMetadata(ragResult.data);
        if (ragSourceInfo.length > 0) {
          researchData += (researchData ? "\n\n" : "") + `FONTES RAG:\n${ragSourceInfo.map(s => `- ${s.title}`).join("\n")}`;
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
      videoDuration,
      referenceUrl,
      referenceVideoUrl,
      numberOfSlides,
      customInstructions,
    }, undefined, userId); // Pass userId for user variables

    if (!narrativesResult.success) {
      // Update wizard with error status
      await updateWizardProgress(wizardId, {
        jobStatus: "failed",
        jobError: `Failed to generate narratives: ${narrativesResult.error}`,
      });
      throw new Error(`Failed to generate narratives: ${narrativesResult.error}`);
    }

    const narratives = narrativesResult.data!;

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
      const ragResult = await generateWizardRagContext(userId, ragQuery, ragConfig);

      if (ragResult.success && ragResult.data) {
        ragContextForPrompt = formatRagForPrompt(ragResult.data);
      }
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
      selectedVideoTitle: payload.selectedVideoTitle, // Pass selected video title for video content
    }, model, userId); // Pass userId for user variables

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

    if (libraryResult.success && libraryResult.libraryItemId) {
      // Update wizard with the library item ID
      await db
        .update(contentWizards)
        .set({ libraryItemId: libraryResult.libraryItemId })
        .where(eq(contentWizards.id, wizardId));
    } else {
      // Log error but don't fail the wizard - content was successfully generated
      console.error(`[WIZARD-DEBUG] WORKER: Library sync failed for wizard ${wizardId}:`, libraryResult.error);
    }

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
        const currentMetadata = parseMetadataSafely(libraryItem.metadata);
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
    // Initialize upload fallbacks array (will be populated if libraryItemId exists)
    const uploadFallbacks: Array<{ slideNumber: number; error: string }> = [];

    if (wizard.libraryItemId) {
      // First, upload all base64 images to storage
      const uploadedImageUrls: string[] = [];

      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const slideNumber = i + 1;

        // Check if imageUrl is a base64 data URL
        if (img.imageUrl.startsWith('data:image/')) {
          try {
            const storageUrl = await uploadBase64ImageToStorage(img.imageUrl, wizardId, slideNumber);
            uploadedImageUrls.push(storageUrl);
          } catch (uploadError) {
            const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
            console.error(`[WIZARD-IMAGE] Failed to upload image ${slideNumber}:`, errorMsg);
            // Fall back to base64 URL if upload fails
            uploadedImageUrls.push(img.imageUrl);
            uploadFallbacks.push({ slideNumber, error: errorMsg });
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
        const currentMetadata = parseMetadataSafely(libraryItem.metadata);

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
      }
    }

    return {
      success: true,
      images: newImages,
      wizardId,
      libraryItemId: wizard.libraryItemId,
      uploadFallbacks: uploadFallbacks.length > 0 ? uploadFallbacks : undefined,
    };
  },

  /**
   * Wizard Thumbnail Generation Handler
   *
   * Generates YouTube thumbnail using Nano Banana format asynchronously.
   *
   * Process:
   * 1. Generate thumbnail prompt using Nano Banana service
   * 2. Generate thumbnail image using AI
   * 3. Update wizard with generated thumbnail
   * 4. Mark job as completed
   */
  wizard_thumbnail_generation: async (payload: unknown) => {
    const {
      wizardId,
      userId,
      thumbnailTitle,
      estilo,
      contextoTematico,
      expressao,
      referenciaImagem1,
      referenciaImagem2,
      roteiroContext,
      instrucoesCustomizadas,
      tipoFundo,
      corTexto,
      posicaoTexto,
      tipoIluminacao,
      model,
    } = payload as WizardThumbnailGenerationPayload;

    // 1. Fetch wizard to verify ownership
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(eq(contentWizards.id, wizardId))
      .limit(1);

    if (!wizard) {
      throw new Error(`Wizard not found: ${wizardId}`);
    }

    if (wizard.userId !== userId) {
      throw new Error(`Unauthorized: wizard ${wizardId} belongs to different user`);
    }

    // 2. Update wizard progress
    await updateWizardProgress(wizardId, {
      jobStatus: "processing",
      processingProgress: {
        stage: "thumbnail",
        percent: 50,
        message: "Gerando thumbnail com IA...",
      },
    });

    // 3. Generate thumbnail using Nano Banana service
    const thumbnailResult = await generateVideoThumbnailNanoBanana(
      {
        thumbnailTitle,
        estilo: estilo as any || "profissional",
        contextoTematico,
        expressao,
        referenciaImagem1,
        referenciaImagem2,
        roteiroContext,
        instrucoesCustomizadas,
        tipoFundo,
        corTexto,
        posicaoTexto,
        tipoIluminacao,
      },
      model as any // Optional model override
    );

    if (!thumbnailResult.success || !thumbnailResult.data) {
      // Update wizard with error status
      await updateWizardProgress(wizardId, {
        jobStatus: "failed",
        jobError: `Failed to generate thumbnail: ${thumbnailResult.error}`,
      });
      throw new Error(`Failed to generate thumbnail: ${thumbnailResult.error}`);
    }

    const { imageUrl, promptUsed } = thumbnailResult.data;

    // 4. Update wizard with generated thumbnail
    await db
      .update(contentWizards)
      .set({
        generatedThumbnail: {
          imageUrl,
          promptUsed,
          generatedAt: new Date().toISOString(),
        } as any,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    // 5. Generate YouTube SEO metadata
    await updateWizardProgress(wizardId, {
      jobStatus: "processing",
      processingProgress: {
        stage: "seo",
        percent: 75,
        message: "Gerando metadados SEO para YouTube...",
      },
    });

    let generatedSEO: any = null;

    try {
      // Parse generated content to extract script context
      let scriptContent: any = null;
      try {
        if (typeof wizard.generatedContent === "string") {
          scriptContent = JSON.parse(wizard.generatedContent);
        } else {
          scriptContent = wizard.generatedContent;
        }
      } catch {
      }

      // Extract development topics for timestamps
      const topicos = scriptContent?.roteiro?.desenvolvimento?.map((d: any) => d.topico).filter(Boolean) || [];

      // Get selected narrative
      const selectedNarrative = wizard.narratives?.find(
        (n: any) => n.id === wizard.selectedNarrativeId
      );

      // Build SEO parameters
      const seoParams = {
        thumbnailTitle: thumbnailTitle,
        theme: wizard.theme || "",
        targetAudience: wizard.targetAudience || "",
        objective: wizard.objective,
        niche: wizard.niche,
        narrativeAngle: selectedNarrative?.angle,
        narrativeTitle: selectedNarrative?.title,
        narrativeDescription: selectedNarrative?.description,
        coreBelief: selectedNarrative?.core_belief,
        statusQuoChallenged: selectedNarrative?.status_quo_challenged,
        roteiroContext: {
          valorCentral: scriptContent?.meta?.valor_central,
          hookTexto: scriptContent?.roteiro?.hook?.texto,
          topicos,
          duracao: scriptContent?.meta?.duracao_estimada,
        },
      };

      const seoResult = await generateYouTubeSEO(seoParams);

      if (seoResult.success && seoResult.data) {
        generatedSEO = seoResult.data;
        // Update wizard with generated SEO
        await db
          .update(contentWizards)
          .set({
            generatedSEO: generatedSEO as any,
            updatedAt: new Date(),
          })
          .where(eq(contentWizards.id, wizardId));
      }
    } catch (seoError) {
      console.error(`[WIZARD-THUMBNAIL] Error generating SEO:`, seoError);
      // Continue without SEO - don't fail the job
    }

    // 6. Update wizard as completed and save to library
    await db
      .update(contentWizards)
      .set({
        jobStatus: "completed",
        processingProgress: {
          stage: "completed",
          percent: 100,
          message: "Vídeo completo gerado com sucesso!",
        },
        jobError: null,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    // 7. Save video to library automatically
    try {
      const { saveWizardVideoToLibraryAction } = await import("@/app/(app)/library/actions/library-actions");
      const libraryResult = await saveWizardVideoToLibraryAction(wizardId);

      if (libraryResult.success) {
        // Update wizard with library item ID
        await db
          .update(contentWizards)
          .set({
            libraryItemId: libraryResult.libraryItemId,
          })
          .where(eq(contentWizards.id, wizardId));
      }
    } catch (libraryError) {
      console.error(`[WIZARD-THUMBNAIL] Error saving video to library:`, libraryError);
      // Don't fail the job if library save fails - thumbnail is still successful
    }

    return {
      success: true,
      thumbnail: thumbnailResult.data,
      wizardId,
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

  // 4. Parse URL (NOTA: não aceitamos mais secret via query param por segurança)
  const { searchParams } = new URL(request.url);

  // 5. Test mode ONLY in development AND from localhost (previne bypass em prod)
  const host = request.headers.get("host") || "";
  const isLocalhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
  const testMode = searchParams.get("test") === "true" && process.env.NODE_ENV === "development" && isLocalhost;

  // Validar autenticação
  // SEGURANÇA: Removido query parameter - secrets em query params ficam em logs de acesso
  const isValidSecret =
    isVercelCron || // Vercel Cron autenticado pelo header
    vercelCronSecret === configuredCronSecret || // Vercel Cron com secret
    bearerSecret === CRON_SECRET || // Authorization header
    bearerSecret === WORKER_SECRET ||
    testMode; // Development test mode (localhost apenas)

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
    let job = null;

    // Fallback: se Redis não estiver configurado ou fila vazia,
    // reservar atomicamente o próximo job do banco
    if (!jobId) {
      const { isQueueConfigured } = await import("@/lib/queue/client");
      if (!isQueueConfigured()) {
        // reserveNextJob() é atômico e já marca como 'processing'
        job = await reserveNextJob();

        if (job) {
          jobId = job.id;
        }
      }
    }

    if (!jobId) {
      return NextResponse.json({
        message: "No jobs to process",
        processed: false,
      });
    }

    // Se não temos o job objeto ainda (veio do Redis), buscar no banco
    if (!job) {
      job = await getJob(jobId);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Verificar se o job ainda está pendente (pode ter sido pego por outro worker)
      if (job.status !== "pending") {
        return NextResponse.json({
          message: "Job already processed",
          jobId,
          status: job.status,
        });
      }

      // Marcar como processando (para jobs do Redis)
      await markAsProcessing(jobId);
      await updateJobStatus(jobId, "processing");
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
  // Allow test mode ONLY in development AND from localhost (previne bypass em prod)
  const { searchParams } = new URL(request.url);
  const host = request.headers.get("host") || "";
  const isLocalhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
  const testMode = searchParams.get("test") === "true" && process.env.NODE_ENV === "development" && isLocalhost;

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
