/**
 * CSV/JSON Parsers for Library Import
 *
 * Parses CSV and JSON files into structured import items.
 * Auto-detects CSV delimiter (comma, semicolon, tab).
 * Validates each row against the library schema.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedImportItem {
  type: "text" | "image" | "carousel" | "video" | "story"
  title: string | null
  status: "draft" | "scheduled" | "published" | "archived"
  content: string | null
  mediaUrl: string | null
  metadata: string | null
  category: string | null
  tags: string[]
}

export interface ParseError {
  line: number
  message: string
}

export interface ParseResult {
  valid: ParsedImportItem[]
  errors: ParseError[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_TYPES = ["text", "image", "carousel", "video", "story"] as const
const VALID_STATUSES = ["draft", "scheduled", "published", "archived"] as const

// Expected CSV headers (matches our export format)
const EXPECTED_HEADERS = [
  "id", "tipo", "titulo", "status", "legenda",
  "hashtags", "categoria", "tags", "criado_em", "atualizado_em",
]

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Auto-detect CSV delimiter by analyzing the first line.
 * Checks for comma, semicolon, and tab.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] || ""

  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  }

  // Return delimiter with highest count
  if (counts[";"] > counts[","] && counts[";"] > counts["\t"]) return ";"
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t"
  return ","
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles fields with commas, newlines, and escaped quotes.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        fields.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
  }

  // Push last field
  fields.push(current.trim())

  return fields
}

/**
 * Map a type string (from CSV) to a valid PostType value.
 * Supports Portuguese and English names.
 */
function mapType(value: string): ParsedImportItem["type"] | null {
  const normalized = value.toLowerCase().trim()
  const typeMap: Record<string, ParsedImportItem["type"]> = {
    text: "text",
    texto: "text",
    image: "image",
    imagem: "image",
    carousel: "carousel",
    carrossel: "carousel",
    video: "video",
    story: "story",
    stories: "story",
  }
  return typeMap[normalized] || null
}

/**
 * Map a status string to a valid ContentStatus value.
 * Supports Portuguese and English names.
 */
function mapStatus(value: string): ParsedImportItem["status"] | null {
  const normalized = value.toLowerCase().trim()
  const statusMap: Record<string, ParsedImportItem["status"]> = {
    draft: "draft",
    rascunho: "draft",
    scheduled: "scheduled",
    agendado: "scheduled",
    published: "published",
    publicado: "published",
    archived: "archived",
    arquivado: "archived",
  }
  return statusMap[normalized] || null
}

/**
 * Parse a CSV text string into structured import items.
 *
 * @param text - Raw CSV text
 * @returns ParseResult with valid items and errors
 */
export function parseCSV(text: string): ParseResult {
  const valid: ParsedImportItem[] = []
  const errors: ParseError[] = []

  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, "")

  // Split into lines (handle both \r\n and \n)
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    errors.push({ line: 1, message: "Arquivo CSV precisa ter pelo menos um cabecalho e uma linha de dados" })
    return { valid, errors }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim())

  // Validate headers - find column indices
  const tipoIdx = headers.indexOf("tipo")
  const tituloIdx = headers.indexOf("titulo")
  const statusIdx = headers.indexOf("status")
  const legendaIdx = headers.indexOf("legenda")
  const hashtagsIdx = headers.indexOf("hashtags")
  const categoriaIdx = headers.indexOf("categoria")
  const tagsIdx = headers.indexOf("tags")

  // Require at minimum tipo and status columns
  if (tipoIdx === -1) {
    errors.push({ line: 1, message: "Coluna 'tipo' nao encontrada no cabecalho" })
    return { valid, errors }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const fields = parseCSVLine(line, delimiter)
    const lineNumber = i + 1

    try {
      const rawType = fields[tipoIdx] || ""
      const type = mapType(rawType)

      if (!type) {
        errors.push({
          line: lineNumber,
          message: `Tipo invalido: "${rawType}". Use: text, image, carousel, video, story`,
        })
        continue
      }

      const rawStatus = statusIdx >= 0 ? (fields[statusIdx] || "draft") : "draft"
      const status = mapStatus(rawStatus) || "draft"

      const title = tituloIdx >= 0 ? (fields[tituloIdx] || null) : null
      const caption = legendaIdx >= 0 ? (fields[legendaIdx] || null) : null
      const hashtagsRaw = hashtagsIdx >= 0 ? (fields[hashtagsIdx] || "") : ""
      const category = categoriaIdx >= 0 ? (fields[categoriaIdx] || null) : null
      const tagsRaw = tagsIdx >= 0 ? (fields[tagsIdx] || "") : ""

      // Build content from caption + hashtags
      let content: string | null = null
      if (caption || hashtagsRaw) {
        const hashtags = hashtagsRaw
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean)

        if (type === "carousel" || type === "image") {
          content = JSON.stringify({
            caption: caption || "",
            hashtags,
          })
        } else {
          // For text, combine caption and hashtags
          const parts = [caption]
          if (hashtags.length > 0) {
            parts.push("\n\n" + hashtags.join(" "))
          }
          content = parts.filter(Boolean).join("")
        }
      }

      // Parse tags
      const tagsList = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      valid.push({
        type,
        title,
        status,
        content,
        mediaUrl: null,
        metadata: null,
        category,
        tags: tagsList,
      })
    } catch (err) {
      errors.push({
        line: lineNumber,
        message: err instanceof Error ? err.message : "Erro ao processar linha",
      })
    }
  }

  return { valid, errors }
}

