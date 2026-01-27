# Plano de Implementação: Migração para Vercel AI SDK e Chaves de API Centralizadas

**Data:** 2026-01-16
**Versão:** 1.0
**Status:** Planejamento

---

## 1. Resumo Executivo

Este documento detalha a migração do sistema **Máquina de Conteúdo** de uma arquitetura descentralizada (chaves de API gerenciadas por usuário) para uma arquitetura centralizada (chaves de API controladas pelo sistema) com integração do **Vercel AI SDK**.

### Mudanças Principais

| Aspecto | Estado Atual | Estado Futuro |
|---------|--------------|---------------|
| **Chaves de API** | Usuários configuram suas próprias chaves (criptografadas no banco) | Chaves vindas de variáveis de ambiente (controladas pelo admin) |
| **Chat LLM** | `openai` SDK + fetch direto ao OpenRouter | Vercel AI SDK (`@ai-sdk/react` + `@ai-sdk/openai`) |
| **Streaming** | Implementação manual | Streaming nativo via SDK |
| **Multimodalidade** | Não implementado | Suporte nativo via SDK |
| **Voyage Embeddings** | Via `userApiKeys` (deprecado) | Via variável de ambiente (manter implementação atual) |

### Motivação

1. **Simplicidade**: Remove complexidade de criptografia/descriptografia de chaves
2. **Custo Centralizado**: Empresa paga por uso de IA, não usuário final
3. **Melhor UX**: Usuários só selecionam modelos, não configuram chaves
4. **Streaming Nativo**: Vercel AI SDK fornece streaming robusto e type-safe
5. **Multi-LLM**: Facilidade de trocar entre GPT, Claude, Gemini via OpenRouter
6. **Chat Multimodal**: Suporte nativo para imagens, áudio e vídeo nas mensagens
7. **Realtime**: Streaming word-by-word sem implementação manual complexa

---

## 2. Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  Chat UI        │    │  Model Selector │    │ RAG Context     │        │
│  │  (useChat hook) │    │  (Componente)   │    │  Selector       │        │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘        │
│           │                                                                   │
│           ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Route /api/chat                          │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Vercel AI SDK (streamText)                                   │  │   │
│  │  │  ├─ OpenRouter Provider (@ai-sdk/openai)                    │  │   │
│  │  │  ├─ RAG Context Integration                                  │  │   │
│  │  │  └─ Streaming Response                                        │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   OpenRouter    │    │   Voyage AI     │    │  Firecrawl/     │        │
│  │   (Chat/Imagem) │    │   (Embeddings)  │    │  Tavily (Opc.)  │        │
│  │   .env: OPENROUTER│   │   .env: VOYAGE  │    │  .env: FIRECRAWL│        │
│  │   _API_KEY      │    │   _API_KEY      │    │  _API_KEY       │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Separação de Responsabilidades:**

```
┌────────────────────────────────────────────────────────────────────┐
│                     Vercel AI SDK                                  │
│  Usado PARA: Chat, Multimodal, Streaming, Tool Calls             │
│  NÃO usado PARA: Embeddings (Voyage mantido separado)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Variáveis de Ambiente

### Novas Variáveis Necessárias

```env
# ============================================================
# AI SERVICES - System-controlled API Keys
# ============================================================

# OpenRouter - Primary LLM Provider (REQUIRED)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_APP_NAME=máquina-de-conteudo
OPENROUTER_APP_URL=https://your-app.com

# Voyage AI - Embeddings for RAG (REQUIRED)
# NOTA: Mantido separado do Vercel AI SDK
VOYAGE_API_KEY=voyage-...

# Firecrawl - Web Scraping (optional)
FIRECRAWL_API_KEY=fc-...

# Tavily - Web Search (optional)
TAVILY_API_KEY=tvly-...

# APIfy - Alternative Scraping (optional)
APIFY_API_KEY=apify-...

# ScreenshotOne - Screenshots (optional)
SCREENSHOTONE_ACCESS_KEY=...

# ============================================================
# DEFAULT MODELS
# ============================================================

DEFAULT_TEXT_MODEL=openai/gpt-4.1
DEFAULT_IMAGE_MODEL=openai/gpt-5-image
DEFAULT_EMBEDDING_MODEL=voyage-4-large
```

### Validação de Environment Variables

```typescript
// src/lib/env/validation.ts
import { z } from 'zod'

