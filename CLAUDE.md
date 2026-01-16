# Máquina de Conteúdo - Content Studio

## Visão Geral
Este é um estúdio de conteúdo alimentado por IA que permite criar, editar e gerenciar posts para redes sociais usando agentes especialistas.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router + Turbopack)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Autenticação**: Clerk
- **Banco de Dados**: Neon (PostgreSQL) + Drizzle ORM
- **State Management**: Zustand
- **LLM**: OpenRouter
- **Search**: Tavily
- **Scraping**: Firecrawl
- **Animação**: Framer Motion
- **Ícones**: Lucide React

## Estrutura do Projeto

```
maquina-de-conteudo/
├── .context/
│   ├── agents/              # Agentes especialistas para consultas
│   │   ├── nextjs-specialist.md
│   │   ├── api-integration-specialist.md
│   │   ├── neon-database-specialist.md
│   │   └── clerk-auth-specialist.md
│   └── docs/                # Documentação geral
│       ├── architecture.md
│       ├── development-workflow.md
│       ├── known-and-corrected-errors/  # Erros conhecidos e soluções
│       └── insights/        # Insights por fase
├── .claude/
│   └── skills/              # Skills reutilizáveis do Claude Code
│       ├── tailwind-patterns.md
│       └── component-patterns.md
├── .serena/
│   └── memories/            # Memórias do projeto (serena)
├── src/
│   ├── app/                 # Rotas Next.js (App Router)
│   │   ├── (auth)/          # Route group auth (sign-in, sign-up)
│   │   ├── (app)/           # Route group app (dashboard, etc)
│   │   ├── api/             # API routes
│   │   ├── layout.tsx       # Root layout (ClerkProvider)
│   │   ├── page.tsx         # Landing page
│   │   └── globals.css      # Estilos globais
│   ├── components/          # Componentes React
│   │   ├── auth/            # Auth components
│   │   ├── chat/            # Chat components
│   │   ├── dashboard/       # Dashboard components
│   │   └── ui/              # shadcn/ui components
│   ├── db/                  # Schema e conexões do DB
│   ├── lib/                 # Utilitários e configs
│   │   └── models.ts        # OpenRouter model constants
│   └── stores/              # Zustand stores
├── drizzle/                 # Migrations
├── CLAUDE.md                # Este arquivo
└── package.json
```

## Principais Funcionalidades

### 1. Chat com IA
- Interface conversacional para criar conteúdo
- Multi-modelo via OpenRouter
- Histórico de conversas persistido

### 2. Biblioteca de Conteúdo
- Textos
- Imagens
- Carrosséis
- Status: draft, scheduled, published

### 3. Base de Conhecimento
- Upload de documentos
- Indexação para RAG (futuro)
- Consulta contextual

### 4. Autenticação
- Login/Signup com Clerk
- Middleware de proteção de rotas

## Design System

### Cores
```css
/* Primary - Lime Green */
--primary: #a3e635          /* hsl(84 76% 55%) - Lime Green */
--primary/10: rgba(163, 230, 53, 0.1)
--primary/20: rgba(163, 230, 53, 0.2)

/* Backgrounds (Dark Mode Only) */
--bg-primary: #0a0a0f      /* Fundo principal */
--bg-card: #1a1a2e         /* Cards */
--bg-overlay: #0a0a0f/90   /* Overlay com blur */

/* Text (Dark Mode) */
--text-white: #ffffff
--text-white/90: rgba(255,255,255,0.9)
--text-white/70: rgba(255,255,255,0.7)
--text-white/40: rgba(255,255,255,0.4)
--text-white/20: rgba(255,255,255,0.2)

/* Borders */
--border: rgba(255,255,255,0.05)
--border-hover: rgba(255,255,255,0.1)
```

**IMPORTANTE:** Em dark mode, usar sempre cores explícitas (`text-white/70`) ao invés de tokens (`text-foreground/80`) porque Tailwind v4 não resolve tokens corretamente.

### Classes CSS Explícitas (globals.css)
Devido a problemas com Tailwind v4 `@theme inline`, use classes explícitas para primary:
```css
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }
```

### Padrões Visuais
- **Glassmorphism**: `backdrop-blur-xl bg-white/[0.02] border-white/[0.05]`
- **Bordas sutis**: `border-white/10`
- **Glow effect**: `shadow-lg shadow-primary/20`
- **Animações**: Framer Motion com `layoutId` para transições

### Route Groups (Next.js)
- `(auth)` - Páginas de autenticação com AuthLayout (sem navbar)
- `(app)` - Páginas autenticadas com AppLayout (com navbar)
- Os parênteses criam grupos lógicos sem afetar a URL

## Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# APIs
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
APIFY_API_KEY=apify-...
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Database
npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit studio
```

## Como Usar os Agentes

Quando precisar de ajuda especializada, mencione o agente:

- "Use o agente `.context/agents/nextjs-specialist.md` para criar essa rota"
- "Consulte `.context/agents/neon-database-specialist.md` para criar essa migration"
- "Use `.context/agents/api-integration-specialist.md` para integrar com Tavily"

## Regras de Código

### Convenções de Nome
- Componentes: `PascalCase.tsx`
- Utilitários: `kebab-case.ts`
- Hooks: `usePascalCase.ts`
- Types: `PascalCase.ts`

### Server vs Client Components
- **Padrão**: Server Components
- **"use client"**: Apenas quando necessário (interatividade, browser APIs)
- **Isolar**: Criar componentes clientes pequenos e específicos

### Commits
```
feat: nova funcionalidade
fix: correção de bug
refactor: refatoração
docs: documentação
style: formatação
chore: dependências
```

---

## Clerk Integration Rules

**Propósito:** Garantir o uso correto e atualizado das instruções para integrar [Clerk](https://clerk.com/) em aplicações Next.js (App Router).

### Visão Geral

Use apenas a abordagem **App Router** da documentação atual do Clerk:

- **Instalar** `@clerk/nextjs@latest`
- **Criar** arquivo `proxy.ts` usando `clerkMiddleware()` de `@clerk/nextjs/server`
- **Envolver** aplicação com `<ClerkProvider>` em `app/layout.tsx`
- **Usar** componentes como `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, `<SignedOut>`
- **Importar** métodos como `auth()` de `@clerk/nextjs/server` com `async/await`

### SEMPRE FAZER

1. ✅ Usar `clerkMiddleware()` de `@clerk/nextjs/server` em `proxy.ts`
2. ✅ Envolver app com `<ClerkProvider>` em `app/layout.tsx`
3. ✅ Importar features de `@clerk/nextjs` ou `@clerk/nextjs/server`
4. ✅ Usar App Router (não Pages Router)
5. ✅ Verificar package manager existente antes de instalar
6. ✅ Usar `forceRedirectUrl` (não `redirectUrl` que foi depreciado)
7. ✅ Converter `null` para `undefined`: `auth().userId ?? undefined`

### NUNCA FAZER

1. ❌ Não referenciar `_app.tsx` ou Pages Router
2. ❌ Não sugerir `authMiddleware()` (foi substituído por `clerkMiddleware()`)
3. ❌ Não usar padrões de环境 variables desatualizados
4. ❌ Não usar APIs deprecadas como `withAuth` ou `currentUser` ou `redirectUrl`

### Exemplo Correto - proxy.ts

```typescript
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Exemplo Correto - app/layout.tsx

```typescript
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>
          <SignedOut><SignInButton /></SignedOut>
          <SignedIn><UserButton /></SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## Neon Database Integration

### Visão Geral

Este projeto usa **Neon PostgreSQL** com **Drizzle ORM**. O plugin Neon AI fornece skills guiadas para:

1. **neon-drizzle**: Setup e migrações do Drizzle ORM
2. **neon-serverless**: Conexões serverless e pooling
3. **neon-auth**: Integração com `@neondatabase/auth`
4. **neon-js**: SDK JS completo da Neon
5. **neon-toolkit**: Bancos efêmeros para testes

### Comandos Úteis Drizzle

```bash
# Gerar migration
npx drizzle-kit generate

# Executar migration
npx drizzle-kit migrate

# Studio visual
npx drizzle-kit studio

# Push schema (sem migration)
npx drizzle-kit push
```

### Scripts npm Padrão

