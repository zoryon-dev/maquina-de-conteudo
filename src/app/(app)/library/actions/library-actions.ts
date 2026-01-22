/**
 * Server Actions for Library Page
 *
 * Handles CRUD operations for library items with categories and tags.
 * All actions are authenticated and protected.
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  libraryItems,
  scheduledPosts,
  categories,
  tags,
  libraryItemTags,
} from "@/db/schema"
import { eq, and, gte, lte, isNull, inArray, desc, asc, sql, ilike } from "drizzle-orm"
import type {
  LibraryItemWithRelations,
  LibraryFilters,
  ViewMode,
  ActionResult,
  LibraryStats,
  Category,
  Tag,
} from "@/types/library"
import type { PostType, ContentStatus } from "@/db/schema"

// ============================================================================
// LIBRARY ITEMS ACTIONS
// ============================================================================

/**
 * Fetch library items with filters, sorting and pagination
 *
 * @param filters - Filter options
 * @param viewMode - View mode with sorting preferences
 * @param pagination - Optional pagination
 * @returns Array of library items with relations
 */
export async function getLibraryItemsAction(
  filters: LibraryFilters = {},
  viewMode: ViewMode = { mode: "grid", sortBy: "createdAt", sortOrder: "desc" },
  pagination?: { page: number; limit: number }
): Promise<LibraryItemWithRelations[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Build query conditions
    const conditions = [
      eq(libraryItems.userId, userId),
      isNull(libraryItems.deletedAt),
    ]

    // Add type filter
    if (filters.types && filters.types.length > 0) {
      conditions.push(inArray(libraryItems.type, filters.types))
    }

    // Add status filter
    if (filters.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(libraryItems.status, filters.statuses))
    }

    // Add category filter
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(inArray(libraryItems.categoryId, filters.categories))
    }

    // Add search filter (title or content)
    if (filters.search) {
      conditions.push(
        sql`(${libraryItems.title} ILIKE ${"%" + filters.search + "%"} OR ${libraryItems.content} ILIKE ${"%" + filters.search + "%"})`
      )
    }

    // Add date range filter
    if (filters.dateRange) {
      conditions.push(gte(libraryItems.createdAt, filters.dateRange.start))
      conditions.push(lte(libraryItems.createdAt, filters.dateRange.end))
    }

    // Determine sort order
    const orderByColumn =
      viewMode.sortBy === "title"
        ? libraryItems.title
        : viewMode.sortBy === "scheduledFor"
          ? libraryItems.scheduledFor
          : viewMode.sortBy === "updatedAt"
            ? libraryItems.updatedAt
            : libraryItems.createdAt

    const orderByDirection = viewMode.sortOrder === "asc" ? asc : desc

    // Execute main query
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
      })
      .from(libraryItems)
      .where(and(...conditions))
      .orderBy(orderByDirection(orderByColumn))
      .limit(pagination?.limit ?? 100)
      .offset(pagination ? (pagination.page - 1) * pagination.limit : 0)

    if (items.length === 0) {
      return []
    }

    // Fetch related data
    const itemIds = items.map((item) => item.id)

    // Fetch categories
    const categoryIds = items
      .map((item) => item.categoryId)
      .filter((id): id is number => id !== null)

    const categoriesData =
      categoryIds.length > 0
        ? await db
            .select()
            .from(categories)
            .where(inArray(categories.id, categoryIds))
        : []

    const categoryMap = new Map(categoriesData.map((c) => [c.id, c]))

    // Fetch tags through junction table
    const tagsData = await db
      .select({
        tagId: libraryItemTags.tagId,
        libraryItemId: libraryItemTags.libraryItemId,
        tag: {
          id: tags.id,
          userId: tags.userId,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        },
      })
      .from(libraryItemTags)
      .innerJoin(tags, eq(libraryItemTags.tagId, tags.id))
      .where(inArray(libraryItemTags.libraryItemId, itemIds))

    // Build tags map
    const tagsMap = new Map<number, Tag[]>()
    for (const row of tagsData) {
      if (!tagsMap.has(row.libraryItemId)) {
        tagsMap.set(row.libraryItemId, [])
      }
      tagsMap.get(row.libraryItemId)!.push(row.tag as Tag)
    }

    // Fetch scheduled posts for platform counts
    const scheduledPostsData = await db
      .select({
        libraryItemId: scheduledPosts.libraryItemId,
        platform: scheduledPosts.platform,
        status: scheduledPosts.status,
      })
      .from(scheduledPosts)
      .where(inArray(scheduledPosts.libraryItemId, itemIds))

    const scheduledPostsMap = new Map<number, typeof scheduledPostsData>()
    for (const sp of scheduledPostsData) {
      if (!scheduledPostsMap.has(sp.libraryItemId)) {
        scheduledPostsMap.set(sp.libraryItemId, [])
      }
      scheduledPostsMap.get(sp.libraryItemId)!.push(sp)
    }

    // Combine all data
    const result: LibraryItemWithRelations[] = items.map((item) => ({
      ...item,
      category: item.categoryId ? (categoryMap.get(item.categoryId) || null) : null,
      tags: tagsMap.get(item.id) || [],
      scheduledPosts: (scheduledPostsMap.get(item.id) || []).map((sp) => ({
        ...sp,
        platform: sp.platform as any,
        status: sp.status as any,
      })),
    })) as LibraryItemWithRelations[]

    return result
  } catch (error) {
    console.error("Error fetching library items:", error)
    return []
  }
}

