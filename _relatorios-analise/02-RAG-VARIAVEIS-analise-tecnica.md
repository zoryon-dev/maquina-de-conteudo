# Relatório 2 — RAG e Variáveis de Usuário: Análise Técnica

**Projeto:** Máquina de Conteúdo
**Data:** 12 de fevereiro de 2026
**Tipo:** Análise Técnica Aprofundada (para desenvolvedores seniores)
**Escopo:** Pipeline de RAG, sistema de embeddings, variáveis de personalização do usuário

---

## 1. Arquitetura Geral do Sistema

### 1.1. Stack Tecnológico Relevante

| Componente | Tecnologia | Localização |
|------------|-----------|-------------|
| Embeddings | Voyage AI (voyage-4-large, 1024 dims) | `src/lib/voyage/` |
| RAG Orchestration | Custom assembler | `src/lib/rag/` |
| Busca Semântica | Cosine similarity em JS | `src/lib/voyage/search.ts` |
| Banco de Dados | Neon PostgreSQL + Drizzle ORM | `src/db/schema.ts` |
| LLM Gateway | OpenRouter via Vercel AI SDK | `src/lib/ai/config.ts` |
| Variáveis de Usuário | Custom CRUD com Clerk auth | `src/lib/wizard-services/user-variables.service.ts` |
| Estado do Cliente | Zustand (múltiplos stores) | `src/stores/` |

### 1.2. Diagrama de Fluxo de Dados

```
Documento (Upload)
    │
    ▼
[Chunking] ──── Category-specific options
    │              (src/lib/voyage/chunking.ts)
    ▼
[Voyage AI API] ──── voyage-4-large model
    │                  (src/lib/voyage/embeddings.ts)
    ▼
[DB: document_embeddings] ──── embedding como JSON string
    │                           chunkText, chunkIndex, startPos, endPos
    │
    │   (Na hora da query)
    ▼
[generateEmbedding(query)] ──── Query → vetor 1024d
    │
    ▼
[SELECT * FROM document_embeddings] ──── TODOS os embeddings do user
    │
    ▼
[cosineSimilarity() em JS] ──── Loop O(n) em memória
    │
    ▼
[filterByRelevance()] ──── minScore, maxChunksPerDoc, dedup
    │
    ▼
[diversifyChunks()] ──── Garante diversidade de documentos
    │
    ▼
[selectChunksWithinBudget()] ──── Token budget management
    │
    ▼
[assembleRagContext()] ──── Formata context + sources
    │
    ▼
[System Prompt + RAG Context] ──── Injetado no LLM
```

---

## 2. Sistema de Variáveis do Usuário — Análise Detalhada

### 2.1. Modelo de Dados

**Tabela:** `userVariables` (definida em `src/db/schema.ts`)

```
Campos: userId (string), variableKey (string), variableValue (string)
PK composta: (userId, variableKey)
```

As 10 variáveis são armazenadas como pares chave-valor individuais, o que permite extensibilidade futura (adicionar novas variáveis sem migração de schema).

### 2.2. Ciclo de Vida das Variáveis

**Coleta (Frontend):**
- Arquivo: `src/app/(app)/settings/components/sections/variables-section.tsx`
- Interface: Grid de cards com diálogo de edição para cada variável
- Ação: `saveVariableAction()` em `src/app/(app)/settings/actions/save-settings.ts` (linhas 326-368)
- Padrão: Upsert (verifica existência antes de inserir/atualizar)

**Recuperação (Backend):**
- Arquivo: `src/lib/wizard-services/user-variables.service.ts`
- Função: `getUserVariables(userId?)` — busca todas as variáveis do DB e retorna um objeto `UserVariables`
- Autenticação: Se `userId` não fornecido, usa `auth()` do Clerk. O parâmetro explícito é usado em contextos de worker onde não há request HTTP.

**Formatação para Prompt:**
- Função: `formatVariablesForPrompt(variables: UserVariables)` (mesmo arquivo)
- Retorna um bloco de texto estruturado:
  ```
  === CONTEXTO DA MARCA DO USUÁRIO ===
  Tom de voz: [valor]
  Voz da marca: [valor]
  Nicho: [valor]
  ...
  ```