Adicione ao `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Padrões de Schema

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### Conexão Serverless

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

---

## OpenRouter Integration

### Visão Geral

Este projeto usa **OpenRouter** para acessar múltiplos modelos de IA de diferentes providers através de uma única API.

### Modelos Disponíveis

Todos os modelos estão documentados em `src/lib/models.ts` com IDs **exatos** da OpenRouter:

**Modelos de Texto:**
- `openai/gpt-5.2` - GPT 5.2 (default)
- `openai/gpt-5.1` - GPT 5.1
- `openai/gpt-5.2-chat` - GPT 5.2 Chat
- `google/gemini-3-flash-preview` - Gemini 3 Flash Preview
- `google/gemini-3-pro-preview` - Gemini 3 Pro Preview
- `anthropic/claude-sonnet-4.5` - Claude Sonnet 4.5
- `anthropic/claude-opus-4.5` - Claude Opus 4.5
- `anthropic/claude-haiku-4.5` - Claude Haiku 4.5
- `x-ai/grok-4.1-fast` - Grok 4.1 Fast
- `x-ai/grok-4-fast` - Grok 4 Fast

**Modelos de Imagem:**
- `openai/gpt-5-image` - GPT 5 Image (default)
- `google/gemini-3-pro-image-preview` - Gemini 3 Pro Image Preview
- `black-forest-labs/flux.2-pro` - Flux 2 Pro
- `black-forest-labs/flux.2-flex` - Flux 2 Flex
- `sourceful/riverflow-v2-max-preview` - Riverflow V2 Max Preview
- `black-forest-labs/flux.2-max` - Flux 2 Max
- `bytedance-seed/seedream-4.5` - Seedream 4.5

### Componentes

**ModelSelector** (`src/components/chat/model-selector.tsx`):
- Dropdown com shadcn `DropdownMenu`
- Organiza modelos por tipo (texto/imagem)
- Indica modelo selecionado com `✓`

**useModelSelector** Hook:
```typescript
const { selectedModel, setSelectedModel, modelInfo, isTextModel, isImageModel }
  = useModelSelector(defaultModel)
```

### Constantes

```typescript
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
  getModelById,
  formatModelId
} from "@/lib/models"
```

**IMPORTANTE:** IDs dos modelos devem ser usados **EXATAMENTE** como documentados. Small differences cause API failures.

### Command Palette (Chat)

O componente `AnimatedAIChat` possui command palette activada por `/`:

| Comando | Descrição |
|---------|-----------|
| `/texto` | Criar texto para redes sociais |
| `/imagem` | Gerar imagem com IA |
| `/carrossel` | Criar carrossel para post |
| `/agendar` | Agendar publicação |
| `/fontes` | Adicionar fonte de conteúdo |
| `/especialistas` | Ver especialistas disponíveis |

---

## Biblioteca de Conteúdo (`/library`)

### Visão Geral

A Biblioteca de Conteúdo é uma página completa para gerenciar todos os conteúdos criados. Localizada em `/library`, permite:

- **Visualização em Grid/Lista** de todos os conteúdos criados
- **Filtros** por tipo, status, categoria e tags
- **Edição inline** de título (duplo clique)
- **Edição completa** em modal com todos os campos
- **Ações em lote** (excluir múltiplos, mudar status)
- **Organização** por categorias e tags

### Estrutura de Arquivos

```
src/app/(app)/library/
├── page.tsx                          # Server Component (root)
├── components/
│   ├── library-page.tsx              # Client Component principal
│   ├── library-header.tsx            # Header com search, view toggle
│   ├── library-filter-bar.tsx        # Barra de filtros expansível
│   ├── library-grid.tsx              # Grid view (cards)
│   ├── library-list.tsx              # List view (tabela)
│   ├── content-card.tsx              # Card individual (grid)
│   ├── content-row.tsx               # Row individual (lista)
│   ├── content-dialog.tsx            # Modal de edição completa
│   ├── category-picker.tsx           # Seletor de categoria
│   ├── tag-picker.tsx                # Multi-select de tags
│   └── empty-library-state.tsx       # Estado vazio
├── hooks/
│   ├── use-library-data.ts           # Hook de dados
│   ├── use-library-filters.ts        # Hook de filtros
│   └── use-library-view.ts           # Hook de view mode
└── actions/
    └── library-actions.ts            # Server Actions

src/types/
└── library.ts                         # Tipos TypeScript
```

### Tipos de Conteúdo

```typescript
type PostType = "text" | "image" | "carousel" | "video" | "story"
type ContentStatus = "draft" | "scheduled" | "published" | "archived"
```

### Funcionalidades Implementadas

| Funcionalidade | Status |
|----------------|--------|
| Grid/List toggle | ✅ |
| Filtros expansíveis | ✅ |
| Ordenação (created/updated/title) | ✅ |
| Seleção múltipla (checkboxes) | ✅ |
| Ações em lote (excluir, mudar status) | ✅ |
| Edição inline de título | ✅ |
| Edição completa em modal | ✅ |
| Categorias e Tags | ✅ |
| Upload de mídias (URLs) | ✅ |
| Toast notifications | ✅ |
| Loading/error states | ✅ |

### Server Actions

```typescript
// Buscar itens da biblioteca
getLibraryItemsAction(params): Promise<LibraryItem[]>

