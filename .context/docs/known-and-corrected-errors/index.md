# Known Errors and Solutions

Documentação de erros encontrados durante o desenvolvimento e suas soluções.

## Erros de TypeScript

### 1. "Duplicate identifier" em imports

**Erro:**
```
Duplicate identifier 'eq', 'desc', 'sql', 'and'
```

**Causa:** Import duplicado quando usando `import` no topo e depois novamente no final do arquivo.

**Solução:** Manter todos os imports no topo do arquivo:
```typescript
// ✅ Correto
import { eq, desc, sql, and } from "drizzle-orm";

// ❌ Errado - não importar novamente no final
import { eq, desc, sql, and } from "drizzle-orm";
```

### 2. "Argument of type '{}' is not assignable to parameter of type 'JobPayload'"

**Erro:**
```
Type error: Argument of type '{}' is not assignable to parameter of type 'JobPayload'.
```

**Causa:** Usar `unknown` como tipo de payload ao invés do tipo union correto.

**Solução:** Tipar corretamente o body da requisição:
```typescript
// ✅ Correto
const body = await request.json() as {
  type: JobType;
  payload: JobPayload;  // Usar o tipo union
};

// ❌ Errado
const body = await request.json() as {
  type: JobType;
  payload: unknown;
};
```

### 3. "Property 'where' does not exist on type 'Omit<PgSelectBase...'"

**Erro:**
```
Property 'where' does not exist on type 'Omit<PgSelectBase...'
```

**Causa:** Tentar encadear múltiplas chamadas `.where()` em uma query já construída.

**Solução:** Usar `and()` para combinar múltiplas condições:
```typescript
// ✅ Correto
const conditions = [eq(jobs.userId, userId)];
if (filters?.status) {
  conditions.push(eq(jobs.status, filters.status as any));
}
await db.select().from(jobs).where(and(...conditions));

// ❌ Errado
const query = db.select().from(jobs).where(eq(jobs.userId, userId));
query.where(eq(jobs.status, status));  // Não funciona
```

### 4. "Argument of type 'number | null' is not assignable to parameter of type 'number'"

**Erro:**
```
Type error: 'job.attempts' is possibly 'null'
```

**Causa:** Colunas do banco podem ser `null` mas TypeScript espera `number`.

**Solução:** Usar null coalescing operator:
```typescript
// ✅ Correto
const attempts = job.attempts ?? 0;
const maxAttempts = job.maxAttempts ?? 3;
const shouldRetry = attempts + 1 < maxAttempts;

// ❌ Errado
const shouldRetry = job.attempts + 1 < job.maxAttempts;
```

## Erros de Build

### 5. "The 'middleware' file convention is deprecated"

**Aviso:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Causa:** Next.js 16+ prefere `proxy.ts` ao invés de `middleware.ts`.

**Solução:** Renomear `src/middleware.ts` → `src/proxy.ts` (futuramente).

**Status:** Apenas um aviso, o código funciona normalmente.

## Erros de Banco de Dados

### 6. "Connection string provided to neon() is not a valid URL"

**Erro:**
```
Database connection string provided to `neon()` is not a valid URL.
Connection string: postgresql://project-id:hostname/database
```

**Causa:** Connection string incompleta, faltando usuário e senha.

**Solução:** Usar o formato completo com pooler:
```env
# ❌ Errado
DATABASE_URL=postgresql://project-id:hostname/database

# ✅ Correto
DATABASE_URL=postgresql://username:password@hostname-pooler.region.neon.tech/database?sslmode=require
```

**Como obter:** Use `get_connection_string` do MCP Neon ou Neon Dashboard.

### 7. "syntax error at or near 'NOT'" (PostgreSQL)

**Erro:**
```
syntax error at or near "NOT"
```

**Causa:** PostgreSQL não suporta `IF NOT EXISTS` com `CREATE TYPE`.

**Solução:** Remover `IF NOT EXISTS` de enums:
```sql
-- ❌ Errado
CREATE TYPE IF NOT EXISTS job_type AS ENUM (...);

-- ✅ Correto
CREATE TYPE job_type AS ENUM (...);
```

## Erros de Autenticação

### 8. Webhook Clerk não funciona em localhost

**Problema:** Clerk não consegue enviar webhooks para `http://localhost:3000`.

**Solução:** Usar ngrok para expor localhost:
```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Expor porta 3000
ngrok http 3000

# 3. Copiar a URL gerada (ex: https://abc123.ngrok-free.app)

# 4. No Clerk Dashboard → Webhooks → Add Endpoint:
#    URL: https://abc123.ngrok-free.app/api/webhooks/clerk

# 5. Copiar o CLERK_WEBHOOK_SECRET gerado para o .env.local
```

## Erros de Redis/Upstash

### 9. "UPSTASH_REDIS_REST_URL is not set"

**Erro:** Warning no console sobre variáveis de ambiente não configuradas.

**Solução:** Criar banco Redis gratuito em https://upstash.com e adicionar ao `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Nota:** O sistema funciona mesmo sem Redis (jobs ficam apenas no DB), mas o processamento assíncrono não funciona.

## Padrões de Solução

### 1. Sempre validar tipos de DB
```typescript
// Campos do banco podem ser null
const value = row.nullableField ?? defaultValue;
```

### 2. Usar type assertions com cuidado
```typescript
// Evitar 'as any' quando possível
status: filters.status as "pending" | "processing" | "completed" | "failed"

// Melhor: criar tipos explícitos
type JobStatusFilter = "pending" | "processing" | "completed" | "failed" | undefined;
```

### 3. Testar migrações em branch temporário
```typescript
// Usar MCP Neon para testar antes de aplicar
await prepare_database_migration({ ... });
await describe_branch({ branchId: "temp-branch" });
await complete_database_migration({ migrationId: "..." });
```
