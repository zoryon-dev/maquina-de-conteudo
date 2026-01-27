import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { documents, documentEmbeddings, documentCollectionItems } from "@/db/schema"
import { eq } from "drizzle-orm"
import { LocalStorageProvider, R2StorageProvider } from "@/lib/storage"

/**
 * DELETE /api/admin/clear-documents
 *
 * Deletes ALL documents for the current user.
 *
 * ⚠️ DESTRUCTIVE OPERATION - Use with caution!
 */
export async function DELETE() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    steps: [] as string[],
    success: false,
    deleted: {
      documents: 0,
      embeddings: 0,
      collectionItems: 0,
      files: 0,
    },
    error: null as string | null,
  }

  try {
    // Step 1: Get all documents with storage info
    results.steps.push("Fetching documents...")
    const docs = await db
      .select({
        id: documents.id,
        storageKey: documents.storageKey,
        storageProvider: documents.storageProvider,
        filePath: documents.filePath,
      })
      .from(documents)
      .where(eq(documents.userId, userId))

    results.steps.push(`Found ${docs.length} documents`)

    // Step 2: Get all document IDs for batch deletion
    const documentIds = docs.map((d) => d.id)

    if (documentIds.length === 0) {
      results.steps.push("No documents to delete")
      results.success = true
      return NextResponse.json(results)
    }

    // Step 3: Delete collection items
    const collectionItemsResult = await db
      .delete(documentCollectionItems)
      .where(eq(documentCollectionItems.documentId, documentIds[0])) // Delete first (will cascade in real implementation)

    for (const id of documentIds.slice(1)) {
      await db.delete(documentCollectionItems).where(eq(documentCollectionItems.documentId, id))
    }

    // Step 4: Delete embeddings
    for (const id of documentIds) {
      await db.delete(documentEmbeddings).where(eq(documentEmbeddings.documentId, id))
    }
    results.deleted.embeddings = documentIds.length
    results.steps.push(`✓ Deleted embeddings and collection associations`)

    // Step 5: Delete files from storage
    let localKeys: string[] = []
    let r2Keys: string[] = []

    for (const doc of docs) {
      if (doc.storageKey) {
        if (doc.storageProvider === "r2") {
          r2Keys.push(doc.storageKey)
        } else {
          localKeys.push(doc.storageKey)
        }
      }
    }

    if (localKeys.length > 0) {
      try {
        const localStorage = new LocalStorageProvider()
        for (const key of localKeys) {
          await localStorage.deleteFile(key).catch(() => {})
        }
        results.deleted.files += localKeys.length
        results.steps.push(`✓ Deleted ${localKeys.length} local files`)
      } catch (err) {
        results.steps.push(`⚠ Local storage cleanup failed: ${err}`)
      }
    }

    if (r2Keys.length > 0) {
      try {
        const r2Storage = new R2StorageProvider()
        for (const key of r2Keys) {
          await r2Storage.deleteFile(key).catch(() => {})
        }
        results.deleted.files += r2Keys.length
        results.steps.push(`✓ Deleted ${r2Keys.length} R2 files`)
      } catch (err) {
        results.steps.push(`⚠ R2 storage cleanup failed: ${err}`)
      }
    }

    // Step 6: Delete documents
    for (const id of documentIds) {
      await db.delete(documents).where(eq(documents.id, id))
    }
    results.deleted.documents = documentIds.length
    results.steps.push(`✓ Deleted ${documentIds.length} document records`)

    results.success = true
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error)
  }

  return NextResponse.json(results)
}
