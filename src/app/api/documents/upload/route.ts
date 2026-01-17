/**
 * Document Upload API Route
 *
 * Handles file uploads (PDF, TXT, MD) with automatic text extraction.
 * Uses storage abstraction layer for both local and R2 storage.
 * Stores the original file and extracts text for embedding/processing.
 *
 * Storage Providers:
 * - Local: Files saved to public/uploads/documents/
 * - R2: Files uploaded to Cloudflare R2 bucket
 *
 * @see src/lib/storage/ for storage abstraction layer
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { documents, users } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { createJob } from "@/lib/queue/jobs"
import { JobType } from "@/lib/queue/types"
import {
  getStorageProvider,
  generateStorageKey,
  getDocumentUrl,
  type UploadResult,
} from "@/lib/storage"

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024
// Allowed file types
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"]
// Allowed extensions
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"]

/**
 * Ensure user exists in database (auto-create if missing)
 * This handles cases where Clerk webhook didn't sync the user
 */
async function ensureUserExists(userId: string) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!existingUser) {
    // Get user data from Clerk
    const { createClerkClient } = await import("@clerk/nextjs/server")
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const clerkUser = await clerkClient.users.getUser(userId)

    await db.insert(users).values({
      id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
      avatarUrl: clerkUser.imageUrl,
    })
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import of pdf-parse to avoid issues with module bundling
    const { PDFParse } = await import("pdf-parse")
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer)
    const parser = new PDFParse({ data: uint8Array })
    const data = await parser.getText()
    return data.text || ""
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw new Error("Failed to extract text from PDF")
  }
}

/**
 * Extract text from TXT buffer
 */
async function extractTextFromTXT(buffer: Buffer, encoding: BufferEncoding = "utf-8"): Promise<string> {
  try {
    return buffer.toString(encoding)
  } catch (error) {
    console.error("TXT extraction error:", error)
    throw new Error("Failed to extract text from TXT file")
  }
}

/**
 * Validate file type using magic bytes (more reliable than MIME type)
 *
 * @param buffer - File buffer
 * @returns Detected file extension or null
 */
function detectFileTypeFromBytes(buffer: Buffer): "pdf" | "txt" | "md" | null {
  const header = buffer.subarray(0, 8).toString("hex")

  // PDF: %PDF (25 50 44 46)
  if (header.startsWith("25504446")) {
    return "pdf"
  }

  // For text files, check if content is printable ASCII/UTF-8
  const sample = buffer.subarray(0, 1024).toString("utf-8")
  // Check if sample contains mostly printable characters
  const printableChars = sample.replace(/[\x20-\x7E\r\n\t]/g, "").length
  const ratio = printableChars / sample.length

  if (ratio < 0.1) {
    // Likely a text file
    return "md"
  }

  return null
}

/**
 * Validate file extension from filename
 *
 * @param filename - Original filename
 * @returns Detected file type or null
 */
function detectFileTypeFromExtension(filename: string): "pdf" | "txt" | "md" | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    return ext.slice(1) as "pdf" | "txt" | "md"
  }
  return null
}

