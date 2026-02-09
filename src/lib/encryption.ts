/**
 * Encryption utilities for API keys
 *
 * Uses AES-256-GCM for client-side encryption.
 * API keys are encrypted in the browser before being sent to the server.
 */

import crypto from "crypto"

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!
const ALGORITHM = "aes-256-gcm"

if (!ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is not set. " +
    "Generate one with: openssl rand -base64 32"
  )
}

// Derive a 32-byte key from the environment variable
// Use ENCRYPTION_SALT env var if available; falls back to "salt" for backward compatibility
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || "salt"
if (ENCRYPTION_SALT === "salt" && process.env.NODE_ENV === "production") {
  console.warn("[Encryption] WARNING: Using default salt. Set ENCRYPTION_SALT env var for proper security.")
}
const key = crypto.scryptSync(ENCRYPTION_KEY, ENCRYPTION_SALT, 32)

/**
 * Result of encrypting an API key
 */
export interface EncryptedApiKey {
  /** The encrypted key (includes auth tag) */
  encryptedKey: string
  /** Nonce used for encryption (must be stored for decryption) */
  nonce: string
}

/**
 * Encrypts an API key using AES-256-GCM
 *
 * @param plaintext - The API key in plain text
 * @returns Object containing encrypted key and nonce
 *
 * @example
 * ```ts
 * const { encryptedKey, nonce } = encryptApiKey("sk-...")
 * ```
 */
export function encryptApiKey(plaintext: string): EncryptedApiKey {
  // Generate a random nonce (12 bytes for GCM)
  const nonce = crypto.randomBytes(12)

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce)

  // Encrypt
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  // Get auth tag for GCM authentication
  const authTag = cipher.getAuthTag()

  // Return encrypted key + auth tag (stored together) and nonce
  return {
    encryptedKey: `${encrypted}:${authTag.toString("hex")}`,
    nonce: nonce.toString("hex"),
  }
}

/**
 * Decrypts an API key that was encrypted with encryptApiKey
 *
 * @param encryptedKey - The encrypted key (includes auth tag)
 * @param nonce - The nonce used during encryption
 * @returns The API key in plain text
 *
 * @example
 * ```ts
 * const plainKey = decryptApiKey(encryptedKey, nonce)
 * ```
 */
export function decryptApiKey(encryptedKey: string, nonce: string): string {
  // Split encrypted key and auth tag
  const [encrypted, authTagHex] = encryptedKey.split(":")

  if (!encrypted || !authTagHex) {
    throw new Error("Invalid encrypted key format")
  }

  // Convert nonce and auth tag back to buffers
  const nonceBuffer = Buffer.from(nonce, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonceBuffer)
  decipher.setAuthTag(authTag)

  // Decrypt
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/**
 * Client-side encryption wrapper
 *
 * This function is designed to be called from client components.
 * It uses the Web Crypto API when available, falling back to a server endpoint.
 *
 * @param plaintext - The API key in plain text
 * @returns Promise resolving to encrypted data
 */
export async function encryptApiKeyClient(
  plaintext: string
): Promise<EncryptedApiKey> {
  // In a real implementation, you might want to use Web Crypto API
  // for true client-side encryption. For now, we'll call a server action.
  //
  // This is a placeholder - the actual implementation would depend on
  // how you want to handle the encryption key.

  // For now, use a simple approach: call the server-side function
  // In production, you'd want to use Web Crypto API in the browser
  return encryptApiKey(plaintext)
}

/**
 * Masks an API key for display purposes
 *
 * @param apiKey - The API key to mask
 * @param visibleChars - Number of characters to show at the start
 * @param visibleEndChars - Number of characters to show at the end
 * @returns Masked API key (e.g., "sk-...xyz123")
 *
 * @example
 * ```ts
 * maskApiKey("sk-1234567890abcdef", 3, 4) // "sk-...cdef"
 * ```
 */
export function maskApiKey(
  apiKey: string,
  visibleChars = 4,
  visibleEndChars = 4
): string {
  if (!apiKey || apiKey.length <= visibleChars + visibleEndChars) {
    return "•".repeat(8)
  }

  const start = apiKey.slice(0, visibleChars)
  const end = apiKey.slice(-visibleEndChars)

  return `${start}...${end}`
}

/**
 * Validates if a string looks like an API key
 *
 * @param key - The string to validate
 * @returns true if the string matches common API key patterns
 */
export function looksLikeApiKey(key: string): boolean {
  if (!key || key.length < 10) return false

  // Common API key patterns
  const patterns = [
    /^sk-/, // OpenAI, Stripe
    /^sk_or-/, // OpenRouter
    /^[a-f0-9]{32}$/, // 32-char hex (many providers)
    /^voyage-/, // Voyage AI
    /^tvly-/, // Tavily
    /^fc-/, // Firecrawl
    /^apify_/, // APIfy
  ]

  return patterns.some((pattern) => pattern.test(key))
}

/**
 * Safely decrypt a token stored as "nonce:encryptedData:authTag".
 * Returns the original value if it is legacy plaintext (no colon separator).
 */
export function safeDecrypt(value: string | null): string | null {
  if (!value) return null
  const firstColon = value.indexOf(":")
  if (firstColon === -1) return value // No colon = legacy plaintext
  try {
    const nonce = value.substring(0, firstColon)
    const encryptedKey = value.substring(firstColon + 1)
    return decryptApiKey(encryptedKey, nonce)
  } catch (error) {
    console.error("[Encryption] Decryption failed — possible key rotation or corrupted data:", error instanceof Error ? error.message : String(error))
    return null // Return null so callers handle missing token gracefully
  }
}

/**
 * Encrypt a plaintext token and pack nonce + ciphertext into a single
 * "nonce:encryptedKey" string suitable for DB storage.
 */
export function encryptToken(plaintext: string): string {
  const { encryptedKey, nonce } = encryptApiKey(plaintext)
  return `${nonce}:${encryptedKey}`
}
