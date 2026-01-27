/**
 * Server Actions for Conversation Collections
 *
 * Handles CRUD operations for conversation collections/folders
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  conversationCollections,
  conversationCollectionItems,
  chats,
  type NewConversationCollection,
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
 * Conversation collection with item count
 */
export interface ConversationCollectionWithCount {
  id: number
  name: string
  description: string | null
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
export async function getCollectionsAction(): Promise<ConversationCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const collections = await db
      .select({
        id: conversationCollections.id,
        name: conversationCollections.name,
        description: conversationCollections.description,
        parentId: conversationCollections.parentId,
        color: conversationCollections.color,
        icon: conversationCollections.icon,
        orderIdx: conversationCollections.orderIdx,
        createdAt: conversationCollections.createdAt,
        updatedAt: conversationCollections.updatedAt,
        deletedAt: conversationCollections.deletedAt,
      })
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .orderBy(conversationCollections.orderIdx, conversationCollections.createdAt)

    // Get item counts for each collection
    const result: ConversationCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(conversationCollectionItems)
        .where(eq(conversationCollectionItems.collectionId, collection.id))

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
export async function getRootCollectionsAction(): Promise<ConversationCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const collections = await db
      .select({
        id: conversationCollections.id,
        name: conversationCollections.name,
        description: conversationCollections.description,
        parentId: conversationCollections.parentId,
        color: conversationCollections.color,
        icon: conversationCollections.icon,
        orderIdx: conversationCollections.orderIdx,
        createdAt: conversationCollections.createdAt,
        updatedAt: conversationCollections.updatedAt,
        deletedAt: conversationCollections.deletedAt,
      })
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.parentId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .orderBy(conversationCollections.orderIdx, conversationCollections.createdAt)

    // Get item counts for each collection
    const result: ConversationCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(conversationCollectionItems)
        .where(eq(conversationCollectionItems.collectionId, collection.id))

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
): Promise<ConversationCollectionWithCount[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Verify parent belongs to user
    const [parent] = await db
      .select()
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.id, parentId),
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .limit(1)

    if (!parent) {
      return []
    }

    const collections = await db
      .select({
        id: conversationCollections.id,
        name: conversationCollections.name,
        description: conversationCollections.description,
        parentId: conversationCollections.parentId,
        color: conversationCollections.color,
        icon: conversationCollections.icon,
        orderIdx: conversationCollections.orderIdx,
        createdAt: conversationCollections.createdAt,
        updatedAt: conversationCollections.updatedAt,
        deletedAt: conversationCollections.deletedAt,
      })
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          eq(conversationCollections.parentId, parentId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .orderBy(conversationCollections.orderIdx, conversationCollections.createdAt)

    // Get item counts for each collection
    const result: ConversationCollectionWithCount[] = []
    for (const collection of collections) {
      const itemCountResult = await db
        .select({ count: count() })
        .from(conversationCollectionItems)
        .where(eq(conversationCollectionItems.collectionId, collection.id))

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
    description?: string
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
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          eq(conversationCollections.name, data.name.trim()),
          data.parentId
            ? eq(conversationCollections.parentId, data.parentId)
            : isNull(conversationCollections.parentId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: "A collection with this name already exists" }
    }

    // Get max order index for sorting
    const maxOrderResult = await db
      .select({ maxOrder: conversationCollections.orderIdx })
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          data.parentId
            ? eq(conversationCollections.parentId, data.parentId)
            : isNull(conversationCollections.parentId)
        )
      )
      .orderBy(desc(conversationCollections.orderIdx))
      .limit(1)

    const nextOrderIdx = (maxOrderResult[0]?.maxOrder ?? -1) + 1

    const newCollection: NewConversationCollection = {
      userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      parentId: data.parentId ?? null,
      color: data.color ?? null,
      icon: data.icon ?? "folder",
      orderIdx: nextOrderIdx,
    }

    const [inserted] = await db
      .insert(conversationCollections)
      .values(newCollection)
      .returning()

    revalidatePath("/chat")
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
    description?: string
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
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.id, collectionId),
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
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
        .from(conversationCollections)
        .where(
          and(
            eq(conversationCollections.userId, userId),
            eq(conversationCollections.name, data.name.trim()),
            existing.parentId
              ? eq(conversationCollections.parentId, existing.parentId)
              : isNull(conversationCollections.parentId),
            isNull(conversationCollections.deletedAt)
          )
        )
        .limit(1)

      if (duplicate.length > 0) {
        return { success: false, error: "A collection with this name already exists" }
      }
    }

    // Update collection
    await db
      .update(conversationCollections)
      .set({
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() || null }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        updatedAt: new Date(),
      })
      .where(eq(conversationCollections.id, collectionId))

    revalidatePath("/chat")
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
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.id, collectionId),
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .limit(1)

    if (!existing) {
      return { success: false, error: "Collection not found" }
    }

    // Soft delete the collection
    await db
      .update(conversationCollections)
      .set({ deletedAt: new Date() })
      .where(eq(conversationCollections.id, collectionId))

    // Remove all items from this collection
    await db
      .delete(conversationCollectionItems)
      .where(eq(conversationCollectionItems.collectionId, collectionId))

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Delete collection error:", error)
    return { success: false, error: "Failed to delete collection" }
  }
}

/**
 * Adds a conversation to a collection
 */
export async function addConversationToCollectionAction(
  conversationId: number,
  collectionId: number
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify conversation belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.id, conversationId),
          eq(chats.userId, userId)
        )
      )
      .limit(1)

    if (!chat) {
      return { success: false, error: "Conversation not found" }
    }

    // Verify collection belongs to user
    const [collection] = await db
      .select()
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.id, collectionId),
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
        )
      )
      .limit(1)

    if (!collection) {
      return { success: false, error: "Collection not found" }
    }

    // Check if already in collection
    const [existing] = await db
      .select()
      .from(conversationCollectionItems)
      .where(
        and(
          eq(conversationCollectionItems.conversationId, conversationId),
          eq(conversationCollectionItems.collectionId, collectionId)
        )
      )
      .limit(1)

    if (existing) {
      return { success: true } // Already in collection, consider success
    }

    // Add to collection
    await db.insert(conversationCollectionItems).values({
      conversationId,
      collectionId,
    })

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Add conversation to collection error:", error)
    return { success: false, error: "Failed to add conversation to collection" }
  }
}

/**
 * Removes a conversation from a collection
 */
export async function removeConversationFromCollectionAction(
  conversationId: number,
  collectionId: number
): Promise<CollectionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(conversationCollectionItems)
      .where(
        and(
          eq(conversationCollectionItems.conversationId, conversationId),
          eq(conversationCollectionItems.collectionId, collectionId)
        )
      )

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Remove conversation from collection error:", error)
    return { success: false, error: "Failed to remove conversation from collection" }
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
      .from(conversationCollections)
      .where(
        and(
          eq(conversationCollections.userId, userId),
          isNull(conversationCollections.deletedAt)
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
        .update(conversationCollections)
        .set({ orderIdx })
        .where(eq(conversationCollections.id, id))
    }

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Reorder collections error:", error)
    return { success: false, error: "Failed to reorder collections" }
  }
}
