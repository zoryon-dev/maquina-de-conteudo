# Social Media Integration Patterns

Padrões de integração com Instagram e Facebook usando Meta Graph API.

## Visão Geral

O sistema integra com Instagram Content Publishing API e Facebook Pages API para:
- Publicar conteúdo diretamente (imediato)
- Agendar publicações para data futura
- Gerenciar conexões OAuth
- Consultar métricas de posts

## Configuração

### Environment Variables

```env
# Meta (Instagram & Facebook) OAuth
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:3000/api/social/callback

# Produção:
META_REDIRECT_URI=https://yourdomain.com/api/social/callback
```

### Meta App Console

Configurar em https://developers.facebook.com/apps:
1. Criar App tipo "Business"
2. Adicionar produto "Instagram Basic Display"
3. Configurar OAuth Redirect URLs
4. Adicionar permissões (scopes)

## Escopos (Scopes) Necessários

### Instagram
```typescript
const INSTAGRAM_SCOPES = [
  // Instagram scopes
  "instagram_basic",                    // Perfil básico
  "instagram_content_publish",          // Publicar mídia
  "instagram_manage_insights",          // Métricas
  "instagram_manage_comments",          // Moderar comentários
  // Facebook Page scopes (obrigatório para IG Business)
  "pages_show_list",                    // Listar páginas
  "pages_read_engagement",              // Engajamento
  "pages_read_user_content",            // Conteúdo
  "pages_manage_posts",                 // Criar posts
  "pages_manage_metadata",              // Metadados
  "business_management",                // Gerenciar business
]
```

## Estrutura do Banco de Dados

### socialConnections

```typescript
{
  id: number                    // Auto-increment
  userId: string                // Clerk user ID
  platform: "instagram" | "facebook"
  accountId: string             // IG User ID or FB Page ID
  accountName: string            // Display name
  accountUsername: string        // @username
  accessToken: string            // User Access Token (long-lived)
  pageId: string                 // Facebook Page ID (para IG)
  pageAccessToken: string         // Page Access Token (principal para publicação)
  pageName: string               // Facebook Page name
  tokenExpiresAt: Date           // Token expiration (60 dias)
  status: "active" | "expired" | "deleted"
  metadata: JSONB                // { igUserId, followersCount, mediaCount, permissions }
  lastVerifiedAt: Date
  createdAt: Date
  updatedAt: Date
  deletedAt: Date                // Soft delete
}
```

### oauthSessions

Sessões temporárias para OAuth flow (15 min TTL):

```typescript
{
  id: string                    // UUID
  userId: string                // Clerk user ID
  platform: "instagram" | "facebook"
  longLivedToken: string        // User Access Token (60 dias)
  tokenExpiresAt: Date
  pagesData: JSONB              // { pages: PageWithInstagram[] }
  expiresAt: Date               // 15 minutos
  createdAt: Date
}
```

### publishedPosts

```typescript
{
  id: number
  userId: string
  libraryItemId: number | null   // null para posts standalone
  platform: "instagram" | "facebook"
  mediaType: "image" | "video" | "carousel"
  caption: string | null
  mediaUrl: string | null          // JSON array de URLs
  status: "scheduled" | "publishing" | "published" | "failed" | "cancelled"
  scheduledFor: Date | null
  publishedAt: Date | null
  platformPostId: string | null   // ID do post na plataforma
  platformPostUrl: string | null  // URL permalink
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date                // Soft delete
}
```

## Fluxo OAuth

### 1. Iniciar OAuth (`/api/social/oauth`)

```typescript
// GET /api/social/oauth?platform=instagram

// State inclui userId para recuperação após redirect
const stateData = `${userId}:${platform}:${uuid}`
const state = Buffer.from(stateData).toString('base64')

// Redirect para Facebook OAuth Dialog
const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
  `client_id=${META_APP_ID}&` +
  `redirect_uri=${META_REDIRECT_URI}&` +
  `scope=${INSTAGRAM_SCOPES.join(',')}&` +
  `state=${state}`

redirect(oauthUrl)
```

**⚠️ Importante**: Usar `www.facebook.com` para OAuth Dialog, NÃO `graph.facebook.com`.

### 2. Callback (`/api/social/callback`)

```typescript
// GET /api/social/callback?code=...&state=...

// 1. Validar state (contém userId)
const stateData = Buffer.from(state, 'base64').toString('utf-8')
const [userId, platform, uuid] = stateData.split(':')

// 2. Trocar code por short-lived token
const tokenResponse = await fetch(
  `https://graph.facebook.com/v21.0/oauth/access_token?` +
  `client_id=${META_APP_ID}&` +
  `client_secret=${META_APP_SECRET}&` +
  `redirect_uri=${META_REDIRECT_URI}&` +
  `code=${code}`
)

