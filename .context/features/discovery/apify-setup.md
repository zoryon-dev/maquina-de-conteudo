# Configuração Apify para Instagram Discovery

Guia de configuração dos Actors da Apify para extração de dados do Instagram.

## Visão Geral

A feature Discovery utiliza dois Actors da Apify para Instagram:

1. **Instagram Hashtag Search Scraper** - Busca posts por hashtag
2. **Instagram Hashtag Stats Scraper** - Obtém estatísticas do hashtag

## Pré-requisitos

### 1. Criar Conta Apify

1. Acesse [apify.com](https://apify.com)
2. Crie uma conta gratuita
3. Vá em **Settings** → **APIs** → **Integrations**
4. Copie seu **API Key**

### 2. Configurar Variável de Ambiente

```env
# .env.local ou .env
APIFY_API_KEY=apify_XXXXXXXXXXXXXXXXXXXXX
```

## Actors Utilizados

### Actor 1: Instagram Hashtag Search Scraper

**ID:** `apify/instagram-hashtag-search-scraper`

**Função:** Busca posts recentes que contêm uma hashtag específica.

**Parâmetros utilizados:**
```typescript
{
  hashtags: [keyword],           // Hashtag para buscar (sem #)
  resultsLimit: maxResults,      // Número máximo de posts
  proxyUrl: undefined             // Proxy opcional
}
```

**Retorno:**
```typescript
{
  posts: [
    {
      id: string,
      url: string,
      caption: string,
      likesCount: number,
      commentsCount: number,
      timestamp: string,
      imageUrl: string,
      // ... outros campos
    }
  ]
}
```

**Código:** `src/lib/discovery-services/instagram/search-scraper.service.ts`

---

### Actor 2: Instagram Hashtag Stats Scraper

**ID:** `apify/instagram-hashtag-stats-scraper`

**Função:** Obtém estatísticas gerais de uma hashtag.

**Parâmetros utilizados:**
```typescript
{
  hashtags: [keyword],           // Hashtag (sem #)
  proxyUrl: undefined             // Proxy opcional
}
```

**Retorno:**
```typescript
{
  stats: [
    {
      hashtag: string,
      postsCount: number,
      avgLikes: number,
      avgComments: number,
      // ... outros campos
    }
  ]
}
```

**Código:** `src/lib/discovery-services/instagram/stats-scraper.service.ts`

---

## Integração no Código

### Serviço de Busca

Localização: `src/lib/discovery-services/instagram/search-scraper.service.ts`

```typescript
import { ApifyClient } from 'apify-client'

class SearchScraperService {
  private client: ApifyClient

  constructor() {
    const apiKey = process.env.APIFY_API_KEY
    if (!apiKey) {
      console.warn('[Instagram] APIFY_API_KEY não configurada')
    }
    this.client = new ApifyClient({ token: apiKey })
  }

  async search(
    hashtag: string,
    maxResults: number = 10
  ): Promise<ServiceResult<SearchScraperResult[]>> {
    if (!process.env.APIFY_API_KEY) {
      return { success: true, data: [] }
    }

    try {
      const run = await this.client.actor('apify/instagram-hashtag-search-scraper').call({
        hashtags: [hashtag],
        resultsLimit: maxResults,
      })

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
      return { success: true, data: items as unknown as SearchScraperResult[] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
```

---

## Facade Pattern

O `InstagramService` orquestra ambos os actors:

Localização: `src/lib/discovery-services/instagram/index.ts`

```typescript
class InstagramService {
  private searchScraper = new SearchScraperService()
  private statsScraper = new StatsScraperService()

  async searchByHashtag(
    hashtag: string,
    maxResults: number = 10
  ): Promise<ServiceResult<TrendingTopic[]>> {
    // 1. Busca posts
    const postsResult = await this.searchScraper.search(hashtag, maxResults)
    if (!postsResult.success) return postsResult

    // 2. Busca estatísticas
    const statsResult = await this.statsScraper.getStats(hashtag)
    if (!statsResult.success) return statsResult

    // 3. Combina e transforma
    const topics = this.combineResults(postsResult.data, statsResult.data)
    return { success: true, data: topics }
  }
}
```

---

## Custos e Limites

### Plano Gratuito (Apify)

- **$5** em créditos gratuitos/mês
- **Uso aproximado:** ~500-1000 posts por mês
- **Rate Limit:** Depende do plano

### Plano Paid

- **Start ($49/mês):** $25 em créditos
- **Preço por run:** ~$0.01-0.03 por 100 posts

### Economia

Para reduzir custos:
1. Limitar `maxResults` a 10-20
2. Implementar cache de resultados
3. Usar busca menos frequente

---

## Proxy (Opcional)

Para evitar bloqueios do Instagram, use proxies residenciais:

```typescript
const run = await this.client.actor('...').call({
  hashtags: [hashtag],
  resultsLimit: maxResults,
  proxyUrl: {
    // Apify Proxy ou proxy próprio
    url: 'http://proxy.apify.com:8000'
  }
})
```

**Nota:** Proxy aumenta o custo significativamente.

---

## Teste Manual

### Testar Actor Diretamente

1. Acesse [apify.com/store](https://apify.com/store)
2. Busque por "Instagram Hashtag Search"
3. Clique em "Try for free"
4. Insira a hashtag sem #
5. Execute e veja os resultados

### Teste via Código

```bash
# Com API key válida
curl -X POST https://api.apify.com/v2/actors/apify/instagram-hashtag-search-scraper/runs \
  -H "Authorization: Bearer APIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "hashtags": ["marketing"],
    "resultsLimit": 5
  }'
```

---

## Troubleshooting

### Erro: "API key not configured"

```
Solução: Adicionar APIFY_API_KEY ao .env.local
```

### Erro: "Actor run failed"

**Possíveis causas:**
1. Hashtag inválida (use sem #)
2. Instagram bloqueou o IP
3. Créditos insuficientes

### Resultados Vazios

**Possíveis causas:**
1. Hashtag não existe ou não tem posts públicos
2. Conta privada ou com restrições
3. Rate limit atingido

---

## Alternativas

Se Apify não for viável:

1. **Instagram Basic Display API** - Oficial, mas limitado
2. **Scrapers próprios** - Puppeteer/Playwright
3. **Provedores alternativos:**
   - RapidAPI
   - ScraperAPI
   - Bright Data

---

## Referências

- [Apify Instagram Hashtag Search](https://apify.com/apify/instagram-hashtag-search-scraper)
- [Apify Client JS](https://docs.apify.com/sdk/js)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram/)
