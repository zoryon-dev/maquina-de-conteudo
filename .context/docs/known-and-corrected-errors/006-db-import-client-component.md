# DATABASE_URL no Browser - Import de Banco em Client Component

**Data:** 2026-01-16
**Fase:** Fase 8 - Document Collections & RAG
**Erro:** Runtime Error `DATABASE_URL environment variable is not set`

---

## Sintoma

```typescript
Runtime Error: DATABASE_URL environment variable is not set
    at module evaluation (src/db/index.ts:5:9)
```

O erro ocorre no **browser**, não no servidor. O stack trace mostra:

```
rag-context-selector.tsx (client)
  → lib/rag/index.ts
  → lib/rag/assembler.ts
  → db/index.ts
  → process.env.DATABASE_URL ❌
```

---

## Causa Raiz

**Regra violada:** Código que acessa banco de dados NUNCA deve ser importado por Client Components.

No Next.js, quando um Client Component importa um módulo, todo o código desse módulo é enviado ao browser - incluindo código server-side como `process.env.DATABASE_URL`.

```typescript
// ❌ ERRADO - assembler.ts importa db
import { db } from "@/db"

// ❌ ERRADO - index.ts re-exporta assembler
export { assembleRagContext } from "./assembler"

// ❌ ERRADO - Client Component importa index
"use client"
import { RAG_CATEGORIES } from "@/lib/rag"  // Traz db junto!
```

---

## Solução

**Separar exports do módulo RAG:**

1. **`lib/rag/index.ts`** - Apenas tipos e constantes (safe for client)
2. **`lib/rag/assembler.ts`** - Funções com banco (server only)
3. **`lib/rag/types.ts`** - Tipos apenas (safe everywhere)

```typescript
// ✅ CORRETO - lib/rag/index.ts (client-safe)
export type { RagCategory, RagContextOptions } from "./types"
export { RAG_CATEGORIES } from "./types"
// NOTA: assembleRagContext NÃO é re-exportado aqui

// ✅ CORRETO - API routes importam diretamente
import { assembleRagContext } from "@/lib/rag/assembler"

// ✅ CORRETO - Client Component
"use client"
import { RAG_CATEGORIES, type RagCategory } from "@/lib/rag"
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/rag/index.ts` | Removido re-export de funções do assembler |
| `src/app/api/rag/route.ts` | Import de `@/lib/rag/assembler` |
| `src/app/api/chat/route.ts` | Import de `@/lib/rag/assembler` |

---

## Padrão Correto

```
┌─────────────────────────────────────────────────────────┐
│ Client Component ("use client")                         │
│   ↓                                                      │
│ lib/rag/index.ts (tipos + constantes apenas)            │
│   ↓                                                      │
│ ✅ SAFE - Código roda apenas no browser                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Server Component / API Route / Server Action            │
│   ↓                                                      │
│ lib/rag/assembler.ts (funções com db)                  │
│   ↓                                                      │
│ db/index.ts (process.env.DATABASE_URL)                  │
│   ↓                                                      │
│ ✅ SAFE - Código roda apenas no servidor                │
└─────────────────────────────────────────────────────────┘
```

---

## Referências

- Next.js App Router: Client vs Server Components
- Erro relacionado: `004-infinite-loop-hooks.md` (hooks com deps de objeto)
- Documentação RAG: `.context/docs/insights/008-collections-rag-patterns.md`