- Campos vazios são omitidos do bloco de contexto (comportamento correto para evitar poluição do prompt)

**Merge com Input (Wizard):**
- Função: `loadAndFormatUserVariables()` em `src/lib/wizard-services/llm.service.ts` (linhas 67-108)
- Lógica: Input do wizard **sobrescreve** variáveis salvas para campos onde o input é não-vazio
- Negative terms: **Mesclados** (union de input + salvos), não substituídos

```typescript
// Padrão de merge (llm.service.ts, linhas 83-94)
const mergedVariables: UserVariables = {
  tone: inputTone || savedVariables.tone,           // Input prevalece
  brandVoice: savedVariables.brandVoice,             // Sem input — usa salvo
  niche: inputNiche || savedVariables.niche,         // Input prevalece
  targetAudience: inputTargetAudience || savedVariables.targetAudience,
  audienceFears: savedVariables.audienceFears,       // Sem input — usa salvo
  audienceDesires: savedVariables.audienceDesires,   // Sem input — usa salvo
  differentiators: savedVariables.differentiators,   // Sem input — usa salvo
  contentGoals: savedVariables.contentGoals,         // Sem input — usa salvo
  preferredCTAs: savedVariables.preferredCTAs,       // Sem input — usa salvo
  negativeTerms: savedVariables.negativeTerms,       // Sem input — usa salvo
}
```

### 2.3. Pontos de Injeção das Variáveis — Mapa Completo

| Ponto de Geração | Variáveis Injetadas? | Arquivo | Detalhe |
|-------------------|---------------------|---------|---------|
| **Wizard — Narrativas** | SIM | `llm.service.ts:153-187` | `loadAndFormatUserVariables()` + append no systemPrompt |
| **Wizard — Conteúdo** | SIM | `llm.service.ts:330-366` | `loadAndFormatUserVariables()` + append no prompt |
| **Chat API (todos os agentes)** | **NÃO** | `route.ts:87-104` | System prompt fixo, sem consulta a variáveis |
| **Creative Studio (imagens)** | **NÃO** | `prompt-builder.ts:38-125` | Constrói prompt sem consultar DB de variáveis |
| **Agentes Zep (contextualizado)** | **PARCIAL** | `route.ts:231-255` | Zep pode ter contexto, mas não variáveis estruturadas |

### 2.4. Lacuna Crítica: Chat API Route

**Arquivo:** `src/app/api/chat/route.ts`

O endpoint POST do chat (linhas 111-309) monta o prompt de sistema de três formas possíveis:

1. **Com Zep + RAG** (linhas 231-244): `buildAgentSystemPrompt()` + RAG context
2. **Sem Zep + Com RAG** (linhas 247-254): `RAG_SYSTEM_PROMPT` template com contexto
3. **Sem Zep + Sem RAG** (linhas 254): `STANDARD_SYSTEM_PROMPT` fixo

Em **nenhum** desses caminhos há chamada a `getUserVariables()` ou `formatVariablesForPrompt()`.

**Impacto técnico:** O agente Criador (`criador`) no chat não sabe o tom de voz da marca ao sugerir conteúdo. O agente Estrategista não conhece o público-alvo ao dar recomendações. A personalização existe no DB mas não é consumida.

**Fix sugerido:**
```typescript
// No início do POST handler, após validar userId:
const { context: variablesContext } = await loadAndFormatUserVariables(
  undefined, undefined, undefined, undefined, undefined, userId
)

// Antes de streamText, append ao systemPrompt:
if (variablesContext) {
  systemPrompt += `\n\n${variablesContext}`
}
```

Estimativa de esforço: ~15 linhas de código + import. Sem breaking changes.

---

## 3. Pipeline de RAG — Análise Detalhada

### 3.1. Chunking

**Arquivo:** `src/lib/voyage/chunking.ts`

**Configuração por categoria:**

