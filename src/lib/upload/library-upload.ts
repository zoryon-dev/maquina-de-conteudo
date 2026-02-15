/**
 * Library Upload Utilities
 *
 * Funções para upload de arquivos na Biblioteca de Conteúdos.
 * Utiliza o storage provider existente (Local ou R2).
 */

import { getStorageProvider, generateStorageKey } from "@/lib/storage"
import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import type { UploadResult } from "@/lib/storage"

// ============================================================================
// TYPES
// ============================================================================

export interface LibraryUploadResult {
  libraryItemId: number
  imageUrl: string
  title: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract a human-readable title from a filename.
 * e.g. "my-photo_2024.png" -> "My photo 2024"
 */
function titleFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "")
  const cleaned = nameWithoutExt
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) return "Imagem sem título"

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/**
 * Detect content type from file extension or type string.
 */
function getContentType(file: File): string {
  if (file.type && file.type.startsWith("image/")) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "png": return "image/png"
    case "jpg":
    case "jpeg": return "image/jpeg"
    case "webp": return "image/webp"
    case "gif": return "image/gif"
    default: return "application/octet-stream"
  }
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload a file to storage using the existing provider abstraction.
 *
 * @param file - File to upload (from browser File API)
 * @param userId - Authenticated user ID
 * @returns UploadResult with key and URL
 */
export async function uploadFileToStorage(
  file: File,
  userId: string
): Promise<UploadResult> {
  const storage = getStorageProvider()

  // Generate unique storage key under "library" prefix
  const key = generateStorageKey(userId, file.name, "library")

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload using provider
  const result = await storage.uploadFile(buffer, key, {
    contentType: getContentType(file),
    metadata: {
      originalFilename: file.name,
      uploadSource: "library-dropzone",
    },
  })

  return result
}

/**
 * Upload a file and create a library item in one operation.
 *
 * Creates a library item of type "image" with status "draft",
 * and the title derived from the filename.
 *
 * @param file - File to upload
 * @param userId - Authenticated user ID
 * @returns The created library item info
 */
export async function createLibraryItemFromUpload(
  file: File,
  userId: string
): Promise<LibraryUploadResult> {
  // 1. Upload file to storage
  const uploadResult = await uploadFileToStorage(file, userId)

  // 2. Derive title from filename
  const title = titleFromFilename(file.name)

  // 3. Create library item
  const [item] = await db
    .insert(libraryItems)
    .values({
      userId,
      type: "image" as const,
      status: "draft" as const,
      title,
      mediaUrl: JSON.stringify([uploadResult.url]),
      metadata: JSON.stringify({
        origin: "upload",
        originalFilename: file.name,
        fileSize: file.size,
        contentType: getContentType(file),
        storageKey: uploadResult.key,
        storageProvider: uploadResult.provider,
      }),
    })
    .returning()

  return {
    libraryItemId: item.id,
    imageUrl: uploadResult.url,
    title,
  }
}
