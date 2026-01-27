/**
 * Storage Abstraction Layer - Main Export
 *
 * Provides a factory function for getting storage providers
 * and re-exports all storage-related types and utilities.
 */

// ============================================================================
// Re-export Types
// ============================================================================
export * from "./types"

// ============================================================================
// Re-export Configuration
// ============================================================================
export {
  storageConfig,
  STORAGE_PROVIDER_ENV,
  DEFAULT_STORAGE_PROVIDER,
  isR2Configured,
  getR2Config,
  getLocalConfig,
  isValidStorageKey,
  sanitizeFilename,
} from "./config"

// ============================================================================
// Re-export Providers
// ============================================================================
export { LocalStorageProvider } from "./providers/local"
export { R2StorageProvider } from "./providers/r2"

// ============================================================================
// Re-export Utilities
// ============================================================================
export {
  getDocumentUrl,
  getDocumentUrlOrNull,
  hasStorageLocation,
  getDocumentStorageProvider,
} from "./utils/file-url"

// ============================================================================
// Factory Function
// ============================================================================
import { StorageProvider } from "./types"
import { DEFAULT_STORAGE_PROVIDER } from "./config"
import { LocalStorageProvider } from "./providers/local"
import { R2StorageProvider } from "./providers/r2"

type StorageProviderInstance = InstanceType<typeof LocalStorageProvider> | InstanceType<typeof R2StorageProvider>

/**
 * Cached storage provider instance
 */
let cachedProvider: StorageProviderInstance | null = null
let cachedProviderType: StorageProvider | null = null

/**
 * Get a storage provider instance
 * Uses singleton pattern for efficiency
 *
 * @param provider - Specific provider to get (defaults to env config)
 * @returns Storage provider instance
 */
export function getStorageProvider(
  provider?: StorageProvider
): LocalStorageProvider | R2StorageProvider {
  const selectedProvider = provider || DEFAULT_STORAGE_PROVIDER

  // Return cached instance if available for same provider type
  if (cachedProvider && cachedProviderType === selectedProvider) {
    return cachedProvider
  }

  // Create new instance based on provider type
  switch (selectedProvider) {
    case StorageProvider.R2:
      cachedProvider = new R2StorageProvider()
      break
    case StorageProvider.LOCAL:
    default:
      cachedProvider = new LocalStorageProvider()
      break
  }

  cachedProviderType = selectedProvider
  return cachedProvider
}

/**
 * Clear the cached storage provider instance
 * Useful for testing or switching providers at runtime
 */
export function clearStorageProviderCache(): void {
  cachedProvider = null
  cachedProviderType = null
}

/**
 * Get storage provider for a specific document
 * Uses the document's storageProvider field to determine which provider to use
 *
 * @param document - Document record with storageProvider field
 * @returns Storage provider instance
 */
export function getStorageProviderForDocument(
  document: { storageProvider?: "local" | "r2" | null } | null | undefined
): LocalStorageProvider | R2StorageProvider {
  const provider = document?.storageProvider === "r2" ? StorageProvider.R2 : StorageProvider.LOCAL
  return getStorageProvider(provider)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique storage key for a file
 * Format: {prefix}/{userId}/{timestamp}-{sanitized-filename}
 *
 * @param userId - User ID for namespacing
 * @param filename - Original filename
 * @param prefix - Optional prefix (default: "documents")
 * @returns Generated storage key
 */
export function generateStorageKey(
  userId: string,
  filename: string,
  prefix = "documents"
): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)

  // Import sanitize locally to avoid circular dependency
  const { sanitizeFilename } = require("./config")
  const safeName = sanitizeFilename(filename)

  return `${prefix}/${userId}/${timestamp}-${randomSuffix}-${safeName}`
}

/**
 * Parse a storage key to extract components
 *
 * @param key - Storage key to parse
 * @returns Parsed components or null if invalid format
 */
export function parseStorageKey(key: string): { prefix?: string; userId?: string; filename?: string } | null {
  const parts = key.split("/")
  if (parts.length < 3) return null

  return {
    prefix: parts[0],
    userId: parts[1],
    filename: parts.slice(2).join("/"),
  }
}

/**
 * Check if storage is using R2
 */
export function isUsingR2(): boolean {
  return DEFAULT_STORAGE_PROVIDER === StorageProvider.R2
}

/**
 * Check if storage is using local filesystem
 */
export function isUsingLocal(): boolean {
  return DEFAULT_STORAGE_PROVIDER === StorageProvider.LOCAL
}
