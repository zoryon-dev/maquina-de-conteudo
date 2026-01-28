# Máquina de Conteúdo - Content Studio

Estúdio de conteúdo alimentado por IA para criar, editar e gerenciar posts para redes sociais.

## Tech Stack

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| Framework | Next.js | 16.1.1 (App Router + Turbopack) |
| Linguagem | TypeScript | 5.x |
| Estilização | Tailwind CSS | 4.x |
| UI Components | Radix UI / shadcn | - |
| Autenticação | Clerk | 6.x |
| Banco de Dados | Neon (PostgreSQL) | - |
| ORM | Drizzle | 0.45.x |
| Storage | Cloudflare R2 / Local | - |
| State Management | Zustand | 5.x |
| LLM | Vercel AI SDK + OpenRouter | - |
| Embeddings | Voyage AI | voyage-4-large |
| Search | Tavily | - |
| Scraping | Firecrawl | - |
| **Cron Jobs** | **Upstash QStash** | **-** ⭐ |
| Animação | Framer Motion | - |
| Ícones | Lucide React | - |

## Estrutura do Projeto

```
maquina-de-conteudo/
├── .context/
│   ├── agents/              # Agentes especialistas
│   └── docs/                # Documentação geral
├── .serena/memories/        # Memórias de padrões (Serena)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Route group autenticação
│   │   ├── (app)/           # Route group app autenticada
│   │   ├── api/             # API routes
│   │   ├── layout.tsx       # Root layout (ClerkProvider)
│   │   └── globals.css      # Estilos globais
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Feature components
│   ├── db/                  # Schema e conexões DB
│   ├── lib/                 # Utilitários
│   └── stores/              # Zustand stores
└── drizzle/                 # Migrations
```

> **Estrutura detalhada:** Consulte a memória `project-structure` via Serena

## Design System

### Cores (Dark Mode)
```css
/* Primary - Lime Green */
--primary: #a3e635          /* hsl(84 76% 55%) */
--primary/10: rgba(163, 230, 53, 0.1)
--primary/20: rgba(163, 230, 53, 0.2)

/* Backgrounds */
--bg-primary: #0a0a0f
--bg-card: #1a1a2e
--bg-overlay: #0a0a0f/90

/* Text */
--text-white: #ffffff
--text-white/90: rgba(255,255,255,0.9)
--text-white/70: rgba(255,255,255,0.7)
--text-white/40: rgba(255,255,255,0.4)

/* Borders */
--border: rgba(255,255,255,0.05)
--border-hover: rgba(255,255,255,0.1)
```

### Classes CSS Explícitas

Devido a problemas com Tailwind v4 `@theme inline`, use classes explícitas para primary:
```css
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }
```

**IMPORTANTE:** Em dark mode, usar sempre cores explícitas (`text-white/70`) ao invés de tokens (`text-foreground/80`).

### Padrões Visuais
- **Glassmorphism**: `backdrop-blur-xl bg-white/[0.02] border-white/[0.05]`
- **Bordas sutis**: `border-white/10`
- **Glow effect**: `shadow-lg shadow-primary/20`
- **Animações**: Framer Motion com `layoutId` para transições

### Route Groups
- `(auth)` - Páginas de autenticação (sem navbar)
- `(app)` - Páginas autenticadas (com navbar)

## Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI & APIs
OPENROUTER_API_KEY=sk-or-...
PERPLEXITY_API_KEY=your-perplexity-key
VOYAGE_API_KEY=voyage-...
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
APIFY_API_KEY=apify-...

# Storage (opcional)
STORAGE_PROVIDER=local|r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=maquina-de-conteudo
R2_CUSTOM_DOMAIN=storage-mc.zoryon.org

# Meta (Instagram & Facebook)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:3000/api/social/callback  # Produção: https://yourdomain.com/api/social/callback

# Upstash QStash (Cron Jobs)
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=eyJ1c2VySWQiOi...  # Opcional - usa UPSTASH_REDIS_REST_TOKEN se não definido
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...
CRON_SECRET=dev-cron-secret-change-in-production
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build
npm run lint

# Database
npx drizzle-kit generate  # Gerar migration
npx drizzle-kit migrate   # Executar migration
npx drizzle-kit studio    # Interface visual

