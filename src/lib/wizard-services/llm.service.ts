/**
 * LLM Service for Wizard
 *
 * Handles all AI generation using Vercel AI SDK with OpenRouter.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Vercel AI SDK's generateText() for non-streaming responses
 * - All prompts are isolated in prompts.ts for easy editing
 * - Returns structured JSON that must be parsed from LLM responses
 * - Gracefully handles API errors and model availability
 */

import { generateText } from "ai";
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config";
import {
  getNarrativesSystemPrompt,
  getContentPrompt,
  extractJSONFromResponse,
} from "./prompts";
import {
  getUserVariables,
  getNegativeTermsArray,
  formatVariablesForPrompt,
  type UserVariables,
} from "./user-variables.service";
import { getBrandPromptVariables } from "@/lib/brands/injection";
import { runEditorialQA } from "@/lib/ai/quality";
import { getActiveBrandConfig } from "@/lib/brands/context";
import {
  generateWithBrandsDecoded,
  type BrandsDecodedResult,
} from "@/lib/ai/motors/brandsdecoded-v4";
import { isAppError } from "@/lib/errors";
import type {
  NarrativeOption,
  GeneratedContent,
  ServiceResult,
  WizardNarrativesInput,
  WizardGenerationInput,
} from "./types";
import { validateCarouselResponse, logValidationError } from "./validation";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for Wizard content generation.
 * Can be overridden via environment variable or user selection.
 */
const WIZARD_DEFAULT_MODEL = process.env.WIZARD_DEFAULT_MODEL || DEFAULT_TEXT_MODEL;

// QA editorial em dry-mode — não bloqueia, só loga. Roda com modelo barato
// para minimizar custo até a calibração estar boa.
const QA_DRY_MODEL = process.env.QA_DRY_MODEL || "openai/gpt-4.1-mini";

async function runEditorialQADryMode(parsed: unknown): Promise<void> {
  const brandConfig = await getActiveBrandConfig().catch(() => null);
  if (!brandConfig?.meta.qaEnabled) return;

  const text = extractPlainTextFromContent(parsed);
  if (!text || text.length < 50) return;

  const result = await runEditorialQA(text, { model: QA_DRY_MODEL });
  console.log(
    "[qa-dry]",
    JSON.stringify({
      passed: result.passed,
      blockingHits: result.blockingHits.length,
      warnHits: result.warnHits.length,
      failedParams: result.scores.filter((s) => s.score < 8).map((s) => `${s.param}:${s.score}`),
    })
  );
}

function extractPlainTextFromContent(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const text: string[] = [];
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      text.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node)) visit(v);
    }
  };
  visit(parsed);
  return text.join("\n").trim();
}

/**
 * Maximum retries for LLM calls
 */
const MAX_RETRIES = 2;


// ============================================================================
// USER VARIABLES HELPER
// ============================================================================

/**
 * Camadas de precedência (da mais baixa para a mais alta):
 *   1. Marca ativa (brand.config do DB)
 *   2. User variables persistidas (userVariables)
 *   3. Inputs explícitos do wizard (overrides)
 */
async function resolveAllVariables(
  inputOverrides: Partial<UserVariables>,
  userId?: string
): Promise<UserVariables> {
  const [brandVariables, savedVariables] = await Promise.all([
    getBrandPromptVariables().catch((err) => {
      if (isAppError(err) && (err.code === "CONFIG_ERROR" || err.code === "NOT_FOUND")) {
        throw err
      }
      console.error("[llm] failed to load brand variables:", err)
      return {} as Partial<UserVariables>
    }),
    getUserVariables(userId),
  ])
  return {
    tone: inputOverrides.tone || savedVariables.tone || brandVariables.tone,
    brandVoice: savedVariables.brandVoice || brandVariables.brandVoice,
    niche: inputOverrides.niche || savedVariables.niche || brandVariables.niche,
    targetAudience: inputOverrides.targetAudience || savedVariables.targetAudience || brandVariables.targetAudience,
    audienceFears: savedVariables.audienceFears || brandVariables.audienceFears,
    audienceDesires: savedVariables.audienceDesires || brandVariables.audienceDesires,
    differentiators: savedVariables.differentiators || brandVariables.differentiators,
    contentGoals: savedVariables.contentGoals || brandVariables.contentGoals,
    preferredCTAs: inputOverrides.preferredCTAs || savedVariables.preferredCTAs || brandVariables.preferredCTAs,
    negativeTerms: savedVariables.negativeTerms || brandVariables.negativeTerms,
  }
}

