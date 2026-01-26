# Plano: Integração Completa Instagram e Facebook

**Projeto:** Máquina de Conteúdo
**Data:** 2026-01-26
**Status:** Planejamento
**Prioridade:** Alta

---

## Sumário Executivo

Este documento descreve o plano completo para unificar e completar a integração com Instagram e Facebook, permitindo agendar e publicar posts tanto pela Biblioteca quanto pelo Calendário.

### Problemas Identificados

| Problema | Severidade | Impacto |
|----------|------------|---------|
| Duas tabelas separadas (`scheduledPosts` e `publishedPosts`) | Alta | Posts agendados pela biblioteca não são publicados |
| Campo `caption` não salvo no agendamento | Média | Usuário perde mensagem personalizada |
| Calendário sem integração com publicação | Alta | Não é possível agendar/editar pelo calendário |
| Falta endpoints CRUD para publishedPosts | Média | Não há como editar/cancelar agendamentos |

---

## Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESTRUTURA DE DADOS ATUAL                            │
└─────────────────────────────────────────────────────────────────────────────┘

TABELA: scheduled_posts (LEGADA - usada pela biblioteca)
├── id: serial
├── library_item_id: integer (FK)
├── platform: text
├── scheduled_for: timestamp
├── status: text ("pending" | "published" | "failed")
├── platform_post_id: text (nullable)
└── error: text (nullable)

TABELA: published_posts (MODERNA - usada pelo social)
├── id: serial
├── user_id: text (FK)
├── library_item_id: integer (FK, nullable)
├── platform: socialPlatformEnum ("instagram" | "facebook" | "linkedin")
├── status: publishedPostStatusEnum ("scheduled" | "pending" | "published" | "failed")
├── platform_post_id: text (nullable)
├── scheduled_for: timestamp (nullable)
├── published_at: timestamp (nullable)
├── failure_reason: text (nullable)
├── metrics: jsonb (nullable)
├── metrics_last_fetched_at: timestamp (nullable)
└── deleted_at: timestamp (nullable) ← SOFT DELETE!

TABELA: social_connections
├── id: serial
├── user_id: text (FK)
├── platform: socialPlatformEnum
├── account_id: text
├── account_name: text
├── account_username: text
├── access_token: text
├── token_expires_at: timestamp
├── status: socialConnectionStatusEnum
├── metadata: jsonb
├── last_verified_at: timestamp (nullable)
└── deleted_at: timestamp (nullable) ← SOFT DELETE!
```

---

## Plano de Execução

### FASE 1: Preparação do Schema (BACKWARD COMPATIBLE)

**Objetivo:** Adicionar campo `caption` à `publishedPosts` SEM breaking changes.

#### 1.1 Adicionar campo `caption` em `publishedPosts`

```sql
-- Migration SQL (via Neon MCP)
ALTER TABLE published_posts
ADD COLUMN caption TEXT;

-- Adicionar comentário
COMMENT ON COLUMN published_posts.caption IS 'Personalized message/caption for this post';
```

**Arquivo:** `drizzle/000X_add_caption_to_published_posts.sql`

#### 1.2 Adicionar campo `mediaUrl` em `publishedPosts`

Para armazenar URLs de mídia diretamente (sem depender só de libraryItemId):

```sql
ALTER TABLE published_posts
ADD COLUMN media_url TEXT; -- JSON array de URLs

COMMENT ON COLUMN published_posts.media_url IS 'Stored media URLs (JSON array) for standalone posts';
```

#### 1.3 Criar migration com Drizzle

```bash
npx drizzle-kit generate
```

**Validação:**
- [ ] Migration gerada com sucesso
- [ ] Campos adicionados sem defaultValue (permite NULL)
- [ ] Type inference atualizada

---

### FASE 2: Unificar Tabelas (MIGRAÇÃO DADOS)

**Objetivo:** Migrar dados de `scheduledPosts` para `publishedPosts` gradualmente.

#### 2.1 Criar script de migração

```typescript
// src/lib/social/migrate-scheduled-posts.ts

import { db } from "@/db";
import { scheduledPosts, publishedPosts } from "@/db/schema";

