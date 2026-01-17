/**
 * Zep Session Management
 *
 * Handles multi-agent sessions with Zep Cloud threads.
 * Each user can have one thread with multiple agent sessions.
 *
 * Key concepts:
 * - Thread: Zep conversation thread (persists all messages)
 * - Agent Session: Logical session with a specific agent
 * - Context Sharing: Switching agents preserves conversation history
 *
 * @see https://help.getzep.com/threads
 */

import { zepClient, withZepRetry, isZepConfigured } from "./client"
import type { AgentType } from "@/lib/agents"

/**
 * Zep session information
 */
export interface ZepSession {
  userId: string
  threadId: string
  currentAgent: AgentType
  agentSessionId: string
  createdAt: string
  updatedAt: string
}

/**
 * Result of session operations
 */
export interface SessionResult {
  success: boolean
  session?: ZepSession
  error?: string
}

/**
 * Message metadata for Zep
 */
export interface MessageMetadata {
  agent?: AgentType
  timestamp?: string
  messageId?: string
  model?: string
  [key: string]: unknown
}

/**
 * Create a new Zep session
 *
 * Creates a new thread in Zep Cloud for the user.
 * Note: Users are automatically created in Zep when the first thread is created.
 *
 * @param clerkUserId - The Clerk user ID
 * @param agent - The initial agent (default: "zory")
 * @returns The created session or error
 */
export async function createZepSession(
  clerkUserId: string,
  agent: AgentType = "zory"
): Promise<SessionResult> {
  if (!isZepConfigured()) {
    return {
      success: false,
      error: "Zep não está configurado",
    }
  }

  try {
    // Generate IDs
    const threadId = crypto.randomUUID()
    const agentSessionId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create the thread - user is automatically created in Zep
    await withZepRetry(() =>
      zepClient.thread.create({
        threadId,
        userId: clerkUserId,
      })
    )

    const session: ZepSession = {
      userId: clerkUserId,
      threadId,
      currentAgent: agent,
      agentSessionId,
      createdAt: now,
      updatedAt: now,
    }

    return { success: true, session }
  } catch (error) {
    return {
      success: false,
      error: `Erro ao criar sessão: ${(error as Error).message}`,
    }
  }
}

/**
 * Add a message to the Zep thread
 *
 * @param threadId - The Zep thread ID
 * @param role - "user" or "assistant"
 * @param content - Message content
 * @param metadata - Optional metadata
 */
export async function addMessageToThread(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: MessageMetadata
): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  try {
    await withZepRetry(() =>
      zepClient.thread.addMessages(threadId, {
        messages: [
          {
            role,
            content,
            metadata: metadata
              ? {
                  ...metadata,
                  timestamp: new Date().toISOString(),
                }
              : undefined,
          },
        ],
      })
    )
  } catch (error) {
    console.error("Zep: Erro ao adicionar mensagem:", error)
    // Don't throw - chat should continue even if Zep fails
  }
}

/**
 * Add multiple messages (e.g., conversation history)
 *
 * @param threadId - The Zep thread ID
 * @param messages - Array of messages to add
 */
export async function addMessagesToThread(
  threadId: string,
  messages: Array<{
    role: "user" | "assistant"
    content: string
    metadata?: MessageMetadata
  }>
): Promise<void> {
  if (!isZepConfigured() || messages.length === 0) {
    return
  }

  try {
    await withZepRetry(() =>
      zepClient.thread.addMessages(threadId, {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata
            ? {
                ...msg.metadata,
                timestamp: msg.metadata.timestamp || new Date().toISOString(),
              }
            : undefined,
        })),
      })
    )
  } catch (error) {
    console.error("Zep: Erro ao adicionar mensagens:", error)
  }
}

/**
 * Get agent context from Zep
 *
 * Retrieves the formatted context for a specific agent
 * based on their context template.
 *
 * @param threadId - The Zep thread ID
 * @param agent - The agent to get context for
 * @returns The formatted context string
 */
