/**
 * Document Download API Route
 *
 * Provides a unified download endpoint for documents stored in either
 * local filesystem or Cloudflare R2 storage.
 *
 * @see src/lib/storage/ for storage abstraction layer
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getStorageProviderForDocument } from "@/lib/storage"

interface RouteParams {
  params: Promise<{ id: string }>
}

interface StorageMetadata {
  mimeType?: string
  originalFilename?: string
}

/**
 * GET /api/documents/[id]/download
 *
 * Downloads a document file from storage (local or R2).
 * Handles both legacy (filePath) and new (storageKey) documents.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const documentId = parseInt(id)

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      )
    }

    // Fetch document from database
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1)

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Determine file content and type
    let fileBuffer: Buffer
    let contentType: string
    let filename: string

    // Try storage key first (new storage abstraction)
    if (doc.storageKey) {
      const storage = getStorageProviderForDocument(doc)

      try {
        fileBuffer = await storage.downloadFile(doc.storageKey)

        // Try to get content type from storage metadata
        // Note: storageMetadata is jsonb type (already parsed, not string)
        const storageMetadata: StorageMetadata =
          doc.storageMetadata && typeof doc.storageMetadata === "object"
            ? (doc.storageMetadata as StorageMetadata)
            : {}
        contentType = storageMetadata.mimeType || "application/octet-stream"

        // Get original filename from metadata or use title
        filename = storageMetadata.originalFilename || `${doc.title}.${doc.fileType || "pdf"}`
      } catch (storageError) {
        console.error("Storage download error:", storageError)
        return NextResponse.json(
          {
            error: "Failed to download file from storage",
            details: storageError instanceof Error ? storageError.message : String(storageError),
          },
          { status: 500 }
        )
      }
    } else if (doc.filePath) {
      // Fallback to legacy filePath (local files only)
      const { readFile } = await import("fs/promises")
      const { join } = await import("path")

      // filePath is relative to public directory
      const relativePath = doc.filePath.replace(/^\//, "")
      const fullPath = join(process.cwd(), "public", relativePath)

      try {
        fileBuffer = await readFile(fullPath)
      } catch (fileError) {
        console.error("File read error:", fileError)
        return NextResponse.json(
          { error: "File not found on disk" },
          { status: 404 }
        )
      }

      contentType = "application/octet-stream"
      filename = `${doc.title}.${doc.fileType || "pdf"}`
    } else {
      return NextResponse.json(
        { error: "No file location available for this document" },
        { status: 404 }
      )
    }

    // Set content type based on file type
    switch (doc.fileType) {
      case "pdf":
        contentType = "application/pdf"
        break
      case "txt":
        contentType = "text/plain"
        break
      case "md":
        contentType = "text/markdown"
        break
    }

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer)

    // Create response with file
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Document download error:", error)
    return NextResponse.json(
      {
        error: "Failed to download document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
