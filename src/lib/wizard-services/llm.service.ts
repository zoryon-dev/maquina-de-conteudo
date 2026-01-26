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

/**
 * Maximum retries for LLM calls
 */
const MAX_RETRIES = 2;


// ============================================================================
// USER VARIABLES HELPER
// ============================================================================

/**
 * Fetch user variables and merge with input-provided values.
 *
 * User variables from database act as defaults, but explicit values
 * in the wizard input take precedence. This allows users to override
 * their saved variables when creating specific content.
 *
 * Also formats the variables into a context block for prompt injection.
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
  // Fetch saved variables from database (pass userId for worker context)
  const savedVariables = await getUserVariables(userId)

  // Debug: Log loaded variables
  console.log(`[WIZARD-VARIABLES] ════════════════════════════════════════════════════════`)
  console.log(`[WIZARD-VARIABLES] Carregando variáveis do usuário (userId: ${userId || "contexto auth"})`)
  const variableKeys = Object.keys(savedVariables)
  console.log(`[WIZARD-VARIABLES] Variáveis encontradas: ${variableKeys.length}`)
  if (variableKeys.length > 0) {
    variableKeys.forEach(key => {
      const value = (savedVariables as any)[key]
      console.log(`[WIZARD-VARIABLES]   • ${key}: ${value?.substring(0, 50) || "(vazio)"}${value?.length > 50 ? "..." : ""}`)
    })
  } else {
    console.log(`[WIZARD-VARIABLES] ⚠️ Nenhuma variável salva encontrada no banco`)
  }
  console.log(`[WIZARD-VARIABLES] ════════════════════════════════════════════════════════`)

  // Merge: input values take precedence over saved variables
  const mergedVariables: UserVariables = {
    tone: inputTone || savedVariables.tone,
    brandVoice: savedVariables.brandVoice,
    niche: inputNiche || savedVariables.niche,
    targetAudience: inputTargetAudience || savedVariables.targetAudience,
    audienceFears: savedVariables.audienceFears,
    audienceDesires: savedVariables.audienceDesires,
    differentiators: savedVariables.differentiators,
    contentGoals: savedVariables.contentGoals,
    preferredCTAs: savedVariables.preferredCTAs,
    negativeTerms: savedVariables.negativeTerms,
  }

  // Format variables for prompt injection
  const { context: variablesContext, hasVariables } = formatVariablesForPrompt(mergedVariables)

  if (hasVariables) {
    console.log(`[WIZARD-VARIABLES] ✅ Contexto de variáveis gerado (${variablesContext.length} chars)`)
  } else {
    console.log(`[WIZARD-VARIABLES] ⚠️ Nenhuma variável para adicionar ao prompt`)
  }

  // Merge negative terms (input + saved)
  const savedNegativeTerms = getNegativeTermsArray(savedVariables)
  const mergedNegativeTerms = [...new Set([...savedNegativeTerms, ...(inputNegativeTerms || [])])]

  if (mergedNegativeTerms.length > 0) {
    console.log(`[WIZARD-VARIABLES] Termos proibidos: ${mergedNegativeTerms.join(", ")}`)
  }

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
 *   console.log(result.data.narratives) // NarrativeOption[]
 * }
 * ```
 */
