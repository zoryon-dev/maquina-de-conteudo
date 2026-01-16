# Vercel AI SDK Migration Insights

**Data:** 2026-01-16
**Fase:** Migration to Vercel AI SDK
**Arquivos afetados:** Multiple

---

## Insight 1: Arquitetura de SDKs de IA

### Antes: Cliente Custom OpenRouter
A abordagem anterior implementava um cliente customizado para OpenRouter com fetch manual, stream processing, e gestão de erros ad-hoc.

```typescript
// Antes - código customizado
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ model, messages })
})

// Manual stream parsing
const reader = response.body.getReader()
// ... complex stream handling
```

### Depois: Vercel AI SDK Abstração
O SDK fornece abstrações de alto nível que eliminam código boilerplate:

```typescript
// Depois - SDK abstrato
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const result = streamText({
  model: openrouter(model),
  messages,
  temperature: 0.7,
})

return result.toTextStreamResponse()
```

**Benefício:** ~80% menos código para a mesma funcionalidade, com melhor error handling e type safety.

---

## Insight 2: Mensagens com `parts` Array

### Estrutura de Mensagens do Vercel AI SDK
Diferente de outras APIs que usam `content: string`, o Vercel AI SDK usa uma estrutura mais flexível com `parts` array:

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

### Implicações
1. **Multi-modalidade nativa**: A estrutura `parts` suporta texto, imagens, tool calls em uma única mensagem
2. **Extensibilidade**: Novos tipos de conteúdo podem ser adicionados sem breaking changes
3. **Extração de texto requer função helper**:

```typescript
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}
```

---

## Insight 3: Environment Variables vs Database Encryption

### Mudança de Arquitetura
Anteriormente, as API keys eram armazenadas encriptadas no banco de dados, com o usuário fornecendo as chaves via settings.

**Problemas dessa abordagem:**
- Complexidade de criptografia/descriptografia
- UI de gerenciamento de chaves
- Rotação de chaves complexa
- Latência adicional de DB

**Nova abordagem: System-controlled env vars**
```typescript
// Simples, direto, sem DB lookup
export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({ apiKey: OPENROUTER_API_KEY, ... })
  : null
```

**Trade-off:**
- ❌ Menos flexível (usuário não pode trocar keys)
- ✅ Muito mais simples
- ✅ Melhor performance (sem DB queries)
- ✅ Seguro (server-only, nunca exposto ao client)

**Decisão de design:** Para uma aplicação B2B onde a empresa controla os serviços, env vars são preferíveis.

---

## Insight 4: Clients Nullable para Build Graceful

### Padrão
Quando uma dependência externa (API key) pode não estar presente, fazer o cliente nullable ao invés de lançar erro:

```typescript
// ❌ Lança erro durante import - falha o build
export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY || (() => {
    throw new Error('OPENROUTER_API_KEY is required')
  })(),
  // ...
})

// ✅ Nullable - permite importação, verifica em runtime
export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({ /* ... */ })
  : null
```

### Benefícios
1. **Build não falha** quando env vars não estão setadas
2. **Permite desenvolvimento parcial** - outras features funcionam
3. **Runtime checks** são mais explícitos:

```typescript
if (!openrouter) {
  return new Response(
    JSON.stringify({ error: "AI service not configured" }),
    { status: 503 }
  )
}
```

---

## Insight 5: Server Actions para Status Monitoring

### Padrão Implementado
Criar uma action `getSystemStatusAction()` que verifica quais serviços estão configurados:

```typescript
export async function getSystemStatusAction(): Promise<SystemStatusResult> {
  const services: Record<string, ServiceStatus> = {
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
  }

  const overallConfigured = Object.values(services)
    .filter(s => s.required)
    .every(s => s.configured)

  return { overallConfigured, services }
}
```

### Benefícios
1. **Feedback visual imediato** ao usuário sobre o que está configurado
2. **Debugging mais fácil** - vê-se claramente qual serviço falta
3. **Transição suave** - mostra que Voyage ainda usa database (legacy)

---

## Insight 6: Model IDs como Source of Truth

### Padrão
Manter uma lista centralizada de modelos com IDs exatos do provider:

```typescript
// src/lib/ai/config.ts
export const AVAILABLE_TEXT_MODELS = [
  'openai/gpt-5-mini',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'anthropic/claude-sonnet-4.5',
  // ...
] as const

export const MODELS_INFO: Record<string, ModelInfo> = {
  'openai/gpt-5-mini': {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    type: 'text',
    contextLength: 128000,
  },
  // ...
}
```

### Benefícios
1. **Type safety via `as const`** - TypeScript conhece todos os valores possíveis
2. **Single source of truth** - mudança em um lugar reflete em toda app
3. **Metadados associados** - nome, provider, context length disponíveis

---

## Insight 7: Headers do OpenRouter

### Requisito do OpenRouter
OpenRouter requer headers específicos para ranking e analytics:

```typescript
headers: {
  'X-Title': OPENROUTER_APP_NAME,      // Nome da app
  'HTTP-Referer': OPENROUTER_APP_URL,  // URL da app
}
```

### Importância
- Permite que OpenRouter atribua tráfego corretamente
- Ajuda no debugging via dashboard do OpenRouter
- Requerido pelos termos de serviço

---

## Insight 8: Server-Sent Events (SSE) para Streaming

### Vercel AI SDK usa SSE nativamente
O `toTextStreamResponse()` retorna uma resposta Server-Sent Events que:

1. **Envia tokens conforme são gerados** - latência perceptível menor
2. **Compatível com `useChat` hook** - gerenciamento automático de estado
3. **Padrão padronizado** - não precisa de protocolo customizado

```typescript
// API route
const result = streamText({ model, messages })
return result.toTextStreamResponse()

// Client component
const { messages, status } = useChat()
// status === "streaming" enquanto tokens chegam
```

---

## Insight 9: Separação de Concerns em Módulos RAG

### Problema: Client Component importando código server-only
```typescript
// ❌ Client Component
import { assembleRagContext } from "@/lib/rag"  // Importa db!
```

### Solução: Barreira de imports
```typescript
// lib/rag/index.ts - Apenas tipos/constes (safe for client)
export type { RagCategory, RagContextOptions } from "./types"
export { RAG_CATEGORIES } from "./types"
// assembleRagContext NÃO exportado aqui

// API routes importam diretamente
import { assembleRagContext } from "@/lib/rag/assembler"
```

**Princípio:** Client Components só podem importar código que não dependa de `process.env` ou imports de banco.

---

## Insight 10: Voyage AI com Fallback

### Hybrid Approach durante transição
Voyage mantém dois métodos de configuração com prioridade:

```typescript
export async function getVoyageClient(): Promise<VoyageClientConfig> {
  // Priority 1: System-controlled environment variable
  const envApiKey = process.env.VOYAGE_API_KEY
  if (envApiKey && envApiKey.trim().length > 0) {
    return { apiKey: envApiKey, source: "env" }
  }

  // Priority 2: Legacy database lookup (backwards compatibility)
  const [keyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.provider, "voyage"))
    .limit(1)

  if (keyRecord) {
    const apiKey = decryptApiKey(keyRecord.encryptedKey, keyRecord.nonce)
    return { apiKey, source: "database" }
  }

  throw new Error("Voyage API key not configured")
}
```

**Benefício:** Permite migração gradual sem breaking changes para usuários existentes.

---

## Resumo de Mudanças Arquiteturais

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **LLM Client** | Fetch custom OpenRouter | Vercel AI SDK + createOpenAI |
| **Chat State** | useState + useEffect manuais | useChat hook do SDK |
| **Streaming** | Manual reader loop | streamText + toTextStreamResponse |
| **API Keys** | Criptografadas no DB | Environment variables |
| **Configuração** | UI de API keys | System status (read-only) |
| **Modelos** | Array simples | Const assertion + metadata |

---

## Lições para Próximas Migrações

1. **Sempre ler documentação oficial** antes de assumir APIs
2. **Preferir abstrações de SDK** sobre implementações customizadas
3. **Fazer clientes nullable** para graceful degradation
4. **Centralizar configurações** em um único módulo
5. **Separar client-safe code** de server-only code
6. **Manter fallbacks** durante transições de arquitetura
