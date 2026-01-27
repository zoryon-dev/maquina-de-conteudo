# Discovery Patterns

Padrões de implementação da feature Trending Discovery para o Máquina de Conteúdo.

> **Última atualização**: Janeiro 2026 - Integração Perplexity + AI Theme Processing
> **Plataformas ativas**: YouTube, Instagram, Perplexity

## Visão Geral

O serviço de descoberta de temas trending permite encontrar conteúdo em alta em múltiplas plataformas (YouTube, Instagram, Perplexity), exibir resultados em tabs separadas, e processar temas com IA antes de criar um Wizard.

## Localização dos Arquivos

```
src/
├── lib/discovery-services/          # Core services
│   ├── types.ts                     # Tipos centrais (Platform: youtube|instagram|perplexity)
│   ├── discovery.service.ts         # Orquestrador principal
│   ├── youtube/                     # YouTube Data API
│   │   ├── youtube-discovery.service.ts
│   │   └── index.ts
│   ├── instagram/                   # Instagram via Apify
│   │   ├── search-scraper.service.ts
│   │   ├── stats-scraper.service.ts
│   │   └── index.ts                 # Facade
│   ├── perplexity/                  # Perplexity AI Search
│   │   ├── perplexity-discovery.service.ts  # API client
│   │   ├── theme-processor.service.ts       # AI processing
│   │   └── index.ts
│   ├── social/                      # Social AI processing
│   │   └── social-theme-processor.service.ts
│   ├── briefing.service.ts          # AI briefings
│   └── similarity.service.ts        # Embeddings semânticas
│
├── app/(app)/                       # Frontend
│   ├── discover/                    # Página de descoberta
│   │   ├── page.tsx
│   │   └── components/discover-page.tsx  # Tabs UI
│   └── themes/                      # Biblioteca de temas
│       ├── page.tsx
│       └── components/themes-page.tsx
│
├── app/api/                         # API Routes
│   ├── discovery/route.ts           # POST /api/discovery
│   └── themes/
│       ├── route.ts                 # GET/POST /api/themes
│       ├── [id]/route.ts            # GET/PATCH/DELETE
│       └── [id]/wizard/route.ts     # POST /api/themes/:id/wizard (AI processing)
│
├── actions/
│   └── themes-actions.ts            # Server actions CRUD
│
└── db/schema.ts                     # themes, theme_tags tables
```

## Padrão ServiceResult

Discriminated union para type-safe error handling:

```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Uso
const result = await service.search()
if (result.success) {
  const data = result.data  // Type guard funciona
} else {
  console.error(result.error)
}
```

**Benefício:** Não precisa de try/catch em cada chamada. O type system garante que você trate ambos os casos.

## Graceful Degradation

Serviços retornam arrays vazios quando APIs não configuradas:

```typescript
class YouTubeService {
  private apiKey = process.env.YOUTUBE_API_KEY

  async search(): Promise<ServiceResult<TrendingTopic[]>> {
    if (!this.apiKey) {
      console.warn('[YouTube] API key não configurada')
      return { success: true, data: [] }  // Não erro!
    }
    // ... implementação
  }
}
```

**Benefício:** Aplicação funciona parcialmente mesmo sem todas as APIs configuradas.

## Facade Pattern para Services

Instagram usa facade para orquestrar múltiplos scrapers:

```typescript
// src/lib/discovery-services/instagram/index.ts
class InstagramService {
  private searchScraper = new SearchScraperService()
  private statsScraper = new StatsScraperService()

  async searchByHashtag(hashtag: string) {
    // 1. Busca posts
    const posts = await this.searchScraper.search(hashtag)
    if (!posts.success) return posts

    // 2. Busca estatísticas
    const stats = await this.statsScraper.getStats(hashtag)

    // 3. Combina dados
    return this.combineResults(posts.data, stats.data)
  }
}
```

## Orquestração Paralela

Discovery service busca múltiplas plataformas em paralelo:

```typescript
async discoverTrending(keyword: string, platforms: Platform[]) {
  // Fetch paralelo
  const results = await Promise.allSettled([
    platforms.includes('youtube')
      ? this.youtube.search(keyword)
      : null,
    platforms.includes('instagram')
      ? this.instagram.search(keyword)
      : null,
  ])

  // Combina resultados
  return this.mergeResults(results)
}
```

## Server Actions com Drizzle

CRUD de temas usa server actions com type safety:

```typescript
// src/actions/themes-actions.ts
export async function getThemesAction(filters?: ThemeFilters) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const conditions = [isNull(themes.deletedAt)]

  if (filters?.status) {
    conditions.push(eq(themes.status, filters.status))
  }

  if (filters?.search) {
    conditions.push(ilike(themes.title, `%${filters.search}%`))
  }

  return await db
    .select()
    .from(themes)
    .where(and(...conditions))
    .orderBy(desc(themes.createdAt))
}
```

## Soft Delete Pattern

Tabela `themes` usa `deletedAt` ao invés de DELETE físico:

```typescript
export async function deleteThemeAction(id: number) {
  await db
    .update(themes)
    .set({ deletedAt: new Date() })
    .where(eq(themes.id, id))
}
```

**Query padrão:** Sempre incluir `isNull(themes.deletedAt)` nas condições.

## Many-to-Many com Chave Composta

`theme_tags` usa chave primária composta:

```typescript
export const themeTags = pgTable("theme_tags",
  {
    themeId: integer("theme_id").notNull().references(() => themes.id),
    tagId: integer("tag_id").notNull().references(() => tags.id),
  },
  (table) => [
    primaryKey({ columns: [table.themeId, table.tagId] }),
  ]
)
```

**Benefício:** Garante unicidade natural (não precisa de coluna `id` extra).

## Client Component Patterns

### Estado de Carregamento

```typescript
const [isSearching, setIsSearching] = useState(false)
const [results, setResults] = useState<TrendingTopicWithBriefing[]>([])

const handleSearch = async () => {
  setIsSearching(true)
  try {
    const response = await fetch('/api/discovery', { /* ... */ })
    const data = await response.json()
    setResults(data.topics)
  } finally {
    setIsSearching(false)
  }
}
```

### Filtros Reativos

```typescript
const [filters, setFilters] = useState<FilterOptions>({})

useEffect(() => {
  fetchThemes()
}, [filters.status, filters.search])
```

**Cuidado:** Use `useCallback` ou mova função para fora do componente para evitar loops infinitos.

## Menu com Dropdowns

NavBar suporta estrutura hierárquica:

```typescript
const navItems = [
  {
    name: "Descoberta",
    url: "/discover",
    icon: TrendingUp,
    children: [
      { name: "Discovery", url: "/discover", icon: Search },
      { name: "Temas", url: "/themes", icon: Lightbulb },
    ],
  },
]
```

**Active State:** Detecta automaticamente quando filho está ativo.

## Integração com AI SDK

BriefingService usa Vercel AI SDK com structured output:

```typescript
import { openrouter } from '@ai-sdk/openrouter'
import { generateObject } from 'ai'

const result = await generateObject({
  model: openrouter('google/gemini-flash-1.5'),
  prompt: this.generateBriefingPrompt(topic),
  schema: z.object({
    briefing: z.string(),
    keyPoints: z.array(z.string()).min(3).max(5),
    suggestedAngles: z.array(z.string()).min(3).max(5),
  }),
})
```

## Integração com Voyage AI

SimilarityService usa embeddings para ranking semântico:

```typescript
import { voyage } from '@ai-sdk/voyage'

const embedder = voyage({ embeddingModel: 'voyage-4-large' })

const { embedding } = await embedder.doEmbed({
  values: [text],
})

const similarity = cosineSimilarity(queryEmbedding, docEmbedding)
```

## Variáveis de Ambiente

