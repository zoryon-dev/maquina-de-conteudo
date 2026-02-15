/**
 * JSON Exporter for Library Export
 *
 * Generates pretty-printed JSON from library items with full content structure.
 * The format is compatible with re-import.
 */

import type { LibraryItemForExport } from "./csv-generator"

// ============================================================================
// TYPES
// ============================================================================

interface ExportedItem {
  id: number
  type: string
  title: string | null
  status: string
  content: unknown
  mediaUrl: unknown
  metadata: unknown
  category: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface ExportEnvelope {
  version: "1.0"
  exportedAt: string
  itemCount: number
  items: ExportedItem[]
}

// ============================================================================
// JSON GENERATION
// ============================================================================

/**
 * Safely parse a JSON string, returning the original string if parsing fails.
 */
function safeParse(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Generate a pretty-printed JSON string from library items.
 *
 * Includes full content structure (slides, mediaUrls, metadata)
 * wrapped in an envelope with version and export timestamp.
 * Compatible with re-import via parseJSON().
 *
 * @param items - Array of library items to export
 * @returns Pretty-printed JSON string
 */
export function generateJSON(items: LibraryItemForExport[]): string {
  const envelope: ExportEnvelope = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      content: safeParse(item.content),
      mediaUrl: safeParse(item.mediaUrl),
      metadata: safeParse(item.metadata),
      category: item.categoryName,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  }

  return JSON.stringify(envelope, null, 2)
}
