/**
 * Social Theme Processor Service
 *
 * Uses AI to process Instagram and YouTube discovery results into better Wizard inputs.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Takes raw Instagram/YouTube discovery data
 * - Extracts a concise theme for Wizard
 * - Creates engaging context based on content type
 * - Uses google/gemini-2.0-flash-exp:free for fast processing
 */

// ============================================================================
// TYPES
// ============================================================================

export type SocialPlatform = 'instagram' | 'youtube';

export interface ProcessedSocialThemeResult {
  /** Main theme - concise, 1-2 sentences max */
  theme: string
  /** Additional context - key points, expanded info */
  context: string
  /** Suggested objective based on content */
  objective?: string
  /** Extracted key topics as hashtags */
  suggestedTags?: string[]
  /** Suggested content type */
  suggestedContentType?: 'image' | 'carousel' | 'video' | 'text'
}

export interface SocialThemeData {
  title: string
  theme: string
  context?: string
  briefing?: string
  keyPoints?: string[]
  angles?: string[]
  sourceUrl?: string
  sourceData?: {
    snippet?: string
    thumbnail?: string
    hashtags?: string[]
    engagementText?: string
    [key: string]: unknown
  }
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Service for processing social media themes into Wizard-ready format.
 */
export class SocialThemeProcessorService {
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
   * Process social media theme data into Wizard-ready format.
   *
   * @param themeData - Raw theme data from Instagram/YouTube discovery
   * @param platform - 'instagram' or 'youtube'
   * @returns Processed theme with concise theme, context, and suggestions
   */
  async processSocialTheme(
    themeData: SocialThemeData,
    platform: SocialPlatform
  ): Promise<ProcessedSocialThemeResult> {
    // Graceful degradation when not configured
    if (!this.isAvailable()) {
      console.warn(`[SocialThemeProcessor] OPENROUTER_API_KEY not configured, using raw data for ${platform}`);
      return this.fallbackProcessing(themeData, platform);
    }

    // Get the best content to process
    const contentToProcess =
      themeData.briefing ||
      themeData.context ||
      themeData.sourceData?.snippet ||
      '';

    // If no content to process, return basic result
    if (!contentToProcess || contentToProcess.length < 30) {
      return {
        theme: themeData.theme || themeData.title,
        context: themeData.context || '',
        suggestedContentType: platform === 'youtube' ? 'video' : 'image',
      };
    }

    try {
      console.log(`[SocialThemeProcessor] Processing ${platform} theme with AI...`);

      const result = await this.processWithAI(contentToProcess, themeData.theme, platform);

      console.log(`[SocialThemeProcessor] AI processing completed for ${platform}`);

      return result;
    } catch (error) {
      console.error(`[SocialThemeProcessor] AI processing failed for ${platform}:`, error);
      return this.fallbackProcessing(themeData, platform);
    }
  }

  /**
   * Use AI to process the content into a better theme.
   */
  private async processWithAI(
    content: string,
    originalTheme: string,
    platform: SocialPlatform
  ): Promise<ProcessedSocialThemeResult> {
    const prompt = this.buildPrompt(content, originalTheme, platform);

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
            content: this.getSystemPrompt(platform),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    return this.parseAIResponse(aiResponse, originalTheme, platform);
  }

  /**
   * Get platform-specific system prompt.
   */
  private getSystemPrompt(platform: SocialPlatform): string {
    if (platform === 'instagram') {
      return `Você é um especialista em criar conteúdo viral para Instagram. Sua tarefa é processar informações de trending topics do Instagram e transformá-los em ideias de conteúdo engajantes.

Foque em:
- Conteúdo visual e impactante
- Hashtags relevantes
- Call-to-actions eficazes
- Formatos que performam bem (carrossel, reel, post)`;
    }

    return `Você é um especialista em criar conteúdo viral para YouTube e redes sociais. Sua tarefa é processar informações de trending topics do YouTube e transformá-las em ideias de conteúdo engajáveis.

Foque em:
- Conteúdo educativo e entretenimento
- Hooks que prendem a atenção
- Formatos curtos e dinâmicos (Shorts, vídeos)
- Hashtags relevantes`;
  }

