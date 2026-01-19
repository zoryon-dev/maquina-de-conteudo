# Wizard Worker Debugging - Janeiro 2026

## Contexto

Sessão de debugging para resolver o problema do Wizard travando no Step 2 (Processing). Jobs eram criados mas nunca processados.

## Problemas Identificados

### 1. Worker Nunca Executado em Desenvolvimento

**Sintoma:**
```
POST /api/wizard/6/submit 200 in 1817ms
GET /api/wizard/6 200 in 45ms
GET /api/wizard/6 200 in 43ms
... (polling infinito)
```

**Causa Raiz:** Vercel Cron (`vercel.json`) só funciona em produção. Em desenvolvimento local, o worker endpoint nunca é acionado.

**Solução:** Auto-trigger do worker após criar jobs:

```typescript
// src/app/api/wizard/[id]/submit/route.ts
if (isDevelopment()) {
  triggerWorker().catch((err) => {
    console.error("Failed to trigger worker in development:", err);
  });
}
```

### 2. Worker Endpoint Bloqueado por Clerk Auth

**Sintoma:** `curl -X POST http://localhost:3000/api/workers` retorna redirecionamento para login.

**Causa Raiz:** Endpoint `/api/workers` estava protegido por Clerk middleware.

**Solução:** Bypass do Clerk para worker route:

```typescript
// src/proxy.ts
const isWorkerRoute = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname === "/api/workers";
};

export default clerkMiddleware(async (auth, request) => {
  if (isWorkerRoute(request)) {
    return NextResponse.next();
  }
  // ... rest of middleware
});
```

### 3. Jobs Antigos Bloqueando Fila (FIFO)

**Sintoma:** Worker processa job 6 (wizard 3) em vez de job 9 (wizard 6 atual).

**Causa Raiz:** Redis queue processa em FIFO (First In First Out). 5 jobs antigos acumulados bloqueavam o job atual.

**Solução:** Limpar jobs pending antigos e filas Redis:

```javascript
// Delete old pending jobs
await sql`DELETE FROM jobs WHERE status = 'pending' AND id < 9`;

// Clear Redis queues
await redis.del('jobs:pending');
await redis.del('jobs:processing');

// Re-enqueue current job
await redis.lpush('jobs:pending', '999999:' + Date.now() + ':9');
```

### 4. JSON.parse Error no Step 4

**Sintoma:**
```
Error polling wizard status: SyntaxError: "[object Object]" is not valid JSON
    at JSON.parse (<anonymous>)
    at Step4Generation.useEffect.pollWizardStatus (step-4-generation.tsx:129:59)
```

**Causa Raiz:** PostgreSQL JSONB columns são retornadas como objetos JavaScript pelo Drizzle ORM. `response.json()` também já faz o parse da resposta HTTP.

**Solução:** Verificar tipo antes de fazer parse:

```typescript
const generatedContent: GeneratedContent = typeof wizard.generatedContent === 'string'
  ? JSON.parse(wizard.generatedContent)
  : wizard.generatedContent;
```

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/proxy.ts` | Bypass Clerk auth para `/api/workers` |
| `src/lib/queue/client.ts` | Adicionado `triggerWorker()` helper |
| `src/app/api/wizard/[id]/submit/route.ts` | Auto-trigger em desenvolvimento |
| `src/app/(app)/wizard/components/steps/step-4-generation.tsx` | Fix JSON.parse com type check |

## Padrões Estabelecidos

### Development vs Production Worker Triggering

| Ambiente | Trigger |
|----------|---------|
| Development | Manual via `triggerWorker()` após criar job |
| Production | Vercel Cron a cada minuto |

### Queue Debugging Checklist

1. Verificar se worker está sendo acionado
2. Verificar `WORKER_SECRET` correto
3. Limpar jobs pending antigos
4. Limpar filas Redis
5. Re-enqueue job atual
6. Trigger worker manualmente

### JSONB Parsing Pattern

```typescript
// Padrão para campos JSONB do PostgreSQL
const parsedValue = typeof dbValue === 'string'
  ? JSON.parse(dbValue)
  : dbValue;
```

## Comandos Úteis

```bash
# Trigger worker manualmente
curl -X POST http://localhost:3000/api/workers \
  -H "Authorization: Bearer dev-secret-change-in-production"

# Verificar estado do wizard
curl http://localhost:3000/api/wizard/6
```

## Documentação Relacionada

- `.context/docs/known-and-corrected-errors/032-json-parse-object-error.md`
- `.serena/memories/wizard-patterns.md`
- `.serena/memories/queue-patterns.md`
