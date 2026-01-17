# Vercel AI SDK Integration Patterns

**Data:** Janeiro 2026
**Status:** ✅ Implementado (Fase 8)
**Arquivos principais:**
- `src/lib/ai/config.ts` - Configuração central
- `src/app/api/chat/route.ts` - Streaming endpoint
- `src/components/chat/ai-chat-sdk.tsx` - Chat component

---

## Visão Geral

Migração de cliente customizado OpenRouter para **Vercel AI SDK** completada em Janeiro 2026. O SDK fornece abstrações de alto nível para streaming de IA, hooks React, e type safety.

### Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Client Component │───▶│  API Route      │───▶│  OpenRouter     │
│  (useChat hook)  │    │  (streamText)   │    │  (LLM Provider)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    Streaming UI            SSE Stream              AI Models
```

---

## Configuração

### Cliente OpenRouter via Vercel AI SDK

```typescript
// src/lib/ai/config.ts
import { createOpenAI } from '@ai-sdk/openai'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      headers: {
        'X-Title': 'Máquina de Conteúdo',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    })
  : null  // Nullable para graceful degradation
```

### Modelos Disponíveis

**Modelos de Texto (12):**
```typescript
export const AVAILABLE_TEXT_MODELS = [
  // OpenAI
  'openai/gpt-5-mini',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  // Anthropic
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-haiku-4.5',
  // Google
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',
  // xAI
  'x-ai/grok-4.1-fast',
  'x-ai/grok-4',
] as const
```

**Modelos de Imagem (4):**
```typescript
export const AVAILABLE_IMAGE_MODELS = [
  'google/gemini-3-pro-image-preview',
  'openai/gpt-5-image',
  'bytedance-seed/seedream-4.5',
  'black-forest-labs/flux.2-max',
] as const
```

---

## API Route - Streaming

### Endpoint `/api/chat`

```typescript
import { streamText } from 'ai'
import { openrouter } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  // Verificar configuração
  if (!openrouter) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }

  const { messages, model, temperature = 0.7 } = await request.json()

  const result = streamText({
    model: openrouter(model),
    messages,
    temperature,
  })

  // Opcional: adicionar headers customizados para RAG
  return result.toTextStreamResponse({
    headers: ragUsed ? {
      "X-RAG-Used": "true",
      "X-RAG-Chunks": chunksIncluded.toString(),
    } : undefined,
  })
}
```

---

## Client Component - useChat Hook

### API Correta do `useChat`

```typescript
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

export function AiChatSdk({ onComplete }: AiChatSdkProps) {
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    clearError,
  } = useChat({
    onFinish: ({ message }) => {
      const text = getMessageText(message)
      onComplete?.(text)
    },
  })

  const isLoading = status === "streaming"
  // ...
}
```

### Propriedades Retornadas

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `messages` | `UIMessage[]` | Array de mensagens |
| `status` | `"ready" \| "streaming" \| "error"` | Status atual |
| `error` | `Error \| null` | Erro se status === "error" |
| `sendMessage(message)` | `function` | Enviar mensagem |
| `stop()` | `function` | Parar streaming |
| `clearError()` | `function` | Limpar erro |

### Tipo `UIMessage`

```typescript
interface UIMessage {
  id: string
  role: "user" | "assistant" | "system"
  parts: Array<
    | { type: "text"; text: string }
    | { type: "tool-use"; id: string; name: string; args: unknown }
    | { type: "tool-result"; toolUseId: string; result: unknown }
  >
}
```

### Helper para Extrair Texto

```typescript
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}
```

### Formato `sendMessage` - IMPORTANTE

**ATENÇÃO:** `sendMessage` requer o formato `{ parts: [...] }`:

```typescript
// ✅ CORRETO - Formato SDK v3
sendMessage(
  { parts: [{ type: "text", text: messageToSend }] },
  {
    body: {
      agent: currentAgent,
      model: selectedModel,
      categories: ragCategories,
      useRag: useRagByDefault,
    },
  }
)

// ❌ ERRADO - Não funciona
sendMessage({ text: messageToSend })  // TypeError
sendMessage({ content: messageToSend })  // TypeError
```

### Memoização para Performance (EVITA INFINITE LOOPS)

**Sempre memoizar valores derivados de `messages`:**

```typescript
// 1. Helper com useCallback (dependências vazias = função estável)
const getMessageText = useCallback((message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}, [])

