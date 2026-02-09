/**
 * RAG Documents API
 *
 * GET /api/rag/documents - Fetch documents and collections for RAG selection
 * Returns only documents that have embeddings (embedded=true)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  documents,
  documentCollections,
  documentCollectionItems,
} from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

/** Maximum characters for content preview */
const PREVIEW_LENGTH = 200;

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
        content: documents.content,
        category: documents.category,
        embedded: documents.embedded,
        chunksCount: documents.chunksCount,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.embedded, true)))
      .orderBy(desc(documents.updatedAt));

    // Add embedding counts and content preview to documents
    const documentsWithCounts = allDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      embedded: doc.embedded,
      chunksCount: doc.chunksCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      contentPreview:
        doc.content.length > PREVIEW_LENGTH
          ? doc.content.substring(0, PREVIEW_LENGTH) + "..."
          : doc.content,
      _count: {
        embeddings: doc.chunksCount || 0,
      },
    }));

    // Fetch collections with document count
    const collectionsWithCount = await db
      .select({
        id: documentCollections.id,
        name: documentCollections.name,
        createdAt: documentCollections.createdAt,
      })
      .from(documentCollections)
      .where(eq(documentCollections.userId, userId))
      .orderBy(desc(documentCollections.createdAt));

    // Get document counts for each collection (only embedded documents)
    const collectionDocCounts = await db
      .select({
        collectionId: documentCollectionItems.collectionId,
        count: count(),
      })
      .from(documentCollectionItems)
      .innerJoin(documents, eq(documents.id, documentCollectionItems.documentId))
      .where(and(eq(documents.userId, userId), eq(documents.embedded, true)))
      .groupBy(documentCollectionItems.collectionId);

    const countMap = new Map(
      collectionDocCounts.map((c) => [c.collectionId, c.count])
    );

    const collectionsWithDocCount = collectionsWithCount.map((col) => ({
      ...col,
      _count: {
        documents: countMap.get(col.id) || 0,
      },
    }));

    return NextResponse.json({
      documents: documentsWithCounts,
      collections: collectionsWithDocCount,
    });
  } catch (error) {
    console.error("[RAG-DOCUMENTS-API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        // Return empty data instead of error to allow UI to work
        documents: [],
        collections: [],
      },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  }
}
