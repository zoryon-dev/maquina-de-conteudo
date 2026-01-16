/**
 * RAG Relevance Filters
 *
 * Functions for filtering and ranking chunks by relevance
 * to improve RAG context quality.
 */

import type { RagChunk, RelevanceFilterResult, RagCategory } from "./types"

/**
 * Filter configuration
 */
export interface FilterOptions {
  /**
   * Minimum similarity score (0-1)
   * @default 0.6
   */
  minScore?: number

  /**
   * Maximum chunks per document (prevents dominance)
   * @default 3
   */
  maxChunksPerDocument?: number

  /**
   * Minimum chunk length (characters)
   * @default 50
   */
  minChunkLength?: number

  /**
   * Whether to deduplicate similar chunks
   * @default true
   */
  deduplicate?: boolean

  /**
   * Similarity threshold for deduplication (0-1)
   * @default 0.95
   */
  deduplicationThreshold?: number

  /**
   * Categories to include
   * @default all categories
   */
  categories?: RagCategory[]

  /**
   * Boost scores for certain categories
   */
  categoryBoosts?: Record<RagCategory, number>
}

/**
 * Default filter options
 */
const DEFAULT_FILTERS: Required<Omit<FilterOptions, "categories" | "categoryBoosts">> = {
  minScore: 0.6,
  maxChunksPerDocument: 3,
  minChunkLength: 50,
  deduplicate: true,
  deduplicationThreshold: 0.95,
}

/**
 * Filter chunks by relevance score
 *
 * @param chunks - Chunks to filter
 * @param options - Filter options
 * @returns Filtered chunks with filter results
 *
 * @example
 * ```ts
 * const filtered = filterByRelevance(chunks, {
 *   minScore: 0.7,
 *   maxChunksPerDocument: 2
 * })
 * ```
 */
export function filterByRelevance(
  chunks: RagChunk[],
  options: FilterOptions = {}
): RagChunk[] {
  const opts = { ...DEFAULT_FILTERS, ...options }

  let filtered = [...chunks]

  // Filter by minimum score
  if (opts.minScore > 0) {
    filtered = filtered.filter((c) => c.score >= opts.minScore)
  }

  // Filter by minimum length
  if (opts.minChunkLength > 0) {
    filtered = filtered.filter((c) => c.text.length >= opts.minChunkLength)
  }

  // Filter by categories if specified
  if (opts.categories && opts.categories.length > 0) {
    filtered = filtered.filter((c) => opts.categories!.includes(c.category as RagCategory))
  }

  // Apply category boosts
  if (opts.categoryBoosts) {
    filtered = filtered.map((chunk) => {
      const boost = opts.categoryBoosts![chunk.category as RagCategory] ?? 1
      return {
        ...chunk,
        score: Math.min(1, chunk.score * boost),
      }
    })
    // Re-sort after boosting
    filtered.sort((a, b) => b.score - a.score)
  }

  // Limit chunks per document
  if (opts.maxChunksPerDocument > 0) {
    filtered = limitChunksPerDocument(filtered, opts.maxChunksPerDocument)
  }

  // Deduplicate similar chunks
  if (opts.deduplicate) {
    filtered = deduplicateChunks(filtered, opts.deduplicationThreshold)
  }

  return filtered
}

/**
 * Limit number of chunks per document
 *
 * Prevents a single document from dominating the context
 * by keeping only the top N chunks per document.
 *
 * @param chunks - Chunks to limit (sorted by score)
 * @param maxPerDoc - Maximum chunks per document
 * @returns Chunks with per-document limit applied
 *
 * @example
 * ```ts
 * const limited = limitChunksPerDocument(chunks, 3)
 * ```
 */
export function limitChunksPerDocument(
  chunks: RagChunk[],
  maxPerDoc: number
): RagChunk[] {
  const docChunks = new Map<number, RagChunk[]>()

  // Group by document
  for (const chunk of chunks) {
    if (!docChunks.has(chunk.documentId)) {
      docChunks.set(chunk.documentId, [])
    }
    const docList = docChunks.get(chunk.documentId)!
    if (docList.length < maxPerDoc) {
      docList.push(chunk)
    }
  }

  // Flatten back to array, preserving order
  const result: RagChunk[] = []
  const seen = new Set<number>()

  for (const chunk of chunks) {
    if (!seen.has(chunk.documentId)) {
      seen.add(chunk.documentId)
      result.push(...(docChunks.get(chunk.documentId) || []))
    }
  }

  return result
}

/**
 * Deduplicate similar chunks
 *
 * Removes chunks that are very similar to each other
 * to avoid redundant context.
 *
 * @param chunks - Chunks to deduplicate (sorted by score)
 * @param threshold - Similarity threshold for deduplication
 * @returns Deduplicated chunks
 *
 * @example
 * ```ts
 * const unique = deduplicateChunks(chunks, 0.95)
 * ```
 */
