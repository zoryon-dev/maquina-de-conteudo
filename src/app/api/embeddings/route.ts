/**
 * POST /api/embeddings
 *
 * API endpoint for document embedding operations.
 *
 * Endpoints:
 * - POST /: Create embedding job for a document
 * - GET /: Get embedding status for documents
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createJob } from "@/lib/queue/jobs";
import { JobType, type DocumentEmbeddingPayload } from "@/lib/queue/types";

/**
 * POST /api/embeddings
 *
 * Queue a document for embedding processing.
 *
 * Body: { documentId: number, force?: boolean }
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { documentId, force = false } = body as { documentId: number; force?: boolean };

    if (typeof documentId !== "number") {
      return NextResponse.json({ error: "Invalid documentId" }, { status: 400 });
    }

    // Get document
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if already embedded (unless force)
    if (doc.embedded && !force) {
      return NextResponse.json({
        success: true,
        alreadyEmbedded: true,
        documentId,
        chunksCount: doc.chunksCount,
        embeddingModel: doc.embeddingModel,
        lastEmbeddedAt: doc.lastEmbeddedAt,
      });
    }

    // Create embedding job
    const payload: DocumentEmbeddingPayload = {
      documentId,
      userId,
      force,
    };

    const jobId = await createJob(userId, JobType.DOCUMENT_EMBEDDING, payload);

    return NextResponse.json({
      success: true,
      jobId,
      documentId,
      message: "Document queued for embedding",
    });
  } catch (error) {
    console.error("Embedding API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue embedding job" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings?documentId={id}
 *
 * Get embedding status for a document.
 */
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      // Return stats for all documents
      const docs = await db
        .select({
          id: documents.id,
          title: documents.title,
          category: documents.category,
          embedded: documents.embedded,
          chunksCount: documents.chunksCount,
          embeddingStatus: documents.embeddingStatus,
          embeddingProgress: documents.embeddingProgress,
          lastEmbeddedAt: documents.lastEmbeddedAt,
          embeddingModel: documents.embeddingModel,
        })
        .from(documents)
        .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)));

      const stats = {
        total: docs.length,
        embedded: docs.filter((d) => d.embedded).length,
        pending: docs.filter((d) => !d.embedded).length,
        processing: docs.filter((d) => d.embeddingStatus === "processing").length,
        documents: docs,
      };

      return NextResponse.json(stats);
    }

    // Get specific document
    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        category: documents.category,
        embedded: documents.embedded,
        chunksCount: documents.chunksCount,
        embeddingStatus: documents.embeddingStatus,
        embeddingProgress: documents.embeddingProgress,
        lastEmbeddedAt: documents.lastEmbeddedAt,
        embeddingModel: documents.embeddingModel,
      })
      .from(documents)
      .where(and(eq(documents.id, parseInt(documentId, 10)), eq(documents.userId, userId)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Embedding status API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get embedding status" },
      { status: 500 }
    );
  }
}
