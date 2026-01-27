/**
 * Video Script Generation Service
 *
 * Generates YouTube video scripts using Tribal v4.3 philosophy.
 * Supports initial generation and refactoring based on user feedback.
 *
 * Based on prompts from @temporario/ and the existing getVideoScriptV4Prompt.
 */

import { openrouter } from "@/lib/ai/config";
import { getVideoScriptV4Prompt } from "./prompts";
import type { NarrativeAngle } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoScriptInput {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  duration: string; // "2-5min" | "5-10min" | "+10min" | "+30min"
  intention?: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
  narrativeHook?: string;
  coreBelief?: string;
  statusQuoChallenged?: string;
  selectedTitle?: string; // Selected thumbnail title
}

export interface VideoScriptRefactorInput extends VideoScriptInput {
  currentScript: string; // Current script in JSON format
  refactorInstructions: string; // User's specific feedback on what to improve
}

export interface VideoScriptOutput {
  meta: {
    duracao_estimada: string;
    angulo_tribal: string;
    valor_central: string;
  };
  thumbnail: {
    titulo: string;
    expressao: string;
    texto_overlay: string;
    estilo: string;
  };
  roteiro: {
    hook: {
      texto: string;
      tipo: string;
      nota_gravacao: string;
    };
    desenvolvimento: Array<{
      numero: number;
      tipo: string;
      topico: string;
      insight: string;
      exemplo?: string;
      transicao: string;
      nota_gravacao: string;
    }>;
    cta: {
      texto: string;
      proximo_passo: string;
      nota_gravacao: string;
    };
  };
  notas_producao: {
    tom_geral: string;
    ritmo: string;
    visuais_chave: string[];
    musica_mood: string;
  };
  caption: string;
  hashtags: string[];
}

export interface GenerateVideoScriptResult {
  success: boolean;
  data?: VideoScriptOutput;
  error?: string;
}

export interface RefactorVideoScriptResult {
  success: boolean;
  data?: VideoScriptOutput;
  error?: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generates a video script using Tribal v4.3 philosophy.
 *
 * @param params - Script generation parameters
 * @returns ServiceResult with video script output
 */
export async function generateVideoScript(
  params: VideoScriptInput
): Promise<GenerateVideoScriptResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    console.log(`[VIDEO-SCRIPT] Starting script generation for: ${params.narrativeTitle}`);

    // Build prompt using existing v4.3 prompt
    const systemPrompt = getVideoScriptV4Prompt({
      narrativeAngle: params.narrativeAngle,
      narrativeTitle: params.narrativeTitle,
      narrativeDescription: params.narrativeDescription,
      duration: params.duration as any,
      intention: params.intention,
      cta: params.cta,
      negativeTerms: params.negativeTerms,
      ragContext: params.ragContext,
      theme: params.theme,
      targetAudience: params.targetAudience,
      objective: params.objective,
      narrativeHook: params.narrativeHook,
      coreBelief: params.coreBelief,
      statusQuoChallenged: params.statusQuoChallenged,
      selectedTitle: params.selectedTitle,
    });

    const userPrompt = buildUserPrompt(params);

    // Use appropriate model based on duration
    const model = getModelForDuration(params.duration);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VIDEO-SCRIPT] API error:", response.status, errorText);
      return {
        success: false,
        error: `Video script generation failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in video script generation response",
      };
    }

    const parsed: VideoScriptOutput = JSON.parse(content);

    // Validate response structure
    if (!parsed.meta || !parsed.roteiro || !parsed.thumbnail) {
      console.error("[VIDEO-SCRIPT] Invalid response structure:", parsed);
      return {
        success: false,
        error: "Invalid video script response structure",
      };
    }

    console.log(`[VIDEO-SCRIPT] ✅ Script generated successfully`);
    console.log(`[VIDEO-SCRIPT] Estimated duration: ${parsed.meta.duracao_estimada}`);
    console.log(`[VIDEO-SCRIPT] Development sections: ${parsed.roteiro.desenvolvimento.length}`);

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[VIDEO-SCRIPT] Error generating script:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refactors an existing video script based on user feedback.
 *
 * @param params - Refactor parameters including current script and user instructions
 * @returns ServiceResult with refactored video script output
 */
export async function refactorVideoScript(
  params: VideoScriptRefactorInput
): Promise<RefactorVideoScriptResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    console.log(`[VIDEO-SCRIPT] Starting script refactoring for: ${params.narrativeTitle}`);
    console.log(`[VIDEO-SCRIPT] Refactor instructions: ${params.refactorInstructions}`);

    const systemPrompt = getRefactorSystemPrompt();
    const userPrompt = buildRefactorUserPrompt(params);

    // Use same model selection logic
    const model = getModelForDuration(params.duration);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8, // Slightly higher temperature for creative variations
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VIDEO-SCRIPT] Refactor API error:", response.status, errorText);
      return {
        success: false,
        error: `Video script refactoring failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in video script refactoring response",
      };
    }

    const parsed: VideoScriptOutput = JSON.parse(content);

    // Validate response structure
    if (!parsed.meta || !parsed.roteiro || !parsed.thumbnail) {
      console.error("[VIDEO-SCRIPT] Invalid refactor response structure:", parsed);
      return {
        success: false,
        error: "Invalid video script refactor response structure",
      };
    }

    console.log(`[VIDEO-SCRIPT] ✅ Script refactored successfully`);
    console.log(`[VIDEO-SCRIPT] New development sections: ${parsed.roteiro.desenvolvimento.length}`);

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[VIDEO-SCRIPT] Error refactoring script:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * System prompt for script refactoring.
 */