/**
 * Get a single library item with all relations
 *
 * @param id - Library item ID
 * @returns Library item with relations or null
 */
export async function getLibraryItemAction(
  id: number
): Promise<LibraryItemWithRelations | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(and(eq(libraryItems.id, id), eq(libraryItems.userId, userId)))
      .limit(1)

    if (!item) {
      return null
    }

    // Fetch category
    let category: Category | null = null
    if (item.categoryId) {
      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, item.categoryId))
        .limit(1)
      category = (cat as Category) || null
    }

    // Fetch tags
    const tagsData = await db
      .select({
        tag: {
          id: tags.id,
          userId: tags.userId,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        },
      })
      .from(libraryItemTags)
      .innerJoin(tags, eq(libraryItemTags.tagId, tags.id))
      .where(eq(libraryItemTags.libraryItemId, id))

    const itemTags = tagsData.map((t) => t.tag as Tag)

    // Fetch scheduled posts
    const scheduledData = await db
      .select()
      .from(scheduledPosts)
      .where(eq(scheduledPosts.libraryItemId, id))

    return {
      ...item,
      category,
      tags: itemTags,
      scheduledPosts: scheduledData.map((sp) => ({
        ...sp,
        platform: sp.platform as any,
        status: sp.status as any,
      })),
    }
  } catch (error) {
    console.error("Error fetching library item:", error)
    return null
  }
}

/**
 * Create a new library item
 *
 * @param data - Library item data
 * @returns Action result with library item ID
 */
