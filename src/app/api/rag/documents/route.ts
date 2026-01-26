/**
 * RAG Documents API
 *
 * GET /api/rag/documents - Fetch documents and collections for RAG selection
 * Returns only documents that have embeddings (embedded=true)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all documents with embeddings
    const allDocuments = await db
      .select({
        id: documents.id,
        title: documents.title,
        category: documents.category,
        embedded: documents.embedded,
        chunksCount: documents.chunksCount,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.embedded, true)))
      .orderBy(desc(documents.updatedAt));

    // Add embedding counts to documents
    const documentsWithCounts = allDocuments.map((doc) => ({
      ...doc,
      _count: {
        embeddings: doc.chunksCount || 0,
      },
    }));

    // Return empty collections for now - the feature can be added later
    return NextResponse.json({
      documents: documentsWithCounts,
      collections: [],
    });
  } catch (error) {
    console.error("[RAG-DOCUMENTS-API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        details: error instanceof Error ? error.message : String(error),
        // Return empty data instead of error to allow UI to work
        documents: [],
        collections: [],
      },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  }
}