  /**
   * Build the prompt for AI processing.
   */
  private buildPrompt(content: string, originalTheme: string, platform: SocialPlatform): string {
    // Truncate content if too long
    const truncatedContent = content.length > 2000
      ? content.substring(0, 2000) + '...'
      : content;

    const contentTypeOptions = platform === 'instagram'
      ? '"image" (post tradicional), "carousel" (vários slides), ou "video" (reels)'
      : '"video" (YouTube/Shorts) ou "image" (thumbnail/post)';

    return `Analise o seguinte conteúdo ${platform} sobre "${originalTheme}" e extraia as informações mais importantes:

CONTEÚDO:
"""
${truncatedContent}
"""

Por favor, retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{
  "theme": "tema principal em 1-2 frases curtas e impactantes",
  "context": "3-5 pontos principais do conteúdo, cada um em uma linha curta",
  "objective": "objetivo sugerido para o conteúdo em uma frase",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedContentType": ${contentTypeOptions}
}

Regras:
- theme: curto, impactante, ideal para caption
- context: bullet points com as informações valiosas
- objective: o que o conteúdo deve achieve
- suggestedTags: 3-5 hashtags relevantes SEM o símbolo #
- suggestedContentType: formato mais adequado baseado no conteúdo`;
  }

  /**
   * Parse AI response into ProcessedSocialThemeResult.
   */
  private parseAIResponse(
    aiResponse: string,
    fallbackTheme: string,
    platform: SocialPlatform
  ): ProcessedSocialThemeResult {
    try {
      // Try to extract JSON from response
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
        suggestedContentType?: string;
      };

      return {
        theme: parsed.theme || fallbackTheme,
        context: parsed.context || '',
        objective: parsed.objective,
        suggestedTags: parsed.suggestedTags || [],
        suggestedContentType: this.validateContentType(parsed.suggestedContentType, platform),
      };
    } catch (error) {
      console.error('[SocialThemeProcessor] Failed to parse AI response:', error);
      return {
        theme: fallbackTheme,
        context: aiResponse.substring(0, 500),
        suggestedContentType: platform === 'youtube' ? 'video' : 'image',
      };
    }
  }

  /**
   * Validate and normalize content type.
   */
  private validateContentType(
    type: string | undefined,
    platform: SocialPlatform
  ): 'image' | 'carousel' | 'video' | 'text' {
    const validTypes = ['image', 'carousel', 'video', 'text'];
    const normalized = type?.toLowerCase();

    if (validTypes.includes(normalized || '')) {
      return normalized as 'image' | 'carousel' | 'video' | 'text';
    }

    // Default based on platform
    return platform === 'youtube' ? 'video' : 'image';
  }

  /**
   * Fallback processing when AI is not available.
   */
  private fallbackProcessing(
    themeData: SocialThemeData,
    platform: SocialPlatform
  ): ProcessedSocialThemeResult {
    return {
      theme: themeData.theme || themeData.title,
      context: this.extractBulletPoints(themeData.context || themeData.briefing || ''),
      suggestedContentType: platform === 'youtube' ? 'video' : 'image',
    };
  }

  /**
   * Extract bullet points from text.
   */
  private extractBulletPoints(text: string): string {
    const lines = text.split('\n');
    const bulletPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

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
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Process an Instagram theme into Wizard-ready format.
 */
export async function processInstagramTheme(
  themeData: SocialThemeData
): Promise<ProcessedSocialThemeResult> {
  const service = new SocialThemeProcessorService();
  return service.processSocialTheme(themeData, 'instagram');
}

/**
 * Process a YouTube theme into Wizard-ready format.
 */
export async function processYouTubeTheme(
  themeData: SocialThemeData
): Promise<ProcessedSocialThemeResult> {
  const service = new SocialThemeProcessorService();
  return service.processSocialTheme(themeData, 'youtube');
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the social theme processor service is available.
 */
export function isSocialThemeProcessorAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