const envSchema = z.object({
  // Required
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  VOYAGE_API_KEY: z.string().min(1, "VOYAGE_API_KEY is required"),

  // Optional
  FIRECRAWL_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  APIFY_API_KEY: z.string().optional(),
  SCREENSHOTONE_ACCESS_KEY: z.string().optional(),

  // Defaults
  DEFAULT_TEXT_MODEL: z.string().default("openai/gpt-4.1"),
  DEFAULT_IMAGE_MODEL: z.string().default("openai/gpt-5-image"),
})

export const env = envSchema.parse(process.env)
```

---

## 4. Fases de Implementação

### Fase 1: Setup Inicial - Instalar Dependências (30 min)

**Objetivo:** Instalar pacotes Vercel AI SDK e configurar base.

**Comandos:**

```bash
# Instalar Vercel AI SDK core
npm install ai

# Instalar provider OpenRouter
npm install @ai-sdk/openai

# Instalar hooks React para frontend
npm install @ai-sdk/react

# OU tudo de uma vez:
npm install ai @ai-sdk/openai @ai-sdk/react
```

**Verificar package.json após instalação:**

```json
{
  "dependencies": {
    "ai": "^4.x.x",
    "@ai-sdk/openai": "^1.x.x",
    "@ai-sdk/react": "^1.x.x"
  }
}
```

---

### Fase 2: Configuração Central do Vercel AI SDK (1 hora)

**Objetivo:** Criar arquivo de configuração central.

#### Arquivo a Criar: `src/lib/ai/config.ts`

```typescript
/**
 * Vercel AI SDK Configuration
 *
 * Central configuration for all AI providers via OpenRouter.
 * Voyage embeddings are kept separate (not using SDK).
 */

import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

/**
 * Environment variables validation
 */
const aiConfigSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_APP_NAME: z.string().default('Máquina de Conteúdo'),
  OPENROUTER_APP_URL: z.string().default(''),
  DEFAULT_TEXT_MODEL: z.string().default('openai/gpt-4.1'),
  DEFAULT_IMAGE_MODEL: z.string().default('openai/gpt-5-image'),
})

const config = aiConfigSchema.parse({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME,
  OPENROUTER_APP_URL: process.env.OPENROUTER_APP_URL,
  DEFAULT_TEXT_MODEL: process.env.DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL: process.env.DEFAULT_IMAGE_MODEL,
})

/**
 * OpenRouter provider for Vercel AI SDK
 *
 * Uses OpenRouter as an aggregation layer to access multiple
 * LLM providers (OpenAI, Anthropic, Google, etc.) through a single API.
 */
export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
  compatibility: 'compatible', // 'strict' | 'compatible'
  headers: {
    'X-Title': config.OPENROUTER_APP_NAME,
    'HTTP-Referer': config.OPENROUTER_APP_URL,
  },
})

/**
 * Default models
 */
export const DEFAULT_TEXT_MODEL = config.DEFAULT_TEXT_MODEL
export const DEFAULT_IMAGE_MODEL = config.DEFAULT_TEXT_MODEL

/**
 * Available text models
 */
export const AVAILABLE_TEXT_MODELS = [
  // OpenAI
  'openai/gpt-4.1',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-3.5-turbo',

  // Anthropic
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3-opus',

  // Google
  'google/gemini-2.5-flash-preview',
  'google/gemini-2.5-pro-preview',

  // Meta
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-405b-instruct',

  // xAI
  'x-ai/grok-2-1212',
] as const

/**
 * Available image models
 */
export const AVAILABLE_IMAGE_MODELS = [
  'openai/gpt-5-image',
  'openai/dall-e-3',
  'google/gemini-2.5-pro-image-preview',
  'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux.2-flex',
] as const

/**
 * Type definitions
 */
export type TextModel = typeof AVAILABLE_TEXT_MODELS[number]
export type ImageModel = typeof AVAILABLE_IMAGE_MODELS[number]
export type AiModel = TextModel | ImageModel

/**
 * Check if model is available
 */
export function isAvailableModel(model: string): model is AiModel {
  return [...AVAILABLE_TEXT_MODELS, ...AVAILABLE_IMAGE_MODELS].includes(model as any)
}

/**
 * Get model info
 */
export interface ModelInfo {
  id: string
  name: string
  provider: string
  type: 'text' | 'image'
  contextLength?: number
}

