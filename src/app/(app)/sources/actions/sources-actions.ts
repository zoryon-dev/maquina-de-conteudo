/**
 * Server Actions for Sources Page
 *
 * Handles CRUD operations for documents and RAG functionality
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { documents, documentEmbeddings } from "@/db/schema"
import { eq, and, desc, count, sql } from "drizzle-orm"

/**
 * Result of a source operation
 */
export interface SourceResult {
  success: boolean
  error?: string
}

/**
 * Document with embedding count
 */
export interface DocumentWithEmbeddings {
  id: number
  title: string
  content: string
  fileType: string | null
  category: string | null
  embedded: boolean
  embeddingModel: string | null
  createdAt: Date
  updatedAt: Date
  embeddingCount?: number
}

/**
 * Document statistics
 */
export interface DocumentStats {
  totalDocuments: number
  embeddedDocuments: number
  totalChunks: number
  categories: CategoryCount[]
}

export interface CategoryCount {
  category: string | null
  count: number
}

/**
 * Fetches all documents with embedding count for the current user
 */
export async function getDocumentsWithEmbeddingsAction(): Promise<DocumentWithEmbeddings[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const docs = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        fileType: documents.fileType,
        category: documents.category,
        embedded: documents.embedded,
        embeddingModel: documents.embeddingModel,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))

    // Get embedding counts for each document
    const result: DocumentWithEmbeddings[] = []
    for (const doc of docs) {
      const embeddingCount = await db
        .select({ count: count() })
        .from(documentEmbeddings)
        .where(eq(documentEmbeddings.documentId, doc.id))

      result.push({
        ...doc,
        embeddingCount: embeddingCount[0]?.count || 0,
      })
    }

    return result
  } catch (error) {
    console.error("Get documents with embeddings error:", error)
    return []
  }
}

/**
 * Fetches document statistics for the current user
 */
export async function getDocumentStatsAction(): Promise<DocumentStats | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    // Get totals
    const totals = await db
      .select({
        totalDocuments: count(),
        embeddedDocuments: count(documents.embedded),
      })
      .from(documents)
      .where(eq(documents.userId, userId))

    // Get total chunks
    const chunksResult = await db
      .select({
        totalChunks: count(),
      })
      .from(documentEmbeddings)
      .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
      .where(eq(documents.userId, userId))

    // Get categories
    const categories = await db
      .select({
        category: documents.category,
        count: count(),
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .groupBy(documents.category)

    return {
      totalDocuments: totals[0]?.totalDocuments || 0,
      embeddedDocuments: totals[0]?.embeddedDocuments || 0,
      totalChunks: chunksResult[0]?.totalChunks || 0,
      categories: categories as CategoryCount[],
    }
  } catch (error) {
    console.error("Get document stats error:", error)
    return null
  }
}

/**
 * Updates a document
 */
export async function updateDocumentAction(
  documentId: number,
  data: {
    title?: string
    category?: string
    content?: string
  }
): Promise<SourceResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(documents)
      .set({
        ...data,
        updatedAt: new Date(),
        embedded: false, // Reset embedded status if content changes
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))

    // Delete old embeddings since content changed
    if (data.title || data.content) {
      await db
        .delete(documentEmbeddings)
        .where(eq(documentEmbeddings.documentId, documentId))
    }

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Update document error:", error)
    return { success: false, error: "Failed to update document" }
  }
}

/**
 * Deletes a document and its embeddings
 */
export async function deleteDocumentWithEmbeddingsAction(
  documentId: number
): Promise<SourceResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Delete embeddings first (foreign key constraint)
    await db
      .delete(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, documentId))

    // Delete document
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Delete document error:", error)
    return { success: false, error: "Failed to delete document" }
  }
}

/**
 * Gets embeddings for a specific document
 */
export async function getDocumentEmbeddingsAction(documentId: number) {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Verify document belongs to user
    const documentResult = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1)

    if (documentResult.length === 0) {
      return []
    }

    // Get embeddings
    const embeddings = await db
      .select()
      .from(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, documentId))

    return embeddings
  } catch (error) {
    console.error("Get document embeddings error:", error)
    return []
  }
}

/**
 * Gets documents filtered by category
 */
export async function getDocumentsByCategoryAction(category: string | null) {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    return await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          category ? eq(documents.category, category) : sql`${documents.category} IS NULL`
        )
      )
      .orderBy(desc(documents.createdAt))
  } catch (error) {
    console.error("Get documents by category error:", error)
    return []
  }
}

/**
 * Searches documents by content (simple text search for now)
 * TODO: Implement semantic search with Voyage AI embeddings
 */
export async function searchDocumentsAction(
  query: string,
  category?: string | null,
  limit: number = 10
) {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  if (!query.trim()) {
    return []
  }

  try {
    // Build all conditions together
    const conditions = category
      ? and(
          eq(documents.userId, userId),
          eq(documents.category, category),
          sql`${documents.content} ILIKE ${`%${query}%`} OR ${documents.title} ILIKE ${`%${query}%`}`
        )
      : and(
          eq(documents.userId, userId),
          sql`${documents.content} ILIKE ${`%${query}%`} OR ${documents.title} ILIKE ${`%${query}%`}`
        )

    const results = await db
      .select()
      .from(documents)
      .where(conditions)
      .limit(limit)

    return results
  } catch (error) {
    console.error("Search documents error:", error)
    return []
  }
}
