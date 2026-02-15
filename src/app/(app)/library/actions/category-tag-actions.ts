/**
 * Server Actions for Category and Tag Management
 *
 * Extended actions for managing categories and tags,
 * including migration, renaming, merging, and batch operations.
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  libraryItems,
  categories,
  tags,
  libraryItemTags,
} from "@/db/schema"
import { eq, and, inArray, isNull, sql } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import type { ActionResult } from "@/types/library"

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================

/**
 * Get categories with item counts
 *
 * Returns all categories for the user with the count of
 * non-deleted library items in each.
 */
export async function getCategoriesWithCountsAction(): Promise<
  Array<{
    id: number
    userId: string
    name: string
    parentId: number | null
    color: string | null
    icon: string | null
    orderIdx: number
    createdAt: Date
    updatedAt: Date
    itemCount: number
  }>
> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return []
  }

  try {
    const result = await db
      .select({
        id: categories.id,
        userId: categories.userId,
        name: categories.name,
        parentId: categories.parentId,
        color: categories.color,
        icon: categories.icon,
        orderIdx: categories.orderIdx,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        itemCount: sql<number>`count(${libraryItems.id})::int`,
      })
      .from(categories)
      .leftJoin(
        libraryItems,
        and(
          eq(libraryItems.categoryId, categories.id),
          isNull(libraryItems.deletedAt)
        )
      )
      .where(eq(categories.userId, userId))
      .groupBy(
        categories.id,
        categories.userId,
        categories.name,
        categories.parentId,
        categories.color,
        categories.icon,
        categories.orderIdx,
        categories.createdAt,
        categories.updatedAt
      )
      .orderBy(categories.orderIdx)

    return result
  } catch (error) {
    console.error("[getCategoriesWithCountsAction] Error:", error)
    return []
  }
}

/**
 * Delete a category with optional migration
 *
 * If moveToCategory is provided, items are moved to that category.
 * Otherwise, items are set to null category.
 *
 * @param id - Category ID to delete
 * @param moveToCategory - Optional category ID to migrate items to
 */
export async function deleteCategoryWithMigrationAction(
  id: number,
  moveToCategory?: number
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Categoria nao encontrada" }
    }

    // If migration target specified, verify ownership
    if (moveToCategory) {
      const [target] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, moveToCategory))
        .limit(1)

      if (!target || target.userId !== userId) {
        return { success: false, error: "Categoria de destino nao encontrada" }
      }
    }

    // Move items to target category or set to null
    await db
      .update(libraryItems)
      .set({
        categoryId: moveToCategory ?? null,
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.categoryId, id))

    // Delete the category
    await db.delete(categories).where(eq(categories.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[deleteCategoryWithMigrationAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir categoria",
    }
  }
}

// ============================================================================
// TAG ACTIONS
// ============================================================================

/**
 * Rename a tag
 *
 * @param id - Tag ID
 * @param newName - New name for the tag
 */
export async function renameTagAction(
  id: number,
  newName: string
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  if (!newName.trim()) {
    return { success: false, error: "Nome nao pode ser vazio" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Tag nao encontrada" }
    }

    // Check for name conflict
    const [conflict] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          eq(tags.name, newName.trim()),
          sql`${tags.id} != ${id}`
        )
      )
      .limit(1)

    if (conflict) {
      return { success: false, error: "Ja existe uma tag com este nome" }
    }

    await db
      .update(tags)
      .set({ name: newName.trim() })
      .where(eq(tags.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[renameTagAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao renomear tag",
    }
  }
}

/**
 * Merge multiple tags into one
 *
 * All items associated with any of the source tags will be
 * associated with the survivor tag. Other tags are deleted.
 *
 * @param tagIds - Array of tag IDs to merge
 * @param survivorId - The tag ID that will survive (must be in tagIds)
 */
