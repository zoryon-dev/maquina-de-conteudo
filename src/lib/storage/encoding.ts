/**
 * Unicode Encoding Utilities for S3/R2 Metadata
 *
 * S3-compatible metadata headers only support ASCII characters.
 * These utilities encode Unicode characters as ASCII-safe escape sequences
 * following Python's backslashreplace pattern.
 *
 * Example:
 * - "público.md" → "p\\u00fablico.md"
 * - "café" → "caf\\u00e9"
 *
 * This preserves full Unicode fidelity while keeping metadata ASCII-safe.
 */

/**
 * Escape sequence pattern for Unicode escapes
 * Matches: \uXXXX where X is hex digit
 */
const UNICODE_ESCAPE_PATTERN = /\\u([0-9a-fA-F]{4})/g

/**
 * Characters that are always safe in ASCII (printable plus whitespace)
 */
const ASCII_SAFE_REGEX = /^[\x20-\x7E\r\n\t]*$/

/**
 * Encodes a string containing Unicode characters as ASCII-safe escape sequences.
 * Uses Python-style backslashreplace encoding.
 *
 * @param value - The string to encode (may contain Unicode)
 * @returns ASCII-safe string with Unicode characters escaped as \uXXXX
 *
 * @example
 * encodeUnicodeForS3("público.md") // "p\u00fablico.md"
 * encodeUnicodeForS3("café") // "caf\u00e9"
 */
export function encodeUnicodeForS3(value: string): string {
  // If already ASCII-safe, return as-is
  if (ASCII_SAFE_REGEX.test(value)) {
    return value
  }

  // Encode each non-ASCII character as \uXXXX
  return Array.from(value)
    .map((char) => {
      const code = char.codePointAt(0)!

      // ASCII characters (0-127) are safe
      if (code < 0x80) {
        return char
      }

      // Unicode characters: encode as \uXXXX
      // For characters outside BMP (surrogate pairs), use \u{XXXXX} format
      if (code > 0xFFFF) {
        return `\\u{${code.toString(16)}}`
      }

      // Pad to 4 digits with leading zeros
      const hex = code.toString(16).padStart(4, '0')
      return `\\u${hex}`
    })
    .join('')
}

/**
 * Decodes a string containing Unicode escape sequences back to original Unicode.
 * Reverses the encoding done by encodeUnicodeForS3.
 *
 * @param value - The ASCII-safe string with possible escape sequences
 * @returns Original Unicode string
 *
 * @example
 * decodeUnicodeFromS3("p\\u00fablico.md") // "público.md"
 * decodeUnicodeFromS3("caf\\u00e9") // "café"
 */
export function decodeUnicodeFromS3(value: string): string {
  // If no escape sequences found, return as-is
  if (!UNICODE_ESCAPE_PATTERN.test(value)) {
    return value
  }

  return value.replace(UNICODE_ESCAPE_PATTERN, (_, hex) => {
    const codePoint = parseInt(hex, 16)
    return String.fromCodePoint(codePoint)
  })
}

/**
 * Sanitizes all string values in a metadata object for S3 compatibility.
 * Recursively encodes Unicode strings while leaving non-string values unchanged.
 *
 * @param metadata - The metadata object to sanitize
 * @returns New metadata object with Unicode strings encoded
 *
 * @example
 * sanitizeMetadataForS3({
 *   originalFilename: "público.md",
 *   count: 5
 * })
 * // { originalFilename: "p\\u00fablico.md", count: 5 }
 */
export function sanitizeMetadataForS3<T extends Record<string, unknown>>(
  metadata: T
): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      sanitized[key] = encodeUnicodeForS3(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively handle nested objects
      sanitized[key] = sanitizeMetadataForS3(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      // Handle arrays - encode strings recursively
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? encodeUnicodeForS3(item) : item
      )
    } else {
      // Keep primitives (numbers, booleans, null) as-is
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Restores Unicode strings from an S3 metadata object.
 * Recursively decodes escape sequences back to original Unicode.
 *
 * @param metadata - The metadata object from S3 with encoded strings
 * @returns New metadata object with Unicode strings decoded
 *
 * @example
 * restoreMetadataFromS3({
 *   originalFilename: "p\\u00fablico.md",
 *   count: 5
 * })
 * // { originalFilename: "público.md", count: 5 }
 */
export function restoreMetadataFromS3<T extends Record<string, unknown>>(
  metadata: T
): T {
  const restored: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      restored[key] = decodeUnicodeFromS3(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively handle nested objects
      restored[key] = restoreMetadataFromS3(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      // Handle arrays - decode strings recursively
      restored[key] = value.map((item) =>
        typeof item === 'string' ? decodeUnicodeFromS3(item) : item
      )
    } else {
      // Keep primitives as-is
      restored[key] = value
    }
  }

  return restored as T
}

/**
 * Tests if a string contains non-ASCII characters.
 *
 * @param value - The string to test
 * @returns true if the string contains non-ASCII characters
 */
export function hasNonAsciiChars(value: string): boolean {
  return !ASCII_SAFE_REGEX.test(value)
}