export async function migrateScheduledPostToPublished(scheduledPostId: number) {
  const [scheduled] = await db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.id, scheduledPostId))
    .limit(1);

  if (!scheduled) return { success: false, error: "Not found" };

  // Buscar library_item para obter userId
  const [libraryItem] = await db
    .select()
    .from(libraryItems)
    .where(eq(libraryItems.id, scheduled.libraryItemId))
    .limit(1);

  if (!libraryItem) return { success: false, error: "Library item not found" };

  // Criar em publishedPosts
  const [published] = await db
    .insert(publishedPosts)
    .values({
      userId: libraryItem.userId,
      libraryItemId: scheduled.libraryItemId,
      platform: scheduled.platform as any, // Cast para socialPlatformEnum
      status: scheduled.status as any,
      platformPostId: scheduled.platformPostId,
      scheduledFor: scheduled.scheduledFor,
      failureReason: scheduled.error,
    })
    .returning();

  // Deletar da tabela legada
  await db.delete(scheduledPosts).where(eq(scheduledPosts.id, scheduledPostId));

  return { success: true, publishedPostId: published.id };
}
```

#### 2.2 Atualizar rota `/api/library/[id]/schedule`

```typescript
// ANTES (usava scheduledPosts)
await db.insert(scheduledPosts).values({...})

// DEPOIS (usa publishedPosts)
await db.insert(publishedPosts).values({
  userId, // ← OBRIGATÓRIO
  libraryItemId,
  platform,
  status: "scheduled",
  scheduledFor: scheduledDate,
  caption: message || null, // ← NOVO
})
```

**Validação:**
- [ ] Script de migração funciona
- [ ] Rota de agendamento da biblioteca atualizada
- [ ] Posts agendados aparecem no calendário

---

### FASE 3: Completar publishedPosts (CRUD API)

**Objetivo:** Criar endpoints REST completos para gerenciar `publishedPosts`.

#### 3.1 GET `/api/published-posts` - Listar

```typescript
// Query params:
// - status: "scheduled" | "pending" | "published" | "failed"
// - platform: "instagram" | "facebook" | "linkedin"
// - startDate: ISO date
// - endDate: ISO date

import { and, gte, lte, eq, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  const { userId } = await auth();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [
    eq(publishedPosts.userId, userId),
    isNull(publishedPosts.deletedAt),
  ];

  if (status) conditions.push(eq(publishedPosts.status, status as any));
  if (platform) conditions.push(eq(publishedPosts.platform, platform as any));
  if (startDate) conditions.push(gte(publishedPosts.scheduledFor!, new Date(startDate)));
  if (endDate) conditions.push(lte(publishedPosts.scheduledFor!, new Date(endDate)));

  const posts = await db
    .select()
    .from(publishedPosts)
    .where(and(...conditions))
    .orderBy(desc(publishedPosts.scheduledFor));

  return NextResponse.json({ posts });
}
```

#### 3.2 GET `/api/published-posts/[id]` - Detalhes

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  const [post] = await db
    .select()
    .from(publishedPosts)
    .where(and(
      eq(publishedPosts.id, parseInt(id)),
      eq(publishedPosts.userId, userId)
    ))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}
```

#### 3.3 PUT `/api/published-posts/[id]` - Editar

```typescript
interface UpdatePublishedPostRequest {
  scheduledFor?: string; // Nova data/hora
  caption?: string; // Nova mensagem
  platform?: string; // Nova plataforma
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;
  const body = await request.json() as UpdatePublishedPostRequest;

  // Verificar ownership
  const [existing] = await db
    .select()
    .from(publishedPosts)
    .where(and(
      eq(publishedPosts.id, parseInt(id)),
      eq(publishedPosts.userId, userId)
    ))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Não permitir editar posts já publicados
  if (existing.status === "published") {
    return NextResponse.json({ error: "Cannot edit published post" }, { status: 400 });
  }

  // Atualizar
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.scheduledFor) updateData.scheduledFor = new Date(body.scheduledFor);
  if (body.caption !== undefined) updateData.caption = body.caption;
  if (body.platform) updateData.platform = body.platform;

  const [updated] = await db
    .update(publishedPosts)
    .set(updateData)
    .where(eq(publishedPosts.id, existing.id))
    .returning();

  return NextResponse.json({ success: true, post: updated });
}
```

#### 3.4 DELETE `/api/published-posts/[id]` - Cancelar

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;

  // Soft delete (não remover permanentemente)
  const [result] = await db
    .update(publishedPosts)
    .set({
      status: "cancelled", // ← NOVO status necessário
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(publishedPosts.id, parseInt(id)),
      eq(publishedPosts.userId, userId)
    ))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Validação:**
- [ ] GET lista posts corretamente
- [ ] GET/[id] retorna detalhes
- [ ] PUT edita agendamento
- [ ] DELETE cancela com soft delete

---

### FASE 4: Integração com Calendário

