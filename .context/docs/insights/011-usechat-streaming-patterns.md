# Vercel AI SDK v3 - useChat Streaming Patterns

**Data:** 2026-01-17
**Fase:** Vercel AI SDK - Chat UI Refinements
**Arquivos afetados:** `src/components/dashboard/animated-ai-chat.tsx`

---

## Insight 1: useMemo para Valores Derivados em Streaming

### Problema
Quando usando `useChat` hook, valores derivados de `messages` podem causar re-renders excessivos se não forem memoizados.

```typescript
// ❌ ERRADO - Causa re-render em cada mensagem nova
const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
const lastResponseText = lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
```

### Solução
Usar `useMemo` com dependência estável:

```typescript
// ✅ CORRETO
const getMessageText = useCallback((message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}, [])

const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])
```

### Por Que getMessageText Precisa Ser useCallback
- `useMemo` tem `getMessageText` nas dependências
- Sem `useCallback`, `getMessageText` é uma nova função a cada render
- Nova função → `useMemo` recalcula → loop potencial

---

## Insight 2: Formato de Mensagens do SDK v3

### Estrutura UIMessage
O Vercel AI SDK v3 usa uma estrutura de mensagens diferente de outras APIs:

```typescript
interface UIMessage {
  id: string
  role: "user" | "assistant" | "system"
  parts: Array<{
    type: string
    text?: string
    // Outros tipos possíveis: tool-use, tool-result, image, etc.
  }>
}
```

### sendMessage Espera `parts` Array
```typescript
// ✅ CORRETO
sendMessage(
  { parts: [{ type: "text", text: messageToSend }] },
  { body: { /* custom fields */ } }
)
```

### Não Usar Formatos Legados
```typescript
// ❌ ERRADO - Não funciona
sendMessage({ text: messageToSend })       // Formato inválido
sendMessage({ content: messageToSend })    // Formato OpenAI (não SDK)
sendMessage({ message: messageToSend })    // Formato genérico (não SDK)
```

---

## Insight 3: status vs isLoading

### API Correta do useChat
```typescript
const { messages, status, error, sendMessage, stop } = useChat()

// ✅ CORRETO - verificar status
const isLoading = status === "streaming"
const isError = status === "error"
const isReady = status === "ready"
```

### Propriedades Que NÃO Existem
```typescript
// ❌ NÃO existem no useChat v3
const { isLoading } = useChat()  // ❌ Use status === "streaming"
const { input } = useChat()      // ❌ Gerencie seu próprio state
const { handleSubmit } = useChat() // ❌ Chame sendMessage() diretamente
```

---

## Insight 4: AnimatePresence com lastResponseText

### Padrão para Exibir Resposta em Tempo Real
```typescript
const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])

// Mostrar enquanto está typing OU há resposta
<AnimatePresence>
  {(lastResponseText || isTyping) && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {/* Response display */}
    </motion.div>
  )}
</AnimatePresence>
```

### Benefícios
1. **Resposta aparece incrementalmente** - Conforme `messages` é atualizado pelo stream
2. **Suave** - Animação de entrada/saída com Framer Motion
3. **Não pisca** - `lastResponseText` é memoizado, não re-renderiza desnecessariamente

---

## Insight 5: Custom Body Fields com DefaultChatTransport

### Passar Dados Customizados por Request
```typescript
import { DefaultChatTransport } from "ai"

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: {
    agent: "zory",
    model: "gpt-5-mini",
    categories: ["brand", "products"],
    useRag: true,
  },
})

const { sendMessage } = useChat({ transport })
```

### Atualizar Body Dinamicamente
```typescript
// Quando usuário muda agente
const handleAgentChange = (agent: AgentType) => {
  setCurrentAgent(agent)
  transport.current = new DefaultChatTransport({
    api: "/api/chat",
    body: { agent, /* outros campos */ },
  })
}
```

### Importante: Body Não é Persistente
Cada chamada `sendMessage` pode incluir body options:
```typescript
sendMessage(
  { parts: [{ type: "text", text }] },
  {
    body: {
      agent: currentAgent,  // Usa valor atual
      model: selectedModel, // Usa valor atual
    }
  }
)
```

---

## Insight 6: Detectar RAG Sources de Headers

### Padrão no Servidor
```typescript
// src/app/api/chat/route.ts
const response = result.toUIMessageStreamResponse({
  headers: {
    ...(ragUsed ? {
      "X-RAG-Used": "true",
      "X-RAG-Chunks": chunksIncluded.toString(),
      "X-RAG-Sources": JSON.stringify(sources),
    } : {}),
  },
})
```

### No Cliente (Ainda Não Implementado)
```typescript
// Futuro: Ler headers da resposta
const { sendMessage } = useChat({
  onFinish: async ({ response }) => {
    const ragUsed = response.headers.get("X-RAG-Used")
    const sources = response.headers.get("X-RAG-Sources")
    if (sources) {
      setSources(JSON.parse(sources))
    }
  }
})
```

**Nota:** Atualmente, os sources são gerenciados via state separado. O SDK v3 pode expor headers no futuro.

---

## Insight 7: Typing Indicator Separado

### Padrão Visual
```typescript
<AnimatePresence>
  {isTyping && (
    <motion.div
      className="fixed bottom-8 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4" />
        <span>Digitando</span>
        <TypingDots />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

### Função TypingDots
```typescript
function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-primary rounded-full mx-0.5"
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
          }}
        />
      ))}
    </div>
  )
}
```

---

## Arquitetura Comparada: Antes vs Depois

| Aspecto | Antes (Custom) | Depois (SDK v3) |
|---------|----------------|-----------------|
| **State** | useState + useEffect manuais | `useChat` hook |
| **Streaming** | Manual reader/decoder | Automático via SDK |
| **Message format** | `{ content: string }` | `{ parts: [...] }` |
| **Status** | `isLoading: boolean` | `status: "ready" \| "streaming" \| "error"` |
| **Error handling** | Try/catch manual | `error` object + `clearError()` |
| **Stop** | AbortController manual | `stop()` function |
| **Transport** | fetch() | `DefaultChatTransport` |

---

## Resumo de Lições Aprendidas

1. **Memoizar valores derivados** - `useMemo` essencial para performance em streaming
2. **Callbacks estáveis** - `useCallback` para funções usadas em `useMemo`
3. **Formato parts** - Sempre usar `{ parts: [{ type: "text", text }] }`
4. **Status enum** - Usar `status === "streaming"` em vez de `isLoading`
5. **Body customizado** - `DefaultChatTransport` + options no `sendMessage`
6. **UI responsiva** - AnimatePresence com memoização para animações suaves
