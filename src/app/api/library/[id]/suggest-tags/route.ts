/**
 * POST /api/library/[id]/suggest-tags
 *
 * Utiliza IA para sugerir tags relevantes baseadas no conteudo de um item da biblioteca.
 * Retorna 3-5 tags em portugues.
 */

import { NextResponse } from "next/server"
import { generateText } from "ai"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { openrouter } from "@/lib/ai/config"
import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import { eq } from "drizzle-orm"

// Use a fast, cheap model for tag suggestion
const TAG_SUGGESTION_MODEL = "openai/gpt-4.1-mini"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return NextResponse.json(
      { success: false, error: "Nao autenticado" },
      { status: 401 }
    )
  }

  if (!openrouter) {
    return NextResponse.json(
      { success: false, error: "IA nao configurada" },
      { status: 503 }
    )
  }

  const { id } = await params
  const libraryItemId = parseInt(id)

  if (isNaN(libraryItemId)) {
    return NextResponse.json(
      { success: false, error: "ID invalido" },
      { status: 400 }
    )
  }

  try {
    // Fetch the library item
    const [item] = await db
      .select({
        title: libraryItems.title,
        content: libraryItems.content,
        type: libraryItems.type,
        userId: libraryItems.userId,
      })
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1)

    if (!item || item.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Item nao encontrado" },
        { status: 404 }
      )
    }

    // Build content string for the LLM
    const contentParts: string[] = []
    if (item.title) contentParts.push(`Titulo: ${item.title}`)
    if (item.content) {
      // Try to parse JSON content for caption
      try {
        const parsed = JSON.parse(item.content)
        if (parsed.caption) contentParts.push(`Legenda: ${parsed.caption}`)
        else contentParts.push(`Conteudo: ${item.content.slice(0, 500)}`)
      } catch {
        contentParts.push(`Conteudo: ${item.content.slice(0, 500)}`)
      }
    }
    if (item.type) contentParts.push(`Tipo: ${item.type}`)

    const contentText = contentParts.join("\n")

    if (!contentText.trim()) {
      return NextResponse.json({
        success: true,
        tags: [],
      })
    }

    const { text } = await generateText({
      model: openrouter(TAG_SUGGESTION_MODEL),
      prompt: `Baseado no seguinte conteudo de post para redes sociais, sugira 3-5 tags relevantes em portugues brasileiro.
As tags devem ser curtas (1-3 palavras), descritivas e uteis para categorizar o conteudo.
Retorne APENAS as tags separadas por virgula, sem hashtag, sem numeracao, sem explicacao.

${contentText}`,
      maxOutputTokens: 100,
      temperature: 0.7,
    })

    // Parse the response into tags array
    const tags = text
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0 && tag.length <= 30)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      tags,
    })
  } catch (error) {
    console.error("[SUGGEST-TAGS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao sugerir tags",
      },
      { status: 500 }
    )
  }
}