**Objetivo:** Conectar o calendário ao sistema de publicação.

#### 4.1 Atualizar `calendar-actions.ts`

```typescript
// src/app/(app)/calendar/actions/calendar-actions.ts

// Adicionar ações para publishedPosts
export async function createScheduledPostAction(data: {
  libraryItemId?: number
  platform: Platform
  scheduledFor: Date
  caption?: string
}): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const [post] = await db
      .insert(publishedPosts)
      .values({
        userId,
        libraryItemId: data.libraryItemId || null,
        platform: data.platform,
        status: "scheduled",
        scheduledFor: data.scheduledFor,
        caption: data.caption || null,
      })
      .returning();

    revalidatePath("/calendar");
    return { success: true, id: post.id };
  } catch (error) {
    return { success: false, error: "Failed to create scheduled post" };
  }
}

export async function updateScheduledPostAction(
  id: number,
  data: {
    scheduledFor?: Date
    caption?: string
  }
): Promise<ActionResult> {
  const { userId } = await auth();
  // ... implementação similar a PUT /api/published-posts/[id]
}

export async function deleteScheduledPostAction(id: number): Promise<ActionResult> {
  const { userId } = await auth();
  // ... soft delete
}

export async function reschedulePostAction(
  id: number,
  newDate: Date
): Promise<ActionResult> {
  return await updateScheduledPostAction(id, { scheduledFor: newDate });
}
```

#### 4.2 Atualizar `getCalendarPostsAction`

```typescript
// Modificar para buscar de publishedPosts em vez de scheduledPosts

export async function getCalendarPostsAction(
  dateRange: CalendarDateRange,
  filters: CalendarFilters
): Promise<CalendarPost[]> {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    // Buscar de publishedPosts (não scheduledPosts!)
    const posts = await db
      .select({
        // publishedPosts fields
        id: publishedPosts.id,
        scheduledPostId: publishedPosts.id,
        platform: publishedPosts.platform,
        scheduledPostStatus: publishedPosts.status,
        scheduledFor: publishedPosts.scheduledFor,
        postedAt: publishedPosts.publishedAt,
        platformPostId: publishedPosts.platformPostId,
        caption: publishedPosts.caption,

        // libraryItems fields (via join)
        libraryItemId: publishedPosts.libraryItemId,
        type: libraryItems.type,
        status: libraryItems.status,
        title: libraryItems.title,
        content: libraryItems.content,
        mediaUrl: libraryItems.mediaUrl,
        createdAt: libraryItems.createdAt,
        updatedAt: libraryItems.updatedAt,
      })
      .from(publishedPosts)
      .leftJoin(libraryItems, eq(publishedPosts.libraryItemId, libraryItems.id))
      .where(
        and(
          eq(publishedPosts.userId, userId),
          isNull(publishedPosts.deletedAt),
          // Filtro de data range
          gte(publishedPosts.scheduledFor!, dateRange.start),
          lte(publishedPosts.scheduledFor!, dateRange.end),
          // Filtros adicionais
          filters.platforms?.length ? inArray(publishedPosts.platform, filters.platforms) : undefined,
          // ... outros filtros
        )
      )
      .orderBy(desc(publishedPosts.scheduledFor));

    return posts as CalendarPost[];
  } catch (error) {
    console.error("Error fetching calendar posts:", error);
    return [];
  }
}
```

#### 4.3 Componente de criação de post no calendário

```typescript
// src/app/(app)/calendar/components/create-post-dialog.tsx

interface CreatePostDialogProps {
  open: boolean
  onClose: () => void
  initialDate?: Date
}

export function CreatePostDialog({ open, onClose, initialDate }: CreatePostDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("instagram")
  const [scheduledDate, setScheduledDate] = useState(initialDate || new Date())
  const [caption, setCaption] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    const result = await createScheduledPostAction({
      platform: selectedPlatform,
      scheduledFor: scheduledDate,
      caption,
    })

    if (result.success) {
      toast.success("Post agendado com sucesso!")
      onClose()
      // Refetch calendar posts
    } else {
      toast.error(result.error || "Erro ao agendar")
    }
    setIsCreating(false)
  }

  // ... UI implementation
}
```

**Validação:**
- [ ] Calendário mostra posts de `publishedPosts`
- [ ] Criar post pelo calendário funciona
- [ ] Editar data via drag & drop funciona
- [ ] Cancelar post funciona

---

### FASE 5: Melhorar ScheduleDrawer da Biblioteca

**Objetivo:** Salvar `caption` e usar `publishedPosts`.

