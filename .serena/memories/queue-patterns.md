# Queue Patterns

Padrões para implementação de sistema de filas com Upstash Redis.

## Arquitetura Serverless de Filas

Diferente de filas tradicionais que requerem workers contínuos (BullMQ), nossa arquitetura usa API routes como workers, ideais para serverless.

### Fluxo Completo

```
Client → POST /api/jobs → Cria job no DB + Enfileira no Redis
                              ↓
                         Agendador (cron/webhook)
                              ↓
                        POST /api/workers → Processa job
                              ↓
                         Atualiza DB + Notifica
```

## Estrutura de Arquivos

```
src/lib/queue/
├── types.ts       # JobType, JobStatus, payloads
├── client.ts      # Upstash Redis client (enqueue, dequeue)
└── jobs.ts        # CRUD de jobs (createJob, updateJobStatus, getJob)
```

## Tipos de Jobs

```typescript
enum JobType {
  AI_TEXT_GENERATION = "ai_text_generation",
  AI_IMAGE_GENERATION = "ai_image_generation",
  CAROUSEL_CREATION = "carousel_creation",
  SCHEDULED_PUBLISH = "scheduled_publish",
  WEB_SCRAPING = "web_scraping",
  // Social Media (Jan 2026)
  SOCIAL_PUBLISH_INSTAGRAM = "social_publish_instagram",
  SOCIAL_PUBLISH_FACEBOOK = "social_publish_facebook",
}
  AI_TEXT_GENERATION = "ai_text_generation",
  AI_IMAGE_GENERATION = "ai_image_generation",
  CAROUSEL_CREATION = "carousel_creation",
  SCHEDULED_PUBLISH = "scheduled_publish",
  WEB_SCRAPING = "web_scraping",
}

enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

## Padrão de Enfileiramento

```typescript
// src/lib/queue/client.ts

// Enfileirar com prioridade
const score = `${String(999999 - priority).padStart(6, "0")}:${Date.now()}:${jobId}`;
await redis.lpush(JOB_QUEUE, score);

// Desenfileirar (prioriza maior score = menor priority)
const value = await redis.rpop<string>(JOB_QUEUE);
const jobId = parseInt(value.split(":")[2], 10);
```

## Padrão de Worker

```typescript
// src/app/api/workers/route.ts

export async function POST(request: Request) {
  // 1. Desenfileirar próximo job
  const jobId = await dequeueJob();

  // 2. Buscar job no banco
  const job = await getJob(jobId);

  // 3. Marcar como processando
  await markAsProcessing(jobId);
  await updateJobStatus(jobId, "processing");

  // 4. Executar handler específico
  const handler = jobHandlers[job.type];
  const result = await handler(job.payload);

  // 5. Atualizar status
  await updateJobStatus(jobId, "completed", { result });
  await removeFromProcessing(jobId);
}
```

## Padrão de Retry

```typescript
if (error) {
  const shouldRetry = (job.attempts ?? 0) + 1 < (job.maxAttempts ?? 3);

  if (shouldRetry) {
    await incrementJobAttempts(jobId);
    // Re-enfileirar para tentar novamente
    await enqueueJob(jobId, job.priority ?? undefined);
  } else {
    // Falha definitiva
    await updateJobStatus(jobId, "failed", { error });
  }
}
```

## API Routes Padrão

### Criar Job

```typescript
// POST /api/jobs
export async function POST(request: Request) {
  const { userId } = await auth();
  const { type, payload, priority } = await request.json();

  const jobId = await createJob(userId, type, payload, { priority });

  return NextResponse.json({ jobId, status: "pending" });
}
```

### Consultar Status

```typescript
// GET /api/jobs/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;
  const job = await getJob(parseInt(id, 10));

  if (job.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
}
```

## Variáveis de Ambiente

```env
# Upstash Redis (fila de jobs)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Worker authentication
WORKER_SECRET=dev-secret-change-in-production

# Upstash QStash (cron jobs)
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJ1c2VySWQiOi...  # Opcional - usa UPSTASH_REDIS_REST_TOKEN se não definido
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...

# Cron authentication
CRON_SECRET=dev-secret-change-in-production

# App URL (para callbacks do QStash)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Chaves do Redis

```
jobs:pending      - Lista de jobs pendentes (LPUSH/RPOP)
jobs:processing   - Lista de jobs em processamento
```

## Error Handling (Jan 2026)

**Novo sistema de erros específicos:** `src/lib/errors.ts`