# Cron Jobs (QStash)
npm run cron:setup        # Configura schedules no QStash
npm run cron:remove       # Remove todos os schedules
npm run cron:health       # Verifica saúde do sistema
npm run cron:trigger      # Trigger manual de job
```

## Como Usar os Agentes

Quando precisar de ajuda especializada, consulte os agentes em `.context/agents/`:

- `nextjs-specialist.md` - Next.js e App Router
- `neon-database-specialist.md` - Neon e Drizzle ORM
- `clerk-auth-specialist.md` - Autenticação Clerk
- `api-integration-specialist.md` - Integrações de API

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

### Error Handling

**Arquivo:** `src/lib/errors.ts`

O projeto usa uma hierarquia de erros específicos em vez de catch-all genéricos:

```typescript
// Importar helpers
import { toAppError, getErrorMessage, hasErrorCode, isAppError } from "@/lib/errors"

// Em API routes
try {
  await operation()
} catch (error) {
  const appError = toAppError(error, "OPERATION_FAILED")
  console.error("[Context] Error:", appError)

  // Verificar erros específicos
  if (hasErrorCode(error) && error.code === "TOKEN_EXPIRED") {
    return NextResponse.json({ error: "Sessão expirada" }, { status: 400 })
  }

  return NextResponse.json(
    { error: getErrorMessage(appError) },
    { status: appError.statusCode }
  )
}
```

**Tipos de Erro:**
- `ValidationError` - Dados inválidos (400)
- `AuthError` - Falha de autenticação (401)
- `ForbiddenError` - Sem permissão (403)
- `NotFoundError` - Recurso não encontrado (404)
- `NetworkError` - Erro de rede/externo (503)
- `RateLimitError` - Limite excedido (429)
- `ConfigError` - Configuração incorreta (500)
- `JobError` - Falha em job (com jobId context)

**Padrão de Batch Operations:**
```typescript
const errors: Array<{ id: number; error: string }> = []
let successCount = 0

