/**
 * Chat API Route
 *
 * Handles chat requests with optional RAG context.
 *
 * Flow:
 * 1. Receive message + RAG categories
 * 2. Fetch relevant context from indexed documents
 * 3. Augment prompt with RAG context
 * 4. Call OpenRouter API
 * 5. Return response + sources used
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getOpenRouterClient } from "@/lib/openrouter"
import { assembleRagContext } from "@/lib/rag/assembler"
import { RAG_CATEGORIES, type RagCategory, type RagSource } from "@/lib/rag"

/**
 * Chat request body
 */
interface ChatRequestBody {
  /** User message */
  message: string
  /** Model to use (default: gpt-4.1) */
  model?: string
  /** RAG categories to search */
  categories?: RagCategory[]
  /** Whether to include RAG context */
  useRag?: boolean
  /** Conversation history for context */
  history?: Array<{ role: "user" | "assistant"; content: string }>
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
 * Chat response with optional RAG sources
 */
interface ChatResponseBody {
  /** AI response text */
  response: string
  /** Sources used from RAG (if any) */
  sources?: ChatSource[]
  /** Whether RAG context was used */
  ragUsed: boolean
  /** Number of chunks included in context */
  chunksIncluded?: number
  /** Error message if any */
  error?: string
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body: ChatRequestBody = await request.json()
    const {
      message,
      model = "openai/gpt-4.1",
      categories = [...RAG_CATEGORIES] as RagCategory[],
      useRag = true,
      history = [],
    } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
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

    // Build messages for OpenRouter
    const systemPrompt = ragUsed
      ? RAG_SYSTEM_PROMPT
          .replace("{RAG_CONTEXT}", ragContext)
          .replace("{RAG_SOURCES_SUMMARY}", sources.map((s) => `- ${s.documentTitle} (${s.category})`).join("\n"))
      : STANDARD_SYSTEM_PROMPT

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      { role: "user" as const, content: message },
    ]

    // Call OpenRouter
    const openrouter = await getOpenRouterClient()
    const completion = await openrouter.chat.completions.create({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta."

    const responseBody: ChatResponseBody = {
      response: responseText,
      ragUsed,
      ...(ragUsed && { sources, chunksIncluded }),
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    console.error("Chat API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Failed to process chat request"

    return NextResponse.json(
      {
        error: errorMessage,
        response: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        ragUsed: false,
      } satisfies ChatResponseBody,
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check RAG availability
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { available: false, error: "Unauthorized" },
        { status: 401 }
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

    return NextResponse.json({
      available: embeddedCount > 0,
      embeddedCount,
      categories: RAG_CATEGORIES,
    })
  } catch (error) {
    console.error("RAG availability check error:", error)

    return NextResponse.json(
      { available: false, error: "Failed to check RAG availability" },
      { status: 500 }
    )
  }
}
