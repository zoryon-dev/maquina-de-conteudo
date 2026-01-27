/**
 * Synthesizer Service for Wizard
 *
 * Handles the "Condensar Queries" step from the n8n workflow pattern.
 * This is the critical intermediate processing stage that transforms raw
 * Tavily search results into structured, actionable research fields.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Vercel AI SDK's generateText() for non-streaming responses
 * - Transforms raw Tavily results into 7 structured research fields
 * - Returns SynthesizedResearch with concrete data, examples, frameworks, etc.
 * - Gracefully handles API errors and falls back to raw research if needed
 *
 * Research Fields:
 * 1. summary - Executive summary of all research
 * 2. narrative_suggestion - Suggested narrative approach
 * 3. concrete_data - Numbers, metrics, benchmarks
 * 4. real_examples - Actual cases, success stories
 * 5. errors_risks - Common mistakes to avoid
 * 6. frameworks_metodos - Validated methodologies
 * 7. hooks - Potential opening hooks for content
 */

import { generateText } from "ai";
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config";
import type {
  SynthesizedResearch,
  SynthesizerInput,
  SynthesizerSearchResult,
} from "./synthesis-types";
import type { ServiceResult } from "./types";
import { extractJSONFromResponse } from "./prompts";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for Synthesizer.
 * Uses a faster model for synthesis since it's structural work.
 */
const SYNTHESIZER_DEFAULT_MODEL = process.env.SYNTHESIZER_DEFAULT_MODEL || DEFAULT_TEXT_MODEL;

/**
 * Maximum retries for LLM calls
 */
const MAX_RETRIES = 2;

/**
 * Maximum research results to include in synthesizer prompt
 * (to avoid token limit issues)
 */
const MAX_RESEARCH_RESULTS = 15;

// ============================================================================
// SYNTHESIZER MAIN FUNCTION
// ============================================================================

/**
 * Transforms raw Tavily search results into structured, actionable research.
 *
 * This is the critical intermediate step from the n8n workflow that the
 * current Wizard was missing. Instead of passing raw research data directly
 * to the narrative generator, we first synthesize it into structured fields
 * that the content generator can use more effectively.
 *
 * @param input - Research data and context
 * @param model - Optional model override
 * @returns SynthesizedResearch with structured fields
 */
