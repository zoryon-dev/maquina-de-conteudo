/**
 * RAG Context Assembler
 *
 * Main orchestration for assembling RAG context from
 * semantic search results for LLM prompts.
 */

import { db } from "@/db"
import { documents, documentEmbeddings } from "@/db/schema"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { semanticSearch, hybridSearch } from "@/lib/voyage/search"
import type {
  RagChunk,
  RagContextOptions,
  RagContextResult,
  RagSource,
  RagCategory,
} from "./types"
import {
  estimateTokens,
  selectChunksWithinBudget,
  estimateContextOverhead,
} from "./token-budget"
import { filterByRelevance, diversifyChunks } from "./filters"

/**
 * Default RAG options
 */
const DEFAULT_RAG_OPTIONS: Required<
  Omit<RagContextOptions, "categories" | "hybrid" | "semanticWeight" | "keywordWeight">
> = {
  threshold: 0.6,
  maxChunks: 10,
  maxTokens: 4000,
  includeSources: true,
}

/**
 * Assemble RAG context for a query
 *
 * This is the main entry point for RAG context assembly.
 * It performs semantic search, filters results, and formats
 * the context for inclusion in an LLM prompt.
 *
 * @param userId - User ID for authorization
 * @param query - Search query
 * @param options - RAG context options
 * @returns Assembled context with metadata
 *
 * @example
 * ```ts
 * const { context, sources, tokensUsed } = await assembleRagContext(
 *   userId,
 *   "What is our brand voice?",
 *   { categories: ["brand"], maxTokens: 3000 }
 * )
 * ```
 */
export async function assembleRagContext(
  userId: string,
  query: string,
  options: RagContextOptions = {}
): Promise<RagContextResult> {
  const opts = { ...DEFAULT_RAG_OPTIONS, ...options }

  // Perform search (semantic or hybrid)
  const searchResults = opts.hybrid
    ? await hybridSearch(userId, query, {
        categories: opts.categories,
        threshold: opts.threshold,
        limit: opts.maxChunks * 2, // Get more to filter
        semanticWeight: opts.semanticWeight ?? 0.7,
        keywordWeight: opts.keywordWeight ?? 0.3,
      })
    : await semanticSearch(userId, query, {
        categories: opts.categories,
        threshold: opts.threshold,
        limit: opts.maxChunks * 2,
      })

  if (searchResults.length === 0) {
    return {
      context: "",
      sources: [],
      tokensUsed: 0,
      chunksIncluded: 0,
      truncated: false,
    }
  }

  // Convert to RagChunk format
  const chunks: RagChunk[] = searchResults.map((r) => ({
    text: r.text,
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    chunkIndex: r.chunkIndex,
    score: r.score,
    category: r.category,
    startPosition: r.startPosition,
    endPosition: r.endPosition,
    estimatedTokens: estimateTokens(r.text),
  }))

  // Filter and diversify
  const filtered = filterByRelevance(chunks, {
    minScore: opts.threshold,
    maxChunksPerDocument: 3,
    deduplicate: true,
    categories: opts.categories,
  })

  const diversified = diversifyChunks(filtered, Math.min(3, filtered.length))

  // Select chunks within token budget
  const overhead = estimateContextOverhead(
    Math.min(opts.maxChunks, diversified.length),
    opts.includeSources
  )
  const availableTokens = opts.maxTokens - overhead

  const selectedChunks = selectChunksWithinBudget(diversified, availableTokens)

  // Build context string
  const contextParts = selectedChunks.map(
    (chunk) =>
      `[${chunk.documentTitle} (${chunk.category})]\n${chunk.text}`
  )

  let context = contextParts.join("\n\n---\n\n")

  // Check if truncated
  const totalTokens = estimateTokens(context)
  const truncated = selectedChunks.length < diversified.length

  // Assemble sources
  const sources = assembleSources(selectedChunks, opts.includeSources)

  return {
    context,
    sources,
    tokensUsed: totalTokens,
    chunksIncluded: selectedChunks.length,
    truncated,
  }
}

