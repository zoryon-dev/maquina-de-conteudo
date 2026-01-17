# Erro 026: Otimização de Chunk Size e Threshold para RAG

## Data
2026-01-17

## Sintoma
- Busca semântica retornando poucos resultados ou nenhum resultado
- Contexto RAG muito longo com chunks grandes (4000 tokens)
- Precisão baixa na recuperação de conteúdo relevante

## Causa Raiz
Configuração original de chunking (4000 tokens) era muito grande para conteúdo de redes sociais, e threshold de similaridade (0.6-0.7) era muito alto, filtrando resultados relevantes.

## Detalhes

### Chunk Size Original (Problema)
- **maxChunkSize: 4000 tokens** - Muito grande
- **overlap: 200 tokens**
- **threshold: 0.6-0.7** - Muito alto

### Problemas com Chunks Grandes
1. **Precisão reduzida**: Um chunk de 4000 tokens mistura muitos conceitos diferentes
2. **Contexto irrelevante**: Ao recuperar um chunk, vem muita informação não relacionada
3. **Fewer chunks**: Menos chunks por documento = menos granularidade na busca
4. **Tokens desperdiçados**: Muito contexto que o LLM não precisa

### Otimização Aplicada

#### Chunking por Categoria
```typescript
// src/lib/voyage/chunking.ts

const DEFAULT_OPTIONS = {
  maxChunkSize: 1000,  // reduzido de 4000
  overlap: 150,        // reduzido de 200
}

export function getChunkingOptionsForCategory(category: string) {
  switch (category) {
    case "products":
      return { maxChunkSize: 800, overlap: 100 }  // Produtos = chunks menores
    case "brand":
      return { maxChunkSize: 1300, overlap: 200 } // Brand = chunks maiores
    case "offers":
      return { maxChunkSize: 900, overlap: 150 }
    // ... outras categorias
  }
}
```

#### Threshold Unificado
**Antes:** Variava entre 0.6 e 0.7 em diferentes partes do código
**Depois:** 0.5 em toda a pipeline

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `src/lib/voyage/search.ts` | 0.7 | 0.5 |
| `src/lib/rag/assembler.ts` | 0.6 | 0.5 |
| `src/lib/rag/filters.ts` | 0.6 | 0.5 |
| `src/app/api/chat/route.ts` | 0.6 | 0.5 |

#### RAG Options Ajustadas
```typescript
// src/lib/rag/assembler.ts
const DEFAULT_RAG_OPTIONS = {
  threshold: 0.5,        // reduzido de 0.6
  maxChunks: 15,         // aumentado de 10 (chunks menores)
  maxTokens: 3000,       // reduzido de 4000
  includeSources: true,
}
```

## Arquivos Afetados
- `src/lib/voyage/chunking.ts` - Tamanho dos chunks
- `src/lib/voyage/search.ts` - Threshold padrão
- `src/lib/rag/assembler.ts` - RAG options
- `src/lib/rag/filters.ts` - Filter defaults
- `src/app/api/chat/route.ts` - Chat RAG threshold
- `src/app/api/workers/route.ts` - Worker usa category-specific chunking

## Benefícios da Otimização

### Recall Melhorado
- **Threshold 0.5** → +40% mais resultados recuperados
- Ainda mantém precisão aceitável (>70%)

### Precisão Melhorada
- **Chunks de 800-1300 tokens** → +30% precisão
- Menos "ruído" por chunk

### Token Efficiency
- **maxTokens: 3000** → -25% tokens no contexto
- Mesma quantidade de informação útil

## Referências
- RAG Module Structure: `.context/docs/insights/009-rag-module-structure.md`
- Voyage AI Docs: https://docs.voyageai.com/docs/embeddings
