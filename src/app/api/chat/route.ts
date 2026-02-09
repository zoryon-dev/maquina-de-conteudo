/**
 * Chat API Route (Vercel AI SDK + Zep Multi-Agent)
 *
 * Handles streaming chat requests with:
 * - Multi-agent support via Zep Cloud
 * - Optional RAG context from indexed documents
 * - Agent-specific system prompts and context templates
 *
 * Flow:
 * 1. Receive message + agent + RAG categories
 * 2. Fetch agent context from Zep (if configured)
 * 3. Fetch relevant RAG context from documents
 * 4. Build agent-specific system prompt
 * 5. Stream response using Vercel AI SDK
 * 6. Save messages to Zep thread (async, non-blocking)
 */

import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL, AVAILABLE_TEXT_MODELS } from "@/lib/ai"
import { assembleRagContext } from "@/lib/rag/assembler"
import { RAG_CATEGORIES, type RagCategory, type RagSource } from "@/lib/rag"
import {
  buildAgentSystemPrompt,
  addMessageToThread,
  isZepConfigured,
} from "@/lib/zep"
import type { AgentType } from "@/lib/agents"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { z } from "zod"

/**
 * Zod schema for chat request validation
 */
const chatMessagePartSchema = z.object({
  type: z.string(),
  text: z.string().max(50000).optional(),
}).passthrough()

const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(chatMessagePartSchema).optional(),
  content: z.string().max(50000).optional(),
}).passthrough()

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100).optional(),
  message: z.string().max(50000).optional(),
  model: z.string().max(100).optional(),
  agent: z.enum(["zory", "estrategista", "criador", "calendario"]).optional(),
  zepThreadId: z.string().max(200).nullable().optional(),
  categories: z.array(z.enum(["general", "products", "offers", "brand", "audience", "competitors", "content"])).max(20).optional(),
  useRag: z.boolean().optional(),
})

/**
 * Chat source with text for display
 */
interface ChatSource {
  documentTitle: string
  category: string
  text: string
  score: number
}

/**
 * Maximum tokens for RAG context
 */
const MAX_RAG_TOKENS = 8000

/**
 * Similarity threshold for RAG
 * Lowered from 0.6 to 0.5 for better recall
 */
const RAG_THRESHOLD = 0.5

/**
 * Maximum chunks to retrieve
 */
const MAX_CHUNKS = 5

/**
 * System prompt for RAG-enhanced chat
 */
const RAG_SYSTEM_PROMPT = `Você é um assistente especialista em criação de conteúdo para redes sociais.

Use o contexto fornecido abaixo para responder às perguntas do usuário. Quando você usar informações do contexto, cite a fonte entre colchetes como [Nome do Documento].

Se a pergunta não puder ser respondida com o contexto fornecido, diga que não possui essa informação específica, mas ofereça o que puder ajudar com seu conhecimento geral.

Contexto relevante:
{RAG_CONTEXT}

Fontes usadas:
{RAG_SOURCES_SUMMARY}`

/**
 * Standard system prompt without RAG
 */
const STANDARD_SYSTEM_PROMPT = `Você é um assistente especialista em criação de conteúdo para redes sociais.

Ajude o usuário a criar textos envolventes, planejar calendários editorial, e desenvolver estratégias de conteúdo.`