export async function getAgentContext(
  threadId: string,
  agent: AgentType
): Promise<string> {
  if (!isZepConfigured()) {
    return ""
  }

  try {
    const templateId = `${agent}-context`

    const response = await withZepRetry(() =>
      zepClient.thread.getUserContext(threadId, {
        templateId,
      })
    )

    return response.context || ""
  } catch (error) {
    console.error("Zep: Erro ao obter contexto:", error)
    return ""
  }
}

/**
 * Switch to a different agent in the same thread
 *
 * Updates the thread metadata to reflect the new agent.
 * Context is preserved between agent switches.
 *
 * Note: Zep Cloud doesn't support updating thread metadata directly.
 * This function should be used to update local state, and the agent
 * change will be reflected in subsequent messages via the metadata field.
 *
 * @param threadId - The Zep thread ID
 * @param newAgent - The agent to switch to
 */
export async function switchAgent(
  threadId: string,
  newAgent: AgentType
): Promise<void> {
  // Zep Cloud doesn't have a thread.update method
  // Agent switching is tracked locally via the currentAgent field
  // The context will be retrieved based on the current agent
  // This function is a placeholder for potential future API support

  if (!isZepConfigured()) {
    return
  }

  try {
    // Add a system message noting the agent switch
    await withZepRetry(() =>
      zepClient.thread.addMessages(threadId, {
        messages: [
          {
            role: "system",
            content: `Agente alterado para: ${newAgent}`,
            metadata: {
              agentSwitch: true,
              newAgent,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      })
    )
  } catch (error) {
    console.error("Zep: Erro ao registrar troca de agente:", error)
  }
}

/**
 * Get thread history
 *
 * @param threadId - The Zep thread ID
 * @param limit - Maximum number of messages to retrieve
 * @returns Array of messages
 */
export async function getThreadHistory(
  threadId: string,
  limit = 50
): Promise<Array<{ role: string; content: string; timestamp?: string }>> {
  if (!isZepConfigured()) {
    return []
  }

  try {
    const response = await withZepRetry(() =>
      zepClient.thread.get(threadId, {
        limit,
      })
    )

    // Zep returns messages in the thread
    const messages =
      response.messages?.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      })) || []

    return messages
  } catch (error) {
    console.error("Zep: Erro ao obter histórico:", error)
    return []
  }
}

/**
 * Delete a thread
 *
 * @param threadId - The Zep thread ID to delete
 */
export async function deleteThread(threadId: string): Promise<void> {
  if (!isZepConfigured()) {
    return
  }

  try {
    await withZepRetry(() => zepClient.thread.delete(threadId))
  } catch (error) {
    console.error("Zep: Erro ao deletar thread:", error)
  }
}

/**
 * Get all threads for a user
 *
 * Note: Zep Cloud doesn't have a direct "list threads by user" endpoint.
 * This function is a placeholder for future API support.
 * Thread tracking should be handled in the local database.
 *
 * @param _userId - The Clerk user ID (unused, kept for interface compatibility)
 * @returns Empty array (threads should be tracked locally)
 */
export async function getUserThreads(
  _userId: string
): Promise<Array<{ threadId: string; createdAt: string }>> {
  // Zep Cloud doesn't have a "list threads by user" endpoint
  // Thread tracking should be handled in the local database schema
  return []
}

/**
 * Build the full system prompt for an agent
 *
 * Combines the agent's base system prompt with
 * the Zep context (if available).
 *
 * @param threadId - The Zep thread ID (optional)
 * @param agent - The agent type
 * @returns The complete system prompt
 */
export async function buildAgentSystemPrompt(
  threadId: string | null,
  agent: AgentType
): Promise<string> {
  // Get the base system prompt
  const { getSystemPrompt } = await import("@/lib/agents")
  const basePrompt = getSystemPrompt(agent)

  // If no thread ID, return base prompt only
  if (!threadId || !isZepConfigured()) {
    return basePrompt
  }

  // Get Zep context for this agent
  const zepContext = await getAgentContext(threadId, agent)

  // If no context, return base prompt
  if (!zepContext) {
    return basePrompt
  }

  // Combine base prompt with context
  return `${basePrompt}

# CONTEXTO DO USUÁRIO
${zepContext}`
}
