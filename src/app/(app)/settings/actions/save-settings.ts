/**
 * Server Actions for saving settings
 *
 * Handles saving user settings, API keys, prompts, and variables
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  userSettings,
  userApiKeys,
  userPrompts,
  userVariables,
  systemPrompts,
  documents,
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { SYSTEM_PROMPTS_SEED } from "@/lib/system-prompts"
import { encryptApiKey } from "@/lib/encryption"
import { isAdmin } from "@/lib/auth/admin"

/**
 * Result of a save operation
 */
export interface SaveSettingsResult {
  success: boolean
  error?: string
}

/**
 * API key status (for display purposes, never returns the actual key)
 */
export interface ApiKeyStatus {
  provider: string
  hasKey: boolean
  isValid: boolean | null
  lastValidatedAt: Date | null
}

/**
 * API key data to save
 */
export interface ApiKeyData {
  provider: string
  encryptedKey: string
  nonce: string
}

/**
 * User settings data
 */
export interface UserSettingsData {
  defaultTextModel?: string
  defaultImageModel?: string
  embeddingModel?: string
  variableProcessingModel?: string
}

/**
 * Prompt data
 */
export interface PromptData {
  agent: string
  prompt: string
}

/**
 * Variable data
 */
export interface VariableData {
  variableKey: string
  variableValue: string
}

/**
 * Saves user settings (model defaults)
 *
 * @param data - User settings to save
 * @returns Promise with save result
 */
export async function saveUserSettingsAction(
  data: UserSettingsData
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Check if settings exist
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      // Update existing
      await db
        .update(userSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
    } else {
      // Insert new
      await db.insert(userSettings).values({
        userId,
        ...data,
      })
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Save user settings error:", error)
    return { success: false, error: "Failed to save settings" }
  }
}

/**
 * Saves an API key (encrypted)
 *
 * @param provider - The API provider
 * @param encryptedKey - The encrypted API key
 * @param nonce - The nonce used for encryption
 * @returns Promise with save result
 */
export async function saveApiKeyAction(
  provider: string,
  encryptedKey: string,
  nonce: string
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
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
      })
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Save API key error:", error)
    return { success: false, error: "Failed to save API key" }
  }
}

/**
 * Deletes an API key
 *
 * @param provider - The API provider
 * @returns Promise with save result
 */
export async function deleteApiKeyAction(
  provider: string
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Delete API key error:", error)
    return { success: false, error: "Failed to delete API key" }
  }
}

/**
 * Updates the validation status of an API key
 *
 * @param provider - The API provider
 * @param isValid - Whether the key is valid
 * @returns Promise with save result
 */
export async function updateApiKeyValidationAction(
  provider: string,
  isValid: boolean | null
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(userApiKeys)
      .set({
        isValid,
        lastValidatedAt: new Date(),
      })
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))

    return { success: true }
  } catch (error) {
    console.error("Update API key validation error:", error)
    return { success: false, error: "Failed to update validation status" }
  }
}

/**
 * Saves a user prompt
 *
 * @param agent - The agent (zory, estrategista, etc.)
 * @param prompt - The prompt text
 * @returns Promise with save result
 */
export async function savePromptAction(
  agent: string,
  prompt: string
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Check if prompt exists for this agent
    const existing = await db
      .select()
      .from(userPrompts)
      .where(and(eq(userPrompts.userId, userId), eq(userPrompts.agent, agent)))
      .limit(1)

    if (existing.length > 0) {
      // Update existing
      await db
        .update(userPrompts)
        .set({
          prompt,
          updatedAt: new Date(),
        })
        .where(and(eq(userPrompts.userId, userId), eq(userPrompts.agent, agent)))
    } else {
      // Insert new
      await db.insert(userPrompts).values({
        userId,
        agent,
        prompt,
      })
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Save prompt error:", error)
    return { success: false, error: "Failed to save prompt" }
  }
}

/**
 * Deletes a user prompt (resets to system default)
 *
 * @param agent - The agent
 * @returns Promise with save result
 */
export async function deletePromptAction(agent: string): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(userPrompts)
      .where(and(eq(userPrompts.userId, userId), eq(userPrompts.agent, agent)))

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Delete prompt error:", error)
    return { success: false, error: "Failed to delete prompt" }
  }
}

/**
 * Saves a user variable
 *
 * @param variableKey - The variable key
 * @param variableValue - The variable value
 * @returns Promise with save result
 */
export async function saveVariableAction(
  variableKey: string,
  variableValue: string
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Check if variable exists
    const existing = await db
      .select()
      .from(userVariables)
      .where(and(eq(userVariables.userId, userId), eq(userVariables.variableKey, variableKey)))
      .limit(1)

    if (existing.length > 0) {
      // Update existing
      await db
        .update(userVariables)
        .set({
          variableValue,
          updatedAt: new Date(),
        })
        .where(and(eq(userVariables.userId, userId), eq(userVariables.variableKey, variableKey)))
    } else {
      // Insert new
      await db.insert(userVariables).values({
        userId,
        variableKey,
        variableValue,
      })
    }

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Save variable error:", error)
    return { success: false, error: "Failed to save variable" }
  }
}

