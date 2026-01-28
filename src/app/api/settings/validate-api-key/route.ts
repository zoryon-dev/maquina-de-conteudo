/**
 * API Route for validating API keys
 *
 * Validates API keys by calling the provider's endpoint.
 * When valid, automatically saves the encrypted key to the database.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { userApiKeys } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { encryptApiKey } from "@/lib/encryption"

/**
 * Supported API providers
 */
const VALID_PROVIDERS = [
  "openrouter",
  "voyage",
  "firecrawl",
  "tavily",
  "screenshotone",
  "apify",
] as const

type Provider = (typeof VALID_PROVIDERS)[number]

/**
 * POST /api/settings/validate-api-key
 *
 * Validates an API key for a specific provider.
 * When valid, automatically saves the encrypted key to the database.
 *
 * @body { provider: string, apiKey: string }
 * @returns { valid: boolean, saved: boolean, error?: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { provider, apiKey } = body

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json(
        { valid: false, error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate API key presence
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 }
      )
    }

    // Validate with specific provider
    const result = await validateProviderApiKey(provider as Provider, apiKey)

    // If valid, save the encrypted key to database
    if (result.valid && userId) {
      try {
        const { encryptedKey, nonce } = encryptApiKey(apiKey)

        // Check if key exists for this provider
        const existing = await db
          .select()
          .from(userApiKeys)
          .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
          .limit(1)

        if (existing.length > 0) {
          // Update existing
          await db
            .update(userApiKeys)
            .set({
              encryptedKey,
              nonce,
              isValid: true,
              lastValidatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
        } else {
          // Insert new
          await db.insert(userApiKeys).values({
            userId,
            provider,
            encryptedKey,
            nonce,
            isValid: true,
            lastValidatedAt: new Date(),
          })
        }
      } catch (saveError) {
        console.error("Failed to save API key:", saveError)
        // Return valid but indicate save failed
        return NextResponse.json({ ...result, saved: false })
      }
    }

    return NextResponse.json({ ...result, saved: result.valid })
  } catch (error) {
    console.error("API key validation error:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 }
    )
  }
}

/**
 * Validates an API key with the specific provider
 */
async function validateProviderApiKey(
  provider: Provider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  switch (provider) {
    case "openrouter":
      return await validateOpenRouterKey(apiKey)
    case "voyage":
      return await validateVoyageKey(apiKey)
    case "firecrawl":
      return await validateFirecrawlKey(apiKey)
    case "tavily":
      return await validateTavilyKey(apiKey)
    case "screenshotone":
      return await validateScreenshotOneKey(apiKey)
    case "apify":
      return await validateApifyKey(apiKey)
    default:
      return { valid: false, error: "Unknown provider" }
  }
}

/**
 * Validates OpenRouter API key
 *
 * Calls GET /api/v1/models with the API key
 */
async function validateOpenRouterKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": process.env.NEXT_PUBLIC_APP_NAME || "contentMachine",
      },
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" }
    }

    return { valid: false, error: "Failed to validate API key" }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}

/**
 * Validates Voyage AI API key
 *
 * Calls POST /v1/embeddings with a test input
 */
async function validateVoyageKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: "test",
        model: "voyage-large-2",
      }),
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" }
    }

    const data = await response.json().catch(() => ({}))
    return {
      valid: false,
      error: data.detail || data.message || "Failed to validate API key",
    }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}

/**
 * Validates Firecrawl API key
 *
 * Calls POST /v1/scrape with a test URL
 */
async function validateFirecrawlKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com",
        formats: ["markdown"],
      }),
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" }
    }

    return { valid: false, error: "Failed to validate API key" }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}

/**
 * Validates Tavily API key
 *
 * Calls POST /search with a test query
 */
async function validateTavilyKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: "test",
        max_results: 1,
      }),
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" }
    }

    return { valid: false, error: "Failed to validate API key" }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}

/**
 * Validates ScreenshotOne API key
 *
 * Calls the screenshot API with a test URL
 */
async function validateScreenshotOneKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch(
      `https://api.screenshotone.com/take?url=https://example.com&access_key=${apiKey}&format=jpg`
    )

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" }
    }

    return { valid: false, error: "Failed to validate API key" }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}

/**
 * Validates APIfy API key
 *
 * Calls GET /v2/actors with the API key
 */
async function validateApifyKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    const response = await fetch("https://api.apify.com/v2/actors", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" }
    }

    return { valid: false, error: "Failed to validate API key" }
  } catch (error) {
    return { valid: false, error: "Network error" }
  }
}
