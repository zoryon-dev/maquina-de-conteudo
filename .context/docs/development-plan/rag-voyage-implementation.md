# Plano de Implementação: Sistema RAG com Voyage AI

**Branch:** `feat/database-embedding`
**Data:** 2026-01-16
**Modelo:** Voyage AI `voyage-4-large` (1024 dimensões, 32k context)

---

## Visão Geral

Implementação de sistema RAG (Retrieval Augmented Generation) completo para a Máquina de Conteúdo, permitindo:
- Upload de documentos → Conversão → Embeddings → Busca Semântica
- Integração com chat para contexto enriquecido
- Processamento assíncrono via fila existente

---

## Arquitetura Decisiva

### Modelo de Embedding
| Propriedade | Valor | Justificativa |
|-------------|-------|---------------|
| Modelo | `voyage-4-large` | 1024 dimensões, 32k context window |
| Chunk Size | ~4000 tokens | Balanceia contexto vs granularidade |
| Overlap | 200 tokens | Garante continuidade de contexto |
| Storage | JSON string no PostgreSQL | Simples, sem necessidade de pgvector |

### Estratégia de Chunking
- **Smart chunking**: Respeita limites de parágrafos, evita cortes no meio de frases
- **Splitting recursivo**: Para documentos >32k tokens
- **Category-aware**: Tamanhos diferentes por tipo de documento

### Fluxo de Dados

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Upload     │───▶│  Conversão  │───▶│  Embedding  │───▶│   Busca     │
│  (PDF/TXT)  │    │  (Chunking) │    │  (Voyage)   │    │  Semântica  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                      │                                    │
                      ▼                                    ▼
                 ┌─────────────┐                    ┌─────────────┐
                 │   Queue     │                    │  Chat RAG   │
                 │  (Upstash)  │                    │  Context    │
                 └─────────────┘                    └─────────────┘
```

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── voyage/                        # NOVO: Integração Voyage AI
│   │   ├── index.ts                   # Client & config
│   │   ├── types.ts                   # Tipos Voyage
│   │   ├── embeddings.ts              # Geração de embeddings
│   │   ├── chunking.ts                # Chunking de documentos
│   │   └── search.ts                  # Busca semântica
│   │
│   ├── rag/                           # NOVO: Utilitários RAG
│   │   ├── assembler.ts               # Montagem de contexto
│   │   ├── filters.ts                 # Filtros de relevância
│   │   └── token-budget.ts            # Contagem de tokens
│   │
│   └── queue/
│       └── types.ts                   # MODIFICAR: Adicionar job type
│
├── app/
│   ├── api/
│   │   ├── embeddings/                # NOVO: Endpoint manual
│   │   │   └── route.ts
│   │   ├── rag/                       # NOVO: Context endpoint
│   │   │   └── route.ts
│   │   └── workers/
│   │       └── route.ts               # MODIFICAR: Handler embedding
│   │
│   └── (app)/sources/
│       ├── actions/
│       │   └── sources-actions.ts     # MODIFICAR: Actions RAG
│       └── components/
│       ├── document-card.tsx          # MODIFICAR: Status embedding
│       └── semantic-search-tab.tsx    # MODIFICAR: Busca real
│
├── components/
│   ├── chat/
│   │   └── rag-context-selector.tsx   # NOVO: Seletor categorias
│   └── embeddings/
│       ├── embedding-status.tsx       # NOVO: Badge de status
│       └── chunk-viewer.tsx           # NOVO: Visualizador de chunks
│
└── db/
    └── schema.ts                      # MODIFICAR: Campos progresso
```

---

## Migrations Necessárias

### Migration 1: Job Type para Embeddings
```sql
-- Adicionar tipo de job para embeddings
ALTER TYPE job_type ADD VALUE 'document_embedding';
```

