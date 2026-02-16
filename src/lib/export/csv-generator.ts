/**
 * CSV Generator for Library Export
 *
 * Generates CSV files from library items with proper escaping,
 * UTF-8 BOM for Excel compatibility, and structured column layout.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LibraryItemForExport {
  id: number
  type: string
  title: string | null
  status: string
  content: string | null
  mediaUrl: string | null
  metadata: string | null
  categoryName: string | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Escape a CSV field value.
 * Wraps in double quotes if it contains commas, quotes, or newlines.
 * Doubles any existing double quotes.
 */
function escapeCSVField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.includes(";")
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Extract caption/legenda from content JSON or plain text
 */
function extractCaption(content: string | null): string {
  if (!content) return ""

  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === "object" && parsed !== null) {
      // Carousel format: { caption: "...", slides: [...] }
      if (parsed.caption) return parsed.caption
      // Simple text content
      if (parsed.text) return parsed.text
    }
    // If parsed is a string, return it
    if (typeof parsed === "string") return parsed
  } catch {
    // Not JSON, return as plain text
  }

  return content
}

/**
 * Extract hashtags from content JSON or plain text
 */
function extractHashtags(content: string | null): string {
  if (!content) return ""

  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === "object" && parsed !== null) {
      if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
        return parsed.hashtags.join(", ")
      }
    }
  } catch {
    // Not JSON
  }

  // Extract from text
  const hashtagRegex = /#(\w+)/g
  const matches = content.match(hashtagRegex)
  return matches ? [...new Set(matches)].join(", ") : ""
}

/**
 * Format a Date to ISO string for CSV
 */
function formatDateForCSV(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")
}

/**
 * Generate a CSV string from library items.
 *
 * Columns: id, tipo, titulo, status, legenda, hashtags, categoria, tags, criado_em, atualizado_em
 * Includes UTF-8 BOM for Excel compatibility.
 *
 * @param items - Array of library items to export
 * @returns CSV string with BOM prefix
 */
export function generateCSV(items: LibraryItemForExport[]): string {
  const BOM = "\uFEFF"

  const headers = [
    "id",
    "tipo",
    "titulo",
    "status",
    "legenda",
    "hashtags",
    "categoria",
    "tags",
    "criado_em",
    "atualizado_em",
  ]

  const rows = items.map((item) => {
    const caption = extractCaption(item.content)
    const hashtags = extractHashtags(item.content)

    return [
      String(item.id),
      escapeCSVField(item.type),
      escapeCSVField(item.title || ""),
      escapeCSVField(item.status),
      escapeCSVField(caption),
      escapeCSVField(hashtags),
      escapeCSVField(item.categoryName || ""),
      escapeCSVField(item.tags.join(", ")),
      escapeCSVField(formatDateForCSV(item.createdAt)),
      escapeCSVField(formatDateForCSV(item.updatedAt)),
    ].join(",")
  })

  return BOM + [headers.join(","), ...rows].join("\n")
}