export const MODELS_INFO: Record<AiModel, ModelInfo> = {
  // OpenAI Text
  'openai/gpt-4.1': {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  'openai/gpt-3.5-turbo': {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 16385,
  },
  'openai/dall-e-3': {
    id: 'openai/dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    type: 'image',
  },

  // Anthropic
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },
  'anthropic/claude-3-opus': {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'text',
    contextLength: 200000,
  },

  // Google
  'google/gemini-2.5-flash-preview': {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },
  'google/gemini-2.5-pro-preview': {
    id: 'google/gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    type: 'text',
    contextLength: 1000000,
  },
  'google/gemini-2.5-pro-image-preview': {
    id: 'google/gemini-2.5-pro-image-preview',
    name: 'Gemini 2.5 Pro Image',
    provider: 'Google',
    type: 'image',
  },

  // Meta
  'meta-llama/llama-3.1-70b-instruct': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    type: 'text',
    contextLength: 131072,
  },
  'meta-llama/llama-3.1-405b-instruct': {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    type: 'text',
    contextLength: 131072,
  },

  // xAI
  'x-ai/grok-2-1212': {
    id: 'x-ai/grok-2-1212',
    name: 'Grok 2',
    provider: 'xAI',
    type: 'text',
    contextLength: 131072,
  },

  // Flux
  'black-forest-labs/flux.2-pro': {
    id: 'black-forest-labs/flux.2-pro',
    name: 'Flux 2 Pro',
    provider: 'Black Forest Labs',
    type: 'image',
  },
  'black-forest-labs/flux.2-flex': {
    id: 'black-forest-labs/flux.2-flex',
    name: 'Flux 2 Flex',
    provider: 'Black Forest Labs',
    type: 'image',
  },

  // GPT-5 Image
  'openai/gpt-5-image': {
    id: 'openai/gpt-5-image',
    name: 'GPT-5 Image',
    provider: 'OpenAI',
    type: 'image',
  },
}

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODELS_INFO[modelId as AiModel]
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.provider === provider)
}

/**
 * Get models by type
 */
export function getTextModels(): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.type === 'text')
}

export function getImageModels(): ModelInfo[] {
  return Object.values(MODELS_INFO).filter(m => m.type === 'image')
}

/**
 * Type guards
 */
export function isTextModel(model: string): model is TextModel {
  return AVAILABLE_TEXT_MODELS.includes(model as any)
}

export function isImageModel(model: string): model is ImageModel {
  return AVAILABLE_IMAGE_MODELS.includes(model as any)
}

/**
 * Check if AI is configured
 */
export function isAiConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY &&
    process.env.VOYAGE_API_KEY
  )
}
```

#### Arquivo a Criar: `src/lib/ai/index.ts`

```typescript
/**
 * AI SDK - Central exports
 *
 * All Vercel AI SDK related exports.
 * Voyage embeddings are kept separate.
 */

export {
  openrouter,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
  AVAILABLE_TEXT_MODELS,
  AVAILABLE_IMAGE_MODELS,
  MODELS_INFO,
  getModelInfo,
  getModelsByProvider,
  getTextModels,
  getImageModels,
  isTextModel,
  isImageModel,
  isAvailableModel,
  isAiConfigured,
  type TextModel,
  type ImageModel,
  type AiModel,
  type ModelInfo,
} from './config'
```

---

### Fase 3: Migrar Voyage para Environment Variables (1 hora)

**IMPORTANTE:** Voyage embeddings **NÃO** usa Vercel AI SDK. Mantemos implementação direta.

#### Arquivo a Modificar: `src/lib/voyage/index.ts`

```typescript
/**
 * Voyage AI Client - System-controlled API key
 *
 * Voyage embeddings are kept separate from Vercel AI SDK.
 * API key comes from environment variable, not user database.
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1'

/**
 * Voyage API key from environment (system-controlled)
 *
 * ANTES: Buscava chave criptografada do banco (userApiKeys table)
 * DEPOIS: Usa variável de ambiente diretamente
 */
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

if (!VOYAGE_API_KEY) {
  if (typeof window === 'undefined') {
    // Server-side: log warning but don't crash
    console.warn(
      'VOYAGE_API_KEY environment variable is not set. ' +
      'Embedding features will not work.'
    )
  }
}

/**
 * Voyage client configuration
 */
export interface VoyageClientConfig {
  apiKey: string
  baseURL: string
}

/**
 * Get Voyage API client (system-controlled)
 *
 * @throws {Error} If API key is not configured (server-side only)
 */
export async function getVoyageClient(): Promise<VoyageClientConfig> {
  // Verificação simplificada - apenas env var
  if (!VOYAGE_API_KEY) {
    throw new Error(
      'Voyage AI API key not configured. ' +
      'Please set VOYAGE_API_KEY environment variable.'
    )
  }

  return {
    apiKey: VOYAGE_API_KEY,
    baseURL: VOYAGE_API_URL,
  }
}

/**
 * Check if Voyage API is configured
 */
export async function isVoyageConfigured(): Promise<boolean> {
  return !!VOYAGE_API_KEY
}

