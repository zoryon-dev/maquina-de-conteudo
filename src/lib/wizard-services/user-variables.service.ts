/**
 * User Variables Service for Wizard
 *
 * Handles fetching and formatting user variables for prompt injection.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Fetches user variables from database
 * - Formats variables into a structured context block for prompts
 * - Variables are injected into content generation prompts automatically
 * - Gracefully handles missing/empty variables
 */

import { db } from "@/db"
import { userVariables } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// ============================================================================
// TYPES
// ============================================================================

/**
 * User variables record
 */
export interface UserVariables {
  tone?: string
  brandVoice?: string
  niche?: string
  targetAudience?: string
  audienceFears?: string
  audienceDesires?: string
  negativeTerms?: string
  differentiators?: string
  contentGoals?: string
  preferredCTAs?: string
}

/**
 * Formatted variables context for prompt injection
 */
export interface FormattedVariablesContext {
  hasVariables: boolean
  context: string
  negativeTermsArray: string[]
}

// ============================================================================
// VARIABLES CONFIGURATION
// ============================================================================

/**
 * Variable labels for formatting
 */
const VARIABLE_LABELS: Record<string, string> = {
  tone: "Tom de Voz",
  brandVoice: "Voz da Marca",
  niche: "Nichos de Atuação",
  targetAudience: "Público-Alvo",
  audienceFears: "Medos e Dores",
  audienceDesires: "Desejos e Aspirações",
  negativeTerms: "Termos Proibidos",
  differentiators: "Diferenciais",
  contentGoals: "Objetivos do Conteúdo",
  preferredCTAs: "CTAs Preferidos",
}

/**
 * Variables that should be formatted as comma-separated arrays
 */
const ARRAY_FORMAT_VARIABLES = new Set(["negativeTerms"])

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch user variables from database.
 *
 * This is a server-side function that retrieves all saved variables for the current user.
 * Returns empty object if no variables are set or user is not authenticated.
 *
 * @param userId - Optional user ID (for use in workers/background jobs)
 * @returns Promise with user variables record
 *
 * @example
 * ```ts
 * // In request context (uses Clerk auth)
 * const variables = await getUserVariables()
 *
 * // In worker/background job (pass userId from job payload)
 * const variables = await getUserVariables(job.userId)
 * // { tone: "Profissional e acessível", niche: "Ecommerce de moda", ... }
 * ```
 */
export async function getUserVariables(userId?: string): Promise<UserVariables> {
  // If userId is not provided, try to get it from Clerk auth
  const resolvedUserId = userId || (await auth()).userId

  if (!resolvedUserId) {
    console.log(`[USER-VARIABLES] ⚠️ Nenhum userId disponível (auth falhou ou userId não passado)`)
    return {}
  }

  try {
    const variables = await db
      .select({
        variableKey: userVariables.variableKey,
        variableValue: userVariables.variableValue,
      })
      .from(userVariables)
      .where(eq(userVariables.userId, resolvedUserId))

    console.log(`[USER-VARIABLES] 📊 Busca no banco: ${variables.length} variáveis encontradas para userId=${resolvedUserId.substring(0, 8)}...`)

    // Convert to record with proper typing
    const result: UserVariables = {}
    for (const variable of variables) {
      if (variable.variableValue?.trim()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[variable.variableKey] = variable.variableValue
      }
    }

    return result
  } catch (error) {
    console.error(`[USER-VARIABLES] ❌ Erro ao buscar variáveis:`, error)
    return {}
  }
}

// ============================================================================
// FORMAT FUNCTIONS
// ============================================================================

/**
 * Format user variables into a context block for prompt injection.
 *
 * Creates a structured text block that can be appended to any prompt
 * to provide the AI with user-specific context. The block is designed
 * to be non-intrusive and doesn't break existing prompt structures.
 *
 * @param variables - User variables record
 * @returns Formatted context object
 *
 * @example
 * ```ts
 * const { context, negativeTermsArray } = formatVariablesForPrompt({
 *   tone: "Profissional e acessível",
 *   niche: "Ecommerce de moda",
 *   negativeTerms: "Oba, é assim que, gente"
 * })
 * // context: "═══════════════════════════════════════..."
 * // negativeTermsArray: ["Oba", "é assim que", "gente"]
 * ```
 */
export function formatVariablesForPrompt(variables: UserVariables): FormattedVariablesContext {
  const filledKeys = Object.keys(variables).filter((key) => {
    const value = variables[key as keyof UserVariables]
    return value && value.trim().length > 0
  })

  // No variables set
  if (filledKeys.length === 0) {
    return {
      hasVariables: false,
      context: "",
      negativeTermsArray: [],
    }
  }

  // Extract negativeTerms separately for easy use
  const negativeTermsValue = variables.negativeTerms || ""
  const negativeTermsArray = negativeTermsValue
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  // Build context block
  const lines: string[] = []
  lines.push("═══════════════════════════════════════")
  lines.push("VARIÁVEIS DE PERSONALIZAÇÃO DO USUÁRIO")
  lines.push("═══════════════════════════════════════")
  lines.push("")
  lines.push("Use as informações abaixo para personalizar o conteúdo:")

  // Add each filled variable
  for (const key of filledKeys) {
    if (key === "negativeTerms") continue // Skip negativeTerms from the main list (handled separately)

    const label = VARIABLE_LABELS[key] || key
    const value = variables[key as keyof UserVariables]
    lines.push(`• ${label}: ${value}`)
  }

  lines.push("")
  lines.push("═══════════════════════════════════════")

  return {
    hasVariables: true,
    context: lines.join("\n"),
    negativeTermsArray,
  }
}

/**
 * Create an enhanced prompt with user variables injected.
 *
 * This function wraps an existing prompt and adds the user variables
 * context at the end, ensuring the AI has access to personalized
 * information without breaking the original prompt structure.
 *
 * @param originalPrompt - The original prompt text
 * @param variables - User variables record
 * @returns Enhanced prompt with variables context
 */
export function enhancePromptWithVariables(
  originalPrompt: string,
  variables: UserVariables
): string {
  const { context, hasVariables } = formatVariablesForPrompt(variables)

  if (!hasVariables) {
    return originalPrompt
  }

  // Add variables context at the end of the prompt
  return `${originalPrompt}\n\n${context}`
}

// ============================================================================
// NEGATIVE TERMS HELPER
// ============================================================================

/**
 * Get negative terms array from variables.
 *
 * Parses the negativeTerms string into an array of individual terms
 * for easy filtering/validation use.
 *
 * @param variables - User variables record
 * @returns Array of negative terms (lowercase, trimmed)
 */
export function getNegativeTermsArray(variables: UserVariables): string[] {
  const negativeTermsValue = variables.negativeTerms || ""
  return negativeTermsValue
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
}

/**
 * Check if a given text contains any negative terms.
 *
 * Useful for validating generated content against user's restrictions.
 *
 * @param text - Text to check
 * @param variables - User variables record
 * @returns Array of found negative terms (empty if none found)
 */
export function checkForNegativeTerms(text: string, variables: UserVariables): string[] {
  const negativeTerms = getNegativeTermsArray(variables)
  const lowerText = text.toLowerCase()

  return negativeTerms.filter((term) => lowerText.includes(term))
}
