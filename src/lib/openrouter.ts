/**
 * OpenRouter Client
 *
 * Simple wrapper for OpenRouter API calls.
 * Retrieves API key from encrypted storage.
 */

import OpenAI from "openai"
import { db } from "@/db"
import { userApiKeys } from "@/db/schema"
import { eq } from "drizzle-orm"
import { decryptApiKey } from "@/lib/encryption"

/**
 * OpenRouter API base URL
 */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

/**
 * OpenRouter client instance (cached)
 */
let clientInstance: OpenAI | null = null

/**
 * Get OpenRouter client with API key from encrypted storage
 */
export async function getOpenRouterClient(): Promise<OpenAI> {
  if (clientInstance) {
    return clientInstance
  }

  try {
    const [keyRecord] = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.provider, "openrouter"))
      .limit(1)

    if (!keyRecord) {
      throw new Error("OpenRouter API key not configured")
    }

    const apiKey = decryptApiKey(keyRecord.encryptedKey, keyRecord.nonce)

    clientInstance = new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
    })

    return clientInstance
  } catch (error) {
    console.error("Failed to get OpenRouter client:", error)
    throw new Error("OpenRouter API key not configured")
  }
}

/**
 * OpenRouter client singleton for direct import
 *
 * Usage:
 * ```ts
 * import { openrouter } from "@/lib/openrouter"
 *
 * const completion = await openrouter.chat.completions.create({...})
 * ```
 */
export const openrouter = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  // API key is optional here - the actual key is set per-request
  // via the getOpenRouterClient function above
})

/**
 * Reset the cached client (useful after API key changes)
 */
export function resetOpenRouterClient() {
  clientInstance = null
}