/**
 * Fetch user variables, merge with input-provided values, format for prompt
 * and combine negative terms.
 */
async function loadAndFormatUserVariables(
  inputTargetAudience?: string,
  inputTone?: string,
  inputNiche?: string,
  inputCta?: string,
  inputNegativeTerms?: string[],
  userId?: string // Optional userId for worker context
): Promise<{
  variables: UserVariables
  variablesContext: string
  mergedNegativeTerms: string[]
}> {
  const mergedVariables = await resolveAllVariables(
    {
      tone: inputTone,
      niche: inputNiche,
      targetAudience: inputTargetAudience,
      preferredCTAs: inputCta,
    },
    userId
  )

  // Format variables for prompt injection
  const { context: variablesContext } = formatVariablesForPrompt(mergedVariables)

  // Merge negative terms (input + saved). negativeTerms já passou por
  // resolveAllVariables (coalescido com a marca), então usamos a forma
  // resolvida em vez de recarregar do DB.
  const savedNegativeTerms = getNegativeTermsArray(mergedVariables)
  const mergedNegativeTerms = [...new Set([...savedNegativeTerms, ...(inputNegativeTerms || [])])]

  return {
    variables: mergedVariables,
    variablesContext,
    mergedNegativeTerms,
  }
}


// ============================================================================
// NARRATIVES GENERATION
// ============================================================================

/**
 * Generate 4 narrative options with different tribal angles.
 *
 * This function creates 4 distinct narrative approaches (herege, visionario,
 * tradutor, testemunha) based on Seth Godin's "Tribes" philosophy.
 *
 * @param input - Wizard input data
 * @param model - Optional model override
 * @returns Service result with narratives array
 *
 * @example
 * ```ts
 * const result = await generateNarratives({
 *   contentType: "carousel",
 *   theme: "Launch new product",
 *   targetAudience: "Small business owners"
 * })
 *
 * if (result.success) {
 *   // result.data → NarrativeOption[]
 * }
 * ```
 */