/**
 * Deletes a user variable
 *
 * @param variableKey - The variable key
 * @returns Promise with save result
 */
export async function deleteVariableAction(
  variableKey: string
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(userVariables)
      .where(and(eq(userVariables.userId, userId), eq(userVariables.variableKey, variableKey)))

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Delete variable error:", error)
    return { success: false, error: "Failed to delete variable" }
  }
}

/**
 * Seeds system prompts into the database
 *
 * This action should be called once to populate the system_prompts table
 * with the default prompts defined in src/lib/system-prompts.ts
 *
 * @returns Promise with save result
 */
export async function seedSystemPromptsAction(): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isAdmin(userId)) {
    return { success: false, error: "Forbidden" }
  }

  try {
    for (const promptData of SYSTEM_PROMPTS_SEED) {
      const existing = await db
        .select()
        .from(systemPrompts)
        .where(eq(systemPrompts.agent, promptData.agent))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(systemPrompts).values({
          agent: promptData.agent,
          prompt: promptData.prompt,
          version: promptData.version,
        })
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Seed system prompts error:", error)
    return { success: false, error: "Failed to seed system prompts" }
  }
}

/**
 * Fetches all system prompts
 *
 * @returns Promise with system prompts
 */
export async function getSystemPromptsAction() {
  const { userId } = await auth()
  if (!userId) {
    return []
  }

  try {
    const prompts = await db.select().from(systemPrompts).orderBy(systemPrompts.agent)
    return prompts
  } catch (error) {
    console.error("Get system prompts error:", error)
    return []
  }
}

/**
 * Fetches user prompts for the current user
 *
 * @returns Promise with user prompts
 */
export async function getUserPromptsAction() {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const prompts = await db
      .select()
      .from(userPrompts)
      .where(eq(userPrompts.userId, userId))
      .orderBy(userPrompts.agent)
    return prompts
  } catch (error) {
    console.error("Get user prompts error:", error)
    return []
  }
}

/**
 * Document metadata for upload
 */
export interface DocumentMetadata {
  title: string
  type: string
  category?: string
  content: string
}

/**
 * Result of document upload
 */
export interface DocumentUploadResult {
  success: boolean
  error?: string
  documentId?: number
}

/**
 * Uploads a document for RAG
 *
 * @param metadata - Document metadata and content
 * @returns Promise with upload result
 */
export async function uploadDocumentAction(
  metadata: DocumentMetadata
): Promise<DocumentUploadResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const [document] = await db
      .insert(documents)
      .values({
        userId,
        title: metadata.title,
        fileType: metadata.type,
        category: metadata.category ?? "general",
        content: metadata.content,
        embedded: false, // Will be embedded by a background job
      })
      .returning()

    return {
      success: true,
      documentId: document.id,
    }
  } catch (error) {
    console.error("Upload document error:", error)
    return { success: false, error: "Failed to upload document" }
  }
}

/**
 * Deletes a document
 *
 * @param documentId - The document ID to delete
 * @returns Promise with delete result
 */
export async function deleteDocumentAction(
  documentId: number
): Promise<SaveSettingsResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Delete document error:", error)
    return { success: false, error: "Failed to delete document" }
  }
}

/**
 * Fetches all documents for the current user
 *
 * @returns Promise with documents
 */
export async function getDocumentsAction() {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(documents.createdAt)

    return userDocuments
  } catch (error) {
    console.error("Get documents error:", error)
    return []
  }
}

/**
 * Fetches API key status for all providers
 *
 * Returns only status information (hasKey, isValid), never the actual key value.
 * This is safe to use in Client Components.
 *
 * @returns Promise with API key statuses
 */
export async function getApiKeysStatusAction(): Promise<Record<string, ApiKeyStatus>> {
  const { userId } = await auth()

  if (!userId) {
    return {}
  }

  try {
    const keys = await db
      .select({
        provider: userApiKeys.provider,
        isValid: userApiKeys.isValid,
        lastValidatedAt: userApiKeys.lastValidatedAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))

    // Convert to record with hasKey flag
    const result: Record<string, ApiKeyStatus> = {}
    for (const key of keys) {
      result[key.provider] = {
        provider: key.provider,
        hasKey: true,
        isValid: key.isValid,
        lastValidatedAt: key.lastValidatedAt,
      }
    }

    return result
  } catch (error) {
    console.error("Get API keys status error:", error)
    return {}
  }
}

/**
 * Fetches all user variables for the current user
 *
 * Returns a record of variableKey -> variableValue for all saved variables.
 * This is safe to use in Client Components.
 *
 * @returns Promise with user variables record
 */
export async function getUserVariablesAction(): Promise<Record<string, string>> {
  const { userId } = await auth()

  if (!userId) {
    return {}
  }

  try {
    const variables = await db
      .select({
        variableKey: userVariables.variableKey,
        variableValue: userVariables.variableValue,
      })
      .from(userVariables)
      .where(eq(userVariables.userId, userId))

    // Convert to record for easier consumption
    const result: Record<string, string> = {}
    for (const variable of variables) {
      result[variable.variableKey] = variable.variableValue
    }

    return result
  } catch (error) {
    console.error("Get user variables error:", error)
    return {}
  }
}