```env
# YouTube Data API v3
YOUTUBE_API_KEY=AIzaSy...

# Apify (Instagram scraping)
APIFY_API_KEY=apify_...

# OpenRouter (para Gemini Flash)
OPENROUTER_API_KEY=sk-or-...

# Voyage AI (embeddings semânticas)
VOYAGE_API_KEY=voyage-...
```

## Cards UI Patterns

### TopicCard (Discovery)

```tsx
<Card className="hover:border-primary/50">
  <div className="p-5">
    {/* Header com rank, título, plataforma */}
    {/* Badge de engagement */}
    {/* Briefing em box destacado */}
    {/* KeyPoints como lista */}
    {/* SuggestedAngles como tags */}
    {/* Actions: Salvar, Criar Wizard */}
  </div>
</Card>
```

### ThemeCard (Biblioteca)

```tsx
<Card className="hover:border-primary/50">
  <div className="p-4">
    {/* Header com ícone plataforma, badge status */}
    {/* Título e theme */}
    {/* Briefing (line-clamp-2) */}
    {/* KeyPoints (primeiros 2) */}
    {/* Footer com engagement, data */}
    {/* Menu: Criar Wizard, Excluir */}
  </div>
</Card>
```

## Padrões de Cores

- **Draft:** `bg-yellow-500/20 text-yellow-500`
- **Active:** `bg-green-500/20 text-green-500`
- **Archived:** `bg-white/10 text-white/50`

## Toast Notifications

Use `sonner` para feedback:

```typescript
import { toast } from "sonner"

// Sucesso
toast.success("Tema salvo na biblioteca!")

// Erro
toast.error("Erro ao salvar tema")

// Info
toast.info(`Encontrados ${count} temas!`)
```

## Fluxo: Discovery → Wizard

1. Usuário busca temas em `/discover`
2. Filtra por tab (YouTube, Perplexity, Instagram)
3. Clica "Wizard" em um resultado
4. Sistema salva tema (`POST /api/themes`)
5. Sistema processa tema com IA (`POST /api/themes/:id/wizard`)
6. Redireciona para `/wizard?wizardId=WIZARD_ID`

## Integração Perplexity AI

### Overview

Perplexity substituiu Google SERP como fonte de busca. Usa o modelo "sonar" para web search com citações.

### PerplexityDiscoveryService

**Localização**: `src/lib/discovery-services/perplexity/perplexity-discovery.service.ts`

```typescript
export class PerplexityDiscoveryService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  async discoverByKeyword(keyword: string): Promise<TrendingTopic[]> {
    if (!this.apiKey) {
      console.warn('[Perplexity] API key não configurada');
      return [];
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `Search for the latest trending topics, news, and discussions about: "${keyword}". Focus on recent developments, viral content, and current discussions.`
        }],
      }),
    });

    const data: PerplexityResponse = await response.json();
    return this.mapSearchResultsToTopics(data, keyword);
  }
}
```

### Formato da Resposta Perplexity

```typescript
interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;  // AI-generated summary
    };
  }>;
  citations: string[];  // Reference URLs
}
```

### Mapeamento para TrendingTopic

O service cria dois tipos de tópicos:

1. **Resumo IA**: Primeiro tópico com o summary completo da Perplexity
2. **Resultados individuais**: Cada citation vira um tópico separado

```typescript
private mapSearchResultsToTopics(data: PerplexityResponse, keyword: string): TrendingTopic[] {
  const topics: TrendingTopic[] = [];
  const aiSummary = data.choices?.[0]?.message?.content || '';
  const citations = data.citations || [];

  // 1. Tópico com resumo IA
  if (aiSummary && aiSummary.length > 100) {
    topics.push({
      id: `perp-summary-${Date.now()}`,
      title: `Resumo IA: ${keyword}`,
      theme: keyword,
      context: aiSummary.substring(0, 1000),
      source: {
        type: 'perplexity',
        url: citations[0] || 'https://www.perplexity.ai',
        rawData: {
          summary: aiSummary.substring(0, 500),
          allCitations: citations,
        },
      },
      metrics: { engagementScore: 100 },
    });
  }

  // 2. Tópicos individuais das citações
  citations.forEach((url, index) => {
    topics.push({
      id: `perp-citation-${Date.now()}-${index}`,
      title: this.extractTitleFromUrl(url),
      theme: keyword,
      source: { type: 'perplexity', url },
      metrics: { engagementScore: 50 - index * 5 },
    });
  });

  return topics;
}
```

