/**
 * API Route for regenerating slide image
 *
 * POST /api/library/[id]/regenerate-slide-image - Regenerate image for a specific slide
 *
 * Suporta dois métodos:
 * - "template": Regenera usando template HTML (se tiver estrutura)
 * - "ai": Gera nova imagem com IA (prompt livre)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { generateAiImage } from "@/lib/wizard-services/image-generation.service"
import { generateHtmlTemplateImage } from "@/lib/wizard-services/screenshotone.service"
import type { ImageGenerationConfig } from "@/lib/wizard-services/image-types"

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
    const { slideIndex = 0, method = "template", content } = body

    // Extrai título e conteúdo do slide
    let slideTitle = item.title || ""
    let slideContent = content || ""

    if (!slideContent && item.content) {
      try {
        const parsedContent = JSON.parse(item.content)
        if (parsedContent.type === "carousel" && parsedContent.slides) {
          slideTitle = parsedContent.slides[slideIndex]?.title || slideTitle
          slideContent = parsedContent.slides[slideIndex]?.content || ""
        } else if (parsedContent.caption) {
          slideContent = parsedContent.caption
        }
      } catch {
        slideContent = item.content
      }
    }

    // Configuração padrão
    const config: ImageGenerationConfig = method === "template"
      ? { method: "html-template", htmlOptions: { template: "dark-mode", primaryColor: "#a3e635" } }
      : { method: "ai" }

    // Gera imagem baseado no método
    let imageUrl = ""

    if (method === "ai") {
      // AI image generation
      const result = await generateAiImage({
        slideNumber: slideIndex + 1,
        slideContent,
        slideTitle,
        config,
      })

      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to generate image" },
          { status: 500 }
        )
      }

      imageUrl = result.data.imageUrl
    } else {
      // HTML template method
      const result = await generateHtmlTemplateImage({
        slideNumber: slideIndex + 1,
        slideContent,
        slideTitle,
        config,
      })

      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to generate image" },
          { status: 500 }
        )
      }

      imageUrl = result.data.imageUrl
    }

    // Parse mediaUrls existentes
    let currentMediaUrls: string[] = []
    if (item.mediaUrl) {
      try {
        const parsed = JSON.parse(item.mediaUrl)
        currentMediaUrls = Array.isArray(parsed) ? parsed : []
      } catch {
        currentMediaUrls = item.mediaUrl ? [item.mediaUrl] : []
      }
    }

    // Substitui a imagem do slide específico
    const updatedMediaUrls = [...currentMediaUrls]
    updatedMediaUrls[slideIndex] = imageUrl

    // Update library item
    await db
      .update(libraryItems)
      .set({
        mediaUrl: JSON.stringify(updatedMediaUrls),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId))

    console.log(`[LIBRARY-IMAGE] Regenerated image for slide ${slideIndex} of library item ${libraryItemId}: ${imageUrl}`)

    return NextResponse.json({
      success: true,
      imageUrl,
      slideIndex,
    })
  } catch (error) {
    console.error("Error regenerating slide image:", error)
    return NextResponse.json(
      { success: false, error: "Failed to regenerate image" },
      { status: 500 }
    )
  }
}