// 3. Trocar por long-lived token (60 dias)
const longLivedResponse = await fetch(
  `https://graph.facebook.com/v21.0/oauth/access_token?` +
  `grant_type=fb_exchange_token&` +
  `client_id=${META_APP_ID}&` +
  `client_secret=${META_APP_SECRET}&` +
  `fb_exchange_token=${shortLivedToken}`
)

// 4. Buscar páginas com Instagram Business
const pagesResponse = await fetch(
  `https://graph.facebook.com/v21.0/me/accounts?` +
  `access_token=${shortLivedToken}&` +
  `fields=id,name,access_token`
)

// Para cada página, verificar se tem Instagram Business
// GET /{page-id}?fields=instagram_business_account

// 5. Salvar na DB (oauth_sessions)
await db.insert(oauthSessions).values({
  id: sessionId,
  userId,
  platform: "instagram",
  longLivedToken,
  pagesData: { pages: pagesWithInstagram },
  expiresAt: new Date(Date.now() + 15 * 60 * 1000)
})

// 6. Redirect com session_id
redirect(`/settings?tab=social&action=select-instagram&session_id=${sessionId}`)
```

### 3. Selecionar e Salvar (`/api/social/save-connection`)

```typescript
// POST /api/social/save-connection
// Body: { platform, sessionId, pageId }

// Buscar sessão da DB
const session = await db.query.oauthSessions.findOne({ sessionId })

// Encontrar página selecionada
const selectedPage = pagesData.pages.find(p => p.pageId === pageId)

// Salvar conexão
await db.insert(socialConnections).values({
  userId,
  platform: "instagram",
  accountId: selectedPage.instagramBusinessAccount.id,
  accountName: `@${selectedPage.instagramBusinessAccount.username}`,
  accountUsername: selectedPage.instagramBusinessAccount.username,
  accessToken: longLivedToken,
  pageAccessToken: selectedPage.pageAccessToken,  // Principal para publicação
  pageId: selectedPage.pageId,
  pageName: selectedPage.pageName,
  tokenExpiresAt: longLivedTokenExpiresAt,
  status: "active"
})

// Remover sessão
await db.delete(oauthSessions).where({ id: sessionId })
```

## Publicação Instagram

### Arquitetura Assíncrona (Jan 2026)

**⚠️ IMPORTANTE**: A publicação do Instagram agora é **assíncrona** via job queue. Não bloqueia a UI.

#### Fluxo de Publicação Imediata

```
Client → POST /api/social/publish → Cria job (PUBLISHING)
                                    ↓
                              Enfileira no Redis (priority: 1)
                                    ↓
                              Worker processa (30-60s)
                                    ↓
                              Atualiza status (PUBLISHED/FAILED)
```

#### Status Flow

```typescript
// 1. Client solicita publicação
POST /api/social/publish
{
  libraryItemId: 123,
  platform: "instagram",
  caption: "Legenda #hashtag"
}

// 2. API cria registro com status PUBLISHING
{
  status: PublishedPostStatus.PUBLISHING,
  // ... other fields
}

// 3. Job enfileirado
const jobId = await createJob(
  userId,
  "social_publish_instagram",
  { publishedPostId, userId },
  { priority: 1 }  // Alta prioridade
)

// 4. Worker processa
// POST /api/workers → handler social_publish_instagram
// - Cria container IG
// - Aguarda FINISHED (polling)
// - Publica container
// - Atualiza status para PUBLISHED
```

#### Response Pattern

```typescript
// Async response (novo padrão)
{
  success: true,
  publishedPostId: 456,
  jobId: 789,
  queued: true,
  message: "Publicação enfileirada. Você será notificado quando for publicada."
}

// Client deve mostrar toast indicando processamento assíncrono
if (result.queued) {
  toast.success("Publicação enfileirada!", {
    description: "Processando em segundo plano..."
  })
}
```

### Single Imagem

```typescript
// 1. Criar container
const response = await fetch(
  `https://graph.facebook.com/v22.0/${igUserId}/media`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: "https://...",
      caption: "Legenda #hashtag",
      access_token: pageAccessToken
    })
  }
)
const { id: containerId } = await response.json()

// 2. Aguardar processamento (polling)
while (attempts < maxAttempts) {
  const status = await fetch(
    `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`
  )
  const { status_code } = await status.json()
  if (status_code === "FINISHED") break
  await sleep(2000)
}