export async function generateNarratives(
  input: WizardNarrativesInput,
  model: string = WIZARD_DEFAULT_MODEL,
  userId?: string // Optional userId for worker context (to fetch user variables)
): Promise<ServiceResult<NarrativeOption[]>> {
  // Check if OpenRouter is configured
  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  try {
    // Load user variables and merge with input
    const { variablesContext, mergedNegativeTerms } = await loadAndFormatUserVariables(
      input.targetAudience,
      undefined, // tone
      undefined, // niche
      input.cta,
      input.negativeTerms,
      userId // Pass userId for worker context
    )

    // Build the system prompt with all available context
    let systemPrompt = getNarrativesSystemPrompt({
      contentType: input.contentType,
      theme: input.theme,
      context: input.context,
      objective: input.objective,
      targetAudience: input.targetAudience,
      cta: input.cta,
      extractedContent: input.extractedContent,
      researchData: input.researchData,
      videoDuration: input.videoDuration,
      referenceUrl: input.referenceUrl,
      referenceVideoUrl: input.referenceVideoUrl,
      numberOfSlides: input.numberOfSlides,
      customInstructions: input.customInstructions,
    })

    // Append user variables context if available
    if (variablesContext) {
      systemPrompt += `\n\n${variablesContext}`
    }

    // Append negative terms if available
    if (mergedNegativeTerms.length > 0) {
      systemPrompt += `\n\nTERMOS PROIBIDOS (do usuário): ${mergedNegativeTerms.join(", ")}`
    }

    // Call LLM with retry logic
    const response = await llmCallWithRetry(
      model,
      systemPrompt,
      "Generate 4 narrative options for social media content.",
      MAX_RETRIES
    );

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // Validate response structure
    if (!parsed || typeof parsed !== "object" || !("narratives" in parsed)) {
      throw new Error("Invalid response structure: missing 'narratives' field");
    }

    const narratives = (parsed as { narratives: unknown[] }).narratives;

    if (!Array.isArray(narratives) || narratives.length !== 4) {
      throw new Error("Expected exactly 4 narratives in response");
    }

    // Validate each narrative has required fields
    const validatedNarratives: NarrativeOption[] = narratives.map((n, index) => {
      const narrative = n as Record<string, unknown>;

      if (
        typeof n !== "object" ||
        !n ||
        !("id" in n) ||
        !("title" in n) ||
        !("description" in n) ||
        !("angle" in n)
      ) {
        throw new Error(`Narrative ${index + 1} is missing required fields`);
      }

      // Preserve ALL fields including optional ones
      return {
        id: String(narrative.id),
        title: String(narrative.title),
        description: String(narrative.description),
        angle: narrative.angle as NarrativeOption["angle"],
        // Tribal narrative fields (v4)
        ...(n && "hook" in n && n.hook ? { hook: String(n.hook) } : {}),
        ...(n && "core_belief" in n && n.core_belief ? { core_belief: String(n.core_belief) } : {}),
        ...(n && "status_quo_challenged" in n && n.status_quo_challenged ? { status_quo_challenged: String(n.status_quo_challenged) } : {}),
        // Extended fields for richer context (legacy, still supported)
        ...(n && "viewpoint" in n && n.viewpoint ? { viewpoint: String(n.viewpoint) } : {}),
        ...(n && "whyUse" in n && n.whyUse ? { whyUse: String(n.whyUse) } : {}),
        ...(n && "impact" in n && n.impact ? { impact: String(n.impact) } : {}),
        ...(n && "tone" in n && n.tone ? { tone: String(n.tone) } : {}),
        ...(n && "keywords" in n && n.keywords
          ? { keywords: Array.isArray(n.keywords) ? (n.keywords as unknown[]).map(String) : [String(n.keywords)] }
          : {}),
        ...(n && "differentiation" in n && n.differentiation ? { differentiation: String(n.differentiation) } : {}),
        ...(n && "risks" in n && n.risks ? { risks: String(n.risks) } : {}),
      };
    });

    // Ensure all 4 tribal angles are present
    const requiredAngles: NarrativeOption["angle"][] = [
      "herege",
      "visionario",
      "tradutor",
      "testemunha",
    ];

    for (const angle of requiredAngles) {
      if (!validatedNarratives.find((n) => n.angle === angle)) {
        throw new Error(`Missing narrative with angle: ${angle}`);
      }
    }

    return {
      success: true,
      data: validatedNarratives,
    };
  } catch (error) {
    console.error("Error generating narratives:", error);

    // Return user-friendly error
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Failed to generate narratives: ${message}`,
    };
  }
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

/**
 * Generate final content based on selected narrative.
 *
 * This function creates the actual social media content (slides, caption,
 * hashtags, etc.) based on the user's selected narrative.
 *
 * @param input - Wizard generation input with selected narrative
 * @param model - Optional model override
 * @returns Service result with generated content
 *
 * @example
 * ```ts
 * const result = await generateContent({
 *   contentType: "carousel",
 *   numberOfSlides: 10,
 *   selectedNarrative: {
 *     id: "narrative-1",
 *     title: "Herege",
 *     description: "...",
 *     angle: "herege"
 *   },
 *   cta: "Link in bio",
 *   ragContext: "Additional context..."
 * })
 *
 * if (result.success) {
 *   // result.data.slides → GeneratedSlide[]
 *   // result.data.caption → string
 * }
 * ```
 */
export async function generateContent(
  input: WizardGenerationInput,
  model: string = WIZARD_DEFAULT_MODEL,
  userId?: string // Optional userId for worker context (to fetch user variables)
): Promise<ServiceResult<GeneratedContent>> {
  // Check if OpenRouter is configured
  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  try {
    // Load user variables and merge with input
    const { variablesContext, mergedNegativeTerms } = await loadAndFormatUserVariables(
      input.targetAudience,
      undefined, // tone
      undefined, // niche
      input.cta,
      input.negativeTerms,
      userId // Pass userId for worker context
    )

    // Build the content-specific prompt
    let prompt = getContentPrompt({
      contentType: input.contentType,
      narrativeAngle: input.selectedNarrative.angle,
      narrativeTitle: input.selectedNarrative.title,
      narrativeDescription: input.selectedNarrative.description,
      narrativeHook: input.selectedNarrative.hook,
      coreBelief: input.selectedNarrative.core_belief,
      statusQuoChallenged: input.selectedNarrative.status_quo_challenged,
      numberOfSlides: input.numberOfSlides,
      cta: input.cta,
      negativeTerms: mergedNegativeTerms.length > 0 ? mergedNegativeTerms : input.negativeTerms,
      ragContext: input.ragContext,
      theme: input.theme,
      targetAudience: input.targetAudience,
      selectedVideoTitle: input.selectedVideoTitle?.title, // Pass selected video title for videos
      synthesizedResearch: input.synthesizedResearch, // v4.3: Pass synthesized research for rich content
    })

    // Append user variables context if available
    if (variablesContext) {
      prompt += `\n\n${variablesContext}`
    }

    // Append negative terms if available and not already in the prompt
    if (mergedNegativeTerms.length > 0) {
      prompt += `\n\nTERMOS PROIBIDOS (do usuário): ${mergedNegativeTerms.join(", ")}`
    }

    // Create a user message that reinforces the content type
    const userMessage = `Generate ${input.contentType} content with the selected narrative approach.`;

    // Call LLM with retry logic
    const response = await llmCallWithRetry(
      model,
      prompt,
      userMessage,
      MAX_RETRIES
    );

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // QA editorial — dry-mode: roda anti-patterns + LLM judge e LOGA o
    // resultado, mas não bloqueia. Permite calibrar threshold e regex
    // antes de virar enforcing. Controlado por brand.config.meta.qaEnabled.
    void runEditorialQADryMode(parsed).catch((err) => {
      console.error("[llm.service] QA dry-mode failed silently:", err);
    });

    // Validate and structure response based on content type
    const generatedContent = structureGeneratedContent(
      input.contentType,
      parsed,
      input.selectedNarrative,
      model,
      input.ragContext ? true : false
    );

    return {
      success: true,
      data: generatedContent,
    };
  } catch (error) {
    console.error("Error generating content:", error);

    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Failed to generate content: ${message}`,
    };
  }
}

