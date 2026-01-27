# Social Publishing Fixes - Janeiro 2026

Correções implementadas no sistema de publicação social após análise detalhada.

## Resumo Executivo

Implementada migração de publicação síncrona para assíncrona usando job queue, corrigindo bugs de timezone e UI que afetavam a experiência do usuário.

## Mudanças Implementadas

### 1. Publicação Assíncrona (Feature)

**Problema**: UI travada por 30-60 segundos durante publicação no Instagram.

**Solução**: Job queue com status `PUBLISHING` → `PUBLISHED/FAILED`.

```typescript
// POST /api/social/publish retorna imediatamente
{
  queued: true,
  jobId: 123,
  message: "Publicação enfileirada..."
}
```

**Arquivos**: `src/app/api/social/publish/route.ts`, `content-actions-section.tsx`

---

### 2. Timezone UTC (Bug Fix)

**Problema**: Validação rejeitava agendamentos futuros devido a comparação UTC vs local time.

**Solução**: Usar `toISOString()` para comparação consistente.

```typescript
// ✅ CORRETO
const nowUtc = new Date().toISOString()
if (scheduledDate < new Date(nowUtc)) {
  return { error: "Data deve ser futura" }
}
```

**Arquivos**: `schedule/route.ts`, `published-posts/route.ts`, `cron/social-publish/route.ts`

---

### 3. Estado isRebuilding Separado (Bug Fix)

**Problema**: Botão "Reconstruir" girava após publicar (estado compartilhado).

**Solução**: Estado independente para rebuild.

```typescript
const [isRebuilding, setIsRebuilding] = useState(false)

// Botão "Reconstruir" usa seu próprio estado
<RefreshCw className={cn(isRebuilding && "animate-spin")} />
```

**Arquivo**: `content-actions-section.tsx`

---

### 4. Cron Jobs Configurados (Config)

**Problema**: Posts agendados não eram processados em produção.

**Solução**: Adicionar cron ao `vercel.json`.

```json
{
  "crons": [
    { "path": "/api/workers", "schedule": "* * * * *" },
    { "path": "/api/cron/social-publish", "schedule": "*/5 * * * *" }
  ]
}
```

**Arquivo**: `vercel.json`

---

## Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **UX de Publicação** | UI travada 30-60s | Toast instantâneo |
| **Timezone** | Bugs em agendamento | Validação correta |
| **Confusão UI** | "Regenerar" girando indevidamente | Estados separados |
| **Agendados** | Não processados | Cron automático |

---

## Documentação Relacionada

- **Erros Corrigidos**: `.context/docs/known-and-corrected-errors/035-social-publishing-async-fixes-jan2026.md`
- **Memória Serena**: `social-integration-patterns`
- **Memória Serena**: `queue-patterns`

## Data

Janeiro 2026
