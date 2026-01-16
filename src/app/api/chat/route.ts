/**
 * Chat API Route (Vercel AI SDK)
 *
 * Handles streaming chat requests with optional RAG context.
 * Uses Vercel AI SDK's streamText for real-time token streaming.
 *
 * Flow:
 * 1. Receive message + RAG categories
 * 2. Fetch relevant context from indexed documents
 * 3. Augment prompt with RAG context
 * 4. Stream response using Vercel AI SDK streamText
 * 5. Return SSE stream with optional sources metadata
 */

import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { streamText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai"
import { assembleRagContext } from "@/lib/rag/assembler"
import { RAG_CATEGORIES, type RagCategory, type RagSource } from "@/lib/rag"

/**
 * Chat request body
 */
interface ChatRequestBody {
  /** User message */
  message: string
  /** Model to use (default: from config) */
  model?: string
  /** RAG categories to search */
  categories?: RagCategory[]
  /** Whether to include RAG context */
  useRag?: boolean
  /** Conversation history for context */
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>
}

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
 */
const RAG_THRESHOLD = 0.6

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
 * Streaming chat endpoint with RAG support.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return new Response("Unauthorized", { status: 401 })
    }

    const body: ChatRequestBody = await request.json()
    const {
      message,
      model = DEFAULT_TEXT_MODEL,
      categories = [...RAG_CATEGORIES] as RagCategory[],
      useRag = true,
      messages: history = [],
    } = body

    if (!message || !message.trim()) {
      return new Response("Message is required", { status: 400 })
    }

    // Prepare RAG context if enabled
    let ragContext = ""
    let sources: ChatSource[] = []
    let ragUsed = false
    let chunksIncluded = 0

    if (useRag && categories.length > 0) {
      try {
        const ragResult = await assembleRagContext(userId, message, {
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

    // Build system prompt
    const systemPrompt = ragUsed
      ? RAG_SYSTEM_PROMPT
          .replace("{RAG_CONTEXT}", ragContext)
          .replace("{RAG_SOURCES_SUMMARY}", sources.map((s) => `- ${s.documentTitle} (${s.category})`).join("\n"))
      : STANDARD_SYSTEM_PROMPT

    // Build messages array with system prompt
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.filter(m => m.role !== "system"),
      { role: "user" as const, content: message },
    ]

    // Stream response using Vercel AI SDK
    const result = streamText({
      model: openrouter(model),
      messages,
      temperature: 0.7,
      // Add metadata for RAG sources in response headers
    })

    // Return streaming response with custom headers for RAG info
    return result.toTextStreamResponse({
      headers: ragUsed ? {
        "X-RAG-Used": "true",
        "X-RAG-Chunks": chunksIncluded.toString(),
        "X-RAG-Sources": JSON.stringify(sources),
      } : undefined,
    })
  } catch (error) {
    console.error("Chat API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Failed to process chat request"

    // Return error as plain text (streaming errors are tricky)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
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
