/**
 * POST /api/library/[id]/upload-image
 *
 * Permite upload de imagem customizada para substituir uma imagem existente.
 * Suporta: carrossel (qualquer slide), vídeo (thumbnail), imagem simples.
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { libraryItems } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getStorageProvider } from "@/lib/storage"

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detect image type from buffer using magic bytes
 */
function detectImageType(buffer: Buffer): "png" | "jpg" | "webp" | "gif" | null {
  if (buffer.length < 12) return null

  const header = buffer.subarray(0, 12).toString("hex")

  // PNG: 89 50 4E 47
  if (header.startsWith("89504e47")) return "png"

  // JPEG: FF D8 FF
  if (header.startsWith("ffd8ff")) return "jpg"

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (header.startsWith("52494646") && header.slice(16, 24) === "57454250") return "webp"

  // GIF: 47 49 46 38 (GIF8)
  if (header.startsWith("47494638")) return "gif"

  return null
}

/**
 * Get file extension from detected type
 */
function getExtension(type: "png" | "jpg" | "webp" | "gif"): string {
  return type === "jpg" ? "jpeg" : type
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 }
    )
  }

  const { id } = await params
  const libraryItemId = parseInt(id)

  if (isNaN(libraryItemId)) {
    return NextResponse.json(
      { success: false, error: "ID inválido" },
      { status: 400 }
    )
  }

  try {
    // Parse FormData
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const slideIndexStr = formData.get("slideIndex") as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    const slideIndex = slideIndexStr !== null ? parseInt(slideIndexStr) : 0

    if (isNaN(slideIndex) || slideIndex < 0) {
      return NextResponse.json(
        { success: false, error: "Índice de slide inválido" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate MIME type (first check)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tipo de arquivo não permitido. Use: PNG, JPG, WebP ou GIF" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate by magic bytes (second check)
    const detectedType = detectImageType(buffer)
    if (!detectedType) {
      return NextResponse.json(
        { success: false, error: "Arquivo não é uma imagem válida" },
        { status: 400 }
      )
    }

    // Fetch library item
    const [item] = await db
      .select()
      .from(libraryItems)
      .where(eq(libraryItems.id, libraryItemId))
      .limit(1)

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item não encontrado" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (item.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar este item" },
        { status: 403 }
      )
    }

    // Parse current mediaUrl
    let mediaUrls: string[] = []
    if (item.mediaUrl) {
      try {
        const parsed = JSON.parse(item.mediaUrl)
        mediaUrls = Array.isArray(parsed) ? parsed : [item.mediaUrl]
      } catch {
        // If not valid JSON, treat as single URL
        mediaUrls = item.mediaUrl ? [item.mediaUrl] : []
      }
    }

    // Validate slideIndex
    // Allow extending array by 1 position (for adding new image)
    if (slideIndex > mediaUrls.length) {
      return NextResponse.json(
        { success: false, error: `Índice ${slideIndex} inválido. Array tem ${mediaUrls.length} imagens.` },
        { status: 400 }
      )
    }

    // Generate storage key
    const timestamp = Date.now()
    const extension = getExtension(detectedType)
    const key = `library-${libraryItemId}/custom-${slideIndex}-${timestamp}.${extension}`

    // Upload to storage
    const storage = getStorageProvider()
    const uploadResult = await storage.uploadFile(buffer, key, {
      contentType: `image/${extension}`,
    })

    const newImageUrl = uploadResult.url

    // Update mediaUrl array
    if (slideIndex < mediaUrls.length) {
      // Replace existing
      mediaUrls[slideIndex] = newImageUrl
    } else {
      // Add new (only if slideIndex === mediaUrls.length)
      mediaUrls.push(newImageUrl)
    }

    // Update database
    await db
      .update(libraryItems)
      .set({
        mediaUrl: JSON.stringify(mediaUrls),
        updatedAt: new Date(),
      })
      .where(eq(libraryItems.id, libraryItemId))

    return NextResponse.json({
      success: true,
      newImageUrl,
      slideIndex,
    })

  } catch (error) {
    console.error("[UPLOAD-IMAGE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao fazer upload",
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Configuration info
// ============================================================================

export async function GET() {
  return NextResponse.json({
    maxSize: MAX_FILE_SIZE,
    maxSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    allowedTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
  })
}
