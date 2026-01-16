/**
 * Voyage AI Types
 *
 * Type definitions for Voyage AI API responses and errors.
 */

/**
 * Voyage embedding model options
 */
export type VoyageModel =
  | "voyage-4-large"
  | "voyage-4"
  | "voyage-law-2"
  | "voyage-finance-2"
  | "voyage-code-2"
  | "voyage-multilingual-2"

/**
 * Default embedding model for RAG
 */
export const DEFAULT_MODEL: VoyageModel = "voyage-4-large"

/**
 * Embedding dimensions for each model
 */
export const MODEL_DIMENSIONS: Record<VoyageModel, number> = {
  "voyage-4-large": 1024,
  "voyage-4": 1024,
  "voyage-law-2": 1024,
  "voyage-finance-2": 1024,
  "voyage-code-2": 1024,
  "voyage-multilingual-2": 1024,
}

/**
 * Context length (tokens) for each model
 */
export const MODEL_CONTEXT_LENGTH: Record<VoyageModel, number> = {
  "voyage-4-large": 32000,
  "voyage-4": 32000,
  "voyage-law-2": 16000,
  "voyage-finance-2": 32000,
  "voyage-code-2": 32000,
  "voyage-multilingual-2": 32000,
}

/**
 * Voyage API embedding response
 */
export interface VoyageEmbeddingResponse {
  data: VoyageEmbeddingData[]
  model: string
  usage: {
    total_tokens: number
  }
}

export interface VoyageEmbeddingData {
  embedding: number[]
  index: number
  object: string
}

/**
 * Voyage API error response
 */
export interface VoyageErrorResponse {
  error: {
    message: string
    type: string
    code?: string
  }
}

/**
 * Chunk options for document splitting
 */
export interface ChunkOptions {
  /** Maximum chunk size in tokens (approximate) */
  maxChunkSize?: number
  /** Overlap between chunks in tokens */
  overlap?: number
  /** Whether to preserve paragraph boundaries */
  preserveParagraphs?: boolean
  /** Whether to preserve sentence boundaries */
  preserveSentences?: boolean
}

/**
 * Document chunk result
 */
export interface DocumentChunk {
  text: string
  index: number
  startPosition: number
  endPosition: number
  estimatedTokens: number
}

/**
 * Semantic search options
 */
export interface SemanticSearchOptions {
  /** Categories to filter by (default: all) */
  categories?: string[]
  /** Minimum similarity threshold (0-1, default: 0.7) */
  threshold?: number
  /** Maximum number of results (default: 10) */
  limit?: number
  /** Whether to include chunk text in results */
  includeText?: boolean
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  documentId: number
  documentTitle: string
  chunkIndex: number
  text: string
  score: number
  category: string
  startPosition?: number
  endPosition?: number
}

/**
 * RAG context assembly options
 */
export interface RagContextOptions {
  /** Categories to include */
  categories?: string[]
  /** Maximum tokens in context (default: 4000) */
  maxTokens?: number
  /** Minimum similarity threshold */
  threshold?: number
  /** Whether to include source references */
  includeSources?: boolean
}

/**
 * RAG context result
 */
export interface RagContextResult {
  context: string
  sources: Array<{
    documentId: number
    title: string
    chunk: string
    score: number
    category: string
  }>
  totalTokens: number
}
