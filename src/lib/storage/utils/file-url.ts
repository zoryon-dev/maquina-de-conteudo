/**
 * Storage Utilities - File URL Helpers
 *
 * Helper functions for working with storage URLs and keys.
 */

import type { Document } from "@/db/schema"
import { getR2PublicUrl } from "../config"

/**
 * Get the download URL for a document
 * Handles both local and R2 storage transparently
 *
 * @param document - Document record from database
 * @param baseUrl - Optional base URL override
 * @returns Public URL to access the file
 */
export function getDocumentUrl(
  document: Pick<Document, "storageProvider" | "storageKey" | "filePath">,
  baseUrl?: string
): string {
  const { storageProvider, storageKey, filePath } = document

  // R2 storage with storage key
  if (storageProvider === "r2" && storageKey) {
    const publicUrl = getR2PublicUrl()
    if (publicUrl) {
      return `${publicUrl}/${storageKey}`
    }
    // Fallback to bucket URL (may not work for private buckets)
    const bucketName = process.env.R2_BUCKET_NAME || "maquina-de-conteudo"
    return `https://${bucketName}.r2.dev/${storageKey}`
  }

  // Local storage with filePath
  if (filePath) {
    const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ""
    return `${appUrl}${filePath}`
  }

  // No file location available
  throw new Error("Document has no valid storage location")
}

/**
 * Get the download URL for a document with fallback
 * Returns null instead of throwing if no URL is available
 *
 * @param document - Document record from database
 * @param baseUrl - Optional base URL override
 * @returns Public URL or null if not available
 */
export function getDocumentUrlOrNull(
  document: Pick<Document, "storageProvider" | "storageKey" | "filePath">,
  baseUrl?: string
): string | null {
  try {
    return getDocumentUrl(document, baseUrl)
  } catch {
    return null
  }
}

/**
 * Check if a document has a valid storage location
 *
 * @param document - Document record from database
 * @returns True if document has a storage location
 */
export function hasStorageLocation(
  document: Pick<Document, "storageProvider" | "storageKey" | "filePath">
): boolean {
  return !!(
    (document.storageProvider === "r2" && document.storageKey) ||
    document.filePath
  )
}

/**
 * Get storage provider from document
 * Defaults to "local" for backward compatibility
 *
 * @param document - Document record from database
 * @returns Storage provider ("local" or "r2")
 */
export function getDocumentStorageProvider(
  document: Pick<Document, "storageProvider">
): "local" | "r2" {
  return document.storageProvider === "r2" ? "r2" : "local"
}
