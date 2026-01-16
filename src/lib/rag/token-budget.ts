/**
 * Token Budget Management
 *
 * Utilities for calculating and managing token budgets
 * for RAG context assembly.
 */

import type { TokenBudget } from "./types"
import { DEFAULT_TOKEN_BUDGETS } from "./types"

/**
 * Rough character-to-token ratio for estimation
 * English text is typically ~4 characters per token
 * Brazilian Portuguese is similar, may vary slightly
 */
const CHARS_PER_TOKEN = 4

/**
 * Estimate token count for text
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * ```ts
 * const tokens = estimateTokens("Hello world")
 * console.log(tokens) // ~3
 * ```
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Get token budget for a model
 *
 * @param model - Model identifier
 * @param customTotal - Optional custom total budget
 * @returns Token budget allocation
 *
 * @example
 * ```ts
 * const budget = getTokenBudget("claude-opus-4")
 * console.log(budget.context) // 16000
 * ```
 */
export function getTokenBudget(
  model: string,
  customTotal?: number
): TokenBudget {
  const defaultBudget = DEFAULT_TOKEN_BUDGETS[model] || DEFAULT_TOKEN_BUDGETS["voyage-4-large"]

  if (customTotal) {
    const ratio = customTotal / defaultBudget.total
    return {
      total: customTotal,
      system: Math.floor(defaultBudget.system * ratio),
      context: Math.floor(defaultBudget.context * ratio),
      response: Math.floor(defaultBudget.response * ratio),
      reserved: Math.floor(defaultBudget.reserved * ratio),
    }
  }

  return defaultBudget
}

/**
 * Calculate available context tokens from total budget
 *
 * Subtracts system prompt and response reservation from total.
 *
 * @param budget - Token budget
 * @returns Available tokens for context
 *
 * @example
 * ```ts
 * const budget = getTokenBudget("claude-opus-4")
 * const available = getAvailableContextTokens(budget)
 * console.log(available) // ~16000
 * ```
 */
export function getAvailableContextTokens(budget: TokenBudget): number {
  return budget.total - budget.system - budget.response - budget.reserved
}

/**
 * Calculate how many chunks fit in token budget
 *
 * @param chunks - Chunks to consider
 * @param maxTokens - Maximum tokens available
 * @returns Number of chunks that fit
 *
 * @example
 * ```ts
 * const count = countChunksThatFit(chunks, 4000)
 * console.log(count) // 5
 * ```
 */
export function countChunksThatFit(
  chunks: Array<{ estimatedTokens?: number; text: string }>,
  maxTokens: number
): number {
  let totalTokens = 0
  let count = 0

  for (const chunk of chunks) {
    const tokens = chunk.estimatedTokens ?? estimateTokens(chunk.text)
    if (totalTokens + tokens > maxTokens) {
      break
    }
    totalTokens += tokens
    count++
  }

  return count
}

/**
 * Select chunks that fit within token budget
 *
 * Prioritizes higher-scored chunks, then fits as many as possible.
 *
 * @param chunks - Chunks sorted by score (descending)
 * @param maxTokens - Maximum tokens available
 * @returns Chunks that fit within budget
 *
 * @example
 * ```ts
 * const selected = selectChunksWithinBudget(chunks, 4000)
 * console.log(selected.length) // Number of chunks that fit
 * ```
 */
export function selectChunksWithinBudget<T extends { estimatedTokens?: number; text: string }>(
  chunks: T[],
  maxTokens: number
): T[] {
  const selected: T[] = []
  let totalTokens = 0

  for (const chunk of chunks) {
    const tokens = chunk.estimatedTokens ?? estimateTokens(chunk.text)
    if (totalTokens + tokens > maxTokens) {
      break
    }
    selected.push(chunk)
    totalTokens += tokens
  }

  return selected
}

/**
 * Truncate context to fit within token limit
 *
 * If context exceeds limit, truncates from the end while
 * preserving complete chunks.
 *
 * @param context - Full context string
 * @param maxTokens - Maximum tokens allowed
 * @returns Truncated context
 *
 * @example
 * ```ts
 * const truncated = truncateContextToFit(largeContext, 4000)
 * ```
 */
export function truncateContextToFit(context: string, maxTokens: number): string {
  const currentTokens = estimateTokens(context)
  if (currentTokens <= maxTokens) {
    return context
  }

  // Calculate target length
  const targetLength = Math.floor((maxTokens / currentTokens) * context.length)

  // Try to truncate at a chunk boundary
  const chunkBoundary = context.lastIndexOf("\n\n---", targetLength)
  if (chunkBoundary > targetLength * 0.8) {
    return context.slice(0, chunkBoundary).trim()
  }

  return context.slice(0, targetLength).trim()
}

/**
 * Format token count for display
 *
 * @param count - Token count
 * @returns Formatted string (e.g., "1.2k", "345")
 *
 * @example
 * ```ts
 * console.log(formatTokenCount(1234)) // "1.2k"
 * console.log(formatTokenCount(456))  // "456"
 * ```
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

/**
 * Calculate context overhead from formatting
 *
 * Accounts for separators, headers, metadata in RAG output.
 *
 * @param chunkCount - Number of chunks being assembled
 * @param includeSources - Whether source references are included
 * @returns Estimated overhead tokens
 *
 * @example
 * ```ts
 * const overhead = estimateContextOverhead(5, true)
 * console.log(overhead) // ~200 tokens
 * ```
 */
export function estimateContextOverhead(
  chunkCount: number,
  includeSources: boolean
): number {
  let overhead = 0

  // Separator between chunks: "\n\n---\n\n" ≈ 8 tokens each
  overhead += (chunkCount - 1) * 8

  // Chunk headers: "[Title (category)]\n" ≈ 10 tokens each
  overhead += chunkCount * 10

  // Source references
  if (includeSources) {
    // ~50 tokens for sources section
    overhead += 50
  }

  return overhead
}
