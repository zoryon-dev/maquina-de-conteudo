# Apify Instagram - Descoberta de Hashtags Trending

## Visão Geral

Sistema para descoberta automática de hashtags em alta no Instagram baseado em temas/termos de pesquisa. Utiliza dois Actors da Apify em sequência para maximizar a descoberta e análise de tendências.

## Arquitetura do Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT: Termo Base                        │
│                  (ex: "IA PARA NEGOCIO")                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 1: Instagram Search Scraper                 │
│                  apify/instagram-search-scraper             │
│                                                             │
│  • Descobre hashtags relacionadas ao termo                  │
│  • Retorna volume de uso e popularidade                     │
│  • Classifica por: average, frequent, rare                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Filter Top N  │
                  │  (ex: top 10)  │
                  └────────┬───────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│       STEP 2: Instagram Related Hashtag Stats Scraper       │
│         scraper-engine/instagram-related-hashtag-stats      │
│                                                             │
│  • Análise profunda de cada hashtag                         │
│  • Extrai hashtags relacionadas (semânticas + literais)     │
│  • Métricas de tendência e crescimento                      │
│  • Top posts e engagement stats                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT: Dataset Final                      │
│                                                             │
│  • Hashtags em alta relacionadas ao tema                    │
│  • Métricas de volume e tendência                           │
│  • Scoring de popularidade                                  │
│  • Recomendações rankeadas                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Actor 1: Instagram Search Scraper

### Identificação
- **Actor ID**: `apify/instagram-search-scraper`
- **Versão recomendada**: Latest
- **Custo**: $2.60 por 1,000 resultados (Free tier)

### Endpoint
```
POST https://api.apify.com/v2/acts/apify~instagram-search-scraper/runs
```

### Input Schema

```typescript
interface SearchScraperInput {
  search: string;              // Termo de busca (ex: "IA PARA NEGOCIO")
  searchType: 'hashtag';       // Tipo fixo para hashtags
  resultsLimit: number;        // Limite de resultados (recomendado: 50-100)
  addParentData?: boolean;     // Incluir dados do parent (default: false)
}
```

### Exemplo de Request

```json
{
  "search": "IA PARA NEGOCIO",
  "searchType": "hashtag",
  "resultsLimit": 50,
  "addParentData": false
}
```

### Output Schema

```typescript
interface SearchScraperResult {
  id: string;                           // ID único da hashtag
  name: string;                         // Nome da hashtag (sem #)
  url: string;                          // URL da hashtag no Instagram
  
  // Métricas principais
  searchResultsCount?: number;          // Total de posts com essa hashtag
  postsCount?: number;                  // Contagem de posts
  postsPerDay?: number;                 // Posts por dia (média)
  
  // Classificação de popularidade
  difficulty?: 'average' | 'frequent' | 'rare';
  
  // Hashtags relacionadas por categoria
  relatedAverageHashtags?: RelatedHashtag[];
  relatedFrequentHashtags?: RelatedHashtag[];
  relatedRareHashtags?: RelatedHashtag[];
  
  // Metadata
  inputUrl?: string;
  timestamp?: string;
}

interface RelatedHashtag {
  name: string;
  volume: number;                       // Volume de uso
}
```

### Exemplo de Output

