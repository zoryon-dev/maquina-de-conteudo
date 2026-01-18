/**
 * RAG Service for Wizard
 *
 * Wrapper around existing RAG implementation for Wizard integration.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - This service wraps the existing assembleRagContext() from @/lib/rag/assembler
 * - Provides Wizard-specific interface with graceful degradation
 * - Returns null if RAG is not available, allowing job to continue
 * - Maps document IDs and titles for source citation
 */

import { assembleRagContext } from "@/lib/rag/assembler";
import type { RagCategory } from "@/lib/rag/types";
import type { RagConfig, RagResult, ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default RAG options for Wizard.
 *
 * Optimized for social media content generation:
 * - Lower threshold for better recall (0.5)
 * - Moderate token budget (3000)
 * - Include sources for attribution
 */
const WIZARD_DEFAULT_RAG_OPTIONS = {
  threshold: 0.5,
  maxChunks: 15,
  maxTokens: 3000,
  includeSources: true,
};

// ============================================================================
// RAG CONTEXT GENERATION
// ============================================================================

/**
 * Generate RAG context for Wizard content generation.
 *
 * This function retrieves relevant document chunks and formats them
 * for inclusion in LLM prompts. Returns null if RAG is not configured
 * or no relevant content is found (graceful degradation).
 *
 * @param userId - User ID for authorization
 * @param query - Search query for semantic search
 * @param config - RAG configuration
 * @returns Service result with RAG context or null
 *
 * @example
 * ```ts
 * const result = await generateWizardRagContext(userId, "Brand voice guidelines", {
 *   mode: "auto",
 *   threshold: 0.5
 * })
 *
 * if (result.success && result.data) {
 *   console.log(result.data.context) // Formatted context string
 *   console.log(result.data.sources) // Source documents
 * }
 * ```
 */
export async function generateWizardRagContext(
  userId: string,
  query: string,
  config: RagConfig = {}
): Promise<ServiceResult<RagResult | null>> {
  try {
    // Check if RAG should be used
    const shouldUseRag = config.mode === "auto" || config.mode === undefined;

    if (!shouldUseRag) {
      // Manual mode disabled - return empty result
      return {
        success: true,
        data: null,
      };
    }

    // Map RagConfig to assembler options
    const categories: RagCategory[] | undefined = config.collections
      ? convertCollectionsToCategories(config.collections)
      : undefined;

    const assemblerOptions = {
      categories,
      threshold: config.threshold ?? WIZARD_DEFAULT_RAG_OPTIONS.threshold,
      maxChunks: config.maxChunks ?? WIZARD_DEFAULT_RAG_OPTIONS.maxChunks,
      maxTokens: WIZARD_DEFAULT_RAG_OPTIONS.maxTokens,
      includeSources: WIZARD_DEFAULT_RAG_OPTIONS.includeSources,
    };

    // Call the existing RAG assembler
    const ragResult = await assembleRagContext(userId, query, assemblerOptions);

    // Check if any context was found
    if (!ragResult.context || ragResult.chunksIncluded === 0) {
      // No relevant content found - not an error, just no RAG data
      return {
        success: true,
        data: null,
      };
    }

    // Transform to Wizard format
    const wizardRagResult: RagResult = {
      context: ragResult.context,
      sources: ragResult.sources.map((s) => ({
        id: s.id,
        title: s.title,
      })),
      tokensUsed: ragResult.tokensUsed,
      chunksIncluded: ragResult.chunksIncluded,
    };

    return {
      success: true,
      data: wizardRagResult,
    };
  } catch (error) {
    console.error("Error generating RAG context:", error);

    // RAG failure should not block the job - return null with success
    return {
      success: true,
      data: null,
    };
  }
}

/**
 * Generate RAG context for specific documents.
 *
 * When the user manually selects documents/collections, this function
 * restricts the search to only those sources.
 *
 * @param userId - User ID for authorization
 * @param query - Search query
 * @param config - RAG configuration with document/collection IDs
 * @returns Service result with RAG context
 */
export async function generateWizardRagContextFromSelection(
  userId: string,
  query: string,
  config: RagConfig
): Promise<ServiceResult<RagResult | null>> {
  return generateWizardRagContext(userId, query, {
    ...config,
    mode: "manual",
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert collection IDs to RAG categories.
 *
 * This is a placeholder for future collection-to-category mapping.
 * Currently returns undefined to use all categories.
 */
function convertCollectionsToCategories(
  _collectionIds: number[]
): RagCategory[] | undefined {
  // TODO: Implement collection -> category mapping
  // For now, return undefined to use all categories
  return undefined;
}

/**
 * Check if RAG is available for a user.
 *
 * Verifies that the user has embedded documents that can be used
 * for RAG context generation.
 *
 * @param userId - User ID to check
 * @returns true if RAG context is available
 */
export async function isWizardRagAvailable(userId: string): Promise<boolean> {
  try {
    const { isRagAvailable } = await import("@/lib/rag/assembler");
    return await isRagAvailable(userId);
  } catch {
    return false;
  }
}

/**
 * Get RAG statistics for a user.
 *
 * Returns counts of documents and chunks available for RAG.
 *
 * @param userId - User ID
 * @returns RAG statistics or null if unavailable
 */
export async function getWizardRagStats(userId: string): Promise<{
  totalDocuments: number;
  totalChunks: number;
  hasEmbeddedDocuments: boolean;
} | null> {
  try {
    const { getRagStats } = await import("@/lib/rag/assembler");
    const stats = await getRagStats(userId);

    return {
      totalDocuments: stats.totalDocuments,
      totalChunks: stats.totalChunks,
      hasEmbeddedDocuments: stats.hasEmbeddedDocuments,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format RAG result for inclusion in prompt.
 *
 * Converts the RAG result to a string that can be directly
 * inserted into LLM prompts.
 *
 * @param ragResult - RAG result from generateWizardRagContext
 * @returns Formatted string for prompt inclusion
 */
export function formatRagForPrompt(ragResult: RagResult | null): string {
  if (!ragResult || !ragResult.context) {
    return "";
  }

  const parts: string[] = [];

  parts.push("═══════════════════════════════════════════════════════════════");
  parts.push("CONTEXTO ADICIONAL (Base de Conhecimento)");
  parts.push("═══════════════════════════════════════════════════════════════");
  parts.push("");

  if (ragResult.sources.length > 0) {
    parts.push("Fontes utilizadas:");
    for (const source of ragResult.sources) {
      parts.push(`  - ${source.title}`);
    }
    parts.push("");
  }

  parts.push(ragResult.context);
  parts.push("");
  parts.push("═══════════════════════════════════════════════════════════════");

  return parts.join("\n");
}

/**
 * Format RAG sources for metadata storage.
 *
 * Creates a compact representation of sources for storing
 * in the database with generated content.
 */
export function formatRagSourcesForMetadata(ragResult: RagResult | null): Array<{
  id: number;
  title: string;
}> {
  if (!ragResult || !ragResult.sources) {
    return [];
  }

  return ragResult.sources.map((s) => ({
    id: s.id,
    title: s.title,
  }));
}
