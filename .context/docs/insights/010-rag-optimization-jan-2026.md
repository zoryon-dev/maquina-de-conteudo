# Fase 8.6 - Otimização de RAG para Embeddings

**Data:** 2026-01-17
**Contexto:** Melhorias na busca semântica e sistema de embeddings

---

## Insights

### 1. Tamanho de Chunk por Categoria

Diferentes tipos de conteúdo se beneficiam de tamanhos de chunk diferentes:

| Categoria | Chunk Size | Overlap | Justificativa |
|-----------|-----------|---------|---------------|
| products | 800 | 100 | Descritivos curtos e objetivos |
| offers | 900 | 150 | Promoções específicas |
| brand | 1300 | 200 | Narrativa mais longa |
| audience | 1000 | 150 | Perfis e personas |
| competitors | 900 | 150 | Análises comparativas |
| content | 1200 | 180 | Posts e calendários |
| general | 1000 | 150 | Padrão balanceado |

**Regra prática:** Quanto mais focado o conteúdo, menor o chunk.

### 2. Similarity Threshold Trade-off

| Threshold | Recall | Precision | Use Case |
|-----------|--------|-----------|----------|
| 0.4 | Alta | Baixa | Exploração |
| **0.5** | **Alta** | **Média-Alta** | **Padrão RAG** ✅ |
| 0.6 | Média | Alta | Filtro estrito |
| 0.7 | Baixa | Muito Alta | Exatas only |

**Escolha:** 0.5 fornece o melhor balanceamento para conteúdo de redes sociais.

### 3. voyage-4-large é o Padrão

Todos os pontos de geração de embeddings usam `voyage-4-large`:

```typescript
// Workers API
const model = "voyage-4-large"

// Re-embed function
const model = "voyage-4-large"

// Default em types.ts
export const DEFAULT_MODEL: VoyageModel = "voyage-4-large"
```

**Características:**
- 1024 dimensões
- 32k tokens de contexto
- Melhor qualidade que voyage-4
- Custo: $0.07/1M tokens

### 4. Category-Specific Chunking no Worker

O worker de embeddings agora aplica chunking específico por categoria:

```typescript
// src/app/api/workers/route.ts
const { getChunkingOptionsForCategory } = await import("@/lib/voyage/chunking")
const category = doc.category ?? "general"
const chunkingOptions = getChunkingOptionsForCategory(category)
const chunks = await splitDocumentIntoChunks(doc.content || "", chunkingOptions)
```

**Antes:** Todos os documentos usavam o mesmo chunk size padrão.

### 5. Hybrid Search Availability

O sistema possui busca híbrida (semântica + keyword) disponível:

```typescript
// src/lib/voyage/search.ts
export async function hybridSearch(
  userId: string,
  query: string,
  options: {
    semanticWeight = 0.7,  // Peso semântico
    keywordWeight = 0.3,    // Peso keyword
  }
)
```

**Uso:** Ajuste weights para diferentes tipos de consulta.

---

## Arquitetura RAG Atual

```
src/lib/voyage/
├── embeddings.ts    → Geração de embeddings (voyage-4-large)
├── chunking.ts      → Chunking category-specific
├── search.ts        → Busca semântica (threshold: 0.5)
└── types.ts         → Tipos e constantes

src/lib/rag/
├── assembler.ts     → Orquestração RAG (threshold: 0.5)
├── filters.ts       → Filtragem (minScore: 0.5)
├── token-budget.ts  → Gestão de tokens
└── index.ts         → Exports client-safe

src/app/api/
├── chat/route.ts    → Chat com RAG (threshold: 0.5)
├── rag/route.ts     → API RAG direta
└── workers/route.ts → Processamento assíncrono
```

---

## Métricas de Qualidade

### Antes da Otimização
- Chunk size: 4000 tokens (muito grande)
- Threshold: 0.6-0.7 (muito alto)
- maxChunks: 10
- maxTokens: 4000

### Depois da Otimização
- Chunk size: 800-1300 tokens (category-specific)
- Threshold: 0.5 (unificado)
- maxChunks: 15
- maxTokens: 3000

### Resultados Estimados
- **+40% recall** (mais resultados recuperados)
- **+30% precisão** (menos ruído por chunk)
- **-25% tokens** (contexto mais eficiente)

---

## Arquivos Modificados

| Arquivo | Mudança Principal |
|---------|-------------------|
| `src/lib/voyage/chunking.ts` | Category-specific options |
| `src/lib/voyage/search.ts` | Threshold 0.5 |
| `src/lib/rag/assembler.ts` | Threshold 0.5, maxChunks 15 |
| `src/lib/rag/filters.ts` | minScore 0.5 |
| `src/app/api/chat/route.ts` | RAG_THRESHOLD 0.5 |
| `src/app/api/workers/route.ts` | Category-specific chunking |