```typescript
// Erros base
AppError - Classe base com code, statusCode, details
ValidationError - Erro de validação (400)
AuthError - Erro de autenticação (401)
ForbiddenError - Erro de permissão (403)
NotFoundError - Recurso não encontrado (404)
NetworkError - Erro de rede/conexão (503)
RateLimitError - Rate limit excedido (429)
ConfigError - Erro de configuração
JobError - Erro de processamento de job

// Helpers
toAppError(error) - Normaliza unknown para AppError
getErrorMessage(error) - Extrai mensagem segura
getErrorCode(error) - Extrai código do erro
isRetryableError(error) - Verifica se erro é retryável
```

### Padrão de Tratamento de Erro

```typescript
// ANTES - catch genérico
} catch (error) {
  console.error("Error:", error)
  return { error: error instanceof Error ? error.message : "Unknown" }
}

// DEPOIS - tipos específicos
} catch (error) {
  const appError = toAppError(error, "SPECIFIC_CODE")
  console.error("[Context] Error:", appError)
  return { error: getErrorMessage(appError), code: appError.code }
}
```

### Métricas de Sucesso/Falha

Jobs agora retornam informações detalhadas sobre falhas:

```typescript
// fetch-metrics.ts
return { 
  success: true, 
  updatedCount, 
  errors?: MetricsFetchError[] // Array de posts que falharam
}

// workers/route.ts (image upload)
return {
  success: true,
  uploadFallbacks?: Array<{ slideNumber: number; error: string }>
}
```

## Cron Jobs com Upstash QStash (Jan 2026)

**IMPORTANTE**: O sistema de cron jobs agora usa **Upstash QStash** em vez de Vercel Cron.

### Por que QStash?

| Característica | Vercel Cron (Pro) | Upstash QStash |
|----------------|-------------------|----------------|
| **Custo** | $20/mês (Pro plan) | 500k requisições grátis/mês |
| **Frequência mínima** | 1 minuto | 1 minuto |
| **Hobby plan** | 1 execução/hora | 1 minuto (grátis) |
| **Gerenciamento** | vercel.json | SDK TypeScript + CLI |

### Estrutura do QStash

```
src/lib/cron/
├── qstash.ts              # Client QStash + gerenciamento de schedules
├── types.ts               # Tipos para jobs e schedules

src/app/api/cron/
├── qstash/route.ts        # Endpoint para receber callbacks do QStash

scripts/
├── setup-qstash.ts        # CLI para gerenciar schedules

docs/
├── QSTASH_SETUP.md        # Documentação completa
```

### Configuração de Schedules

```typescript
// src/lib/cron/qstash.ts
export const cronSchedules: Record<string, QStashSchedule> = {
  workers: {
    cron: "* * * * *", // A cada minuto
    endpoint: "/api/workers",
    payload: { source: "qstash", job: "workers" },
  },
  socialPublish: {
    cron: "*/5 * * * *", // A cada 5 minutos
    endpoint: "/api/cron/social-publish",
    payload: { source: "qstash", job: "social-publish" },
  },
};
```

### Variáveis de Ambiente

```env
# QStash (usa UPSTASH_REDIS_REST_TOKEN como fallback)
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJ1c2VySWQiOi...  # JWT completo
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...

# Autenticação do cron
CRON_SECRET=dev-secret-change-in-production

# URL da aplicação (para QStash fazer callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Comandos CLI

```bash
npm run cron:setup    # Configura todos os schedules
npm run cron:remove   # Remove todos os schedules
npm run cron:health   # Verifica saúde do sistema
npm run cron:trigger  # Trigger manual de job
```

### Padrão de Endpoint QStash

```typescript
// src/app/api/cron/qstash/route.ts
import { verifySignature } from "@upstash/qstash/dist/server"

export async function POST(request: Request) {
  // 1. Verificar assinatura do QStash
  const signature = request.headers.get("x-qstash-signature")
  const isValid = await verifySignature(
    await request.text(),
    signature,
    process.env.QSTASH_CURRENT_SIGNING_KEY
  )

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 2. Extrair job name do payload
  const body = await request.json()
  const jobName = body.job

  // 3. Executar handler específico
  const handler = qstashHandlers[jobName]
  const result = await handler(body)

  return NextResponse.json({ success: true, result })
}
```

### Health Check

```typescript
const health = await healthCheck()
// Returns: { healthy: boolean, configured: boolean, schedulesCount?: number }
```

### Trigger Manual

```typescript
const result = await triggerJob("workers")
// Returns: { success: boolean, scheduleId?: string, message?: string }
```

---

## Considerações Importantes

1. **Idempotência**: Workers devem ser idempotentes para processar jobs duplicados