/**
 * Assemble sources list from chunks
 *
 * Groups chunks by document for source citation.
 *
 * @param chunks - Selected chunks
 * @param includeSources - Whether to include sources
 * @returns Source list
 *
 * @example
 * ```ts
 * const sources = assembleSources(chunks, true)
 * // [{ id: 1, title: "Brand Guide", score: 0.85, chunkCount: 2 }]
 * ```
 */
function assembleSources(
  chunks: RagChunk[],
  includeSources: boolean
): RagSource[] {
  if (!includeSources || chunks.length === 0) {
    return []
  }

  const sourceMap = new Map<number, RagSource>()

  for (const chunk of chunks) {
    const existing = sourceMap.get(chunk.documentId)

    if (existing) {
      existing.chunkCount++
      existing.score = Math.max(existing.score, chunk.score)
    } else {
      sourceMap.set(chunk.documentId, {
        id: chunk.documentId,
        title: chunk.documentTitle,
        category: chunk.category,
        score: chunk.score,
        chunkCount: 1,
      })
    }
  }

  return Array.from(sourceMap.values()).sort((a, b) => b.score - a.score)
}

/**
 * Build RAG prompt with context
 *
 * Formats the assembled context into a prompt template
 * for inclusion in an LLM request.
 *
 * @param context - Assembled context
 * @param query - Original query
 * @param sources - Source references
 * @returns Formatted prompt string
 *
 * @example
 * ```ts
 * const prompt = buildRagPrompt(context, query, sources)
 * // "Use the following context to answer the query...\n\n[Context]\n..."
 * ```
 */
export function buildRagPrompt(
  context: string,
  query: string,
  sources: RagSource[] = []
): string {
  const parts: string[] = []

  // System instruction
  parts.push(
    "Use the following context from the user's documents to answer their query."
  )

  if (sources.length > 0) {
    parts.push(
      `Cite your sources using the document titles provided. ` +
      `The following ${sources.length} document(s) were used:`
    )
    for (const source of sources) {
      parts.push(`  - ${source.title} (${source.category})`)
    }
  }

  parts.push("")
  parts.push("**Context**")
  parts.push("---")
  parts.push(context || "(No relevant context found)")
  parts.push("---")
  parts.push("")
  parts.push("**Query**")
  parts.push(query)

  return parts.join("\n")
}

/**
 * Get relevant documents with metadata
 *
 * Returns document information for chunks that would be
 * included in RAG context (useful for UI preview).
 *
 * @param userId - User ID
 * @param query - Search query
 * @param options - Search options
 * @returns Document metadata
 *
 * @example
 * ```ts
 * const docs = await getRelevantDocuments(userId, query, {
 *   categories: ["brand"],
 *   limit: 5
 * })
 * ```
 */
export async function getRelevantDocuments(
  userId: string,
  query: string,
  options: RagContextOptions = {}
): Promise<Array<{ id: number; title: string; category: string; score: number }>> {
  const results = await semanticSearch(userId, query, {
    categories: options.categories,
    threshold: options.threshold ?? 0.6,
    limit: options.maxChunks ?? 10,
  })

  // Group by document, keeping highest score
  const docMap = new Map<
    number,
    { id: number; title: string; category: string; score: number }
  >()

  for (const result of results) {
    const existing = docMap.get(result.documentId)
    if (!existing || result.score > existing.score) {
      docMap.set(result.documentId, {
        id: result.documentId,
        title: result.documentTitle,
        category: result.category,
        score: result.score,
      })
    }
  }

  return Array.from(docMap.values()).sort((a, b) => b.score - a.score)
}

/**
 * Check if RAG is available for user
 *
 * Verifies that the user has embedded documents available.
 *
 * @param userId - User ID to check
 * @param categories - Optional categories to check
 * @returns true if RAG context is available
 *
 * @example
 * ```ts
 * const hasRag = await isRagAvailable(userId, ["brand", "products"])
 * ```
 */
