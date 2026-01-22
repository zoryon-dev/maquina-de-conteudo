# Feature: Trending Topics Discovery

## Visão Geral

Feature para descobrir temas quentes nas redes sociais (YouTube, Instagram) com base em uma palavra-chave, permitindo salvar temas em uma biblioteca persistente e criar conteúdo diretamente no Wizard.

**Escopo MVP Decidido:**
- YouTube Data API (oficial)
- Instagram via Apify (2 actors em sequência)
- Localização: `/discover` (nova página)
- IA para briefings: `google/gemini-3-flash-preview`

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INPUT: Keyword                                  │
│                      "IA para negócios"                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
┌───────────────────────────┐  ┌───────────────────────────────────────────┐
│   YouTube Data API v3     │  │   Instagram (Apify - 2 Actors)            │
│                           │  │                                           │
│ • search().list()         │  │  STEP 1: instagram-search-scraper         │
│ • relevance + viewCount   │  │  → Descobre hashtags relacionadas          │
│ • snippet + statistics    │  │  → Volume, postsPerDay, difficulty         │
└───────────┬───────────────┘  └───────────────────┬───────────────────────┘
            │                                      │
            │                         ┌────────────┴────────────┐
            │                         ▼                         │
            │              ┌─────────────────────┐              │
            │              │  Filter Top N       │              │
            │              │  (ex: top 10)       │              │
            │              └──────────┬──────────┘              │
            │                         │                         │
            │                         ▼                         │
            │              ┌─────────────────────────────┐     │
            │              │  STEP 2: instagram-related  │     │
            │              │  hashtag-stats-scraper      │     │
            │              │  → Análise profunda         │     │
            │              │  → Growth rate, trendScore  │     │
            │              │  → Related semantic/literal │     │
            │              └───────────┬─────────────────┘     │
            │                          │                       │
            └──────────────┬───────────┴───────────────────────┘
                           ▼
                ┌──────────────────────┐
                │  Aggregate Results   │
                │  + Calculate Similarity│
                │  (Voyage embeddings)  │
                └──────────┬─────────────┘
                           ▼
                ┌──────────────────────┐
                │  Rank by Engagement  │
                │  + Recency + Similarity│
                └──────────┬─────────────┘
                           ▼
                ┌──────────────────────┐
                │  Filter Top 10       │
                └──────────┬─────────────┘
                           ▼
                ┌──────────────────────┐
                │  AI Briefing Service │
                │  (Gemini Flash)      │
                │  → briefing          │
                │  → keyPoints         │
                │  → angles            │
                │  → targetAudience    │
                └──────────┬─────────────┘
                           ▼
                ┌──────────────────────┐
                │  OUTPUT: 10 Themes   │
                │  com Briefings       │
                └──────────────────────┘
```

---

## 1. Instagram Integration (Apify)

Baseado em `.context/docs/development-plan/scraper-ig.md`

### Actor 1: Instagram Search Scraper

**Actor ID**: `apify/instagram-search-scraper`

```typescript
// src/lib/discovery-services/instagram/search-scraper.service.ts

import { ApifyClient } from 'apify-client';
import type { ServiceResult } from '@/lib/wizard-services/types';

interface SearchScraperInput {
  search: string;
  searchType: 'hashtag';
  resultsLimit: number;
}

interface SearchScraperResult {
  id: string;
  name: string;
  url: string;
  searchResultsCount?: number;
  postsCount?: number;
  postsPerDay?: number;
  difficulty?: 'average' | 'frequent' | 'rare';
  relatedAverageHashtags?: RelatedHashtag[];
  relatedFrequentHashtags?: RelatedHashtag[];
  relatedRareHashtags?: RelatedHashtag[];
}

interface RelatedHashtag {
  name: string;
  volume: number;
}

export class InstagramSearchScraperService {
  private client: ApifyClient | null = null;

  constructor() {
    const token = process.env.APIFY_API_TOKEN;
    if (token) {
      this.client = new ApifyClient({ token });
    }
  }