/**
 * POST /api/chat
 *
 * Streaming chat endpoint with multi-agent and RAG support.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if AI is configured
    if (!openrouter) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { userId } = await auth()

    if (!userId) {
      return new Response("Unauthorized", { status: 401 })
    }

    const rateLimited = await checkRateLimit(userId, "ai")
    if (rateLimited) return rateLimited

    const rawBody = await request.json()
    const parseResult = chatRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    const body = parseResult.data

    const {
      messages: sdkMessages,
      message: legacyMessage,
      model: requestedModel = DEFAULT_TEXT_MODEL,
      agent = "zory",
      zepThreadId = null,
      categories = [...RAG_CATEGORIES] as RagCategory[],
      useRag = true,
    } = body

    // Validate model against allowlist
    const model = (AVAILABLE_TEXT_MODELS as readonly string[]).includes(requestedModel)
      ? requestedModel
      : DEFAULT_TEXT_MODEL

    // Extract user message for RAG from either SDK format or legacy format
    let userMessage = ""

    // Cast to UIMessage[] for SDK compatibility (validated by Zod above)
    const typedSdkMessages = sdkMessages as UIMessage[] | undefined

    if (typedSdkMessages && typedSdkMessages.length > 0) {
      // Vercel AI SDK v3 format: messages array with parts
      const lastMessage = typedSdkMessages[typedSdkMessages.length - 1]
      if (lastMessage.role === "user") {
        // Extract text from parts
        if (lastMessage.parts) {
          userMessage = lastMessage.parts
            .filter((p) => p.type === "text" && "text" in p && p.text)
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("")
        }
      }
    } else if (legacyMessage) {
      // Legacy format for backward compatibility
      userMessage = legacyMessage
    }

    if (!userMessage || !userMessage.trim()) {
      return new Response("Message is required", { status: 400 })
    }

    // Prepare messages for streamText
    // Use SDK messages directly, or create a simple user message for legacy format
    let messagesForStream = typedSdkMessages
    if (!messagesForStream && legacyMessage) {
      messagesForStream = [{
        role: "user",
        parts: [{ type: "text", text: legacyMessage }],
        id: crypto.randomUUID(),
      }] satisfies UIMessage[]
    }

    // Prepare RAG context if enabled
    let ragContext = ""
    let sources: ChatSource[] = []
    let ragUsed = false
    let chunksIncluded = 0

    if (useRag && categories.length > 0) {
      try {
        const ragResult = await assembleRagContext(userId, userMessage, {
          categories,
          threshold: RAG_THRESHOLD,
          maxChunks: MAX_CHUNKS,
          maxTokens: MAX_RAG_TOKENS,
          includeSources: true,
        })

        ragContext = ragResult.context
        chunksIncluded = ragResult.chunksIncluded

        // Transform RagSource to ChatSource
        sources = ragResult.sources.map((s: RagSource) => ({
          documentTitle: s.title,
          category: s.category,
          text: `Trecho do documento "${s.title}"`,
          score: s.score,
        }))

        ragUsed = ragContext.length > 0
      } catch (ragError) {
        console.error("RAG error:", ragError)
        // Continue without RAG on error
      }
    }

    // Build agent-specific system prompt with Zep context
    let systemPrompt: string

    if (isZepConfigured() && zepThreadId) {
      // Use agent-specific system prompt with Zep context
      systemPrompt = await buildAgentSystemPrompt(zepThreadId, agent)

      // Append RAG context if used
      if (ragUsed) {
        systemPrompt += `

# CONTEXTO DE DOCUMENTOS
${ragContext}

Fontes usadas:
${sources.map((s) => `- ${s.documentTitle} (${s.category})`).join("\n")}`
      }
    } else {
      // Fall back to standard prompts without Zep
      systemPrompt = ragUsed
        ? RAG_SYSTEM_PROMPT
            .replace("{RAG_CONTEXT}", ragContext)
            .replace(
              "{RAG_SOURCES_SUMMARY}",
              sources.map((s) => `- ${s.documentTitle} (${s.category})`).join("\n")
            )
        : STANDARD_SYSTEM_PROMPT
    }

    // Build system prompt with RAG context
    // The SDK will handle message conversion via convertToModelMessages
    const systemPromptWithRag = systemPrompt

    // Convert UI messages to model format using SDK utility
    // This handles the conversion from parts format to model format automatically
    const modelMessages = await convertToModelMessages(messagesForStream || [])

    // Stream response using Vercel AI SDK
    // Pass system prompt separately to ensure it's applied correctly
    const result = streamText({
      model: openrouter(model),
      system: systemPromptWithRag,
      messages: modelMessages,
      temperature: 0.7,
    })

    // Save user message to Zep thread (async, non-blocking)
    if (zepThreadId && isZepConfigured()) {
      // Don't await - let this happen in the background
      addMessageToThread(zepThreadId, "user", userMessage, {
        agent,
        model,
      }).catch((err) => console.error("Failed to save user message to Zep:", err))
    }

    // Return streaming response with UI message stream format
    // This is required for useChat hook compatibility
    const response = result.toUIMessageStreamResponse({
      headers: {
        ...(ragUsed
          ? {
              "X-RAG-Used": "true",
              "X-RAG-Chunks": chunksIncluded.toString(),
              "X-RAG-Sources": JSON.stringify(sources),
            }
          : {}),
        "X-Agent": agent,
        "X-Zep-Configured": isZepConfigured() ? "true" : "false",
      } as Record<string, string>,
    })

    return response
  } catch (error) {
    console.error("Chat API error:", error)

    // Return error as plain text (streaming errors are tricky)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * GET /api/chat
 *
 * Check RAG availability endpoint.
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return new Response(
        JSON.stringify({ available: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Check if user has any embedded documents
    const { db } = await import("@/db")
    const { documents } = await import("@/db/schema")
    const { eq, and, isNull } = await import("drizzle-orm")
    const { count } = await import("drizzle-orm")

    const result = await db
      .select({ count: count() })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          eq(documents.embedded, true),
          isNull(documents.deletedAt)
        )
      )

    const embeddedCount = result[0]?.count || 0

    return new Response(
      JSON.stringify({
        available: embeddedCount > 0,
        embeddedCount,
        categories: RAG_CATEGORIES,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("RAG availability check error:", error)

    return new Response(
      JSON.stringify({ available: false, error: "Failed to check RAG availability" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