export async function isRagAvailable(
  userId: string,
  categories?: RagCategory[]
): Promise<boolean> {
  const conditions = [
    eq(documents.userId, userId),
    eq(documents.embedded, true),
    isNull(documents.deletedAt),
  ]

  if (categories && categories.length > 0) {
    conditions.push(inArray(documents.category, [...categories]))
  }

  const [result] = await db
    .select({ count: documents.id })
    .from(documents)
    .where(and(...conditions))
    .limit(1)

  return !!result
}

/**
 * Get RAG statistics for a user
 *
 * Returns counts and metadata about RAG capability.
 *
 * @param userId - User ID
 * @returns RAG statistics
 *
 * @example
 * ```ts
 * const stats = await getRagStats(userId)
 * console.log(stats.totalDocuments) // 15
 * console.log(stats.totalChunks) // 234
 * ```
 */
export async function getRagStats(userId: string): Promise<{
  totalDocuments: number
  totalChunks: number
  documentsByCategory: Record<string, number>
  hasEmbeddedDocuments: boolean
}> {
  const docs = await db
    .select({
      id: documents.id,
      category: documents.category,
      chunksCount: documents.chunksCount,
      embedded: documents.embedded,
    })
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))

  const totalDocuments = docs.length
  const totalChunks = docs.reduce((sum, doc) => sum + (doc.chunksCount || 0), 0)
  const documentsByCategory: Record<string, number> = {}
  const hasEmbeddedDocuments = docs.some((doc) => doc.embedded)

  for (const doc of docs) {
    const cat = doc.category ?? "general"
    documentsByCategory[cat] = (documentsByCategory[cat] || 0) + 1
  }

  return {
    totalDocuments,
    totalChunks,
    documentsByCategory,
    hasEmbeddedDocuments,
  }
}

/**
 * Get chunk text by position
 *
 * Retrieves a specific chunk for display or reference.
 *
 * @param userId - User ID for authorization
 * @param documentId - Document ID
 * @param chunkIndex - Chunk index
 * @returns Chunk text or null
 *
 * @example
 * ```ts
 * const text = await getChunkText(userId, docId, 0)
 * ```
 */
export async function getChunkText(
  userId: string,
  documentId: number,
  chunkIndex: number
): Promise<string | null> {
  const [chunk] = await db
    .select({ chunkText: documentEmbeddings.chunkText })
    .from(documentEmbeddings)
    .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
    .where(
      and(
        eq(documents.userId, userId),
        eq(documentEmbeddings.documentId, documentId),
        eq(documentEmbeddings.chunkIndex, chunkIndex)
      )
    )
    .limit(1)

  return chunk?.chunkText ?? null
}

/**
 * Get all chunks for a document
 *
 * Returns all chunks for a specific document,
 * ordered by chunk index.
 *
 * @param userId - User ID for authorization
 * @param documentId - Document ID
 * @returns Array of chunks
 *
 * @example
 * ```ts
 * const chunks = await getDocumentChunks(userId, docId)
 * ```
 */
export async function getDocumentChunks(
  userId: string,
  documentId: number
): Promise<
  Array<{ index: number; text: string; startPos: number | null; endPos: number | null }>
> {
  const chunks = await db
    .select({
      index: documentEmbeddings.chunkIndex,
      text: documentEmbeddings.chunkText,
      startPos: documentEmbeddings.startPos,
      endPos: documentEmbeddings.endPos,
    })
    .from(documentEmbeddings)
    .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
    .where(
      and(
        eq(documents.userId, userId),
        eq(documentEmbeddings.documentId, documentId)
      )
    )
    .orderBy(documentEmbeddings.chunkIndex)

  return chunks.map((c) => ({
    index: c.index ?? 0,
    text: c.text ?? "",
    startPos: c.startPos,
    endPos: c.endPos,
  }))
}