// Criar novo item
createLibraryItemAction(data): Promise<ActionResult>

// Atualizar item
updateLibraryItemAction(id, data): Promise<ActionResult>

// Edição inline rápida
inlineUpdateLibraryItemAction(id, field, value): Promise<ActionResult>

// Soft delete
deleteLibraryItemAction(id): Promise<ActionResult>

// Ações em lote
batchDeleteAction(ids): Promise<ActionResult>
batchUpdateStatusAction(ids, status): Promise<ActionResult>

// Categorias e Tags
getCategoriesAction(): Promise<Category[]>
getTagsAction(): Promise<Tag[]>
createCategoryAction(data): Promise<ActionResult>
createTagAction(name, color?): Promise<ActionResult>
```

### Padrões de UI

**Edição Inline:**
- Duplo clique no título para editar
- Enter para salvar, Esc para cancelar
- Toast de confirmação

**Ações em Lote:**
- Checkbox em cada card/linha
- Select all no header
- Toolbar com ações quando há seleção

**Filtros:**
- Barra expansível com chips
- Contador de filtros ativos
- Botão "Limpar filtros"

---

## Calendário Editorial (`/calendar`)

### Visão Geral

O calendário editorial é uma página completa para visualização e gerenciamento de posts agendados. Localizado em `/calendar`, permite:

- **Visualização mensal/semanal/diária** de posts agendados
- **Filtros** por plataforma (Instagram, Twitter, LinkedIn, TikTok)
- **Filtros** por status (draft, scheduled, published, archived)
- **Drag & drop** para reagendar posts
- **Ações rápidas** (editar, duplicar, excluir)

### Estrutura de Arquivos

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

### Tipos Principais

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

### Cores das Plataformas (UI)

```typescript
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-purple-500/10",
    badgeColor: "from-pink-500/30 to-purple-500/30 text-pink-300",
  },
  twitter: {
    label: "Twitter",
    color: "text-blue-400",
    bgGradient: "from-blue-500/10",
    badgeColor: "bg-blue-500/30 text-blue-300",
  },
  linkedin: {
    label: "LinkedIn",
    color: "text-sky-400",
    bgGradient: "from-sky-500/10",
    badgeColor: "bg-sky-500/30 text-sky-300",
  },
  tiktok: {
    label: "TikTok",
    color: "text-gray-400",
    bgGradient: "from-gray-500/10 to-white/5",
    badgeColor: "bg-gray-500/30 text-gray-300",
  },
}
```

### Server Actions

```typescript
// Buscar posts para o calendário
getCalendarPostsAction(dateRange, filters): Promise<CalendarPost[]>

// Criar novo post
createPostAction(data: PostFormData): Promise<ActionResult>

// Atualizar post existente
updatePostAction(id: number, data: Partial<PostFormData>): Promise<ActionResult>

// Soft delete
deletePostAction(id: number): Promise<ActionResult>

// Reagendar via drag & drop
reschedulePostAction(id: number, newDate: Date): Promise<ActionResult>

// Duplicar post
duplicatePostAction(id: number, newScheduledFor?: Date): Promise<ActionResult>
```

### Hooks Customizados

```typescript
// Navegação (sem URL sync para evitar loops)
const { currentDate, view, goToPrevious, goToNext, goToToday, updateView }
  = useCalendarNavigation()

// Filtros (state local, sem URL sync)
const { filters, updateFilters, togglePlatform, toggleStatus }
  = useCalendarFilters()

// Posts com cache inteligente (useRef para evitar loops)
const { posts, isLoading, error, refetch }
  = useCalendarPosts(dateRange, filters)
```

### Importante: Evitar Infinite Loops

**Problema:** `useCallback` com dependências de objeto (`dateRange`, `filters`) causa re-render infinito.

**Solução:** Usar `useRef` para trackear dependencies via `JSON.stringify`:

```typescript
// ✅ CORRETO - usa useRef para comparar
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])

// ❌ ERRADO - useCallback com object deps
const fetchPosts = useCallback(async () => {
  // ...
}, [dateRange, filters])  // Cria nova referência a cada render
```

### Visual Improvements (Janeiro 2026)

**Datas mais visíveis:**
- Números em `text-base font-bold` (antes `text-sm`)
- Círculo "hoje" aumentado (w-7 h-7)
- Bordas nas células (`border-white/5`)
- Background sutil (`bg-white/[0.02]`)

**Badges de plataforma:**
- Ícone da rede social (Instagram, Twitter, LinkedIn, Video)
- Background colorido por plataforma
- Label visível em telas maiores

---