### Variáveis de Ambiente

```env
# Perplexity AI (obrigatório para funcionalidade)
PERPLEXITY_API_KEY=your-perplexity-api-key
```

## Tabs UI Pattern

### Estrutura de Tabs

**Localização**: `src/app/(app)/discover/components/discover-page.tsx`

```typescript
const [activeTab, setActiveTab] = useState<string>("all")

// Tabs disponíveis
const tabs = [
  { value: "all", label: "Todos", count: totalResults },
  { value: "youtube", label: "YouTube", count: youtubeResults.length, icon: Youtube },
  { value: "perplexity", label: "Perplexity", count: perplexityResults.length, icon: Brain },
  { value: "instagram", label: "Instagram", count: instagramResults.length, icon: Instagram },
]
```

### Cores por Plataforma

```tsx
// YouTube - Vermelho
<Youtube className="text-red-500" />

// Perplexity - Roxo
<Brain className="text-purple-500" />

// Instagram - Gradiente Rosa
<Instagram className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" />
```

### PlatformResults Component

```tsx
function PlatformResults({ results, platform, onSave }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((topic, index) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          rank={index + 1}
          platform={platform}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
```

## AI Theme Processing

### Overview

Ao clicar em "Wizard", o tema é processado por IA para melhorar o conteúdo antes de criar o Wizard.

### Processamento por Plataforma

| Plataforma | Service | Modelo | Output |
|------------|---------|--------|--------|
| **Perplexity** | `ThemeProcessorService` | gemini-2.0-flash-exp | theme, context, objective, referenceUrl |
| **Instagram** | `SocialThemeProcessorService` | gemini-2.0-flash-exp | theme, context, objective, suggestedContentType |
| **YouTube** | `SocialThemeProcessorService` | gemini-2.0-flash-exp | theme, context, objective, suggestedContentType |

### ThemeProcessorService (Perplexity)

**Localização**: `src/lib/discovery-services/perplexity/theme-processor.service.ts`

```typescript
export class ThemeProcessorService {
  private model = 'google/gemini-2.0-flash-exp:free';

  async processPerplexityTheme(themeData: PerplexityThemeData): Promise<ProcessedThemeResult> {
    const contentToProcess = themeData.sourceData?.summary || themeData.context || '';
    const citations = (themeData.sourceData?.allCitations || []) as string[];
    const referenceUrl = this.getBestReferenceUrl(citations, themeData.sourceUrl);

    const result = await this.processWithAI(contentToProcess, themeData.theme);
    return { ...result, referenceUrl };
  }

  private getBestReferenceUrl(citations: string[], sourceUrl?: string): string {
    return citations.length > 0 ? citations[0] : (sourceUrl || '');
  }
}
```

### SocialThemeProcessorService (Instagram/YouTube)

**Localização**: `src/lib/discovery-services/social/social-theme-processor.service.ts`

```typescript
export class SocialThemeProcessorService {
  private model = 'google/gemini-2.0-flash-exp:free';

  async processSocialTheme(
    themeData: SocialThemeData,
    platform: 'instagram' | 'youtube'
  ): Promise<ProcessedSocialThemeResult> {
    const contentToProcess = themeData.briefing || themeData.context || '';
    const result = await this.processWithAI(contentToProcess, themeData.theme, platform);
    return {
      ...result,
      suggestedContentType: platform === 'youtube' ? 'video' : 'image',
    };
  }
}
```

