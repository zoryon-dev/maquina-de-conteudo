# Error Handling Improvements (Jan 2026)

Correções implementadas após PR review do branch `feat/database-embedding`. Foco em substituir catch-all genéricos por tratamento de erros type-safe.

---

## Problema #1: Catch-All Error Handling

**Sintoma**: Erros eram tratados de forma genérica, perdendo contexto e dificultando debug.

**Causa**: Uso generalizado de `catch (error)` sem tipagem específica.

**Antes**:
```typescript
// ❌ ERRADO - Perde tipo e contexto
try {
  await operation()
} catch (error) {
  console.error(error)
  return { error: "Something went wrong" }
}
```

**Correção**: Criar hierarquia de erros específicos em `src/lib/errors.ts`.

**Arquivo NOVO**: `src/lib/errors.ts` (259 linhas)

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace?.(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

// Tipos específicos
export class ValidationError extends AppError { /* ... */ }
export class AuthError extends AppError { /* ... */ }
export class JobError extends AppError {
  constructor(message: string, public jobId?: number, details?: unknown) {
    super(message, "JOB_ERROR", 500, { jobId, ...details })
  }
}
// ... ForbiddenError, NotFoundError, NetworkError, RateLimitError, ConfigError

// Helpers
export function toAppError(error: unknown, defaultCode: string = "UNKNOWN_ERROR"): AppError { /* ... */ }
export function getErrorMessage(error: unknown): string { /* ... */ }
export function hasErrorCode(error: unknown): error is { code: string; message: string } { /* ... */ }
```

---

## Problema #2: Queue Operations Sem Contexto

**Sintoma**: Falha de enqueue não registrava qual job falhou.

**Causa**: Erro genérico sem ID do job.

**Arquivo**: `src/lib/queue/client.ts`

**Antes**:
```typescript
// ❌ ERRADO - Sem contexto do job
export async function enqueueJob(jobId: number, priority = 0): Promise<void> {
  try {
    await redis.lpush(JOB_QUEUE, score)
  } catch (error) {
    console.error("Erro ao enfileirar:", error)
    throw new Error("Failed to enqueue")  // Qual job?
  }
}
```

**Depois**:
```typescript
// ✅ CORRETO - JobError com jobId
import { JobError, toAppError } from "@/lib/errors"

export async function enqueueJob(jobId: number, priority = 0): Promise<void> {
  if (!isQueueConfigured()) {
    throw new QueueNotConfiguredError()
  }

  try {
    const score = `${String(999999 - priority).padStart(6, "0")}:${Date.now()}:${jobId}`
    await redis.lpush(JOB_QUEUE, score)
  } catch (error) {
    const appError = toAppError(error, "QUEUE_ENQUEUE_FAILED")
    console.error("[Queue] Erro ao enfileirar job:", appError)
    throw new JobError(`Failed to enqueue job ${jobId}`, jobId, appError)
  }
}
```

---

## Problema #3: Erros em Loops Silenciosos

**Sintoma**: Quando um item falhava em um loop, o erro era logado mas o restante da operação continuava sem reportar falhas.

**Causa**: Falta de agrupamento de erros em operações de lote.

**Arquivo**: `src/lib/social/workers/fetch-metrics.ts`

**Antes**:
```typescript
// ❌ ERRADO - Erros perdidos após log
for (const post of postsToUpdate) {
  try {
    await fetchMetrics(post)
  } catch (error) {
    console.error(`Error for post ${post.id}:`, error)
    // Continua, mas não reporta falhas
  }
}
return { success: true }
```

**Depois**:
```typescript
// ✅ CORRETO - Agrupa e reporta falhas
export interface MetricsFetchError {
  postId: number
  platform: string
  error: string
}

const errors: MetricsFetchError[] = []
let updatedCount = 0

for (const post of postsToUpdate) {
  try {
    await fetchMetrics(post)
    updatedCount++
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[MetricsFetch] Error fetching metrics for post ${post.id}:`, errorMsg)
    errors.push({
      postId: post.id,
      platform: post.platform,
      error: errorMsg,
    })
  }
}

// Log summary
if (errors.length > 0) {
  console.warn(`[MetricsFetch] Completed with ${errors.length} errors out of ${postsToUpdate.length} posts`)
  console.warn(`[MetricsFetch] Failed posts: ${errors.map((e) => `#${e.postId}`).join(", ")}`)
}

return { success: true, updatedCount, errors: errors.length > 0 ? errors : undefined }
```

---

## Problema #4: JSON.parse Crashing Workers

**Sintoma**: Workers travavam com JSON malformado nos metadados.

**Causa**: `JSON.parse()` sem try-catch.

**Arquivos**:
- `src/app/api/workers/route.ts`
- `src/app/api/library/[id]/regenerate-images/route.ts`

**Antes**:
```typescript
// ❌ ERRADO - Crasha se JSON for inválido
const metadata = JSON.parse(item.metadata)
const wizardId = metadata.wizardId as string
```

**Depois**:
```typescript
// ✅ CORRETO - Parse seguro com fallback
function parseMetadataSafely(
  metadataJson: string | null | undefined
): Record<string, unknown> {
  if (!metadataJson) return {}
  try {
    const parsed = JSON.parse(metadataJson)
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {}
  } catch (error) {
    console.error("[Workers] Failed to parse metadata JSON:", error)
    return {}
  }
}

const metadata = parseMetadataSafely(item.metadata)
const wizardId = metadata.wizardId as string | undefined
```

---

## Problema #5: Tipo `any` em Script Estruturado

**Sintoma**: Type safety perdido no tipo do roteiro do wizard.

**Causa**: Uso de `any` para `VideoScriptStructured`.

**Arquivo**: `src/types/library-video.ts`

**Antes**:
```typescript
// ❌ ERRADO - Perde type safety
script?: {
  roteiro?: any  // Qualquer coisa pode ser passada
}
```

**Depois**:
```typescript
// ✅ CORRETO - Tipo importado
import type { VideoScriptStructured } from "@/lib/wizard-services/types"

script?: {
  roteiro?: VideoScriptStructured
}
```

---

## Problema #6: Upload Failures Não Reportados

**Sintoma**: Quando upload de imagem falhava, o fallback para base64 acontecia silenciosamente.

**Causa**: Falta de tracking e warning sobre fallbacks.

**Arquivo**: `src/app/api/workers/route.ts`

**Antes**:
```typescript
// ❌ ERRADO - Fallback silencioso
for (const img of newImages) {
  if (img.imageUrl.startsWith('data:image/')) {
    try {
      const storageUrl = await uploadBase64ImageToStorage(img.imageUrl, wizardId, slideNumber)
      uploadedImageUrls.push(storageUrl)
    } catch (uploadError) {
      console.error(`Failed to upload image ${slideNumber}:`, uploadError)
      uploadedImageUrls.push(img.imageUrl)  // Fallback silencioso
    }
  }
}
```

**Depois**:
```typescript
// ✅ CORRETO - Tracking + warning
const uploadFallbacks: Array<{ slideNumber: number; error: string }> = []

for (const img of newImages) {
  if (img.imageUrl.startsWith('data:image/')) {
    try {
      const storageUrl = await uploadBase64ImageToStorage(img.imageUrl, wizardId, slideNumber)
      uploadedImageUrls.push(storageUrl)
    } catch (uploadError) {
      const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError)
      console.error(`[WIZARD-IMAGE] Failed to upload image ${slideNumber}:`, errorMsg)
      uploadedImageUrls.push(img.imageUrl)
      uploadFallbacks.push({ slideNumber, error: errorMsg })
    }
  }
}

// Log summary
if (uploadFallbacks.length > 0) {
  console.warn(`[WIZARD-IMAGE] ⚠️ ${uploadFallbacks.length} images fell back to base64`)
}

return {
  success: true,
  images: newImages,
  wizardId,
  libraryItemId: wizard.libraryItemId,
  uploadFallbacks: uploadFallbacks.length > 0 ? uploadFallbacks : undefined,
}
```

---

## Problema #7: Token Expiry Sem Marcação de Conexão

**Sintoma**: Tokens expirados não eram marcados no banco, causando tentativas repetidas.

**Causa**: Falta de atualização do status da conexão após erro de token.

**Arquivo**: `src/app/api/social/publish/route.ts`

**Antes**:
```typescript
// ❌ ERRADO - Token expirado não é marcado
if (error.message.includes("token")) {
  return NextResponse.json({ error: "Token expired" }, { status: 400 })
}
// Próxima tentativa vai falhar novamente
```

**Depois**:
```typescript
// ✅ CORRETO - Marca conexão como expirada
async function markConnectionExpired(connectionId: number): Promise<void> {
  await db
    .update(socialConnections)
    .set({
      status: SocialConnectionStatus.EXPIRED,
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, connectionId))
}

// Uso no catch
const isTokenError =
  error instanceof SocialApiError &&
  (error.code === SocialErrorCode.TOKEN_EXPIRED ||
    error.code === SocialErrorCode.AUTH_FAILED ||
    error.message.includes("Invalid OAuth access token") ||
    error.message.includes("Cannot parse access token") ||
    (error.message.includes("token") && error.message.includes("expired")))

if (isTokenError && connection) {
  await markConnectionExpired(connection.id)
  return NextResponse.json(
    {
      error: `Sua conexão com ${platform === "instagram" ? "Instagram" : "Facebook"} expirou ou é inválida. Por favor, reconecte sua conta em Configurações > Redes Sociais.`,
      code: "TOKEN_EXPIRED",
    },
    { status: 400 }
  )
}
```

---

## Resumo das Mudanças

| Arquivo | Mudança | Tipo |
|---------|---------|------|
| `src/lib/errors.ts` | **NOVO** - Hierarquia de erros + helpers | Feature |
| `src/lib/queue/client.ts` | JobError com jobId context | Bug Fix |
| `src/lib/social/workers/fetch-metrics.ts` | Error grouping + summary | Bug Fix |
| `src/app/api/workers/route.ts` | Safe JSON parse + upload tracking | Bug Fix |
| `src/app/api/library/[id]/regenerate-images/route.ts` | Safe JSON parse | Bug Fix |
| `src/app/api/social/publish/route.ts` | Token expiry marking | Bug Fix |
| `src/types/library-video.ts` | VideoScriptStructured type | Bug Fix |
| `.serena/memories/typescript-patterns.md` | Error handling section | Docs |
| `.serena/memories/social-integration-patterns.md` | Error handling section | Docs |
| `.serena/memories/queue-patterns.md` | Error handling section | Docs |
| `.context/docs/architecture.md` | Error Handling Architecture | Docs |
| `CLAUDE.md` | Error Handling section | Docs |

---

## Impacto

**Antes**:
- Erros genéricos sem contexto
- Jobs falhavam sem ID para rastreamento
- Operações em lote perdiam erros individuais
- JSON malformado travava workers
- Tokens expirados não eram marcados

**Depois**:
- Erros type-safe com códigos específicos
- JobError inclui jobId para debug
- Batch operations reportam todas as falhas
- JSON parsing seguro com fallback
- Conexões expiradas marcadas automaticamente

---

## Referências

- PR Review: feat/database-embedding
- Data: Janeiro 2026
- Memórias Serena: `typescript-patterns`, `queue-patterns`, `social-integration-patterns`
- Insights: `.context/docs/insights/019-pr-review-improvements-jan2026.md`
