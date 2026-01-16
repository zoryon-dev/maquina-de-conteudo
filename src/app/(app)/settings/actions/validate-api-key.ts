/**
 * Server Action for validating API keys
 *
 * Calls the internal API route to validate an API key
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

/**
 * Result of API key validation
 */
export interface ValidateApiKeyResult {
  valid: boolean
  error?: string
}

/**
 * Validates an API key by calling the internal API route
 *
 * @param provider - The API provider (openrouter, voyage, etc.)
 * @param apiKey - The API key to validate
 * @returns Promise with validation result
 *
 * @example
 * ```ts
 * const result = await validateApiKeyAction("openrouter", "sk-or-...")
 * if (result.valid) {
 *   // Key is valid
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export async function validateApiKeyAction(
  provider: string,
  apiKey: string
): Promise<ValidateApiKeyResult> {
  const { userId } = await auth()

  if (!userId) {
    return { valid: false, error: "Unauthorized" }
  }

  try {
    // Get the base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Call the internal API route
    const response = await fetch(`${baseUrl}/api/settings/validate-api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, apiKey }),
      // Cache: no-store to avoid caching validation results
      cache: "no-store",
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        valid: false,
        error: result.error || "Failed to validate API key",
      }
    }

    return result
  } catch (error) {
    console.error("Validate API key error:", error)
    return { valid: false, error: "Failed to validate API key" }
  }
}
