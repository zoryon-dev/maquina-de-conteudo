/**
 * Research Planner Service
 *
 * Generates 7 strategic research queries in 3 layers using the v2.0 methodology.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses LLM with structured JSON output to generate research queries
 * - Queries organized in 3 layers: foundation, depth, differentiation
 * - Each query has metadata: intent, layer, priority, language
 * - Integrates with Tavily search for multi-query execution
 */

import { generateText } from "ai";
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config";
import { getResearchPlannerPrompt } from "./prompts";
import type { ServiceResult } from "./types";
import type { ResearchPlannerOutput } from "./synthesis-types";

const RESEARCH_PLANNER_MODEL = DEFAULT_TEXT_MODEL; // openai/gpt-4.1-mini
const MAX_RETRIES = 2;

/**
 * JSON Schema for Research Planner output validation.
 * Ensures the LLM returns exactly the structure we need.
 */
const RESEARCH_PLANNER_SCHEMA = {
  type: "object",
  properties: {
    schema_version: { type: "string", const: "2.0" },
    topic: { type: "string" },
    niche: { type: "string" },
    objective: { type: "string" },
    tone: { type: "string" },
    style: { type: "string" },
    time_window_days: { type: "number" },
    locale: { type: "string" },
    queries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          lang: { type: "string" },
          intent: {
            type: "string",
            enum: ["overview", "howto", "examples", "metrics", "risks", "tools", "compliance", "trends", "contrarian"]
          },
          layer: {
            type: "string",
            enum: ["foundation", "depth", "differentiation"]
          },
          priority: { type: "number" }
        },
        required: ["q", "lang", "intent", "layer", "priority"]
      }
    },
    prefer_domains: { type: "array", items: { type: "string" } },
    avoid_domains: { type: "array", items: { type: "string" } },
    must_include: { type: "array", items: { type: "string" } },
    must_avoid: { type: "array", items: { type: "string" } },
    research_focus: { type: "string" }
  },
  required: [
    "schema_version",
    "topic",
    "niche",
    "objective",
    "tone",
    "style",
    "time_window_days",
    "locale",
    "queries",
    "prefer_domains",
    "avoid_domains",
    "must_include",
    "must_avoid",
    "research_focus"
  ]
};

/**
 * Input parameters for Research Planner query generation.
 */
export interface ResearchPlannerInput {
  /** Main topic/theme for the content */
  theme: string;

  /** Specific niche or industry */
  niche?: string;

  /** Content objective/goal */
  objective?: string;

  /** Desired tone */
  tone?: string;

  /** Content style */
  style?: string;

  /** Number of slides for carousel (affects query depth) */
  numberOfSlides?: number;

  /** Call-to-action */
  cta?: string;

  /** Target audience */
  targetAudience?: string;
}

/**
 * Generates 7 strategic research queries using the Research Planner v2.0 methodology.
 *
 * @param input - Research parameters from wizard
 * @returns Structured research plan with 7 queries in 3 layers
 *
 * @example
 * ```ts
 * const result = await generateResearchQueries({
 *   theme: "productivity",
 *   objective: "increase daily output",
 *   numberOfSlides: 10
 * });
 *
 * if (result.success) {
 *   console.log(result.data.queries); // 7 queries
 * }
 * ```
 */
export async function generateResearchQueries(
  input: ResearchPlannerInput
): Promise<ServiceResult<ResearchPlannerOutput>> {
  // ==============================================================================
  // RESEARCH PLANNER: INICIANDO GERAÇÃO DE QUERIES
  // ==============================================================================
  console.log(`[RESEARCH-PLANNER] START - theme: ${input.theme}, objective: ${input.objective || "(none)"}`);

  if (!openrouter) {
    return {
      success: false,
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY.",
    };
  }

  try {
    // Build the prompt with all available context
    const systemPrompt = getResearchPlannerPrompt({
      theme: input.theme,
      niche: input.niche,
      objective: input.objective,
      tone: input.tone,
      style: input.style,
      numberOfSlides: input.numberOfSlides,
      cta: input.cta,
      targetAudience: input.targetAudience,
    });

    // Call LLM with structured output
    const result = await llmCallWithRetry(
      systemPrompt,
      "Generate 7 strategic research queries in 3 layers.",
      MAX_RETRIES
    );

    console.log(`[RESEARCH-PLANNER] LLM response received, parsing JSON...`);

    // Parse and validate response
    const parsed = extractJSONFromResponse(result);

    if (!parsed || !parsed.queries || !Array.isArray(parsed.queries)) {
      console.error(`[RESEARCH-PLANNER] Invalid response structure:`, parsed);
      return {
        success: false,
        error: "Invalid LLM response: missing or invalid queries array",
      };
    }

    // Validate query count (should be 7)
    if (parsed.queries.length !== 7) {
      console.warn(`[RESEARCH-PLANNER] Warning: Expected 7 queries, got ${parsed.queries.length}`);
    }

    // Log the generated queries for debugging
    console.log(`[RESEARCH-PLANNER] Generated ${parsed.queries.length} queries:`);
    parsed.queries.forEach((q: any, i: number) => {
      console.log(`  [${i + 1}] ${q.layer} - ${q.intent}: "${q.q}" (priority: ${q.priority})`);
    });

    return {
      success: true,
      data: parsed as ResearchPlannerOutput,
    };
  } catch (error) {
    console.error(`[RESEARCH-PLANNER] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate research queries",
    };
  }
}

/**
 * LLM call with retry logic and structured output.
 */
async function llmCallWithRetry(
  systemPrompt: string,
  userMessage: string,
  maxRetries: number,
  attempt: number = 0
): Promise<string> {
  try {
    const result = await generateText({
      model: openrouter!(RESEARCH_PLANNER_MODEL),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.5, // Lower temperature for more consistent structured output
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

    return llmCallWithRetry(systemPrompt, userMessage, maxRetries, attempt + 1);
  }
}

/**
 * Extracts JSON from LLM response, handling markdown code blocks.
 */
function extractJSONFromResponse(response: string): any {
  // Try direct parse first
  try {
    return JSON.parse(response);
  } catch {}

  // Try extracting from markdown code block
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  // Try extracting just the JSON object (first { to last })
  const objectMatch = response.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  return null;
}

/**
 * Check if Research Planner service is available.
 */
export function isResearchPlannerAvailable(): boolean {
  return !!openrouter;
}

/**
 * Get the default model used for Research Planner.
 */
export function getResearchPlannerModel(): string {
  return RESEARCH_PLANNER_MODEL;
}