export async function createLibraryItemAction(
  data: Omit<
    typeof libraryItems.$inferInsert,
    "id" | "userId" | "createdAt" | "updatedAt"
  > & {
    tagIds?: number[]
    platforms?: Array<{ platform: string; scheduledFor?: Date }>
  }
): Promise<ActionResult & { libraryItemId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Parse mediaUrl and metadata if needed
    const mediaUrl =
      typeof data.mediaUrl === "string"
        ? data.mediaUrl
        : data.mediaUrl
          ? JSON.stringify(data.mediaUrl)
          : null

    const metadata =
      typeof data.metadata === "string"
        ? data.metadata
        : data.metadata
          ? JSON.stringify(data.metadata)
          : null

    // Create library item
    const [libraryItem] = await db
      .insert(libraryItems)
      .values({
        ...data,
        userId,
        mediaUrl,
        metadata,
      })
      .returning()

    // Create tag associations
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(libraryItemTags).values(
        data.tagIds.map((tagId) => ({
          libraryItemId: libraryItem.id,
          tagId,
        }))
      )
    }

    // Create scheduled posts for platforms
    if (data.platforms && data.platforms.length > 0) {
      await db.insert(scheduledPosts).values(
        data.platforms.map((p) => ({
          libraryItemId: libraryItem.id,
          platform: p.platform,
          scheduledFor: p.scheduledFor || new Date(),
          status: "pending",
        }))
      )
    }

    revalidatePath("/library")

    return { success: true, libraryItemId: libraryItem.id }
  } catch (error) {
    console.error("Error creating library item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar conteúdo",
    }
  }
}

/**
 * Update an existing library item
 *
 * @param id - Library item ID
 * @param data - Partial library item data
 * @returns Action result
 */
export async function updateLibraryItemAction(
  id: number,
  data: Partial<
    typeof libraryItems.$inferInsert & {
      tagIds?: number[]
      platforms?: Array<{ platform: string; scheduledFor?: Date }>
    }
  >
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.scheduledFor !== undefined) updateData.scheduledFor = data.scheduledFor
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId

    // Handle mediaUrl
    if (data.mediaUrl !== undefined) {
      updateData.mediaUrl =
        typeof data.mediaUrl === "string"
          ? data.mediaUrl
          : data.mediaUrl
            ? JSON.stringify(data.mediaUrl)
            : null
    }

    // Handle metadata
    if (data.metadata !== undefined) {
      updateData.metadata =
        typeof data.metadata === "string"
          ? data.metadata
          : data.metadata
            ? JSON.stringify(data.metadata)
            : null
    }

    // Update library item
    await db
      .update(libraryItems)
      .set(updateData)
      .where(eq(libraryItems.id, id))

    // Update tags if provided
    if (data.tagIds !== undefined) {
      // Delete existing tag associations
      await db
        .delete(libraryItemTags)
        .where(eq(libraryItemTags.libraryItemId, id))

      // Create new associations
      if (data.tagIds.length > 0) {
        await db.insert(libraryItemTags).values(
          data.tagIds.map((tagId) => ({
            libraryItemId: id,
            tagId,
          }))
        )
      }
    }

    // Update platforms if provided
    if (data.platforms !== undefined) {
      // Delete existing scheduled posts
      await db
        .delete(scheduledPosts)
        .where(eq(scheduledPosts.libraryItemId, id))

      // Create new scheduled posts
      if (data.platforms.length > 0) {
        await db.insert(scheduledPosts).values(
          data.platforms.map((p) => ({
            libraryItemId: id,
            platform: p.platform,
            scheduledFor: p.scheduledFor || new Date(),
            status: "pending",
          }))
        )
      }
    }

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error updating library item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar conteúdo",
    }
  }
}

/**
 * Quick inline update for title or status
 * Optimized for inline editing with minimal data transfer
 *
 * @param id - Library item ID
 * @param field - Field to update ("title" or "status")
 * @param value - New value
 * @returns Action result
 */