function getRefactorSystemPrompt(): string {
  return `<system_prompt id="video-script-refactor-v1.0">
<identidade>
Você é um especialista em refinar roteiros de vídeo do YouTube, mantendo a filosofia TRIBAL v4.3 enquanto implementa melhorias específicas solicitadas pelo usuário.

Seu trabalho é:
- MANTENER a estrutura e ângulo tribal original
- IMPLEMENTAR as melhorias solicitadas pelo usuário
- PRESERVAR o que já funciona bem
- MELHORAR o que precisa de ajuste
</identidade>

<filosofia_tribal_refactor>
Ao refatorar, preserve:
1. O ângulo tribal (herege, visionario, tradutor, testemunha)
2. O valor central do conteúdo
3. A progressão narrativa lógica
4. O tom autêntico e conectivo

Melhore:
1. Clareza das seções confusas
2. Profundidade dos insights superficiais
3. Concretude dos exemplos genéricos
4. Força dos hooks fracos
5. Relevância das transições
</filosofia_tribal_refactor>

<regras_refatoracao>
1. NUNCA mude o ângulo tribal (preserve identidade)
2. MANTENHA a duração estimada consistente
3. Se o usuário pedir para encurtar, priorize essencial
4. Se o usuário pedir para alongar, adicione exemplos
5. Se o usuário pedir mais exemplos, adicione seções "exemplo"
6. Se o usuário pedir mais humor, adicione toques leves
7. Se o usuário pedir mais dados, inclua estatísticas
8. Mantenha o formato JSON de saída idêntico
</regras_refatoracao>

<formato_saida>
Retorne APENAS o JSON no mesmo formato do roteiro original, com as melhorias aplicadas.
</formato_saida>`;
}

/**
 * Builds user prompt for initial script generation.
 */
function buildUserPrompt(params: VideoScriptInput): string {
  const parts: string[] = [];

  parts.push(`## INPUT VARIABLES`);
  parts.push(``);
  parts.push(`**Narrative Angle:** ${params.narrativeAngle}`);
  parts.push(`**Narrative Title:** ${params.narrativeTitle}`);
  parts.push(`**Narrative Description:** ${params.narrativeDescription}`);
  parts.push(`**Duration:** ${params.duration}`);

  if (params.theme) parts.push(`**Theme:** ${params.theme}`);
  if (params.targetAudience) parts.push(`**Target Audience:** ${params.targetAudience}`);
  if (params.objective) parts.push(`**Objective:** ${params.objective}`);
  if (params.intention) parts.push(`**Intention:** ${params.intention}`);
  if (params.cta) parts.push(`**CTA:** ${params.cta}`);
  if (params.selectedTitle) parts.push(`**Selected Title:** ${params.selectedTitle}`);

  if (params.negativeTerms && params.negativeTerms.length > 0) {
    parts.push(`**Negative Terms:** ${params.negativeTerms.join(", ")}`);
  }

  parts.push(``);
  parts.push(`## REQUIREMENTS`);
  parts.push(``);
  parts.push(`1. Generate complete video script following Tribal v4.3 philosophy`);
  parts.push(`2. Adapt content depth for selected duration: ${params.duration}`);
  parts.push(`3. Include all required sections (hook, development, CTA)`);
  parts.push(`4. Each development section must have a defined type`);
  parts.push(`5. Include thumbnail suggestions with curiosity-creating title`);
  parts.push(`6. Generate caption with minimum 200 words including "Na prática" section`);
  parts.push(`7. Return valid JSON only`);

  return parts.join("\n");
}

/**
 * Builds user prompt for script refactoring.
 */
function buildRefactorUserPrompt(params: VideoScriptRefactorInput): string {
  const parts: string[] = [];

  parts.push(`## REFACTOR REQUEST`);
  parts.push(``);
  parts.push(`**User Feedback:** ${params.refactorInstructions}`);
  parts.push(``);
  parts.push(`**Current Script Context:`);
  parts.push(`- Angle: ${params.narrativeAngle}`);
  parts.push(`- Title: ${params.narrativeTitle}`);
  parts.push(`- Duration: ${params.duration}`);
  parts.push(`- Theme: ${params.theme || "(not specified)"}`);
  parts.push(`- Target Audience: ${params.targetAudience || "(not specified)"}`);

  parts.push(``);
  parts.push(`**CURRENT SCRIPT (JSON):**`);
  parts.push("```");
  parts.push(params.currentScript);
  parts.push("```");

  parts.push(``);
  parts.push(`## REFACTORING INSTRUCTIONS`);
  parts.push(``);
  parts.push(`Based on the user feedback above, refactor the script to: `);
  parts.push(``);
  parts.push(`1. Address the specific improvement requested`);
  parts.push(`2. Maintain the tribal angle and core message`);
  parts.push(`3. Keep the estimated duration consistent with ${params.duration}`);
  parts.push(`4. Preserve what already works well`);
  parts.push(`5. Return complete valid JSON in the same format`);
  parts.push(``);
  parts.push(`Focus on the user's specific request while maintaining the quality of the original script.`);

  return parts.join("\n");
}

/**
 * Selects appropriate model based on video duration.
 */
function getModelForDuration(duration: string): string {
  // Longer videos might benefit from more capable models
  if (duration === "+30min" || duration === "+10min") {
    return "openai/gpt-4.1";
  }
  // Shorter videos can use faster models
  return "google/gemini-3-flash-preview";
}