### Integração API Route

**Localização**: `src/app/api/themes/[id]/wizard/route.ts`

```typescript
export async function POST(req: NextRequest, context: RouteContext) {
  const theme = await fetchTheme(id);

  // Process based on source type
  if (theme.sourceType === 'perplexity') {
    const processor = new ThemeProcessorService();
    const processed = await processor.processPerplexityTheme({
      title: theme.title,
      theme: theme.theme || theme.title,
      context: theme.context,
      briefing: theme.briefing,
      sourceUrl: theme.sourceUrl,
      sourceData: theme.sourceData,
    });
    wizardTheme = processed.theme;
    wizardContext = processed.context;
    referenceUrl = processed.referenceUrl;
  } else if (theme.sourceType === 'instagram') {
    const processed = await processInstagramTheme({...});
    wizardTheme = processed.theme;
    suggestedContentType = processed.suggestedContentType;
  }

  // Create wizard with processed data
  const [wizard] = await db.insert(contentWizards).values({
    contentType: suggestedContentType,
    theme: wizardTheme,
    context: wizardContext,
    referenceUrl: referenceUrl,
    objective: wizardObjective,
  }).returning();
}
```

## Erros Conhecidos e Soluções

### Erro 1: Enum "perplexity" não existe

**Sintoma**: `Failed to save theme` ao clicar em Wizard de resultado Perplexity.

**Causa**: O enum PostgreSQL `theme_source_type` não continha "perplexity".

**Solução**:
1. Atualizar schema: `themeSourceTypeEnum = ["manual", "youtube", "instagram", "perplexity", "aggregated"]`
2. Executar SQL: `ALTER TYPE "theme_source_type" ADD VALUE 'perplexity';`

### Erro 2: URL parameter incorreto

**Sintoma**: "Redirecionou, porém veio sem nada preenchido."

**Causa**: Usava `?edit=` mas o wizard esperava `?wizardId=`.

**Solução**: Alterar em `discover-page.tsx`:
```typescript
// Antes
window.location.href = `/wizard?edit=${wizardData.wizardId}`

// Depois
window.location.href = `/wizard?wizardId=${wizardData.wizardId}`
```

## Variáveis de Ambiente (Todas)

```env
# YouTube Data API v3
YOUTUBE_API_KEY=AIzaSy...

# Apify (Instagram scraping)
APIFY_API_KEY=apify_...

# Perplexity AI (web search com citações)
PERPLEXITY_API_KEY=your-perplexity-api-key

# OpenRouter (para processamento de temas)
OPENROUTER_API_KEY=sk-or-...

# Voyage AI (embeddings semânticas)
VOYAGE_API_KEY=voyage-...
```

## Migration Pattern

Quando adicionar tabelas com relacionamentos:

1. Crie tabelas pais primeiro (se não existirem)
2. Crie tabelas filhas com FKs
3. Para junction tables many-to-many, use PK composta
4. Adicione indexes para colunas frequentemente filtradas

```bash
npx drizzle-kit generate --dialect postgresql \
  --schema=./src/db/schema.ts --out=./drizzle

npx drizzle-kit push --config=drizzle.config.ts
```

## Debug Tips

### Verificar API Key

```typescript
console.log('[Service] API key presente:', !!this.apiKey)
```

### Verificar Response

```typescript
const response = await fetch(url)
console.log('[Debug] Status:', response.status)
console.log('[Debug] Body:', await response.text())
```

### Verificar Retorno da IA

```typescript
console.log('[Briefing] Gerado para:', topic.title)
console.log('[Briefing] KeyPoints:', result.keyPoints.length)
```

## Referências

- [Feature README](../../.context/features/discovery/README.md)
- [Architecture](../../.context/features/discovery/architecture.md)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Apify Instagram](https://apify.com/store)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Voyage AI](https://docs.voyageai.com/)
