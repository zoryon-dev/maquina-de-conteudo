# JSON Parsing Error - Vercel AI SDK v3 Chat Streaming

**Data:** 2026-01-17
**Erro:** JSON parsing error no chat com streaming

---

## Sintoma

```bash
⨯ SyntaxError: Unexpected token 'O', "Oi! Para e"... is not valid JSON
    at JSON.parse (<anonymous>)
```

Ocorre ao enviar uma mensagem no chat. A resposta da IA começa com texto em português ("Oi! Para e...") mas o código tenta fazer parse como JSON.

---

## Causa Raiz

O componente `ai-chat-sdk.tsx` tinha uma implementação customizada de streaming que não era compatível com o formato do Vercel AI SDK v3.

O código esperava um formato de SSE (Server-Sent Events) específico:
```typescript
for (const line of lines) {
  if (line.startsWith("data: ")) {
    const data = line.slice(6).trim()
    const parsed = JSON.parse(data) // ❌ Falhava aqui
  }
}
```

Mas o `toTextStreamResponse()` do SDK v3 retorna um formato diferente.

---

## Solução

Usar o hook oficial `useChat` do pacote `@ai-sdk/react` que já gerencia o streaming automaticamente.

**Antes (implementação customizada):**
```typescript
// ❌ Implementação manual com parse customizado
const response = await fetch(apiEndpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: content }),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value, { stream: true })
  // Parse manual do stream...
}
```

**Depois (hook oficial):**
```typescript
// ✅ Usar hook useChat do SDK
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, status, error, sendMessage, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: {
      agent: currentAgent,
      zepThreadId,
    },
  }),
})

const handleSend = () => {
  sendMessage(
    { text: content },
    {
      body: {
        agent: currentAgent,
        zepThreadId,
      },
    }
  )
}
```

---

## Mudanças na API Route

A API route `/api/chat/route.ts` também precisou ser atualizada para aceitar o novo formato do SDK v3:

```typescript
// Aceitar tanto o formato novo quanto o legado
interface ChatRequestBody {
  messages?: ChatMessage[]  // Formato SDK v3
  message?: string          // Formato legado
  agent?: AgentType
  zepThreadId?: string | null
}

// Extrair mensagem do usuário
if (sdkMessages && sdkMessages.length > 0) {
  const lastMessage = sdkMessages[sdkMessages.length - 1]
  if (lastMessage.parts) {
    userMessage = lastMessage.parts
      .filter((p: MessagePart) => p.type === "text" && p.text)
      .map((p: MessagePart) => p.text)
      .join("")
  }
} else if (legacyMessage) {
  userMessage = legacyMessage
}
```

---

## Arquivos Modificados

- `src/components/chat/ai-chat-sdk.tsx` - Reescrito para usar `useChat`
- `src/app/api/chat/route.ts` - Atualizado para aceitar formato SDK v3

---

## Referências

- Vercel AI SDK Documentation: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
- useChat Hook: `/vercel/ai` library via Context7

---

## Notas Importantes

1. **Tipo UIMessage**: As mensagens do SDK v3 têm estrutura diferente:
   ```typescript
   interface UIMessage {
     id: string
     role: "user" | "assistant" | "system"
     parts: Array<{ type: string; text?: string }>
   }
   ```

2. **DefaultChatTransport**: Usado para configurar endpoint e campos customizados:
   ```typescript
   new DefaultChatTransport({
     api: "/api/chat",
     body: {
       agent: "zory",
       zepThreadId: "abc-123",
     },
   })
   ```

3. **Mensagens iniciais**: Ao passar mensagens iniciais, incluir `id` único:
   ```typescript
   initialMessages.map((msg) => ({
     id: crypto.randomUUID(),
     role: msg.role,
     parts: [{ type: "text", text: msg.content }],
   }))
   ```