export function deduplicateChunks(
  chunks: RagChunk[],
  threshold: number
): RagChunk[] {
  if (chunks.length <= 1) return chunks

  const unique: RagChunk[] = [chunks[0]]
  const uniqueTexts = [chunks[0].text.toLowerCase()]

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i]
    const text = chunk.text.toLowerCase()

    // Check against all unique chunks
    let isDuplicate = false
    for (const uniqueText of uniqueTexts) {
      const similarity = calculateTextSimilarity(text, uniqueText)
      if (similarity >= threshold) {
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      unique.push(chunk)
      uniqueTexts.push(text)
    }
  }

  return unique
}

/**
 * Calculate text similarity using Jaccard similarity
 *
 * Measures overlap of words between two texts.
 *
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 *
 * @example
 * ```ts
 * const similarity = calculateTextSimilarity(
 *   "hello world",
 *   "hello world again"
 * )
 * console.log(similarity) // ~0.67
 * ```
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  // Tokenize into words
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  // Jaccard similarity: intersection / union
  const intersection = new Set([...words1].filter((x) => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Validate chunk for RAG use
 *
 * Checks if a chunk meets quality criteria.
 *
 * @param chunk - Chunk to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```ts
 * const result = validateChunk(chunk, { minScore: 0.7 })
 * if (!result.passed) {
 *   console.log(result.reason) // "Score below threshold"
 * }
 * ```
 */
export function validateChunk(
  chunk: RagChunk,
  options: FilterOptions = {}
): RelevanceFilterResult {
  const opts = { ...DEFAULT_FILTERS, ...options }

  // Check score
  if (opts.minScore > 0 && chunk.score < opts.minScore) {
    return {
      passed: false,
      reason: `Score ${chunk.score.toFixed(2)} below threshold ${opts.minScore}`,
    }
  }

  // Check length
  if (opts.minChunkLength > 0 && chunk.text.length < opts.minChunkLength) {
    return {
      passed: false,
      reason: `Chunk length ${chunk.text.length} below minimum ${opts.minChunkLength}`,
    }
  }

  // Check category
  if (opts.categories && opts.categories.length > 0) {
    if (!opts.categories.includes(chunk.category as RagCategory)) {
      return {
        passed: false,
        reason: `Category '${chunk.category}' not in allowed categories`,
      }
    }
  }

  return { passed: true }
}

/**
 * Boost chunks by recency
 *
 * Increases scores for more recently updated documents.
 *
 * @param chunks - Chunks to boost
 * @param lastEmbeddedAtMap - Map of document ID to last embedded date
 * @param decayFactor - How much to decay per day (0-1)
 * @returns Chunks with boosted scores
 *
 * @example
 * ```ts
 * const boosted = boostByRecency(chunks, lastEmbeddedMap, 0.01)
 * ```
 */
export function boostByRecency<T extends RagChunk>(
  chunks: T[],
  lastEmbeddedAtMap: Map<number, Date>,
  decayFactor = 0.01 // 1% decay per day
): T[] {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  return chunks.map((chunk) => {
    const lastEmbedded = lastEmbeddedAtMap.get(chunk.documentId)
    if (!lastEmbedded) return chunk

    const daysSinceUpdate = (now - lastEmbedded.getTime()) / oneDay
    const boost = Math.max(0.5, 1 - daysSinceUpdate * decayFactor)

    return {
      ...chunk,
      score: Math.min(1, chunk.score * boost),
    }
  })
}

/**
 * Diversify chunk selection
 *
 * Ensures representation from multiple documents
 * rather than just the top-scoring document.
 *
 * @param chunks - Chunks sorted by score
 * @param minDocuments - Minimum unique documents to include
 * @returns Diversified chunks
 *
 * @example
 * ```ts
 * const diversified = diversifyChunks(chunks, 3)
 * // Ensures at least 3 different documents are represented
 * ```
 */
export function diversifyChunks<T extends RagChunk>(
  chunks: T[],
  minDocuments: number
): T[] {
  if (chunks.length === 0) return chunks

  const result: T[] = []
  const docCount = new Map<number, number>()
  let uniqueDocs = 0

  // First pass: take top chunks until we have minDocuments
  for (const chunk of chunks) {
    if (!docCount.has(chunk.documentId)) {
      docCount.set(chunk.documentId, 0)
      uniqueDocs++
    }

    docCount.set(chunk.documentId, (docCount.get(chunk.documentId) || 0) + 1)
    result.push(chunk)

    if (uniqueDocs >= minDocuments && result.length >= minDocuments * 2) {
      break
    }
  }

  return result
}
