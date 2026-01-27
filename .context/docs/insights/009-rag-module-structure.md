# Fase 8.5 - Estrutura de Módulos RAG

**Data:** 2026-01-16
**Contexto:** Correção de erro "DATABASE_URL no browser"

---

## Insights

### 1. Separação Server/Client em Módulos

Ao criar módulos que podem ser usados tanto em Server Components quanto Client Components, é crucial separar:

- **Exports server-safe:** Tipos, constantes, funções puras
- **Exports server-only:** Funções que acessam banco, filesystem, APIs externas

```typescript
// ✅ lib/rag/index.ts - Barreira de segurança
export type { RagCategory } from "./types"        // OK - tipo
export { RAG_CATEGORIES } from "./types"         // OK - constante
// NOTA: assembleRagContext NÃO exportado (usa db)
```

### 2. Stack Trace Revela a Cadeia de Import

O erro de `DATABASE_URL` no browser foi rastreado pelo stack trace:

```
rag-context-selector.tsx → lib/rag/index.ts → lib/rag/assembler.ts → db/index.ts
```

Esta é a principal ferramenta para diagnosticar imports server-side em client components.

### 3. Re-exports podem Ser Perigosos

Re-exportar tudo indiscriminadamente (`export * from "./assembler"`) pode expor código server-side acidentalmente.

```typescript
// ❌ PERIGOSO - Re-export sem verificar
export * from "./assembler"  // Inclui código com db!

// ✅ SEGURO - Re-export explícito
export { typeA, typeB } from "./types"  // Apenas o que é seguro
```

### 4. API Routes são Server-Side

API routes em Next.js App Router (`app/api/*/route.ts`) sempre rodam no servidor, então podem importar módulos com acesso a banco diretamente.

```typescript
// ✅ OK em API routes
import { assembleRagContext } from "@/lib/rag/assembler"
```

### 5. Type-Only Imports são Seguros

Imports de tipo (`import type { ... }`) são removidos pelo TypeScript e não chegam no bundle do browser.

```typescript
// ✅ SAFE - Type-only import
import type { RagCategory } from "@/lib/rag/types"

// ✅ SAFE - Type em re-export
export type { RagContextOptions } from "./types"
```

### 6. Verificação com `use client`

Componentes com `"use client"` devem ser auditados regularmente para garantir que não importam código server-side. Ferramentas como `linc` ou verificadores de bundle podem ajudar.

---

## Arquitetura Resultante

```
lib/rag/
├── index.ts      → Client-safe: tipos, constantes, funções puras
├── types.ts      → Tipos TypeScript apenas
├── assembler.ts  → Server-only: funções com db
├── filters.ts    → Pure functions: safe para client
└── token-budget.ts → Pure functions: safe para client
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/rag/index.ts` | Removido re-export de assembler |
| `src/app/api/rag/route.ts` | Import direto de assembler |
| `src/app/api/chat/route.ts` | Import direto de assembler |
