/**
 * Client-safe types for sources/documents
 * Contains ONLY types - no server-side logic
 */

export interface DocumentStats {
  totalDocuments: number
  embeddedDocuments: number
  totalChunks: number
  categories: CategoryCount[]
}

export interface CategoryCount {
  category: string | null
  count: number
}

export interface DocumentWithEmbeddings {
  id: number
  title: string
  content: string
  fileType: string | null
  category: string | null
  embedded: boolean
  embeddingModel: string | null
  createdAt: Date
  updatedAt: Date
  embeddingCount?: number
  embeddingStatus?: "pending" | "processing" | "completed" | "failed" | null
  embeddingProgress?: number | null
  chunksCount?: number | null
  lastEmbeddedAt?: Date | null
}

export interface DocumentCollectionWithCount {
  id: number
  name: string
  parentId: number | null
  color: string | null
  icon: string | null
  orderIdx: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  itemCount: number
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface CollectionResult {
  success: boolean
  error?: string
  collectionId?: number
}

export interface UpdateDocumentResult extends ActionResult {
  documentId?: number
}

export interface ReembedResult extends ActionResult {
  jobId?: number
}
