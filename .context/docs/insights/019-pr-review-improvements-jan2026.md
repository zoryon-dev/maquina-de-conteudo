# PR Review Improvements - Janeiro 2026

Melhorias implementadas após PR review do branch `feat/database-embedding` usando toolkit especializado.

## Resumo Executivo

PR review identificou 23 itens entre bugs e sugestões. Implementadas correções críticas e importantes focadas em tratamento de erros type-safe e eliminação de `any` types.

`★ Insight ─────────────────────────────────────`
**Por que error handling importou?**
1. Contexto perdido: Erros genéricos não informam qual job falhou
2. Debug difícil: Sem código de erro específico, logs são inúteis
3. UX ruim: Erros em batch operations eram silenciosos
`─────────────────────────────────────────────────`

## Mudanças Implementadas

### 1. Hierarquia de Erros Type-Safe (Feature)

**Problema**: Catch-all genérico perdia contexto de debug.

**Solução**: Nova classe base `AppError` com tipos específicos.

```typescript
// src/lib/errors.ts - NOVO ARQUIVO (259 linhas)

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code, statusCode: this.statusCode, details: this.details }
  }
}

// Tipos específicos
export class ValidationError extends AppError { /* 400 */ }
export class AuthError extends AppError { /* 401 */ }
export class ForbiddenError extends AppError { /* 403 */ }
export class NotFoundError extends AppError { /* 404 */ }
export class NetworkError extends AppError { /* 503 */ }
export class RateLimitError extends AppError { /* 429 */ }
export class ConfigError extends AppError { /* 500 */ }
export class JobError extends AppError {
  constructor(message: string, public jobId?: number, details?: unknown) {
    super(message, "JOB_ERROR", 500, { jobId, ...details })
  }
}
```

**Arquivo**: `src/lib/errors.ts` (novo)

---

### 2. JobError com Contexto (Bug Fix)

**Problema**: Falha de enqueue não informava qual job.

**Solução**: `JobError` inclui `jobId` no contexto.

```typescript
// src/lib/queue/client.ts

export async function enqueueJob(jobId: number, priority = 0): Promise<void> {
  try {
    await redis.lpush(JOB_QUEUE, score)
  } catch (error) {
    const appError = toAppError(error, "QUEUE_ENQUEUE_FAILED")
    console.error("[Queue] Erro ao enfileirar job:", appError)
    throw new JobError(`Failed to enqueue job ${jobId}`, jobId, appError)
    //                                                     ^^^^^^
    //                                              contexto de debug
  }
}
```

**Arquivo**: `src/lib/queue/client.ts`

---

### 3. Error Grouping em Batch Operations (Bug Fix)

**Problema**: Falhas em loops eram silenciosas após log.

**Solução**: Agrupar erros e retornar no response.

```typescript
// src/lib/social/workers/fetch-metrics.ts

export interface MetricsFetchError {
  postId: number
  platform: string
  error: string
}

const errors: MetricsFetchError[] = []

for (const post of postsToUpdate) {
  try {
    await fetchMetrics(post)
  } catch (error) {
    errors.push({
      postId: post.id,
      platform: post.platform,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Log summary
if (errors.length > 0) {
  console.warn(`[MetricsFetch] ${errors.length}/${items.length} failed`)
}

return { success: true, errors: errors.length > 0 ? errors : undefined }
```

**Arquivo**: `src/lib/social/workers/fetch-metrics.ts`

---

### 4. Safe JSON Parsing (Bug Fix)

**Problema**: `JSON.parse()` travava workers com dados malformados.

**Solução**: Helper `parseMetadataSafely()` com try-catch.

```typescript
// src/app/api/workers/route.ts

function parseMetadataSafely(
  metadataJson: string | null | undefined
): Record<string, unknown> {
  if (!metadataJson) return {}
  try {
    const parsed = JSON.parse(metadataJson)
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch (error) {
    console.error("[Workers] Failed to parse metadata JSON:", error)
    return {}  // fallback vazio
  }
}
```

**Arquivos**: `src/app/api/workers/route.ts`, `src/app/api/library/[id]/regenerate-images/route.ts`

---

### 5. Upload Failure Tracking (Bug Fix)

**Problema**: Falhas de upload para R2 não eram reportadas.

**Solução**: Tracking array + warning no log.

