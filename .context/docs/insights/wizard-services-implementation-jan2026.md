# Wizard Services Implementation - Janeiro 2026

## Visão Geral

Implementação completa das integrações do Wizard de Criação: Firecrawl, Apify, Tavily e OpenRouter (via Vercel AI SDK).

## Arquitetura

### Módulo `src/lib/wizard-services/`

```
types.ts                    # Interfaces compartilhadas
prompts.ts                  # Prompts isolados por tipo de conteúdo
llm.service.ts              # Geração de narrativas e conteúdo
rag.service.ts              # Wrapper RAG com graceful degradation
firecrawl.service.ts        # Web scraping (opcional)
tavily.service.ts           # Contextual search (opcional)
apify.service.ts            # YouTube transcription (opcional)
index.ts                    # Barrel exports + getWizardServicesStatus()
```

## Padrões Implementados

### 1. Graceful Degradation

Serviços opcionais (Firecrawl, Tavily, Apify) retornam `null` se não configurados, sem bloquear o fluxo:

```typescript
// Padrão para serviços opcionais
if (!API_KEY) {
  return {
    success: true,
    data: null, // Não é erro - apenas não disponível
  };
}
```

### 2. Prompts Isolados

Cada tipo de conteúdo tem sua própria função de prompt em `prompts.ts`:

- `getNarrativesSystemPrompt()` - Gera 4 opções de narrativa
- `getCarouselPrompt()` - Carrosséis
- `getTextPrompt()` - Posts de texto
- `getImagePrompt()` - Posts com imagem
- `getVideoPrompt()` - Vídeos curtos

**Benefício**: Fácil editar prompts de um tipo específico sem afetar outros.

### 3. Retry Logic com Exponential Backoff

LLM calls implementam retry automático:

```typescript
async function llmCallWithRetry(
  prompt: string,
  model: string,
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateText({ prompt, model });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s...
    }
  }
}
```

### 4. Type-Safe ServiceResult

Todos os serviços retornam `ServiceResult<T>`:

```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Integrações

### Firecrawl (Web Scraping)

**Endpoint**: `https://api.firecrawl.dev/v1/scrape`

**Configuração**: `FIRECRAWL_API_KEY`

**Funções**:
- `extractFromUrl(url)` - Extrai conteúdo markdown de uma URL
- `extractFromMultipleUrls(urls)` - Batch processing (max 3 concurrent)

### Apify (YouTube Transcription)

**Actor**: `apify/youtube-transcript`

**Configuração**: `APIFY_API_TOKEN`

**Funções**:
- `transcribeYouTube(videoUrl)` - Transcrição de um vídeo
- `transcribeMultipleVideos(videoUrls)` - Batch com delay entre requests

### Tavily (Contextual Search)

**Endpoint**: `https://api.tavily.com/search`

**Configuração**: `TAVILY_API_KEY`

**Funções**:
- `contextualSearch(query, options)` - Busca com AI-generated answer
- `searchTrends(domain, timeRange)` - Trends por domínio
- `searchCompetitorInfo(name)` - Pesquisa de concorrentes
- `formatSearchForPrompt(result)` - Formata para inclusão em prompt

### OpenRouter (LLM via Vercel AI SDK)

**Configuração**: `OPENROUTER_API_KEY`

**Funções**:
- `generateNarratives(input, model)` - Gera 4 narrativas com ângulos diferentes
- `generateContent(input, model)` - Gera conteúdo final baseado na narrativa
- `getAvailableWizardModels()` - Lista modelos disponíveis

## Worker Handlers

### wizard_narratives

```typescript
1. Busca wizard no banco
2. Extrai conteúdo de referenceUrl (Firecrawl)
3. Transcreve referenceVideoUrl (Apify)
4. Busca contexto com Tavily
5. Gera RAG context se configurado
6. Gera 4 narrativas com LLM
7. Atualiza wizard com narratives
```

### wizard_generation

```typescript
1. Busca wizard com narrativa selecionada
2. Gera RAG context se configurado
3. Gera conteúdo final com LLM
4. Salva generatedContent
5. Atualiza status
```

## Seletor de Modelos de IA

**Localização**: `step-1-inputs.tsx` → Seção "6. Configurações de IA"

- Usa `TEXT_MODELS` de `@/lib/models`
- Agrupa por provider (OpenAI, Anthropic, Google, xAI)
- Dropdown customizado com AnimatePresence
- Badge com modelo selecionado
- Padrão: `openai/gpt-5.2`

## Aprendizados

### 1. REST API vs SDK

Para Firecrawl e Apify, usei REST API diretamente em vez de SDKs MCP:
- **Mais controle** sobre requests/responses
- **Sem dependências MCP** pesadas
- **Compatibilidade Edge Runtime**

### 2. Prompts Isolados

Manter prompts em funções separadas facilita manutenção:
- Edição de prompts sem risco de quebrar outros tipos
- Testes unitários por tipo de conteúdo
- Versionamento de prompts por tipo

### 3. Default Model

Para serviços opcionais, retorne `null` com `success: true`:
- Não bloqueia o fluxo
- Job continua sem aquele enriquecimento
- Usuário pode configurar depois

## Variáveis de Ambiente

```env
# Obrigatório para LLM
OPENROUTER_API_KEY=sk-or-v1-...

# Obrigatório para RAG
VOYAGE_API_KEY=voyage-...

# Opcionais (graceful degradation)
FIRECRAWL_API_KEY=fc-...
TAVILY_API_KEY=tvly-...
APIFY_API_KEY=apify-...
```

## Referências

- Código: `src/lib/wizard-services/`
- Workers: `src/app/api/workers/route.ts`
- Wizard UI: `src/app/(app)/wizard/`
