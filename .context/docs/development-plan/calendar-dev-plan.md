# Calendário Editorial - Architecture Blueprint

**Projeto:** Máquina de Conteúdo
**Documento:** Planejamento completo da página `/calendar`
**Data:** 2026-01-15
**Status:** 🚧 EM DESENVOLVIMENTO (Fase 1-4 Concluída)
**Estimativa:** 5-6 dias de desenvolvimento

---

## 📊 Status Atual (Janeiro 2026)

### Fases Concluídas

| Fase | Status | Data |
|------|--------|------|
| Fase 1: Foundation | ✅ Concluída | 2026-01-15 |
| Fase 2: Navigation & Filters | ✅ Concluída | 2026-01-15 |
| Fase 3: Calendar Grid | ✅ Concluída | 2026-01-15 |
| Fase 4: Post Cards | ✅ Concluída | 2026-01-15 |
| Fase 5: Drag & Drop | ⏸️ Pendente | - |
| Fase 6: Post Dialog | ⏸️ Pendente | - |

### Arquivos Criados

```
✅ src/types/calendar.ts                    # Tipos TypeScript
✅ src/lib/calendar-utils.ts                # Funções de data
✅ src/app/(app)/calendar/page.tsx          # Página principal
✅ src/app/(app)/calendar/components/
   ├── calendar-page.tsx                    # Client component
   ├── calendar-header.tsx                  # Header
   ├── month-navigation.tsx                 # ← mês → Hoje
   ├── view-switcher.tsx                    # Mês/Semana/Dia
   ├── filter-bar.tsx                       # Barra de filtros
   ├── calendar-grid.tsx                    # Grid principal
   ├── calendar-day-header.tsx              # Dom Seg Ter...
   ├── calendar-day.tsx                     # Célula do dia
   └── post-card.tsx                        # Card de post
✅ src/app/(app)/calendar/hooks/
   ├── use-calendar-navigation.ts           # Hook navegação
   ├── use-calendar-filters.ts              # Hook filtros
   └── use-calendar-posts.ts                # Hook posts
✅ src/app/(app)/calendar/actions/
   └── calendar-actions.ts                  # Server actions
```

### Melhorias Visuais Implementadas (Janeiro 2026)

**Data:** 2026-01-15
**Issue:** "Datas não visíveis, precisa de badges de redes sociais"

#### CalendarDay - Datas Mais Visíveis
- Números aumentados de `text-sm` para `text-base font-bold`
- Círculo "hoje" aumentado (w-7 h-7 vs w-6 h-6)
- Bordas nas células (`border-white/5`)
- Background sutil para dias do mês atual (`bg-white/[0.02]`)
- Contraste melhorado (`text-white/90`)
- Badge de contagem mais proeminente (h-6, primary color)

#### PostCard - Badges de Plataforma
- Substituído ponto pequeno por badge com ícone da rede social
- Cores específicas por plataforma:
  - Instagram: `from-pink-500/30 to-purple-500/30 text-pink-300`
  - Twitter: `bg-blue-500/30 text-blue-300`
  - LinkedIn: `bg-sky-500/30 text-sky-300`
  - TikTok: `bg-gray-500/30 text-gray-300`
- Ícone visível em todos os tamanhos de tela
- Bordas nos cards para definição visual

### Bugs Corrigidos (Janeiro 2026)

