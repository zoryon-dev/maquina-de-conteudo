/**
 * API Route for updating slide content
 *
 * POST /api/library/[id]/update-slide-content - Update content of a specific slide
 *
 * Suporta atualização de:
 * - Conteúdo de slide individual (carrossel)
 * - Conteúdo único (imagem/texto)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id } = await params
  const libraryItemId = Number(id)

  try {
    // Fetch the library item
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(
        and(
          eq(libraryItems.id, libraryItemId),
          eq(libraryItems.userId, userId)
        )
      )
      .limit(1)

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Library item not found" },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { slideIndex = 0, content } = body

    if (content === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing content" },
        { status: 400 }
      )
    }

    let updatedContent = item.content

    // Atualiza baseado no tipo
    if (item.type === "carousel") {
      // Parse conteúdo JSON do carrossel
      let carouselData
      try {
        carouselData = JSON.parse(item.content || "{}")
      } catch {
        carouselData = { slides: [] }
      }

      // Garante estrutura
      if (!carouselData.slides || !Array.isArray(carouselData.slides)) {
        carouselData.slides = []
      }

      // Atualiza o slide específico
      if (carouselData.slides[slideIndex]) {
        carouselData.slides[slideIndex].content = content
      } else {
        // Se o slide não existe, cria
        while (carouselData.slides.length <= slideIndex) {
          carouselData.slides.push({ content: "" })
        }
        carouselData.slides[slideIndex].content = content
      }

      updatedContent = JSON.stringify(carouselData)
    } else {
      // Para tipos não-carrossel, atualiza o conteúdo direto
      // Mantém estrutura JSON se existir
      try {
        const parsed = JSON.parse(item.content || "{}")
        if (parsed.caption) {
          parsed.caption = content
          updatedContent = JSON.stringify(parsed)
        } else {
          updatedContent = content
        }
      } catch {
        updatedContent = content
      }
    }

    // Update library item
    await db
      .update(libraryItems)
      .set({
        content: updatedContent,
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId))

    return NextResponse.json({
      success: true,
      content: updatedContent,
    })
  } catch (error) {
    console.error("Error updating slide content:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update content" },
      { status: 500 }
    )
  }
}