```json
{
  "id": "17843826743",
  "name": "iaparanegocios",
  "url": "https://www.instagram.com/explore/tags/iaparanegocios/",
  "searchResultsCount": 15420,
  "postsCount": 15420,
  "postsPerDay": 42.5,
  "difficulty": "average",
  "relatedAverageHashtags": [
    {
      "name": "inteligenciaartificial",
      "volume": 125000
    },
    {
      "name": "automacaodenegocios",
      "volume": 89300
    }
  ],
  "relatedFrequentHashtags": [
    {
      "name": "marketingdigital",
      "volume": 2500000
    }
  ],
  "relatedRareHashtags": [
    {
      "name": "iaparaecommerce",
      "volume": 3200
    }
  ],
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

---

## Actor 2: Instagram Related Hashtag Stats Scraper

### Identificação
- **Actor ID**: `scraper-engine/instagram-related-hashtag-stats-scraper`
- **Versão recomendada**: Latest
- **Custo**: Baseado em resultados

### Endpoint
```
POST https://api.apify.com/v2/acts/scraper-engine~instagram-related-hashtag-stats-scraper/runs
```

### Input Schema

```typescript
interface HashtagStatsInput {
  hashtags: string[];          // Array de hashtags (com ou sem #)
  maxResults?: number;         // Máximo de hashtags relacionadas (default: 50)
  includeRelated?: boolean;    // Incluir hashtags relacionadas (default: true)
  includeSemantic?: boolean;   // Análise semântica (default: true)
  includeLiteral?: boolean;    // Análise literal (default: true)
}
```

### Exemplo de Request

```json
{
  "hashtags": [
    "iaparanegocios",
    "inteligenciaartificial",
    "automacaodenegocios"
  ],
  "maxResults": 100,
  "includeRelated": true,
  "includeSemantic": true,
  "includeLiteral": true
}
```

### Output Schema

```typescript
interface HashtagStatsResult {
  hashtag: string;                      // Hashtag original
  url: string;                          // URL no Instagram
  
  // Métricas principais
  totalPosts: number;                   // Total de posts
  postsPerDay: number;                  // Média de posts/dia
  postsPerWeek: number;                 // Média de posts/semana
  
  // Tendências
  growthRate?: number;                  // Taxa de crescimento (%)
  trendScore?: number;                  // Score de tendência (0-100)
  
  // Hashtags relacionadas
  relatedHashtags: {
    semantic: SemanticHashtag[];        // Relacionadas semanticamente
    literal: LiteralHashtag[];          // Relacionadas literalmente
  };
  
  // Top posts
  topPosts?: TopPost[];                 // Posts mais populares
  
  // Metadata
  scrapedAt: string;
  dataQuality: 'high' | 'medium' | 'low';
}

interface SemanticHashtag {
  name: string;
  usageCount: number;                   // Quantas vezes aparece
  relevanceScore: number;               // Score de relevância (0-1)
  postsCount: number;                   // Total de posts desta hashtag
}

interface LiteralHashtag {
  name: string;
  usageCount: number;
  similarity: number;                   // Similaridade textual (0-1)
  postsCount: number;
}

interface TopPost {
  id: string;
  url: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  engagement: number;                   // Taxa de engajamento
}
```

### Exemplo de Output

```json
{
  "hashtag": "iaparanegocios",
  "url": "https://www.instagram.com/explore/tags/iaparanegocios/",
  "totalPosts": 15420,
  "postsPerDay": 42.5,
  "postsPerWeek": 297.5,
  "growthRate": 15.3,
  "trendScore": 78,
  "relatedHashtags": {
    "semantic": [
      {
        "name": "chatgpt",
        "usageCount": 3421,
        "relevanceScore": 0.89,
        "postsCount": 892000
      },
      {
        "name": "automacao",
        "usageCount": 2876,
        "relevanceScore": 0.85,
        "postsCount": 234000
      },
      {
        "name": "produtividade",
        "usageCount": 2543,
        "relevanceScore": 0.82,
        "postsCount": 567000
      }
    ],
    "literal": [
      {
        "name": "iaparaempresas",
        "usageCount": 1234,
        "similarity": 0.91,
        "postsCount": 8900
      },
      {
        "name": "ianonegocios",
        "usageCount": 987,
        "similarity": 0.87,
        "postsCount": 5600
      }
    ]
  },
  "topPosts": [
    {
      "id": "CxYZ123",
      "url": "https://www.instagram.com/p/CxYZ123/",
      "caption": "Como usar IA para automatizar vendas...",
      "likes": 15420,
      "comments": 342,
      "timestamp": "2025-01-20T14:30:00Z",
      "engagement": 0.087
    }
  ],
  "scrapedAt": "2025-01-22T10:35:00.000Z",
  "dataQuality": "high"
}
```

---

## Implementação: Código de Exemplo

### Setup da Apify Client

```typescript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});
```

### Função Principal: Descobrir Hashtags Trending

```typescript
interface TrendingHashtagsInput {
  searchTerm: string;
  topN?: number;  // Quantas hashtags processar (default: 10)
}

