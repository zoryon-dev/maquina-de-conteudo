/**
 * Article Wizard — LLM Utility
 *
 * Shared LLM call helper for all article services.
 * Follows the same pattern as wizard-services/llm.service.ts.
 */

import { generateText } from "ai";
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config";

const MAX_RETRIES = 2;
const ARTICLE_DEFAULT_MODEL = process.env.ARTICLE_DEFAULT_MODEL || DEFAULT_TEXT_MODEL;

export function getArticleModel(userModel?: string): string {
  return userModel || ARTICLE_DEFAULT_MODEL;
}

export type ArticlePipelineStep = "research" | "outline" | "production" | "optimization" | "image";

interface ModelConfig {
  default?: string;
  research?: string;
  outline?: string;
  production?: string;
  optimization?: string;
  image?: string;
}

/**
 * Resolves the model to use for a given pipeline step.
 * Fallback chain: modelConfig[step] → modelConfig.default → article.model → env default
 */
export function getModelForStep(
  modelConfig: ModelConfig | null | undefined,
  articleModel: string | null | undefined,
  step: ArticlePipelineStep,
): string {
  return modelConfig?.[step] ?? modelConfig?.default ?? articleModel ?? ARTICLE_DEFAULT_MODEL;
}

export async function articleLlmCall(params: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}): Promise<string> {
  return llmCallWithRetry(
    params.model,
    params.systemPrompt,
    params.userMessage,
    MAX_RETRIES,
    0,
    params.temperature ?? 0.5,
  );
}

async function llmCallWithRetry(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxRetries: number,
  attempt: number,
  temperature: number,
): Promise<string> {
  if (!openrouter) {
    throw new Error("OpenRouter not configured. Set OPENROUTER_API_KEY.");
  }

  try {
    const result = await generateText({
      model: openrouter(model),
      system: systemPrompt,
      prompt: userMessage,
      temperature,
    });

    if (!result.text || result.text.trim().length === 0) {
      console.error(`[Article LLM] Empty response from ${model} (attempt ${attempt + 1})`);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return llmCallWithRetry(model, systemPrompt, userMessage, maxRetries, attempt + 1, temperature);
      }
      throw new Error(`LLM returned empty response after ${attempt + 1} attempts. Model: ${model}.`);
    }

    return result.text;
  } catch (error) {
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[Article LLM] Retry ${attempt + 1}/${maxRetries} after error:`, error instanceof Error ? error.message : error);
      await new Promise((r) => setTimeout(r, delay));
      return llmCallWithRetry(model, systemPrompt, userMessage, maxRetries, attempt + 1, temperature);
    }
    throw error;
  }
}