  async searchHashtags(
    searchTerm: string,
    options: { resultsLimit?: number } = {}
  ): Promise<ServiceResult<SearchScraperResult[]>> {
    if (!this.client) {
      return { success: true, data: null }; // Graceful degradation
    }

    try {
      const actor = this.client.actor('apify/instagram-search-scraper');

      const run = await actor.call({
        search: searchTerm,
        searchType: 'hashtag',
        resultsLimit: options.resultsLimit ?? 50,
        addParentData: false,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      return {
        success: true,
        data: items as SearchScraperResult[],
      };
    } catch (error) {
      console.error('[InstagramSearchScraper] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }
}
```

### Actor 2: Instagram Related Hashtag Stats Scraper

**Actor ID**: `scraper-engine/instagram-related-hashtag-stats-scraper`

```typescript
// src/lib/discovery-services/instagram/stats-scraper.service.ts

import { ApifyClient } from 'apify-client';
import type { ServiceResult } from '@/lib/wizard-services/types';

interface HashtagStatsInput {
  hashtags: string[];
  maxResults?: number;
  includeRelated?: boolean;
  includeSemantic?: boolean;
  includeLiteral?: boolean;
}

interface HashtagStatsResult {
  hashtag: string;
  url: string;
  totalPosts: number;
  postsPerDay: number;
  postsPerWeek: number;
  growthRate?: number;
  trendScore?: number;
  relatedHashtags: {
    semantic: SemanticHashtag[];
    literal: LiteralHashtag[];
  };
  topPosts?: TopPost[];
  scrapedAt: string;
}

interface SemanticHashtag {
  name: string;
  usageCount: number;
  relevanceScore: number;
  postsCount: number;
}

interface LiteralHashtag {
  name: string;
  usageCount: number;
  similarity: number;
  postsCount: number;
}

interface TopPost {
  id: string;
  url: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  engagement: number;
}

export class InstagramStatsScraperService {
  private client: ApifyClient | null = null;

  constructor() {
    const token = process.env.APIFY_API_TOKEN;
    if (token) {
      this.client = new ApifyClient({ token });
    }
  }

  async getHashtagStats(
    hashtags: string[],
    options: { maxResults?: number } = {}
  ): Promise<ServiceResult<HashtagStatsResult[]>> {
    if (!this.client) {
      return { success: true, data: null };
    }

    try {
      const actor = this.client.actor(
        'scraper-engine/instagram-related-hashtag-stats-scraper'
      );

      const run = await actor.call({
        hashtags,
        maxResults: options.maxResults ?? 100,
        includeRelated: true,
        includeSemantic: true,
        includeLiteral: true,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      return {
        success: true,
        data: items as HashtagStatsResult[],
      };
    } catch (error) {
      console.error('[InstagramStatsScraper] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }
}
```

### Orquestrador Instagram

```typescript
// src/lib/discovery-services/instagram/instagram-discovery.service.ts

import { InstagramSearchScraperService } from './search-scraper.service';
import { InstagramStatsScraperService } from './stats-scraper.service';
import type { TrendingTopic } from '../types';

export class InstagramDiscoveryService {
  private searchScraper: InstagramSearchScraperService;
  private statsScraper: InstagramStatsScraperService;

  constructor() {
    this.searchScraper = new InstagramSearchScraperService();
    this.statsScraper = new InstagramStatsScraperService();
  }

  async discoverByKeyword(keyword: string): Promise<TrendingTopic[]> {
    // STEP 1: Buscar hashtags relacionadas
    const searchResult = await this.searchScraper.searchHashtags(keyword, {
      resultsLimit: 50,
    });

    if (!searchResult.success || !searchResult.data) {
      return [];
    }

    // Filtrar e rankear por postsPerDay
    const topHashtags = searchResult.data
      .filter((item) => item.postsCount && item.postsCount > 100)
      .sort((a, b) => (b.postsPerDay || 0) - (a.postsPerDay || 0))
      .slice(0, 10)
      .map((item) => item.name);

    if (topHashtags.length === 0) {
      return [];
    }

    // STEP 2: Análise profunda
    const statsResult = await this.statsScraper.getHashtagStats(topHashtags);

    if (!statsResult.success || !statsResult.data) {
      return [];
    }

    // STEP 3: Converter para TrendingTopic format
    return statsResult.data.map(this.mapToTrendingTopic);
  }

  private mapToTrendingTopic(stats: HashtagStatsResult): TrendingTopic {
    const score = this.calculateTrendingScore(stats);

    // Extrair hashtags relacionadas trending
    const relatedTrending = [
      ...stats.relatedHashtags.semantic.slice(0, 5),
      ...stats.relatedHashtags.literal.slice(0, 3),
    ]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
      .map((h) => h.name);

    // Gerar título e contexto a partir dos top posts
    const topPost = stats.topPosts?.[0];
    const title = this.generateTitle(stats.hashtag, topPost?.caption);
    const context = topPost?.caption || '';

    return {
      id: `ig-${stats.hashtag}-${Date.now()}`,
      title,
      theme: stats.hashtag,
      context: context.substring(0, 500),
      targetAudience: '', // Será preenchido pela IA
      source: {
        type: 'instagram',
        url: stats.url,
        rawData: {
          hashtag: stats.hashtag,
          totalPosts: stats.totalPosts,
          postsPerDay: stats.postsPerDay,
          growthRate: stats.growthRate,
          trendScore: stats.trendScore,
          relatedHashtags: relatedTrending,
        },
      },
      metrics: {
        engagementScore: score,
        recency: new Date(stats.scrapedAt),
      },
    };
  }

  private calculateTrendingScore(stats: HashtagStatsResult): number {
    const weights = {
      growthRate: 0.35,
      trendScore: 0.30,
      postsPerDay: 0.20,
      engagement: 0.15,
    };

    const normalizedGrowth = Math.min(stats.growthRate || 0, 100);
    const normalizedTrend = stats.trendScore || 0;
    const normalizedPPD = Math.min((stats.postsPerDay / 100) * 100, 100);

    const avgEngagement =
      stats.topPosts && stats.topPosts.length > 0
        ? stats.topPosts.reduce((sum, p) => sum + p.engagement, 0) /
          stats.topPosts.length
        : 0;
    const normalizedEngagement = avgEngagement * 100;

    return (
      normalizedGrowth * weights.growthRate +
      normalizedTrend * weights.trendScore +
      normalizedPPD * weights.postsPerDay +
      normalizedEngagement * weights.engagement
    );
  }

  private generateTitle(hashtag: string, caption?: string): string {
    if (caption) {
      // Extrair primeira frase do caption
      const firstSentence = caption.split(/[.!?]/)[0];
      if (firstSentence.length > 20 && firstSentence.length < 100) {
        return firstSentence.trim();
      }
    }
    // Fallback: formato padrão
    return `Trending: #${hashtag}`;
  }
}
```

---

## 2. YouTube Integration (Data API v3)

```typescript
// src/lib/discovery-services/youtube/youtube-discovery.service.ts

import { google } from 'googleapis';
import type { TrendingTopic } from '../types';

export class YouTubeDiscoveryService {
  private youtube: any;

  constructor() {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (apiKey) {
      this.youtube = google.youtube({
        version: 'v3',
        auth: apiKey,
      });
    }
  }

  async discoverByKeyword(keyword: string): Promise<TrendingTopic[]> {
    if (!this.youtube) {
      return [];
    }

    try {
      // Buscar vídeos por keyword, ordenados por relevance
      const response = await this.youtube.search.list({
        part: 'snippet',
        q: keyword,
        type: 'video',
        order: 'relevance',
        maxResults: 25,
        publishedAfter: this.getDateOffset('week'),
      });

      // Buscar statistics em batch
      const videoIds = response.data.items.map((item: any) => item.id.videoId);
      const statsResponse = await this.youtube.videos.list({
        part: 'statistics',
        id: videoIds.join(','),
      });

      const statsMap = new Map(
        statsResponse.data.items.map((item: any) => [item.id, item.statistics])
      );

      // Converter para TrendingTopic
      const topics: TrendingTopic[] = response.data.items
        .map((item: any) => {
          const stats = statsMap.get(item.id.videoId);
          return this.mapToTrendingTopic(item, stats);
        })
        .filter((topic) => topic.metrics.engagementScore > 0);

      // Ordenar por engagement
      topics.sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore);

      return topics.slice(0, 10);
    } catch (error) {
      console.error('[YouTubeDiscovery] Error:', error);
      return [];
    }
  }

  private mapToTrendingTopic(snippet: any, stats: any): TrendingTopic {
    const viewCount = parseInt(stats?.viewCount || '0');
    const likeCount = parseInt(stats?.likeCount || '0');
    const commentCount = parseInt(stats?.commentCount || '0');

    const engagementScore = viewCount * 0.5 + likeCount * 2 + commentCount * 5;

    return {
      id: `yt-${snippet.id.videoId}`,
      title: snippet.snippet.title,
      theme: snippet.snippet.title,
      context: snippet.snippet.description?.substring(0, 500) || '',
      targetAudience: '',
      source: {
        type: 'youtube',
        url: `https://youtube.com/watch?v=${snippet.id.videoId}`,
        rawData: {
          videoId: snippet.id.videoId,
          viewCount,
          likeCount,
          commentCount,
          publishedAt: snippet.snippet.publishedAt,
        },
      },
      metrics: {
        engagementScore,
        recency: new Date(snippet.snippet.publishedAt),
      },
    };
  }

  private getDateOffset(range: 'day' | 'week' | 'month'): string {
    const now = new Date();
    const offsets = { day: 1, week: 7, month: 30 };
    now.setDate(now.getDate() - offsets[range]);
    return now.toISOString();
  }
}
```

---

## 3. Similarity Calculation (Voyage Embeddings)

```typescript
// src/lib/discovery-services/similarity.service.ts

import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import type { TrendingTopic } from './types';

export class SimilarityService {
  private embeddings: VoyageEmbeddings | null = null;

  constructor() {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (apiKey) {
      this.embeddings = new VoyageEmbeddings({
        apiKey,
        modelName: 'voyage-4-large', // Já usado no projeto
      });
    }
  }

  async filterBySimilarity(
    topics: TrendingTopic[],
    keyword: string,
    threshold: number = 0.3
  ): Promise<TrendingTopic[]> {
    if (!this.embeddings) {
      // Sem embeddings, retorna tudo com similarity 1
      return topics.map((t) => ({ ...t, similarity: 1 }));
    }

    // Embedding da keyword
    const keywordEmbedding = await this.embeddings.embedQuery(keyword);

    // Calcular similaridade para cada topic
    const results = await Promise.all(
      topics.map(async (topic) => {
        const textToEmbed = `${topic.title} ${topic.context}`.substring(0, 500);
        const topicEmbedding = await this.embeddings!.embedQuery(textToEmbed);

        const similarity = this.cosineSimilarity(keywordEmbedding, topicEmbedding);

        return {
          ...topic,
          similarity,
        };
      })
    );

    // Filtrar por threshold
    return results.filter((t) => (t.similarity ?? 0) >= threshold);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

---

## 4. AI Briefing Service

```typescript
// src/lib/discovery-services/briefing.service.ts

import { openrouter } from '@ai-sdk/openrouter';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { TrendingTopic } from './types';

const briefingSchema = z.object({
  briefing: z.string().describe('Resumo de 2-3 frases sobre o tema'),
  keyPoints: z.array(z.string()).min(3).max(5).describe('3-5 pontos-chave'),
  angles: z.array(z.string()).min(2).max(3).describe('2-3 ângulos criativos'),
  targetAudience: z.string().describe('Público-alvo sugerido'),
});

export type BriefingResult = z.infer<typeof briefingSchema>;

export class BriefingService {
  private model = openrouter('google/gemini-flash-1.5');

  async enrichBatch(topics: TrendingTopic[]): Promise<TrendingTopic[]> {
    // Processar em paralelo com rate limiting
    const batchSize = 5;
    const results: TrendingTopic[] = [];

    for (let i = 0; i < topics.length; i += batchSize) {
      const batch = topics.slice(i, i + batchSize);
      const enriched = await Promise.all(
        batch.map((topic) => this.enrichSingle(topic))
      );
      results.push(...enriched);

      // Rate limiting entre batches
      if (i + batchSize < topics.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  async enrichSingle(topic: TrendingTopic): Promise<TrendingTopic> {
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
      // Retornar sem briefing em caso de erro
      return topic;
    }
  }

  private buildPrompt(topic: TrendingTopic): string {
    return `Analise este tema de conteúdo para redes sociais e gere um briefing estruturado.

TEMA: ${topic.title}
DESCRIÇÃO ORIGINAL: ${topic.context}
FONTE: ${topic.source.type}
SCORE DE ENGAGEMENT: ${topic.metrics.engagementScore}

Gere um briefing completo que ajude um criador de conteúdo a desenvolver material sobre este tema.`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## 5. Tipos Compartilhados

```typescript
// src/lib/discovery-services/types.ts

export interface TrendingTopic {
  id: string;
  title: string;
  theme: string;
  context: string;
  targetAudience: string;
  source: {
    type: 'youtube' | 'instagram' | 'tiktok';
    url: string;
    rawData: any;
  };
  metrics: {
    engagementScore: number;
    recency: Date;
  };
  similarity?: number;
  // Populated after briefing
  briefing?: string;
  keyPoints?: string[];
  suggestedAngles?: string[];
}

export interface TrendingTopicWithBriefing extends TrendingTopic {
  briefing: string;
  keyPoints: string[];
  suggestedAngles: string[];
}

export interface DiscoveryOptions {
  keyword: string;
  platforms: ('youtube' | 'instagram')[];
  timeRange: 'day' | 'week' | 'month';
  maxResults?: number;
  minSimilarity?: number;
}

export interface DiscoveryResult {
  topics: TrendingTopicWithBriefing[];
  metadata: {
    totalFetched: number;
    afterFiltering: number;
    platformsSearched: string[];
    searchTime: number;
  };
}
```

---

## 6. Orquestrador Principal

```typescript
// src/lib/discovery-services/discovery.service.ts

import { YouTubeDiscoveryService } from './youtube/youtube-discovery.service';
import { InstagramDiscoveryService } from './instagram/instagram-discovery.service';
import { SimilarityService } from './similarity.service';
import { BriefingService } from './briefing.service';
import type { DiscoveryOptions, DiscoveryResult, TrendingTopic } from './types';

export class DiscoveryService {
  private youtube: YouTubeDiscoveryService;
  private instagram: InstagramDiscoveryService;
  private similarity: SimilarityService;
  private briefing: BriefingService;

  constructor() {
    this.youtube = new YouTubeDiscoveryService();
    this.instagram = new InstagramDiscoveryService();
    this.similarity = new SimilarityService();
    this.briefing = new BriefingService();
  }

  async discover(options: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();

    // STEP 1: Buscar em paralelo das plataformas selecionadas
    const platformResults = await Promise.allSettled([
      options.platforms.includes('youtube')
        ? this.youtube.discoverByKeyword(options.keyword)
        : Promise.resolve([]),
      options.platforms.includes('instagram')
        ? this.instagram.discoverByKeyword(options.keyword)
        : Promise.resolve([]),
    ]);

    // STEP 2: Agregar todos os resultados
    const allTopics: TrendingTopic[] = [];
    platformResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        allTopics.push(...result.value);
      }
    });

    // STEP 3: Calcular similaridade com keyword
    const topicsWithSimilarity = await this.similarity.filterBySimilarity(
      allTopics,
      options.keyword,
      options.minSimilarity ?? 0.3
    );

    // STEP 4: Ordenar por composto score
    const ranked = this.rankTopics(topicsWithSimilarity);

    // STEP 5: Limitar resultados
    const topTopics = ranked.slice(0, options.maxResults ?? 10);

    // STEP 6: Enrich com briefing IA
    const enriched = await this.briefing.enrichBatch(topTopics);

    return {
      topics: enriched as any,
      metadata: {
        totalFetched: allTopics.length,
        afterFiltering: topicsWithSimilarity.length,
        platformsSearched: options.platforms,
        searchTime: Date.now() - startTime,
      },
    };
  }

  private rankTopics(topics: TrendingTopic[]): TrendingTopic[] {
    return topics.sort((a, b) => {
      const scoreA =
        (a.metrics.engagementScore || 0) * 0.6 +
        (a.similarity || 0) * 100 * 0.4;
      const scoreB =
        (b.metrics.engagementScore || 0) * 0.6 +
        (b.similarity || 0) * 100 * 0.4;
      return scoreB - scoreA;
    });
  }
}
```

---

## 7. Database Schema (Neon + Drizzle)

```typescript
// src/db/schema.ts - Adicionar

import { pgTable, serial, text, integer, timestamp, json, enum as pgEnum, index } from 'drizzle-orm/pg-core';

export const sourceTypeEnum = pgEnum('source_type', ['manual', 'youtube', 'instagram', 'tiktok', 'aggregated']);
export const themeStatusEnum = pgEnum('theme_status', ['draft', 'active', 'archived']);

export const themes = pgTable('themes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Core fields (compatível com Wizard)
  title: text('title').notNull(),
  theme: text('theme').notNull(),
  context: text('context'),
  targetAudience: text('target_audience'),

  // AI-generated briefing
  briefing: text('briefing'),
  keyPoints: text('key_points').array(),
  angles: text('angles').array(),

  // Source metadata
  sourceType: sourceTypeEnum('source_type').notNull().default('manual'),
  sourceUrl: text('source_url'),
  sourceData: json('source_data'),

  // Trend metrics
  engagementScore: integer('engagement_score'),
  trendingAt: timestamp('trending_at'),

  // Organization
  category: text('category'),
  tags: text('tags').array(),
  status: themeStatusEnum('status').default('active'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),

  // Indexes
}, (table) => ({
  userIdx: index('themes_user_idx').on(table.userId, table.deletedAt),
  statusIdx: index('themes_status_idx').on(table.status, table.createdAt),
  trendingIdx: index('themes_trending_idx').on(table.trendingAt),
}));

// Tabela de relacionamento com tags (reutilizando tabela tags existente)
export const themeTags = pgTable('theme_tags', {
  id: serial('id').primaryKey(),
  themeId: integer('theme_id').notNull().references(() => themes.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  themeIdx: index('theme_tags_theme_idx').on(table.themeId),
  tagIdx: index('theme_tags_tag_idx').on(table.tagId),
}));
```

### Migration
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 8. API Routes

```
src/app/api/
├── discovery/
│   └── route.ts                    # POST /api/discovery
└── themes/
    ├── route.ts                    # GET/POST /api/themes
    └── [id]/
        ├── route.ts                # GET/PATCH/DELETE /api/themes/[id]
        └── wizard/
            └── route.ts            # POST /api/themes/[id]/wizard
```

### POST /api/discovery

```typescript
// src/app/api/discovery/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DiscoveryService } from '@/lib/discovery-services/discovery.service';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keyword, platforms, timeRange, maxResults, minSimilarity } = body;

  if (!keyword) {
    return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
  }

  const service = new DiscoveryService();
  const result = await service.discover({
    keyword,
    platforms: platforms ?? ['youtube', 'instagram'],
    timeRange: timeRange ?? 'week',
    maxResults: maxResults ?? 10,
    minSimilarity: minSimilarity ?? 0.3,
  });

  return NextResponse.json(result);
}
```

### Server Actions para Temas

```typescript
// src/actions/themes-actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { themes, themeTags } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function getThemesAction(filters?: {
  status?: string;
  category?: string;
  search?: string;
}) {
  const { userId } = await auth();

  let query = db
    .select()
    .from(themes)
    .where(and(eq(themes.userId, userId), isNull(themes.deletedAt)));

  if (filters?.status) {
    query = query.where(eq(themes.status, filters.status as any));
  }

  if (filters?.search) {
    // Implementar busca por título/tema
  }

  return await query.orderBy(desc(themes.createdAt));
}

export async function createThemeAction(data: {
  title: string;
  theme: string;
  context?: string;
  targetAudience?: string;
  briefing?: string;
  keyPoints?: string[];
  angles?: string[];
  sourceType?: string;
  sourceUrl?: string;
  sourceData?: any;
  engagementScore?: number;
}) {
  const { userId } = await auth();

  const [theme] = await db
    .insert(themes)
    .values({
      userId,
      title: data.title,
      theme: data.theme,
      context: data.context,
      targetAudience: data.targetAudience,
      briefing: data.briefing,
      keyPoints: data.keyPoints,
      angles: data.angles,
      sourceType: (data.sourceType as any) || 'manual',
      sourceUrl: data.sourceUrl,
      sourceData: data.sourceData,
      engagementScore: data.engagementScore,
      status: 'active',
    })
    .returning();

  return theme;
}

export async function deleteThemeAction(id: number) {
  const { userId } = await auth();

  await db
    .update(themes)
    .set({ deletedAt: new Date() })
    .where(and(eq(themes.id, id), eq(themes.userId, userId)));

  return { success: true };
}

export async function createWizardFromThemeAction(themeId: number) {
  const { userId } = await auth();

  const theme = await db.query.themes.findFirst({
    where: and(eq(themes.id, themeId), eq(themes.userId, userId)),
  });

  if (!theme) {
    throw new Error('Theme not found');
  }

  // Criar Wizard com dados do tema
  // Reutilizar lógica existente de criação de Wizard
  // ...

  return { wizardId: '...' };
}
```

---

## 9. Frontend Components

```
src/app/(app)/discover/
├── page.tsx                        # Página principal
└── components/
    ├── discovery-form.tsx          # Formulário de busca
    ├── discovery-results.tsx       # Lista de resultados
    ├── topic-card.tsx              # Card de tema
    └── briefing-display.tsx        # Display do briefing

src/app/(app)/themes/
├── page.tsx                        # Biblioteca de temas
└── components/
    ├── theme-list.tsx
    ├── theme-card.tsx
    └── theme-filters.tsx
```

---

## 10. Variáveis de Ambiente

```env
# Adicionar ao .env
YOUTUBE_DATA_API_KEY=AIza...  # Google Cloud Console
APIFY_API_TOKEN=apify_...     # Já existe no projeto
VOYAGE_API_KEY=voyage-...     # Já existe no projeto
```

---

## 11. Implementação por Fases

### Fase 1: Core Discovery (MVP)
- [x] Instagram Discovery Service (2 actors)
- [x] YouTube Discovery Service
- [x] Similarity Service (Voyage)
- [x] Briefing Service (Gemini Flash)
- [x] Discovery Orchestator
- [ ] Tabela `themes` no DB + migration
- [ ] API route `/api/discovery`
- [ ] Página `/discover`

### Fase 2: Biblioteca de Temas
- [ ] Server actions CRUD
- [ ] Página `/themes`
- [ ] Filtros e busca
- [ ] Soft delete implementado

### Fase 3: Integração Wizard
- [ ] Botão "Criar no Wizard"
- [ ] API route `/api/themes/[id]/wizard`
- [ ] Redirecionamento com pré-preenchimento

---

## 12. Custos Estimados

| Serviço | Custo Mensal |
|---------|--------------|
| YouTube Data API | Free (10k units/day) |
| Apify (Instagram) | ~$5-10 (free tier limitado) |
| Voyage Embeddings | ~$0.10/1M tokens (já usado) |
| Gemini Flash | ~$0.01/1M tokens (via OpenRouter) |

**Total estimado**: $5-15/mês (dependendo do uso de Apify)

---

## 13. Arquivos Críticos

### Novos Arquivos
```
src/lib/discovery-services/
  ├── types.ts
  ├── discovery.service.ts
  ├── similarity.service.ts
  ├── briefing.service.ts
  ├── youtube/
  │   └── youtube-discovery.service.ts
  └── instagram/
      ├── instagram-discovery.service.ts
      ├── search-scraper.service.ts
      └── stats-scraper.service.ts

src/app/api/discovery/route.ts
src/app/api/themes/route.ts
src/app/api/themes/[id]/route.ts
src/app/api/themes/[id]/wizard/route.ts

src/actions/themes-actions.ts

src/app/(app)/discover/page.tsx
src/app/(app)/themes/page.tsx
```

### Modificar
```
src/db/schema.ts                    # Adicionar tabela themes
drizzle/migrations/                 # Nova migration
```

---

## 14. Próximos Passos

1. **Revisão do plano** - Está tudo alinhado?
2. **Criar migration** - Gerar e executar drizzle migrate
3. **Implementar serviços** - Começar por Instagram (já documentado)
4. **Testar integração** - API endpoints funcionando
5. **Frontend** - Páginas /discover e /themes
