/**
 * Library Import API Route
 *
 * POST /api/library/import — accepts { items: ParsedImportItem[] }
 * Creates library items in bulk.
 * Returns { imported: number, errors: { index: number, error: string }[] }
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { libraryItems, categories, tags, libraryItemTags } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { toAppError, getErrorMessage } from "@/lib/errors"
import type { ParsedImportItem } from "@/lib/import/parsers"

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const items: ParsedImportItem[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum item fornecido para importar" },
        { status: 400 }
      )
    }

    // Limit batch size
    if (items.length > 500) {
      return NextResponse.json(
        { error: "Maximo de 500 itens por importacao" },
        { status: 400 }
      )
    }

    // Pre-fetch all user categories for mapping by name
    const userCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId))

    const categoryNameMap = new Map(
      userCategories.map((c) => [c.name.toLowerCase(), c.id])
    )

    // Pre-fetch all user tags for mapping by name
    const userTags = await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(eq(tags.userId, userId))

    const tagNameMap = new Map(
      userTags.map((t) => [t.name.toLowerCase(), t.id])
    )

    let imported = 0
    const errors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      try {
        // Resolve category by name (create if not exists)
        let categoryId: number | null = null
        if (item.category) {
          const existingCatId = categoryNameMap.get(item.category.toLowerCase())
          if (existingCatId) {
            categoryId = existingCatId
          } else {
            // Create new category
            const [newCat] = await db
              .insert(categories)
              .values({
                userId,
                name: item.category,
              })
              .returning({ id: categories.id })

            categoryId = newCat.id
            categoryNameMap.set(item.category.toLowerCase(), newCat.id)
          }
        }

        // Resolve tags by name (create if not exists)
        const resolvedTagIds: number[] = []
        for (const tagName of item.tags) {
          const existingTagId = tagNameMap.get(tagName.toLowerCase())
          if (existingTagId) {
            resolvedTagIds.push(existingTagId)
          } else {
            // Create new tag
            const [newTag] = await db
              .insert(tags)
              .values({
                userId,
                name: tagName,
              })
              .returning({ id: tags.id })

            resolvedTagIds.push(newTag.id)
            tagNameMap.set(tagName.toLowerCase(), newTag.id)
          }
        }

        // Create library item
        const [libraryItem] = await db
          .insert(libraryItems)
          .values({
            userId,
            type: item.type,
            status: item.status,
            title: item.title,
            content: item.content,
            mediaUrl: item.mediaUrl,
            metadata: item.metadata,
            categoryId,
          })
          .returning({ id: libraryItems.id })

        // Create tag associations
        if (resolvedTagIds.length > 0) {
          await db.insert(libraryItemTags).values(
            resolvedTagIds.map((tagId) => ({
              libraryItemId: libraryItem.id,
              tagId,
            }))
          )
        }

        imported++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[Library Import] Error processing item ${i}:`, errorMsg)
        errors.push({ index: i, error: errorMsg })
      }
    }

    if (errors.length > 0) {
      console.warn(`[Library Import] ${errors.length}/${items.length} failed`)
    }

    return NextResponse.json({
      success: true,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    const appError = toAppError(error, "IMPORT_FAILED")
    console.error("[Library Import] Error:", appError)
    return NextResponse.json(
      { error: getErrorMessage(appError) },
      { status: appError.statusCode }
    )
  }
}
