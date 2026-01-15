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