| Issue | Solução | Arquivo |
|-------|---------|---------|
| Infinite POST loop | Removido URL sync, usado `useRef` | hooks/* |
| TypeScript errors | Corrigidos imports e tipos | componentes/* |
| Hooks re-render | Simplificado state management | use-calendar-*.ts |

---

## 1. Overview & Goals

### 1.1 Objetivos Principais

O calendário editorial (`/calendar`) é o centro de planejamento e gestão de conteúdo onde:

1. **Visualiza Posts Agendados** - Vista mensal/semanal/diária de conteúdo programado
2. **Agenda Conteúdo** - Cria e agenda posts para múltiplas redes sociais
3. **Gerencia Posts** - Edita, duplica, exclui e reagenda posts via drag & drop
4. **Filtra Conteúdo** - Por rede social, status, tipo de conteúdo

### 1.2 Redes Sociais Suportadas

| Plataforma | Status | Características |
|------------|--------|-----------------|
| Instagram | ✅ Prioridade | Carrossel, Stories, Reels |
| Twitter/X | ✅ Prioridade | Threads,Texto, Imagens |
| LinkedIn | ✅ Prioridade | Texto, Imagens, Documentos |
| TikTok | ⏸️ Futuro | Vídeos curtos |

### 1.3 Tipos de Conteúdo

```typescript
type PostType = "text" | "image" | "carousel" | "video" | "story"
```

| Tipo | Descrição | Plataformas |
|------|-----------|-------------|
| `text` | Post de texto only | Twitter, LinkedIn |
| `image` | Imagem única | Instagram, Twitter, LinkedIn |
| `carousel` | Múltiplas imagens | Instagram, LinkedIn |
| `video` | Vídeo curto | Instagram, TikTok |
| `story` | Conteúdo efêmero | Instagram, TikTok |

### 1.4 Status do Conteúdo

```typescript
type ContentStatus = "draft" | "scheduled" | "published" | "archived"
```

| Status | Descrição | Cor no UI |
|--------|-----------|-----------|
| `draft` | Rascunho, sem data | `bg-gray-500/10 text-gray-400` |
| `scheduled` | Agendado, data futura | `bg-primary/10 text-primary` |
| `published` | Publicado | `bg-green-500/10 text-green-400` |
| `archived` | Arquivado | `bg-amber-500/10 text-amber-400` |

---

## 2. Arquitetura de Dados

### 2.1 Schema do Banco de Dados

O calendário utiliza duas tabelas existentes sem modificações:

```typescript
// library_items - Conteúdo criado
interface LibraryItem {
  id: number
  userId: string
  type: PostType
  status: ContentStatus
  title: string | null
  content: string | null      // JSON string
  mediaUrl: string | null     // Array de URLs (JSON string)
  metadata: string | null     // JSON
  scheduledFor: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// scheduled_posts - Agendamento por plataforma
interface ScheduledPost {
  id: number
  libraryItemId: number       // FK → libraryItems.id
  platform: Platform
  scheduledFor: Date
  status: "pending" | "published" | "failed"
  postedAt: Date | null
  platformPostId: string | null  // ID externo após publicar
  error: string | null
  createdAt: Date
}

type Platform = "instagram" | "twitter" | "linkedin" | "tiktok"
```

### 2.2 Relacionamento

```
┌─────────────────────┐       ┌──────────────────────┐
│   library_items     │       │   scheduled_posts    │
├─────────────────────┤       ├──────────────────────┤
│ id (PK)            │<──────│ libraryItemId (FK)   │
│ userId             │       │ id (PK)              │
│ type               │       │ platform             │
│ status             │       │ scheduledFor         │
│ scheduledFor       │       │ status               │
│ content (JSONB)    │       │ postedAt             │
│ mediaUrl (JSONB)   │       │ platformPostId       │
│ title              │       │ error                │
└─────────────────────┘       └──────────────────────┘
```

**Importante:** Um `libraryItem` pode ter múltiplos `scheduledPosts` (um por plataforma).

### 2.3 Índices Necessários

```sql
-- Índice composto para queries do calendário
CREATE INDEX idx_library_items_calendar_query
ON library_items(user_id, scheduled_for, status, type)
WHERE deleted_at IS NULL;

-- Índice para scheduled_posts
CREATE INDEX idx_scheduled_posts_scheduled_for
ON scheduled_posts(scheduled_for DESC);

-- Índice para join
CREATE INDEX idx_scheduled_posts_library_item
ON scheduled_posts(library_item_id);
```

---

## 3. Component Hierarchy

```
src/app/(app)/calendar/
├── page.tsx                          # Server Component (root)
│   └── components/
│       ├── calendar-page.tsx         # Client Component principal
│       │   ├── calendar-header.tsx   # Header com navegação
│       │   │   ├── month-navigation.tsx
│       │   │   ├── view-switcher.tsx
│       │   │   └── filter-bar.tsx
│       │   │       ├── platform-filter.tsx
│       │   │       ├── status-filter.tsx
│       │   │       └── type-filter.tsx
│       │   │
│       │   ├── calendar-grid.tsx     # Grid principal
│       │   │   ├── calendar-day-header.tsx
│       │   │   └── calendar-day.tsx
│       │   │       └── post-card.tsx
│       │   │
│       │   └── post-dialog.tsx       # Dialog criar/editar
│       │       ├── post-form.tsx
│       │       ├── platform-selector.tsx
│       │       ├── date-time-picker.tsx
│       │       └── content-editor.tsx
│       │
│       ├── hooks/
│       │   ├── use-calendar-navigation.ts
│       │   ├── use-calendar-filters.ts
│       │   └── use-calendar-posts.ts
│       │
│       └── actions/
│           └── calendar-actions.ts   # Server Actions
│               ├── getCalendarPosts
│               ├── createPost
│               ├── updatePost
│               ├── deletePost
│               ├── reschedulePost
│               └── duplicatePost
│
src/types/
└── calendar.ts                       # Tipos TypeScript centralizados
│
src/lib/
└── calendar-utils.ts                 # Utilitários de data
```

---

## 4. UI/UX Layout

### 4.1 Estrutura Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header (AppLayout - existente)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Calendário Editorial                                          │ │
│  │  Planeje e gerencie suas publicações em múltiplas redes       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  ← Janeiro 2026 →    [Mês] [Semana] [Dia]       [+ Novo Post]│ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │  Platform: [Instagram] [Twitter] [LinkedIn] [TikTok]           │ │
│  │  Status:   [Rascunho] [Agendado] [Publicado]                  │ │
│  │  Tipo:     [Texto] [Imagem] [Carrossel] [Vídeo]                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                     │
│  │ Dom │ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │                     │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                     │
│  │     │  1  │  2  │  3  │  4  │  5  │  6  │                     │
│  │     │     │ [2] │     │ [1] │     │ [3] │                     │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                     │
│  │  7  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │                     │
│  │ [1] │     │ [3] │     │ [2] │     │     │                     │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                     │
│  │ 14  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │                     │
│  │     │ [4] │     │ [1] │     │ [2] │     │                     │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                     │
│  │ 21  │ 22  │ 23  │ 24  │ 25  │ 26  │ 27  │                     │
│  │ [2] │     │     │ [3] │     │ [1] │     │                     │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                     │
│  │ 28  │ 29  │ 30  │ 31  │     │     │     │                     │
│  │     │ [1] │     │ [2] │     │     │     │                     │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                     │
│                                                                     │
│  Legenda: [N] = N posts agendados para este dia                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Post Card no Calendário

```
┌──────────────────────────────────────────────────────────────┐
│ 📸 [Agendado]                            [⋯ quick actions]  │
│                                                              │
│ Promote new product launch with special discount...         │
│ Limited time offer - 50% off all items! Shop now...         │
│                                                              │
│ 🕐 14:30                                         Instagram  │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Cores por Plataforma

```typescript
const PLATFORM_CONFIG = {
  instagram: {
    gradient: 'from-pink-500/10 to-purple-500/10',
    color: 'text-pink-400',
    bg: 'bg-pink-500/20'
  },
  twitter: {
    gradient: 'from-blue-500/10',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  linkedin: {
    gradient: 'from-sky-500/10',
    color: 'text-sky-400',
    bg: 'bg-sky-500/20'
  },
  tiktok: {
    gradient: 'from-gray-500/10 to-white/5',
    color: 'text-gray-400',
    bg: 'bg-gray-500/20'
  },
}
```

### 4.4 Week View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ←  12 - 18 Jan 2026  →   [Mês] [Semana] [Dia]              [+ Novo Post]│
├─────────────────────────────────────────────────────────────────────────┤
│  Seg 12                     Ter 13                    Qua 14             │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌───────────────┐│
│  │ 09:00               │    │ 09:00               │    │ 09:00          ││
│  │                     │    │                     │    │               ││
│  │ 10:00               │    │ 10:00               │    │ 10:00          ││
│  │ [Post 1 - Twitter]  │    │                     │    │               ││
│  │ 14:30 [Post 2 - IG] │    │ 14:00 [Post 3 - LI] │    │               ││
│  │                     │    │                     │    │               ││
│  │ ...                 │    │ ...                 │    │ ...           ││
│  └─────────────────────┘    └─────────────────────┘    └───────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Day View

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ←  15 Jan 2026  →   [Mês] [Semana] [Dia]                [+ Novo Post]  │
├───────────────────────────────────────────────────────────────────────────┤
│  Quinta-feira, 15 de Janeiro de 2026                                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  09:00  ┌────────────────────────────────────────────────────────┐       │
│         │                                                        │       │
│  10:00  │                                                        │       │
│         └────────────────────────────────────────────────────────┘       │
│                                                                           │
│  11:00  ┌────────────────────────────────────────────────────────┐       │
│         │                                                        │       │
│  12:00  │  📸 [Agendado] Post sobre produto...           [⋯]    │       │
│         │  🕐 12:30                                        Instagram│       │
│  13:00  │                                                        │       │
│         └────────────────────────────────────────────────────────┘       │
│                                                                           │
│  14:00  ┌────────────────────────────────────────────────────────┐       │
│         │  🐦 [Agendado] Thread sobre launch...            [⋯]    │       │
│  15:00  │  🕐 14:45                                        Twitter │       │
│         │                                                        │       │
│  16:00  └────────────────────────────────────────────────────────┘       │
│                                                                           │
│  ...                                                                      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Server Actions

### 5.1 Arquivo

`src/app/(app)/calendar/actions/calendar-actions.ts`

### 5.2 Ações Disponíveis

```typescript
"use server"

// ========================================
// GET
// ========================================

/**
 * Busca posts para o calendário com filtros
 * @param dateRange - { start: Date, end: Date }
 * @param filters - { platforms?, statuses?, types? }
 * @returns CalendarPost[]
 */