### Migration 2: Progress Tracking
```sql
-- Tracking de progresso de embedding
ALTER TABLE documents
  ADD COLUMN embedding_progress INTEGER DEFAULT 0,
  ADD COLUMN total_chunks INTEGER DEFAULT 0,
  ADD COLUMN last_embedded_at TIMESTAMP;

-- Índice para queries filtradas
CREATE INDEX documents_embedded_category_idx
  ON documents(userId, category, embedded);
```

### Migration 3: Metadata de Chunks
```sql
-- Melhorar retrieval com metadata de chunks
ALTER TABLE document_embeddings
  ADD COLUMN chunk_index INTEGER DEFAULT 0,
  ADD COLUMN chunk_text TEXT,
  ADD COLUMN start_pos INTEGER,
  ADD COLUMN end_pos INTEGER;
```

---

## Fases de Implementação

### Fase 1: Fundação (Semana 1) ✅ Critical Path

**1.1 Voyage AI Client**
```
src/lib/voyage/
├── index.ts          # getVoyageClient() - recupera API key encriptada
├── types.ts          # VoyageEmbeddingResponse, VoyageError
└── embeddings.ts     # generateEmbedding(text), generateEmbeddingsBatch(texts[])
```

**1.2 Document Chunking**
```
src/lib/voyage/chunking.ts
├── splitDocumentIntoChunks(content, options)
├── chunkByParagraph(text)
├── chunkBySentence(text)
└── mergeSmallChunks(chunks)
```

**1.3 Queue Integration**
- Adicionar `document_embedding` ao enum `JobType`
- Criar interface `DocumentEmbeddingPayload`
- Implementar handler em `/api/workers/route.ts`

**1.4 Storage**
- `storeEmbeddings(documentId, chunks[], embeddings[])`
- Atualizar `documents.embedded = true`
- Salvar progresso (chunks processados / total)

### Fase 2: Busca & Retrieval (Semana 2)

**2.1 Cosine Similarity**
```typescript
// src/lib/voyage/search.ts
export function cosineSimilarity(a: number[], b: number[]): number
```

**2.2 Semantic Search**
```typescript
// src/lib/voyage/search.ts
export async function semanticSearch(
  query: string,
  options: { categories?, userId?, threshold?, limit? }
): Promise<SearchResult[]>
```

**2.3 Server Actions**
```typescript
// src/app/(app)/sources/actions/rag-actions.ts
export async function searchDocumentsAction(...)
export async function getRelevantContextAction(...)
export async function reembedDocumentAction(...)
```

### Fase 3: UI Integration (Semana 2-3)

**3.1 Componentes de Status**
```
src/components/embeddings/
├── embedding-status.tsx    # Badge: Indexed | Pending | Processing | Failed
├── embedding-progress.tsx  # Progress bar para embeddings em andamento
└── chunk-viewer.tsx        # Expandir documento para ver chunks
```

**3.2 Semantic Search Tab**
- Input de busca com debounce
- Resultados com similarity score
- Highlight do texto matching
- Filtro por categoria

**3.3 Document Cards Enhanced**
- Mostrar status de embedding
- Botão "Re-embed"
- Contador de chunks

### Fase 4: Chat Integration (Semana 3)

**4.1 RAG Context Selector**
```typescript
// src/components/chat/rag-context-selector.tsx
// Seletor de categorias para RAG (igual pattern do sources)
```

**4.2 Context Assembly**
```typescript
// src/lib/rag/assembler.ts
export async function assembleRagContext(
  query: string,
  options: { categories?, maxTokens?, threshold? }
): Promise<string>
```

**4.3 Chat Enhancement**
- Injetar contexto RAG no prompt
- Mostrar "Fontes usadas" na resposta
- Permitir excluir fontes específicas

### Fase 5: Otimização (Semana 4)

**5.1 Hybrid Search**
- Semantic + Full-text (pg_trgm)
- Scoring ponderado (70% semantic, 30% keyword)

**5.2 Caching**
- Cache query embeddings (Redis)
- Cache resultados frequentes

**5.3 Batch Operations**
- Re-embed all (mudança de modelo)
- Bulk embedding por categoria

---

## Padrões Críticos de Código

