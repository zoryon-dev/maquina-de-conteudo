/**
 * POST /api/library/[id]/regenerate-slide
 *
 * Regenera uma imagem específica de um carrossel com texto editado.
 * Usa o mesmo template HTML mas com os textos atualizados.
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems, contentWizards } from "@/db/schema"
import { eq } from "drizzle-orm"
import { generateHtmlTemplateImage } from "@/lib/wizard-services/screenshotone.service"
import { getStorageProvider } from "@/lib/storage"

interface RegenerateSlideRequest {
  slideIndex: number
  editedData: {
    headline?: string
    descricao?: string
    subtitulo?: string
    paragrafo1?: string
    paragrafo2?: string
    destaque?: string
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const libraryItemId = parseInt(id)

  if (isNaN(libraryItemId)) {
    return NextResponse.json({ error: "Invalid library item ID" }, { status: 400 })
  }

  try {
    const body = await request.json() as RegenerateSlideRequest
    const { slideIndex, editedData } = body

    // Buscar o item da biblioteca
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1)

    if (!item) {
      return NextResponse.json({ error: "Library item not found" }, { status: 404 })
    }

    // Parse mediaUrl para obter as imagens atuais
    const mediaUrls: string[] = item.mediaUrl
      ? Array.isArray(item.mediaUrl)
        ? item.mediaUrl
        : JSON.parse(item.mediaUrl)
      : []

    if (slideIndex < 0 || slideIndex >= mediaUrls.length) {
      return NextResponse.json({ error: "Invalid slide index" }, { status: 400 })
    }

    // Buscar o wizard associado para obter a configuração
    const [wizard] = await db
      .select()
      .from(contentWizards)
      .where(eq(contentWizards.libraryItemId, libraryItemId))
      .limit(1)

    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found for this item" }, { status: 404 })
    }

    // Obter as imagens geradas para pegar a configuração
    const generatedImages = wizard.generatedImages as unknown as Array<{
      method: string
      template?: string
      config?: any
    }> || []

    const slideConfig = generatedImages[slideIndex]

    if (!slideConfig || slideConfig.method !== "html-template") {
      return NextResponse.json({
        error: "This slide was not generated using HTML templates and cannot be text-edited"
      }, { status: 400 })
    }

    // Obter os slides do generatedContent para pegar o conteúdo original
    const generatedContent = wizard.generatedContent as unknown as {
      slides?: Array<{ title?: string; content: string; headline?: string }>
    } | null

    const slideContent = generatedContent?.slides?.[slideIndex]

    // Preparar os dados do template com os textos editados
    const templateData: Record<string, string> = {
      headline: editedData.headline || slideContent?.headline || slideContent?.title || "",
      content: editedData.descricao || slideContent?.content || "",
      descricao: editedData.descricao || slideContent?.content || "",
      subtitulo: editedData.subtitulo || "",
      paragrafo1: editedData.paragrafo1 || "",
      paragrafo2: editedData.paragrafo2 || "",
      destaque: editedData.destaque || "",
    }

    // Determinar o tipo de template baseado no slideConfig.template
    let templateType: "dark-mode" | "white-mode" | "twitter" | "super-headline" = "dark-mode"
    if (slideConfig.template) {
      const templateLower = slideConfig.template.toLowerCase()
      if (templateLower.includes("white") || templateLower.includes("branco")) {
        templateType = "white-mode"
      } else if (templateLower.includes("twitter")) {
        templateType = "twitter"
      } else if (templateLower.includes("headline") || templateLower.includes("super")) {
        templateType = "super-headline"
      }
    }

    // Build proper config with htmlOptions
    // The stored config might not have htmlOptions in the correct structure
    const existingHtmlOptions = slideConfig.config?.htmlOptions || slideConfig.config?.coverPosts?.coverHtmlOptions || slideConfig.config?.coverPosts?.postsHtmlOptions

    const generationInput = {
      slideTitle: editedData.headline || slideContent?.headline || slideContent?.title,
      slideContent: editedData.descricao || slideContent?.content || "",
      slideNumber: slideIndex + 1,
      config: {
        method: "html-template" as const,
        htmlOptions: existingHtmlOptions || {
          template: templateType,
          primaryColor: "#a3e635",
          secondaryColor: "#f97316",
        },
      },
      wizardContext: {
        theme: wizard.theme || undefined,
        objective: wizard.objective || undefined,
        targetAudience: wizard.targetAudience || undefined,
      },
    }

    const result = await generateHtmlTemplateImage(generationInput)

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: "Failed to regenerate image",
      }, { status: 500 })
    }

    const newImageUrl = result.data.imageUrl

    // Se a imagem é base64, fazer upload para storage
    let finalImageUrl = newImageUrl

    if (newImageUrl.startsWith("data:image/")) {
      try {
        const matches = newImageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (matches) {
          const format = matches[1]
          const base64 = matches[2]
          const buffer = Buffer.from(base64, "base64")

          const timestamp = Date.now()
          const key = `library-${libraryItemId}/slide-${slideIndex + 1}-${timestamp}.${format}`

          const storage = getStorageProvider()
          const uploadResult = await storage.uploadFile(buffer, key, {
            contentType: `image/${format}`,
          })

          finalImageUrl = uploadResult.url
        }
      } catch (uploadError) {
        console.error("[REGENERATE] Upload error:", uploadError)
        // Continuar com base64 se upload falhar
      }
    }

    // Atualizar o array de mediaUrls
    mediaUrls[slideIndex] = finalImageUrl

    // Atualizar o item da biblioteca
    await db
      .update(libraryItems)
      .set({
        mediaUrl: JSON.stringify(mediaUrls),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId))

    // Atualizar também as generatedImages do wizard
    if (wizard.generatedImages) {
      const updatedGeneratedImages = [
        ...(generatedImages.slice(0, slideIndex) as any),
        {
          ...generatedImages[slideIndex],
          imageUrl: finalImageUrl,
          createdAt: new Date(),
        },
        ...generatedImages.slice(slideIndex + 1) as any,
      ]

      await db
        .update(contentWizards)
        .set({
          generatedImages: updatedGeneratedImages as any,
          updatedAt: new Date(),
        })
        .where(eq(contentWizards.id, wizard.id))
    }

    return NextResponse.json({
      success: true,
      newImageUrl: finalImageUrl,
      slideIndex,
    })

  } catch (error) {
    console.error("[REGENERATE-SLIDE] Error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({
      error: "Internal server error",
    }, { status: 500 })
  }
}