export async function getCalendarPostsAction(
  dateRange: { start: Date; end: Date },
  filters: CalendarFilters = {}
): Promise<CalendarPost[]>

// ========================================
// CREATE
// ========================================

/**
 * Cria novo library item e scheduled posts
 * @param data - PostFormData
 * @returns { success, libraryItemId?, error? }
 */
export async function createPostAction(
  data: PostFormData
): Promise<ActionResult>

// ========================================
// UPDATE
// ========================================

/**
 * Atualiza library item e scheduled posts
 * @param id - Library item ID
 * @param data - Partial<PostFormData>
 * @returns { success, error? }
 */
export async function updatePostAction(
  id: number,
  data: Partial<PostFormData>
): Promise<ActionResult>

// ========================================
// DELETE
// ========================================

/**
 * Soft delete library item
 * @param id - Library item ID
 * @returns { success, error? }
 */
export async function deletePostAction(
  id: number
): Promise<ActionResult>

// ========================================
// RESCHEDULE (Drag & Drop)
// ========================================

/**
 * Move post para nova data
 * @param id - Library item ID
 * @param newDate - Nova data de agendamento
 * @returns { success, error? }
 */
export async function reschedulePostAction(
  id: number,
  newDate: Date
): Promise<ActionResult>

// ========================================
// DUPLICATE
// ========================================

