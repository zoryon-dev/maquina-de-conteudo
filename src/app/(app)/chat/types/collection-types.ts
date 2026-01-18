/**
 * Client-safe types for conversation collections
 * Contains ONLY types - no server-side logic
 */

export interface CollectionResult {
  success: boolean
  error?: string
  collectionId?: number
}

export interface ConversationCollectionWithCount {
  id: number
  name: string
  description: string | null
  parentId: number | null
  color: string | null
  icon: string | null
  orderIdx: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  itemCount: number
}
