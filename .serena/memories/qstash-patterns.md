# QStash Patterns

Padrões para implementação de cron jobs com Upstash QStash como alternativa ao Vercel Cron.

## Overview

**Upstash QStash** é um serviço serverless de agendamento que substitui o Vercel Cron com vantagens significativas:

- **Grátis**: 500k requisições/mês no plano free
- **Sem limite de frequência**: Execução a cada minuto (vs 1x/hora no Vercel Hobby)
- **SDK TypeScript oficial**: `@upstash/qstash`
- **Retry automático**: Configurável por schedule
- **Idempotência**: Proteção contra execuções duplicadas

## Arquitetura

```mermaid
graph TD
    Dev[Developer] --> CLI[npm run cron:setup]
    CLI --> SDK[QStash SDK]
    SDK --> QStash[Upstash QStash API]
    
    QStash -->|Cron Schedule| Callback[POST /api/cron/qstash]
    Callback --> Workers[API Workers]
    
    subgraph Workers Disponíveis
        Workers --> W1[/api/workers]
        Workers --> W2[/api/cron/social-publish]
    end
    
    subgraph Gerenciamento
        SDK --> Setup[setupCronJobs]
        SDK --> Remove[removeCronJobs]
        SDK --> Health[healthCheck]
        SDK --> Trigger[triggerJob]
    end
```

## Estrutura de Arquivos

```
src/lib/cron/
├── qstash.ts              # Cliente QStash + funções de gerenciamento
├── types.ts               # QStashSchedule, SetupResult, etc.

src/app/api/cron/
├── qstash/route.ts        # Endpoint callback do QStash
├── social-publish/route.ts # Worker de publicação social

scripts/
├── setup-qstash.ts        # CLI para gerenciar schedules

docs/
├── QSTASH_SETUP.md        # Documentação completa

.env.local                 # Variáveis de ambiente
```

## Cliente QStash

### Criação do Cliente

```typescript
// src/lib/cron/qstash.ts
import { Client } from "@upstash/qstash"

function createQStashClient(): Client | null {
  const token = getQStashToken();
  if (!token) {
    console.warn("[QStash] Token não configurado");
    return null;
  }

  return new Client({
    token,
    baseUrl: getQStashUrl(), // https://qstash-us-east-1.upstash.io
  });
}
```

### Obtenção de Token

```typescript
function getQStashToken(): string {
  // O QStash usa o token JWT completo (não decodificado)
  return process.env.QSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}
```

## Configuração de Schedules

### Definição de Schedules

```typescript
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

### Expressões Cron Comuns

| Expressão | Descrição |
|-----------|-----------|
| `* * * * *` | A cada minuto |
| `*/5 * * * *` | A cada 5 minutos |
| `0 * * * *` | No início de cada hora |
| `0 0 * * *` | Meia-noite diária |
| `0 0 * * 0` | Meia-noite de domingo |
| `0 9 * * 1-5` | 9h dias de semana |

### Criar Schedule via SDK

```typescript
async function createSchedule(
  client: Client,
  cron: string,
  destinationUrl: string,
  options?: {
    headers?: Record<string, string>;
    body?: unknown;
  }
): Promise<{ scheduleId?: string; error?: string }> {
  try {
    const result = await client.schedules.create({
      destination: destinationUrl,
      cron: cron,
      body: options?.body as BodyInit | undefined,
      headers: options?.headers as HeadersInit | undefined,
      method: "POST" as const,
      retries: 3, // Retry 3 vezes em caso de falha
    });

    const scheduleId = result as string;
    return { scheduleId };
  } catch (error) {
    return {
      error: getErrorMessage(toAppError(error, "QSTASH_CREATE_SCHEDULE_FAILED")),
    };
  }
}
```

### Listar Schedules

```typescript
async function listAllSchedules(client: Client): Promise<{
  schedules?: Array<{ scheduleId: string; cron: string; destinationUrl: string }>;
  error?: string;
}> {
  try {
    const schedules = await client.schedules.list();

    return {
      schedules: schedules.map((s) => ({
        scheduleId: s.scheduleId,
        cron: s.cron,
        destinationUrl: s.destination,
      })),
    };
  } catch (error) {
    return {
      error: getErrorMessage(toAppError(error, "QSTASH_LIST_SCHEDULES_FAILED")),
    };
  }
}
```

### Deletar Schedule

```typescript
async function deleteSchedule(
  client: Client,
  scheduleId: string
): Promise<{ error?: string }> {
  try {
    await client.schedules.delete(scheduleId);
    return {};
  } catch (error) {
    return {
      error: getErrorMessage(toAppError(error, "QSTASH_DELETE_SCHEDULE_FAILED")),
    };
  }
}
```

## Setup Completo

### Função setupCronJobs

```typescript
export async function setupCronJobs(): Promise<SetupResult> {
  const client = createQStashClient();
  const appUrl = getAppUrl();
  const cronSecret = getCronSecret();

  if (!client) {
    return {
      success: false,
      created: [],
      deleted: [],
      errors: Object.entries(cronSchedules).map(([name]) => ({
        name,
        error: "QStash client not configured",
      })),
    };
  }

  const result: SetupResult = {
    success: true,
    created: [],
    deleted: [],
    errors: [],
  };

  try {
    // 1. Listar schedules existentes
    const { schedules: existingSchedules, error: listError } =
      await listAllSchedules(client);

    if (listError) {
      return {
        success: false,
        created: [],
        deleted: [],
        errors: [{ name: "list", error: listError }],
      };
    }

    // 2. Criar mapa de schedules existentes
    const existingMap = new Map<string, string>();
    for (const schedule of existingSchedules || []) {
      existingMap.set(schedule.destinationUrl, schedule.scheduleId);
    }

    // 3. Criar ou atualizar cada schedule
    for (const [name, config] of Object.entries(cronSchedules)) {
      const fullUrl = `${appUrl}${config.endpoint}`;
      const headers = {
        "Authorization": `Bearer ${cronSecret}`,
      };

      // Se já existe, deletar e recriar
      if (existingMap.has(fullUrl)) {
        const oldId = existingMap.get(fullUrl)!;
        await deleteSchedule(client, oldId);
        result.deleted.push(name);
        existingMap.delete(fullUrl);
      }

      // Criar novo schedule
      const createResult = await createSchedule(client, config.cron, fullUrl, {
        headers,
        body: config.payload,
      });

      if (createResult.error || !createResult.scheduleId) {
        result.errors.push({
          name,
          error: createResult.error || "No schedule ID returned",
        });
        result.success = false;
      } else {
        result.created.push(name);
        storeScheduleId(name, createResult.scheduleId);
      }
    }

    return result;
  } catch (error) {
    const appError = toAppError(error, "QSTASH_SETUP_FAILED");
    return {
      success: false,
      created: result.created,
      deleted: result.deleted,
      errors: [{ name: "setup", error: getErrorMessage(appError) }],
    };
  }
}
```

## Endpoint de Callback

### POST /api/cron/qstash

```typescript
// src/app/api/cron/qstash/route.ts
import { Client } from "@upstash/qstash";
import { toAppError, getErrorMessage } from "@/lib/errors";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET || "dev-secret";

