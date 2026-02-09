/**
 * Server Actions for Sources Page
 *
 * Handles CRUD operations for documents and RAG functionality
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { documents, documentEmbeddings, documentCollectionItems } from "@/db/schema"
import { eq, and, desc, count, sql, isNull, or } from "drizzle-orm"
import { escapeILike } from "@/lib/utils"
import { createJob } from "@/lib/queue/jobs"
import { JobType, type DocumentEmbeddingPayload } from "@/lib/queue/types"
import { getStorageProviderForDocument } from "@/lib/storage"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"

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
 * Paginated response for documents
 */
export interface PaginatedDocumentsResponse {
  documents: DocumentWithEmbeddings[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
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
 * Fetches documents in a specific collection with embedding count
 * @deprecated Use getDocumentsPaginatedAction for better performance
 */
export async function getDocumentsByCollectionAction(
  collectionId: number | null
): Promise<DocumentWithEmbeddings[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // If collectionId is null, return all documents (same as getDocumentsWithEmbeddingsAction)
    if (collectionId === null) {
      return await getDocumentsWithEmbeddingsAction()
    }

    // Get documents in the specified collection
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
      .innerJoin(
        documentCollectionItems,
        eq(documentCollectionItems.documentId, documents.id)
      )
      .where(
        and(
          eq(documents.userId, userId),
          eq(documentCollectionItems.collectionId, collectionId)
        )
      )
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
    console.error("Get documents by collection error:", error)
    return []
  }
}

/**
 * Fetches documents with pagination support
 * More efficient for large document collections
 */
export async function getDocumentsPaginatedAction(options: {
  collectionId?: number | null
  page?: number
  pageSize?: number
  category?: string | null
  search?: string | null
}): Promise<PaginatedDocumentsResponse> {
  const { userId } = await auth()

  if (!userId) {
    return { documents: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }
  }

  const { collectionId = null, page = 1, pageSize = 20, category = null, search = null } = options

  try {
    // Build base conditions
    const conditions = [eq(documents.userId, userId)]
    if (category) {
      conditions.push(eq(documents.category, category))
    }
    if (search) {
      const escaped = escapeILike(search)
      conditions.push(
        or(
          sql`${documents.title} ILIKE ${`%${escaped}%`}`,
          sql`${documents.content} ILIKE ${`%${escaped}%`}`
        )!
      )
    }

    // If collection is specified, join with collection items
    if (collectionId !== null) {
      // Get total count for collection
      const countResult = await db
        .select({ count: count() })
        .from(documents)
        .innerJoin(
          documentCollectionItems,
          eq(documentCollectionItems.documentId, documents.id)
        )
        .where(
          and(
            ...conditions,
            eq(documentCollectionItems.collectionId, collectionId)
          )
        )
      const totalCount = countResult[0]?.count || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      // Get paginated documents
      const docs = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          fileType: documents.fileType,
          category: documents.category,
          embedded: documents.embedded,
          embeddingModel: documents.embeddingModel,
          embeddingStatus: documents.embeddingStatus,
          embeddingProgress: documents.embeddingProgress,
          chunksCount: documents.chunksCount,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .innerJoin(
          documentCollectionItems,
          eq(documentCollectionItems.documentId, documents.id)
        )
        .where(
          and(
            ...conditions,
            eq(documentCollectionItems.collectionId, collectionId)
          )
        )
        .orderBy(desc(documents.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      // Get embedding counts efficiently with a single query
      const docIds = docs.map((d) => d.id)
      const embeddingCounts = docIds.length > 0
        ? await db
            .select({
              documentId: documentEmbeddings.documentId,
              count: count(),
            })
            .from(documentEmbeddings)
            .where(sql`${documentEmbeddings.documentId} IN (${sql.join(docIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(documentEmbeddings.documentId)
        : []

      const countsMap = new Map(embeddingCounts.map((c) => [c.documentId, c.count]))

      const result: DocumentWithEmbeddings[] = docs.map((doc) => ({
        ...doc,
        embeddingCount: countsMap.get(doc.id) || 0,
      }))

      return { documents: result, totalCount, page, pageSize, totalPages }
    } else {
      // Get total count for all documents
      const countResult = await db
        .select({ count: count() })
        .from(documents)
        .where(and(...conditions))
      const totalCount = countResult[0]?.count || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      // Get paginated documents
      const docs = await db
        .select({
          id: documents.id,
          title: documents.title,
          content: documents.content,
          fileType: documents.fileType,
          category: documents.category,
          embedded: documents.embedded,
          embeddingModel: documents.embeddingModel,
          embeddingStatus: documents.embeddingStatus,
          embeddingProgress: documents.embeddingProgress,
          chunksCount: documents.chunksCount,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      // Get embedding counts efficiently with a single query
      const docIds = docs.map((d) => d.id)
      const embeddingCounts = docIds.length > 0
        ? await db
            .select({
              documentId: documentEmbeddings.documentId,
              count: count(),
            })
            .from(documentEmbeddings)
            .where(sql`${documentEmbeddings.documentId} IN (${sql.join(docIds.map(id => sql`${id}`), sql`, `)})`)
            .groupBy(documentEmbeddings.documentId)
        : []

      const countsMap = new Map(embeddingCounts.map((c) => [c.documentId, c.count]))

      const result: DocumentWithEmbeddings[] = docs.map((doc) => ({
        ...doc,
        embeddingCount: countsMap.get(doc.id) || 0,
      }))

      return { documents: result, totalCount, page, pageSize, totalPages }
    }
  } catch (error) {
    console.error("Get documents paginated error:", error)
    return { documents: [], totalCount: 0, page, pageSize, totalPages: 0 }
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
 * Also removes the file from storage (local or R2)
 */
export async function deleteDocumentWithEmbeddingsAction(
  documentId: number
): Promise<SourceResult> {
  try {
    // Use ensureAuthenticatedUser for consistent userId resolution
    const userId = await ensureAuthenticatedUser()

    // Fetch document first to get storage information
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1)

    if (!doc) {
      // Try to find the document without userId filter (may have been created with different auth)
      const [docByAnyUser] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1)

      if (!docByAnyUser) {
        return { success: false, error: "Document not found" }
      }

      // Document exists but belongs to different user - update ownership and proceed
      console.log(`[DeleteDocument] Updating document ${documentId} ownership from ${docByAnyUser.userId} to ${userId}`)
      await db
        .update(documents)
        .set({ userId })
        .where(eq(documents.id, documentId))
    }

    // Re-fetch to get latest state (including storage info)
    const [documentToDelete] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1)

    if (!documentToDelete) {
      return { success: false, error: "Document not found" }
    }

    // Delete file from storage if it has a storage key
    if (documentToDelete.storageKey) {
      try {
        const storage = getStorageProviderForDocument(documentToDelete)
        await storage.deleteFile(documentToDelete.storageKey)
      } catch (storageError) {
        // Log storage error but don't fail the delete operation
        console.error("Failed to delete file from storage:", storageError)
      }
    }

    // Delete collection associations (in case CASCADE doesn't trigger)
    await db
      .delete(documentCollectionItems)
      .where(eq(documentCollectionItems.documentId, documentId))

    // Delete embeddings first (foreign key constraint)
    await db
      .delete(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, documentId))

    // Delete document
    await db
      .delete(documents)
      .where(eq(documents.id, documentId))

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Delete document error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete document"
    return { success: false, error: errorMessage }
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
    const escaped = escapeILike(query)
    const conditions = category
      ? and(
          eq(documents.userId, userId),
          eq(documents.category, category),
          sql`${documents.content} ILIKE ${`%${escaped}%`} OR ${documents.title} ILIKE ${`%${escaped}%`}`
        )
      : and(
          eq(documents.userId, userId),
          sql`${documents.content} ILIKE ${`%${escaped}%`} OR ${documents.title} ILIKE ${`%${escaped}%`}`
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

/**
 * Queue a document for re-embedding
 *
 * Creates a job to regenerate embeddings for a document.
 * Useful after content changes or model updates.
 */
export async function reembedDocumentAction(
  documentId: number,
  force: boolean = true
): Promise<SourceResult & { jobId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify document exists and belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
      .limit(1)

    if (!doc) {
      return { success: false, error: "Document not found" }
    }

    // Check if already embedding
    if (doc.embeddingStatus === "processing") {
      return { success: false, error: "Document is already being processed" }
    }

    // Queue the embedding job
    const payload: DocumentEmbeddingPayload = {
      documentId,
      userId,
      force,
    }

    const jobId = await createJob(userId, JobType.DOCUMENT_EMBEDDING, payload)

    revalidatePath("/sources")
    return { success: true, jobId }
  } catch (error) {
    console.error("Re-embed document error:", error)
    return { success: false, error: "Failed to queue re-embedding job" }
  }
}

/**
 * Batch delete documents with their embeddings
 * Also removes files from storage (local or R2)
 */
export async function batchDeleteDocumentsAction(
  documentIds: number[]
): Promise<SourceResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  if (documentIds.length === 0) {
    return { success: false, error: "No documents to delete" }
  }

  try {
    // Fetch documents first to get storage information
    const docsToDelete = await db
      .select({
        id: documents.id,
        storageKey: documents.storageKey,
        storageProvider: documents.storageProvider,
      })
      .from(documents)
      .where(
        and(
          sql`${documents.id} = ANY(${documentIds})`,
          eq(documents.userId, userId)
        )
      )

    // Group storage keys by provider for batch deletion
    const localKeys: string[] = []
    const r2Keys: string[] = []

    for (const doc of docsToDelete) {
      if (doc.storageKey) {
        if (doc.storageProvider === "r2") {
          r2Keys.push(doc.storageKey)
        } else {
          localKeys.push(doc.storageKey)
        }
      }
    }

    // Delete files from storage providers
    const { LocalStorageProvider, R2StorageProvider } = await import("@/lib/storage")

    // Delete from local storage if any
    if (localKeys.length > 0) {
      try {
        const localStorage = new LocalStorageProvider()
        if (typeof localStorage.deleteFiles === "function") {
          await localStorage.deleteFiles(localKeys)
        } else {
          // Fallback to individual deletes
          await Promise.all(
            localKeys.map((key) => localStorage.deleteFile(key))
          )
        }
      } catch (storageError) {
        console.error("Failed to delete files from local storage:", storageError)
      }
    }

    // Delete from R2 if any
    if (r2Keys.length > 0) {
      try {
        const r2Storage = new R2StorageProvider()
        if (typeof r2Storage.deleteFiles === "function") {
          await r2Storage.deleteFiles(r2Keys)
        } else {
          // Fallback to individual deletes
          await Promise.all(
            r2Keys.map((key) => r2Storage.deleteFile(key))
          )
        }
      } catch (storageError) {
        console.error("Failed to delete files from R2 storage:", storageError)
      }
    }

    // Delete embeddings first (foreign key constraint)
    await db
      .delete(documentEmbeddings)
      .where(sql`${documentEmbeddings.documentId} = ANY(${documentIds})`)

    // Delete document collection items
    await db
      .delete(documentCollectionItems)
      .where(sql`${documentCollectionItems.documentId} = ANY(${documentIds})`)

    // Delete documents
    await db
      .delete(documents)
      .where(
        and(
          sql`${documents.id} = ANY(${documentIds})`,
          eq(documents.userId, userId)
        )
      )

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Batch delete documents error:", error)
    return { success: false, error: "Failed to delete documents" }
  }
}

/**
 * Get embedding status for a document
 */
export async function getEmbeddingStatusAction(documentId: number) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    const [doc] = await db
      .select({
        id: documents.id,
        embedded: documents.embedded,
        embeddingStatus: documents.embeddingStatus,
        embeddingProgress: documents.embeddingProgress,
        chunksCount: documents.chunksCount,
        lastEmbeddedAt: documents.lastEmbeddedAt,
        embeddingModel: documents.embeddingModel,
      })
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
      .limit(1)

    return doc || null
  } catch (error) {
    console.error("Get embedding status error:", error)
    return null
  }
}