| Categoria | maxTokens | overlap | Estratégia |
|-----------|-----------|---------|------------|
| products | 800 | 150 | Trechos menores para itens específicos |
| brand | 1300 | 150 | Trechos maiores para contexto amplo |
| audience | 1000 | 150 | Equilíbrio |
| content | 1200 | 150 | Trechos maiores para exemplos |
| competitors | 1000 | 150 | Equilíbrio |
| general (default) | 1000 | 150 | Equilíbrio |

**Abordagem:** Parágrafo primeiro, fallback para sentença se parágrafos forem muito grandes. Overlap de 150 tokens entre chunks adjacentes para manter contexto de transição.

**Observação:** O overlap é injetado como texto literal do chunk anterior no início do próximo chunk. Isso é eficaz para manter coerência, mas duplica tokens no armazenamento de embeddings (~15% de overhead por chunk).

### 3.2. Geração de Embeddings

**Arquivo:** `src/lib/voyage/embeddings.ts`

**Modelo:** `voyage-4-large` (1024 dimensões)

**Funções principais:**
- `generateEmbedding(text)` — Embedding único via API Voyage
- `generateEmbeddingsBatch(texts, model)` — Batch (max 128 textos por requisição)
- `estimateTokens(text)` — `Math.ceil(text.length / 4)` — Estimativa simplificada

**Armazenamento:**
- Tabela: `documentEmbeddings`
- Campo `embedding`: tipo `text` no DB (JSON stringificado)
- Cada inserção faz `JSON.stringify(embeddings[i])` antes de salvar
- Cada leitura faz `JSON.parse(r.embedding)` ao recuperar

**Problema de armazenamento:** Um vetor de 1024 dimensões em JSON ocupa ~10-15 KB por chunk (cada float gera ~8-12 caracteres + vírgula). O tipo `vector(1024)` do pgvector ocuparia ~4 KB (4 bytes * 1024 = 4096 bytes). Economia de ~65-70% no storage.

### 3.3. Busca Semântica

**Arquivo:** `src/lib/voyage/search.ts`

**Função `semanticSearch()` (linhas 76-141):**

```
1. generateEmbedding(query)           → Vetor 1024d da query
2. SELECT embedding, chunkText, ...   → TODOS os embeddings do usuário
3. JSON.parse(embedding)              → Para cada resultado
4. cosineSimilarity(query, embedding) → Cálculo em JS
5. filter(score >= threshold)         → Filtro por threshold
6. sort + slice(0, limit)             → Top-K resultados
```

**Complexidade:** O(n) onde n = número total de chunks do usuário em categorias selecionadas.

**`cosineSimilarity()` (linhas 40-57):**
```typescript
// Implementação manual — correta mas não otimizada
for (let i = 0; i < a.length; i++) {
  dotProduct += a[i] * b[i]
  normA += a[i] * a[i]
  normB += b[i] * b[i]
}
```

**Perfil de performance estimado:**
- 100 chunks: ~5ms de cálculo + overhead de JSON.parse + latência DB
- 1.000 chunks: ~50ms de cálculo + ~15MB de dados transferidos do DB
- 10.000 chunks: ~500ms de cálculo + ~150MB de dados transferidos

**Função `hybridSearch()` (linhas 151-187):**
- Combina busca semântica (peso 0.7) com keyword matching (peso 0.3)
- Keyword matching usa `includes()` para cada palavra da query em cada chunk
- Re-normaliza scores semânticos para [0,1] antes de combinar

**Keyword scoring:** Simples contagem de overlaps de palavras. Não usa TF-IDF, BM25, ou qualquer ponderação. Todas as palavras têm peso igual.

### 3.4. Filtros de Relevância

**Arquivo:** `src/lib/rag/filters.ts`

**Pipeline de filtros:**
1. `filterByRelevance()` (linhas 83-130): minScore, minChunkLength, category filter, category boosts
2. `limitChunksPerDocument()` (linhas 147-176): Max 3 chunks por documento (evita dominância)
3. `deduplicateChunks()` (linhas 193-223): Jaccard similarity com threshold 0.95
4. `diversifyChunks()` (linhas 373-399): Garante representação de múltiplos documentos