#### 5.1 Atualizar `schedule-drawer.tsx`

```typescript
// src/app/(app)/library/[id]/components/schedule-drawer.tsx

// Adicionar à interface:
interface ScheduleDrawerProps {
  // ... existente
  mediaUrls?: string[] // ← NOVO: passar URLs da mídia
}

// No handler, incluir caption e mediaUrl:
async function handleSchedule() {
  // ... validações

  const response = await fetch(`/api/library/${libraryItemId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platform: selectedPlatform,
      scheduledFor: scheduledFor.toISOString(),
      message: customMessage, // ← Já existe, mas precisa ser salvo
      mediaUrls, // ← NOVO
    }),
  })

  // ... rest
}
```

#### 5.2 Atualizar rota `/api/library/[id]/schedule`

```typescript
interface ScheduleRequest {
  platform: string
  scheduledFor: string
  message?: string
  mediaUrls?: string[] // ← NOVO
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  const { id } = await params;
  const libraryItemId = parseInt(id);

  const body = await request.json() as ScheduleRequest;
  const { platform, scheduledFor, message, mediaUrls } = body;

  // ... validações

  // Criar em publishedPosts (não scheduledPosts!)
  const [scheduledPost] = await db
    .insert(publishedPosts)
    .values({
      userId, // ← OBRIGATÓRIO
      libraryItemId,
      platform,
      status: "scheduled",
      scheduledFor: new Date(scheduledFor),
      caption: message || null,
      mediaUrl: mediaUrls?.length ? JSON.stringify(mediaUrls) : null,
    })
    .returning();

  // Atualizar status do library item
  await db
    .update(libraryItems)
    .set({ status: "scheduled" })
    .where(eq(libraryItems.id, libraryItemId));

  return NextResponse.json({
    success: true,
    scheduledPost,
  });
}
```

**Validação:**
- [ ] Caption é salva corretamente
- [ ] mediaUrl é salva quando não há libraryItem
- [ ] Status do library item é atualizado

---

### FASE 6: Status Enum Update

**Objetivo:** Adicionar status "cancelled" ao enum.

#### 6.1 Atualizar schema

```typescript
// src/db/schema.ts