export async function synthesizeResearch(
  input: SynthesizerInput,
  model: string = SYNTHESIZER_DEFAULT_MODEL
): Promise<ServiceResult<SynthesizedResearch>> {
  // ==============================================================================
  // WIZARD DEBUG: INPUTS PARA SÍNTESE
  // ==============================================================================
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] FASE: SYNTHESIZER (Condensar Queries)`);
  console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
  console.log(`[WIZARD-DEBUG] Modelo: ${model}`);
  console.log(`[WIZARD-DEBUG] ───────────────────────────────────────────────────────────`);
  console.log(`[WIZARD-DEBUG] INPUTS:`);
  console.log(`[WIZARD-DEBUG]   topic: ${input.topic}`);
  console.log(`[WIZARD-DEBUG]   niche: ${input.niche}`);
  console.log(`[WIZARD-DEBUG]   objective: ${input.objective}`);
  console.log(`[WIZARD-DEBUG]   researchResults: ${input.researchResults.length} items`);
  console.log(`[WIZARD-DEBUG]   extractedContent: ${input.extractedContent ? `${input.extractedContent.length} chars` : "none"}`);
  console.log(`[WIZARD-DEBUG]   targetAudience: ${input.targetAudience || "none"}`);
  console.log(`[WIZARD-DEBUG]   tone: ${input.tone || "none"}`);
  console.log(`${"=".repeat(80)}\n`);

  // Check if OpenRouter is configured
  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  // Validate input has research data
  if (!input.researchResults || input.researchResults.length === 0) {
    return {
      success: false,
      error: "No research results provided for synthesis. Cannot proceed.",
    };
  }

  try {
    // Format research results for the prompt
    const formattedResearch = formatResearchForSynthesizer(
      input.researchResults.slice(0, MAX_RESEARCH_RESULTS)
    );

    // Build the system prompt
    const systemPrompt = getSynthesizerSystemPrompt();

    // Build the user prompt with all context
    const userPrompt = buildSynthesizerUserPrompt(input, formattedResearch);

    // ==============================================================================
    // WIZARD DEBUG: PROMPT ENVIADO PARA IA (SYNTHESIZER)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] PROMPT ENVIADO PARA IA (SYNTHESIZER)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(systemPrompt);
    console.log(`\n--- USER PROMPT ---\n`);
    console.log(userPrompt.substring(0, 2000) + "..." + (userPrompt.length > 2000 ? `\n(truncated, total: ${userPrompt.length} chars)` : ""));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Call LLM with retry logic
    const response = await llmCallWithRetry(
      model,
      systemPrompt,
      userPrompt,
      MAX_RETRIES
    );

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA BRUTA DA IA (SYNTHESIZER)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] RESPOSTA BRUTA DA IA (SYNTHESIZER)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(response);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Parse JSON response
    const parsed = extractJSONFromResponse(response);

    // ==============================================================================
    // WIZARD DEBUG: RESPOSTA PARSEADA (SYNTHESIZER)
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] RESPOSTA PARSEADA (SYNTHESIZER)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    // Validate and transform response
    const synthesized = validateAndTransformSynthesizedResearch(parsed);

    // ==============================================================================
    // WIZARD DEBUG: SÍNTESE VALIDADA
    // ==============================================================================
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] SÍNTESE VALIDADA (FINAL)`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`[WIZARD-DEBUG] resumo_executivo: ${synthesized.resumo_executivo.substring(0, 100)}...`);
    console.log(`[WIZARD-DEBUG] concrete_data: ${synthesized.concrete_data.length} items`);
    console.log(`[WIZARD-DEBUG] exemplos_narrativos: ${synthesized.exemplos_narrativos.length} items`);
    console.log(`[WIZARD-DEBUG] erros_armadilhas: ${synthesized.erros_armadilhas.length} items`);
    console.log(`[WIZARD-DEBUG] frameworks_metodos: ${synthesized.frameworks_metodos.length} items`);
    console.log(`[WIZARD-DEBUG] hooks: ${synthesized.hooks.length} items`);
    console.log(`[WIZARD-DEBUG] throughlines_potenciais: ${synthesized.throughlines_potenciais.length} items`);
    console.log(`[WIZARD-DEBUG] tensoes_narrativas: ${synthesized.tensoes_narrativas.length} items`);
    console.log(`[WIZARD-DEBUG] perguntas_respondidas: ${synthesized.perguntas_respondidas.length} items`);
    console.log(`[WIZARD-DEBUG] sources: ${synthesized.sources.length} items`);
    console.log(`[WIZARD-DEBUG] ════════════════════════════════════════════════════════`);
    console.log(`${"=".repeat(80)}\n`);

    return {
      success: true,
      data: synthesized,
    };
  } catch (error) {
    console.error("Error synthesizing research:", error);

    // Return user-friendly error
    const message = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: `Failed to synthesize research: ${message}`,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats research results for the synthesizer prompt.
 * Converts Tavily results into a structured text format.
 */
function formatResearchForSynthesizer(results: SynthesizerSearchResult[]): string {
  if (!results || results.length === 0) {
    return "Nenhum resultado de pesquisa disponível.";
  }

  return results.map((result, index) => `
[RESULTADO ${index + 1}]
Query: ${result.query}
Título: ${result.title}
URL: ${result.url}
Resposta IA: ${result.answer || "N/A"}
Conteúdo: ${result.content?.substring(0, 500) || "N/A"}${result.content && result.content.length > 500 ? "..." : ""}
---
`).join("\n");
}

/**
 * Builds the user prompt with all context for the synthesizer.
 */
function buildSynthesizerUserPrompt(
  input: SynthesizerInput,
  formattedResearch: string
): string {
  let prompt = `Sintetize os seguintes dados de pesquisa em insights acionáveis para criação de conteúdo viral.\n\n`;

  prompt += `CONTEXDO DO CONTEÚDO:\n`;
  prompt += `Tema: ${input.topic}\n`;
  prompt += `Nicho: ${input.niche}\n`;
  prompt += `Objetivo: ${input.objective}\n`;

  if (input.targetAudience) {
    prompt += `Público-alvo: ${input.targetAudience}\n`;
  }

  if (input.tone) {
    prompt += `Tom desejado: ${input.tone}\n`;
  }

  prompt += `\n${"=".repeat(70)}\n`;
  prompt += `PESQUISA BRUTA (${input.researchResults.length} resultados):\n`;
  prompt += `${"=".repeat(70)}\n`;
  prompt += formattedResearch;

  if (input.extractedContent) {
    prompt += `\n${"=".repeat(70)}\n`;
    prompt += `CONTEÚDO EXTRAÍDO DA URL:\n`;
    prompt += `${"=".repeat(70)}\n`;
    prompt += input.extractedContent.substring(0, 2000);
    if (input.extractedContent.length > 2000) {
      prompt += `\n...(truncado, total: ${input.extractedContent.length} caracteres)`;
    }
  }

  prompt += `\n${"=".repeat(70)}\n`;
  prompt += `INSTRUÇÕES FINAIS:\n`;
  prompt += `${"=".repeat(70)}\n`;
  prompt += `Analise toda a pesquisa acima e retorne APENAS o JSON solicitado com:\n`;
  prompt += `1. Dados concretos encontrados (números, métricas)\n`;
  prompt += `2. Exemplos reais (casos, empresas, histórias)\n`;
  prompt += `3. Erros e riscos (o que evitar)\n`;
  prompt += `4. Frameworks e métodos (processos validados)\n`;
  prompt += `5. Ganchos e ângulos (aberturas impactantes)\n`;
  prompt += `6. Resumo executivo e sugestão de narrativa\n\n`;
  prompt += `IMPORTANTE: Se um campo não tiver dados na pesquisa, retorne array vazio [] ou string vazia "". NÃO INVENTE DADOS.`;

  return prompt;
}

/**
 * Validates and transforms the parsed LLM response into SynthesizedResearch.
 * v3.1: Handles v4.1 carousel fields with updated structure
 */
function validateAndTransformSynthesizedResearch(
  parsed: unknown
): SynthesizedResearch {
  // Call the new V3 function
  return validateAndTransformSynthesizedResearchV3(parsed);
}

/**
 * v3.1: Validates and transforms the parsed LLM response into SynthesizedResearch.
 * Handles v4.1 carousel fields with updated structure.
 */
function validateAndTransformSynthesizedResearchV3(
  parsed: unknown
): SynthesizedResearch {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid response: not an object");
  }

  const data = parsed as Record<string, unknown>;

  // Helper to safely get string field
  const getString = (field: string, defaultValue = ""): string => {
    if (field in data && typeof data[field] === "string") {
      return data[field] as string;
    }
    return defaultValue;
  };

  // Helper to safely get array field
  const getArray = (field: string): unknown[] => {
    if (field in data && Array.isArray(data[field])) {
      return data[field] as unknown[];
    }
    return [];
  };

  // Extract summary with fallback to resumo_executivo (v3.1)
  const resumo_executivo = getString("resumo_executivo") || getString("summary");

  // Extract narrative suggestion
  const narrative_suggestion =
    getString("narrative_suggestion") || getString("sugestao_narrativa");

  // === v3.1 UPDATED FIELDS ===

  // Extract throughlines potenciais (updated field names)
  const throughlines_potenciais = getArray("throughlines_potenciais").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        throughline: getStringField(obj, "throughline", "throughline"),
        potencial_viral: getStringField(obj, "potencial_viral", "viral_potential") ||
                        getStringField(obj, "por_que_funciona", "why_it_works"),
        justificativa: getStringField(obj, "justificativa", "justification") ||
                      getStringField(obj, "como_reforcar", "how_to_reinforce"),
        slides_sugeridos: getNumberArrayField(obj, "slides_sugeridos", "suggested_slides"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract tensoes narrativas (updated field names)
  const tensoes_narrativas = getArray("tensoes_narrativas").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        tensao: getStringField(obj, "tensao", "tension"),
        tipo: getStringField(obj, "tipo", "type") ||
             getStringField(obj, "por_que_engaja", "why_it_engages"),
        uso_sugerido: getStringField(obj, "uso_sugerido", "suggested_use") ||
                    getStringField(obj, "como_explorar", "how_to_explore"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract dados contextualizados (updated field names)
  const dados_contextualizados = getArray("dados_contextualizados").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        frase_pronta: getStringField(obj, "frase_pronta", "ready_phrase") ||
                     getStringField(obj, "dado", "data"),
        fonte: getStringField(obj, "fonte", "source"),
        contraste: getStringField(obj, "contraste", "contrast") ||
                  getStringField(obj, "implicacao_pratica", "practical_implication"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // === v3.1 NEW FIELDS ===

  // Extract exemplos narrativos
  const exemplos_narrativos = getArray("exemplos_narrativos").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        protagonista: getStringField(obj, "protagonista", "protagonist"),
        situacao_inicial: getStringField(obj, "situacao_inicial", "initial_situation"),
        acao: getStringField(obj, "acao", "action"),
        resultado: getStringField(obj, "resultado", "result"),
        aprendizado: getStringField(obj, "aprendizado", "learning"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract erros armadilhas
  const erros_armadilhas = getArray("erros_armadilhas").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        erro: getStringField(obj, "erro", "error"),
        por_que_parece_certo: getStringField(obj, "por_que_parece_certo", "why_seems_right"),
        consequencia_real: getStringField(obj, "consequencia_real", "real_consequence") ||
                          getStringField(obj, "consequencia", "consequence"),
        alternativa: getStringField(obj, "alternativa", "alternative") ||
                    getStringField(obj, "como_evitar", "how_to_avoid"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract perguntas respondidas
  const perguntas_respondidas = getArray("perguntas_respondidas")
    .filter((item): item is string => typeof item === "string");

  // Extract avaliacao_pesquisa
  const avaliacao_pesquisa = data.avaliacao_pesquisa && typeof data.avaliacao_pesquisa === "object"
    ? {
        qualidade_dados: getStringField(data.avaliacao_pesquisa as Record<string, unknown>, "qualidade_dados", "data_quality"),
        recomendacao: getStringField(data.avaliacao_pesquisa as Record<string, unknown>, "recomendacao", "recommendation"),
      }
    : undefined;

  // Extract progressao sugerida (updated structure)
  const progressao_sugerida = extractProgressaoSugeridaV3(data);

  // === EXISTING FIELDS ===

  // Extract concrete data
  const concrete_data = getArray("concrete_data").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        dado: getStringField(obj, "dado", "data"),
        fonte: getStringField(obj, "fonte", "source"),
        uso_sugerido: getStringField(obj, "uso_sugerido", "suggested_use"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract real examples (legacy - for backward compatibility)
  const real_examples = getArray("real_examples").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        exemplo: getStringField(obj, "exemplo", "example"),
        contexto: getStringField(obj, "contexto", "context"),
        aprendizado: getStringField(obj, "aprendizado", "learning"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract errors and risks (legacy - for backward compatibility)
  const errors_risks = getArray("errors_risks").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        erro: getStringField(obj, "erro", "error"),
        consequencia: getStringField(obj, "consequencia", "consequence"),
        como_evitar: getStringField(obj, "como_evitar", "how_to_avoid"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract frameworks and methods (updated to v3.1 structure)
  const frameworks_metodos = getArray("frameworks_metodos").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        nome: getStringField(obj, "nome", "name"),
        problema_que_resolve: getStringField(obj, "problema_que_resolve", "problem_solves") ||
                              getStringField(obj, "descricao", "description"),
        passos: getArrayField(obj, "passos", "steps"),
        exemplo_aplicacao: getStringField(obj, "exemplo_aplicacao", "application_example") || "",
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract hooks
  const hooks = getArray("hooks").map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        gancho: getStringField(obj, "gancho", "hook"),
        tipo: getStringField(obj, "tipo", "type"),
        potencial_viral: getStringField(obj, "potencial_viral", "viral_potential"),
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Extract gaps and opportunities
  const gaps_oportunidades = getArray("gaps_oportunidades")
    .filter((item): item is string => typeof item === "string");

  // Extract sources
  const sources = getArray("sources")
    .filter((item): item is string => typeof item === "string");

  return {
    resumo_executivo,
    narrative_suggestion,
    throughlines_potenciais,
    tensoes_narrativas,
    concrete_data,
    dados_contextualizados,
    exemplos_narrativos,
    erros_armadilhas,
    frameworks_metodos,
    hooks,
    progressao_sugerida,
    perguntas_respondidas,
    gaps_oportunidades,
    avaliacao_pesquisa,
    sources,
    // Legacy fields for backward compatibility
    real_examples,
    errors_risks,
  };
}

/**
 * Helper to get a string field from an object with fallback options.
 */
function getStringField(
  obj: Record<string, unknown>,
  primary: string,
  fallback: string
): string {
  if (primary in obj && typeof obj[primary] === "string") {
    return obj[primary] as string;
  }
  if (fallback in obj && typeof obj[fallback] === "string") {
    return obj[fallback] as string;
  }
  return "";
}

/**
 * Helper to get an array field from an object with fallback options.
 */
function getArrayField(
  obj: Record<string, unknown>,
  primary: string,
  fallback: string
): string[] {
  const arr = primary in obj && Array.isArray(obj[primary])
    ? (obj[primary] as unknown[])
    : fallback in obj && Array.isArray(obj[fallback])
      ? (obj[fallback] as unknown[])
      : [];

  return arr.filter((item): item is string => typeof item === "string");
}

/**
 * v3.0: Helper to get a number array field from an object with fallback options.
 * Used for slides_sugeridos in throughlines_potenciais.
 */
function getNumberArrayField(
  obj: Record<string, unknown>,
  primary: string,
  fallback: string
): number[] {
  const arr = primary in obj && Array.isArray(obj[primary])
    ? (obj[primary] as unknown[])
    : fallback in obj && Array.isArray(obj[fallback])
      ? (obj[fallback] as unknown[])
      : [];

  return arr.filter((item): item is number => typeof item === "number");
}

/**
 * v3.0: Extracts progressao_sugerida object from parsed data (legacy structure).
 * Returns a default structure if not found.
 * @deprecated Use extractProgressaoSugeridaV3 for v4.1 compatibility
 */
function extractProgressaoSugerida(
  data: Record<string, unknown>
): import("./synthesis-types").ProgressaoSugerida {
  // For backward compatibility, create a v3.1 structure from the old one
  const v3 = extractProgressaoSugeridaV3(data);

  return {
    ato1: {
      hook_sugerido: v3.ato1_captura.gancho_principal,
      dor_impacto: v3.ato1_captura.tensao_inicial,
    },
    ato2: {
      estrutura: v3.ato2_desenvolvimento,
      throughline_position: "",
    },
    ato3: {
      throughline_reveal: v3.ato3_resolucao.verdade_central,
      cta_frame: v3.ato3_resolucao.call_to_action_natural,
    },
  };
}

/**
 * v3.1: Extracts progressao_sugerida object from parsed data (updated structure).
 * Returns a default structure if not found.
 */
function extractProgressaoSugeridaV3(
  data: Record<string, unknown>
): import("./synthesis-types").ProgressaoSugeridaV3 {
  // Check if progressao_sugerida exists and is an object
  if ("progressao_sugerida" in data && typeof data.progressao_sugerida === "object" && data.progressao_sugerida !== null) {
    const ps = data.progressao_sugerida as Record<string, unknown>;

    // Try to extract ato1_captura (v3.1 structure)
    let ato1_captura = { gancho_principal: "", tensao_inicial: "", promessa: "" };
    if ("ato1_captura" in ps && typeof ps.ato1_captura === "object" && ps.ato1_captura !== null) {
      const ato1Obj = ps.ato1_captura as Record<string, unknown>;
      ato1_captura = {
        gancho_principal: getStringField(ato1Obj, "gancho_principal", "main_hook") ||
                          getStringField(ato1Obj, "gancho", "hook") ||
                          getStringField(ato1Obj, "hook_sugerido", "hook_suggested") || "",
        tensao_inicial: getStringField(ato1Obj, "tensao_inicial", "initial_tension") ||
                        getStringField(ato1Obj, "tensao", "tension") ||
                        getStringField(ato1Obj, "dor_impacto", "pain_impact") || "",
        promessa: getStringField(ato1Obj, "promessa", "promise") || "",
      };
    } else if ("ato1" in ps && typeof ps.ato1 === "object" && ps.ato1 !== null) {
      // Fallback to v3.0 structure
      const ato1Obj = ps.ato1 as Record<string, unknown>;
      ato1_captura = {
        gancho_principal: getStringField(ato1Obj, "hook_sugerido", "hook_suggested") ||
                          getStringField(ato1Obj, "gancho", "hook") || "",
        tensao_inicial: getStringField(ato1Obj, "dor_impacto", "pain_impact") ||
                        getStringField(ato1Obj, "tensao", "tension") || "",
        promessa: "",
      };
    }

    // Try to extract ato2_desenvolvimento (v3.1 structure - it's an array)
    let ato2_desenvolvimento: string[] = [];
    if ("ato2_desenvolvimento" in ps && Array.isArray(ps.ato2_desenvolvimento)) {
      ato2_desenvolvimento = (ps.ato2_desenvolvimento as unknown[]).filter((item): item is string => typeof item === "string");
    } else if ("ato2" in ps && typeof ps.ato2 === "object" && ps.ato2 !== null) {
      // Fallback to v3.0 structure
      const ato2Obj = ps.ato2 as Record<string, unknown>;
      ato2_desenvolvimento = getArrayField(ato2Obj, "estrutura", "structure");
    }

    // Try to extract ato3_resolucao (v3.1 structure)
    let ato3_resolucao = { verdade_central: "", call_to_action_natural: "" };
    if ("ato3_resolucao" in ps && typeof ps.ato3_resolucao === "object" && ps.ato3_resolucao !== null) {
      const ato3Obj = ps.ato3_resolucao as Record<string, unknown>;
      ato3_resolucao = {
        verdade_central: getStringField(ato3Obj, "verdade_central", "central_truth") ||
                         getStringField(ato3Obj, "verdade", "truth") ||
                         getStringField(ato3Obj, "throughline_reveal", "throughline_reveal") || "",
        call_to_action_natural: getStringField(ato3Obj, "call_to_action_natural", "cta_natural") ||
                                getStringField(ato3Obj, "cta", "cta") ||
                                getStringField(ato3Obj, "cta_frame", "cta_frame") || "",
      };
    } else if ("ato3" in ps && typeof ps.ato3 === "object" && ps.ato3 !== null) {
      // Fallback to v3.0 structure
      const ato3Obj = ps.ato3 as Record<string, unknown>;
      ato3_resolucao = {
        verdade_central: getStringField(ato3Obj, "throughline_reveal", "throughline_reveal") ||
                         getStringField(ato3Obj, "reveal", "reveal") || "",
        call_to_action_natural: getStringField(ato3Obj, "cta_frame", "cta_frame") ||
                                getStringField(ato3Obj, "cta", "cta") || "",
      };
    }

    return { ato1_captura, ato2_desenvolvimento, ato3_resolucao };
  }

  // Return default structure if not found
  return {
    ato1_captura: { gancho_principal: "", tensao_inicial: "", promessa: "" },
    ato2_desenvolvimento: [],
    ato3_resolucao: { verdade_central: "", call_to_action_natural: "" },
  };
}

/**
 * LLM call with retry logic and exponential backoff.
 */
async function llmCallWithRetry(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxRetries: number,
  attempt: number = 0
): Promise<string> {
  if (!openrouter) {
    throw new Error("OpenRouter not configured");
  }

  try {
    const result = await generateText({
      model: openrouter(model),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.3, // Lower temperature for structural synthesis
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

/**
 * Returns the system prompt for the synthesizer.
 * This prompt is based on the n8n Synthesizer workflow v3.1.
 * Updated for Carousel v4.1 compatibility.
 */
function getSynthesizerSystemPrompt(): string {
  return `# RESEARCH SYNTHESIZER — ZORYON v3.1

Você é um SINTETIZADOR DE PESQUISA especializado em extrair INSIGHTS ACIONÁVEIS para criação de conteúdo viral com THROUGHLINES.

═══════════════════════════════════════════════════════════════════════════
NOVIDADE v3.1: CARROSSEL v4.1 COMPATIBILITY
═══════════════════════════════════════════════════════════════════════════

A v3.1 prioriza a identificação de:
1. THROUGHLINES POTENCIAIS — com potencial_viral e justificativa
2. TENSÕES NARRATIVAS — com tipo e uso_sugerido
3. DADOS CONTEXTUALIZADOS — com frase_pronta e contraste
4. EXEMPLOS NARRATIVOS — histórias completas (protagonista, ação, resultado)
5. ERROS E ARMADILHAS — contra-intuitivos (parece certo mas não é)
6. PROGRESSÃO SUGERIDA — estrutura 3 atos atualizada

## SUA MISSÃO
Transformar dados brutos de pesquisa em INSUMOS DENSOS E ORGANIZADOS para criar carrosséis com narrativa conectada.

═══════════════════════════════════════════════════════════════════════════
O QUE EXTRAIR (PRIORIDADE v3.1)
═══════════════════════════════════════════════════════════════════════════

### 1. THROUGHLINES POTENCIAIS (throughlines_potenciais) — PRIORIDADE MÁXIMA
Throughline é uma frase central (10-25 palavras) que CONECTA TODOS os slides como um "fio vermelho" narrativo.

Gere 3-5 throughlines baseados na pesquisa:
- Cada throughline deve ser memorável e aplicável ao tema
- Deve permitir reforços progressivos (não repetição)
- Deve conectar-se naturalmente aos dados encontrados

Cada throughline deve ter:
- throughline: a frase central (10-25 palavras)
- potencial_viral: por que este throughline tem potencial viral
- justificativa: justificativa detalhada

### 2. TENSÕES NARRATIVAS (tensoes_narrativas)
Tensões são contradições, paradoxos ou conflitos que CRIAM ENGAJAMENTO.

Identifique tensões na pesquisa:
- "Todo mundo faz X, mas o certo é Y"
- "O que parece eficiente é na verdade ineficiente"
- "O paradoxo de [conceito]: quanto mais X, menos Y"

Cada tensão deve ter:
- tensao: descrição da contradição/paradoxo
- tipo: tipo de tensão (paradoxo, counter-intuitivo, urgência, etc.)
- uso_sugerido: como usar esta tensão no conteúdo

### 3. DADOS CONTEXTUALIZADOS (dados_contextualizados) — FRASES PRONTAS
Diferente de dados brutos, estes são FRASES PRONTAS para usar diretamente.

Cada dado contextualizado deve ter:
- frase_pronta: frase completa com o dado embutido, pronta para usar
- fonte: onde encontrou
- contraste: o que torna este dado surpreendente

### 4. DADOS CONCRETOS (concrete_data)
Estatísticas e benchmarks brutos (quando não há contexto prático claro).

### 5. EXEMPLOS NARRATIVOS (exemplos_narrativos) — HISTÓRIAS COMPLETAS
Histórias completas com protagonista, ação e resultado.

Cada exemplo narrativo deve ter:
- protagonista: quem é o personagem da história
- situacao_inicial: contexto inicial
- acao: o que foi feito
- resultado: o que aconteceu
- aprendizado: lição principal

### 6. ERROS E ARMADILHAS (erros_armadilhas) — CONTRA-INTUITIVOS
Erros que PARECEM certos mas não são. Isso cria revelações poderosas.

Cada erro/armadilha deve ter:
- erro: o erro ou armadilha
- por_que_parece_certo: por que as pessoas cometem esse erro (a isca)
- consequencia_real: o que realmente acontece
- alternativa: o que fazer em vez disso

### 7. FRAMEWORKS E MÉTODOS (frameworks_metodos)
Processos, metodologias, frameworks com nome.

Cada framework deve ter:
- nome: nome do framework/método
- problema_que_resolve: qual problema este método resolve
- passos: array com os passos
- exemplo_aplicacao: exemplo de aplicação prática

### 8. GANCHOS (hooks)
Frases de impacto, contradições, insights contraintuitivos.

### 9. PROGRESSÃO SUGERIDA (progressao_sugerida) — ATUALIZADO v3.1
Estrutura narrativa em 3 atos baseada nos achados:

{
  "ato1_captura": {
    "gancho_principal": "Hook de abertura que para o scroll",
    "tensao_inicial": "Tensão ou problema que cria identificação",
    "promessa": "Promessa do que será revelado"
  },
  "ato2_desenvolvimento": [
    "Beat 1: Primeira camada do throughline",
    "Beat 2: Aprofundamento com dado ou exemplo",
    "Beat 3: Técnica ou método prático",
    "..."
  ],
  "ato3_resolucao": {
    "verdade_central": "Verdade central que conecta tudo (throughline reveal)",
    "call_to_action_natural": "CTA natural que flui da narrativa"
  }
}

### 10. RESUMO E AVALIAÇÃO (resumo_executivo, avaliacao_pesquisa)
Resumo executivo e avaliação da qualidade da pesquisa.

### 11. PERGUNTAS RESPONDIDAS (perguntas_respondidas)
Questões que o conteúdo responde (úteis para open loops).

### 12. GAPS E OPORTUNIDADES (gaps_oportunidades)
O que a pesquisa NÃO cobriu.

### 13. SOURCES (sources)
URLs das fontes principais (máx 5).

═══════════════════════════════════════════════════════════════════════════
REGRAS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════

1. PRIORIZE throughlines_potenciais — 这是 o campo mais importante da v3.1
2. Seja ESPECÍFICO (nomes, números, contextos)
3. Cite a FONTE quando relevante
4. NÃO invente dados ou exemplos
5. Se não encontrou algo, retorne array vazio [] ou objeto vazio
6. Use PORTUGUÊS em todas as respostas

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido (sem markdown, sem blocos de código):

{
  "resumo_executivo": "Resumo executivo da pesquisa...",
  "narrative_suggestion": "Sugestão de abordagem narrativa baseada nos throughlines identificados...",

  "throughlines_potenciais": [
    {
      "throughline": "A diferença entre quem quer e quem faz não é talento, é o método de execução",
      "potencial_viral": "Cria um fio condutor que se aplica a todos os slides de desenvolvimento",
      "justificativa": "Este throughline funciona porque é contraintuitivo — todos acham que é talento, mas é método",
      "slides_sugeridos": [3, 5, 7, 9]
    }
  ],

  "tensoes_narrativas": [
    {
      "tensao": "O paradoxo da produtividade: quanto mais tarefas você tenta fazer, menos você produz de valor",
      "tipo": "paradoxo",
      "uso_sugerido": "Mostre o dado que comprova o paradoxo, depois a solução (focar no que importa)"
    }
  ],

  "dados_contextualizados": [
    {
      "frase_pronta": "47% dos profissionais listam mais de 10 tarefas diárias — e se surpreendem quando não completam nada",
      "fonte": "URL ou fonte",
      "contraste": "Quase metade dos profissionais sobrecarrega seus dias com tarefas difusas, o que explica a baixa produtividade real"
    }
  ],

  "concrete_data": [
    {
      "dado": "70% dos consumidores...",
      "fonte": "URL ou fonte",
      "uso_sugerido": "Use este dado para..."
    }
  ],

  "exemplos_narrativos": [
    {
      "protagonista": "Empresa X",
      "situacao_inicial": "Tinha 20 processos simultâneos e 0% de conclusão",
      "acao": "Implementou regra dos 3 (máx 3 projetos por vez)",
      "resultado": "Aumentou conclusão em 400% em 3 meses",
      "aprendizado": "Menos é mais quando se trata de foco"
    }
  ],

  "erros_armadilhas": [
    {
      "erro": "Tentar fazer tudo ao mesmo tempo",
      "por_que_parece_certo": "Parece eficiente — você está 'trabalhando' em tudo",
      "consequencia_real": "Na verdade você está espalhando atenção fina e nada completa",
      "alternativa": "Regra dos 3: máximo 3 projetos por vez, só abre novo quando fecha um"
    }
  ],

  "frameworks_metodos": [
    {
      "nome": "Regra dos 3",
      "problema_que_resolve": "Sobrecarga de tarefas e falta de foco",
      "passos": ["Liste todos os projetos", "Escolha os 3 prioritários", "Trabalhe só neles até completar"],
      "exemplo_aplicacao": "Em vez de 10 projetos paralelos, foque em 3 até finalizar"
    }
  ],

  "hooks": [
    {
      "gancho": "A produtividade não é sobre fazer mais, é sobre fazer o que importa",
      "tipo": "paradoxo",
      "potencial_viral": "Contradiz o senso comum e cria curiosidade imediata"
    }
  ],

  "progressao_sugerida": {
    "ato1_captura": {
      "gancho_principal": "Você se sente ocupado mas produtivo? A diferença é brutal.",
      "tensao_inicial": "A armadilha de tentar fazer tudo ao mesmo tempo",
      "promessa": "Existe um método simples que 10x sua produtividade real"
    },
    "ato2_desenvolvimento": [
      "O paradoxo da produtividade: mais tarefas = menos valor",
      "O dado que comprova: 47% listam 10+ tarefas e completam 0",
      "A Regra dos 3: máximo 3 projetos por vez",
      "Exemplo real: Empresa X aumentou conclusão em 400%",
      "Como aplicar: liste tudo, escolha 3, só abra novo ao fechar um"
    ],
    "ato3_resolucao": {
      "verdade_central": "A diferença entre quem quer e quem faz não é talento, é o método de execução",
      "call_to_action_natural": "Aplique a Regra dos 3 hoje: escolha 3 projetos e foque só neles"
    }
  },

  "perguntas_respondidas": [
    "Por que mais tarefas significam menos produtividade?",
    "Como escolher quais projetos priorizar?",
    "Qual o número ideal de tarefas simultâneas?"
  ],

  "avaliacao_pesquisa": {
    "qualidade_dados": "boa",
    "recomendacao": "Dados suficientes para criar carrossel com throughline claro"
  },

  "gaps_oportunidades": [
    "Gap ou oportunidade 1...",
    "Gap ou oportunidade 2..."
  ],

  "sources": [
    "https://url-fonte-1",
    "https://url-fonte-2"
  ]
}

Lembre-se: Se uma categoria não tiver dados na pesquisa, retorne array vazio [] e não invente conteúdo.`;
}
