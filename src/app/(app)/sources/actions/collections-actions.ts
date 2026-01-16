/**
 * Server Actions for Document Collections
 *
 * Handles CRUD operations for document collections/folders
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  documentCollections,
  documentCollectionItems,
  documents,
  type NewDocumentCollection,
} from "@/db/schema"
import { eq, and, isNull, desc, count } from "drizzle-orm"

/**
 * Result of a collection operation
 */
export interface CollectionResult {
  success: boolean
  error?: string
  collectionId?: number
}

/**
 * Document collection with item count
 */
export interface DocumentCollectionWithCount {
  id: number
  name: string
  parentId: number | null
  color: string | null
  icon: string | null
  orderIdx: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  itemCount: number
}

/**
 * Fetches all collections for the current user
 */
export async function getCollectionsAction(): Promise<DocumentCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const collections = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        parentId: documentCollections.parentId,
        color: documentCollections.color,
        icon: documentCollections.icon,
        orderIdx: documentCollections.orderIdx,
        createdAt: documentCollections.createdAt,
        updatedAt: documentCollections.updatedAt,
        deletedAt: documentCollections.deletedAt,
      })
      .from(documentCollections)
      .where(and(eq(documentCollections.userId, userId), isNull(documentCollections.deletedAt)))
      .orderBy(documentCollections.orderIdx, documentCollections.createdAt)

    // Get item counts for each collection
    const result: DocumentCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(documentCollectionItems)
        .where(eq(documentCollectionItems.collectionId, collection.id))

      result.push({
        ...collection,
        itemCount: itemCountResult[0]?.count || 0,
      })
    }

    return result
  } catch (error) {
    console.error("Get collections error:", error)
    return []
  }
}

/**
 * Fetches root collections (no parent)
 */
export async function getRootCollectionsAction(): Promise<DocumentCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const collections = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        parentId: documentCollections.parentId,
        color: documentCollections.color,
        icon: documentCollections.icon,
        orderIdx: documentCollections.orderIdx,
        createdAt: documentCollections.createdAt,
        updatedAt: documentCollections.updatedAt,
        deletedAt: documentCollections.deletedAt,
      })
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.userId, userId),
          isNull(documentCollections.parentId),
          isNull(documentCollections.deletedAt)
        )
      )
      .orderBy(documentCollections.orderIdx, documentCollections.createdAt)

    // Get item counts for each collection
    const result: DocumentCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(documentCollectionItems)
        .where(eq(documentCollectionItems.collectionId, collection.id))

      result.push({
        ...collection,
        itemCount: itemCountResult[0]?.count || 0,
      })
    }

    return result
  } catch (error) {
    console.error("Get root collections error:", error)
    return []
  }
}

/**
 * Fetches child collections of a parent collection
 */
export async function getChildCollectionsAction(
  parentId: number
): Promise<DocumentCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Verify parent belongs to user
    const [parent] = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.id, parentId),
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (!parent) {
      return []
    }

    const collections = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        parentId: documentCollections.parentId,
        color: documentCollections.color,
        icon: documentCollections.icon,
        orderIdx: documentCollections.orderIdx,
        createdAt: documentCollections.createdAt,
        updatedAt: documentCollections.updatedAt,
        deletedAt: documentCollections.deletedAt,
      })
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.userId, userId),
          eq(documentCollections.parentId, parentId),
          isNull(documentCollections.deletedAt)
        )
      )
      .orderBy(documentCollections.orderIdx, documentCollections.createdAt)

    // Get item counts for each collection
    const result: DocumentCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(documentCollectionItems)
        .where(eq(documentCollectionItems.collectionId, collection.id))

      result.push({
        ...collection,
        itemCount: itemCountResult[0]?.count || 0,
      })
    }

    return result
  } catch (error) {
    console.error("Get child collections error:", error)
    return []
  }
}

/**
 * Creates a new collection
 */
export async function createCollectionAction(
  data: {
    name: string
    parentId?: number | null
    color?: string | null
    icon?: string | null
  }
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  if (!data.name.trim()) {
    return { success: false, error: "Collection name is required" }
  }

  try {
    // Check if collection with same name already exists in same parent
    const existing = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.userId, userId),
          eq(documentCollections.name, data.name.trim()),
          data.parentId
            ? eq(documentCollections.parentId, data.parentId)
            : isNull(documentCollections.parentId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: "A collection with this name already exists" }
    }

    // Get max order index for sorting
    const maxOrderResult = await db
      .select({ maxOrder: documentCollections.orderIdx })
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.userId, userId),
          data.parentId
            ? eq(documentCollections.parentId, data.parentId)
            : isNull(documentCollections.parentId)
        )
      )
      .orderBy(desc(documentCollections.orderIdx))
      .limit(1)

    const nextOrderIdx = (maxOrderResult[0]?.maxOrder ?? -1) + 1

    const newCollection: NewDocumentCollection = {
      userId,
      name: data.name.trim(),
      parentId: data.parentId ?? null,
      color: data.color ?? null,
      icon: data.icon ?? "folder",
      orderIdx: nextOrderIdx,
    }

    const [inserted] = await db
      .insert(documentCollections)
      .values(newCollection)
      .returning()

    revalidatePath("/sources")
    return { success: true, collectionId: inserted.id }
  } catch (error) {
    console.error("Create collection error:", error)
    return { success: false, error: "Failed to create collection" }
  }
}

/**
 * Updates a collection
 */