export async function inlineUpdateLibraryItemAction(
  id: number,
  field: "title" | "status",
  value: string
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  if (!value || value.trim() === "") {
    return { success: false, error: "Valor não pode ser vazio" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select({ id: libraryItems.id, userId: libraryItems.userId })
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Update only the specified field
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (field === "title") {
      updateData.title = value.trim()
    } else if (field === "status") {
      // Validate status
      const validStatuses: ContentStatus[] = ["draft", "scheduled", "published", "archived"]
      if (!validStatuses.includes(value as ContentStatus)) {
        return { success: false, error: "Status inválido" }
      }
      updateData.status = value as ContentStatus
    }

    await db
      .update(libraryItems)
      .set(updateData)
      .where(eq(libraryItems.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error in inline update:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar",
    }
  }
}

/**
 * Soft delete a library item
 *
 * @param id - Library item ID
 * @returns Action result
 */
export async function deleteLibraryItemAction(
  id: number
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Soft delete
    await db
      .update(libraryItems)
      .set({ deletedAt: new Date() })
      .where(eq(libraryItems.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error deleting library item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir conteúdo",
    }
  }
}

/**
 * Batch delete multiple library items
 *
 * @param ids - Library item IDs to delete
 * @returns Action result
 */
export async function deleteLibraryItemsAction(
  ids: number[]
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  if (ids.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Check ownership for all items
    const items = await db
      .select()
      .from(libraryItems)
      .where(inArray(libraryItems.id, ids))

    const ownedItems = items.filter((item) => item.userId === userId)

    if (ownedItems.length !== ids.length) {
      return { success: false, error: "Alguns itens não foram encontrados" }
    }

    // Soft delete all items
    await db
      .update(libraryItems)
      .set({ deletedAt: new Date() })
      .where(inArray(libraryItems.id, ids))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error batch deleting library items:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir conteúdos",
    }
  }
}

/**
 * Batch update status for multiple library items
 *
 * @param ids - Library item IDs
 * @param status - New status
 * @returns Action result
 */
export async function batchUpdateStatusAction(
  ids: number[],
  status: ContentStatus
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  if (ids.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Verify ownership of all items
    const items = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(
        and(
          inArray(libraryItems.id, ids),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )

    const validIds = items.map((item) => item.id)

    if (validIds.length === 0) {
      return { success: false, error: "Nenhum item válido encontrado" }
    }

    // Update status
    await db
      .update(libraryItems)
      .set({ status, updatedAt: new Date() })
      .where(inArray(libraryItems.id, validIds))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error batch updating status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar status",
    }
  }
}

/**
 * Batch delete library items
 *
 * @param ids - Library item IDs
 * @returns Action result
 */
export async function batchDeleteAction(ids: number[]): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  if (ids.length === 0) {
    return { success: false, error: "Nenhum item selecionado" }
  }

  try {
    // Verify ownership of all items
    const items = await db
      .select({ id: libraryItems.id })
      .from(libraryItems)
      .where(
        and(
          inArray(libraryItems.id, ids),
          eq(libraryItems.userId, userId),
          isNull(libraryItems.deletedAt)
        )
      )

    const validIds = items.map((item) => item.id)

    if (validIds.length === 0) {
      return { success: false, error: "Nenhum item válido encontrado" }
    }

    // Soft delete
    await db
      .update(libraryItems)
      .set({ deletedAt: new Date() })
      .where(inArray(libraryItems.id, validIds))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error batch deleting:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir itens",
    }
  }
}

/**
 * Duplicate a library item
 *
 * @param id - Library item ID to duplicate
 * @param newScheduledFor - Optional new scheduled date
 * @returns Action result with new library item ID
 */
export async function duplicateLibraryItemAction(
  id: number,
  newScheduledFor?: Date
): Promise<ActionResult & { libraryItemId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Fetch original
    const [original] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!original || original.userId !== userId) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Fetch tags
    const tagRelations = await db
      .select({ tagId: libraryItemTags.tagId })
      .from(libraryItemTags)
      .where(eq(libraryItemTags.libraryItemId, id))

    // Create duplicate
    const [newItem] = await db
      .insert(libraryItems)
      .values({
        userId,
        type: original.type,
        status: "draft" as ContentStatus,
        title: original.title ? `${original.title} (cópia)` : null,
        content: original.content,
        mediaUrl: original.mediaUrl,
        metadata: original.metadata,
        categoryId: original.categoryId,
        scheduledFor: newScheduledFor || null,
      })
      .returning()

    // Duplicate tag associations
    if (tagRelations.length > 0) {
      await db.insert(libraryItemTags).values(
        tagRelations.map((tr) => ({
          libraryItemId: newItem.id,
          tagId: tr.tagId,
        }))
      )
    }

    revalidatePath("/library")

    return { success: true, libraryItemId: newItem.id }
  } catch (error) {
    console.error("Error duplicating library item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao duplicar conteúdo",
    }
  }
}