// 3. Publicar
const publish = await fetch(
  `https://graph.facebook.com/v22.0/${igUserId}/media_publish`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: pageAccessToken
    })
  }
)
const { id: mediaId } = await publish.json()
```

### Carrossel

```typescript
// 1. Criar containers para cada item
const itemContainerIds = await Promise.all(
  imageUrls.map(url =>
    fetch(
      `https://graph.facebook.com/v22.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: url,
          is_carousel_item: true,
          access_token: pageAccessToken
        })
      }
    ).then(r => r.json()).then(r => r.id)
  )
)

// 2. Criar container do carrossel
const carousel = await fetch(
  `https://graph.facebook.com/v22.0/${igUserId}/media`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: itemContainerIds.join(','),
      caption: "Legenda #hashtag",
      access_token: pageAccessToken
    })
  }
)
const { id: carouselContainerId } = await carousel.json()

// 3. Polling + publicar (igual single imagem)
```

## Tipos de Token Meta

| Prefixo | Tipo | Uso |
|---------|------|-----|
| `EAA` / `EAAB` | User Access Token (Short-lived) | 1-2 horas |
| `EAAE` | User Access Token (Long-lived) | 60 dias |
| `EAD` | User Access Token (Long-lived - Legacy) | 60 dias |
| `EAF` | Page Access Token | 60 dias (não expira) |

**Para Instagram Content Publishing API**: Use **Page Access Token**.

## Debugging Token

```typescript
// Usar debug_token endpoint
const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`
const debugUrl = `https://graph.facebook.com/v21.0/debug_token?` +
  `input_token=${token}&` +
  `access_token=${appAccessToken}`

const debug = await fetch(debugUrl).then(r => r.json())
console.log(debug.data)
// {
//   type: "USER" | "PAGE",
//   is_valid: true,
//   scopes: [...],
//   expires_at: 1234567890
// }
```

## Erros Comuns

### "Cannot parse access token"
- **Causa**: Usar `graph.instagram.com` em vez de `graph.facebook.com`
- **Solução**: Usar `https://graph.facebook.com` para Content Publishing API

### "Invalid OAuth access token"
- **Causa**: Token expirado ou formato incorreto
- **Solução**: Reconectar conta, usar Page Access Token

### "(#100) No matching user found"
- **Causa**: accountId incorreto ou token sem permissão
- **Solução**: Verificar IG Business Account ID e scopes

## API Routes

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/social/oauth` | GET | Iniciar OAuth |
| `/api/social/callback` | GET | OAuth callback |
| `/api/social/save-connection` | POST | Salvar conexão selecionada |
| `/api/social/publish` | POST | Publicar conteúdo |
| `/api/social/oauth-session` | GET | Buscar páginas da sessão |
| `/api/published-posts` | GET | Listar publicações |
| `/api/published-posts/[id]` | GET/PATCH/DELETE | Gerenciar publicação |

## Bugs Conhecidos e Corrigidos (Jan 2026)

### Bug #1: Timezone em Agendamento

**Problema**: `scheduledFor` era armazenado em UTC, mas validações usavam `new Date()` (local time).

**Sintoma**: Agendamentos para "hoje" eram rejeitados indevidamente.

**Correção**:
```typescript
// ❌ ERRADO - Compara UTC com local time
if (scheduledDate < new Date()) {
  return { error: "Data deve ser futura" }
}

// ✅ CORRETO - Compara UTC com UTC
const nowUtc = new Date().toISOString()
if (scheduledDate < new Date(nowUtc)) {
  return { error: "Data deve ser futura" }
}
```

**Arquivos corrigidos**:
- `src/app/api/library/[id]/schedule/route.ts`
- `src/app/api/published-posts/route.ts`
- `src/app/api/cron/social-publish/route.ts`

### Bug #2: "Regenerar" Executando Após Publicar

**Problema**: Estado `isRefreshing` era compartilhado entre refresh de dados e animação do botão "Reconstruir".

**Sintoma**: Após clicar "Publicar Agora", o botão "Reconstruir" ficava girando, dando impressão de que estava regenerando.

**Correção**: Separar estados:
```typescript
// ❌ ERRADO - Mesmo estado para dois propósitos
<RefreshCw className={cn(isRefreshing && "animate-spin")} />
disabled={isRefreshing}

