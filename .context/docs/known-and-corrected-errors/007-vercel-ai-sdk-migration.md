# Vercel AI SDK Migration Errors

**Data:** 2026-01-16
**Fase:** Migration to Vercel AI SDK
**Arquivos afetados:** `src/components/chat/ai-chat-sdk.tsx`, `src/lib/ai/config.ts`

---

## Erro 1: API incorreta do hook `useChat`

### Descrição
Assumi incorretamente que o hook `useChat` do pacote `@ai-sdk/react` tinha as propriedades `input`, `handleInputChange`, `handleSubmit`, e `isLoading`, baseado em padrões de outras bibliotecas de chat.

### Código Errado
```typescript
const {
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
} = useChat()
```

### Código Correto
```typescript
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
```

### Solução
A API real do `useChat` do Vercel AI SDK é:
- `messages` - Array de mensagens
- `status` - Status string: `"ready" | "streaming" | "error"`
- `error` - Error object quando status é "error"
- `sendMessage(message)` - Função para enviar mensagem
- `stop()` - Parar streaming atual
- `clearError()` - Limpar estado de erro

### Referência
[Vercel AI SDK useChat docs](https://sdk.vercel.ai/docs/reference/ai-sdk-react/use-chat)

---

## Erro 2: Tipo `CoreMessage` não existe

### Descrição
Tentei importar `CoreMessage` do pacote `"ai"`, mas este tipo não é exportado.

### Erro
```
Module '"ai"' has no exported member 'CoreMessage'.
```

### Código Errado
```typescript
import type { CoreMessage } from "ai"

const { messages } = useChat({
  initialMessages: initialMessage ? [initialMessage as CoreMessage] : undefined,
})
```

### Código Correto
```typescript
import type { UIMessage } from "ai"

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}
```

### Solução
Use `UIMessage` em vez de `CoreMessage`. A estrutura de mensagem do Vercel AI SDK usa `parts` array:
```typescript
interface UIMessage {
  id: string
  role: "user" | "assistant" | "system"
  parts: Array<{ type: "text"; text: string } | { type: "tool-use" | "tool-result", ... }>
}
```

---

## Erro 3: Propriedade `initialMessages` não existe

### Descrição
Tentei passar `initialMessages` como opção para `useChat`, mas esta propriedade não existe na API.

### Erro
```
Object literal may only specify known properties, and 'initialMessages' does not exist in type...
```

### Código Errado
```typescript
const { messages } = useChat({
  initialMessages: initialMessage ? [initialMessage as UIMessage] : undefined,
})
```

### Código Correto
```typescript
const { messages } = useChat({
  onFinish: ({ message }) => {
    const text = getMessageText(message)
    onComplete?.(text)
  },
})
```

### Solução
Remova `initialMessages` das opções. Se precisar de mensagens iniciais, use o estado `messages` retornada pelo hook e manipule via UI.

---

## Erro 4: Variável `initialMessage` não utilizada

### Descrição
Após remover `initialMessages`, a variável `initialMessage` nas props ficou sem uso.

### Erro
```
'initialMessage' is declared but its value is never read.
```

### Código Errado
```typescript
interface AiChatSdkProps {
  initialMessage?: UIMessage
  // ...
}

export function AiChatSdk({ initialMessage, ... }: AiChatSdkProps) {
  // initialMessage não usado
}
```

### Código Correto
```typescript
interface AiChatSdkProps {
  onComplete?: (text: string) => void
  // ...
}

export function AiChatSdk({ onComplete, ... }: AiChatSdkProps) {
  // ...
}
```

### Solução
Remova `initialMessage` da interface de props e da desestruturação.

---

## Erro 5: Build failure - `openrouter` lançando erro durante import

### Descrição
Quando `OPENROUTER_API_KEY` não estava definida, o módulo `src/lib/ai/config.ts` lançava um erro durante a importação, causando falha no build.

### Erro
```
Error: OPENROUTER_API_KEY is required
    at src/lib/ai/config.ts:...
```

### Código Errado
```typescript
export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY || (() => {
    throw new Error('OPENROUTER_API_KEY is required')
  })(),
  headers: {
    'X-Title': OPENROUTER_APP_NAME,
    'HTTP-Referer': OPENROUTER_APP_URL,
  },
})
```

### Código Correto
```typescript
export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      headers: {
        'X-Title': OPENROUTER_APP_NAME,
        'HTTP-Referer': OPENROUTER_APP_URL,
      },
    })
  : null
```

### Solução
Faça o cliente `openrouter` nullable (`null` quando a env var não existe). Isso permite que o módulo seja importado sem erros, e você pode verificar se o serviço está configurado em runtime:

```typescript
if (!openrouter) {
  return new Response(
    JSON.stringify({ error: "AI service not configured" }),
    { status: 503 }
  )
}
```

---

## Erro 6: Turbopack + Clerk incompatibilidade (Pré-existente)

### Descrição
Erro do Turbopack com Clerk, não relacionado à migração mas apareceu durante o build.

### Erro
```
'server-only' cannot be imported from a Client Component module
```

### Status
Este é um problema conhecido de compatibilidade entre Turbopack e Clerk. A compilação TypeScript com `npx tsc --noEmit` passa sem erros.

### Solução Temporária
O erro é do Turbopack e não do código. Use `tsc --noEmit` para validação de tipos enquanto aguarda correção do Turbopack ou Clerk.

---

## Padrão Correto: Uso do `useChat` do Vercel AI SDK

### Componente Completo Correto

```typescript
"use client"

import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

interface AiChatSdkProps {
  onComplete?: (text: string) => void
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}

export function AiChatSdk({ onComplete }: AiChatSdkProps) {
  const [input, setInput] = useState("")

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

  const handleSend = () => {
    if (!input.trim() || isLoading) return

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    })

    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id}>
            {getMessageText(message)}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />

        {isLoading ? (
          <Button onClick={stop}>
            <Loader2 className="animate-spin" />
          </Button>
        ) : (
          <Button onClick={handleSend}>
            <Send />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500">
          {error.message}
          <Button onClick={clearError}>Dismiss</Button>
        </div>
      )}
    </div>
  )
}
```

---

## Lições Aprendidas

1. **Sempre consultar a documentação oficial** antes de assumir APIs de bibliotecas
2. **Tipos do Vercel AI SDK** usam estrutura `parts` array, não `content` string
3. **Clients nullable** são preferíveis para fallback graceful quando env vars faltam
4. **Validar com `tsc --noEmit`** é mais confiável que Turbopack para verificação de tipos
