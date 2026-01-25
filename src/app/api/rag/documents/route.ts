/**
 * RAG Documents API
 *
 * GET /api/rag/documents - Fetch documents and collections for RAG selection
 * Returns only documents that have embeddings (embedded=true)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documents, documentCollections, documentCollectionItems } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch collections with document counts
    const collectionsResult = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        description: documentCollections.description,
      })
      .from(documentCollections)
      .where(eq(documentCollections.userId, userId))
      .orderBy(desc(documentCollections.updatedAt));

    // Add document counts to collections
    const collections = await Promise.all(
      collectionsResult.map(async (col) => {
        const docCount = await db
          .select({ count: count() })
          .from(documentCollectionItems)
          .where(eq(documentCollectionItems.collectionId, col.id));

        return {
          ...col,
          _count: {
            documents: docCount[0]?.count || 0,
          },
        };
      })
    );

    // Fetch all documents with embeddings
    const allDocuments = await db
      .select({
        id: documents.id,
        title: documents.title,
        category: documents.category,
        embedded: documents.embedded,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.embedded, true)))
      .orderBy(desc(documents.updatedAt));

    // Add embedding counts to documents
    const documentsWithCounts = await Promise.all(
      allDocuments.map(async (doc) => {
        // Get embedding count from the documents table directly
        const embeddingCount = doc.embeddingCount || 0;

        return {
          ...doc,
          _count: {
            embeddings: embeddingCount,
          },
        };
      })
    );

    return NextResponse.json({
      documents: documentsWithCounts,
      collections,
    });
  } catch (error) {
    console.error("Error fetching RAG documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