// 2. Valor derivado com useMemo
const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])

// 3. ❌ NÃO fazer isso (causa infinite loop em useEffect)
// const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
// const lastResponseText = lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
```

**Por que memoização é importante:**
- Valores computados sem `useMemo` criam nova referência a cada render
- Se usado em `useEffect` dependencies, causa infinite loop
- `useCallback` é necessário para funções usadas em `useMemo`

---

## Erros Comuns

### 1. Usar propriedades que não existem

```typescript
// ❌ ERRADO - estas propriedades não existem
const { input, handleInputChange, handleSubmit, isLoading } = useChat()

// ✅ CORRETO
const { messages, status, sendMessage, stop } = useChat()
const isLoading = status === "streaming"
```

### 2. Tipo incorreto de mensagem

```typescript
// ❌ ERRADO - CoreMessage não existe
import type { CoreMessage } from "ai"

// ✅ CORRETO
import type { UIMessage } from "ai"
```

### 3. Build failure com env var faltando

```typescript
// ❌ ERRADO - lança erro durante import
export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY || (() => {
    throw new Error('OPENROUTER_API_KEY is required')
  })(),
})

// ✅ CORRETO - nullable
export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({ apiKey: OPENROUTER_API_KEY, ... })
  : null
```

---

## Environment Variables

### Obrigatórias

```env
OPENROUTER_API_KEY=sk-or-v1-...     # LLMs via Vercel AI SDK
VOYAGE_API_KEY=voyage-...            # Embeddings para RAG
```

### Opcionais

```env
FIRECRAWL_API_KEY=fc-...             # Web scraping
TAVILY_API_KEY=tvly-...              # Busca web em tempo real
```

---

## System Status Monitoring

### Action `getSystemStatusAction`

```typescript
// src/app/(app)/settings/actions/system-status.ts
export async function getSystemStatusAction(): Promise<SystemStatusResult> {
  return {
    overallConfigured: !!openrouter && await isVoyageConfigured(),
    services: {
      openrouter: {
        name: "OpenRouter (LLMs)",
        configured: !!process.env.OPENROUTER_API_KEY,
        source: "env",
        required: true,
      },
      voyage: {
        name: "Voyage AI (Embeddings)",
        configured: await isVoyageConfigured(),
        source: isVoyageUsingEnvVar() ? "env" : "database",
        required: true,
      },
      // ...
    },
  }
}
```

---

## RAG Integration

### Context Assembly

```typescript
// src/lib/rag/assembler.ts (server-only!)
export async function assembleRagContext(
  query: string,
  options: RagContextOptions
): Promise<string> {
  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query)

  // 2. Buscar chunks relevantes
  const chunks = await semanticSearch(queryEmbedding, options)

  // 3. Montar contexto
  return chunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n")
}
```

### Chat com RAG

```typescript
// src/app/api/chat/route.ts
const ragContext = ragEnabled
  ? await assembleRagContext(userMessage, { categories, limit: 5 })
  : undefined

const messages: CoreMessage[] = [
  { role: "system", content: systemPrompt },
  ...(ragContext
    ? [{ role: "system", content: `Context:\n${ragContext}` }]
    : []
  ),
  ...conversationHistory,
  { role: "user", content: userMessage },
]
```

---

## Importante: Client-Safe Code

### Padrão de Separação

```typescript
// lib/rag/index.ts - Apenas tipos/constantes (safe for client)
export type { RagCategory, RagContextOptions } from "./types"
export { RAG_CATEGORIES } from "./types"
// assembleRagContext NÃO exportado aqui

// API routes importam diretamente
import { assembleRagContext } from "@/lib/rag/assembler"
```

**Regra:** Client Components só podem importar código que não dependa de `process.env` ou imports de banco.

---

## Referências

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [useChat Reference](https://sdk.vercel.ai/docs/reference/ai-sdk-react/use-chat)
- [streamText Reference](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text)
- Erros documentados em `.context/docs/known-and-corrected-errors/007-vercel-ai-sdk-migration.md`
- Insights em `.context/docs/insights/010-vercel-ai-sdk-migration.md`
