/**
 * Perplexity Theme Processor Service
 *
 * Uses AI to process Perplexity discovery results into better Wizard inputs.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Takes raw Perplexity AI summary (long, markdown-formatted)
 * - Extracts a concise theme for Wizard
 * - Identifies the best reference URL from citations
 * - Uses google/gemini-3-flash-preview for fast processing
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessedThemeResult {
  /** Main theme - concise, 1-2 sentences max */
  theme: string
  /** Additional context - key points, expanded info */
  context: string
  /** Best reference URL from citations */
  referenceUrl: string
  /** Suggested objective based on content */
  objective?: string
  /** Extracted key topics as hashtags */
  suggestedTags?: string[]
}

export interface PerplexityThemeData {
  title: string
  theme: string
  context?: string
  briefing?: string
  keyPoints?: string[]
  angles?: string[]
  sourceUrl?: string
  sourceData?: {
    summary?: string
    allCitations?: string[]
    [key: string]: unknown
  }
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for processing Perplexity themes into Wizard-ready data.
 */
export class ThemeProcessorService {
  private apiKey: string | undefined;
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'google/gemini-2.0-flash-exp:free';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  /**
   * Check if the service is available.
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Process Perplexity theme data into Wizard-ready format.
   *
   * @param themeData - Raw theme data from Perplexity discovery
   * @returns Processed theme with concise theme, context, and reference URL
   */
  async processPerplexityTheme(themeData: PerplexityThemeData): Promise<ProcessedThemeResult> {
    // Graceful degradation when not configured
    if (!this.isAvailable()) {
      return this.fallbackProcessing(themeData);
    }

    // Get the best content to process
    const contentToProcess =
      themeData.sourceData?.summary ||
      themeData.context ||
      themeData.briefing ||
      '';

    // Get citations for reference URL
    const citations = (themeData.sourceData?.allCitations || []) as string[];
    const referenceUrl = this.getBestReferenceUrl(citations, themeData.sourceUrl);

    // If no content to process, return basic result
    if (!contentToProcess || contentToProcess.length < 50) {
      return {
        theme: themeData.theme || themeData.title,
        context: themeData.context || '',
        referenceUrl,
      };
    }

    try {
      const result = await this.processWithAI(contentToProcess, themeData.theme);

      return {
        ...result,
        referenceUrl,
      };
    } catch (error) {
      console.error('[ThemeProcessor] AI processing failed:', error);
      return this.fallbackProcessing(themeData);
    }
  }

  /**
   * Use AI to process the content into a better theme.
   */
  private async processWithAI(
    content: string,
    originalTheme: string
  ): Promise<Omit<ProcessedThemeResult, 'referenceUrl'>> {
    const prompt = this.buildPrompt(content, originalTheme);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_APP_NAME || 'contentMachine',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em criar conteúdo para redes sociais. Sua tarefa é processar informações de trending topics e extrair os elementos mais importantes para criar conteúdo viral.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    return this.parseAIResponse(aiResponse, originalTheme);
  }

  /**
   * Build the prompt for AI processing.
   */
  private buildPrompt(content: string, originalTheme: string): string {
    // Truncate content if too long (keep first ~2000 chars)
    const truncatedContent = content.length > 2500
      ? content.substring(0, 2500) + '...'
      : content;

    return `Analise o seguinte conteúdo sobre "${originalTheme}" e extraia as informações mais importantes para criar conteúdo para redes sociais:

CONTEÚDO:
"""
${truncatedContent}
"""

Por favor, retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{
  "theme": "tema principal em 1-2 frases curtas e impactantes",
  "context": "3-5 pontos principais do conteúdo, cada um em uma linha curta",
  "objective": "objetivo sugerido para o conteúdo em uma frase",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Regras:
- theme: deve ser curto, impactante, ideal para caption
- context: bullet points com as informações mais valiosas
- objective: o que esse conteúdo deve achieves (ex: "educar sobre X", "gerar engajamento sobre Y")
- suggestedTags: 3-5 hashtags relevantes baseadas no conteúdo`;
  }

  /**
   * Parse AI response into ProcessedThemeResult.
   */
  private parseAIResponse(
    aiResponse: string,
    fallbackTheme: string
  ): Omit<ProcessedThemeResult, 'referenceUrl'> {
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr) as {
        theme?: string;
        context?: string;
        objective?: string;
        suggestedTags?: string[];
      };

      return {
        theme: parsed.theme || fallbackTheme,
        context: parsed.context || '',
        objective: parsed.objective, // Fixed: was using 'object' instead of 'objective'
        suggestedTags: parsed.suggestedTags || [],
      };
    } catch (error) {
      console.error('[ThemeProcessor] Failed to parse AI response:', error);
      return {
        theme: fallbackTheme,
        context: aiResponse.substring(0, 500),
      };
    }
  }

  /**
   * Get the best reference URL from citations.
   */
  private getBestReferenceUrl(citations: string[], sourceUrl?: string): string {
    if (citations.length > 0) {
      return citations[0];
    }
    return sourceUrl || '';
  }

  /**
   * Fallback processing when AI is not available.
   */
  private fallbackProcessing(themeData: PerplexityThemeData): ProcessedThemeResult {
    const citations = (themeData.sourceData?.allCitations || []) as string[];

    return {
      theme: themeData.theme || themeData.title,
      context: this.extractBulletPoints(themeData.context || themeData.briefing || ''),
      referenceUrl: this.getBestReferenceUrl(citations, themeData.sourceUrl),
    };
  }

  /**
   * Extract bullet points from markdown-formatted text.
   */
  private extractBulletPoints(text: string): string {
    // Remove markdown formatting and extract key points
    const lines = text.split('\n');
    const bulletPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and headers
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Remove bullet markers and clean up
      const cleaned = trimmed
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      if (cleaned.length > 10 && cleaned.length < 200) {
        bulletPoints.push(cleaned);
      }

      if (bulletPoints.length >= 5) break;
    }

    return bulletPoints.join('\n');
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Process a Perplexity theme into Wizard-ready format.
 */
export async function processPerplexityTheme(
  themeData: PerplexityThemeData
): Promise<ProcessedThemeResult> {
  const service = new ThemeProcessorService();
  return service.processPerplexityTheme(themeData);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the theme processor service is available.
 */
export function isThemeProcessorAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