export async function generateNarratives(
  input: WizardNarrativesInput,
  model: string = WIZARD_DEFAULT_MODEL,
  userId?: string // Optional userId for worker context (to fetch user variables)
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

    // ==============================================================================
    // WIZARD DEBUG: PROMPT ENVIADO PARA IA (NARRATIVAS)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 🚀 INICIANDO GERAÇÃO DE NARRATIVAS`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 📊 ESTATÍSTICAS DO PROMPT:`);
    console.log(`[WIZARD-NARRATIVES]   • Tamanho total: ${systemPrompt.length} caracteres`);
    console.log(`[WIZARD-NARRATIVES]   • Tokens estimados: ~${Math.round(systemPrompt.length / 4)} tokens`);
    console.log(`[WIZARD-NARRATIVES]   • Modelo: ${model}`);
    console.log(`[WIZARD-NARRATIVES]   • Variáveis de usuário: ${variablesContext ? "Sim" : "Não"}`);
    console.log(`[WIZARD-NARRATIVES]   • Termos proibidos: ${mergedNegativeTerms.length || 0}`);
    console.log(`[WIZARD-NARRATIVES] 📝 CONTEÚDO EXTRAÍDO: ${input.extractedContent ? "✅ " + input.extractedContent.length + " chars" : "❌ Nenhum"}`);
    console.log(`[WIZARD-NARRATIVES] 🔬 PESQUISA: ${input.researchData ? "✅ " + input.researchData.length + " chars" : "❌ Nenhuma"}`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 📄 PROMPT COMPLETO (primeiros 2000 chars):`);
    console.log("─".repeat(80));
    console.log(systemPrompt.substring(0, 2000) + (systemPrompt.length > 2000 ? "\n... [truncado]" : ""));
    console.log("─".repeat(80));
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
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
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 📥 RESPOSTA BRUTA DA IA`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES]   • Tamanho: ${response.length} caracteres`);
    console.log(`[WIZARD-NARRATIVES]   • Tokens estimados: ~${Math.round(response.length / 4)} tokens`);
    console.log(`[WIZARD-NARRATIVES] 📄 CONTEÚDO (primeiros 1500 chars):`);
    console.log("─".repeat(80));
    console.log(response.substring(0, 1500) + (response.length > 1500 ? "\n... [truncado]" : ""));
    console.log("─".repeat(80));
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA PARSEADA (NARRATIVAS)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] ✅ JSON EXTRAÍDO COM SUCESSO`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 📊 ESTRUTURA: ${parsed && typeof parsed === 'object' && 'narratives' in parsed ? "✅ Válida" : "❌ Inválida"}`);

    if (parsed && typeof parsed === 'object' && 'narratives' in parsed) {
      const narrs = (parsed as { narratives: unknown[] }).narratives;
      console.log(`[WIZARD-NARRATIVES] 📝 NARRATIVAS GERADAS: ${Array.isArray(narrs) ? narrs.length : 0}`);

      if (Array.isArray(narrs)) {
        narrs.forEach((narr: unknown, idx: number) => {
          if (narr && typeof narr === 'object') {
            const n = narr as Record<string, unknown>;
            console.log(`[WIZARD-NARRATIVES]   ${idx + 1}. ${n.title || "(sem título)"} [${n.angle || "sem ângulo"}]`);
          }
        });
      }
    }

    console.log(`[WIZARD-NARRATIVES] 📄 JSON COMPLETO:`);
    console.log("─".repeat(80));
    console.log(JSON.stringify(parsed, null, 2));
    console.log("─".repeat(80));
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
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
      // Tribal narrative fields (v4)
      if (n.hook) console.log(`[WIZARD-DEBUG]   hook: ${n.hook}`);
      if (n.core_belief) console.log(`[WIZARD-DEBUG]   core_belief: ${n.core_belief}`);
      if (n.status_quo_challenged) console.log(`[WIZARD-DEBUG]   status_quo_challenged: ${n.status_quo_challenged}`);
      // Extended fields (legacy)
      if (n.viewpoint) console.log(`[WIZARD-DEBUG]   viewpoint: ${n.viewpoint}`);
      if (n.whyUse) console.log(`[WIZARD-DEBUG]   whyUse: ${n.whyUse}`);
      if (n.impact) console.log(`[WIZARD-DEBUG]   impact: ${n.impact}`);
      if (n.tone) console.log(`[WIZARD-DEBUG]   tone: ${n.tone}`);
      if (n.keywords) console.log(`[WIZARD-DEBUG]   keywords: ${n.keywords.join(", ")}`);
      if (n.differentiation) console.log(`[WIZARD-DEBUG]   differentiation: ${n.differentiation}`);
      if (n.risks) console.log(`[WIZARD-DEBUG]   risks: ${n.risks}`);
      console.log(`[WIZARD-DEBUG]   ──────────────────────────────────────────────────────`);
    });
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-NARRATIVES] 🎉 GERAÇÃO DE NARRATIVAS CONCLUÍDA COM SUCESSO!`);
    console.log(`[WIZARD-NARRATIVES] ════════════════════════════════════════════════════════`);
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
 *     title: "Herege",
 *     description: "...",
 *     angle: "herege"
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
  model: string = WIZARD_DEFAULT_MODEL,
  userId?: string // Optional userId for worker context (to fetch user variables)
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
  // Tribal narrative fields (v4)
  if (input.selectedNarrative.hook) console.log(`[WIZARD-DEBUG]   hook: ${input.selectedNarrative.hook}`);
  if (input.selectedNarrative.core_belief) console.log(`[WIZARD-DEBUG]   core_belief: ${input.selectedNarrative.core_belief}`);
  if (input.selectedNarrative.status_quo_challenged) console.log(`[WIZARD-DEBUG]   status_quo_challenged: ${input.selectedNarrative.status_quo_challenged}`);
  // Extended fields (legacy)
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
      numberOfSlides: input.numberOfSlides,
      cta: input.cta,
      negativeTerms: mergedNegativeTerms.length > 0 ? mergedNegativeTerms : input.negativeTerms,
      ragContext: input.ragContext,
      theme: input.theme,
      targetAudience: input.targetAudience,
      selectedVideoTitle: input.selectedVideoTitle?.title, // Pass selected video title for videos
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

    // ==============================================================================
    // WIZARD DEBUG: PROMPT ENVIADO PARA IA (CONTEÚDO)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 🚀 INICIANDO GERAÇÃO DE CONTEÚDO FINAL`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 📊 ESTATÍSTICAS DO PROMPT:`);
    console.log(`[WIZARD-CONTENT]   • Tamanho total: ${prompt.length} caracteres`);
    console.log(`[WIZARD-CONTENT]   • Tokens estimados: ~${Math.round(prompt.length / 4)} tokens`);
    console.log(`[WIZARD-CONTENT]   • Modelo: ${model}`);
    console.log(`[WIZARD-CONTENT]   • Tipo de conteúdo: ${input.contentType}`);
    console.log(`[WIZARD-CONTENT]   • Ângulo da narrativa: ${input.selectedNarrative.angle}`);
    console.log(`[WIZARD-CONTENT]   • Slides: ${input.numberOfSlides || "N/A"}`);
    console.log(`[WIZARD-CONTENT]   • RAG Context: ${input.ragContext ? "✅ " + input.ragContext.length + " chars" : "❌ Nenhum"}`);
    console.log(`[WIZARD-CONTENT]   • Variáveis usuário: ${variablesContext ? "✅" : "❌"}`);
    console.log(`[WIZARD-CONTENT]   • Termos proibidos: ${mergedNegativeTerms.length || 0}`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 📄 PROMPT COMPLETO (primeiros 2000 chars):`);
    console.log("─".repeat(80));
    console.log(prompt.substring(0, 2000) + (prompt.length > 2000 ? "\n... [truncado]" : ""));
    console.log("─".repeat(80));
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
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
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 📥 RESPOSTA BRUTA DA IA`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT]   • Tamanho: ${response.length} caracteres`);
    console.log(`[WIZARD-CONTENT]   • Tokens estimados: ~${Math.round(response.length / 4)} tokens`);
    console.log(`[WIZARD-CONTENT] 📄 CONTEÚDO (primeiros 1500 chars):`);
    console.log("─".repeat(80));
    console.log(response.substring(0, 1500) + (response.length > 1500 ? "\n... [truncado]" : ""));
    console.log("─".repeat(80));
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
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
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] ✅ CONTEÚDO FINAL ESTRUTURADO`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 📊 RESUMO DO CONTEÚDO GERADO:`);
    console.log(`[WIZARD-CONTENT]   • Tipo: ${generatedContent.type}`);
    console.log(`[WIZARD-CONTENT]   • Slides: ${generatedContent.slides?.length || 0}`);
    console.log(`[WIZARD-CONTENT]   • Caption: ${generatedContent.caption ? "✅ " + generatedContent.caption.length + " chars" : "❌"}`);
    console.log(`[WIZARD-CONTENT]   • Hashtags: ${generatedContent.hashtags?.length || 0}`);
    console.log(`[WIZARD-CONTENT]   • CTA: ${generatedContent.cta ? "✅" : "❌"}`);

    if (generatedContent.slides && generatedContent.slides.length > 0) {
      console.log(`[WIZARD-CONTENT] 📄 SLIDES GERADOS:`);
      generatedContent.slides.forEach((slide, idx) => {
        console.log(`[WIZARD-CONTENT]   ${idx + 1}. ${slide.title ? slide.title.substring(0, 50) : "(sem título)"}...`);
        console.log(`[WIZARD-CONTENT]      ${slide.content.substring(0, 80)}...`);
      });
    }

    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-CONTENT] 🎉 GERAÇÃO DE CONTEÚDO CONCLUÍDA COM SUCESSO!`);
    console.log(`[WIZARD-CONTENT] ════════════════════════════════════════════════════════`);
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
      // Handle new ZORYON v4.3 structure with valor_central, capa, slides (numero/tipo/titulo/corpo/conexao_proximo), legenda
      if ("capa" in response && "slides" in response && "legenda" in response) {
        // VALIDAÇÃO RUNTIME v4.3 - Garante que a IA seguiu as instruções
        const validated = validateCarouselResponse(response);

        // New format: { throughline, valor_central, capa: { titulo, subtitulo }, slides: [{ numero, tipo, titulo, corpo, conexao_proximo }], legenda }
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
              // v4.3: removed 'acao' field - actionability is now in slide 'tipo' and content itself
              imagePrompt: undefined,
            })),
          ],
          caption: validated.legenda,
          hashtags: undefined,
          cta: undefined,
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
      // Handle both legacy format (script field) and new v4.3 format (VideoScriptStructured)
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

      // Check for VideoScriptStructured v4.3 format
      if ("meta" in response && "roteiro" in response && "thumbnail" in response) {
        // New v4.3 format: VideoScriptStructured
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
          } as any, // Using 'as any' because we're adding v4.3-specific 'script' property
        };
      }

      throw new Error("Video response missing required fields (expected 'script' or VideoScriptStructured v4.3 format with 'meta', 'roteiro', 'thumbnail')");
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
