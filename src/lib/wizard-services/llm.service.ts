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
import type {
  NarrativeOption,
  GeneratedContent,
  ServiceResult,
  WizardNarrativesInput,
  WizardGenerationInput,
} from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for Wizard content generation.
 * Can be overridden via environment variable or user selection.
 */
const WIZARD_DEFAULT_MODEL = process.env.WIZARD_DEFAULT_MODEL || DEFAULT_TEXT_MODEL;

/**
 * Maximum retries for LLM calls
 */
const MAX_RETRIES = 2;


// ============================================================================
// NARRATIVES GENERATION
// ============================================================================

/**
 * Generate 4 narrative options with different angles.
 *
 * This function creates 4 distinct narrative approaches (criativo, estrategico,
 * dinamico, inspirador) for the same content topic.
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
 *   console.log(result.data.narratives) // NarrativeOption[]
 * }
 * ```
 */
export async function generateNarratives(
  input: WizardNarrativesInput,
  model: string = WIZARD_DEFAULT_MODEL
): Promise<ServiceResult<NarrativeOption[]>> {
  // ==============================================================================
  // WIZARD DEBUG: INPUTS PARA GERAÇÃO DE NARRATIVAS
  // ==============================================================================
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] FASE: GERAÇÃO DE NARRATIVAS`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] Modelo Selecionado: ${model}`);
  console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
  console.log(`[WIZARD-DEBUG] INPUTS DO USUÁRIO:`);
  console.log(`[WIZARD-DEBUG]   contentType: ${input.contentType}`);
  console.log(`[WIZARD-DEBUG]   theme: ${input.theme || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   objective: ${input.objective || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   targetAudience: ${input.targetAudience || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   context: ${input.context || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   cta: ${input.cta || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   numberOfSlides: ${input.numberOfSlides || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
  console.log(`[WIZARD-DEBUG] CONTEXTO ADICIONAL:`);
  console.log(`[WIZARD-DEBUG]   referenceUrl: ${input.referenceUrl || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   referenceVideoUrl: ${input.referenceVideoUrl || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   extractedContent: ${input.extractedContent ? `${input.extractedContent.length} chars` : "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   researchData: ${input.researchData ? `${input.researchData.length} chars` : "(não informado)"}`);
  console.log(`${"=".repeat(80)}\n`);

  // Check if OpenRouter is configured
  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  try {
    // Build the system prompt with all available context
    const systemPrompt = getNarrativesSystemPrompt({
      contentType: input.contentType,
      theme: input.theme,
      context: input.context,
      objective: input.objective,
      targetAudience: input.targetAudience,
      cta: input.cta,
      extractedContent: input.extractedContent,
      researchData: input.researchData,
    });

    // ==============================================================================
    // WIZARD DEBUG: PROMPT ENVIADO PARA IA (NARRATIVAS)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] PROMPT ENVIADO PARA IA (GERAÇÃO DE NARRATIVAS)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(systemPrompt);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Call LLM with retry logic
    const response = await llmCallWithRetry(
      model,
      systemPrompt,
      "Generate 4 narrative options for social media content.",
      MAX_RETRIES
    );

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA DA IA (NARRATIVAS)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] RESPOSTA BRUTA DA IA (NARRATIVAS)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(response);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA PARSEADA (NARRATIVAS)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] RESPOSTA PARSEADA (NARRATIVAS)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

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
        // Optional fields - preserve if present
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

    // Ensure all 4 angles are present
    const requiredAngles: NarrativeOption["angle"][] = [
      "criativo",
      "estrategico",
      "dinamico",
      "inspirador",
    ];

    for (const angle of requiredAngles) {
      if (!validatedNarratives.find((n) => n.angle === angle)) {
        throw new Error(`Missing narrative with angle: ${angle}`);
      }
    }

    // ==============================================================================
    // WIZARD DEBUG: NARRATIVAS VALIDADAS
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] NARRATIVAS VALIDADAS (FINAL)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    validatedNarratives.forEach((n, i) => {
      console.log(`[WIZARD-DEBUG] Narrativa ${i + 1}:`);
      console.log(`[WIZARD-DEBUG]   id: ${n.id}`);
      console.log(`[WIZARD-DEBUG]   angle: ${n.angle}`);
      console.log(`[WIZARD-DEBUG]   title: ${n.title}`);
      console.log(`[WIZARD-DEBUG]   description: ${n.description}`);
      if (n.viewpoint) console.log(`[WIZARD-DEBUG]   viewpoint: ${n.viewpoint}`);
      if (n.whyUse) console.log(`[WIZARD-DEBUG]   whyUse: ${n.whyUse}`);
      if (n.impact) console.log(`[WIZARD-DEBUG]   impact: ${n.impact}`);
      if (n.tone) console.log(`[WIZARD-DEBUG]   tone: ${n.tone}`);
      if (n.keywords) console.log(`[WIZARD-DEBUG]   keywords: ${n.keywords.join(", ")}`);
      if (n.differentiation) console.log(`[WIZARD-DEBUG]   differentiation: ${n.differentiation}`);
      if (n.risks) console.log(`[WIZARD-DEBUG]   risks: ${n.risks}`);
      console.log(`[WIZARD-DEBUG]   ──────────────────────────────────────────────────────`);
    });
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

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
 *     title: "Criativo",
 *     description: "...",
 *     angle: "criativo"
 *   },
 *   cta: "Link in bio",
 *   ragContext: "Additional context..."
 * })
 *
 * if (result.success) {
 *   console.log(result.data.slides) // GeneratedSlide[]
 *   console.log(result.data.caption) // string
 * }
 * ```
 */
export async function generateContent(
  input: WizardGenerationInput,
  model: string = WIZARD_DEFAULT_MODEL
): Promise<ServiceResult<GeneratedContent>> {
  // ==============================================================================
  // WIZARD DEBUG: INPUTS PARA GERAÇÃO DE CONTEÚDO
  // ==============================================================================
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] FASE: GERAÇÃO DE CONTEÚDO FINAL`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] Modelo Selecionado: ${model}`);
  console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
  console.log(`[WIZARD-DEBUG] NARRATIVA SELECIONADA:`);
  console.log(`[WIZARD-DEBUG]   id: ${input.selectedNarrative.id}`);
  console.log(`[WIZARD-DEBUG]   angle: ${input.selectedNarrative.angle}`);
  console.log(`[WIZARD-DEBUG]   title: ${input.selectedNarrative.title}`);
  console.log(`[WIZARD-DEBUG]   description: ${input.selectedNarrative.description}`);
  if (input.selectedNarrative.viewpoint) console.log(`[WIZARD-DEBUG]   viewpoint: ${input.selectedNarrative.viewpoint}`);
  if (input.selectedNarrative.whyUse) console.log(`[WIZARD-DEBUG]   whyUse: ${input.selectedNarrative.whyUse}`);
  if (input.selectedNarrative.impact) console.log(`[WIZARD-DEBUG]   impact: ${input.selectedNarrative.impact}`);
  if (input.selectedNarrative.tone) console.log(`[WIZARD-DEBUG]   tone: ${input.selectedNarrative.tone}`);
  if (input.selectedNarrative.keywords) console.log(`[WIZARD-DEBUG]   keywords: ${input.selectedNarrative.keywords.join(", ")}`);
  console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
  console.log(`[WIZARD-DEBUG] PARÂMETROS DE CONTEÚDO:`);
  console.log(`[WIZARD-DEBUG]   contentType: ${input.contentType}`);
  console.log(`[WIZARD-DEBUG]   numberOfSlides: ${input.numberOfSlides || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   cta: ${input.cta || "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   negativeTerms: ${input.negativeTerms?.join(", ") || "(nenhum)"}`);
  console.log(`[WIZARD-DEBUG]   ragContext: ${input.ragContext ? `${input.ragContext.length} chars` : "(não informado)"}`);
  console.log(`[WIZARD-DEBUG]   customInstructions: ${input.customInstructions || "(não informado)"}`);
  console.log(`${"=".repeat(80)}\n`);

  // Check if OpenRouter is configured
  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  try {
    // Build the content-specific prompt
    const prompt = getContentPrompt({
      contentType: input.contentType,
      narrativeAngle: input.selectedNarrative.angle,
      narrativeTitle: input.selectedNarrative.title,
      narrativeDescription: input.selectedNarrative.description,
      numberOfSlides: input.numberOfSlides,
      cta: input.cta,
      negativeTerms: input.negativeTerms,
      ragContext: input.ragContext,
      theme: input.theme,
      targetAudience: input.targetAudience,
    });

    // Create a user message that reinforces the content type
    const userMessage = `Generate ${input.contentType} content with the selected narrative approach.`;

    // ==============================================================================
    // WIZARD DEBUG: PROMPT ENVIADO PARA IA (CONTEÚDO)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] PROMPT ENVIADO PARA IA (GERAÇÃO DE CONTEÚDO)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(prompt);
    console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
    console.log(`[WIZARD-DEBUG] USER MESSAGE:`);
    console.log(userMessage);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Call LLM with retry logic
    const response = await llmCallWithRetry(
      model,
      prompt,
      userMessage,
      MAX_RETRIES
    );

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA DA IA (CONTEÚDO)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] RESPOSTA BRUTA DA IA (CONTEÚDO)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(response);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // Validate and structure response based on content type
    const generatedContent = structureGeneratedContent(
      input.contentType,
      parsed,
      input.selectedNarrative,
      model,
      input.ragContext ? true : false
    );

    // ==============================================================================
    // WIZARD DEBUG: CONTEÚDO FINAL ESTRUTURADO
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] CONTEÚDO FINAL ESTRUTURADO`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(JSON.stringify(generatedContent, null, 2));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

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
      // Handle new ZORYON v3.0 structure with capa, slides (numero/titulo/corpo/acao), legenda
      if ("capa" in response && "slides" in response && "legenda" in response) {
        // New format: { capa: { titulo, subtitulo }, slides: [{ numero, titulo, corpo, acao }], legenda }
        const capa = response.capa as Record<string, unknown> | undefined;
        const slides = response.slides as Array<{ numero?: number; titulo?: string; corpo?: string; acao?: string }>;

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
              imagePrompt: slide.acao ? String(slide.acao) : undefined,
            })),
          ],
          caption: response.legenda ? String(response.legenda) : undefined,
          hashtags: response.hashtags ? StringArray(response.hashtags) : undefined,
          cta: response.cta ? String(response.cta) : undefined,
          metadata: baseMetadata,
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
      if (!("script" in response)) {
        throw new Error("Video response missing 'script' field");
      }

      // Script can be an array of scene objects or a string
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
  try {
    const result = await generateText({
      model: openrouter!(model),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.7,
    });

    return result.text;
  } catch (error) {
    const isLastAttempt = attempt >= maxRetries;

    if (isLastAttempt) {
      throw error;
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
