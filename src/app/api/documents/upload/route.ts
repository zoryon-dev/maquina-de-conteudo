/**
 * Document Upload API Route
 *
 * Handles file uploads (PDF, TXT, MD, DOC, DOCX) with automatic text extraction.
 * Uses storage abstraction layer for both local and R2 storage.
 * Stores the original file and extracts text for embedding/processing.
 *
 * Storage Providers:
 * - Local: Files saved to public/uploads/documents/
 * - R2: Files uploaded to Cloudflare R2 bucket
 *
 * Supports both single file and bulk upload (multiple files).
 * Bulk uploads create individual jobs for each document for parallel processing.
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
import { triggerWorker } from "@/lib/queue/client"
import {
  getStorageProvider,
  generateStorageKey,
  getDocumentUrl,
  type UploadResult,
} from "@/lib/storage"
import { checkRateLimit } from "@/lib/security/rate-limit"

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024
// Allowed file types (extended to include Word documents)
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]
// Allowed extensions (extended to include Word documents)
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".doc", ".docx"]

// Maximum files for bulk upload
const MAX_BULK_UPLOAD = 10

/**
 * Ensure user exists in database (auto-create if missing)
 * This handles cases where Clerk webhook didn't sync the user.
 * Also handles email migration when Clerk ID changes (e.g., account recreation).
 */
async function ensureUserExists(userId: string) {
  // Check if user exists by Clerk ID
  const [existingById] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existingById) {
    return // User already exists
  }

  // Get user data from Clerk
  const { createClerkClient } = await import("@clerk/nextjs/server")
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const clerkUser = await clerkClient.users.getUser(userId)

  const email = clerkUser.emailAddresses[0]?.emailAddress || ""
  const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User"

  // Check if email already exists (account recreation scenario)
  if (email) {
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingByEmail) {
      // Email exists with different Clerk ID - update the existing record
      console.log(
        "[Documents] Email already exists with old ID:",
        existingByEmail.id,
        "- updating to new Clerk ID:",
        userId
      )

      await db
        .update(users)
        .set({
          id: userId,
          name,
          avatarUrl: clerkUser.imageUrl,
          updatedAt: new Date(),
          deletedAt: null, // Reactivate if soft-deleted
        })
        .where(eq(users.email, email))

      return
    }
  }

  // Create new user
  await db.insert(users).values({
    id: userId,
    email,
    name,
    avatarUrl: clerkUser.imageUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log("[Documents] Created new user:", userId)
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
 * Extract text from DOCX buffer using mammoth
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  } catch (error) {
    console.error("DOCX extraction error:", error)
    throw new Error("Failed to extract text from DOCX file")
  }
}

/**
 * Extract text from DOC buffer (legacy Word format)
 * Note: .doc files are harder to parse; mammoth doesn't support them
 * This is a placeholder that returns empty text with a warning
 */
async function extractTextFromDOC(buffer: Buffer): Promise<string> {
  try {
    // For legacy .doc files, we could use antiword or similar tools
    // For now, we'll use mammoth which may fail for .doc files
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  } catch (error) {
    throw new Error("Legacy .doc files are not fully supported. Please convert to .docx format.")
  }
}

/**
 * Validate file type using magic bytes (more reliable than MIME type)
 *
 * @param buffer - File buffer
 * @returns Detected file extension or null
 */
function detectFileTypeFromBytes(buffer: Buffer): "pdf" | "txt" | "md" | "doc" | "docx" | null {
  const header = buffer.subarray(0, 8).toString("hex")

  // PDF: %PDF (25 50 44 46)
  if (header.startsWith("25504446")) {
    return "pdf"
  }

  // DOCX: PK (50 4B) - ZIP archive signature
  // DOCX files are ZIP archives, so we check for the ZIP signature
  if (header.startsWith("504b0304")) {
    return "docx"
  }

  // DOC: D0 CF 11 E0 A1 B1 1A E1 (OLE compound document signature)
  if (header.startsWith("d0cf11e0")) {
    return "doc"
  }

  // For text files, check if content is printable ASCII/UTF-8
  const sample = buffer.subarray(0, 1024).toString("utf-8")
  // Check if sample contains mostly printable characters
  const printableChars = sample.replace(/[\x20-\x7E\r\n\t]/g, "").length
  const ratio = printableChars / sample.length

  if (ratio < 0.1) {
    // Likely a text file - determine if txt or md by extension
    return "txt"
  }

  return null
}

