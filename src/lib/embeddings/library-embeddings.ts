/**
 * Library Embeddings
 *
 * Functions for generating and searching embeddings for library items
 * using the existing Voyage AI integration.
 */

import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import { and, eq, isNull, isNotNull } from "drizzle-orm"
import { generateEmbedding } from "@/lib/voyage/embeddings"
import { cosineSimilarity } from "@/lib/voyage/search"

/**
 * Maximum characters to use for generating an embedding.
 * Voyage AI voyage-4-large supports up to 32K tokens (~128K chars),
 * but we limit to 8000 chars for efficiency and cost.
 */
const MAX_EMBEDDING_TEXT_LENGTH = 8000

/**
 * Minimum similarity threshold for semantic search results.
 */
const SIMILARITY_THRESHOLD = 0.4

/**
 * Build a text representation of a library item for embedding.
 *
 * Combines title + content/caption into a single string,
 * truncated to MAX_EMBEDDING_TEXT_LENGTH characters.
 *
 * @param item - Library item fields
 * @returns Text string suitable for embedding
 */
export function buildEmbeddingText(item: {
  title?: string | null
  content?: string | null
}): string {
  const parts: string[] = []

  if (item.title) {
    parts.push(item.title)
  }

  if (item.content) {
    // Content may be a JSON string (for structured content like carousels)
    // or a plain text caption
    let textContent = item.content
    try {
      const parsed = JSON.parse(item.content)
      if (typeof parsed === "object" && parsed !== null) {
        // Extract text from structured content
        if (parsed.caption) {
          textContent = parsed.caption
        } else if (parsed.text) {
          textContent = parsed.text
        } else if (Array.isArray(parsed.slides)) {
          // Carousel: concatenate all slide texts
          textContent = parsed.slides
            .map((s: { title?: string; content?: string; headline?: string }) =>
              [s.title, s.headline, s.content].filter(Boolean).join(" ")
            )
            .join("\n")
        } else if (Array.isArray(parsed)) {
          // Array of strings
          textContent = parsed.filter((s: unknown) => typeof s === "string").join("\n")
        } else {
          // Fallback: stringify the object
          textContent = JSON.stringify(parsed)
        }
      }
    } catch {
      // Not JSON, use as-is (plain text)
    }
    parts.push(textContent)
  }

  const fullText = parts.join("\n\n")
  return fullText.slice(0, MAX_EMBEDDING_TEXT_LENGTH)
}

/**
 * Generate an embedding vector for a library item.
 *
 * @param item - Library item fields (title, content)
 * @returns Embedding vector (1024 dimensions) or null if text is empty
 */
export async function generateLibraryItemEmbedding(item: {
  title?: string | null
  content?: string | null
}): Promise<number[] | null> {
  const text = buildEmbeddingText(item)

  if (!text || text.trim().length === 0) {
    return null
  }

  return generateEmbedding(text)
}

/**
 * Fetch a library item from DB and update its embedding.
 *
 * @param itemId - Library item ID
 * @param userId - User ID for authorization
 * @returns Success status
 */
export async function updateLibraryItemEmbedding(
  itemId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch item
    const [item] = await db
      .select({
        id: libraryItems.id,
        title: libraryItems.title,
        content: libraryItems.content,
        userId: libraryItems.userId,
      })
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.id, itemId),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )
      .limit(1)

    if (!item) {
      return { success: false, error: "Item não encontrado" }
    }

    // Generate embedding
    const embedding = await generateLibraryItemEmbedding({
      title: item.title,
      content: item.content,
    })

    if (!embedding) {
      return { success: false, error: "Conteúdo vazio para gerar embedding" }
    }

    // Save to DB
    await db
      .update(libraryItems)
      .set({ embedding: JSON.stringify(embedding) })
      .where(eq(libraryItems.id, itemId))

    return { success: true }
  } catch (error) {
    console.error("[updateLibraryItemEmbedding] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao gerar embedding",
    }
  }
}

/**
 * Result type for semantic search
 */
export interface SemanticSearchResultItem {
  id: number
  userId: string
  type: string
  status: string
  title: string | null
  content: string | null
  mediaUrl: string | null
  metadata: string | null
  scheduledFor: Date | null
  publishedAt: Date | null
  categoryId: number | null
  createdAt: Date
  updatedAt: Date
  similarity: number
}

/**
 * Search library items by semantic similarity.
 *
 * Generates an embedding for the query, then computes cosine similarity
 * against all library items that have embeddings.
 *
 * @param query - Search query text
 * @param userId - User ID for authorization
 * @param limit - Maximum number of results (default: 20)
 * @returns Library items sorted by similarity (descending), with similarity score
 */
export async function searchByEmbedding(
  query: string,
  userId: string,
  limit = 20
): Promise<SemanticSearchResultItem[]> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Fetch all library items with embeddings for this user
  const items = await db
    .select({
      id: libraryItems.id,
      userId: libraryItems.userId,
      type: libraryItems.type,
      status: libraryItems.status,
      title: libraryItems.title,
      content: libraryItems.content,
      mediaUrl: libraryItems.mediaUrl,
      metadata: libraryItems.metadata,
      scheduledFor: libraryItems.scheduledFor,
      publishedAt: libraryItems.publishedAt,
      categoryId: libraryItems.categoryId,
      createdAt: libraryItems.createdAt,
      updatedAt: libraryItems.updatedAt,
      embedding: libraryItems.embedding,
    })
    .from(libraryItems)
    .where(
      and(
        eq(libraryItems.userId, userId),
        isNull(libraryItems.deletedAt),
        isNotNull(libraryItems.embedding)
      )
    )

  // Calculate cosine similarity for each item
  const scored = items
    .map((item) => {
      const itemEmbedding = JSON.parse(item.embedding!) as number[]
      const similarity = cosineSimilarity(queryEmbedding, itemEmbedding)
      return {
        id: item.id,
        userId: item.userId,
        type: item.type,
        status: item.status,
        title: item.title,
        content: item.content,
        mediaUrl: item.mediaUrl,
        metadata: item.metadata,
        scheduledFor: item.scheduledFor,
        publishedAt: item.publishedAt,
        categoryId: item.categoryId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        similarity,
      }
    })
    .filter((item) => item.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}
