/**
 * POST /api/library/upload
 *
 * Upload de imagens via drag & drop para criar novos itens na biblioteca.
 * Suporta múltiplos arquivos em um único request (multipart/form-data).
 */

import { NextResponse } from "next/server"
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user"
import { createLibraryItemFromUpload } from "@/lib/upload/library-upload"

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES_PER_REQUEST = 10

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  let userId: string
  try {
    userId = await ensureAuthenticatedUser()
  } catch {
    return NextResponse.json(
      { success: false, error: "Nao autenticado" },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximo de ${MAX_FILES_PER_REQUEST} arquivos por vez`,
        },
        { status: 400 }
      )
    }

    // Validate all files first
    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Arquivo invalido" },
          { status: 400 }
        )
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `"${file.name}" — tipo nao permitido. Use: PNG, JPG, WebP ou GIF`,
          },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `"${file.name}" — arquivo muito grande. Maximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          },
          { status: 400 }
        )
      }
    }

    // Process each file
    const results: Array<{
      libraryItemId: number
      imageUrl: string
      title: string
    }> = []
    const errors: Array<{ filename: string; error: string }> = []

    for (const file of files) {
      try {
        const result = await createLibraryItemFromUpload(file, userId)
        results.push(result)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[LIBRARY-UPLOAD] Error uploading ${file.name}:`, errorMsg)
        errors.push({ filename: file.name, error: errorMsg })
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: results,
      errors: errors.length > 0 ? errors : undefined,
      total: files.length,
      successCount: results.length,
      errorCount: errors.length,
    })
  } catch (error) {
    console.error("[LIBRARY-UPLOAD] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar upload",
      },
      { status: 500 }
    )
  }
}