/**
 * Validate file extension from filename
 *
 * @param filename - Original filename
 * @returns Detected file type or null
 */
function detectFileTypeFromExtension(filename: string): "pdf" | "txt" | "md" | "doc" | "docx" | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    return ext.slice(1) as "pdf" | "txt" | "md" | "doc" | "docx"
  }
  return null
}

/**
 * Process a single file upload
 * Helper function used by both single and bulk upload
 */
async function processSingleFile(
  file: File,
  userId: string,
  title: string | null,
  category: string | null,
  collectionId: string | null
): Promise<{
  success: boolean
  document?: {
    id: number
    title: string
    fileType: string
    contentLength: number
    category: string
  }
  error?: string
}> {
  try {
    // Validate file type by MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      // Also check extension as fallback
      const extType = detectFileTypeFromExtension(file.name)
      if (!extType) {
        return {
          success: false,
          error: "Invalid file type",
        }
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
      }
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Detect file type from bytes for validation
    const detectedType = detectFileTypeFromBytes(buffer)
    if (!detectedType) {
      // Fall back to extension detection
      const extType = detectFileTypeFromExtension(file.name)
      if (!extType) {
        return {
          success: false,
          error: "Could not detect valid file type",
        }
      }
    }

    // Use provided title or fallback to filename
    const documentTitle = title?.trim() || file.name.replace(/\.[^/.]+$/, "")

    // Extract text based on file type
    let content = ""
    const fallbackType = detectFileTypeFromExtension(file.name)
    const fileType = detectedType || fallbackType
    if (!fileType) {
      return {
        success: false,
        error: "Unable to determine file type. Upload a valid PDF, DOC, TXT, or MD file.",
      }
    }

    switch (fileType) {
      case "pdf":
        content = await extractTextFromPDF(buffer)
        break
      case "txt":
      case "md":
        content = await extractTextFromTXT(buffer, "utf-8")
        break
      case "docx":
        content = await extractTextFromDOCX(buffer)
        break
      case "doc":
        content = await extractTextFromDOC(buffer)
        break
    }

    // Clean up extracted text
    content = content
      .replace(/\r\n/g, "\n")  // Normalize line endings
      .replace(/\n{3,}/g, "\n\n")  // Remove excessive blank lines
      .trim()

    if (!content) {
      return {
        success: false,
        error: "No text could be extracted from file",
      }
    }

    // Get storage provider and generate storage key
    const storage = getStorageProvider()
    const storageKey = generateStorageKey(userId, file.name, "documents")

    // Upload file to storage (local or R2)
    // Note: R2 provider automatically sanitizes metadata to ASCII-safe Unicode escapes
    // The original filename is preserved in the database metadata below
    const uploadResult: UploadResult = await storage.uploadFile(buffer, storageKey, {
      contentType: file.type,
      metadata: {
        originalFilename: file.name,
        userId,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Wrap DB insert in try/catch to clean up orphaned storage file on failure
    let newDocument: typeof documents.$inferSelect
    try {
      // Prepare storage metadata (keep original filename in DB)
      const storageMetadata = {
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        storageProvider: uploadResult.provider,
      }

      // Create document record with storage information
      const [inserted] = await db
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

      newDocument = inserted

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
    } catch (dbError) {
      // Clean up orphaned file in storage since DB insert failed
      try {
        await storage.deleteFile(uploadResult.key)
      } catch (cleanupErr) {
        console.error("[Upload] Failed to clean up orphaned file:", uploadResult.key, cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr))
      }
      throw dbError
    }

    // Create embedding job to process the document asynchronously
    // This is now resilient to queue unavailability
    await createJob(
      userId,
      JobType.DOCUMENT_EMBEDDING,
      {
        documentId: newDocument.id,
        userId,
      }
    ).catch((err) => {
      // Log but don't fail the upload if job creation fails
      console.error(`[Upload] Failed to create embedding job for document ${newDocument.id}:`, err)
    })

    // In development, trigger worker immediately to process the job
    if (isDevelopment()) {
      // Fire and forget - don't wait for completion
      triggerWorker().catch((err) => {
        console.error("Failed to trigger worker in development:", err)
      })
    }

    return {
      success: true,
      document: {
        id: newDocument.id,
        title: newDocument.title,
        fileType: newDocument.fileType!,
        contentLength: content.length,
        category: newDocument.category!,
      },
    }
  } catch (error) {
    console.error("[Upload] File processing error:", error instanceof Error ? error.message : String(error))
    return {
      success: false,
      error: "Failed to process file",
    }
  }
}

/**
 * POST /api/documents/upload
 *
 * Uploads document files (PDF, TXT, MD, DOC, DOCX) with automatic text extraction.
 * Supports both single file and bulk upload (multiple files).
 * Uses storage abstraction layer for flexible storage backends.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate file(s) (type, size, count)
 * 3. Extract text from each file
 * 4. Upload to storage (local or R2 based on env config)
 * 5. Create document record(s) in database
 * 6. Add to collection if specified
 * 7. Create embedding job(s) for async processing
 *
 * Request FormData:
 * - file: Single file (for single upload)
 * - files: Multiple files (for bulk upload)
 * - title: Optional title (applied to all files in bulk)
 * - category: Document category (default: "general")
 * - collectionId: Optional collection ID to add documents to
 *
 * Response:
 * - Single upload: { success: true, document: {...} }
 * - Bulk upload: { success: true, documents: [...], failed: [...] }
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

    const rateLimited = await checkRateLimit(userId, "upload")
    if (rateLimited) return rateLimited

    // Ensure user exists in database (auto-create if missing from Clerk webhook)
    await ensureUserExists(userId)

    const formData = await request.formData()

    // Check for bulk upload (multiple files)
    const filesEntry = formData.getAll("files")
    const singleFile = formData.get("file") as File | null

    // Use bulk upload if "files" field is present and has values
    const isBulkUpload = filesEntry.length > 0 && filesEntry[0] instanceof File

    const filesToProcess: File[] = []

    if (isBulkUpload) {
      // Bulk upload mode
      if (filesEntry.length > MAX_BULK_UPLOAD) {
        return NextResponse.json(
          {
            error: `Too many files`,
            maxFiles: MAX_BULK_UPLOAD,
            providedFiles: filesEntry.length,
          },
          { status: 400 }
        )
      }
      filesToProcess.push(...(filesEntry as File[]))
    } else if (singleFile) {
      // Single file upload mode (backward compatibility)
      filesToProcess.push(singleFile)
    } else {
      return NextResponse.json(
        { error: "No file(s) provided" },
        { status: 400 }
      )
    }

    // Get common metadata for all files
    const title = formData.get("title") as string | null
    const category = formData.get("category") as string | null
    const collectionId = formData.get("collectionId") as string | null

    // Process files
    const results = isBulkUpload
      ? await Promise.all(
          filesToProcess.map((file) =>
            processSingleFile(file, userId, title, category, collectionId)
          )
        )
      : [await processSingleFile(filesToProcess[0], userId, title, category, collectionId)]

    // Separate successful and failed uploads
    const successfulUploads = results.filter((r) => r.success)
    const failedUploads = results.filter((r) => !r.success)

    // Build response
    if (isBulkUpload) {
      return NextResponse.json({
        success: true,
        documents: successfulUploads.map((r) => r.document),
        failed: failedUploads.map((r) => ({
          filename: results.find((_, i) => results[i] === r)?.error || "Unknown",
          error: r.error,
        })),
        total: results.length,
        successful: successfulUploads.length,
        failedCount: failedUploads.length,
      })
    } else {
      // Single file upload (backward compatible)
      const firstResult = results[0]

      if (!firstResult.success) {
        return NextResponse.json(
          {
            error: firstResult.error || "Failed to upload document",
          },
          { status: 400 }
        )
      }

      const documentUrl = getDocumentUrl({ id: firstResult.document!.id } as any)

      return NextResponse.json({
        success: true,
        document: {
          ...firstResult.document,
          url: documentUrl,
        },
      })
    }
  } catch (error) {
    console.error("[Upload] Document upload error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to upload document" },
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
    maxBulkUpload: MAX_BULK_UPLOAD,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  })
}