export async function updateCollectionAction(
  collectionId: number,
  data: {
    name?: string
    color?: string | null
    icon?: string | null
  }
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify collection exists and belongs to user
    const [existing] = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.id, collectionId),
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      return { success: false, error: "Collection not found" }
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== existing.name) {
      const duplicate = await db
        .select()
        .from(documentCollections)
        .where(
          and(
            eq(documentCollections.userId, userId),
            eq(documentCollections.name, data.name.trim()),
            existing.parentId
              ? eq(documentCollections.parentId, existing.parentId)
              : isNull(documentCollections.parentId),
            isNull(documentCollections.deletedAt)
          )
        )
        .limit(1)

      if (duplicate.length > 0) {
        return { success: false, error: "A collection with this name already exists" }
      }
    }

    // Update collection
    await db
      .update(documentCollections)
      .set({
        ...(data.name && { name: data.name.trim() }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        updatedAt: new Date(),
      })
      .where(eq(documentCollections.id, collectionId))

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Update collection error:", error)
    return { success: false, error: "Failed to update collection" }
  }
}

/**
 * Deletes a collection (soft delete)
 */
export async function deleteCollectionAction(
  collectionId: number
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify collection exists and belongs to user
    const [existing] = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.id, collectionId),
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      return { success: false, error: "Collection not found" }
    }

    // Soft delete the collection
    await db
      .update(documentCollections)
      .set({ deletedAt: new Date() })
      .where(eq(documentCollections.id, collectionId))

    // Remove all items from this collection (cascade would handle this, but we do it explicitly)
    await db
      .delete(documentCollectionItems)
      .where(eq(documentCollectionItems.collectionId, collectionId))

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Delete collection error:", error)
    return { success: false, error: "Failed to delete collection" }
  }
}

/**
 * Adds a document to a collection
 */
export async function addDocumentToCollectionAction(
  documentId: number,
  collectionId: number
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.userId, userId),
          isNull(documents.deletedAt)
        )
      )
      .limit(1)

    if (!doc) {
      return { success: false, error: "Document not found" }
    }

    // Verify collection belongs to user
    const [collection] = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.id, collectionId),
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (!collection) {
      return { success: false, error: "Collection not found" }
    }

    // Check if already in collection
    const [existing] = await db
      .select()
      .from(documentCollectionItems)
      .where(
        and(
          eq(documentCollectionItems.documentId, documentId),
          eq(documentCollectionItems.collectionId, collectionId)
        )
      )
      .limit(1)

    if (existing) {
      return { success: true } // Already in collection, consider success
    }

    // Add to collection
    await db.insert(documentCollectionItems).values({
      documentId,
      collectionId,
    })

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Add document to collection error:", error)
    return { success: false, error: "Failed to add document to collection" }
  }
}

/**
 * Removes a document from a collection
 */
export async function removeDocumentFromCollectionAction(
  documentId: number,
  collectionId: number
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(documentCollectionItems)
      .where(
        and(
          eq(documentCollectionItems.documentId, documentId),
          eq(documentCollectionItems.collectionId, collectionId)
        )
      )

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Remove document from collection error:", error)
    return { success: false, error: "Failed to remove document from collection" }
  }
}

/**
 * Gets all collections for a specific document
 */
export async function getDocumentCollectionsAction(
  documentId: number
): Promise<DocumentCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Verify document belongs to user
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.userId, userId),
          isNull(documents.deletedAt)
        )
      )
      .limit(1)

    if (!doc) {
      return []
    }

    const collections = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        parentId: documentCollections.parentId,
        color: documentCollections.color,
        icon: documentCollections.icon,
        orderIdx: documentCollections.orderIdx,
        createdAt: documentCollections.createdAt,
        updatedAt: documentCollections.updatedAt,
        deletedAt: documentCollections.deletedAt,
      })
      .from(documentCollections)
      .innerJoin(
        documentCollectionItems,
        eq(documentCollectionItems.collectionId, documentCollections.id)
      )
      .where(
        and(
          eq(documentCollections.userId, userId),
          eq(documentCollectionItems.documentId, documentId),
          isNull(documentCollections.deletedAt)
        )
      )
      .orderBy(documentCollections.orderIdx, documentCollections.createdAt)

    // Get item counts for each collection
    const result: DocumentCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(documentCollectionItems)
        .where(eq(documentCollectionItems.collectionId, collection.id))

      result.push({
        ...collection,
        itemCount: itemCountResult[0]?.count || 0,
      })
    }

    return result
  } catch (error) {
    console.error("Get document collections error:", error)
    return []
  }
}

/**
 * Gets all documents in a collection
 */
export async function getCollectionDocumentsAction(
  collectionId: number
): Promise<number[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Verify collection belongs to user
    const [collection] = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.id, collectionId),
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )
      .limit(1)

    if (!collection) {
      return []
    }

    const items = await db
      .select({ documentId: documentCollectionItems.documentId })
      .from(documentCollectionItems)
      .where(eq(documentCollectionItems.collectionId, collectionId))

    return items.map((item) => item.documentId)
  } catch (error) {
    console.error("Get collection documents error:", error)
    return []
  }
}

/**
 * Reorders collections
 */
export async function reorderCollectionsAction(
  collectionOrders: { id: number; orderIdx: number }[]
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify all collections belong to user
    const existing = await db
      .select()
      .from(documentCollections)
      .where(
        and(
          eq(documentCollections.userId, userId),
          isNull(documentCollections.deletedAt)
        )
      )

    const existingIds = new Set(existing.map((c) => c.id))
    const allValid = collectionOrders.every((c) => existingIds.has(c.id))

    if (!allValid) {
      return { success: false, error: "One or more collections not found" }
    }

    // Update order for each collection
    for (const { id, orderIdx } of collectionOrders) {
      await db
        .update(documentCollections)
        .set({ orderIdx })
        .where(eq(documentCollections.id, id))
    }

    revalidatePath("/sources")
    return { success: true }
  } catch (error) {
    console.error("Reorder collections error:", error)
    return { success: false, error: "Failed to reorder collections" }
  }
}
