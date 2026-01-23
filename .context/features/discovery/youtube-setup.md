# Configuração YouTube Data API v3

Guia de configuração da API do YouTube para descoberta de temas trending.

## Visão Geral

A feature Discovery utiliza a **YouTube Data API v3** para buscar vídeos trending baseados em palavras-chave.

## Pré-requisitos

### 1. Criar Projeto Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione existente
3. Anote o **Project ID**

### 2. Habilitar YouTube Data API v3

1. No console Google, vá em **APIs & Services** → **Library**
2. Busque por "YouTube Data API v3"
3. Clique em **Enable**

### 3. Criar Credenciais (API Key)

1. Vá em **APIs & Services** → **Credentials**
2. Clique em **Create Credentials** → **API Key**
3. Copie a chave gerada

### 4. Configurar Variável de Ambiente

```env
# .env.local ou .env
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## API Utilizada

### YouTube Data API v3 - Search

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/search`

**Parâmetros utilizados:**
```typescript
{
  part: 'snippet',
  q: keyword,              // Termo de busca
  type: 'video',           // Apenas vídeos
  order: 'relevance',      // Ordenação por relevância
  maxResults: 10,          // Máximo de resultados
  key: YOUTUBE_API_KEY
}
```

**Retorno:**
```typescript
{
  items: [
    {
      id: { videoId: string },
      snippet: {
        title: string,
        description: string,
        publishedAt: string,
        channelId: string,
        channelTitle: string,
        thumbnails: { ... }
      }
    }
  ]
}
```

### YouTube Data API v3 - Videos (detalhes)

**Endpoint:** `GET https://www.googleapis.com/youtube/v3/videos`

**Parâmetros:**
```typescript
{
  part: 'statistics',
  id: videoId,              // Vírgula-separated IDs
  key: YOUTUBE_API_KEY
}
```

**Retorno:**
```typescript
{
  items: [
    {
      id: string,
      statistics: {
        viewCount: string,
        likeCount: string,
        commentCount: string,
        // ...
      }
    }
  ]
}
```

---

## Integração no Código

### Serviço YouTube

Localização: `src/lib/discovery-services/youtube.service.ts`

```typescript
import { google } from 'googleapis'

class YouTubeService {
  private apiKey: string | undefined
  private youtube: youtube_v3.Youtube

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKey,
    })
  }

  async searchByKeyword(
    keyword: string,
    maxResults: number = 10
  ): Promise<ServiceResult<TrendingTopic[]>> {
    if (!this.apiKey) {
      console.warn('[YouTube] API key não configurada')
      return { success: true, data: [] }
    }

    try {
      // 1. Busca vídeos
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: keyword,
        type: ['video'],
        order: 'relevance',
        maxResults: maxResults,
      })

      // 2. Busca estatísticas dos vídeos
      const videoIds = searchResponse.data.items?.map(item => item.id?.videoId).filter(Boolean)
      const videosResponse = await this.youtube.videos.list({
        part: ['statistics'],
        id: videoIds,
      })

      // 3. Transforma em TrendingTopic
      const topics = this.transformToTopics(searchResponse.data.items, videosResponse.data.items)
      return { success: true, data: topics }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
```

---

## Pacote Necessário

```bash
npm install googleapis
```

**Versão utilizada:** `googleapis` (última)

---

## Quotas e Limites

### Plano Gratuito

| Métrica | Limite Diário |
|---------|---------------|
| Units | 10,000 |
| Custo por search | 100 units |
| Custo por videos list | 1 unit por vídeo |

### Cálculo de Units

**Por busca com 10 vídeos:**
- `search.list`: 100 units
- `videos.list`: 10 units
- **Total:** 110 units por busca

**Limite diário aproximado:** ~90 buscas de 10 vídeos

### Excedendo Quota

**Erro:**
```
Quota exceeded: The request cannot be completed because you have exceeded your quota.
```

**Soluções:**
1. Aguardar reset diário (meia-noite PDT)
2. Aumentar quota (plano pago)
3. Implementar cache de resultados

---

## Custos

### Google Cloud Platform

- **YouTube Data API:** Gratuita dentro das quotas
- **Excesso:** ~$0.002 por 1,000 units

### Plano Paid (se necessário)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Quotas
3. Solicite aumento de limite

---

## Teste Manual

### Testar API Diretamente

```bash
# Substitua YOUR_API_KEY
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=marketing%20digital&type=video&order=relevance&maxResults=5&key=YOUR_API_KEY"
```

### Teste via API Explorer

1. Acesse [developers.google.com/youtube/v3/docs/search/list](https://developers.google.com/youtube/v3/docs/search/list)
2. Use o "Try this API" interativo
3. Insira sua API key
4. Execute

---

## Troubleshooting

### Erro: "API key not valid"

```
Solução: Verificar se YOUTUBE_API_KEY está correta no .env.local
```

### Erro: "quotaExceeded"

```
Solução: Aguardar reset ou aumentar quota
```

### Resultados Vazios

**Possíveis causas:**
1. Palavra-chave muito específica
2. Não há vídeos correspondentes
3. Restrições de região

**Solução:** Tentar palavras-chave mais genéricas

### Vídeos Privados/Restritos

Alguns vídeos podem não retornar dados completos devido a restrições:
- Vídeos privados
- Age-restricted
- Region-locked

---

## Retry Strategy

Implementar retry para erros temporários:

```typescript
async searchWithRetry(keyword: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.searchByKeyword(keyword)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}
```

---

## Boas Práticas

### 1. Validar API Key

```typescript
if (!process.env.YOUTUBE_API_KEY) {
  console.warn('[YouTube] API key não configurada, retornando vazio')
  return { success: true, data: [] }
}
```

### 2. Tratar Erros Específicos

```typescript
if (error.code === 429) {
  // Quota exceeded
  return { success: false, error: 'Limite diário atingido' }
}
```

### 3. Implementar Cache

```typescript
// Cache simples em memória (para produção usar Redis)
const cache = new Map<string, { data, expiry }>()

const cached = cache.get(keyword)
if (cached && cached.expiry > Date.now()) {
  return cached.data
}
```

### 4. Usar Ordem por Relevância

```typescript
// Relevance é melhor que date para trending topics
order: 'relevance'
```

---

## Alternativas

Se YouTube Data API não for viável:

1. **YouTube RSS** - Limitado, não requer API key
2. **Scrapers** - Puppeteer/Playwright (viola ToS)
3. **Provedores terceiros:**
   - RapidAPI - YouTube APIs
   - SerpAPI - Google Search Results

---

## Parâmetros Adicionais

### Filtrar por Data

```typescript
{
  publishedAfter: '2024-01-01T00:00:00Z',  // Vídeos após data
  publishedBefore: '2024-12-31T23:59:59Z', // Vídeos antes da data
}
```

### Filtrar por Duração

```typescript
{
  videoDuration: 'short',  // < 4 min
  // 'medium'             // 4-20 min
  // 'long'               // > 20 min
}
```

### Filtrar por Região

```typescript
{
  regionCode: 'BR',  // Brasil
  // 'US', 'PT', etc.
}
```

---

## Referências

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [Search: list](https://developers.google.com/youtube/v3/docs/search/list)
- [Videos: list](https://developers.google.com/youtube/v3/docs/videos/list)
- [Quotas and Limits](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Google Cloud Console](https://console.cloud.google.com)