// ============================================================================
// JSON PARSING
// ============================================================================

/**
 * Parse a JSON text string into structured import items.
 * Supports both the export envelope format and a plain array of items.
 *
 * @param text - Raw JSON text
 * @returns ParseResult with valid items and errors
 */
export function parseJSON(text: string): ParseResult {
  const valid: ParsedImportItem[] = []
  const errors: ParseError[] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    errors.push({ line: 1, message: "JSON invalido: erro de sintaxe" })
    return { valid, errors }
  }

  // Handle envelope format (from our export)
  let items: unknown[]
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "items" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    items = (parsed as Record<string, unknown>).items as unknown[]
  } else if (Array.isArray(parsed)) {
    items = parsed
  } else {
    errors.push({ line: 1, message: "JSON deve ser um array ou ter a propriedade 'items'" })
    return { valid, errors }
  }

  for (let i = 0; i < items.length; i++) {
    const raw = items[i]
    const lineNumber = i + 1

    if (!raw || typeof raw !== "object") {
      errors.push({ line: lineNumber, message: "Item deve ser um objeto" })
      continue
    }

    const item = raw as Record<string, unknown>

    try {
      // Validate type
      const rawType = String(item.type || item.tipo || "")
      const type = mapType(rawType)
      if (!type) {
        errors.push({
          line: lineNumber,
          message: `Tipo invalido: "${rawType}". Use: text, image, carousel, video, story`,
        })
        continue
      }

      // Validate status
      const rawStatus = String(item.status || "draft")
      const status = mapStatus(rawStatus) || "draft"

      // Extract fields
      const title = typeof item.title === "string" ? item.title : (typeof item.titulo === "string" ? item.titulo : null)
      const content = item.content !== undefined && item.content !== null
        ? (typeof item.content === "string" ? item.content : JSON.stringify(item.content))
        : null
      const mediaUrl = item.mediaUrl !== undefined && item.mediaUrl !== null
        ? (typeof item.mediaUrl === "string" ? item.mediaUrl : JSON.stringify(item.mediaUrl))
        : null
      const metadata = item.metadata !== undefined && item.metadata !== null
        ? (typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata))
        : null

      const category = typeof item.category === "string" ? item.category : (typeof item.categoria === "string" ? item.categoria : null)
      const rawTags = item.tags
      const tagsList = Array.isArray(rawTags)
        ? rawTags.filter((t): t is string => typeof t === "string")
        : []

      valid.push({
        type,
        title,
        status,
        content,
        mediaUrl,
        metadata,
        category,
        tags: tagsList,
      })
    } catch (err) {
      errors.push({
        line: lineNumber,
        message: err instanceof Error ? err.message : "Erro ao processar item",
      })
    }
  }

  return { valid, errors }
}
