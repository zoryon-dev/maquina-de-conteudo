/**
 * Library Export API Route
 *
 * GET /api/library/export?format=csv|json|zip&ids=1,2,3  (specific items)
 * GET /api/library/export?format=csv|json|zip&all=true    (all items)
 *
 * Supports optional filters: types, statuses (same as getLibraryItemsAction)
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  libraryItems,
  categories,
  tags,
  libraryItemTags,
} from "@/db/schema"
import { eq, and, inArray, isNull } from "drizzle-orm"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { toAppError, getErrorMessage } from "@/lib/errors"
import { generateCSV, type LibraryItemForExport } from "@/lib/export/csv-generator"
import { generateJSON } from "@/lib/export/json-exporter"
import { generateZip, type ZipEntry } from "@/lib/export/zip-generator"

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch library items for export with category and tag data
 */
async function fetchItemsForExport(
  userId: string,
  ids?: number[]
): Promise<LibraryItemForExport[]> {
  // Build conditions
  const conditions = [
    eq(libraryItems.userId, userId),
    isNull(libraryItems.deletedAt),
  ]

  if (ids && ids.length > 0) {
    conditions.push(inArray(libraryItems.id, ids))
  }

  // Fetch items
  const items = await db
    .select({
      id: libraryItems.id,
      type: libraryItems.type,
      title: libraryItems.title,
      status: libraryItems.status,
      content: libraryItems.content,
      mediaUrl: libraryItems.mediaUrl,
      metadata: libraryItems.metadata,
      categoryId: libraryItems.categoryId,
      createdAt: libraryItems.createdAt,
      updatedAt: libraryItems.updatedAt,
    })
    .from(libraryItems)
    .where(and(...conditions))

  if (items.length === 0) return []

  // Fetch categories
  const categoryIds = items
    .map((i) => i.categoryId)
    .filter((id): id is number => id !== null)

  const categoriesData =
    categoryIds.length > 0
      ? await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, categoryIds))
      : []

  const categoryMap = new Map(categoriesData.map((c) => [c.id, c.name]))

  // Fetch tags
  const itemIds = items.map((i) => i.id)
  const tagsData = await db
    .select({
      libraryItemId: libraryItemTags.libraryItemId,
      tagName: tags.name,
    })
    .from(libraryItemTags)
    .innerJoin(tags, eq(libraryItemTags.tagId, tags.id))
    .where(inArray(libraryItemTags.libraryItemId, itemIds))

  const tagsMap = new Map<number, string[]>()
  for (const row of tagsData) {
    if (!tagsMap.has(row.libraryItemId)) {
      tagsMap.set(row.libraryItemId, [])
    }
    tagsMap.get(row.libraryItemId)!.push(row.tagName)
  }

  // Build export items
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    content: item.content,
    mediaUrl: item.mediaUrl,
    metadata: item.metadata,
    categoryName: item.categoryId ? (categoryMap.get(item.categoryId) || null) : null,
    tags: tagsMap.get(item.id) || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))
}

/**
 * Extract all media URLs from a list of export items
 */
function extractAllMediaUrls(items: LibraryItemForExport[]): Array<{ itemId: number; url: string; index: number }> {
  const result: Array<{ itemId: number; url: string; index: number }> = []

  for (const item of items) {
    if (!item.mediaUrl) continue

    try {
      const parsed = JSON.parse(item.mediaUrl)
      if (Array.isArray(parsed)) {
        parsed.forEach((url: unknown, index: number) => {
          if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
            result.push({ itemId: item.id, url, index })
          }
        })
      } else if (typeof parsed === "string" && (parsed.startsWith("http://") || parsed.startsWith("https://"))) {
        result.push({ itemId: item.id, url: parsed, index: 0 })
      }
    } catch {
      // Not JSON; check if it's a plain URL
      if (item.mediaUrl.startsWith("http://") || item.mediaUrl.startsWith("https://")) {
        result.push({ itemId: item.id, url: item.mediaUrl, index: 0 })
      }
    }
  }

  return result
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const idsParam = searchParams.get("ids")
    const all = searchParams.get("all") === "true"

    // Validate format
    if (!["csv", "json", "zip"].includes(format)) {
      return NextResponse.json(
        { error: "Formato invalido. Use: csv, json ou zip" },
        { status: 400 }
      )
    }

    // Parse IDs or use all
    let ids: number[] | undefined
    if (!all && idsParam) {
      ids = idsParam
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))

      if (ids.length === 0) {
        return NextResponse.json(
          { error: "Nenhum ID valido fornecido" },
          { status: 400 }
        )
      }
    }

    if (!all && !idsParam) {
      return NextResponse.json(
        { error: "Forneça ids=1,2,3 ou all=true" },
        { status: 400 }
      )
    }

    // Fetch items
    const items = await fetchItemsForExport(userId, ids)

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum item encontrado para exportar" },
        { status: 404 }
      )
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

    // Generate output based on format
    if (format === "csv") {
      const csv = generateCSV(items)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="biblioteca-${timestamp}.csv"`,
        },
      })
    }

    if (format === "json") {
      const json = generateJSON(items)
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="biblioteca-${timestamp}.json"`,
        },
      })
    }

    // ZIP format - collect media URLs and generate ZIP
    if (format === "zip") {
      const mediaEntries = extractAllMediaUrls(items)

      if (mediaEntries.length === 0) {
        return NextResponse.json(
          { error: "Nenhuma imagem encontrada nos itens selecionados" },
          { status: 404 }
        )
      }

      const zipEntries: ZipEntry[] = mediaEntries.map((entry) => {
        const ext = entry.url.split(".").pop()?.split("?")[0] || "jpg"
        return {
          name: `item-${entry.itemId}-${entry.index + 1}.${ext}`,
          url: entry.url,
        }
      })

      const zipBlob = await generateZip(zipEntries)
      const buffer = await zipBlob.arrayBuffer()

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="biblioteca-imagens-${timestamp}.zip"`,
        },
      })
    }

    return NextResponse.json({ error: "Formato nao suportado" }, { status: 400 })
  } catch (error) {
    const appError = toAppError(error, "EXPORT_FAILED")
    console.error("[Library Export] Error:", appError)
    return NextResponse.json(
      { error: getErrorMessage(appError) },
      { status: appError.statusCode }
    )
  }
}