/**
 * Duplica library item e scheduled posts
 * @param id - Library item ID
 * @param newScheduledFor - Opcional nova data
 * @returns { success, libraryItemId?, error? }
 */
export async function duplicatePostAction(
  id: number,
  newScheduledFor?: Date
): Promise<ActionResult>
```

### 5.3 Query SQL (Referência)

```sql
-- Query base para getCalendarPostsAction
SELECT
  li.id,
  li.type,
  li.status,
  li.title,
  li.content,
  li.scheduled_for,
  li.media_url,
  sp.id as scheduled_post_id,
  sp.platform,
  sp.status as scheduled_post_status
FROM library_items li
INNER JOIN scheduled_posts sp ON sp.library_item_id = li.id
WHERE
  li.user_id = $1
  AND li.deleted_at IS NULL
  AND li.scheduled_for >= $2
  AND li.scheduled_for <= $3
  AND ($4::text[] IS NULL OR sp.platform = ANY($4))
  AND ($5::content_status[] IS NULL OR li.status = ANY($5))
  AND ($6::post_type[] IS NULL OR li.type = ANY($6))
ORDER BY li.scheduled_for ASC
```

---

## 6. TypeScript Types

### 6.1 Arquivo

`src/types/calendar.ts`

### 6.2 Tipos Principais

```typescript
/**
 * Calendar view modes
 */
export type CalendarView = 'month' | 'week' | 'day'

/**
 * Social media platforms
 */
export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'tiktok'

/**
 * Calendar filters
 */
export interface CalendarFilters {
  platforms?: Platform[]
  statuses?: ContentStatus[]
  types?: PostType[]
}

/**
 * Calendar post (combined from libraryItems + scheduledPosts)
 */
export interface CalendarPost {
  // Library item fields
  id: number
  libraryItemId: number
  type: PostType
  status: ContentStatus
  title: string | null
  content: string | null
  scheduledFor: Date | null
  mediaUrl: string | null
  createdAt: Date
  updatedAt: Date

  // Scheduled post fields
  scheduledPostId: number
  platform: Platform
  scheduledPostStatus: 'pending' | 'published' | 'failed'
  postedAt: Date | null
}

/**
 * Post form data (for create/edit)
 */
export interface PostFormData {
  title?: string
  content: string
  type: PostType
  platforms: Platform[]
  scheduledFor?: Date
  mediaUrl?: string[]
}

/**
 * Calendar date range
 */
export interface CalendarDateRange {
  start: Date
  end: Date
  visibleStart: Date  // Includes padding days
  visibleEnd: Date
}

/**
 * Calendar grid cell
 */
export interface CalendarDayCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: CalendarPost[]
}

/**
 * Server action result
 */
export interface ActionResult {
  success: boolean
  error?: string
  libraryItemId?: number
}
```

---

## 7. Hooks Customizados

### 7.1 useCalendarNavigation

```typescript
/**
 * Hook para gerenciar navegação do calendário
 * @param initialView - Vista inicial (default: 'month')
 */
export function useCalendarNavigation(initialView?: CalendarView) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<CalendarView>(initialView || 'month')

  const goToPrevious = () => { /* ... */ }
  const goToNext = () => { /* ... */ }
  const goToToday = () => { /* ... */ }
  const updateView = (newView: CalendarView) => { /* ... */ }

  return {
    currentDate,
    view,
    setCurrentDate,
    goToPrevious,
    goToNext,
    goToToday,
    updateView,
  }
}
```

### 7.2 useCalendarFilters

```typescript
/**
 * Hook para gerenciar filtros do calendário
 * Sincroniza com URL search params
 */
export function useCalendarFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [filters, setFilters] = useState<CalendarFilters>({ /* ... */ })

  const updateFilters = (newFilters: CalendarFilters) => { /* ... */ }
  const resetFilters = () => { /* ... */ }

  return {
    filters,
    updateFilters,
    resetFilters,
  }
}
```

### 7.3 useCalendarPosts

```typescript
/**
 * Hook para buscar posts do calendário
 */
