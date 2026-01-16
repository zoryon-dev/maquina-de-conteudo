/**
 * Semantic Search
 *
 * Functions for searching documents using cosine similarity
 * on Voyage AI embeddings.
 */

import { db } from "@/db"
import { documents, documentEmbeddings } from "@/db/schema"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { generateEmbedding } from "./embeddings"
import type { SemanticSearchResult, SemanticSearchOptions } from "./types"

/**
 * Document categories available for filtering
 */
export const DOCUMENT_CATEGORIES = [
  "general",
  "products",
  "offers",
  "brand",
  "audience",
  "competitors",
  "content",
] as const

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1
 *
 * @example
 * ```ts
 * const score = cosineSimilarity([1, 2, 3], [4, 5, 6])
 * console.log(score) // ~0.97
 * ```
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} !== ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Perform semantic search on user's documents
 *
 * @param userId - User ID
 * @param query - Search query text
 * @param options - Search options
 * @returns Ranked search results with similarity scores
 *
 * @example
 * ```ts
 * const results = await semanticSearch(userId, "marketing strategy", {
 *   categories: ["brand", "content"],
 *   threshold: 0.75,
 *   limit: 5
 * })
 * ```
 */
export async function semanticSearch(
  userId: string,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const {
    categories = DOCUMENT_CATEGORIES,
    threshold = 0.7,
    limit = 10,
    includeText = true,
  } = options

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Get all embeddings for user's documents in specified categories
  const results = await db
    .select({
      embedding: documentEmbeddings.embedding,
      chunkText: documentEmbeddings.chunkText,
      chunkIndex: documentEmbeddings.chunkIndex,
      documentId: documentEmbeddings.documentId,
      documentTitle: documents.title,
      category: documents.category,
      startPosition: documentEmbeddings.startPos,
      endPosition: documentEmbeddings.endPos,
    })
    .from(documentEmbeddings)
    .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.embedded, true),
        inArray(documents.category, [...categories]),
        isNull(documents.deletedAt)
      )
    )

  // Calculate cosine similarity and filter
  const scored = results
    .map((r) => {
      const embedding = JSON.parse(r.embedding) as number[]
      return {
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        chunkIndex: r.chunkIndex ?? 0,
        text: includeText ? (r.chunkText || "") : "",
        score: cosineSimilarity(queryEmbedding, embedding),
        category: r.category ?? "general",
        startPosition: r.startPosition ?? undefined,
        endPosition: r.endPosition ?? undefined,
      }
    })
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

/**
 * Hybrid search combining semantic and keyword matching
 *
 * @param userId - User ID
 * @param query - Search query
 * @param options - Search options
 * @returns Ranked search results
 */
export async function hybridSearch(
  userId: string,
  query: string,
  options: SemanticSearchOptions & { semanticWeight?: number; keywordWeight?: number } = {}
): Promise<SemanticSearchResult[]> {
  const { semanticWeight = 0.7, keywordWeight = 0.3, ...searchOptions } = options

  // Get semantic results
  const semanticResults = await semanticSearch(userId, query, searchOptions)

  // Normalize semantic scores to 0-1 range
  const maxSemanticScore = Math.max(...semanticResults.map((r) => r.score), 1)
  const normalizedSemantic = semanticResults.map((r) => ({
    ...r,
    semanticScore: r.score / maxSemanticScore,
  }))

  // Calculate keyword scores (simple word overlap)
  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  )
  const withKeywordScores = normalizedSemantic.map((r) => {
    const textLower = r.text.toLowerCase()
    const matches = Array.from(queryWords).filter((word) =>
      textLower.includes(word)
    ).length
    const keywordScore = queryWords.size > 0 ? matches / queryWords.size : 0

    return {
      ...r,
      score: r.semanticScore * semanticWeight + keywordScore * keywordWeight,
    }
  })

  // Re-sort by combined score
  return withKeywordScores.sort((a, b) => b.score - a.score)
}

/**
 * Get relevant context for RAG from documents
 *
 * @param userId - User ID
 * @param query - Query text
 * @param categories - Categories to search
 * @param maxTokens - Maximum tokens to include
 * @returns Object with assembled context and sources
 *
 * @example
 * ```ts
 * const { context, sources } = await getRagContext(userId, query, ["brand", "products"], 4000)
 * ```
 */
export async function getRagContext(
  userId: string,
  query: string,
  categories: string[] = [...DOCUMENT_CATEGORIES],
  maxTokens = 4000
): Promise<{ context: string; sources: Array<{ id: number; title: string; score: number }> }> {
  const results = await semanticSearch(userId, query, {
    categories,
    threshold: 0.6, // Lower threshold for RAG
    limit: 20, // Get more candidates
    includeText: true,
  })

  const sources: Array<{ id: number; title: string; score: number }> = []
  const contextParts: string[] = []
  let currentTokens = 0

  for (const result of results) {
    const chunkTokens = Math.floor(result.text.length / 4) // rough estimate

    if (currentTokens + chunkTokens > maxTokens) {
      break
    }

    // Add source reference
    sources.push({
      id: result.documentId,
      title: result.documentTitle,
      score: result.score,
    })

    // Add chunk text with reference
    contextParts.push(
      `[${result.documentTitle} (${result.category})]\n${result.text}`
    )

    currentTokens += chunkTokens
  }

  return {
    context: contextParts.join("\n\n---\n\n"),
    sources,
  }
}

/**
 * Re-embed a document (useful for updating embedding model)
 *
 * @param documentId - Document ID to re-embed
 * @param userId - User ID for authorization
 * @returns Number of chunks embedded
 */
export async function reembedDocument(
  documentId: number,
  userId: string
): Promise<{ chunksProcessed: number; success: boolean; error?: string }> {
  try {
    // Get document
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1)

    if (!doc) {
      return { success: false, chunksProcessed: 0, error: "Document not found" }
    }

    // Import chunking function
    const { splitDocumentIntoChunks } = await import("./chunking")
    const { generateEmbeddingsBatch } = await import("./embeddings")

    // Split into chunks
    const chunks = await splitDocumentIntoChunks(doc.content || "")

    // Update total chunks
    await db
      .update(documents)
      .set({
        chunksCount: chunks.length,
        embeddingProgress: 0,
        embeddingStatus: "processing",
      })
      .where(eq(documents.id, documentId))

    // Generate embeddings
    const texts = chunks.map((c) => c.text)
    const embeddings = await generateEmbeddingsBatch(texts)

    // Delete old embeddings
    await db
      .delete(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, documentId))

    // Insert new embeddings
    for (let i = 0; i < chunks.length; i++) {
      await db.insert(documentEmbeddings).values({
        documentId,
        embedding: JSON.stringify(embeddings[i]),
        model: "voyage-4-large",
        chunkIndex: chunks[i].index,
        chunkText: chunks[i].text,
        startPos: chunks[i].startPosition,
        endPos: chunks[i].endPosition,
      })

      // Update progress
      await db
        .update(documents)
        .set({ embeddingProgress: i + 1 })
        .where(eq(documents.id, documentId))
    }

    // Mark as embedded
    await db
      .update(documents)
      .set({
        embedded: true,
        embeddingStatus: "completed",
        lastEmbeddedAt: new Date(),
        embeddingModel: "voyage-4-large",
      })
      .where(eq(documents.id, documentId))

    return { success: true, chunksProcessed: chunks.length }
  } catch (error) {
    console.error("Re-embedding error:", error)
    return {
      success: false,
      chunksProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
