/**
 * RAG Module - Client-Safe Exports
 *
 * This file ONLY exports types and constants that are safe to use
 * in Client Components. Functions that access the database are
 * NOT re-exported here and must be imported directly in server-side code.
 *
 * For server-side functions that use the database, import directly:
 * - import { assembleRagContext } from "@/lib/rag/assembler"
 * - import { semanticSearch } from "@/lib/voyage/search"
 */

// Types - safe for client components
export type {
  RagCategory,
  RagContextOptions,
  RagContextResult,
  RagSource,
  RagChunk,
  RelevanceFilterResult,
  TokenBudget,
} from "./types"

// Constants - safe for client components
export { RAG_CATEGORIES, DEFAULT_TOKEN_BUDGETS } from "./types"

// Token budget utilities - pure functions, safe for client
export {
  estimateTokens,
  getTokenBudget,
  getAvailableContextTokens,
  countChunksThatFit,
  selectChunksWithinBudget,
  truncateContextToFit,
  formatTokenCount,
  estimateContextOverhead,
} from "./token-budget"

// Filters - pure functions, safe for client
export {
  filterByRelevance,
  limitChunksPerDocument,
  deduplicateChunks,
  calculateTextSimilarity,
  validateChunk,
  boostByRecency,
  diversifyChunks,
  type FilterOptions,
} from "./filters"

// NOTE: assembleRagContext, getRelevantDocuments, isRagAvailable, getRagStats,
// getChunkText, getDocumentChunks are NOT exported here because they use the database.
// Import them directly from "./assembler" in Server Components/Actions only.