export function useCalendarPosts(
  dateRange: CalendarDateRange,
  filters: CalendarFilters
) {
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch logic with useEffect...

  return { posts, isLoading, error }
}
```

---

## 8. Utilitários de Data

### 8.1 Arquivo

`src/lib/calendar-utils.ts`

### 8.2 Funções

```typescript
/**
 * Retorna o range de datas para visualização mensal
 * Inclui dias de padding do mês anterior/próximo
 */
export function getMonthRange(date: Date): CalendarDateRange

/**
 * Retorna o range de datas para visualização semanal
 */
export function getWeekRange(date: Date): CalendarDateRange

/**
 * Retorna o range para visualização diária
 */
export function getDayRange(date: Date): CalendarDateRange

/**
 * Gera células do calendário para uma view
 */
export function generateCalendarDays(
  date: Date,
  view: CalendarView
): CalendarDayCell[]

/**
 * Verifica se uma data é hoje
 */
export function isToday(date: Date): boolean

/**
 * Verifica se duas datas estão no mesmo mês
 */
export function isSameMonth(date1: Date, date2: Date): boolean

/**
 * Extrai preview do conteúdo JSON
 */
export function extractContentPreview(
  content: string | null,
  maxLength = 60
): string

/**
 * Formata data para exibição
 */
export function formatCalendarDate(
  date: Date,
  format: string
): string
```

---

## 9. Animações (Framer Motion)

### 9.1 Grid Fade In

```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
}

const cellVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    }
  },
}
```

### 9.2 Post Card Hover

```typescript
const cardVariants = {
  idle: {
    scale: 1,
    boxShadow: "0 0 0 rgba(163, 230, 53, 0)",
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 10px 40px rgba(163, 230, 53, 0.1)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17,
    }
  },
}
```

### 9.3 Dialog Slide In

```typescript
const dialogVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 }
  },
}
```

---

## 10. Drag & Drop

### 10.1 HTML5 Drag & Drop API

```typescript
// PostCard (draggable)
<motion.div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('text/plain', String(post.id))
    e.dataTransfer.effectAllowed = 'move'
  }}
>

// CalendarDay (drop zone)
<div
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    e.preventDefault()
    const postId = parseInt(e.dataTransfer.getData('text/plain'))
    onPostDrop(postId, day.date)
  }}
>
```

### 10.2 Estados Visuais

```typescript
// Drag feedback
const [isDragging, setIsDragging] = useState(false)
const [dragOverDay, setDragOverDay] = useState<Date | null>(null)

// PostCard quando arrastando
className={cn(
  "cursor-grab",
  isDragging && "cursor-grabbing opacity-50 scale-105"
)}