### Voyage Client com API Key Encriptada
```typescript
// src/lib/voyage/index.ts
import { decryptApiKey } from "@/lib/encryption";
import { db } from "@/db";
import { userApiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getVoyageClient() {
  const [keyRecord] = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.provider, "voyage"))
    .limit(1);

  if (!keyRecord) {
    throw new Error("Voyage API key not configured");
  }

  const apiKey = decryptApiKey(keyRecord.encryptedKey, keyRecord.nonce);
  return { apiKey };
}
```

### Embedding Generation
```typescript
// src/lib/voyage/embeddings.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  const { apiKey } = await getVoyageClient();

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: "voyage-4-large",
    }),
  });

  if (!response.ok) {
    throw new VoyageError(`Voyage API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding; // number[1024]
}
```

### Worker Handler (Evitar Infinite Loops!)
```typescript
// src/app/api/workers/route.ts
const jobHandlers: Record<string, (payload: unknown) => Promise<unknown>> = {
  // ... handlers existentes

  document_embedding: async (payload: DocumentEmbeddingPayload) => {
    const { documentId } = payload;

    // 1. Get document
    const doc = await db.select().from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    // 2. Split into chunks
    const chunks = await splitDocumentIntoChunks(doc[0].content);

    // 3. Update total chunks
    await db.update(documents)
      .set({ totalChunks: chunks.length })
      .where(eq(documents.id, documentId));

    // 4. Process each chunk with progress
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i].text);

      await db.insert(documentEmbeddings).values({
        documentId,
        embedding: JSON.stringify(embedding),
        model: "voyage-4-large",
        chunkIndex: i,
        chunkText: chunks[i].text,
        startPosition: chunks[i].start,
        endPosition: chunks[i].end,
      });

      // Update progress
      await db.update(documents)
        .set({ embeddingProgress: i + 1 })
        .where(eq(documents.id, documentId));
    }

    // 5. Mark as embedded
    await db.update(documents)
      .set({
        embedded: true,
        lastEmbeddedAt: new Date(),
        embeddingModel: "voyage-4-large",
      })
      .where(eq(documents.id, documentId));

    return { chunksProcessed: chunks.length };
  },
};
```

### Semantic Search
```typescript
// src/lib/voyage/search.ts
export interface SearchResult {
  documentId: number
  documentTitle: string
  chunkIndex: number
  text: string
  score: number
  category: string
}

export async function semanticSearch(
  query: string,
  userId: string,
  options: {
    categories?: string[]
    threshold?: number
    limit?: number
  } = {}
): Promise<SearchResult[]> {
  const {
    categories = Object.values(DOCUMENT_CATEGORIES),
    threshold = 0.7,
    limit = 10
  } = options;

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Get all embeddings for user's documents
  const results = await db
    .select({
      embedding: documentEmbeddings.embedding,
      chunkText: documentEmbeddings.chunkText,
      chunkIndex: documentEmbeddings.chunkIndex,
      documentId: documentEmbeddings.documentId,
      documentTitle: documents.title,
      category: documents.category,
    })
    .from(documentEmbeddings)
    .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.embedded, true),
        inArray(documents.category, categories),
        isNull(documents.deletedAt)
      )
    );

  // 3. Calculate cosine similarity
  const scored = results
    .map(r => ({
      ...r,
      score: cosineSimilarity(
        queryEmbedding,
        JSON.parse(r.embedding)
      ),
    }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
```

---

## Componentes UI Reutilizáveis

### EmbeddingStatusBadge
```typescript
// src/components/embeddings/embedding-status.tsx
interface EmbeddingStatusProps {
  embedded: boolean
  progress: number
  total: number
  error?: string | null
}

export function EmbeddingStatusBadge({
  embedded,
  progress,
  total
}: EmbeddingStatusProps) {
  if (embedded) {
    return <Badge variant="success" className="gap-1">
      <CheckCircle className="h-3 w-3" />
      Indexado
    </Badge>
  }

  if (progress > 0) {
    return <Badge variant="processing" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      {progress}/{total}
    </Badge>
  }

  return <Badge variant="pending">
    <Clock className="h-3 w-3" />
    Pendente
  </Badge>
}
```

---

## Erros Conhecidos para Evitar

### 1. Infinite Loop em useEffect (CRITICAL!)
```typescript
// ❌ ERRADO - Causa infinite loop
const fetchDocuments = useCallback(async () => {
  const data = await getDocumentsAction(userId, filters)
  setDocuments(data)
}, [userId, filters])  // Object deps = nova referência!

// ✅ CORRETO - Usar useRef
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ userId, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchDocuments()
  }
}, [userId, filters])
```

### 2. Cores no Dark Mode
```typescript
// ❌ ERRADO - Tailwind v4 não resolve
className="text-foreground/80"

