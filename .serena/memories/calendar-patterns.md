# Calendar Page Patterns

**Projeto:** Máquina de Conteúdo
**Data:** 2026-01-15
**Status:** Fase 1-4 Concluída

---

## Visão Geral

O calendário editorial (`/calendar`) é uma página completa para visualização e gerenciamento de posts agendados em múltiplas redes sociais.

---

## Estrutura de Arquivos

```
src/app/(app)/calendar/
├── page.tsx                          # Server Component (root)
├── components/
│   ├── calendar-page.tsx             # Client Component principal
│   ├── calendar-header.tsx           # Header com navegação
│   ├── month-navigation.tsx          # Botões ← mês → Hoje
│   ├── view-switcher.tsx             # Mês/Semana/Dia toggle
│   ├── filter-bar.tsx                # Barra de filtros
│   ├── calendar-grid.tsx             # Grid principal
│   ├── calendar-day-header.tsx       # Dom Seg Ter...
│   ├── calendar-day.tsx              # Célula do dia
│   └── post-card.tsx                 # Card de post
├── hooks/
│   ├── use-calendar-navigation.ts    # Hook de navegação
│   ├── use-calendar-filters.ts       # Hook de filtros
│   └── use-calendar-posts.ts         # Hook de posts
└── actions/
    └── calendar-actions.ts           # Server Actions

src/types/
└── calendar.ts                       # Tipos TypeScript

src/lib/
└── calendar-utils.ts                 # Utilitários de data
```

---

## Tipos TypeScript

```typescript
// Views disponíveis
type CalendarView = "month" | "week" | "day"

// Plataformas suportadas
type Platform = "instagram" | "twitter" | "linkedin" | "tiktok"

// Filtros do calendário
interface CalendarFilters {
  platforms?: Platform[]
  statuses?: ContentStatus[]
  types?: PostType[]
}

// Range de datas para queries
interface CalendarDateRange {
  start: Date
  end: Date
}

// Célula do calendário
interface CalendarDayCell {
  date: Date
  isCurrentMonth: boolean
  posts: CalendarPost[]
}

// Post combinado (libraryItems + scheduledPosts)
interface CalendarPost {
  id: number
  libraryItemId: number
  type: PostType
  status: ContentStatus
  title: string | null
  content: string | null
  scheduledFor: Date | null
  platform: Platform
  scheduledPostId: number
  // ... outros campos
}
```

---

## Configurações de Plataforma

```typescript
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    icon: "instagram",
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-purple-500/10",
    badgeColor: "from-pink-500/30 to-purple-500/30 text-pink-300",
  },
  twitter: {
    label: "Twitter",
    icon: "twitter",
    color: "text-blue-400",
    bgGradient: "from-blue-500/10",
    badgeColor: "bg-blue-500/30 text-blue-300",
  },
  linkedin: {
    label: "LinkedIn",
    icon: "linkedin",
    color: "text-sky-400",
    bgGradient: "from-sky-500/10",
    badgeColor: "bg-sky-500/30 text-sky-300",
  },
  tiktok: {
    label: "TikTok",
    icon: "video",
    color: "text-gray-400",
    bgGradient: "from-gray-500/10 to-white/5",
    badgeColor: "bg-gray-500/30 text-gray-300",
  },
}
```

---

## Hooks Customizados

### useCalendarNavigation

Hook para gerenciar navegação do calendário (sem URL sync para evitar loops).

```typescript
interface UseCalendarNavigationReturn {
  currentDate: Date
  view: CalendarView
  goToPrevious: () => void
  goToNext: () => void
  goToToday: () => void
  updateView: (view: CalendarView) => void
}

const { currentDate, view, goToPrevious, goToNext, goToToday, updateView }
  = useCalendarNavigation()
```

### useCalendarFilters

Hook para gerenciar filtros (state local, sem URL sync).

