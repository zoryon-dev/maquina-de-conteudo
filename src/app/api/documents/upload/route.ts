/**
 * Document Upload API Route
 *
 * Handles file uploads (PDF, TXT) with automatic text extraction.
 * Stores the original file and extracts text for embedding/processing.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { db } from "@/db"
import { documents, users } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { createJob } from "@/lib/queue/jobs"
import { JobType } from "@/lib/queue/types"

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024
// Allowed file types
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"]

// Upload directory
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "documents")

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
 * Generate a safe filename
 */
function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now()
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase()
  return `${timestamp}-${safeName}`
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * POST /api/documents/upload
 *
 * Uploads a document file (PDF/TXT), extracts text, and creates a document record.
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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          allowedTypes: ALLOWED_TYPES,
        },
        { status: 400 }
      )
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

    // Ensure upload directory exists
    await ensureUploadDir()

    // Generate safe filename
    const safeFilename = generateSafeFilename(file.name)
    const filePath = join(UPLOAD_DIR, safeFilename)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Extract text based on file type
    let content = ""
    let fileType = "unknown"

    switch (file.type) {
      case "application/pdf":
        content = await extractTextFromPDF(buffer)
        fileType = "pdf"
        break
      case "text/plain":
        content = await extractTextFromTXT(buffer, "utf-8")
        fileType = "txt"
        break
      case "text/markdown":
        content = await extractTextFromTXT(buffer, "utf-8")
        fileType = "md"
        break
      default:
        // Try to extract as text anyway
        content = await extractTextFromTXT(buffer, "utf-8")
        fileType = "txt"
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

    // Create document record
    const [newDocument] = await db
      .insert(documents)
      .values({
        userId,
        title: documentTitle,
        content,
        filePath: `/uploads/documents/${safeFilename}`,
        fileType,
        category: category || "general",
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

    return NextResponse.json({
      success: true,
      document: {
        id: newDocument.id,
        title: newDocument.title,
        fileType: newDocument.fileType,
        contentLength: content.length,
        filePath: newDocument.filePath,
        category: newDocument.category,
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