// CalendarDay quando tem drag over
className={cn(
  "calendar-day",
  dragOverDay && isSameDay(dragOverDay, day.date) && "bg-primary/10"
)}
```

---

## 11. Fases de Implementação

### Fase 1: Foundation (Dia 1)

**Objetivo:** Criar base de tipos, utilitários e server actions

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 1.1 | `src/types/calendar.ts` | Criar todos os tipos TypeScript |
| 1.2 | `src/lib/calendar-utils.ts` | Implementar funções de data |
| 1.3 | `calendar-actions.ts` | Implementar `getCalendarPostsAction` |
| 1.4 | - | Testar query no banco |

**Checklist:**
- [ ] Tipos criados e exportados
- [ ] `getMonthRange()` retorna range correto
- [ ] `generateCalendarDays()` gera 35-42 células
- [ ] Query retorna posts com join correto

---

### Fase 2: Navigation & Filters (Dia 1-2)

**Objetivo:** Criar sistema de navegação e filtros

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 2.1 | `use-calendar-navigation.ts` | Hook de navegação com URL sync |
| 2.2 | `use-calendar-filters.ts` | Hook de filtros com URL sync |
| 2.3 | `month-navigation.tsx` | Botões ← mês → Hoje |
| 2.4 | `view-switcher.tsx` | Seletor Mês/Semana/Dia |
| 2.5 | `filter-bar.tsx` | Barra de filtros completa |
| 2.6 | `platform-filter.tsx` | Filtro de plataformas |
| 2.7 | `status-filter.tsx` | Filtro de status |
| 2.8 | `type-filter.tsx` | Filtro de tipo |

**Checklist:**
- [ ] Navegação sincroniza com URL (?date=2026-01-15&view=month)
- [ ] Filtros sincronizam com URL (?platforms=instagram,twitter)
- [ ] Botão "Hoje" volta para data atual
- [ ] View switcher muda visualização

---

### Fase 3: Calendar Grid (Dia 2)

**Objetivo:** Criar grid do calendário (mês)

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 3.1 | `calendar-day-header.tsx` | Headers Dom Seg Ter... |
| 3.2 | `calendar-day.tsx` | Célula do dia |
| 3.3 | `calendar-grid.tsx` | Grid com Framer Motion |
| 3.4 | `calendar-page.tsx` | Page component principal |

**Checklist:**
- [ ] Grid 7x6 renderiza corretamente
- [ ] Dias de padding têm visual diferenciado
- [ ] Hoje tem highlight (bg-primary/5)
- [ ] Animação stagger nas células

---

### Fase 4: Post Cards (Dia 2-3)

**Objetivo:** Criar cards de posts no calendário

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 4.1 | `post-card.tsx` | Card compacto |
| 4.2 | - | Platform icons com cores |
| 4.3 | - | Status badges |
| 4.4 | - | Preview do conteúdo |
| 4.5 | - | Quick actions menu |

**Checklist:**
- [ ] Card mostra ícone da plataforma
- [ ] Badge de status com cor correta
- [ ] Preview truncate em 60 caracteres
- [ ] Hover com scale + shadow
- [ ] Quick actions no hover

---

### Fase 5: Drag & Drop (Dia 3)

**Objetivo:** Implementar arrastar para reagendar

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 5.1 | `post-card.tsx` | Adicionar draggable |
| 5.2 | `calendar-day.tsx` | Adicionar drop zone |
| 5.3 | `calendar-actions.ts` | `reschedulePostAction` |
| 5.4 | - | Feedback visual no drag |

**Checklist:**
- [ ] Post pode ser arrastado
- [ ] Drop zone highlight quando drag over
- [ ] `reschedulePostAction` atualiza data
- [ ] Toast de sucesso após drop

---

### Fase 6: Post Dialog (Dia 3-4)

**Objetivo:** Criar dialog para criar/editar posts

| Tarefa | Arquivo | Descrição |
|--------|---------|-----------|
| 6.1 | `post-dialog.tsx` | Dialog shell |
| 6.2 | `post-form.tsx` | Formulário |
| 6.3 | `platform-selector.tsx` | Multi-select plataformas |
| 6.4 | `date-time-picker.tsx` | DatePicker custom |
| 6.5 | `content-editor.tsx` | Editor de conteúdo |
| 6.6 | `calendar-actions.ts` | `createPostAction`, `updatePostAction` |

**Checklist:**
- [ ] Dialog abre/fecha corretamente
- [ ] Form valida campos obrigatórios
- [ ] Multi-select de plataformas funciona
- [ ] DatePicker permite data/hora
- [ ] Editor suporta texto simples
- [ ] Toast de sucesso/erro

---

### Fase 7: Quick Actions (Dia 4)

**Objetivo:** Adicionar ações rápidas aos cards

| Tarefa | Descrição |
|--------|-----------|
| 7.1 | Dropdown Editar/Duplicar/Excluir |
| 7.2 | `deletePostAction` |
| 7.3 | `duplicatePostAction` |
| 7.4 | Confirmação para ações destrutivas |

**Checklist:**
- [ ] Menu dropdown abre corretamente
- [ ] Editar abre dialog com dados
- [ ] Duplicar cria cópia com "(cópia)"
- [ ] Excluir tem confirmação
- [ ] Soft delete funciona

---

### Fase 8: Week & Day Views (Dia 4-5)

**Objetivo:** Implementar visualizações semanal e diária

| Tarefa | Descrição |
|--------|-----------|
| 8.1 | Adaptar grid para 7 colunas (sem ana) |
| 8.2 | Adaptar grid para 1 coluna com time slots (dia) |
| 8.3 | Renderizar horários na day view |
| 8.4 | Posicionar cards por horário |

**Checklist:**
- [ ] Week view mostra 7 dias
- [ ] Day view mostra 24 horas
- [ ] Posts posicionados corretamente por horário
- [ ] Navegação funciona entre views

---

### Fase 9: Polish & Optimization (Dia 5)

**Objetivo:** Ajustes finos e otimização

| Tarefa | Descrição |
|--------|-----------|
| 9.1 | Loading states (skeletons) |
| 9.2 | Error handling com toast |
| 9.3 | Responsive design (mobile) |
| 9.4 | Keyboard shortcuts |
| 9.5 | Otimizar queries |
| 9.6 | Criar índices no banco |

**Checklist:**
- [ ] Skeleton durante loading
- [ ] Erros mostram toast descritivo
- [ ] Mobile stack cells verticalmente
- [ ] Arrow keys navegam datas
- [ ] Queries usam índices
- [ ] Índices criados no banco

---

### Fase 10: Testing & Documentation (Dia 5-6)

**Objetivo:** Testes e documentação final

| Tarefa | Descrição |
|--------|-----------|
| 10.1 | Testar com dados reais |
| 10.2 | Testar edge cases (DST, leap year) |
| 10.3 | Documentar componentes |
| 10.4 | Atualizar architecture.md |
| 10.5 | Criar insights document |

**Checklist:**
- [ ] Teste E2E de fluxo completo
- [ ] Teste com múltiplos posts
- [ ] Teste drag & drop
- [ ] Documentação atualizada
- [ ] Insights salvos

---

## 12. Decisões Técnicas

### 12.1 Custom Calendar vs Biblioteca

**Decisão:** Construir componente customizado

**Justificativa:**
- ✅ Controle total sobre UI/UX
- ✅ Compatibilidade com Tailwind v4
- ✅ Integração com Framer Motion
- ✅ Bundle menor (~8KB vs 50KB+)
- ✅ Ajuste exato ao schema existente
- ❌ Mais tempo de desenvolvimento (2-3 dias vs 1 dia)

### 12.2 Server Components vs Client Components

| Componente | Tipo | Justificativa |
|------------|------|---------------|
| `page.tsx` | Server | Fetch inicial de dados |
| `calendar-page.tsx` | Client | Interatividade completa |
| `calendar-header.tsx` | Client | Navegação interativa |
| `calendar-grid.tsx` | Client | Drag & drop, animações |
| `post-card.tsx` | Client | Hover, drag, menu |
| `post-dialog.tsx` | Client | Form interativo |

### 12.3 State Management

**Decisão:** React hooks + URL params (sem Zustand inicialmente)

**Justificativa:**
- URLs são "source of truth"
- Compartilhável via link
- Browser back/forward funciona
- Pode adicionar Zustand depois se necessário

### 12.4 Data Handling

**Decisão:** Usar `date-fns` (já disponível via outras dependências)

**Alternativas consideradas:**
- `date-fns` ✅ Escolhido (modular, tree-shakeable)
- `dayjs` ❌ (similar, mas date-fns já usado)
- `luxon` ❌ (bundle maior)

---

## 13. Performance Considerations

### 13.1 Query Optimization

```sql
-- Índice composto para queries do calendário
CREATE INDEX idx_library_items_calendar_query
ON library_items(user_id, scheduled_for DESC)
WHERE deleted_at IS NULL;

