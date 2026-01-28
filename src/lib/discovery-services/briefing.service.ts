/**
 * Briefing Service
 *
 * Generates AI-powered briefings for trending topics using OpenRouter + Gemini Flash.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Uses Vercel AI SDK's generateObject() with zod schema
 * - Model: google/gemini-3-flash-preview (fast, cost-effective)
 * - Batch processing with rate limiting
 * - Graceful degradation when OpenRouter not configured
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { openrouter } from '@/lib/ai/config';
import type { TrendingTopic, TrendingTopicWithBriefing } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Model to use for briefing generation.
 * Gemini Flash is fast and cost-effective for structured output.
 */
const BRIEFING_MODEL = 'google/gemini-3-flash-preview';

/**
 * Batch size for parallel processing.
 */
const BATCH_SIZE = 5;

/**
 * Delay between batches (ms) for rate limiting.
 */
const BATCH_DELAY = 1000;

// ============================================================================
// BRIEFING SCHEMA
// ============================================================================

/**
 * Zod schema for AI-generated briefing.
 */
const briefingSchema = z.object({
  briefing: z.string().describe('Resumo de 2-3 frases sobre o tema'),
  keyPoints: z.array(z.string()).min(3).max(5).describe('3-5 pontos-chave'),
  angles: z.array(z.string()).min(2).max(3).describe('2-3 ângulos criativos'),
  targetAudience: z.string().describe('Público-alvo sugerido'),
});

export type BriefingResult = z.infer<typeof briefingSchema>;

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for generating AI briefings for trending topics.
 *
 * @example
 * ```ts
 * const service = new BriefingService();
 * const enriched = await service.enrichBatch(topics);
 * // enriched.length → quantidade de tópicos enriquecidos
 * ```
 */
export class BriefingService {
  private model = openrouter ? openrouter(BRIEFING_MODEL) : null;

  /**
   * Enrich a batch of topics with AI-generated briefings.
   *
   * Processes topics in parallel batches with rate limiting.
   *
   * @param topics - Array of trending topics
   * @returns Array of topics with briefings
   */
  async enrichBatch(topics: TrendingTopic[]): Promise<TrendingTopicWithBriefing[]> {
    // Check if OpenRouter is configured
    if (!this.model) {
      return topics.map((t) => ({
        ...t,
        briefing: '',
        keyPoints: [],
        suggestedAngles: [],
      })) as TrendingTopicWithBriefing[];
    }

    const results: TrendingTopicWithBriefing[] = [];

    // Process in batches
    for (let i = 0; i < topics.length; i += BATCH_SIZE) {
      const batch = topics.slice(i, i + BATCH_SIZE);
      const enriched = await Promise.all(
        batch.map((topic) => this.enrichSingle(topic))
      );
      results.push(...enriched);

      // Rate limiting between batches
      if (i + BATCH_SIZE < topics.length) {
        await this.delay(BATCH_DELAY);
      }
    }

    return results;
  }

  /**
   * Enrich a single topic with AI-generated briefing.
   *
   * @param topic - Trending topic to enrich
   * @returns Topic with briefing
   */
  async enrichSingle(topic: TrendingTopic): Promise<TrendingTopicWithBriefing> {
    if (!this.model) {
      return {
        ...topic,
        briefing: '',
        keyPoints: [],
        suggestedAngles: [],
      } as TrendingTopicWithBriefing;
    }

    try {
      const result = await generateObject({
        model: this.model,
        schema: briefingSchema,
        prompt: this.buildPrompt(topic),
      });

      return {
        ...topic,
        briefing: result.object.briefing,
        keyPoints: result.object.keyPoints,
        suggestedAngles: result.object.angles,
        targetAudience: result.object.targetAudience,
      };
    } catch (error) {
      console.error('[BriefingService] Error:', error);
      // Return topic without briefing on error
      return {
        ...topic,
        briefing: '',
        keyPoints: [],
        suggestedAngles: [],
      } as TrendingTopicWithBriefing;
    }
  }

  /**
   * Build prompt for AI briefing generation.
   */
  private buildPrompt(topic: TrendingTopic): string {
    return `Analise este tema de conteúdo para redes sociais e gere um briefing estruturado.

TEMA: ${topic.title}
DESCRIÇÃO ORIGINAL: ${topic.context}
FONTE: ${topic.source.type}
SCORE DE ENGAGEMENT: ${topic.metrics.engagementScore}

Gere um briefing completo que ajude um criador de conteúdo a desenvolver material sobre este tema.`;
  }

  /**
   * Delay helper for rate limiting.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if briefing service is available.
 */
export function isBriefingServiceAvailable(): boolean {
  return !!openrouter;
}