// ============================================================================
// BRANDSDECODED MOTOR (PR5)
// ============================================================================

/**
 * Roda o motor BrandsDecoded v4 (pipeline jornalístico: triagem → headlines →
 * espinha → 18 blocos → legenda IG). Adapta o `WizardGenerationInput` para o
 * formato `BrandsDecodedInput` consolidando tema/contexto/narrativa em um
 * único `briefing`.
 *
 * Worker (`api/workers/route.ts`) decide qual motor chamar baseado em
 * `wizard.motor` da tabela content_wizards.
 */
export async function generateContentBrandsDecoded(
  input: WizardGenerationInput,
  model: string = WIZARD_DEFAULT_MODEL,
  userId?: string
): Promise<ServiceResult<BrandsDecodedResult>> {
  if (!openrouter) {
    return { success: false, error: "OpenRouter API key not configured." };
  }

  try {
    const merged = await resolveAllVariables(
      { targetAudience: input.targetAudience },
      userId
    );
    const brandPromptVariables: Record<string, string | undefined> = { ...merged };

    const briefingParts: string[] = [];
    if (input.theme) briefingParts.push(`Tema: ${input.theme}`);
    if (input.selectedNarrative?.title) {
      briefingParts.push(`Narrativa selecionada: ${input.selectedNarrative.title}`);
    }
    if (input.selectedNarrative?.description) {
      briefingParts.push(`Descrição: ${input.selectedNarrative.description}`);
    }
    if (input.selectedNarrative?.hook) {
      briefingParts.push(`Hook sugerido: ${input.selectedNarrative.hook}`);
    }
    if (input.cta) briefingParts.push(`CTA: ${input.cta}`);
    if (input.ragContext) briefingParts.push(`Contexto adicional:\n${input.ragContext}`);
    const briefing = briefingParts.join("\n\n");

    const result = await generateWithBrandsDecoded({
      briefing,
      brandPromptVariables,
      model,
      autoSelectHeadline: true,
      tribalAngle: input.tribalAngle,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("[bd-motor] generateContentBrandsDecoded failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `BrandsDecoded motor failed: ${message}` };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Structure the parsed LLM response into GeneratedContent format.
 *
 * Validates and transforms the response based on content type requirements.
 */
function structureGeneratedContent(
  contentType: string,
  parsed: unknown,
  narrative: NarrativeOption,
  model: string,
  ragUsed: boolean
): GeneratedContent {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid response: not an object");
  }

  const response = parsed as Record<string, unknown>;

  const baseMetadata = {
    narrativeId: narrative.id,
    narrativeTitle: narrative.title,
    narrativeAngle: narrative.angle,
    model,
    generatedAt: new Date().toISOString(),
    ragUsed,
  };

  switch (contentType) {
    case "carousel": {
      // Handle new ZORYON v4.2 structure with valor_central, capa, slides (numero/tipo/titulo/corpo/conexao_proximo), legenda
      if ("capa" in response && "slides" in response && "legenda" in response) {
        // VALIDAÇÃO RUNTIME v4.2 - Garante que a IA seguiu as instruções
        const validated = validateCarouselResponse(response);

        // New format: { throughline, valor_central, capa: { titulo, subtitulo }, slides: [{ numero, tipo, titulo, corpo, conexao_proximo, imagePrompt }], legenda }
        const capa = validated.capa;
        const slides = validated.slides;

        return {
          type: "carousel",
          // Include capa as first slide
          slides: [
            {
              title: String(capa?.titulo || ""),
              content: String(capa?.subtitulo || ""),
              imagePrompt: undefined,
            },
            ...slides.map((slide) => ({
              title: String(slide.titulo || ""),
              content: String(slide.corpo || ""),
              // v4.2: imagePrompt pode vir por slide
              imagePrompt: slide.imagePrompt ? String(slide.imagePrompt) : undefined,
            })),
          ],
          caption: validated.legenda,
          hashtags: validated.hashtags ? StringArray(validated.hashtags) : undefined,
          cta: validated.cta ? String(validated.cta) : undefined,
          metadata: {
            ...baseMetadata,
            throughline: validated.throughline,
            valor_central: validated.valor_central,
          },
        };
      }

      // Fallback for old format: { slides: [{ title, content, imagePrompt }], caption, hashtags, cta }
      if (!("slides" in response) || !Array.isArray(response.slides)) {
        throw new Error("Carousel response missing 'slides' array");
      }

      return {
        type: "carousel",
        slides: response.slides.map((slide) => ({
          title: String(slide.title || ""),
          content: String(slide.content || ""),
          imagePrompt: slide.imagePrompt ? String(slide.imagePrompt) : undefined,
        })),
        caption: response.caption ? String(response.caption) : undefined,
        hashtags: response.hashtags ? StringArray(response.hashtags) : undefined,
        cta: response.cta ? String(response.cta) : undefined,
        metadata: baseMetadata,
      };
    }

    case "text": {
      if (!("content" in response) || typeof response.content !== "string") {
        throw new Error("Text response missing 'content' field");
      }

      return {
        type: "text",
        caption: response.content,
        hashtags: response.hashtags ? StringArray(response.hashtags) : undefined,
        cta: response.cta ? String(response.cta) : undefined,
        metadata: baseMetadata,
      };
    }

    case "image": {
      if (!("imagePrompt" in response) || typeof response.imagePrompt !== "string") {
        throw new Error("Image response missing 'imagePrompt' field");
      }

      return {
        type: "image",
        caption: response.caption ? String(response.caption) : undefined,
        hashtags: response.hashtags ? StringArray(response.hashtags) : undefined,
        cta: response.cta ? String(response.cta) : undefined,
        metadata: {
          ...baseMetadata,
          // Store imagePrompt for later use
          imagePrompt: response.imagePrompt,
        } as any,
      };
    }

    case "video": {
      // Handle both legacy format (script field) and new v4.4 format (VideoScriptStructured)
      if ("script" in response) {
        // Legacy format: simple script field
        const script = response.script;
        return {
          type: "video",
          caption: response.caption ? String(response.caption) : undefined,
          hashtags: response.hashtags ? StringArray(response.hashtags) : undefined,
          cta: response.cta ? String(response.cta) : undefined,
          script: Array.isArray(script) ? JSON.stringify(script) : String(script),
          metadata: baseMetadata,
        };
      }

      // Check for VideoScriptStructured v4.4 format
      if ("meta" in response && "roteiro" in response && "thumbnail" in response) {
        // New v4.4 format: VideoScriptStructured
        const videoScript = response as any;

        // Extract CTA from roteiro.cta or fallback to response-level cta
        const ctaText = videoScript.roteiro?.cta?.texto || response.cta || "";

        return {
          type: "video",
          caption: videoScript.caption ? String(videoScript.caption) : undefined,
          hashtags: videoScript.hashtags ? StringArray(videoScript.hashtags) : undefined,
          cta: ctaText ? String(ctaText) : undefined,
          script: JSON.stringify(videoScript), // Store entire structured script
          metadata: {
            ...baseMetadata,
            // Store structured metadata for easy access
            script: videoScript, // VideoScriptStructured v4.3
          } as any, // Using 'as any' because we're adding v4.4-specific 'script' property
        };
      }

      throw new Error("Video response missing required fields (expected 'script' or VideoScriptStructured v4.4 format with 'meta', 'roteiro', 'thumbnail')");
    }

    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

/**
 * Convert a value to string array.
 *
 * Handles both array input and comma-separated string input.
 */
function StringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

/**
 * LLM call with retry logic.
 *
 * Handles transient errors and retries automatically.
 */
async function llmCallWithRetry(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxRetries: number,
  attempt: number = 0
): Promise<string> {
  const attemptNum = attempt + 1;

  try {
    const result = await generateText({
      model: openrouter!(model),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.7,
    });

    // Verifica se a resposta está vazia (pode indicar problema com o modelo)
    if (!result.text || result.text.trim().length === 0) {
      console.error(`[LLM] Empty response from model ${model} (attempt ${attemptNum})`);

      // Se não for a última tentativa, tenta novamente
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return llmCallWithRetry(model, systemPrompt, userMessage, maxRetries, attempt + 1);
      }

      throw new Error(`LLM returned empty response after ${attemptNum} attempts. Model: ${model}. This may indicate a content filter, rate limit, or model availability issue.`);
    }

    return result.text;
  } catch (error) {
    const isLastAttempt = attempt >= maxRetries;

    // Log detalhado do erro para debugging
    console.error(`[LLM] Error on attempt ${attemptNum}/${maxRetries + 1}:`, error instanceof Error ? error.message : String(error));

    if (isLastAttempt) {
      throw new Error(
        `LLM call failed after ${attemptNum} attempt(s). ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Exponential backoff
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return llmCallWithRetry(model, systemPrompt, userMessage, maxRetries, attempt + 1);
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if LLM service is available and configured.
 */
export function isLlmServiceAvailable(): boolean {
  return !!openrouter;
}

/**
 * Get available models for Wizard.
 */
export function getAvailableWizardModels(): string[] {
  // Return text models suitable for content generation
  return [
    "openai/gpt-4.1",
    "openai/gpt-4.1-mini",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-opus-4.5",
    "google/gemini-3-pro-preview",
  ];
}
