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
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
WORKER_SECRET=dev-secret-change-in-production  # Para autenticar worker
```

## Chaves do Redis

```
jobs:pending      - Lista de jobs pendentes (LPUSH/RPOP)
jobs:processing   - Lista de jobs em processamento
```

## Considerações Importantes

1. **Idempotência**: Workers devem ser idempotentes para processar jobs duplicados
2. **Timeout**: Jobs longos devem usar estratégias de checkpoint
3. **Prioridade**: Maior número = maior prioridade (invertido no score)
4. **Agendamento**: Jobs com `scheduledFor` não são enfileirados imediatamente

## Integrando com Agendadores

### Development vs Production

O sistema de worker funciona de forma diferente em desenvolvimento e produção:

| Aspecto | Development | Production |
|---------|-------------|------------|
| **Trigger** | Manual via `triggerWorker()` | Vercel Cron (1 minuto) |
| **Auth** | `WORKER_SECRET` | `WORKER_SECRET` |
| **Endpoint** | `/api/workers` | `/api/workers` |

**IMPORTANTE:** Vercel Cron (`vercel.json`) só funciona em produção. Em desenvolvimento, é necessário acionar o worker manualmente.

### triggerWorker() Helper

**Localização:** `src/lib/queue/client.ts`

```typescript
export async function triggerWorker(options?: {
  waitForJobId?: number;
  timeoutMs?: number;
}): Promise<{
  success: boolean;
  message: string;
  jobId?: number;
  result?: unknown;
}>
```

**Uso básico (fire and forget):**
```typescript
import { triggerWorker } from "@/lib/queue/client";

// Auto-trigger em desenvolvimento
if (process.env.NODE_ENV === "development") {
  triggerWorker().catch((err) => {
    console.error("Failed to trigger worker:", err);
  });
}
```

**Uso com wait for job completion:**
```typescript
const result = await triggerWorker({
  waitForJobId: 123,
  timeoutMs: 120000, // 2 minutos
});

if (result.success) {
  console.log("Job completed:", result.result);
} else {
  console.error("Job failed:", result.message);
}
```

### Auto-Trigger Pattern

```typescript
// src/app/api/wizard/[id]/submit/route.ts
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

// Após criar job
if (isDevelopment()) {
  // Fire and forget - don't wait for completion
  triggerWorker().catch((err) => {
    console.error("Failed to trigger worker in development:", err);
  });
}
```

### Worker Authentication Bypass

```typescript
// src/proxy.ts
const isWorkerRoute = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname === "/api/workers";
};

export default clerkMiddleware(async (auth, request) => {
  // Allow worker endpoint to bypass Clerk auth (uses WORKER_SECRET instead)
  if (isWorkerRoute(request)) {
    return NextResponse.next();
  }
  // ... rest of middleware
});
```

### Cron Job (Production)
```bash
# Vercel Cron configuration (vercel.json)
{
  "crons": [
    {
      "path": "/api/workers",
      "schedule": "* * * * *"
    }
  ]
}

# Ou via curl tradicional
* * * * * curl -X POST https://api.example.com/api/workers \
  -H "Authorization: Bearer $WORKER_SECRET"
```

### Upstash QStash
```typescript
// Configurar schedule no QStash para chamar worker
```

## Troubleshooting - Queue

### Jobs não processam

1. **Verificar se worker está sendo acionado:**
   - Em dev: verificar logs para "Failed to trigger worker"
   - Verificar se `WORKER_SECRET` está correto (default: `dev-secret-change-in-production`)

2. **Limpar jobs pending antigos:**
   ```sql
   DELETE FROM jobs WHERE status = 'pending' AND id < X;
   ```

3. **Limpar filas Redis:**
   ```bash
   redis-cli DEL jobs:pending jobs:processing
   ```

### Trigger manual do worker (debug)

```bash
curl -X POST http://localhost:3000/api/workers \
  -H "Authorization: Bearer dev-secret-change-in-production"
```