interface TrendingHashtag {
  name: string;
  score: number;  // Score composto de trending
  metrics: {
    totalPosts: number;
    postsPerDay: number;
    growthRate: number;
    trendScore: number;
  };
  relatedTrending: string[];  // Top hashtags relacionadas
}

async function discoverTrendingHashtags(
  input: TrendingHashtagsInput
): Promise<TrendingHashtag[]> {
  const { searchTerm, topN = 10 } = input;

  // STEP 1: Descobrir hashtags relacionadas
  console.log(`[Step 1] Searching for hashtags related to: ${searchTerm}`);
  
  const searchRun = await client.actor('apify/instagram-search-scraper').call({
    search: searchTerm,
    searchType: 'hashtag',
    resultsLimit: 50,
  });

  const searchResults = await client
    .dataset(searchRun.defaultDatasetId)
    .listItems();

  // Filtrar e rankear
  const topHashtags = searchResults.items
    .filter(item => item.postsCount && item.postsCount > 100)
    .sort((a, b) => (b.postsPerDay || 0) - (a.postsPerDay || 0))
    .slice(0, topN)
    .map(item => item.name);

  console.log(`[Step 1] Found ${topHashtags.length} hashtags to analyze`);

  // STEP 2: Análise profunda de cada hashtag
  console.log(`[Step 2] Deep analysis of top ${topHashtags.length} hashtags`);
  
  const statsRun = await client
    .actor('scraper-engine/instagram-related-hashtag-stats-scraper')
    .call({
      hashtags: topHashtags,
      maxResults: 100,
      includeRelated: true,
      includeSemantic: true,
      includeLiteral: true,
    });

  const statsResults = await client
    .dataset(statsRun.defaultDatasetId)
    .listItems();

  // STEP 3: Processar e rankear resultados
  const trendingHashtags: TrendingHashtag[] = statsResults.items.map(item => {
    // Calcular score composto
    const score = calculateTrendingScore(item);
    
    // Extrair top related hashtags
    const relatedTrending = [
      ...item.relatedHashtags.semantic.slice(0, 5),
      ...item.relatedHashtags.literal.slice(0, 3),
    ]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
      .map(h => h.name);

    return {
      name: item.hashtag,
      score,
      metrics: {
        totalPosts: item.totalPosts,
        postsPerDay: item.postsPerDay,
        growthRate: item.growthRate || 0,
        trendScore: item.trendScore || 0,
      },
      relatedTrending,
    };
  });

  // Ordenar por score
  trendingHashtags.sort((a, b) => b.score - a.score);

  return trendingHashtags;
}

// Função auxiliar para calcular score
function calculateTrendingScore(item: HashtagStatsResult): number {
  const weights = {
    growthRate: 0.35,     // Crescimento é muito importante
    trendScore: 0.30,     // Score de tendência da Apify
    postsPerDay: 0.20,    // Volume diário
    engagement: 0.15,     // Engajamento dos top posts
  };

  // Normalizar métricas (0-100)
  const normalizedGrowth = Math.min(item.growthRate || 0, 100);
  const normalizedTrend = item.trendScore || 0;
  const normalizedPPD = Math.min((item.postsPerDay / 100) * 100, 100);
  
  // Calcular engagement médio dos top posts
  const avgEngagement = item.topPosts?.length
    ? item.topPosts.reduce((sum, p) => sum + p.engagement, 0) / item.topPosts.length
    : 0;
  const normalizedEngagement = avgEngagement * 100;

  // Score final
  return (
    normalizedGrowth * weights.growthRate +
    normalizedTrend * weights.trendScore +
    normalizedPPD * weights.postsPerDay +
    normalizedEngagement * weights.engagement
  );
}
```

### Exemplo de Uso

```typescript
// Descobrir hashtags trending sobre "IA para negócios"
const trending = await discoverTrendingHashtags({
  searchTerm: 'IA PARA NEGOCIO',
  topN: 10,
});

console.log('Top Trending Hashtags:', trending);

