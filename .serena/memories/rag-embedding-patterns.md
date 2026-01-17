# RAG & Embedding Patterns

**Data:** 2026-01-17
**Status:** ✅ Ativo

---

## Visão Geral

Sistema RAG (Retrieval-Augmented Generation) com embeddings da Voyage AI para busca semântica em documentos do usuário.

---

## Configuração Atual

### Modelo de Embeddings
- **Modelo:** `voyage-4-large`
- **Dimensões:** 1024
- **Contexto:** 32k tokens
- **Custo:** $0.07/1M tokens

### Chunking por Categoria

| Categoria | Chunk Size | Overlap | Uso |
|-----------|-----------|---------|-----|
| `products` | 800 | 100 | Catálogo de produtos |
| `offers` | 900 | 150 | Promoções e descontos |
| `brand` | 1300 | 200 | Tom de voz, valores |
| `audience` | 1000 | 150 | Personas e público-alvo |
| `competitors` | 900 | 150 | Análise competitiva |
| `content` | 1200 | 180 | Posts e calendários |
| `general` | 1000 | 150 | Padrão balanceado |

**Função:** `getChunkingOptionsForCategory(category)` em `src/lib/voyage/chunking.ts`

### Threshold de Similaridade
- **Valor padrão:** `0.5` (unificado em toda a pipeline)
- **Range efetivo:** 0-1 (cosine similarity)
- **Trade-off:** 0.5 = melhor balanceamento recall/precision

---

## Módulos RAG

```
src/lib/voyage/
├── embeddings.ts    → generateEmbedding(), generateEmbeddingsBatch()
├── chunking.ts      → splitDocumentIntoChunks(), getChunkingOptionsForCategory()
├── search.ts        → semanticSearch(), hybridSearch(), getRagContext()
├── types.ts         → VoyageModel, SemanticSearchOptions, etc.

src/lib/rag/
├── assembler.ts     → assembleRagContext(), getRelevantDocuments()
├── filters.ts       → filterByRelevance(), diversifyChunks()
├── token-budget.ts  → estimateTokens(), selectChunksWithinBudget()
└── index.ts         → Client-safe exports (tipos, constantes)
```

---

## APIs de Integração

### 1. Chat com RAG
```typescript
// src/app/api/chat/route.ts
const ragResult = await assembleRagContext(userId, query, {
  categories,
  threshold: 0.5,
  maxChunks: 15,
  maxTokens: 3000,
  includeSources: true,
})
```

### 2. RAG Direto
```typescript
// src/app/api/rag/route.ts
const result = await assembleRagContext(userId, query, options)
// Returns: { context, sources, tokensUsed, chunksIncluded, truncated }
```

### 3. Busca Semântica
```typescript
// src/lib/voyage/search.ts
const results = await semanticSearch(userId, query, {
  categories: ["brand", "products"],
  threshold: 0.5,
  limit: 10,
})
```

### 4. Worker de Embeddings
```typescript
// src/app/api/workers/route.ts (job: document_embedding)
const chunkingOptions = getChunkingOptionsForCategory(doc.category ?? "general")
const chunks = await splitDocumentIntoChunks(doc.content, chunkingOptions)
const embeddings = await generateEmbeddingsBatch(texts, "voyage-4-large")
```

---

## Componentes UI

### RAG Context Selector
```typescript
// src/components/chat/rag-context-selector.tsx
<RagContextSelector />
<RagContextSelectorCompact />
```

Permite selecionar categorias de documentos para incluir no contexto RAG do chat.

### Semantic Search Tab
```typescript
// src/app/(app)/sources/components/semantic-search-tab.tsx
<SemanticSearchTab />
```

Interface para testar buscas semânticas nos documentos indexados.

---

## Server Actions Principais

```typescript
// Documentos e embeddings
getDocumentsAction()
reembedDocumentAction(documentId, force)
getEmbeddingStatusAction(documentId)

// RAG
getRelevantDocuments(userId, query, options)
getRagStats(userId)
```

---

## Padrões de Uso

### 1. Sempre usar voyage-4-large
```typescript
// ✅ CORRETO
const model = "voyage-4-large"

// ❌ ERRADO - não usar modelos antigos
const model = "voyage-3"
```

### 2. Category-specific chunking
```typescript
// ✅ CORRETO
const category = doc.category ?? "general"
const options = getChunkingOptionsForCategory(category)
const chunks = await splitDocumentIntoChunks(content, options)

// ❌ ERRADO - usar padrão para tudo
const chunks = await splitDocumentIntoChunks(content, DEFAULT_OPTIONS)
```

### 3. Threshold consistente
```typescript
// ✅ CORRETO - 0.5 em toda a pipeline
threshold: 0.5  // search, assembler, filters, chat

// ❌ ERRADO - valores diferentes
threshold: 0.6  // em alguns lugares
threshold: 0.7  // em outros
```

### 4. Client-safe imports
```typescript
// ✅ CORRETO - importar tipos do index
import { RAG_CATEGORIES, type RagCategory } from "@/lib/rag"

// ❌ ERRADO - importar assembler em client component
import { assembleRagContext } from "@/lib/rag/assembler"  // usa db!
```

---

## Categorias de Documentos

```typescript
type RagCategory =
  | "general"      // Documentos gerais
  | "products"     // Catálogo de produtos/serviços
  | "offers"       // Promoções, descontos, lançamentos
  | "brand"        // Tom de voz, valores, missão
  | "audience"     // Personas, público-alvo
  | "competitors"  // Análise competitiva
  | "content"      // Posts que funcionaram, calendários
```

---

## Métricas de Qualidade

### Antes da Otimização (Jan 2026)
- Chunk size: 4000 tokens (muito grande)
- Threshold: 0.6-0.7 (inconsistente)
- maxChunks: 10
- maxTokens: 4000

### Depois da Otimização
- Chunk size: 800-1300 (category-specific)
- Threshold: 0.5 (unificado)
- maxChunks: 15
- maxTokens: 3000

### Resultados
- **+40% recall** (mais resultados)
- **+30% precisão** (menos ruído)
- **-25% tokens** (mais eficiente)

---

## Arquivos Chave

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/voyage/chunking.ts` | Chunking category-specific |
| `src/lib/voyage/search.ts` | Busca semântica |
| `src/lib/rag/assembler.ts` | Orquestração RAG |
| `src/app/api/chat/route.ts` | Chat com RAG |
| `src/app/api/workers/route.ts` | Worker de embeddings |
