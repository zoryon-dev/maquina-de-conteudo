/**
 * RAG Types
 *
 * Type definitions for Retrieval Augmented Generation system.
 */


/**
 * Document categories available for RAG
 */
export const RAG_CATEGORIES = [
  "general",
  "products",
  "offers",
  "brand",
  "audience",
  "competitors",
  "content",
] as const

export type RagCategory = (typeof RAG_CATEGORIES)[number]

/**
 * RAG context assembly options
 */
export interface RagContextOptions {
  /**
   * Document categories to include in search
   * @default all categories
   */
  categories?: RagCategory[]

  /**
   * Specific document IDs to search within (for manual selection)
   * @default all documents in categories
   */
  documentIds?: number[]

  /**
   * Minimum similarity threshold for including chunks
   * @default 0.6 (lower than search for more context)
   */
  threshold?: number

  /**
   * Maximum number of chunks to include
   * @default 10
   */
  maxChunks?: number

  /**
   * Maximum tokens in assembled context
   * @default 4000
   */
  maxTokens?: number

  /**
   * Whether to include source references
   * @default true
   */
  includeSources?: boolean

  /**
   * Whether to use hybrid search (semantic + keyword)
   * @default false
   */
  hybrid?: boolean

  /**
   * Weight for semantic search in hybrid mode
   * @default 0.7
   */
  semanticWeight?: number

  /**
   * Weight for keyword search in hybrid mode
   * @default 0.3
   */
  keywordWeight?: number
}

/**
 * A single source reference in RAG context
 */
export interface RagSource {
  id: number
  title: string
  category: string
  score: number
  chunkCount: number
}

/**
 * RAG context result
 */
export interface RagContextResult {
  /**
   * Assembled context string for LLM prompt
   */
  context: string

  /**
   * Sources used in context (for citation)
   */
  sources: RagSource[]

  /**
   * Total tokens in context
   */
  tokensUsed: number

  /**
   * Number of chunks included
   */
  chunksIncluded: number

  /**
   * Whether context was truncated due to token limit
   */
  truncated: boolean
}

/**
 * Chunk with metadata for RAG
 */
export interface RagChunk {
  text: string
  documentId: number
  documentTitle: string
  chunkIndex: number
  score: number
  category: string
  startPosition?: number
  endPosition?: number
  estimatedTokens?: number
}

/**
 * Relevance filter result
 */
export interface RelevanceFilterResult {
  passed: boolean
  reason?: string
  adjustedScore?: number
}

/**
 * Token budget allocation
 */
export interface TokenBudget {
  total: number
  system: number
  context: number
  response: number
  reserved: number
}

/**
 * Default token budgets by model
 */
export const DEFAULT_TOKEN_BUDGETS: Record<string, TokenBudget> = {
  "voyage-4-large": {
    total: 32000,
    system: 1000,
    context: 8000,
    response: 4000,
    reserved: 1000,
  },
  "claude-opus-4": {
    total: 200000,
    system: 2000,
    context: 16000,
    response: 8000,
    reserved: 2000,
  },
  "claude-sonnet-4": {
    total: 200000,
    system: 2000,
    context: 12000,
    response: 6000,
    reserved: 2000,
  },
  "gpt-5": {
    total: 128000,
    system: 1500,
    context: 10000,
    response: 5000,
    reserved: 1500,
  },
}