/**
 * Voyage error class
 */
export class VoyageError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'VoyageError'
  }
}
```

#### Arquivo a Modificar: `src/lib/voyage/embeddings.ts`

```typescript
/**
 * Voyage Embeddings Generation
 *
 * Generates embeddings using Voyage AI API.
 * NOT using Vercel AI SDK - direct API calls.
 */

import { getVoyageClient, VoyageError } from './index'

/**
 * Embedding model options
 */
export type VoyageModel =
  | 'voyage-4-large'
  | 'voyage-4'
  | 'voyage-3-large'
  | 'voyage-3-lite'
  | 'voyage-2'

/**
 * Generate a single embedding
 *
 * @param text - Text to embed
 * @param model - Voyage model to use (default: voyage-4-large)
 * @returns Promise<number[]> - Embedding vector
 */
export async function generateEmbedding(
  text: string,
  model: VoyageModel = 'voyage-4-large'
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new VoyageError('Text cannot be empty')
  }

  const { apiKey, baseURL } = await getVoyageClient()

  const response = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model,
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new VoyageError(
      error.detail || error.message || 'Voyage API error',
      error.code,
      response.status
    )
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Generate multiple embeddings in batch
 *
 * @param texts - Array of texts to embed
 * @param model - Voyage model to use
 * @returns Promise<number[][]> - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  model: VoyageModel = 'voyage-4-large'
): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const { apiKey, baseURL } = await getVoyageClient()

  const response = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model,
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new VoyageError(
      error.detail || error.message || 'Voyage API error',
      error.code,
      response.status
    )
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

/**
 * Get embedding dimension for a model
 */
export function getEmbeddingDimension(model: VoyageModel): number {
  const dimensions: Record<VoyageModel, number> = {
    'voyage-4-large': 1024,
    'voyage-4': 1024,
    'voyage-3-large': 1024,
    'voyage-3-lite': 512,
    'voyage-2': 1024,
  }
  return dimensions[model]
}
```

---

### Fase 4: Criar Nova API Route com Vercel AI SDK (2-3 horas)

**Objetivo:** Implementar nova rota `/api/chat` usando `streamText`.

#### Arquivo a Criar: `src/app/api/chat/route.ts`

```typescript
/**
 * Chat API Route with Vercel AI SDK
 *
 * Handles streaming chat responses with RAG context integration.
 * Uses OpenRouter via Vercel AI SDK.
 *
 * POST /api/chat
 */

import { streamText } from 'ai'
import { openrouter } from '@/lib/ai'
import { auth } from '@clerk/nextjs/server'
import type { CoreMessage } from 'ai'

/**
 * Chat request body
 */
interface ChatRequest {
  /** Messages array (Vercel AI SDK format) */
  messages: CoreMessage[]
  /** Model to use */
  model?: string
  /** Temperature for generation */
  temperature?: number
  /** Max tokens */
  maxTokens?: number
  /** RAG categories to search */
  ragCategories?: string[]
  /** Whether to include RAG context */
  useRag?: boolean
}

/**
 * POST /api/chat
 *
 * Streams chat responses using Vercel AI SDK
 */
