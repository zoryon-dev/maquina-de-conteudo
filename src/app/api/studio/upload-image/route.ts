/**
 * POST /api/studio/upload-image
 *
 * Upload de imagem para uso no Studio Editor.
 * Retorna URL da imagem armazenada no storage (R2 ou local).
 *
 * Usado para:
 * - Imagem central de slides (201, 202, 203)
 * - Imagem de fundo da capa (01_CAPA)
 * - Avatar do perfil
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStorageProvider } from "@/lib/storage";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detect image type from buffer using magic bytes
 */
function detectImageType(buffer: Buffer): "png" | "jpg" | "webp" | "gif" | null {
  if (buffer.length < 12) return null;

  const header = buffer.subarray(0, 12).toString("hex");

  // PNG: 89 50 4E 47
  if (header.startsWith("89504e47")) return "png";

  // JPEG: FF D8 FF
  if (header.startsWith("ffd8ff")) return "jpg";

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (header.startsWith("52494646") && header.slice(16, 24) === "57454250") return "webp";

  // GIF: 47 49 46 38 (GIF8)
  if (header.startsWith("47494638")) return "gif";

  return null;
}

/**
 * Get content type from detected type
 */
function getContentType(type: "png" | "jpg" | "webp" | "gif"): string {
  return type === "jpg" ? "image/jpeg" : `image/${type}`;
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const purpose = formData.get("purpose") as string | null; // "slide" | "background" | "avatar"
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type (first check)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tipo de arquivo não permitido. Use: PNG, JPG, WebP ou GIF" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate by magic bytes (second check)
    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return NextResponse.json(
        { success: false, error: "Arquivo não é uma imagem válida" },
        { status: 400 }
      );
    }

    // Generate storage key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = detectedType === "jpg" ? "jpeg" : detectedType;
    const purposePrefix = purpose || "slide";
    const projectPrefix = projectId || "draft";

    const key = `studio/${userId}/${projectPrefix}/${purposePrefix}-${timestamp}-${randomSuffix}.${extension}`;

    // Upload to storage
    const storage = getStorageProvider();
    const uploadResult = await storage.uploadFile(buffer, key, {
      contentType: getContentType(detectedType),
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      key,
      size: file.size,
      type: getContentType(detectedType),
    });

  } catch (error) {
    console.error("[STUDIO-UPLOAD] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao fazer upload",
      },
      { status: 500 }
    );
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
  });
}