// ✅ CORRETO - Estados separados
const [isRebuilding, setIsRebuilding] = useState(false)
<RefreshCw className={cn(isRebuilding && "animate-spin")} />
disabled={isRebuilding}
```

**Arquivo corrigido**:
- `src/app/(app)/library/[id]/components/content-actions-section.tsx`

### Bug #3: Cron Jobs Não Configurados

**Problema**: Endpoint `/api/cron/social-publish` existia mas não estava configurado no Vercel.

**Sintoma**: Posts agendados não eram processados automaticamente.

**Correção**: Adicionar ao `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/workers", "schedule": "* * * * *" },
    { "path": "/api/cron/social-publish", "schedule": "*/5 * * * *" }
  ]
}
```

**⚠️ IMPORTANTE**: Cron jobs só funcionam em produção. Em desenvolvimento, usar:
- `GET /api/workers?secret=dev-secret-change-in-production`
- Ou `triggerWorker()` helper em desenvolvimento

## Tratamento de Erros Melhorado (Jan 2026)

### Padrão de Error Handling em `/api/social/publish`

```typescript
import { toAppError, getErrorMessage, isAuthError, hasErrorCode } from "@/lib/errors"

export async function POST(request: Request) {
  let connection: typeof socialConnections.$inferSelect | null = null
  let platform: "instagram" | "facebook" | null = null

  try {
    // ... operações de publicação

    // Verificar expiração de token antes de publicar
    if (isTokenExpired(connection.tokenExpiresAt)) {
      await markConnectionExpired(connection.id)
      return NextResponse.json(
        {
          error: `Sua conexão com ${platform === "instagram" ? "Instagram" : "Facebook"} expirou. Por favor, reconecte sua conta em Configurações > Redes Sociais.`,
          code: "TOKEN_EXPIRED",
        },
        { status: 400 }
      )
    }

    // ... resto da lógica
  } catch (error) {
    const appError = toAppError(error, "PUBLISH_FAILED")
    console.error("[SocialPublish] Error:", appError)

    // Verificar erros de token específicos
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

    return NextResponse.json(
      { error: getErrorMessage(appError) },
      { status: 500 }
    )
  }
}
```

### Marcar Conexão como Expirada

```typescript
async function markConnectionExpired(connectionId: number): Promise<void> {
  await db
    .update(socialConnections)
    .set({
      status: SocialConnectionStatus.EXPIRED,
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, connectionId))
}

function isTokenExpired(tokenExpiresAt: Date | null | undefined): boolean {
  if (!tokenExpiresAt) return false
  // Add 1 day buffer antes de considerar expirado
  const bufferTime = 24 * 60 * 60 * 1000
  return new Date(tokenExpiresAt).getTime() < Date.now() - bufferTime
}
```

### Worker de Métricas com Agrupamento de Erros

**Arquivo**: `src/lib/social/workers/fetch-metrics.ts`

```typescript
export interface MetricsFetchError {
  postId: number
  platform: string
  error: string
}

export async function fetchSocialMetrics(
  payload: MetricsFetchPayload = {}
): Promise<{ success: boolean; updatedCount: number; errors?: MetricsFetchError[]; error?: string }> {
  const errors: MetricsFetchError[] = []
  let updatedCount = 0

  for (const post of postsToUpdate) {
    try {
      // ... buscar métricas
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

  // Log summary se houver erros
  if (errors.length > 0) {
    console.warn(`[MetricsFetch] Completed with ${errors.length} errors out of ${postsToUpdate.length} posts`)
    console.warn(`[MetricsFetch] Failed posts: ${errors.map((e) => `#${e.postId}`).join(", ")}`)
  }

  return { success: true, updatedCount, errors: errors.length > 0 ? errors : undefined }
}
```

### Error Classes no Queue System

**Arquivo**: `src/lib/queue/client.ts`

```typescript
import {
  AppError,
  ConfigError,
  JobError,
  NetworkError,
  toAppError,
  getErrorMessage,
} from "@/lib/errors"

// enqueueJob - erro específico com jobId
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

// dequeueJob - log normalizado, retorna null em caso de erro
export async function dequeueJob(): Promise<number | null> {
  try {
    const value = await redis.rpop<string>(JOB_QUEUE)
    if (!value) return null
    const parts = value.split(":")
    const jobId = parseInt(parts[2] || "0", 10)
    return jobId
  } catch (error) {
    const appError = toAppError(error, "QUEUE_DEQUEUE_FAILED")
    console.error("[Queue] Erro ao desenfileirar job:", appError)
    return null  // Aceitável para dequeue
  }
}
```

## Logging Adicionado

Para debug de problemas de publicação/regeneração:

```typescript
// Prefixos de log para fácil filtragem
console.log("[ContentActionsSection] Publish queued successfully")
console.log("[ContentActionsSection] Rebuild button clicked")
console.log("[ContentActionsSection] Token expired, calling onRefresh()")
```

## Referências

- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media)
- [Facebook OAuth Dialog](https://developers.facebook.com/docs/facebook-login/guides/advanced-oauth)
- [Token Reference](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