for (const item of items) {
  try {
    await processItem(item)
    successCount++
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Context] Error processing ${item.id}:`, errorMsg)
    errors.push({ id: item.id, error: errorMsg })
  }
}

if (errors.length > 0) {
  console.warn(`[Context] ${errors.length}/${items.length} failed`)
}

return { success: true, successCount, errors: errors.length > 0 ? errors : undefined }
```

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

## Integrações (Documentação Detalhada)

### Autenticação (Clerk)
- **Agente:** `.context/agents/clerk-auth-specialist.md`
- **Memória Serena:** `auth-patterns`
- **Padrão:** Usar `clerkMiddleware()` em `proxy.ts`, `<ClerkProvider>` em `layout.tsx`

### Database (Neon + Drizzle)
- **Agente:** `.context/agents/neon-database-specialist.md`
- **Memória Serena:** `database-patterns`
- **Schema:** `src/db/schema.ts` com 10+ tabelas

### Storage (Cloudflare R2)
- **Memória Serena:** `storage-patterns`
- **Abstração:** Factory pattern em `src/lib/storage/providers/`
- **Switch:** `STORAGE_PROVIDER=local|r2`

### AI (Vercel AI SDK + OpenRouter)
- **Memória Serena:** `vercel-ai-sdk-patterns`
- **Config:** `src/lib/ai/config.ts`
- **Hook:** `useChat` de `@ai-sdk/react`
- **Formato mensagens:** `{ parts: [{ type: "text", text: "..." }] }`

### RAG & Embeddings (Voyage AI)
- **Memória Serena:** `rag-embedding-patterns`
- **Modelo:** `voyage-4-large` (1024 dims)
- **Threshold:** `0.4` (melhorado para tribal content)
- **Chunking:** Category-specific via `getChunkingOptionsForCategory()`

### Social Media (Instagram/Facebook)
- **Memória Serena:** `social-integration-patterns`
- **Arquivos:** `src/lib/social/`, `src/app/api/social/`
- **Features:** Meta OAuth, Page Access Token, Content Publishing API
- **Pattern:** Database session storage (15min TTL) - cookies don't work with Next.js redirect
- **API:** `graph.facebook.com` (NOT `graph.instagram.com`) for Content Publishing
- **Tokens:** Page Access Token (EAF) for publishing, User Access Token (EAAE) for fetching pages
- **Async Publishing (Jan 2026):** Immediate publishing uses job queue to prevent UI blocking (30-60s IG processing)
- **Status Flow:** PUBLISHING → (worker) → PUBLISHED/FAILED
- **Cron Jobs:** Upstash QStash agencia `/api/workers` (1min) e `/api/cron/social-publish` (5min)

### Cron Jobs (Upstash QStash)
- **Memória Serena:** `qstash-patterns`
- **Arquivos:** `src/lib/cron/qstash.ts`, `src/app/api/cron/qstash/route.ts`
- **Features:** Schedules gerenciados via SDK, retry automático, health check
- **Custo:** Grátis (500k requisições/mês) vs $20/mês do Vercel Cron Pro
- **Setup:** `npm run cron:setup` (configura todos os schedules automaticamente)

---

## Features Principais

### Discovery (`/discover`)
Descoberta de temas trending em múltiplas plataformas (YouTube, Instagram, Perplexity).

- **Memória Serena:** `discovery-patterns`
- **Arquivos:** `src/app/(app)/discover/`, `src/lib/discovery-services/`
- **Features:** Tabs por plataforma, 5-10 resultados por fonte, AI theme processing
- **Plataformas:** YouTube Data API, Instagram (Apify), Perplexity AI (sonar model)

### Biblioteca de Conteúdo (`/library`)
Gerenciamento completo de conteúdos criados (textos, imagens, carrosséis).

- **Memória Serena:** `library-patterns`
- **Arquivos:** `src/app/(app)/library/`
- **Actions:** `getLibraryItemsAction`, `createLibraryItemAction`, etc.
- **Features:** Grid/List toggle, filtros, edição inline, ações em lote

### Calendário Editorial (`/calendar`)
Visualização e gerenciamento de posts agendados.

- **Memória Serena:** `calendar-patterns`
- **Arquivos:** `src/app/(app)/calendar/`
- **Actions:** `getCalendarPostsAction`, `reschedulePostAction`, etc.
- **Views:** Mês/Semana/Dia com drag & drop

### Fontes e Documentos (`/sources`)
Gerenciamento de documentos para RAG (PDF, TXT, MD).

- **Memória Serena:** `sources-page-refactor`
- **Arquivos:** `src/app/(app)/sources/`
- **Features:** Upload, coleções, categorias, busca semântica
- **API:** `/api/documents/upload` com PDF parse

---

## Command Palette (Chat)

O componente `AnimatedAIChat` possui comandos ativados por `/`:

| Comando | Descrição |
|---------|-----------|
| `/texto` | Criar texto para redes sociais |
| `/imagem` | Gerar imagem com IA |
| `/carrossel` | Criar carrossel para post |
| `/agendar` | Agendar publicação |
| `/fontes` | Adicionar fonte de conteúdo |
| `/especialistas` | Ver especialistas disponíveis |

---

## Memórias Serena (Índice Completo)

Consulte via Serena para padrões detalhados:

| Memória | Conteúdo |
|---------|----------|
| `index` | Índice de toda documentação |
| `project-structure` | Estrutura completa de diretórios |
| `design-system-tokens` | Tokens de design |
| `frontend-structure` | Estrutura de componentes |
| `component-patterns` | Padrões React e Radix UI |
| `tailwind-patterns` | Convenções Tailwind CSS |
| `typescript-patterns` | Padrões TypeScript |
| `react-hooks-patterns` | Hooks customizados |
| `zustand-patterns` | State management |
| `nextjs-patterns` | Padrões Next.js |
| `shadcn-patterns` | Padrões shadcn/ui |
| `auth-patterns` | Autenticação Clerk |
| `database-patterns` | Drizzle ORM |
| `vercel-ai-sdk-patterns` | Vercel AI SDK |
| `rag-embedding-patterns` | RAG + Voyage AI |
| `ai-processing-patterns` | IA no sistema (Prompts v4 Tribal, Theme, Narratives, Content) |
| `storage-patterns` | R2 + Local storage |
| `queue-patterns` | Sistema de filas |
| `library-patterns` | Biblioteca de conteúdo |
| `calendar-patterns` | Calendário editorial |
| `sources-page-refactor` | Página de fontes |
| `prompt-system` | Sistema de prompts |
| `wizard-patterns` | Wizard de criação (Prompts v4 Tribal, 4 ângulos tribais) |
| `social-integration-patterns` | Integração Meta (Instagram/Facebook) - OAuth, Publishing API |
| `qstash-patterns` | Cron Jobs com Upstash QStash |