-- Índice para scheduled_posts
CREATE INDEX idx_scheduled_posts_calendar
ON scheduled_posts(library_item_id, scheduled_for DESC);
```

### 13.2 Memoization

```typescript
// Memoizar geração de dias do calendário
const calendarDays = useMemo(
  () => generateCalendarDays(currentDate, view),
  [currentDate, view]
)

// Memoizar posts filtrados
const filteredPosts = useMemo(
  () => filterPosts(posts, filters),
  [posts, filters]
)
```

### 13.3 Virtualization (se necessário)

```typescript
// Para day view com muitos slots
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: 24, // 24 horas
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // 60px por hora
})
```

---

## 14. Accessibility (a11y)

### 14.1 Keyboard Navigation

| Tecla | Ação |
|-------|------|
| `←` | Dia anterior |
| `→` | Próximo dia |
| `↑` | Semana anterior |
| `↓` | Próxima semana |
| `T` | Ir para hoje |
| `M` | Mudar para mês view |
| `W` | Mudar para semana view |
| `D` | Mudar para dia view |

### 14.2 ARIA Labels

```typescript
<button
  aria-label="Mês anterior"
  onClick={goToPrevious}
>
  <ChevronLeft />
</button>

<div
  role="grid"
  aria-label="Calendário de janeiro de 2026"
>
  {days.map(day => (
    <div
      role="gridcell"
      aria-label={`${format(day.date, 'd MMM')}: ${day.posts.length} posts`}
      aria-selected={isToday(day.date)}
    >
      {/* ... */}
    </div>
  ))}
</div>
```

### 14.3 Screen Reader Announcements

```typescript
<div role="status" aria-live="polite" className="sr-only">
  {posts.length} posts carregados para {format(currentDate, 'MMMM yyyy')}
