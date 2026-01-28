/**
 * Voyage AI Embeddings
 *
 * Functions for generating embeddings using Voyage AI API.
 */

import type { VoyageEmbeddingResponse, VoyageModel } from "./types"
import { getVoyageClient, parseVoyageError, DEFAULT_MODEL } from "./index"

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @param model - Voyage model to use (default: voyage-4-large)
 * @returns Embedding vector (1024 dimensions for voyage-4-large)
 *
 * @example
 * ```ts
 * const embedding = await generateEmbedding("Hello world")
 * // embedding.length → 1024
 * ```
 */
export async function generateEmbedding(
  text: string,
  model: VoyageModel = DEFAULT_MODEL
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text")
  }

  const client = await getVoyageClient()

  const response = await fetch(`${client.baseURL}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${client.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model,
      output_dtype: "float",
    }),
  })

  if (!response.ok) {
    throw await parseVoyageError(response)
  }

  const data = (await response.json()) as VoyageEmbeddingResponse
  return data.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in a single request
 *
 * More efficient than calling generateEmbedding multiple times.
 *
 * @param texts - Array of texts to embed
 * @param model - Voyage model to use (default: voyage-4-large)
 * @returns Array of embedding vectors
 *
 * @example
 * ```ts
 * const embeddings = await generateEmbeddingsBatch([
 *   "First text",
 *   "Second text",
 *   "Third text"
 * ])
 * // embeddings.length → 3
 * // embeddings[0].length → 1024
 * ```
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  model: VoyageModel = DEFAULT_MODEL
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error("Cannot generate embeddings for empty array")
  }

  // Filter out empty texts
  const validTexts = texts.filter((t) => t && t.trim().length > 0)
  if (validTexts.length === 0) {
    throw new Error("Cannot generate embeddings for empty texts")
  }

  // Voyage supports up to 128 texts per request
  const BATCH_SIZE = 128
  const batches: string[][] = []

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    batches.push(validTexts.slice(i, i + BATCH_SIZE))
  }

  const client = await getVoyageClient()
  const allEmbeddings: number[][] = []

  for (const batch of batches) {
    const response = await fetch(`${client.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${client.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: batch,
        model,
        output_dtype: "float",
      }),
    })

    if (!response.ok) {
      throw await parseVoyageError(response)
    }

    const data = (await response.json()) as VoyageEmbeddingResponse
    allEmbeddings.push(...data.data.map((d) => d.embedding))
  }

  return allEmbeddings
}

/**
 * Estimate token count for a text (rough approximation)
 *
 * Voyage AI counts tokens differently than OpenAI.
 * This is a rough approximation: ~4 characters per token.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // Rough approximation: ~4 characters per token for English text
  // For accurate counting, you'd need a proper tokenizer
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to fit within model's context window
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens (default: 32000 for voyage-4-large)
 * @returns Truncated text
 */
export function truncateToTokens(text: string, maxTokens = 32000): string {
  const estimated = estimateTokens(text)
  if (estimated <= maxTokens) return text

  // Truncate to fit
  const targetLength = Math.floor((maxTokens / estimated) * text.length)
  return text.slice(0, targetLength)
}

/**
 * Calculate cost estimate for embeddings
 *
 * @param tokenCount - Number of tokens to embed
 * @param model - Voyage model used
 * @returns Estimated cost in USD
 *
 * Current pricing (as of 2025):
 * - voyage-4-large: $0.07 per 1M tokens
 * - voyage-4: $0.06 per 1M tokens
 */
export function estimateEmbeddingCost(
  tokenCount: number,
  model: VoyageModel = DEFAULT_MODEL
): number {
  const pricePerMillion = model === "voyage-4-large" ? 0.07 : 0.06
  return (tokenCount / 1_000_000) * pricePerMillion
}
