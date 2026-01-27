# Social Publishing Fixes (Jan 2026)

Correções implementadas no sistema de publicação social após análise detalhada de bugs de UI, timezone e agendamento.

---

## Bug #1: UI Blocking During Instagram Publishing

**Sintoma**: Ao clicar "Publicar Agora", a interface ficava travada por 30-60 segundos durante o processamento da API do Instagram.

**Causa**: A publicação era síncrona. A API Content Publishing do Instagram requer:
1. Criar container (POST)
2. Polling até status FINISHED (30-60s)
3. Publicar container (POST)

Tudo isso bloqueava a resposta HTTP ao cliente.

**Correção**: Migrar para arquitetura assíncrona com job queue.

**Arquivos**:
- `src/app/api/social/publish/route.ts:312-382`
- `src/app/(app)/library/[id]/components/content-actions-section.tsx:258-284`

**Antes**:
```typescript
// Síncrono - bloqueia UI
const service = getInstagramService(connection.accessToken, connection.accountId)
const result = await service.publishPhoto({...}) // 30-60s
return NextResponse.json({ success: true, platformPostId: result.id })
```

**Depois**:
```typescript
// Assíncrono - retorna imediatamente
const [publishedPost] = await db.insert(publishedPosts).values({
  status: PublishedPostStatus.PUBLISHING, // Status temporário
  // ...
}).returning()

const jobId = await createJob(userId, "social_publish_instagram", {
  publishedPostId: publishedPost.id,
  userId,
}, { priority: 1 })

return NextResponse.json({
  success: true,
  queued: true,
  message: "Publicação enfileirada..."
})
```

**Response Pattern**:
```typescript
// Client deve verificar `queued`
if (result.queued) {
  toast.success("Publicação enfileirada!", {
    description: "Processando em segundo plano..."
  })
}
```

---

## Bug #2: Timezone Validation Error

**Sintoma**: Agendamentos para "hoje" eram rejeitados com erro "data deve ser futura", mesmo quando a data era corretamente futura.

**Causa**: `scheduledFor` era armazenado em UTC no banco, mas as validações comparavam com `new Date()` que retorna hora local do servidor.

```typescript
// ❌ ERRADO - Comparando maçãs com laranjas
const scheduledDate = new Date(scheduledFor)  // UTC do banco
if (scheduledDate < new Date()) {  // Hora local!
  return { error: "Data deve ser futura" }
}
```

**Exemplo**: Agendar para 2026-01-27 20:00 (UTC) às 19:00 local:
- `scheduledFor`: 2026-01-27 20:00:00 (UTC)
- `new Date()`: 2026-01-27 19:00:00 (local, timezone -3)
- Resultado: 20:00 < 19:00 = FALSE → Rejeitado incorretamente

**Correção**: Usar UTC para ambas as pontas da comparação.

**Arquivos**:
- `src/app/api/library/[id]/schedule/route.ts:50-61`
- `src/app/api/published-posts/route.ts:152-165`
- `src/app/api/cron/social-publish/route.ts:49-66`

```typescript
// ✅ CORRETO - Comparando UTC com UTC
const scheduledDate = new Date(scheduledFor)
const nowUtc = new Date().toISOString()  // "2026-01-27T22:00:00.000Z"
if (scheduledDate < new Date(nowUtc)) {
  return { error: "Data deve ser futura" }
}
```

---

## Bug #3: "Regenerar" Button Spinning After Publish

**Sintoma**: Após clicar "Publicar Agora", o botão "Reconstruir" ficava com o ícone girando (animate-spin), dando a impressão incorreta de que o sistema estava regenerando conteúdo.

**Causa**: O estado `isRefreshing` era compartilhado entre dois propósitos distintos:
1. Trigger para refresh de dados nos componentes filhos
2. Controlar animação do botão "Reconstruir"

Quando `onRefresh()` era chamado após publicação, `isRefreshing` ficava `true`, e o botão "Reconstruir" herdava esse estado.

**Correção**: Separar os estados em dois独立的 hooks.

**Arquivo**: `src/app/(app)/library/[id]/components/content-actions-section.tsx`

```typescript
// ❌ ERRADO - Estado compartilhado
const [isRefreshing, setIsRefreshing] = useState(false)

// Passado como prop para componente filho
onRefresh={() => setIsRefreshing(!isRefreshing)}

// Botão "Reconstruir" usando mesmo estado
<RefreshCw className={cn(isRefreshing && "animate-spin")} />
disabled={isRefreshing}
```

```typescript
// ✅ CORRETO - Estados separados
const [isRebuilding, setIsRebuilding] = useState(false)

// Botão "Reconstruir" usa estado próprio
async function handleRebuild(id: number) {
  setIsRebuilding(true)
  try {
    // ... API call
  } finally {
    setIsRebuilding(false)
  }
}

<RefreshCw className={cn(isRebuilding && "animate-spin")} />
disabled={isRebuilding}
```

**Logging Adicionado**:
Para facilitar debug de problemas futuros, logging prefixado foi adicionado:
```typescript
console.log("[ContentActionsSection] Publish queued successfully")
console.log("[ContentActionsSection] Rebuild button clicked")
console.log("[ContentActionsSection] Token expired, calling onRefresh()")
```

---

## Bug #4: Cron Jobs Not Configured

**Sintoma**: Posts agendados não eram processados automaticamente em produção.

**Causa**: O endpoint `/api/cron/social-publish` existia mas não estava configurado no `vercel.json`.

**Correção**: Adicionar cron job ao `vercel.json`.

**Arquivo**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/workers",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/social-publish",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**⚠️ Importante**: Vercel Cron só funciona em produção. Em desenvolvimento:
- Usar `GET /api/workers?secret=dev-secret-change-in-production`
- Ou chamar `triggerWorker()` helper

---

## Resumo das Mudanças

| Arquivo | Mudança | Tipo |
|---------|---------|------|
| `src/app/api/social/publish/route.ts` | Publicação assíncrona via job queue | Feature |
| `src/app/(app)/library/[id]/components/content-actions-section.tsx` | Estado isRebuilding separado + logging | Bug Fix |
| `src/app/api/library/[id]/schedule/route.ts` | Comparação UTC corrigida | Bug Fix |
| `src/app/api/published-posts/route.ts` | Comparação UTC corrigida | Bug Fix |
| `src/app/api/cron/social-publish/route.ts` | Documentação UTC | Docs |
| `vercel.json` | Cron job `/api/cron/social-publish` | Config |
| `.serena/memories/social-integration-patterns.md` | Atualizado com async pattern | Docs |
| `.context/docs/architecture.md` | Seção Async Publishing adicionada | Docs |
| `CLAUDE.md` | Social media section atualizada | Docs |

---

## Referências

- Issue: Social publishing UI blocking + timezone bugs
- Data: Janeiro 2026
- Memórias Serena: `social-integration-patterns`, `queue-patterns`
- Insights: `.context/docs/insights/018-social-publishing-fixes-jan2026.md`
