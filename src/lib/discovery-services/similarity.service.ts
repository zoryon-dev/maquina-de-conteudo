/**
 * Similarity Service
 *
 * Calculates semantic similarity between keywords and trending topics
 * using Voyage AI embeddings.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Voyage AI embeddings (voyage-4-large)
 * - Cosine similarity for comparison
 * - Filters topics by similarity threshold
 * - Graceful degradation when VOYAGE_API_KEY not configured
 */

import type { TrendingTopic } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default similarity threshold for filtering.
 * Topics below this score are excluded.
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

/**
 * Voyage model to use for embeddings.
 * Matches the project's existing RAG configuration.
 */
const EMBEDDING_MODEL = 'voyage-4-large';

// ============================================================================
// VOYAGE EMBEDDINGS CLIENT
// ============================================================================

/**
 * Simple Voyage AI embeddings client.
 * Uses fetch API to call Voyage's embedding endpoint.
 */
class VoyageEmbeddingsClient {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.voyageai.com/v1';

  constructor() {
    this.apiKey = process.env.VOYAGE_API_KEY;
  }

  /**
   * Check if the client is configured.
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate embedding for a single text.
   */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [text],
          model: EMBEDDING_MODEL,
          input_type: 'query',
        }),
      });

      if (!response.ok) {
        console.error('[VoyageEmbeddings] API error:', response.status);
        return null;
      }

      const data = await response.json();
      return data.data?.[0]?.embedding || null;
    } catch (error) {
      console.error('[VoyageEmbeddings] Error:', error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.apiKey || texts.length === 0) {
      return texts.map(() => null);
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: EMBEDDING_MODEL,
          input_type: 'query',
        }),
      });

      if (!response.ok) {
        console.error('[VoyageEmbeddings] API error:', response.status);
        return texts.map(() => null);
      }

      const data = await response.json();
      return (data.data || []).map((item: any) => item.embedding || null);
    } catch (error) {
      console.error('[VoyageEmbeddings] Error:', error);
      return texts.map(() => null);
    }
  }
}

// ============================================================================
// SIMILARITY SERVICE
// ============================================================================

/**
 * Service for calculating semantic similarity between keywords and topics.
 *
 * @example
 * ```ts
 * const service = new SimilarityService();
 * const filtered = await service.filterBySimilarity(topics, 'AI marketing', 0.3);
 * console.log(`Filtered to ${filtered.length} similar topics`);
 * ```
 */
export class SimilarityService {
  private embeddings: VoyageEmbeddingsClient;

  constructor() {
    this.embeddings = new VoyageEmbeddingsClient();
  }

  /**
   * Filter topics by similarity to a keyword.
   *
   * Calculates embeddings for the keyword and each topic,
   * then filters by similarity threshold.
   *
   * @param topics - Array of trending topics
   * @param keyword - Keyword to compare against
   * @param threshold - Minimum similarity score (0-1)
   * @returns Filtered array with similarity scores
   */
  async filterBySimilarity(
    topics: TrendingTopic[],
    keyword: string,
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD
  ): Promise<TrendingTopic[]> {
    // Graceful degradation when embeddings not available
    if (!this.embeddings.isAvailable()) {
      console.warn('[Similarity] Voyage not configured, returning all topics with similarity=1');
      return topics.map((t) => ({ ...t, similarity: 1 }));
    }

    // Generate keyword embedding
    const keywordEmbedding = await this.embeddings.embedQuery(keyword);
    if (!keywordEmbedding) {
      return topics.map((t) => ({ ...t, similarity: 1 }));
    }

    // Prepare texts for embedding
    const textsToEmbed = topics.map((topic) =>
      `${topic.title} ${topic.context}`.substring(0, 500)
    );

    // Batch embed all topics
    const topicEmbeddings = await this.embeddings.embedBatch(textsToEmbed);

    // Calculate similarity for each topic
    const results = topics.map((topic, index) => {
      const embedding = topicEmbeddings[index];
      const similarity = embedding
        ? this.cosineSimilarity(keywordEmbedding, embedding)
        : 1; // Default to 1 if embedding failed

      return {
        ...topic,
        similarity,
      };
    });

    // Filter by threshold
    return results.filter((t) => (t.similarity ?? 0) >= threshold);
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if similarity service is available.
 */
export function isSimilarityServiceAvailable(): boolean {
  return !!process.env.VOYAGE_API_KEY;
}