**Deduplicação por Jaccard:**
```typescript
// calculateTextSimilarity() — Jaccard word overlap
const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
const intersection = new Set([...words1].filter(x => words2.has(x)))
const union = new Set([...words1, ...words2])
return intersection.size / union.size
```

**Observação:** Jaccard é O(n+m) onde n,m = número de palavras. Adequado para deduplicação, mas não captura similaridade semântica (paráfrases com palavras diferentes teriam score baixo).

### 3.5. Assembler e Token Budget

**Arquivo:** `src/lib/rag/assembler.ts`

**Função `assembleRagContext()` (linhas 63-151):**

```
1. Busca: semanticSearch() ou hybridSearch() com limit = maxChunks * 2
2. Conversão: SearchResult[] → RagChunk[] (adiciona estimatedTokens)
3. Filtro: filterByRelevance() com minScore, maxChunksPerDoc=3, dedup=true
4. Diversificação: diversifyChunks() com min(3, filtered.length)
5. Budget: estimateContextOverhead() → availableTokens → selectChunksWithinBudget()
6. Formato: "[Title (category)]\ntext" separados por "\n\n---\n\n"
7. Sources: Agrupados por documento, score máximo, contagem de chunks
```

**Configuração padrão:**
```typescript
const DEFAULT_RAG_OPTIONS = {
  threshold: 0.5,    // Lowered from 0.6 for better recall
  maxChunks: 15,     // Increased since chunks are smaller
  maxTokens: 3000,   // ~3 chunks + overhead
  includeSources: true,
}
```

**No Chat API:**
```typescript
const MAX_RAG_TOKENS = 8000  // Mais generoso que o default
const RAG_THRESHOLD = 0.5
const MAX_CHUNKS = 5
```

**Token Budget (`src/lib/rag/token-budget.ts`):**
```typescript
const CHARS_PER_TOKEN = 4  // Estimativa fixa

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
```

**Token budgets por modelo:**
| Modelo | Total | System | Context | Response | Reserved |
|--------|-------|--------|---------|----------|----------|
| voyage-4-large | 32K | 1K | 8K | 4K | 1K |
| claude-opus-4 | 200K | 2K | 16K | 8K | 2K |
| claude-sonnet-4 | 200K | 2K | 12K | 6K | 2K |
| gpt-5 | 128K | 1.5K | 10K | 5K | 1.5K |

**Observação:** Os budgets acima são definidos em `src/lib/rag/types.ts` (linhas 161-190), mas na prática o Assembler usa `maxTokens` do caller (3000 default, 8000 no chat). O budget por modelo não é consultado automaticamente — seria necessário integrar `getTokenBudget()` no fluxo.

---

## 4. Problemas Técnicos Específicos

### 4.1. Busca O(n) em Memória — Severidade: Alta

**Problema:** `semanticSearch()` carrega todos os embeddings para memória do Node.js e faz comparação vetorial em loop JavaScript.

**Arquivo:** `src/lib/voyage/search.ts`, linhas 106-141

**Cenário de degradação:**
- Cada embedding: ~10-15KB como JSON string
- 500 chunks (user médio): ~7.5MB transferido do DB → Node.js → parse → cálculo
- A cada request do chat, isso se repete

**Solução proposta:** Migrar para pgvector com busca nativa:
```sql
-- Busca vetorial nativa (O(log n) com índice HNSW)
SELECT chunk_text, 1 - (embedding <=> $1::vector) AS score
FROM document_embeddings
WHERE document_id IN (SELECT id FROM documents WHERE user_id = $2)
ORDER BY embedding <=> $1::vector
LIMIT 15;
```

**Plano de migração:**
1. Habilitar extensão pgvector no Neon (`CREATE EXTENSION vector;`)
2. Adicionar coluna `embedding_vec vector(1024)` em `document_embeddings`
3. Script de migração para converter JSON → vector
4. Criar índice HNSW: `CREATE INDEX ON document_embeddings USING hnsw (embedding_vec vector_cosine_ops)`
5. Atualizar `semanticSearch()` para usar query SQL com operador `<=>` (cosine distance)
6. Após validação, remover coluna `embedding` (texto JSON)

