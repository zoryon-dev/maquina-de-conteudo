# Fase 6: Calendário Editorial - Insights

**Projeto:** Máquina de Conteúdo
**Data:** 2026-01-15
**Status:** Fase 1-4 Concluída

---

## Visão Geral

Esta fase implementa o calendário editorial completo para visualização e gerenciamento de posts agendados em múltiplas redes sociais.

---

## Decisões Arquiteturais

### 1. Custom Calendar vs Biblioteca

**Decisão:** Construir componente customizado

**Justificativa:**
- ✅ Controle total sobre UI/UX
- ✅ Compatibilidade com Tailwind v4
- ✅ Integração com Framer Motion
- ✅ Bundle menor (~8KB vs 50KB+)
- ✅ Ajuste exato ao schema existente

### 2. State Management

**Decisão:** React hooks + state local (sem URL sync)

**Justificativa:**
- URL sync causava infinite loops
- State local é mais simples e performático
- URL sync pode ser adicionado no futuro se necessário

### 3. Server vs Client Components

| Componente | Tipo | Justificativa |
|------------|------|---------------|
| `page.tsx` | Server | Fetch inicial de dados |
| `calendar-page.tsx` | Client | Interatividade completa |
| `calendar-grid.tsx` | Client | Animações, drag & drop |
| `post-card.tsx` | Client | Hover, drag, menu |

---

## Problemas Encontrados e Soluções

### Problema 1: Infinite POST Loop

**Sintoma:** O calendário fazia requests POST infinitas para `/calendar`.

**Causa Raiz:**
- `use-calendar-posts.ts`: `useCallback` com dependências de objeto (`dateRange`, `filters`) criava nova referência a cada render
- `use-calendar-navigation.ts`: `router.push()` em `updateUrl` causava re-renders
- `use-calendar-filters.ts`: `router.push()` em updates de filtros causava re-renders

**Solução:**
```typescript
// Antes (ERRADO)
const fetchPosts = useCallback(async () => {
  // ...
}, [dateRange, filters])  // Nova referência a cada render!

// Depois (CORRETO)
const prevDepsRef = useRef<string>("")
useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])
```

**Aprendizado:** Evitar `useCallback` com dependências de objeto. Usar `useRef` + `JSON.stringify` para comparação de estabilidade.

### Problema 2: TypeScript Errors

**Sintoma:** Múltiplos erros de TypeScript após refatoração.

**Causas:**
- Imports não utilizados
- Tipos Framer Motion variants
- Tipos de drag events
- Status "archived" faltando

**Soluções:**
- Remover imports não utilizados
- Usar `satisfies object` para variants do Framer Motion
- Cast drag events: `const dragEvent = e as unknown as React.DragEvent`
- Adicionar status "archived" em STATUS_CONFIGS

### Problema 3: Datas Não Visíveis

**Sintoma:** Usuário reportou "não tá dando para ver" as datas.

**Causa:** Números pequenos (`text-sm`), pouco contraste.

**Solução:**
- Aumentar para `text-base font-bold`
- Círculo "hoje" maior (w-7 h-7)
- Bordas nas células (`border-white/5`)
- Background sutil (`bg-white/[0.02]`)
- Badge de contagem mais proeminente

### Problema 4: Badges de Plataforma Pouco Visíveis

**Sintoma:** Usuário pediu "badges para as redes sociais".

**Causa:** Ponto colorido pequeno (`w-3 h-3 rounded-full`).

**Solução:**
- Substituir por badge com ícone da plataforma
- Background colorido por plataforma
- Label visível em telas maiores

---

## Padrões Estabelecidos

### 1. Platform Config Pattern

```typescript
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    icon: "instagram",
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-purple-500/10",
    badgeColor: "from-pink-500/30 to-purple-500/30 text-pink-300",
  },
  // ...
}
```

**Benefícios:**
- Centraliza configurações visuais
- Facilita adicionar novas plataformas
- Consistência em toda a aplicação

### 2. Server Actions Pattern

```typescript
"use server"

export async function getCalendarPostsAction(
  dateRange: { start: Date; end: Date },
  filters: CalendarFilters = {}
): Promise<CalendarPost[]> {
  const { userId } = await auth()
  if (!userId) return []

  // Query com Drizzle ORM
  const result = await db
    .select()
    .from(libraryItems)
    .innerJoin(scheduledPosts, eq(libraryItems.id, scheduledPosts.libraryItemId))
    .where(eq(libraryItems.userId, userId))

  return result
}
```

**Benefícios:**
- Server-side processing seguro
- Type safety
- Reutilizável

### 3. Custom Hook Pattern

```typescript
export function useCalendarPosts(
  dateRange: CalendarDateRange,
  filters: CalendarFilters = {}
): UseCalendarPostsReturn {
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const prevDepsRef = useRef<string>("")

  const fetchPosts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getCalendarPostsAction(dateRange, filters)
      setPosts(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar posts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const deps = JSON.stringify({ dateRange, filters })
    if (deps !== prevDepsRef.current) {
      prevDepsRef.current = deps
      fetchPosts()
    }
  }, [dateRange, filters])

  return { posts, isLoading, error, refetch: fetchPosts }
}
```

**Benefícios:**
- Separação de concerns
- Cache inteligente
- Reutilizável

---

## Performance Considerations

### 1. Memoization

```typescript
// Memoizar geração de dias do calendário
const calendarDays = useMemo(
  () => generateCalendarDays(currentDate, view),
  [currentDate, view]
)
```

### 2. Índices do Banco

```sql
-- Índice composto para queries do calendário
CREATE INDEX idx_library_items_calendar_query
ON library_items(user_id, scheduled_for, status)
WHERE deleted_at IS NULL;

-- Índice para scheduled_posts
CREATE INDEX idx_scheduled_posts_scheduled_for
ON scheduled_posts(scheduled_for DESC);
```

---

## Próximos Passos

| Fase | Descrição | Prioridade |
|------|-----------|------------|
| Fase 5 | Drag & Drop para reagendar | Alta |
| Fase 6 | Post Dialog para criar/editar | Alta |
| Fase 7 | Quick Actions menu | Média |
| Fase 8 | Week & Day Views | Média |
| Fase 9 | Polish & Optimization | Baixa |
| Fase 10 | Testing & Documentation | Baixa |

---

## Documentação Relacionada

- `.context/docs/development-plan/calendar-dev-plan.md` - Planejamento completo
- `.serena/memories/calendar-patterns.md` - Padrões de implementação
- `CLAUDE.md` - Atualizado com seção de calendário

---

*Última atualização: 2026-01-15*
