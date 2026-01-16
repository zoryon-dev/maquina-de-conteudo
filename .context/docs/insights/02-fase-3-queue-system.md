# Fase 3: Queue System Insights

**Data:** 2026-01-14
**Fase:** Fase 3 (Sistema de Filas com Upstash Redis)

## Visão Geral

Implementação de sistema de filas serverless usando Upstash Redis, eliminando a necessidade de workers contínuos.

## Decisões Arquiteturais

### 1. Fila Baseada em Redis Lists

**Decisão:** Usar `LPUSH`/`RPOP` ao invés de BullMQ.

**Justificativa:**
- BullMQ requer processo contínuo (não serverless-friendly)
- Upstash Redis tem HTTP client otimizado para serverless
- List operations são atômicas e confiáveis
- Sem necessidade de gerenciar workers stateful

**Trade-off:**
- Sem recursos avançados de BullMQ (dead letter, retries complexos)
- Implementação manual de prioridade e retry

### 2. Workers como API Routes

**Decisão:** Implementar worker como endpoint `/api/workers`.

**Justificativa:**
- Serverless por natureza (só roda quando chamado)
- Pode ser disparado por cron jobs, webhooks, ou manualmente
- Escalabilidade automática via plataforma
- Sem custos de idle time

### 3. Prioridade via Score String

**Decisão:** Formatar score como `999999-priority:timestamp:jobId`.

**Justificativa:**
- Redis Lists são FIFO, não priority queues nativas
- Score numérico permite ordenação inversa (maior prioridade = menor score)
- Timestamp garantee FIFO para mesma prioridade
- String concatenation é rápido e eficiente

**Exemplo:**
```typescript
// Prioridade 10, timestamp 1234567890, job 42
// Score = "999989:1234567890:42"
// LPUSH adiciona no início, RPOP remove do final
// Menor score (maior prioridade) é processado primeiro
```

### 4. Retry com Re-enfileiramento

**Decisão:** Jobs falhados são re-enfileirados automaticamente.

**Justificativa:**
- Jobs podem falhar por motivos transitórios (API timeout, rate limit)
- Re-enfileiramento garante que não se percam
- `attempts` e `maxAttempts` previnem loops infinitos

## Padrões Implementados

### 1. Queue Client

```typescript
// Enfileirar com prioridade
const score = `${String(999999 - priority).padStart(6, "0")}:${Date.now()}:${jobId}`;
await redis.lpush(JOB_QUEUE, score);

// Desenfileirar
const value = await redis.rpop<string>(JOB_QUEUE);
const jobId = parseInt(value.split(":")[2], 10);
```

### 2. Job Status Flow

```
pending → [enfileirado]
   ↓
processing → [removed from queue, added to processing]
   ↓
completed/failed → [removed from processing]
```

Jobs em `processing` podem ser recuperados se o worker falhar.

### 3. Worker Pattern

```typescript
export async function POST(request: Request) {
  // 1. Desenfileirar
  const jobId = await dequeueJob();

  // 2. Marcar como processing
  await markAsProcessing(jobId);
  await updateJobStatus(jobId, "processing");

  // 3. Executar handler
  const result = await jobHandlers[job.type](job.payload);

  // 4. Atualizar status
  await updateJobStatus(jobId, "completed", { result });
}
```

## Lições Aprendidas

### 1. Type Safety com JSONB

Usar `.$type<T>()` do Drizzle para type safety em colunas JSONB:

```typescript
payload: jsonb("payload").$type<Record<string, unknown>>()
```

Isso garante que TypeScript saiba o formato dos dados.

### 2. Dupla Import Dinâmico

Import dinâmico pode causar duplicação de imports se não cuidadoso:

```typescript
// ❌ Evitar
const { enqueueJob } = await import("@/lib/queue/client");

// ✅ Importar normalmente
import { enqueueJob } from "@/lib/queue/client";
```

### 3. Worker Secret vs Clerk Auth

Para workers internos, usar `WORKER_SECRET` ao invés de Clerk:

```typescript
// Workers podem ser chamados por sistemas externos
const secret = authHeader?.replace("Bearer ", "");
if (secret !== WORKER_SECRET) {
  // Fallback para Clerk para testes manuais
  const { userId } = await auth();
}
```

## Problemas Encontrados e Soluções

### Problema 1: updateJobStatus não aceita "pending"

**Erro:** Função `updateJobStatus` só aceita "processing" | "completed" | "failed".

**Causa:** Jobs em retry precisam voltar para "pending", mas não foi previsto.

**Solução:** Atualizar status diretamente no DB para retries:
```typescript
await db.update(jobs).set({ status: "pending" as any }).where(eq(jobs.id, jobId));
```

**Futuro:** Adicionar "pending" ao tipo aceito por `updateJobStatus`.

### Problema 2: Handlers sem parâmetro

**Aviso:** Parâmetros `payload` não usados nos handlers simulados.

**Solução Temporária:** Remover parâmetro ou usar `_`:
```typescript
ai_text_generation: async (_payload) => { ... }
```

**Nota:** Quando implementar handlers reais, voltar a usar `payload`.

## Arquivos Criados

### Queue System:
- `src/lib/queue/types.ts` - Enums e interfaces
- `src/lib/queue/client.ts` - Upstash Redis client
- `src/lib/queue/jobs.ts` - CRUD de jobs

### API Routes:
- `src/app/api/jobs/route.ts` - Criar/listar jobs
- `src/app/api/jobs/[id]/route.ts` - Consultar status
- `src/app/api/workers/route.ts` - Processar fila

### Database:
- Adicionada tabela `jobs` ao schema
- Migration aplicada via MCP Neon

## Integrações Futuras

### 1. Agendador Externo

O worker precisa ser chamado periodicamente. Opções:

- **Cron-job.org** - Grátis para projetos públicos
- **Vercel Cron** - Integrado ao deploy
- **Upstash QStash** - Webhooks agendados
- **GitHub Actions** - Workflows agendados

### 2. Handlers Reais

Substituir simulações por implementações reais:
- `ai_text_generation` → OpenRouter API
- `ai_image_generation` → DALL-E/Midjourney API
- `web_scraping` → Firecrawl API
- `scheduled_publish` → Social media APIs

### 3. Dead Letter Queue

Implementar DLQ para jobs que falharam após todas as tentativas:
- Armazenar payload original
- Armazenar erro final
- Permitir reprocessamento manual

## Métricas a Monitorar

- Queue size (jobs pendentes)
- Processing count (jobs em execução)
- Success rate (jobs completados vs falhados)
- Average execution time
- Retry distribution

## Próximos Passos

1. Configurar agendador externo para `/api/workers`
2. Implementar handlers reais com APIs externas
3. Adicionar dead letter queue
4. Implementar dashboard de monitoramento