```typescript
interface UseCalendarFiltersReturn {
  filters: CalendarFilters
  updateFilters: (newFilters: CalendarFilters) => void
  togglePlatform: (platform: Platform) => void
  toggleStatus: (status: ContentStatus) => void
  isPlatformActive: (platform: Platform) => boolean
  isStatusActive: (status: ContentStatus) => boolean
}

const { filters, updateFilters, togglePlatform, toggleStatus }
  = useCalendarFilters()
```

### useCalendarPosts

Hook para buscar posts com cache inteligente (usa `useRef` para evitar loops).

```typescript
interface UseCalendarPostsReturn {
  posts: CalendarPost[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const { posts, isLoading, error, refetch }
  = useCalendarPosts(dateRange, filters)
```

---

## Server Actions

```typescript
// Buscar posts para o calendário
getCalendarPostsAction(dateRange, filters): Promise<CalendarPost[]>

// Criar novo post
createPostAction(data: PostFormData): Promise<ActionResult>

// Atualizar post existente
updatePostAction(id, data): Promise<ActionResult>

// Soft delete
deletePostAction(id): Promise<ActionResult>

// Reagendar via drag & drop
reschedulePostAction(id, newDate): Promise<ActionResult>

// Duplicar post
duplicatePostAction(id, newScheduledFor?): Promise<ActionResult>
```

---

## Utilitários de Data

```typescript
// Retorna range mensal com padding dias
getMonthRange(date: Date): CalendarDateRange

// Retorna range semanal
getWeekRange(date: Date): CalendarDateRange

// Retorna range diário
getDayRange(date: Date): CalendarDateRange

// Gera células do calendário
generateCalendarDays(date: Date, view: CalendarView): CalendarDayCell[]

// Verifica se é hoje
isToday(date: Date): boolean

// Agrupa posts por data
groupPostsByDate<T>(posts: T[]): Record<string, T[]>
```

---

## Padrão: Evitar Infinite Loops

**Problema:** `useCallback` com dependências de objeto (`dateRange`, `filters`) causa re-render infinito.

**Solução:** Usar `useRef` para trackear dependencies via `JSON.stringify`:

```typescript
// ✅ CORRETO
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])

// ❌ ERRADO
const fetchPosts = useCallback(async () => {
  // ...
}, [dateRange, filters])  // Cria nova referência a cada render
```

---

## Melhorias Visuais (Janeiro 2026)

### CalendarDay - Datas Mais Visíveis

```tsx
// Números aumentados
<span className="text-base font-bold">{dayNumber}</span>

// Círculo "hoje" aumentado
className="bg-primary text-black w-7 h-7 rounded-full"

// Bordas nas células
className="border border-white/5"

// Background sutil para mês atual
isCurrentMonth && "bg-white/[0.02]"

// Badge de contagem proeminente
<Badge className="text-xs h-6 px-2 border-0 font-semibold bg-primary text-black">
  {posts.length}
</Badge>
```

### PostCard - Badges de Plataforma

```tsx
// Ícone da plataforma
const PlatformIcon = PLATFORM_ICONS[post.platform]

// Badge com ícone e cor específica
<Badge className={cn(
  "flex items-center gap-1 px-1.5 py-0 h-5 border-0 font-medium text-[10px]",
  post.platform === "instagram" && "bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-300",
  post.platform === "twitter" && "bg-blue-500/30 text-blue-300",
  // ...
)}>
  <PlatformIcon className="w-3 h-3" />
</Badge>
```

---

## Bugs Conhecidos

| Bug | Causa | Solução |
|-----|-------|---------|
| Infinite POST loop | `useCallback` com object deps | Usar `useRef` + `JSON.stringify` |
| TypeScript errors | Imports não utilizados | Remover imports não usados |
| Re-render excessivo | URL sync no router | Removido, usar state local |

---

## Próximos Passos

1. Implementar drag & drop para reagendar
2. Criar post dialog para criar/editar posts
3. Implementar week e day views
4. Adicionar skeleton loading e error handling
5. Acessibilidade (keyboard navigation, ARIA labels)