export async function POST(req: Request) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse request body
    const body: ChatRequest = await req.json()
    const {
      messages = [],
      model,
      temperature = 0.7,
      maxTokens = 2048,
      ragCategories = [],
      useRag = true,
    } = body

    // Use default model if not specified
    const selectedModel = model || process.env.DEFAULT_TEXT_MODEL || 'openai/gpt-4.1'

    // Get last user message for RAG
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()

    // Build messages with system prompt
    const messagesWithSystem: CoreMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(useRag),
      },
      ...messages,
    ]

    // RAG integration (if enabled and user message exists)
    if (useRag && lastUserMessage?.content && ragCategories.length > 0) {
      try {
        const ragContext = await getRagContext(
          userId,
          lastUserMessage.content as string,
          ragCategories
        )

        if (ragContext) {
          // Inject RAG context into system prompt
          messagesWithSystem[0] = {
            role: 'system',
            content: getSystemPrompt(true, ragContext),
          }
        }
      } catch (ragError) {
        console.error('RAG error:', ragError)
        // Continue without RAG
      }
    }

    // Stream using Vercel AI SDK
    const result = streamText({
      model: openrouter(selectedModel),
      messages: messagesWithSystem,
      temperature,
      maxTokens,
    })

    // Return streaming response
    return result.toDataStreamResponse()

  } catch (error) {
    console.error('Chat API error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Get system prompt
 */
function getSystemPrompt(
  useRag: boolean,
  ragContext?: string
): string {
  const basePrompt = `Você é um assistente especialista em criação de conteúdo para redes sociais.

Seu trabalho é ajudar o usuário a:
- Criar textos envolventes para posts
- Planejar calendários editorial
- Desenvolver estratégias de conteúdo
- Sugerir ideias criativas
- Otimizar conteúdo para diferentes plataformas`

  if (!useRag || !ragContext) {
    return basePrompt
  }

  return `${basePrompt}

---
CONTEXTO RELEVANTE:

${ragContext}

Quando usar informações do contexto acima, cite a fonte entre colchetes como [Nome do Documento].
Se a pergunta não puder ser respondida com o contexto, diga que não possui essa informação específica,
mas ofereça o que puder ajudar com seu conhecimento geral.`
}

/**
 * Get RAG context from documents
 *
 * TODO: Implement with Voyage semantic search
 */
async function getRagContext(
  userId: string,
  query: string,
  categories: string[]
): Promise<string | null> {
  // Placeholder - will be implemented with Voyage search
  // For now, return null to disable RAG
  return null
}

/**
 * Runtime configuration
 */
export const runtime = 'nodejs'
```

---

### Fase 5: Atualizar Frontend com useChat (2-3 horas)

**Objetivo:** Migrar de `fetch` manual para `useChat` hook do Vercel AI SDK.

#### Arquivo a Criar: `src/components/chat/ai-chat-sdk.tsx`

```typescript
/**
 * AI Chat Component with Vercel AI SDK
 *
 * Replaces manual fetch implementation with useChat hook.
 * Supports streaming, multimodal, and RAG integration.
 *
 * 'use client'
 */

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Stop,
  Loader2,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ModelSelector } from './model-selector'
import { RagContextSelector } from './rag-context-selector'

/**
 * Chat message with sources (for RAG)
 */
interface ChatMessageWithSources {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Array<{
    documentId: number
    documentTitle: string
    category: string
    score: number
  }>
}

/**
 * Props
 */
export interface AiChatSdkProps {
  /** Initial model */
  defaultModel?: string
  /** Enable RAG by default */
  defaultUseRag?: boolean
  /** On new chat */
  onNewChat?: () => void
}

/**
 * AI Chat with Vercel AI SDK
 */
export function AiChatSdk({
  defaultModel,
  defaultUseRag = true,
  onNewChat,
}: AiChatSdkProps) {
  // Model selection
  const [selectedModel, setSelectedModel] = useState(defaultModel)

  // RAG configuration
  const [ragCategories, setRagCategories] = useState<string[]>([])
  const [useRag, setUseRag] = useState(defaultUseRag)

  // Vercel AI SDK chat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
    setMessages,
    reload,
  } = useChat({
    api: '/api/chat',
    // Send additional data with each request
    body: {
      model: selectedModel,
      ragCategories,
      useRag,
    },
    // Callbacks
    onFinish: (message) => {
      console.log('Message complete:', message)
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  // Auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new chat
  const handleNewChat = () => {
    setMessages([])
    onNewChat?.()
  }

  // Extract sources from last assistant message
  const lastSources = messages
    .filter(m => m.role === 'assistant')
    .pop()?.annotations?.sources as Array<{
      documentTitle: string
      category: string
      score: number
    }> | undefined

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium text-white">Chat IA</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* RAG Toggle */}
          <RagContextSelector
            value={ragCategories}
            onValueChange={setRagCategories}
            enabled={useRag}
            onEnabledChange={setUseRag}
          />

          {/* Model Selector */}
          <ModelSelector
            value={selectedModel}
            onValueChange={setSelectedModel}
            modelType="text"
          />

          {/* New Chat Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="text-white/70 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState onStartChat={() => {/* Focus input */}} />
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error.message}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => reload()}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sources (if available) */}
      {lastSources && lastSources.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/60 mb-2">Fontes usadas:</p>
          <div className="flex flex-wrap gap-2">
            {lastSources.map((source, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
              >
                {source.documentTitle} ({source.category})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-white/10"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />

          {isLoading ? (
            <Button
              type="button"
              onClick={stop}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
            >
              <Stop className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="h-12 w-12 rounded-xl bg-primary text-black hover:bg-primary/90 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Model info footer */}
        {selectedModel && (
          <div className="mt-2 text-xs text-white/40 text-center">
            Usando {selectedModel}
          </div>
        )}
      </form>
    </div>
  )
}

/**
 * Empty state when no messages
 */
function EmptyState({ onStartChat }: { onStartChat: () => void }) {
  const suggestions = [
    { text: "Crie um post para Instagram sobre marketing digital", icon: "📱" },
    { text: "Planeje um calendário editorial para a próxima semana", icon: "📅" },
    { text: "Sugira 5 ideias de conteúdo para LinkedIn", icon: "💡" },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">
        Bem-vindo ao Chat IA
      </h3>

      <p className="text-sm text-white/60 max-w-md mb-8">
        Comece uma conversa para criar conteúdo para redes sociais.
        Use as fontes do seu conhecimento para respostas personalizadas.
      </p>

      {/* Suggestions */}
      <div className="grid gap-2 w-full max-w-md">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              // Send suggestion as message
              const inputEvent = new Event('submit', { bubbles: true }) as any
              inputEvent.target = {
                querySelector: () => ({ value: suggestion.text }),
              }
              // This would need proper implementation
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-left hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <span className="text-xl">{suggestion.icon}</span>
            <span className="text-sm text-white/80">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Individual chat message
 */
function ChatMessage({
  message,
  isLast,
}: {
  message: any
  isLast: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-black'
            : 'bg-white/10 text-white'
        )}
      >
        {/* Handle different content formats */}
        {typeof message.content === 'string' ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        ) : (
          // Handle structured content (Vercel AI SDK parts)
          <div className="space-y-2">
            {message.content?.map((part: any, i: number) => (
              <span key={i}>{part.text}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Fase 6: Atualizar Settings Page (1-2 horas)

**Objetivo:** Remover seção de API Keys do UI, manter apenas seleção de modelos.

#### Modificar: `src/app/(app)/settings/page.tsx`

```typescript
// REMOVER aba "api-keys" do SETTINGS_TABS

const SETTINGS_TABS = [
  // { value: "api-keys", label: "API Keys", icon: Key }, // REMOVIDO
  { value: "models", label: "Modelos", icon: Cpu },
  { value: "prompts", label: "Prompts", icon: MessageSquare },
  { value: "variables", label: "Variáveis", icon: Sliders },
] as const
```

#### Criar: `src/app/(app)/settings/components/sections/system-status-section.tsx`

```typescript
/**
 * System Status Section
 *
 * Shows status of configured APIs without exposing actual keys.
 * Users cannot configure API keys - they are managed by system administrators.
 */

"use client"

import * as React from "react"
import {
  ShieldCheck,
  ShieldX,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * API status
 */
interface ApiStatus {
  provider: string
  name: string
  configured: boolean
  required: boolean
}

/**
 * System Status Section Props
 */
export interface SystemStatusSectionProps {
  className?: string
}

/**
 * System Status Section Component
 */
export function SystemStatusSection({
  className,
}: SystemStatusSectionProps) {
  const [statuses, setStatuses] = React.useState<ApiStatus[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Load system status
  React.useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/system/status")
        const data = await response.json()

        setStatuses([
          {
            provider: "openrouter",
            name: "OpenRouter (Chat/Imagem)",
            configured: data.apis?.openrouter?.configured ?? false,
            required: true,
          },
          {
            provider: "voyage",
            name: "Voyage AI (Embeddings)",
            configured: data.apis?.voyage?.configured ?? false,
            required: true,
          },
          {
            provider: "firecrawl",
            name: "Firecrawl (Web Scraping)",
            configured: data.apis?.firecrawl?.configured ?? false,
            required: false,
          },
          {
            provider: "tavily",
            name: "Tavily (Busca Web)",
            configured: data.apis?.tavily?.configured ?? false,
            required: false,
          },
        ])
      } catch (error) {
        console.error("Failed to load system status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStatus()
  }, [])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando status do sistema...</span>
        </div>
      </div>
    )
  }

  const allRequiredConfigured = statuses
    .filter(s => s.required)
    .every(s => s.configured)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Status das APIs</h2>
        <p className="text-sm text-white/60">
          Status dos serviços de IA configurados no sistema.
        </p>
      </div>

      {/* System Notice */}
      <div
        className={cn(
          "p-4 rounded-xl border",
          allRequiredConfigured
            ? "bg-green-500/5 border-green-500/20"
            : "bg-orange-500/5 border-orange-500/20"
        )}
      >
        <div className="flex items-start gap-3">
          {allRequiredConfigured ? (
            <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <ShieldX className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="text-white/90 font-medium">
              {allRequiredConfigured
                ? "Todos os serviços required estão configurados"
                : "Alguns serviços required não estão configurados"}
            </p>
            <p className="text-white/60 mt-1">
              As chaves de API são gerenciadas pelos administradores do sistema.
              Caso algum serviço não esteja funcionando, entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>

      {/* API Status List */}
      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            key={status.provider}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center gap-3">
              {status.configured ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle
                  className={cn(
                    "h-4 w-4",
                    status.required ? "text-red-500" : "text-white/40"
                  )}
                />
              )}
              <div>
                <p className="text-sm text-white/90">{status.name}</p>
                {status.required && (
                  <p className="text-xs text-white/40">Required</p>
                )}
              </div>
            </div>

            <div
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-md",
                status.configured
                  ? "bg-green-500/10 text-green-500"
                  : status.required
                    ? "bg-red-500/10 text-red-500"
                    : "bg-white/5 text-white/40"
              )}
            >
              {status.configured ? "Configurado" : "Não configurado"}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### Criar: `src/app/api/system/status/route.ts`

```typescript
/**
 * System Status API Route
 *
 * Returns status of configured APIs without exposing actual keys.
 * Used by the System Status section in Settings.
 */

import { NextResponse } from "next/server"

/**
 * GET /api/system/status
 *
 * Returns configuration status of all external APIs.
 */
export async function GET() {
  // Check environment variables (without exposing values)
  const apis = {
    openrouter: {
      configured: !!process.env.OPENROUTER_API_KEY,
    },
    voyage: {
      configured: !!process.env.VOYAGE_API_KEY,
    },
    firecrawl: {
      configured: !!process.env.FIRECRAWL_API_KEY,
    },
    tavily: {
      configured: !!process.env.TAVILY_API_KEY,
    },
    screenshotone: {
      configured: !!process.env.SCREENSHOTONE_ACCESS_KEY,
    },
    apify: {
      configured: !!process.env.APIFY_API_KEY,
    },
  }

  return NextResponse.json({ apis })
}
```

---

### Fase 7: Limpeza e Remoção de Código Legado (1 hora)

**Objetivo:** Remover ou marcar código não utilizado.

#### Arquivos a Remover:

| Arquivo | Motivo |
|---------|--------|
| `src/app/api/settings/validate-api-key/route.ts` | Não valida mais user keys |
| `src/app/(app)/settings/components/sections/api-keys-section.tsx` | Usuário não cadastra mais |
| `src/app/(app)/settings/actions/validate-api-key.ts` | Ação não necessária |

#### Arquivos a Marcar como Deprecated:

```typescript
/**
 * @deprecated This action is deprecated. API keys are now system-controlled
 * via environment variables. This file will be removed in version 2.0.
 */
export async function saveApiKeyAction(/* ... */) {
  // Implementation kept for backward compatibility
}
```

---

## 5. Tabela Completa de Mudanças de Arquivos

### Arquivos a Criar (7 arquivos)

| Caminho | Descrição | Prioridade |
|---------|-----------|------------|
| `src/lib/ai/config.ts` | Configuração Vercel AI SDK + OpenRouter | **CRÍTICO** |
| `src/lib/ai/index.ts` | Exports centralizados | Alto |
| `src/app/api/chat/route.ts` | Nova API route com streamText | **CRÍTICO** |
| `src/components/chat/ai-chat-sdk.tsx` | Chat com useChat hook | **CRÍTICO** |
| `src/app/(app)/settings/components/sections/system-status-section.tsx` | Status das APIs | Alto |
| `src/app/api/system/status/route.ts` | Endpoint de status | Alto |
| `.context/docs/development-plan/vercel-ai-sdk-migration.md` | Este documento | Médio |

### Arquivos a Modificar (5 arquivos)

| Caminho | Modificação | Prioridade |
|---------|-------------|------------|
| `src/lib/voyage/index.ts` | Usar `process.env.VOYAGE_API_KEY` | **CRÍTICO** |
| `src/app/(app)/settings/page.tsx` | Remover aba API Keys | Alto |
| `package.json` | Adicionar `ai`, `@ai-sdk/openai`, `@ai-sdk/react` | **CRÍTICO** |
| `.env.local` | Adicionar novas variáveis | **CRÍTICO** |
| `.env.example` | Documentar novas variáveis | Alto |

### Arquivos a Remover (3 arquivos)

| Caminho | Quando Remover |
|---------|----------------|
| `src/app/api/settings/validate-api-key/route.ts` | Após migração completa |
| `src/app/(app)/settings/components/sections/api-keys-section.tsx` | Após migração completa |
| `src/app/(app)/settings/actions/validate-api-key.ts` | Após migração completa |

### Arquivos a Manter (compatibilidade)

| Caminho | Razão |
|---------|-------|
| `src/lib/encryption.ts` | Dados existentes no banco |
| `src/db/schema.ts` | Tabela `userApiKeys` mantida por enquanto |
| `src/lib/openrouter.ts` | Pode ser útil para rollback |

---

## 6. Testes e Validação

### Testes por Fase

| Fase | Teste | Esperado |
|------|-------|----------|
| 1 | `npm run build` | Build sem erros |
| 2 | Upload documento + embedding | Funciona com env var |
| 3 | `POST /api/chat` | Streaming response |
| 4 | Chat UI | Mensagens aparecem word-by-word |
| 5 | Settings page | Aba API Keys não aparece |
| 6 | Status endpoint | Retorna configuração correta |

### Testes Manuais - Chat

```bash
# Testar streaming
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Olá!"}]
  }'

# Deve retornar stream de dados
```

### Testes Manuais - Voyage

```typescript
// Testar embedding
const { generateEmbedding } = await import('@/lib/voyage/embeddings')
const embedding = await generateEmbedding("test text")
console.log(embedding.length) // Deve ser 1024 para voyage-4-large
```

---

## 7. Plano de Rollback

### Rollback Imediato (via Git)

```bash
# Reverter commit de migração
git revert <migration-commit-hash>

# Ou reset para branch anterior
git reset --hard HEAD~1
```

### Rollback Gradual (Feature Flag)

```typescript
// src/lib/feature-flags.ts
export const FLAGS = {
  USE_V2_CHAT: process.env.FEATURE_USE_V2_CHAT === 'true',
  USE_NEW_AI_SDK: process.env.FEATURE_USE_NEW_AI_SDK === 'true',
}

// No código
if (FLAGS.USE_NEW_AI_SDK) {
  // Nova implementação
} else {
  // Implementação antiga
}
```

---

## 8. Timeline Estimada

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Instalar dependências | 30 min |
| 2 | Configurar AI SDK | 1 hora |
| 3 | Migrar Voyage para env vars | 1 hora |
| 4 | Nova API route `/api/chat` | 2-3 horas |
| 5 | Frontend com `useChat` | 2-3 horas |
| 6 | Atualizar Settings page | 1-2 horas |
| 7 | Limpeza código legado | 1 hora |
| **Total** | | **8-12 horas** |

---

## 9. Problemas Conhecidos e Como Evitar

### 9.1 Streaming em Next.js 16 com Turbopack

**Problema:** Turbopack pode ter issues com streaming responses.

**Solução:**
```typescript
// next.config.ts - Garantir configuração correta
const nextConfig = {
  // Não desabilitar turbopack, mas estar ciente
  experimental: {
    // Não alterar configurações padrão de streaming
  },
}
```

### 9.2 Environment Variables em Edge Runtime

**Problema:** `process.env` pode não estar disponível.

**Solução:**
```typescript
// Sempre especificar runtime para API routes
export const runtime = 'nodejs' // Não 'edge'
```

### 9.3 NÃO Usar Vercel AI SDK para Voyage

**IMPORTANTE:** Voyage embeddings devem continuar usando implementação direta.

```typescript
// ❌ ERRADO - Não fazer
import { createOpenAI } from '@ai-sdk/openai'
const voyage = createOpenAI({ baseURL: 'https://api.voyageai.com' })

// ✅ CORRETO - Manter implementação existente
import { generateEmbedding } from '@/lib/voyage/embeddings'
```

### 9.4 Tipos do useChat

**Problema:** Mensagens antigas podem não ter formato esperado.

**Solução:**
```typescript
// Converter mensagens ao migrar dados
const convertLegacyMessage = (old: any): CoreMessage => {
  return {
    role: old.role,
    content: old.content,
  }
}
```

### 9.5 CORS com Streaming

**Problema:** Streaming pode falhar com CORS mal configurado.

**Solução:**
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
```

---

## 10. Próximos Passos Após Migração

1. **Monitoring:** Configurar logging de uso de APIs
2. **Rate Limiting:** Implementar limites por usuário
3. **Custo Tracking:** Track custos de OpenRouter por usuário
4. **Feature Flags:** Adicionar flags para experimentar novos modelos
5. **Analytics:** Track quais modelos são mais usados
6. **Multimodal:** Implementar suporte a imagens nas mensagens
7. **Tool Calls:** Implementar function calling com Vercel AI SDK

---

## 11. Comandos Úteis

```bash
# Instalar dependências
npm install ai @ai-sdk/openai @ai-sdk/react

# Verificar build
npm run build

# Executar em desenvolvimento
npm run dev

# Verificar tipos
npx tsc --noEmit

# Lint
npm run lint
```

---

## 12. Referências

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Voyage AI Documentation](https://docs.voyageai.com/)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Fim do Plano de Implementação**

**Pronto para execução após aprovação.**