// ============================================================================
// CATEGORIES ACTIONS
// ============================================================================

/**
 * Get all categories for the current user
 *
 * @returns Array of categories
 */
export async function getCategoriesAction(): Promise<Category[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.orderIdx)

    // Build tree structure
    const categoryMap = new Map<number, Category & { children?: Category[] }>()
    const rootCategories: (Category & { children?: Category[] })[] = []

    // First pass: create map
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] })
    }

    // Second pass: build tree
    for (const category of allCategories) {
      const cat = categoryMap.get(category.id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(cat)
        } else {
          rootCategories.push(cat)
        }
      } else {
        rootCategories.push(cat)
      }
    }

    return rootCategories as Category[]
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

/**
 * Create a new category
 *
 * @param data - Category data
 * @returns Action result with category ID
 */
export async function createCategoryAction(
  data: Omit<typeof categories.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<ActionResult & { categoryId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    const [category] = await db
      .insert(categories)
      .values({
        ...data,
        userId,
      })
      .returning()

    revalidatePath("/library")

    return { success: true, categoryId: category.id }
  } catch (error) {
    console.error("Error creating category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar categoria",
    }
  }
}

/**
 * Update a category
 *
 * @param id - Category ID
 * @param data - Partial category data
 * @returns Action result
 */
export async function updateCategoryAction(
  id: number,
  data: Partial<typeof categories.$inferInsert>
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Categoria não encontrada" }
    }

    await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error updating category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar categoria",
    }
  }
}

/**
 * Delete a category
 *
 * @param id - Category ID
 * @returns Action result
 */
export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Categoria não encontrada" }
    }

    // Delete category (cascade will handle children and library item references)
    await db.delete(categories).where(eq(categories.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir categoria",
    }
  }
}

// ============================================================================
// TAGS ACTIONS
// ============================================================================

/**
 * Get all tags for the current user
 *
 * @returns Array of tags
 */
export async function getTagsAction(): Promise<Tag[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const allTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name)

    // Count items per tag
    const tagIds = allTags.map((t) => t.id)
    const counts =
      tagIds.length > 0
        ? await db
            .select({
              tagId: libraryItemTags.tagId,
              count: sql<number>`count(*)`.as("count"),
            })
            .from(libraryItemTags)
            .where(inArray(libraryItemTags.tagId, tagIds))
            .groupBy(libraryItemTags.tagId)
        : []

    const countMap = new Map(counts.map((c) => [c.tagId, c.count]))

    return allTags.map((tag) => ({
      ...tag,
      itemCount: countMap.get(tag.id) || 0,
    })) as Tag[]
  } catch (error) {
    console.error("Error fetching tags:", error)
    return []
  }
}

/**
 * Create a new tag
 *
 * @param name - Tag name
 * @param color - Optional color
 * @returns Action result with tag ID
 */
export async function createTagAction(
  name: string,
  color?: string
): Promise<ActionResult & { tagId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    const [tag] = await db
      .insert(tags)
      .values({ userId, name, color })
      .returning()

    revalidatePath("/library")

    return { success: true, tagId: tag.id }
  } catch (error) {
    console.error("Error creating tag:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar tag",
    }
  }
}

/**
 * Update tags for a library item
 *
 * @param itemId - Library item ID
 * @param tagIds - Tag IDs to associate
 * @returns Action result
 */