```typescript
// src/app/api/workers/route.ts

const uploadFallbacks: Array<{ slideNumber: number; error: string }> = []

for (const img of newImages) {
  if (img.imageUrl.startsWith('data:image/')) {
    try {
      const storageUrl = await uploadBase64ImageToStorage(img.imageUrl, wizardId, slideNumber)
      uploadedImageUrls.push(storageUrl)
    } catch (uploadError) {
      const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError)
      console.error(`[WIZARD-IMAGE] Failed to upload image ${slideNumber}:`, errorMsg)
      uploadedImageUrls.push(img.imageUrl)  // fallback
      uploadFallbacks.push({ slideNumber, error: errorMsg })
    }
  }
}

if (uploadFallbacks.length > 0) {
  console.warn(`[WIZARD-IMAGE] ⚠️ ${uploadFallbacks.length} images fell back to base64`)
}

return {
  // ...
  uploadFallbacks: uploadFallbacks.length > 0 ? uploadFallbacks : undefined,
}
```

**Arquivo**: `src/app/api/workers/route.ts`

---

### 6. Token Expiry Marking (Bug Fix)

**Problema**: Tokens expirados não eram marcados no banco.

**Solução**: Função `markConnectionExpired()` + detecção de erro.

```typescript
// src/app/api/social/publish/route.ts

async function markConnectionExpired(connectionId: number): Promise<void> {
  await db
    .update(socialConnections)
    .set({
      status: SocialConnectionStatus.EXPIRED,
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, connectionId))
}

// No catch
const isTokenError =
  error instanceof SocialApiError &&
  (error.code === SocialErrorCode.TOKEN_EXPIRED ||
    error.message.includes("Invalid OAuth access token") ||
    (error.message.includes("token") && error.message.includes("expired")))

if (isTokenError && connection) {
  await markConnectionExpired(connection.id)
  return NextResponse.json(
    {
      error: `Sua conexão com ${platform} expirou. Por favor, reconecte.`,
      code: "TOKEN_EXPIRED",
    },
    { status: 400 }
  )
}
```

**Arquivo**: `src/app/api/social/publish/route.ts`

---

### 7. Type Safety - VideoScriptStructured (Bug Fix)

**Problema**: Tipo `any` perdia type safety do roteiro.

**Solução**: Importar tipo correto.

```typescript
// src/types/library-video.ts

import type { VideoScriptStructured } from "@/lib/wizard-services/types"
export type { VideoScriptStructured }

// Na interface
script?: {
  roteiro?: VideoScriptStructured  // era: any
  topicos?: string[]
  duracao?: string
}
```

**Arquivo**: `src/types/library-video.ts`

---

## Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Debug de erros** | "Error: unknown" | "JobError: Failed to enqueue job 123" |
| **Batch ops** | Falhas silenciosas | Array de erros no response |
| **JSON malformado** | Worker trava | Fallback para {} |
| **Upload R2** | Fallback invisível | Warning + array de falhas |
| **Token expirado** | Re-tentativas falham | Conexão marcada no DB |
| **Type safety** | `any` em roteiro | `VideoScriptStructured` |

`★ Insight ─────────────────────────────────────`
**Padrões estabelecidos:**
1. **Sempre** usar `toAppError()` para normalizar erros desconhecidos
2. **Sempre** agrupar erros em loops com `errors.push({ id, error })`
3. **Sempre** logar summary: `${errors.length}/${total} failed`
4. **Nunca** usar `any` quando tipo específico existe
`─────────────────────────────────────────────────`

## Commits Relacionados

- `188ddae` - Phase 1 & 2: Critical + Important fixes
- `d8c148b` - Phase 3: Suggestions (VideoScriptStructured)
- `d46cfcc` - Phase 3: Metadata validation
- `a6ac165` - Phase 3: Error grouping (fetch-metrics)

## Documentação Atualizada

- **Serena**: `typescript-patterns`, `queue-patterns`, `social-integration-patterns`
- **Mem0**: 4 novas memórias sobre error handling
- **Architecture**: Seção "Error Handling Architecture" adicionada
- **CLAUDE.md**: Seção "Error Handling" em Regras de Código
- **Erros**: `036-pr-review-error-handling-jan2026.md`

## Data

Janeiro 2026
