# TypeError - sendMessage Format Error (Vercel AI SDK v3)

**Erro:** `TypeError: Cannot read properties of undefined (reading 'state')`
**Data:** 2026-01-17
**Status:** ✅ Resolvido

---

## Sintoma

Erro no console ao enviar mensagem no chat:

```bash
TypeError: Cannot read properties of undefined (reading 'state')
    at Chat.makeRequest (chat.ts:688:41)
    at async AbstractChat.sendMessage (chat.ts:373:5)
```

O streaming funciona parcialmente mas o estado interno do SDK falha.

---

## Causa Raiz

Usar formato de mensagem incorreto no `sendMessage` do Vercel AI SDK v3:

```typescript
// ❌ ERRADO - formato { text } não é suportado pelo SDK v3
sendMessage(
  { text: messageToSend },
  {
    body: {
      agent: agentToSend,
      model: selectedModel,
      categories: ragCategories,
      useRag: useRagByDefault,
    },
  }
)
```

O Vercel AI SDK v3 espera mensagens no formato `UIMessage` com array `parts`:

```typescript
interface UIMessage {
  role: "user" | "assistant" | "system"
  parts: Array<{
    type: string
    text?: string
    // ... outros tipos
  }>
}
```

---

## Solução

Usar o formato `parts` array ao enviar mensagens:

```typescript
// ✅ CORRETO - formato { parts: [{ type: "text", text }] }
sendMessage(
  { parts: [{ type: "text", text: messageToSend }] },
  {
    body: {
      agent: agentToSend,
      model: selectedModel,
      categories: ragCategories,
      useRag: useRagByDefault,
    },
  }
)
```

---

## Diferença Entre Formatos

| Formato | Válido | Uso |
|---------|--------|-----|
| `{ text: string }` | ❌ | Formato legado, não suportado |
| `{ parts: [{ type: "text", text }] }` | ✅ | Formato correto SDK v3 |
| `{ content: string }` | ❌ | Formato OpenAI padrão |

---

## Por Que o `parts` Array?

A estrutura `parts` permite:
1. **Multi-modalidade** - Texto, imagens, tool calls na mesma mensagem
2. **Extensibilidade** - Novos tipos podem ser adicionados sem breaking change
3. **Compatibilidade com tool calls** - Estrutura unificada para todos os content types

---

## Arquivos Afetados

- `src/components/dashboard/animated-ai-chat.tsx` - Linhas 341-353

**Antes:**
```typescript
sendMessage(
  { text: messageToSend },  // ❌ Errado
  {
    body: {
      agent: agentToSend,
      model: selectedModel,
      categories: ragCategories,
      useRag: useRagByDefault,
    },
  }
)
```

**Depois:**
```typescript
sendMessage(
  { parts: [{ type: "text", text: messageToSend }] },  // ✅ Correto
  {
    body: {
      agent: agentToSend,
      model: selectedModel,
      categories: ragCategories,
      useRag: useRagByDefault,
    },
  }
)
```

---

## Helper Function para Extrair Texto

Para extrair texto de mensagens recebidas:

```typescript
function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}

// Uso
const { messages } = useChat()
const lastMessage = messages[messages.length - 1]
const text = getMessageText(lastMessage)
```

---

## Referências

- Vercel AI SDK Documentation: https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
- `.context/docs/known-and-corrected-errors/024-ai-sdk-streaming-json-parse.md` - Related migration error
- `.context/docs/insights/010-vercel-ai-sdk-migration.md` - General migration insights

---

## Notas Adicionais

1. **TypeScript pode não detectar o erro** - O tipo `{ text: string }` pode ser aceito mas falhar em runtime.

2. **Body options continuam funcionando** - O segundo parâmetro com `body` é para campos customizados da requisição HTTP (não faz parte da mensagem).

3. **Consistência com servidor** - O servidor deve usar `convertToModelMessages()` para converter de `UIMessage` para o formato do modelo.