</div>
```

---

## 15. Error Handling

### 15.1 Server Actions

```typescript
export async function createPostAction(data: PostFormData) {
  try {
    // ... logic
    return { success: true, libraryItemId: item.id }
  } catch (error) {
    console.error("Error creating post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }
  }
}
```

### 15.2 Client Components

```typescript
const { error } = useCalendarPosts(dateRange, filters)

useEffect(() => {
  if (error) {
    toast.error("Falha ao carregar posts", {
      description: error,
    })
  }
}, [error])
```

### 15.3 Toast Notifications

```typescript
import { toast } from "sonner"

// Sucesso
toast.success("Post criado!", {
  description: "Seu post foi agendado com sucesso.",
})

// Erro
toast.error("Erro ao criar post", {
  description: error.message,
})
```

---

## 16. Responsividade

### 16.1 Breakpoints

```css
/* Mobile-first approach */

.calendar-grid {
  /* Mobile: 1 coluna (stack) */
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  /* Tablet: 7 colunas */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
}

@media (min-width: 1024px) {
  /* Desktop: 7 colunas + sidebar */
  .calendar-grid {
    min-height: 600px;
  }
}
```

### 16.2 Mobile Layout

```
┌─────────────────────────────┐
│  ← Janeiro →                 │
│  [Mês] [Sem] [Dia]           │
├─────────────────────────────┤
│ Platform [Filter]            │
│ Status   [Filter]            │
├─────────────────────────────┤
│  Seg 01                     │
│  [Post 1 - Instagram]       │
│  [Post 2 - Twitter]         │
├─────────────────────────────┤
│  Ter 02                     │
│  [Post 3 - LinkedIn]        │
└─────────────────────────────┘
```

---

## 17. Testing Strategy

### 17.1 Unit Tests

```typescript
// calendar-utils.test.ts
describe('getMonthRange', () => {
  it('should return correct range for January 2026', () => {
    const date = new Date('2026-01-15')
    const range = getMonthRange(date)
    expect(range.start).toEqual(new Date('2026-01-01'))
    expect(range.end).toEqual(new Date('2026-01-31'))
  })

  it('should handle leap year', () => {
    const date = new Date('2024-02-15')
    const range = getMonthRange(date)
    expect(range.end).toEqual(new Date('2024-02-29'))
  })
})
```

### 17.2 Integration Tests

```typescript
// calendar-actions.test.ts
describe('createPostAction', () => {
  it('should create post with scheduled posts', async () => {
    const result = await createPostAction({
      title: 'Test Post',
      content: 'Test content',
      type: 'text',
      platforms: ['instagram', 'twitter'],
      scheduledFor: new Date('2026-01-15T14:00:00'),
    })
    expect(result.success).toBe(true)
    expect(result.libraryItemId).toBeDefined()
  })
})
```

### 17.3 E2E Scenarios

| Cenário | Passos |
|---------|--------|
| Criar post agendado | Abrir /calendar → Clicar [+ Novo] → Preencher form → Salvar → Verificar no dia |
| Reagendar via drag | Arrastar post do dia 15 para dia 20 → Verificar atualização |
| Filtrar por plataforma | Clicar em "Instagram" → Verificar apenas posts IG |
| Duplicar post | Hover post → Menu ⋯ → Duplicar → Verificar cópia |
| Editar post | Hover post → Menu ⋯ → Editar → Modificar → Salvar |

---

## 18. Atualizações de Documentação

### 18.1 Arquivos Atualizados

Após implementação:

1. ✅ **`.context/docs/architecture.md`**
   - Adicionar seção de Calendário Editorial
   - Atualizar diagramas com calendar components

2. ✅ **`.context/docs/development-plan/initial-phases.md`**
   - Adicionar Fase 6: Calendário Editorial
   - Atualizar checklist de implementação

3. ✅ **`.serena/memories/calendar-page.md`**
   - Criar nova memória com detalhes de implementação
   - Incluir patterns utilizados

4. ✅ **`.context/docs/insights/06-fase-6-calendar.md`**
   - Documentar insights da implementação
   - Decisões técnicas e aprendizados

### 18.2 Integração com Biblioteca de Conteúdos

**Janeiro 2026:** A Biblioteca de Conteúdos (`/library`) foi implementada e integra-se com o Calendário Editorial:

- **Criar post da biblioteca** → Agendar no calendário
- **Conteúdo da biblioteca** → Exibido nos cards do calendário
- **Tags e categorias** → Filtros compartilhados
- **Edição inline** → Atualiza refleja no calendário

Documentação completa em: `.context/docs/development-plan/library-dev-plan.md`

---

## 19. Próximos Passos (Pós-Implementação)

### 19.1 Features Futuras

| Feature | Prioridade | Complexidade |
|---------|-----------|-------------|
| Recorrência de posts | Média | Média |
| Template de posts | Baixa | Baixa |
| Exportar calendário (iCal) | Média | Média |
| Sugerir melhores horários | Alta | Alta |
| Calendário multi-usuário | Baixa | Alta |
| Integração com APIs sociais | Alta | Muito Alta |

### 19.2 Melhorias de Performance

- [ ] Implementar cache de queries (Redis)
- [ ] Virtualização para day view
- [ ] Infinite scroll para posts
- [ ] Optimistic updates

### 19.3 Melhorias de UX

- [ ] Undo/redo para ações
- [ ] Multi-select para ações em lote
- [ ] Preview de imagem no hover
- [ ] Arrastar múltiplos posts

---

## 20. Checklist Final

Antes de considerar "concluído":

### Foundation
- [ ] `src/types/calendar.ts` criado
- [ ] `src/lib/calendar-utils.ts` criado
- [ ] Server actions implementadas
- [ ] Queries testadas no banco

### UI Components
- [ ] Calendar grid renderiza
- [ ] Post cards exibem corretamente
- [ ] Filtros funcionam
- [ ] Navegação funciona

### Interatividade
- [ ] Drag & drop funciona
- [ ] Dialog criar/editar funciona
- [ ] Quick actions funcionam
- [ ] Toast notifications exibem

### Views
- [ ] Month view completa
- [ ] Week view completa
- [ ] Day view completa

### Qualidade
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessível (keyboard, screen reader)
- [ ] Performance aceitável
- [ ] Erros tratados

### Documentação
- [ ] Architecture.md atualizado
- [ ] Insights salvos
- [ ] Serena memórias criadas

---

**Status do Documento:** ✅ Planejamento Completo
**Próximo Passo:** Iniciar Fase 1 - Foundation