### 4.2. Variáveis Não Injetadas no Chat — Severidade: Alta

**Detalhado na Seção 2.4.** Resumo: nenhum caminho no `POST /api/chat` consulta `userVariables`.

### 4.3. Estimativa de Tokens Imprecisa — Severidade: Média

**Problema:** `CHARS_PER_TOKEN = 4` é baseado em inglês. Para PT-BR com o tokenizador do Claude (tiktoken/sentencepiece), a média real está mais próxima de 3.2-3.5 caracteres por token.

**Impacto:** Subestimação de ~15-20% no consumo de tokens. Contextos de RAG podem não usar toda a janela disponível.

**Solução simples:** Ajustar para `CHARS_PER_TOKEN = 3.5`
**Solução ideal:** Usar `js-tiktoken` ou estimar com base no modelo específico sendo utilizado.

### 4.4. Deduplicação por Jaccard Insuficiente — Severidade: Baixa-Média

**Problema:** Jaccard compara conjuntos de palavras. Frases semanticamente idênticas com vocabulário diferente não serão detectadas como duplicatas.

Exemplo: "Nossa missão é transformar a educação" vs "O propósito da empresa é revolucionar o ensino" — Jaccard score ~0.1 apesar de significado similar.

**Impacto:** Chunks semanticamente redundantes podem ocupar espaço no contexto de RAG.

**Solução:** Usar o próprio embedding para deduplicação:
```typescript
const similarity = cosineSimilarity(
  JSON.parse(chunk1.embedding),
  JSON.parse(chunk2.embedding)
)
```
(Requer acesso aos embeddings no filtro, que atualmente não estão disponíveis no tipo `RagChunk`.)

### 4.5. Busca Híbrida com Keyword Scoring Simplificado — Severidade: Baixa

**Problema:** `hybridSearch()` usa `textLower.includes(word)` para keyword scoring.

**Limitações:**
- Não considera frequência (TF-IDF)
- Não penaliza palavras comuns (stop words)
- Matching parcial: "content" matcharia dentro de "discontentment"
- Todas as palavras da query têm peso igual

**Solução:** Implementar BM25 ou TF-IDF para scoring de keywords, ou usar busca full-text do PostgreSQL (`to_tsvector`/`to_tsquery`).

### 4.6. Token Budget Não Integrado ao Modelo — Severidade: Baixa

**Problema:** Os budgets definidos em `DEFAULT_TOKEN_BUDGETS` por modelo nunca são consultados automaticamente. O `assembleRagContext()` recebe `maxTokens` fixo do caller.

**Arquivo:** `src/lib/rag/types.ts`, linhas 161-190

**Impacto:** Modelos com janela de contexto maior (200K para Claude) recebem o mesmo orçamento de RAG (3000-8000 tokens) que modelos menores.

**Solução:** Integrar `getTokenBudget(model)` no fluxo do assembler, passando o modelo sendo utilizado para calcular automaticamente o orçamento de contexto.

---

## 5. Mapa de Arquivos Relevantes

### 5.1. Sistema de Variáveis

| Arquivo | Função |
|---------|--------|
| `src/db/schema.ts` | Definição da tabela `userVariables` |
| `src/app/(app)/settings/actions/save-settings.ts` | CRUD de variáveis (server actions) |
| `src/app/(app)/settings/components/sections/variables-section.tsx` | UI de coleta de variáveis |
| `src/lib/wizard-services/user-variables.service.ts` | Recuperação, formatação, merge de variáveis |
| `src/lib/wizard-services/llm.service.ts` | Consumo de variáveis na geração |

### 5.2. Pipeline de RAG

| Arquivo | Função |
|---------|--------|
| `src/lib/voyage/embeddings.ts` | Geração de embeddings (single + batch) |
| `src/lib/voyage/search.ts` | Busca semântica e híbrida |
| `src/lib/voyage/chunking.ts` | Chunking com opções por categoria |
| `src/lib/voyage/types.ts` | Tipos do sistema Voyage |
| `src/lib/rag/assembler.ts` | Orquestração de montagem de contexto |
| `src/lib/rag/filters.ts` | Filtros de relevância, dedup, diversificação |
| `src/lib/rag/token-budget.ts` | Gerenciamento de budget de tokens |
| `src/lib/rag/types.ts` | Tipos e configurações do RAG |
| `src/lib/rag/index.ts` | Barrel exports |