export async function mergeTagsAction(
  tagIds: number[],
  survivorId: number
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  if (tagIds.length < 2) {
    return { success: false, error: "Selecione pelo menos 2 tags" }
  }

  if (!tagIds.includes(survivorId)) {
    return { success: false, error: "A tag sobrevivente deve estar entre as selecionadas" }
  }

  try {
    // Verify ownership of all tags
    const ownedTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          inArray(tags.id, tagIds),
          eq(tags.userId, userId)
        )
      )

    if (ownedTags.length !== tagIds.length) {
      return { success: false, error: "Algumas tags nao foram encontradas" }
    }

    const tagsToDelete = tagIds.filter((id) => id !== survivorId)

    // Get all library items linked to the tags being merged
    const existingLinks = await db
      .select({
        libraryItemId: libraryItemTags.libraryItemId,
        tagId: libraryItemTags.tagId,
      })
      .from(libraryItemTags)
      .where(inArray(libraryItemTags.tagId, tagIds))

    // Find items that need the survivor tag added
    const itemsWithSurvivor = new Set(
      existingLinks
        .filter((l) => l.tagId === survivorId)
        .map((l) => l.libraryItemId)
    )

    const itemsNeedingSurvivor = new Set(
      existingLinks
        .filter((l) => l.tagId !== survivorId)
        .map((l) => l.libraryItemId)
        .filter((id) => !itemsWithSurvivor.has(id))
    )

    // Add survivor tag to items that don't have it
    if (itemsNeedingSurvivor.size > 0) {
      await db.insert(libraryItemTags).values(
        Array.from(itemsNeedingSurvivor).map((libraryItemId) => ({
          libraryItemId,
          tagId: survivorId,
        }))
      )
    }

    // Delete links for merged tags
    await db
      .delete(libraryItemTags)
      .where(inArray(libraryItemTags.tagId, tagsToDelete))

    // Delete the merged tags
    await db
      .delete(tags)
      .where(inArray(tags.id, tagsToDelete))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[mergeTagsAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao mesclar tags",
    }
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Add a tag to multiple library items
 *
 * @param itemIds - Library item IDs
 * @param tagId - Tag ID to add
 */
export async function batchAddTagAction(
  itemIds: number[],
  tagId: number
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  if (itemIds.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Verify tag ownership
    const [tag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1)

    if (!tag) {
      return { success: false, error: "Tag nao encontrada" }
    }

    // Verify item ownership
    const ownedItems = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(
        and(
          inArray(libraryItems.id, itemIds),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )

    const validIds = ownedItems.map((i) => i.id)

    if (validIds.length === 0) {
      return { success: false, error: "Nenhum item valido encontrado" }
    }

    // Get existing associations to avoid duplicates
    const existing = await db
      .select({ libraryItemId: libraryItemTags.libraryItemId })
      .from(libraryItemTags)
      .where(
        and(
          inArray(libraryItemTags.libraryItemId, validIds),
          eq(libraryItemTags.tagId, tagId)
        )
      )

    const existingSet = new Set(existing.map((e) => e.libraryItemId))
    const toInsert = validIds.filter((id) => !existingSet.has(id))

    if (toInsert.length > 0) {
      await db.insert(libraryItemTags).values(
        toInsert.map((libraryItemId) => ({
          libraryItemId,
          tagId,
        }))
      )
    }

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[batchAddTagAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao adicionar tag",
    }
  }
}

/**
 * Remove a tag from multiple library items
 *
 * @param itemIds - Library item IDs
 * @param tagId - Tag ID to remove
 */
export async function batchRemoveTagAction(
  itemIds: number[],
  tagId: number
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  if (itemIds.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Verify item ownership
    const ownedItems = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(
        and(
          inArray(libraryItems.id, itemIds),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )

    const validIds = ownedItems.map((i) => i.id)

    if (validIds.length === 0) {
      return { success: false, error: "Nenhum item valido encontrado" }
    }

    // Delete associations
    await db
      .delete(libraryItemTags)
      .where(
        and(
          inArray(libraryItemTags.libraryItemId, validIds),
          eq(libraryItemTags.tagId, tagId)
        )
      )

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[batchRemoveTagAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao remover tag",
    }
  }
}

/**
 * Set category for multiple library items
 *
 * @param itemIds - Library item IDs
 * @param categoryId - Category ID to set (null to remove)
 */
export async function batchSetCategoryAction(
  itemIds: number[],
  categoryId: number | null
): Promise<ActionResult> {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return { success: false, error: "Nao autenticado" }
  }

  if (itemIds.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Verify category ownership (if not null)
    if (categoryId !== null) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .limit(1)

      if (!cat) {
        return { success: false, error: "Categoria nao encontrada" }
      }
    }

    // Verify item ownership
    const ownedItems = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(
        and(
          inArray(libraryItems.id, itemIds),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )

    const validIds = ownedItems.map((i) => i.id)

    if (validIds.length === 0) {
      return { success: false, error: "Nenhum item valido encontrado" }
    }

    await db
      .update(libraryItems)
      .set({ categoryId, updatedAt: new Date() })
      .where(inArray(libraryItems.id, validIds))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("[batchSetCategoryAction] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao definir categoria",
    }
  }
}