// ✅ CORRETO - Cores explícitas
className="text-white/70"
```

### 3. Server Components com handlers
```typescript
// ❌ ERRADO
export default function Page() {
  const handleClick = () => {...}
  return <ClientComponent onClick={handleClick} />
}

// ✅ CORRETO - "use client"
"use client"
export default function Page() {
  const handleClick = () => {...}
  return <ClientComponent onClick={handleClick} />
}
```

---

## Arquivos Críticos para Modificar/Criar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| **MODIFICAR** | `src/db/schema.ts` | Adicionar campos progresso, job type |
| **MODIFICAR** | `src/lib/queue/types.ts` | Adicionar `DocumentEmbeddingPayload` |
| **MODIFICAR** | `src/app/api/workers/route.ts` | Adicionar handler `document_embedding` |
| **MODIFICAR** | `src/app/(app)/sources/actions/sources-actions.ts` | Actions RAG |
| **MODIFICAR** | `src/app/(app)/sources/components/document-card.tsx` | Status embedding |
| **MODIFICAR** | `src/app/(app)/sources/components/semantic-search-tab.tsx` | Busca real |
| **CRIAR** | `src/lib/voyage/index.ts` | Client Voyage |
| **CRIAR** | `src/lib/voyage/embeddings.ts` | Geração embeddings |
| **CRIAR** | `src/lib/voyage/chunking.ts` | Chunking |
| **CRIAR** | `src/lib/voyage/search.ts` | Busca semântica |
| **CRIAR** | `src/lib/rag/assembler.ts` | Context assembly |
| **CRIAR** | `src/components/embeddings/embedding-status.tsx` | Badge |
| **CRIAR** | `src/components/chat/rag-context-selector.tsx` | Seletor |
| **CRIAR** | `src/app/api/rag/route.ts` | Endpoint RAG |

---

## Plano de Testes

### Unit Tests
- `chunking.test.ts` - Testar splitting de documentos
- `similarity.test.ts` - Testar cosine similarity
- `assembler.test.ts` - Testar montagem de contexto

### Integration Tests
- Upload documento → Queue → Embedding completo
- Busca semântica → Resultados ordenados
- Chat com RAG → Contexto injetado

### E2E Tests
- Usuário faz upload → Documento indexado
- Usuário busca → Resultados relevantes
- Usuário chat com RAG → Resposta com fontes

---

## Verificação Final

Checklist de validação:

- [ ] Voyage API key configurada via settings
- [ ] Upload de documento cria job na fila
- [ ] Worker processa documento em chunks
- [ ] Embeddings salvos corretamente (1024 dims)
- [ ] Documento marcado como `embedded: true`
- [ ] Busca semântica retorna resultados relevantes
- [ ] Scores de similaridade exibidos corretamente
- [ ] Chat injeta contexto RAG no prompt
- [ ] "Fontes usadas" visível na resposta
- [ ] Re-embed funciona para atualizar modelo

---

## Próximos Passos

Após aprovação:

1. Criar migrations via MCP Neon
2. Implementar Fase 1 (Foundation)
3. Testar fluxo básico end-to-end
4. Continuar Fases 2-5 sequencialmente

**Branch base:** `feat/database-embedding`
**Tag atual:** `backup-20260116-094634`