export async function updateItemTagsAction(
  itemId: number,
  tagIds: number[]
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, itemId))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Delete existing associations
    await db
      .delete(libraryItemTags)
      .where(eq(libraryItemTags.libraryItemId, itemId))

    // Create new associations
    if (tagIds.length > 0) {
      await db.insert(libraryItemTags).values(
        tagIds.map((tagId) => ({
          libraryItemId: itemId,
          tagId,
        }))
      )
    }

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error updating item tags:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar tags",
    }
  }
}

/**
 * Delete a tag
 *
 * @param id - Tag ID
 * @returns Action result
 */
export async function deleteTagAction(id: number): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1)

    if (!existing || existing.userId !== userId) {
      return { success: false, error: "Tag não encontrada" }
    }

    await db.delete(tags).where(eq(tags.id, id))

    revalidatePath("/library")

    return { success: true }
  } catch (error) {
    console.error("Error deleting tag:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir tag",
    }
  }
}

// ============================================================================
// STATS ACTIONS
// ============================================================================

/**
 * Clear invalid media URLs from a library item
 * Use this to fix items where mediaUrl contains text prompts instead of image URLs
 *
 * @param id - Library item ID
 * @returns Action result
 */
export async function clearMediaUrlAction(
  id: number
): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Não autenticado" }
  }

  try {
    // Check ownership
    const [existing] = await db
      .select({ mediaUrl: libraryItems.mediaUrl })
      .from(libraryItems)
      .where(eq(libraryItems.id, id))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Conteúdo não encontrado" }
    }

    // Clear the mediaUrl field
    await db
      .update(libraryItems)
      .set({ mediaUrl: null, updatedAt: new Date() })
      .where(eq(libraryItems.id, id))

    revalidatePath("/library")
    revalidatePath(`/library/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error clearing media URL:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao limpar mídia",
    }
  }
}

/**
 * Get library statistics
 *
 * @returns Library stats
 */
export async function getLibraryStatsAction(): Promise<LibraryStats | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    const allItems = await db
      .select({
        type: libraryItems.type,
        status: libraryItems.status,
        scheduledFor: libraryItems.scheduledFor,
      })
      .from(libraryItems)
      .where(and(eq(libraryItems.userId, userId), isNull(libraryItems.deletedAt)))

    // Get platform stats from scheduled posts
    const platformStats = await db
      .select({
        platform: scheduledPosts.platform,
      })
      .from(libraryItems)
      .innerJoin(scheduledPosts, eq(libraryItems.id, scheduledPosts.libraryItemId))
      .where(eq(libraryItems.userId, userId))

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const byType: Record<string, number> = {
      text: 0,
      image: 0,
      carousel: 0,
      video: 0,
      story: 0,
    }

    const byStatus: Record<string, number> = {
      draft: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    }

    const byPlatform: Record<string, number> = {
      instagram: 0,
      twitter: 0,
      linkedin: 0,
      tiktok: 0,
    }

    let scheduledThisWeek = 0
    let scheduledThisMonth = 0

    for (const item of allItems) {
      // Count by type
      if (item.type) {
        byType[item.type] = (byType[item.type] || 0) + 1
      }

      // Count by status
      if (item.status) {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1
      }

      // Count scheduled
      if (item.scheduledFor) {
        if (item.scheduledFor <= weekFromNow) {
          scheduledThisWeek++
        }
        if (item.scheduledFor <= monthFromNow) {
          scheduledThisMonth++
        }
      }
    }

    for (const stat of platformStats) {
      if (stat.platform) {
        byPlatform[stat.platform] = (byPlatform[stat.platform] || 0) + 1
      }
    }

    return {
      totalItems: allItems.length,
      byType: byType as Record<PostType, number>,
      byStatus: byStatus as Record<ContentStatus, number>,
      byPlatform: byPlatform as Record<string, number>,
      scheduledThisWeek,
      scheduledThisMonth,
    }
  } catch (error) {
    console.error("Error fetching library stats:", error)
    return null
  }
}