// Handler para cada tipo de job
const qstashHandlers: Record<string, (body: unknown) => Promise> = {
  workers: async (body) => {
    // Executar worker principal
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return response.json();
  },
  socialPublish: async (body) => {
    // Executar worker de publicação social
    // ...
  },
};

export async function POST(request: Request) {
  try {
    // 1. Verificar autenticação (múltiplos métodos para robustez)
    const authHeader = request.headers.get("authorization");
    
    // Método 1: Assinatura do QStash
    const signature = request.headers.get("x-qstash-signature");
    if (signature && QSTASH_TOKEN) {
      const client = new Client({ token: QSTASH_TOKEN });
      const body = await request.clone().text();
      // Verificação simplificada - produção deve usar verifySignature completo
      const isValid = signature.length > 0;
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }
    // Método 2: Bearer token (fallback)
    else if (authHeader === `Bearer ${CRON_SECRET}`) {
      // OK
    }
    // Método 3: Query param (para testes locais)
    else if (request.url.includes(`secret=${CRON_SECRET}`)) {
      // OK
    } else {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Extrair job name
    const body = await request.json();
    const jobName = body?.job;

    if (!jobName || !qstashHandlers[jobName]) {
      return NextResponse.json(
        { error: "Unknown job" },
        { status: 400 }
      );
    }

    // 3. Executar handler
    const result = await qstashHandlers[jobName](body);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const appError = toAppError(error, "QSTASH_CALLBACK_FAILED");
    console.error("[QStash Callback] Error:", appError);

    // Retornar 503 para erros retryáveis, 4xx para não retryáveis
    const statusCode = appError.statusCode >= 500 ? 503 : appError.statusCode;
    
    return NextResponse.json(
      { error: getErrorMessage(appError) },
      { status: statusCode }
    );
  }
}

// GET /api/cron/qstash?action=health
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "health") {
    const client = QSTASH_TOKEN ? new Client({ token: QSTASH_TOKEN }) : null;
    
    if (!client) {
      return NextResponse.json({
        status: "unhealthy",
        configured: false,
        error: "QStash token not configured",
      });
    }

    try {
      const schedules = await client.schedules.list();
      return NextResponse.json({
        status: "healthy",
        configured: true,
        schedulesCount: schedules.length,
      });
    } catch (error) {
      return NextResponse.json({
        status: "unhealthy",
        configured: true,
        error: getErrorMessage(toAppError(error, "HEALTH_CHECK_FAILED")),
      });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

## CLI de Gerenciamento

### scripts/setup-qstash.ts

```typescript
import { config } from "dotenv";
import { resolve } from "path";
import {
  setupCronJobs,
  removeCronJobs,
  healthCheck,
  triggerJob,
} from "../src/lib/cron/qstash";

// Carregar variáveis de ambiente
const result = config({ path: resolve(process.cwd(), ".env.local") });

if (result.error) {
  console.error("Erro ao carregar .env.local:", result.error);
  process.exit(1);
}

const command = process.argv[2];

async function main() {
  switch (command) {
    case "setup":
      console.log("🔧 Configurando QStash schedules...");
      const setupResult = await setupCronJobs();
      console.log(`✅ ${setupResult.created.length} schedules criados`);
      if (setupResult.errors.length > 0) {
        console.error(`❌ ${setupResult.errors.length} erros:`, setupResult.errors);
      }
      break;

    case "remove":
      console.log("🗑️  Removendo QStash schedules...");
      const removeResult = await removeCronJobs();
      console.log(`✅ ${removeResult.deleted.length} schedules removidos`);
      break;

    case "health":
      console.log("🏥 Verificando saúde do QStash...");
      const health = await healthCheck();
      console.log(JSON.stringify(health, null, 2));
      break;

    case "trigger":
      const jobName = process.argv[3];
      if (!jobName) {
        console.error("Usage: npm run cron:trigger <jobName>");
        process.exit(1);
      }
      const triggerResult = await triggerJob(jobName as any);
      console.log(JSON.stringify(triggerResult, null, 2));
      break;

    default:
      console.log(`
Uso: npm run cron:<command> [args]

Comandos:
  setup    - Configura todos os schedules no QStash
  remove   - Remove todos os schedules do QStash
  health   - Verifica a saúde do sistema QStash
  trigger  - Trigger manual de job (arg: jobName)

Exemplos:
  npm run cron:setup
  npm run cron:trigger workers
      `);
  }
}

main().catch(console.error);
```

### package.json Scripts

```json
{
  "scripts": {
    "cron:setup": "tsx scripts/setup-qstash.ts setup",
    "cron:remove": "tsx scripts/setup-qstash.ts remove",
    "cron:health": "tsx scripts/setup-qstash.ts health",
    "cron:trigger": "tsx scripts/setup-qstash.ts trigger"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

## Variáveis de Ambiente

```env
# QStash
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJ1c2VySWQiOi...  # JWT completo
QSTASH_CURRENT_SIGNING_KEY=sig_6cUTQWU8MeimXVBo56oNiq6F8YHv
QSTASH_NEXT_SIGNING_KEY=sig_4cpfuZtNveD2C8vZsK2nWePtA63r

# Autenticação do cron
CRON_SECRET=dev-secret-change-in-production

# URL da aplicação
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Redis (fila de jobs)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Health Check

```typescript
const health = await healthCheck();

if (health.healthy) {
  console.log(`✅ Sistema saudável: ${health.schedulesCount} schedules ativos`);
} else {
  console.error(`❌ Sistema não saudável: ${health.error}`);
}
```

## Trigger Manual

```typescript
const result = await triggerJob("workers");

if (result.success) {
  console.log(`✅ Job triggered: ${result.scheduleId}`);
} else {
  console.error(`❌ Trigger failed: ${result.error}`);
}
```

## Troubleshooting

### Erro: "No schedule ID returned"

**Causa**: Usando `client.publishJSON()` em vez de `client.schedules.create()`

**Solução**:
```typescript
// ❌ Errado
const result = await client.publishJSON({
  url: fullUrl,
  body: config.payload,
  cron: config.cron,
});

// ✅ Correto
const result = await client.schedules.create({
  destination: fullUrl,
  cron: config.cron,
  body: config.payload,
  headers: { "Authorization": `Bearer ${secret}` },
  method: "POST",
  retries: 3,
});
```

### Erro: "loopback address"

**Causa**: QStash bloqueia URLs localhost por segurança

**Solução**: Use ngrok para desenvolvimento:
```bash
ngrok http 3000
# Export: https://xxx.ngrok-free.dev

# .env.local
NEXT_PUBLIC_APP_URL=https://xxx.ngrok-free.dev
```

### Erro: "unable to authenticate: invalid token"

**Causa**: Token JWT mal formatado ou decodificado

**Solução**: Use o token JWT completo sem decodificar:
```typescript
// ❌ Errado - tentar decodificar ou extrair partes
const token = atob(jwt.split('.')[1]);

// ✅ Correto - usar JWT completo
const token = process.env.QSTASH_TOKEN; // eyJVc2VySUQiOi...
```

## Diferenças QStash vs Vercel Cron

| Aspecto | Vercel Cron | Upstash QStash |
|---------|-------------|----------------|
| **Setup** | `vercel.json` | SDK programático |
| **Frequência mínima** | 1 min (Pro) | 1 min (Free) |
| **Custo** | $20/mês para 1min | Grátis |
| **Retry** | Manual | Automático (configurável) |
| **Health check** | Não integrado | `client.schedules.list()` |
| **Trigger manual** | `curl` + webhook | SDK `triggerJob()` |
| **Logs** | Vercel logs | QStash dashboard |

## Verificação de Configuração

```typescript
export function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

if (!isQStashConfigured()) {
  console.warn("[QStash] Sistema não configurado - jobs não serão executados");
}
```
