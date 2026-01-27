/**
 * Storage Abstraction Layer - Configuration
 *
 * Environment variables and configuration for storage providers.
 */

import { StorageProvider } from "./types"

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Storage provider selection (feature flag)
 * @default "local"
 */
export const STORAGE_PROVIDER_ENV = process.env.STORAGE_PROVIDER || "local"

/**
 * R2 Account ID from Cloudflare dashboard
 */
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID

/**
 * R2 Access Key ID (API Token)
 */
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID

/**
 * R2 Secret Access Key (API Token Secret)
 */
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

/**
 * R2 Bucket name
 * @default "maquina-de-conteudo"
 */
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "maquina-de-conteudo"

/**
 * R2 Public URL for bucket (from Public Access settings)
 * Format: https://pub-xxx.r2.dev
 * Note: For custom domains, use R2_CUSTOM_DOMAIN instead
 */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

/**
 * Custom domain for R2 public bucket access
 * Example: storage-mc.zoryon.org
 */
export const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN

/**
 * Custom endpoint URL for R2 (for testing/custom regions)
 * @default Generated from ACCOUNT_ID
 */
export const R2_ENDPOINT = process.env.R2_ENDPOINT

/**
 * Get the public URL for R2 files (custom domain takes precedence)
 */
export const getR2PublicUrl = (): string | null => {
  return R2_CUSTOM_DOMAIN
    ? `https://${R2_CUSTOM_DOMAIN}`
    : R2_PUBLIC_URL || null
}

/**
 * Local storage upload directory
 * @default "public/uploads/documents"
 */
export const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR

/**
 * Base URL for the application (for generating local file URLs)
 * @default NEXT_PUBLIC_APP_URL or http://localhost:3000
 */
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"

// ============================================================================
// Derived Configuration
// ============================================================================

/**
 * Default storage provider based on environment and R2 availability
 */
export const DEFAULT_STORAGE_PROVIDER: StorageProvider =
  STORAGE_PROVIDER_ENV === "r2" && isR2Configured()
    ? StorageProvider.R2
    : StorageProvider.LOCAL

/**
 * Full R2 endpoint URL for S3 client
 */
export const R2_FULL_ENDPOINT =
  R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if R2 is properly configured with all required credentials
 */
export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  )
}

/**
 * Get R2 configuration object (throws if not configured)
 */
export function getR2Config() {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables."
    )
  }

  return {
    accountId: R2_ACCOUNT_ID!,
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    bucketName: R2_BUCKET_NAME!,
    endpoint: R2_FULL_ENDPOINT,
    publicUrl: getR2PublicUrl(),
    customDomain: R2_CUSTOM_DOMAIN,
  }
}

/**
 * Get local storage configuration object
 */
export function getLocalConfig() {
  return {
    uploadDir: LOCAL_UPLOAD_DIR || "public/uploads/documents",
    baseUrl: APP_BASE_URL,
  }
}

/**
 * Validate storage key format
 * @param key - Storage key to validate
 * @returns True if key is valid
 */
export function isValidStorageKey(key: string): boolean {
  if (!key || key.length === 0) return false
  if (key.length > 1024) return false // R2 max key length
  // Disallow leading/trailing slashes and consecutive slashes
  if (key.startsWith("/") || key.endsWith("/")) return false
  if (key.includes("//")) return false
  // Only allow safe characters
  const validKeyRegex = /^[a-zA-Z0-9._/-]+$/
  return validKeyRegex.test(key)
}

/**
 * Sanitize a filename for use in storage keys
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace unsafe chars with underscore
    .replace(/_{2,}/g, "_") // Collapse multiple underscores
    .replace(/\.+/g, ".") // Collapse multiple dots
    .toLowerCase()
}

// ============================================================================
// Exported Configuration Object
// ============================================================================

export const storageConfig = {
  provider: DEFAULT_STORAGE_PROVIDER,
  r2: {
    configured: isR2Configured(),
    accountId: R2_ACCOUNT_ID,
    bucketName: R2_BUCKET_NAME,
    endpoint: R2_FULL_ENDPOINT,
    publicUrl: getR2PublicUrl(),
    customDomain: R2_CUSTOM_DOMAIN,
  },
  local: {
    uploadDir: LOCAL_UPLOAD_DIR || "public/uploads/documents",
    baseUrl: APP_BASE_URL,
  },
} as const