// Output exemplo:
// [
//   {
//     name: 'chatgpt',
//     score: 87.3,
//     metrics: {
//       totalPosts: 892000,
//       postsPerDay: 1240,
//       growthRate: 23.5,
//       trendScore: 91
//     },
//     relatedTrending: [
//       'openai',
//       'inteligenciaartificial',
//       'automacao',
//       'produtividade',
//       'iaparanegocios'
//     ]
//   },
//   // ...
// ]
```

---

## Rate Limits & Custos

### Apify API
- **Rate limit**: 200 requests/minuto (Free tier)
- **Concurrency**: 10 runs simultâneos (Free tier)

### Custos estimados (Free tier - $5/mês)

| Operação | Volume | Custo |
|----------|--------|-------|
| Search (Step 1) | 50 resultados | ~$0.13 |
| Stats (Step 2) | 10 hashtags x 100 related | ~$2.60 |
| **Total por execução** | - | **~$2.73** |

**Execuções possíveis com $5**: ~1-2 por mês no free tier

### Otimizações de custo

1. **Cache de resultados**: Armazenar resultados por 24-48h
2. **Batch processing**: Processar múltiplos termos em uma execução
3. **Filtro inteligente**: Reduzir topN baseado em confiança do Step 1

---

## Autenticação

### Apify API Token

```bash
# .env
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Como obter**:
1. Acessar https://console.apify.com/
2. Account Settings → Integrations → API tokens
3. Create new token

---

## Error Handling

```typescript
interface ScraperError {
  code: string;
  message: string;
  retry: boolean;
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Verificar se é erro recuperável
      if (error.message.includes('rate limit')) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Erro não recuperável
      throw error;
    }
  }
  
  throw lastError!;
}
```

---

## Webhook Integration (Opcional)

Para execuções assíncronas com callback:

```typescript
const run = await client.actor('apify/instagram-search-scraper').call(
  {
    search: 'IA PARA NEGOCIO',
    searchType: 'hashtag',
    resultsLimit: 50,
  },
  {
    webhooks: [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED'],
        requestUrl: 'https://sua-api.com/webhook/apify-complete',
      },
    ],
  }
);
```

---

## Storage Schema (Recomendado)

### Tabela: `trending_hashtags_searches`

```sql
CREATE TABLE trending_hashtags_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Step 1 metadata
  step1_run_id TEXT,
  step1_hashtags_found INTEGER,
  
  -- Step 2 metadata
  step2_run_id TEXT,
  step2_hashtags_analyzed INTEGER,
  
  -- Results
  trending_hashtags JSONB NOT NULL,  -- Array de TrendingHashtag
  
  -- Cache control
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_term ON trending_hashtags_searches(search_term);
CREATE INDEX idx_expires_at ON trending_hashtags_searches(expires_at);
```

---

## Monitoramento

### Métricas importantes

```typescript
interface ExecutionMetrics {
  searchTerm: string;
  duration: number;           // ms
  step1Duration: number;
  step2Duration: number;
  totalHashtagsFound: number;
  totalHashtagsAnalyzed: number;
  costEstimate: number;       // USD
  cacheHit: boolean;
}
```

### Logging

```typescript
import Sentry from '@sentry/node';

// Log de execução
console.log({
  event: 'trending_hashtags_search',
  searchTerm: input.searchTerm,
  step: 'step1_complete',
  hashtagsFound: searchResults.items.length,
  duration: Date.now() - startTime,
});

// Error tracking
Sentry.captureException(error, {
  tags: {
    service: 'apify-instagram',
    actor: 'instagram-search-scraper',
  },
  extra: {
    searchTerm: input.searchTerm,
  },
});
```

---

## Próximos Passos

1. **Implementar cache layer** (Redis/Supabase)
2. **Adicionar rate limiting local** para evitar custos
3. **Criar API endpoint** para consumo do sistema
4. **Dashboard de trending hashtags** atualizado periodicamente
5. **Alertas de novas tendências** via webhook

---

## Referências

- [Apify API Docs](https://docs.apify.com/api/v2)
- [Instagram Search Scraper](https://apify.com/apify/instagram-search-scraper)
- [Instagram Related Hashtag Stats](https://apify.com/scraper-engine/instagram-related-hashtag-stats-scraper)
- [Apify Client SDK](https://docs.apify.com/api/client/js/)