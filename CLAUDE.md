# Máquina de Conteúdo - Content Studio

## Visão Geral
Este é um estúdio de conteúdo alimentado por IA que permite criar, editar e gerenciar posts para redes sociais usando agentes especialistas.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Autenticação**: Clerk
- **Banco de Dados**: Neon (PostgreSQL) + Drizzle ORM
- **State Management**: Zustand
- **LLM**: OpenRouter
- **Search**: Tavily
- **Scraping**: Firecrawl
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
│       └── development-workflow.md
├── .claude/
│   └── skills/              # Skills reutilizáveis do Claude Code
│       ├── tailwind-patterns.md
│       └── component-patterns.md
├── src/
│   ├── app/                 # Rotas Next.js (App Router)
│   ├── components/          # Componentes React
│   ├── db/                  # Schema e conexões do DB
│   ├── lib/                 # Utilitários e configs
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
--bg-primary: #0a0a0f      /* Fundo principal */
--bg-card: #1a1a2e         /* Cards */
--accent: #1f3dbc          /* Primary action */
--border: rgba(255,255,255,0.1)
```

### Padrões Visuais
- Glassmorphism em cards
- Bordas sutis `border-white/10`
- Glow effect `shadow-[0_1px_8px_rgba(31,61,188,0.25)]`

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

### NUNCA FAZER

1. ❌ Não referenciar `_app.tsx` ou Pages Router
2. ❌ Não sugerir `authMiddleware()` (foi substituído por `clerkMiddleware()`)
3. ❌ Não usar padrões de环境 variables desatualizados
4. ❌ Não usar APIs deprecadas como `withAuth` ou `currentUser`

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