export const publishedPostStatusEnum = pgEnum("published_post_status", [
  "scheduled",
  "pending",
  "processing",
  "published",
  "failed",
  "cancelled", // ← NOVO
]);
```

#### 6.2 Gerar migration

```bash
npx drizzle-kit generate
```

**Validação:**
- [ ] Migration gerada
- [ ] Type inference atualizada

---

### FASE 7: Testes de Integração

**Objetivo:** Garantir fluxo completo funcional.

#### 7.1 Fluxo 1: Agendar pela Biblioteca

```
1. Usuário abre item na biblioteca
2. Clica em "Agendar"
3. ScheduleDrawer abre
4. Seleciona plataforma (Instagram)
5. Escolhe data/hora
6. Adiciona mensagem personalizada
7. Clica em "Agendar"
8. POST /api/library/[id]/schedule
9. Criado em publishedPosts com status="scheduled"
10. Item da biblioteca atualizado para status="scheduled"
11. ✅ Post aparece no calendário
```

#### 7.2 Fluxo 2: Agendar pelo Calendário

```
1. Usuário abre calendário
2. Clica em dia ou arrasta item
3. CreatePostDialog abre (ou edit dialog)
4. Preenche dados
5. Clica em "Agendar"
6. POST /api/published-posts
7. Criado em publishedPosts com status="scheduled"
8. ✅ Post aparece no calendário
```

#### 7.3 Fluxo 3: Publicação Automática (Cron)

```
1. Cron /api/cron/social-publish roda a cada 5 min
2. Busca posts com status="scheduled" e scheduledFor <= now
3. Para Instagram: Cria job "social_publish_instagram"
4. Para Facebook: Apenas marca como published (já foi agendado nativamente)
5. Worker processa job Instagram
6. Instagram Graph API é chamada
7. Post publicado!
8. Status atualizado para "published"
9. platformPostId salvo
```

#### 7.4 Fluxo 4: Editar Agendamento

```
1. Usuário clica em post agendado no calendário
2. EditDialog abre
3. Usuário muda data/hora
4. PUT /api/published-posts/[id]
5. scheduledFor atualizado
6. ✅ Post move para nova data no calendário
```

#### 7.5 Fluxo 5: Cancelar Agendamento

```
1. Usuário clica em post agendado
2. Clica em "Cancelar"
3. DELETE /api/published-posts/[id]
4. Soft delete (deletedAt = agora, status = "cancelled")
5. ✅ Post some do calendário
```

---

## Checklist de Validação

### Schema
- [ ] Campo `caption` adicionado a `publishedPosts`
- [ ] Campo `mediaUrl` adicionado a `publishedPosts`
- [ ] Status "cancelled" adicionado ao enum
- [ ] Migration gerada e aplicada
- [ ] Types re-gerados

### Backend
- [ ] `/api/published-posts` GET implementado
- [ ] `/api/published-posts/[id]` GET implementado
- [ ] `/api/published-posts/[id]` PUT implementado
- [ ] `/api/published-posts/[id]` DELETE implementado
- [ ] `/api/library/[id]/schedule` atualizado para usar `publishedPosts`
- [ ] `/api/cron/social-publish` funciona com `publishedPosts`

### Frontend - Biblioteca
- [ ] `ScheduleDrawer` salva caption
- [ ] `ScheduleDrawer` salva mediaUrl
- [ ] Toast de sucesso aparece
- [ ] Item atualizado para status="scheduled"

### Frontend - Calendário
- [ ] `getCalendarPostsAction` busca de `publishedPosts`
- [ ] Posts aparecem no calendário
- [ ] Criar post pelo calendário funciona
- [ ] Editar data funciona
- [ ] Cancelar post funciona

### Integração Social
- [ ] Instagram publish funciona
- [ ] Facebook publish funciona
- [ ] Tokens expirados são tratados
- [ ] Erros de publicação são registrados

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em `publishedPosts` | Média | Alta | Fazer migration aditiva, manter `scheduledPosts` temporariamente |
| Usuário com posts em `scheduledPosts` | Alta | Média | Script de migração automática |
| Instagram API rate limit | Baixa | Média | Implementar exponential backoff |
| Token expira antes do agendamento | Média | Alta | Verificar token 24h antes, notificar usuário |
| Erro na migração de dados | Baixa | Alta | Backup pré-migration, rollback plan |

---

## Compatibilidade com Padrões do Projeto

### Padrões a Seguir

1. **Soft Delete** (`deletedAt`)
   - Sempre usar soft delete, nunca DELETE direto
   - Referência: `database-patterns`

2. **useRef + JSON.stringify** para evitar infinite loops
   - Usar em useEffect com dependências de objeto
   - Referência: `004-infinite-loop-hooks.md`, `027-infinite-loop-useeffect-usememo.md`

3. **JSONB Parsing Pattern**
   - Verificar tipo antes de JSON.parse()
   - Referência: `032-json-parse-object-error.md`

4. **ActionResult Pattern**
   - Todas as actions retornam `{ success: boolean, error?: string, id?: number }`
   - Referência: `library-patterns`

5. **Server Component First**
   - Usar Server Components quando possível
   - "use client" apenas para interatividade

### Erros Conhecidos a Evitar

- **Infinite Loop**: Não usar objeto/array diretamente em dependências de useEffect
- **JSON.parse em objeto**: Verificar typeof antes de parsear JSONB
- **sendMessage format**: Usar `{ parts: [{ type: "text", text }] }` para Vercel AI SDK

---

## Ordem de Implementação Sugerida

1. ✅ FASE 1 - Preparação do Schema (menor risco)
2. ✅ FASE 2 - Unificar Tabelas (core migration)
3. ✅ FASE 6 - Status Enum Update (depende da FASE 1)
4. ✅ FASE 3 - CRUD API (sem dependências)
5. ✅ FASE 5 - Melhorar ScheduleDrawer (depende da FASE 3)
6. ✅ FASE 4 - Integração Calendário (depende da FASE 3)
7. ✅ FASE 7 - Testes (validação final)

---

## Próximos Passos

Após implementação deste plano:

1. **LinkedIn Integration** - Seguir mesma estrutura para LinkedIn
2. **Multi-platform Scheduling** - Agendar mesma mensagem para múltiplas plataformas
3. **Bulk Scheduling** - Agendar múltiplos posts de uma vez
4. **Analytics Dashboard** - Mostrar métricas dos posts publicados

---

## Referências

- `.serena/memories/database-patterns` - Schema patterns
- `.serena/memories/queue-patterns` - Worker patterns
- `.serena/memories/calendar-patterns` - Calendar implementation
- `.serena/memories/library-patterns` - Library implementation
- `.context/docs/known-and-corrected-errors/` - Known errors to avoid
- `src/lib/social/` - Existing social integration code
- `src/app/api/cron/social-publish/route.ts` - Current cron implementation
