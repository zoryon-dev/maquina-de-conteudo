/**
 * Voyage AI Client
 *
 * Main client for Voyage AI API integration.
 *
 * **Migration to System-Controlled Keys (Phase 3):**
 *
 * Priority order for API key retrieval:
 * 1. Environment variable `VOYAGE_API_KEY` (system-controlled, recommended)
 * 2. Database with encrypted key (legacy, for backwards compatibility)
 *
 * The database approach is deprecated and will be removed in a future version.
 */

import { db } from "@/db"
import { userApiKeys } from "@/db/schema"
import { eq } from "drizzle-orm"
import { decryptApiKey } from "@/lib/encryption"

const VOYAGE_API_URL = "https://api.voyageai.com/v1"

/**
 * Voyage API client configuration
 */
export interface VoyageClientConfig {
  apiKey: string
  baseURL?: string
  source?: "env" | "database" // Track where the key came from
}

/**
 * Get Voyage API client with authenticated API key
 *
 * **Priority:**
 * 1. Environment variable `VOYAGE_API_KEY` (system-controlled)
 * 2. Database with encrypted key (legacy fallback)
 *
 * @throws Error if Voyage API key is not configured
 *
 * @example
 * ```ts
 * const client = await getVoyageClient()
 * const response = await fetch(`${client.baseURL}/embeddings`, {
 *   headers: { "Authorization": `Bearer ${client.apiKey}` }
 * })
 * ```
 */
export async function getVoyageClient(): Promise<VoyageClientConfig> {
  // Priority 1: System-controlled environment variable
  const envApiKey = process.env.VOYAGE_API_KEY
  if (envApiKey && envApiKey.trim().length > 0) {
    return {
      apiKey: envApiKey,
      baseURL: VOYAGE_API_URL,
      source: "env",
    }
  }

  // Priority 2: Legacy database lookup (backwards compatibility)
  const [keyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.provider, "voyage"))
    .limit(1)

  if (!keyRecord) {
    throw new VoyageError(
      "Voyage AI API key not configured. " +
      "Set VOYAGE_API_KEY environment variable for system-wide access."
    )
  }

  if (!keyRecord.isValid) {
    throw new VoyageError(
      "Voyage AI API key is invalid. " +
      "Please update VOYAGE_API_KEY environment variable."
    )
  }

  const apiKey = decryptApiKey(keyRecord.encryptedKey, keyRecord.nonce)

  return {
    apiKey,
    baseURL: VOYAGE_API_URL,
    source: "database",
  }
}

/**
 * Check if Voyage API is configured
 *
 * Checks both environment variable and database (legacy).
 *
 * @returns true if API key is configured and valid
 */
export async function isVoyageConfigured(): Promise<boolean> {
  // Check environment variable first
  const envApiKey = process.env.VOYAGE_API_KEY
  if (envApiKey && envApiKey.trim().length > 0) {
    return true
  }

  // Fallback to database check (legacy)
  const [keyRecord] = await db
    .select({ isValid: userApiKeys.isValid })
    .from(userApiKeys)
    .where(eq(userApiKeys.provider, "voyage"))
    .limit(1)

  return !!keyRecord?.isValid
}

/**
 * Check if Voyage is using environment variable (system-controlled)
 *
 * @returns true if using environment variable, false if using database (legacy)
 */
export function isVoyageUsingEnvVar(): boolean {
  const envApiKey = process.env.VOYAGE_API_KEY
  return !!(envApiKey && envApiKey.trim().length > 0)
}

/**
 * Voyage API error class
 */
export class VoyageError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = "VoyageError"
  }
}

/**
 * Parse Voyage API error from response
 */
export async function parseVoyageError(response: Response): Promise<VoyageError> {
  let errorMessage = "Voyage API error"
  let errorCode: string | undefined
  let statusCode = response.status

  try {
    const data = (await response.json()) as { error?: { message?: string; type?: string; code?: string } }
    errorMessage = data.error?.message || errorMessage
    errorCode = data.error?.code || data.error?.type
  } catch {
    errorMessage = `Voyage API error: ${response.status} ${response.statusText}`
  }

  return new VoyageError(errorMessage, errorCode, statusCode)
}

/**
 * Validate Voyage API key
 *
 * Makes a test request to Voyage API to validate the key.
 *
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export async function validateVoyageApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${VOYAGE_API_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: "test",
        model: "voyage-4-large",
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

// Re-export types for convenience
export type {
  VoyageModel,
  DocumentChunk,
  SemanticSearchOptions,
  SemanticSearchResult,
  RagContextOptions,
  RagContextResult,
  ChunkOptions,
} from "./types"
export { DEFAULT_MODEL, MODEL_DIMENSIONS, MODEL_CONTEXT_LENGTH } from "./types"
