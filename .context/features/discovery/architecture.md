# Discovery Service Architecture

Arquitetura detalhada do serviço de descoberta de temas trending.

## Diagrama de Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  /discover   │    │   /themes    │    │   Navigation  │     │
│  │    (page)    │    │    (page)    │    │   (dropdown)  │     │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘     │
│         │                   │                                   │
└─────────┼───────────────────┼───────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  POST /discovery │    │  CRUD /themes    │                  │
│  │                  │    │  GET /themes     │                  │
│  │  - keyword       │    │  POST /themes    │                  │
│  │  - platforms     │    │  PATCH /:id     │                  │
│  │  - maxResults    │    │  DELETE /:id     │                  │
│  └────────┬─────────┘    │  POST /:id/wizard│                  │
│           │              └────────┬─────────┘                  │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              DISCOVERY SERVICE                          │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ discoverTrending(keyword, platforms, max)       │   │   │
│  │  │  → Parallel fetch from YouTube/Instagram       │   │   │
│  │  │  → Enrich with AI briefings                    │   │   │
│  │  │  → Rank by similarity                         │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └───────┬─────────────────┬───────────────┬───────────────┤   │
│          │                 │               │               │   │
│          ▼                 ▼               ▼               │   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │   YouTube    │  │  Instagram   │  │   Briefing   │      │   │
│  │   Service    │  │   Service    │  │   Service    │      │   │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │   │
│                                              │               │   │
│  ┌──────────────┐                    ┌──────▼───────┐      │   │
│  │  Similarity  │                    │  Vercel AI   │      │   │
│  │   Service    │                    │     SDK      │      │   │
│  └──────────────┘                    └──────────────┘      │   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL API LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  YouTube     │  │    Apify     │  │  OpenRouter  │        │
│  │  Data API v3 │  │   Actors     │  │  + Gemini    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│  ┌──────────────┐                                              │
│  │  Voyage AI   │                                              │
│  │  Embeddings  │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      themes                              │   │
│  │  - id, user_id, title, theme, context, target_audience │   │
│  │  - briefing, key_points, angles, source_type            │   │
│  │  - source_url, source_data, engagement_score            │   │
│  │  - trending_at, status, deleted_at                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    theme_tags                            │   │
│  │  - theme_id, tag_id (composite PK)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Tipos Principais

### TrendingTopic

Resultado bruto de uma fonte (YouTube/Instagram).

```typescript
interface TrendingTopic {
  id: string                    // ID único gerado
  title: string                 // Título do conteúdo
  theme: string                 // Tema principal
  context: string               // Contexto adicional
  targetAudience: string        // Público alvo
  source: {
    type: 'youtube' | 'instagram'
    url: string
    rawData: Record<string, unknown>
  }
  metrics: {
    engagementScore: number     // Pontuação de engajamento
    views?: number              // Visualizações (YouTube)
    likes?: number              // Likes (Instagram)
    comments?: number           // Comentários
  }
  hashtags?: string[]           // Hashtags extraídos
  publishedAt?: string          // Data de publicação
}
```

### TrendingTopicWithBriefing

Tópico enriquecido com briefing gerado por IA.

```typescript
interface TrendingTopicWithBriefing extends TrendingTopic {
  briefing: string              // Briefing completo
  keyPoints: string[]           // Pontos-chave (3-5)
  suggestedAngles: string[]     // Ângulos sugeridos (3-5)
  similarityScore?: number      // Score de similaridade semântica
}
```

## Services Detalhados

### YouTubeService

Integração com YouTube Data API v3.

```typescript
class YouTubeService {
  private apiKey: string | undefined

  async searchByKeyword(
    keyword: string,
    maxResults: number = 10
  ): Promise<ServiceResult<TrendingTopic[]>>

  private calculateEngagement(video: YouTubeVideo): number
  private extractTheme(title: string, description?: string): string
}
```

**Endpoint:** `youtube.search.list`

### InstagramService (Facade)

Orquestra dois scrapers do Apify.

```typescript
class InstagramService {
  async searchByHashtag(
    hashtag: string,
    maxResults: number = 10
  ): Promise<ServiceResult<TrendingTopic[]>>

  // Internamente:
  // 1. searchScraper.search() - busca posts
  // 2. statsScraper.getStats() -获取 estatísticas do hashtag
}
```

**Apify Actors:**
- `apify/instagram-hashtag-search-scraper`
- `apify/instagram-hashtag-stats-scraper`

### BriefingService

Gera briefings usando Vercel AI SDK + Gemini Flash.

```typescript
class BriefingService {
  private model = openrouter('google/gemini-flash-1.5')

  async enrichBatch(
    topics: TrendingTopic[]
  ): Promise<TrendingTopicWithBriefing[]>

  private generateBriefingPrompt(topic: TrendingTopic): string
}
```

**Prompt Structure:**
- Contexto do tema
- Instruções para briefing
- Pontos-chave (3-5)
- Ângulos sugeridos (3-5)

### SimilarityService

Ranking semântico com Voyage AI embeddings.

```typescript
class SimilarityService {
  private embedder = voyage({ embeddingModel: 'voyage-4-large' })

  async rankByRelevance(
    topics: TrendingTopicWithBriefing[],
    keyword: string
  ): Promise<TrendingTopicWithBriefing[]>

  private async embed(text: string): Promise<number[]>
  private cosineSimilarity(a: number[], b: number[]): number
}
```

**Threshold:** 0.5 para relevância

### DiscoveryService

Orquestrador principal.

```typescript
class DiscoveryService {
  async discoverTrending(
    keyword: string,
    platforms: Platform[],
    maxResults: number = 10
  ): Promise<ServiceResult<TrendingTopicWithBriefing[]>>
}
```

**Flow:**
1. Parallel fetch de plataformas selecionadas
2. Deduplicação por ID
3. Enrichment com briefings (batch)
4. Ranking por relevância semântica
5. Ordenação por engagementScore

## Error Handling

### ServiceResult Pattern

```typescript
// Sucesso
return { success: true, data: topics }

// Erro
return {
  success: false,
  error: 'YouTube API key não configurada'
}
```

### Graceful Degradation

```typescript
// Se API não configurada, retorna vazio (não erro)
if (!this.apiKey) {
  console.warn('[Service] API key não configurada')
  return { success: true, data: [] }
}
```

## Performance

### Parallel Fetch

```typescript
const results = await Promise.allSettled([
  this.youtube.searchByKeyword(keyword, maxResults),
  this.instagram.searchByHashtag(keyword, maxResults),
])
```

### Batch Briefing

```typescript
// Processa múltiplos tópicos em uma única chamada
const enriched = await this.briefingService.enrichBatch(allTopics)
```

### Semantic Caching

Embeddings podem ser cacheadas por palavra-chave (não implementado ainda).

## Segurança

### Rate Limiting

- YouTube: 100 units/day (quota padrão)
- Apify: Controlado por plano
- OpenRouter: Controlado por créditos

### API Keys

Validação antes de cada requisição:

```typescript
if (!process.env.YOUTUBE_API_KEY) {
  return { success: true, data: [] } // Graceful degradation
}
```

## Extensibilidade

### Adicionar Nova Plataforma

1. Criar service em `src/lib/discovery-services/`
2. Implementar interface `searchByKeyword()`
3. Adicionar ao `DiscoveryService`
4. Atualizar tipo `Platform`

```typescript
// Exemplo: TikTok
class TikTokService {
  async searchByKeyword(
    keyword: string,
    maxResults: number
  ): Promise<ServiceResult<TrendingTopic[]>> {
    // Implementação
  }
}
```