/**
 * POST /api/documents/upload
 *
 * Uploads a document file (PDF, TXT, MD) with automatic text extraction.
 * Uses storage abstraction layer for flexible storage backends.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate file (type, size)
 * 3. Extract text from file
 * 4. Upload to storage (local or R2 based on env config)
 * 5. Create document record in database
 * 6. Add to collection if specified
 * 7. Create embedding job for async processing
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Ensure user exists in database (auto-create if missing from Clerk webhook)
    await ensureUserExists(userId)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const category = formData.get("category") as string | null
    const collectionId = formData.get("collectionId") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type by MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      // Also check extension as fallback
      const extType = detectFileTypeFromExtension(file.name)
      if (!extType) {
        return NextResponse.json(
          {
            error: "Invalid file type",
            allowedTypes: ALLOWED_TYPES,
            allowedExtensions: ALLOWED_EXTENSIONS,
          },
          { status: 400 }
        )
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          maxSize: MAX_FILE_SIZE,
          maxSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Detect file type from bytes for validation
    const detectedType = detectFileTypeFromBytes(buffer)
    if (!detectedType) {
      return NextResponse.json(
        { error: "Could not detect valid file type" },
        { status: 400 }
      )
    }

    // Extract text based on file type
    let content = ""
    let fileType: "pdf" | "txt" | "md" = detectedType

    switch (fileType) {
      case "pdf":
        content = await extractTextFromPDF(buffer)
        break
      case "txt":
      case "md":
        content = await extractTextFromTXT(buffer, "utf-8")
        break
    }

    // Clean up extracted text
    content = content
      .replace(/\r\n/g, "\n")  // Normalize line endings
      .replace(/\n{3,}/g, "\n\n")  // Remove excessive blank lines
      .trim()

    if (!content) {
      return NextResponse.json(
        { error: "No text could be extracted from file" },
        { status: 400 }
      )
    }

    // Use provided title or fallback to filename
    const documentTitle = title?.trim() || file.name.replace(/\.[^/.]+$/, "")

    // Get storage provider and generate storage key
    const storage = getStorageProvider()
    const storageKey = generateStorageKey(userId, file.name, "documents")

    // Upload file to storage (local or R2)
    let uploadResult: UploadResult
    try {
      uploadResult = await storage.uploadFile(buffer, storageKey, {
        contentType: file.type,
        metadata: {
          originalFilename: file.name,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      })
    } catch (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        {
          error: "Failed to upload file to storage",
          details: uploadError instanceof Error ? uploadError.message : String(uploadError),
        },
        { status: 500 }
      )
    }

    // Prepare storage metadata
    const storageMetadata = {
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      storageProvider: uploadResult.provider,
    }

    // Create document record with storage information
    const [newDocument] = await db
      .insert(documents)
      .values({
        userId,
        title: documentTitle,
        content,
        fileType,
        category: category || "general",
        storageProvider: uploadResult.provider,
        storageKey: uploadResult.key,
        storageMetadata: JSON.stringify(storageMetadata),
        // Keep filePath for backward compatibility (local storage)
        filePath: uploadResult.provider === "local"
          ? uploadResult.url
          : null,
        metadata: JSON.stringify({
          originalFilename: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        }),
        embedded: false,
        embeddingStatus: "pending",
        embeddingProgress: 0,
        chunksCount: 0,
      })
      .returning()

    // If collectionId provided, add to collection
    if (collectionId && newDocument) {
      const { documentCollectionItems, documentCollections } = await import("@/db/schema")

      // Verify collection belongs to user
      const [collection] = await db
        .select()
        .from(documentCollections)
        .where(
          and(
            eq(documentCollections.id, parseInt(collectionId)),
            eq(documentCollections.userId, userId),
            isNull(documentCollections.deletedAt)
          )
        )
        .limit(1)

      if (collection) {
        await db
          .insert(documentCollectionItems)
          .values({
            documentId: newDocument.id,
            collectionId: parseInt(collectionId),
          })
      }
    }

    // Create embedding job to process the document asynchronously
    await createJob(
      userId,
      JobType.DOCUMENT_EMBEDDING,
      {
        documentId: newDocument.id,
        userId,
      }
    )

    // Get document URL for response
    const documentUrl = getDocumentUrl(newDocument)

    return NextResponse.json({
      success: true,
      document: {
        id: newDocument.id,
        title: newDocument.title,
        fileType: newDocument.fileType,
        contentLength: content.length,
        category: newDocument.category,
        storageProvider: newDocument.storageProvider,
        storageKey: newDocument.storageKey,
        url: documentUrl,
      },
      storage: {
        provider: uploadResult.provider,
        key: uploadResult.key,
        url: uploadResult.url,
      },
    })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/upload
 *
 * Returns upload configuration and allowed file types.
 */
export async function GET() {
  return NextResponse.json({
    maxSize: MAX_FILE_SIZE,
    maxSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: [".pdf", ".txt", ".md"],
  })
}