### 5.3. Pontos de Consumo

| Arquivo | Consome RAG? | Consome Variáveis? |
|---------|-------------|-------------------|
| `src/app/api/chat/route.ts` | SIM (assembleRagContext) | **NÃO** |
| `src/lib/wizard-services/llm.service.ts` | Via ragContext input | SIM (loadAndFormatUserVariables) |
| `src/lib/creative-studio/prompt-builder.ts` | NÃO | **NÃO** |

---

## 6. Métricas de Qualidade do Código

### 6.1. Pontos Positivos

- **Separação de concerns:** RAG (assembler, filters, token-budget) bem modularizado
- **Tipagem forte:** Interfaces TypeScript bem definidas (`RagChunk`, `RagContextResult`, `UserVariables`)
- **Documentação inline:** JSDoc com examples em todas as funções públicas
- **Error handling:** Falhas de RAG não bloqueiam o chat (continue without RAG on error)
- **Configurabilidade:** Thresholds, weights, limits todos configuráveis via options
- **Merge pattern:** O merge de variáveis input → saved é um padrão elegante

### 6.2. Pontos de Atenção

- **Dead code potencial:** `getTokenBudget()` e `DEFAULT_TOKEN_BUDGETS` parecem não utilizados no fluxo principal
- **Duplicação:** `getRagContext()` em `search.ts` e `assembleRagContext()` em `assembler.ts` fazem trabalho similar com API diferente
- **Type safety:** `as any` em `llm.service.ts` (linhas 523, 560) para metadata de vídeo/imagem
- **`boostByRecency()` em `filters.ts`:** Função implementada mas sem evidência de uso no fluxo principal
- **Token estimation:** Usado inconsistentemente (`Math.floor(text.length / 4)` em `search.ts:222` vs `Math.ceil(text.length / CHARS_PER_TOKEN)` em `token-budget.ts:31`)

---

## 7. Recomendações Técnicas Priorizadas

### P0 — Imediato (1-2 sprints)

1. **Injetar variáveis no Chat API route**
   - Arquivo: `src/app/api/chat/route.ts`
   - Importar `getUserVariables`, `formatVariablesForPrompt` de `user-variables.service`
   - Chamar após auth, append ao systemPrompt
   - Testes: verificar que variáveis aparecem no contexto do agente

2. **Injetar variáveis no Creative Studio**
   - Arquivo: `src/lib/creative-studio/prompt-builder.ts`
   - Adicionar parâmetro `userVariables?: UserVariables` em `BuildCreativePromptParams`
   - Incluir contexto de marca nos prompts de imagem

### P1 — Próximo trimestre (3-4 sprints)

3. **Migrar para pgvector**
   - Habilitar extensão no Neon
   - Adicionar coluna vector(1024)
   - Script de migração JSON → vector
   - Criar índice HNSW
   - Atualizar `semanticSearch()` para query SQL

4. **Unificar estimativa de tokens**
   - Criar `estimateTokens()` centralizado
   - Ajustar CHARS_PER_TOKEN para 3.5 (PT-BR)
   - Considerar integração com tokenizador real

### P2 — Evolução (5+ sprints)

5. **Integrar token budget ao modelo**
   - `assembleRagContext()` recebe modelo como parâmetro
   - Calcula maxTokens automaticamente via `getTokenBudget(model)`

6. **Melhorar deduplicação**
   - Usar embedding-based dedup em vez de Jaccard
   - Requer que `RagChunk` inclua embedding ou referência a ele

7. **Upgrade keyword search**
   - Implementar PostgreSQL full-text search (`tsvector/tsquery`)
   - Substituir `includes()` por `plainto_tsquery` para keyword scoring

---

*Este relatório foi gerado via análise estática do código-fonte. Todas as referências de arquivo e linha foram verificadas contra o estado atual do repositório.*
