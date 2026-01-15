# Plano de Desenvolvimento Inicial
# Máquina de Conteúdo - AI Content Studio

**Status**: Infraestrutura Concluída ✓ | Fase 4 em Andamento
**Branch**: `feat/start-dev`
**Data Atualização**: 2026-01-15

---

## Visão Geral

Este plano define a implementação da infraestrutura base da aplicação:
1. ✅ **Neon PostgreSQL + Drizzle ORM** - Camada de dados
2. ✅ **Clerk Authentication** - Autenticação e autorização
3. ✅ **Sistema de Filas (Upstash Redis)** - Processamento de jobs assíncronos
4. 🔄 **Frontend Foundation** - Interface visual e navegação

---

## Fase 1: Neon Database + Drizzle ORM ✅ CONCLUÍDA

### 1.1 Arquivos a Criar/Modificar

| Arquivo | Ação | Status |
|---------|------|--------|
| `drizzle.config.ts` | Criar | ✅ Criado |
| `src/db/index.ts` | Criar | ✅ Criado |
| `src/db/schema.ts` | Criar | ✅ Criado (8 tabelas) |
| `package.json` | Modificar | ✅ Scripts db:* adicionados |
| `.env.example` | Modificar | ✅ DATABASE_URL configurado |

### 1.2 Schema do Banco de Dados

```typescript
// 7 tabelas principais:
users          -> Sincronizado com Clerk
chats          -> Threads de conversa
messages       -> Mensagens individuais
library_items  -> Biblioteca de conteúdo
documents      -> Base de conhecimento
sources        -> Fontes para scraping
scheduled_posts-> Fila de publicação
```

### 1.3 Scripts npm

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

### 1.4 Padrão de Conexão

```typescript
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

**Decisão**: HTTP adapter para compatibilidade com Edge Runtime.

### 1.5 Checklist de Implementação

- [x] Criar `drizzle.config.ts`
- [x] Criar `src/db/index.ts`
- [x] Criar `src/db/schema.ts` com todas as tabelas (8 tabelas criadas)
- [x] Adicionar scripts ao `package.json`
- [x] Configurar `DATABASE_URL` no `.env.local`
- [x] Executar migração via MCP Neon
- [x] Testar conexão com banco

---

## Fase 2: Clerk Authentication ✅ CONCLUÍDA

### 2.1 Arquivos a Criar/Modificar

| Arquivo | Ação | Status |
|---------|------|--------|
| `src/middleware.ts` | Criar | ✅ Criado |
| `src/app/layout.tsx` | Modificar | ✅ ClerkProvider adicionado |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Criar | ✅ Criado |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Criar | ✅ Criado |
| `src/app/api/webhooks/clerk/route.ts` | Criar | ✅ Criado |
| `src/components/auth/user-menu.tsx` | Criar | ⏸️ Pendente (Fase 4) |

### 2.2 Middleware (Proteção de Rotas)

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/chat(.*)', '/library(.*)', '/calendar(.*)',
  '/sources(.*)', '/settings(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
})
```

### 2.3 Rotas Protegidas vs Públicas

| Tipo | Rotas |
|------|-------|
| **Públicas** | `/`, `/sign-in`, `/sign-up`, `/api/webhooks` |
| **Protegidas** | `/chat`, `/library`, `/calendar`, `/sources`, `/settings` |

### 2.4 Webhook de Sincronização

Evento `user.created` → Insere usuário na tabela `users`
Evento `user.updated` → Atualiza dados do usuário
Evento `user.deleted` → Remove/soft delete usuário

### 2.5 Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.6 Checklist de Implementação

- [x] Criar conta no Clerk Dashboard
- [x] Obter chaves de API
- [x] Configurar OAuth (Google, GitHub)
- [x] Criar `src/middleware.ts`
- [x] Atualizar `src/app/layout.tsx` com ClerkProvider
- [x] Criar páginas de sign-in/sign-up (design básico)
- [x] Criar webhook handler
- [x] Testar fluxo de autenticação básico

**Nota**: Design de auth screens será refinado na Fase 4.

---

## Fase 3: Sistema de Filas (Background Jobs) ✅ CONCLUÍDA

### 3.1 Decisão de Arquitetura

**Opção Implementada**: Upstash Redis (Lists)

**Motivos**:
- Serverless nativo (sem worker process)
- Free tier generoso (500K requests/dia)
- Built-in retries e scheduling
- Zero infraestrutura adicional

### 3.2 Arquivos a Criar

| Arquivo | Status |
|---------|--------|
| `src/lib/queue/types.ts` | ✅ Criado |
| `src/lib/queue/client.ts` | ✅ Criado (Upstash Redis client) |
| `src/lib/queue/jobs.ts` | ✅ Criado (CRUD de jobs) |
| `src/app/api/jobs/route.ts` | ✅ Criado |
| `src/app/api/jobs/[id]/route.ts` | ✅ Criado |
| `src/app/api/workers/route.ts` | ✅ Criado |
| `src/hooks/use-job-status.ts` | ⏸️ Pendente (Fase 5+) |

### 3.3 Tipos de Job

```typescript
enum JobType {
  AI_TEXT_GENERATION = 'ai-text-generation',
  AI_IMAGE_GENERATION = 'ai-image-generation',
  CAROUSEL_CREATION = 'carousel-creation',
  SCHEDULED_PUBLISH = 'scheduled-publish',
  WEB_SCRAPING = 'web-scraping',
}

enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 3.4 Schema Adicional

```typescript
// Tabela jobs para persistência
jobs -> id, type, status, userId, payload, result, error, attempts, ...
job_attempts -> Histórico de tentativas de retry
```

### 3.5 Fluxo de Trabalho

```
Client → API /jobs → Enqueue (Qstash)
                 ↓
            Store (DB)
                 ↓
            Webhook /jobs/webhook
                 ↓
            Worker Process
                 ↓
            Update DB
                 ↓
            Client Poll (useJobStatus)
```

### 3.6 Checklist de Implementação

- [x] Instalar upstash npm package (@upstash/redis)
- [x] Criar schema de jobs (tabela `jobs`)
- [x] Implementar enqueue function
- [x] Criar base worker class (via API route)
- [x] Implementar handlers para 5 tipos de jobs (mock)
- [x] Criar API routes
- [x] Testar fluxo end-to-end

**Nota**: `use-job-status.ts` hook será implementado quando necessário na UI.

---

## Resumo da Ordem de Execução (Fases 1-3) ✅

### Sequência Executada

```
✅ 1. Setup Database (Neon + Drizzle)
   ├─ Criar projeto Neon
   ├─ Configurar Drizzle
   ├─ Criar schema (8 tabelas)
   └─ Executar migração

✅ 2. Setup Authentication (Clerk)
   ├─ Configurar middleware
   ├─ Criar páginas de auth
   └─ Implementar webhook

✅ 3. Setup Queue System (Upstash)
   ├─ Criar schema de jobs
   ├─ Implementar enqueue
   └─ Criar worker API route
```

### Dependências

- ✅ **Clerk** foi implementado em paralelo com Database
- ✅ **Queue** depende de Database (para persistência)
- ✅ **Workers** dependem de ambos (auth + database)

---

## Fase 4: Frontend Foundation 🔄 EM ANDAMENTO

**Objetivo**: Criar a estrutura visual base da aplicação, focando em UI/UX antes da lógica de negócio.

### Visão Geral

Esta fase estabelece a fundação visual da aplicação:
1. **Telas de Autenticação Refinadas** - Login, logout, recuperação de senha
2. **Dashboard Principal** - Home page com AnimatedAIChat
3. **Estrutura de Navegação** - Menu tubelight-navbar + layout base

---

## 4.1 Telas de Autenticação

### 4.1.1 Componentes a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/auth/sign-in-card.tsx` | Card de login estilizado |
| `src/components/auth/sign-up-card.tsx` | Card de cadastro estilizado |
| `src/components/auth/forgot-password-card.tsx` | Recuperação de senha |
| `src/components/auth/reset-password-card.tsx` | Reset de senha |
| `src/components/auth/oauth-buttons.tsx` | Botões OAuth (Google, GitHub) |
| `src/components/auth/auth-layout.tsx` | Layout container para auth |

### 4.1.2 Design Tokens

```css
/* Cores do Design System */
--primary: hsl(84 76% 55%);      /* Lime Green */
--primary-hover: hsl(84 76% 48%);
--bg-primary: #0a0a0f;           /* Fundo principal */
--bg-card: #1a1a2e;              /* Cards */
--border-color: rgba(255,255,255,0.1);
--text-primary: #ffffff;
--text-secondary: rgba(255,255,255,0.7);
```

### 4.1.3 Padrão Glassmorphism

```typescript
// Aplicar a todos os cards de autenticação
className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl"
```

### 4.1.4 Checklist

- [ ] Criar `auth-layout.tsx` com background animado
- [ ] Criar `sign-in-card.tsx` com inputs estilizados
- [ ] Criar `sign-up-card.tsx` com validações
- [ ] Criar `forgot-password-card.tsx`
- [ ] Criar `oauth-buttons.tsx` com ícones
- [ ] Atualizar páginas de sign-in/sign-up para usar novos componentes
- [ ] Adicionar transições e animações

---

## 4.2 Dashboard Principal (Chat AI)

### 4.2.1 AnimatedAIChat Component

**Fonte**: 21st.dev - `/ui animated-ai-chat`

**Adaptações Necessárias**:
- Substituir cores originais por Lime Green do sistema
- Ajustar para dark mode nativo
- Integrar com design system existente
- Adicionar glassmorphism effects

### 4.2.2 Estrutura do Dashboard

```
src/app/dashboard/
├── page.tsx              # Server Component principal
├── loading.tsx           # Skeleton loading
└── components/
    ├── chat-container.tsx    # "use client" - Container do chat
    ├── chat-message.tsx      # Componente de mensagem
    ├── chat-input.tsx        # Input com textarea
    └── chat-header.tsx       # Header com título e controles
```

### 4.2.3 Integração com Clerk

```typescript
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <ChatContainer userId={userId} />;
}
```

### 4.2.4 Checklist

- [ ] Instalar/baixar componente AnimatedAIChat do 21st.dev
- [ ] Adaptar cores para Lime Green (hsl(84 76% 55%))
- [ ] Criar estrutura de diretórios `dashboard/`
- [ ] Implementar `chat-container.tsx` com estado de mensagens
- [ ] Implementar `chat-message.tsx` com avatar e timestamp
- [ ] Implementar `chat-input.tsx` com auto-resize
- [ ] Adicionar loading states e skeleton screens
- [ ] Testar responsividade

---

## 4.3 Estrutura de Navegação

### 4.3.1 Tubelight Navbar

**Status**: Componente já instalado em `src/components/ui/tubelight-navbar.tsx`

**Configuração Necessária**:

```typescript
// Menu items
const menuItems = [
  { label: "Chat", href: "/dashboard", icon: MessageSquare },
  { label: "Biblioteca", href: "/library", icon: Library },
  { label: "Calendário", href: "/calendar", icon: Calendar },
  { label: "Fontes", href: "/sources", icon: Globe },
  { label: "Configurações", href: "/settings", icon: Settings },
];
```

### 4.3.2 Layout Base

```typescript
// src/components/app-layout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[--bg-primary]">
      <TubelightNavbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

### 4.3.3 Estrutura de Rotas

```
src/app/
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
│
├── (app)/                    # Grupo com layout próprio
│   ├── layout.tsx            # Layout com AppLayout + Clerk auth
│   ├── dashboard/            # Chat AI (rota padrão após login)
│   ├── library/              # Biblioteca de conteúdo
│   ├── calendar/             # Calendário de posts
│   ├── sources/              # Fontes de scraping
│   └── settings/             # Configurações do usuário
```

### 4.3.4 Checklist

- [ ] Configurar itens do menu tubelight-navbar
- [ ] Criar `AppLayout` component
- [ ] Criar grupo de rotas `(app)` com layout
- [ ] Implementar layouts para cada rota principal
- [ ] Adicionar proteção de autenticação no layout
- [ ] Testar navegação entre páginas
- [ ] Adicionar página inicial (landing) pública

---

## 4.4 User Menu Component

### 4.4.1 Componente a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/auth/user-menu.tsx` | Menu de usuário no navbar |

### 4.4.2 Funcionalidades

```typescript
// Integrado com tubelight-navbar
<UserButton
  appearance={{
    elements: {
      avatarBox: "w-10 h-10",
      card: "bg-[--bg-card] border-white/10",
    },
  }}
  afterSignOutUrl="/"
/>
```

### 4.4.3 Checklist

- [ ] Criar `user-menu.tsx`
- [ ] Integrar com tubelight-navbar
- [ ] Adicionar link para configurações
- [ ] Adicionar botão de logout

---

## 4.5 Ordem de Implementação Sugerida

```
1. Estrutura de Rotas e Layout
   ├─ Criar grupo (app) com layout protegido
   ├─ Implementar AppLayout component
   ├─ Configurar tubelight-navbar
   └─ Criar user-menu component

2. Telas de Autenticação
   ├─ Refinar sign-in/sign-up existentes
   ├─ Adicionar forgot-password
   ├─ Implementar oauth-buttons
   └─ Aplicar design system consistente

3. Dashboard com Chat AI
   ├─ Obter componente AnimatedAIChat
   ├─ Adaptar cores e estilos
   ├─ Criar estrutura do dashboard
   └─ Integrar com Clerk

4. Páginas Placeholder
   ├─ /library (placeholder)
   ├─ /calendar (placeholder)
   ├─ /sources (placeholder)
   └─ /settings (placeholder)
```

---

## 4.6 Arquitetura de Componentes

### Server vs Client Components

```typescript
// ✅ Server Components (padrão)
// - Páginas (page.tsx)
// - Layouts (layout.tsx)
// - Dados estáticos

// ⚠️ Client Components (use client quando necessário)
// - ChatContainer (interatividade)
// - Formulários
// - Componentes com useState/useEffect
```

### Padrão de Composição

```
Page (Server)
  └─ Layout (Server)
      └─ AppLayout (Server)
          ├─ Navbar (Client)
          │   └─ UserMenu (Client)
          └─ Main Content
              ├─ Server Components
              └─ Client Components (quando necessário)
```

---

## Fase 5: Estrutura Final de Arquivos (Após Fase 4)

```
src/
├── db/
│   ├── index.ts              # ✅ Conexão DB (Neon HTTP)
│   └── schema.ts             # ✅ 8 tabelas
│
├── middleware.ts             # ✅ Clerk middleware
│
├── app/
│   ├── layout.tsx            # ✅ +ClerkProvider
│   ├── sign-in/[[...sign-in]]/page.tsx    # ✅ Criado
│   ├── sign-up/[[...sign-up]]/page.tsx    # ✅ Criado
│   ├── (auth)/               # 🔄 Grupo de rotas públicas
│   ├── (app)/                # 🔄 Grupo de rotas protegidas
│   │   ├── layout.tsx        # 🔄 AppLayout + Navbar
│   │   ├── dashboard/        # 🔄 Chat AI
│   │   ├── library/          # 🔄 Placeholder
│   │   ├── calendar/         # 🔄 Placeholder
│   │   ├── sources/          # 🔄 Placeholder
│   │   └── settings/         # 🔄 Placeholder
│   ├── api/
│   │   ├── webhooks/clerk/route.ts  # ✅ Criado
│   │   └── jobs/
│   │       ├── route.ts      # ✅ Criado
│   │       ├── [id]/route.ts # ✅ Criado
│   │       └── workers/route.ts  # ✅ Criado
│   └── page.tsx              # 🔄 Landing page pública
│
├── lib/
│   ├── queue/
│   │   ├── types.ts          # ✅ Criado
│   │   ├── client.ts         # ✅ Upstash Redis client
│   │   └── jobs.ts           # ✅ CRUD de jobs
│   └── utils.ts              # ✅ cn() helper
│
├── components/
│   ├── ui/                   # ✅ shadcn/ui (30+ componentes)
│   │   └── tubelight-navbar.tsx  # ✅ Instalado
│   ├── auth/
│   │   └── user-menu.tsx     # 🔄 Pendente
│   └── app-layout.tsx        # 🔄 Pendente
│
└── hooks/
    └── use-job-status.ts     # ⏸️ Futuro

drizzle.config.ts             # ✅ Criado
package.json                  # ✅ Scripts db:* adicionados
.env.example                  # ✅ Atualizado
```

---

## Fase 6: Variáveis de Ambiente (Referência)

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host-pooler.region.neon.tech/db?sslmode=require

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Queue (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Worker Secret (para chamadas internas)
WORKER_SECRET=...

# NOTA: APIs do usuário (OpenRouter, Tavily, etc.)
# serão configuradas no painel de configurações da aplicação,
# não via environment variables.
```

---

## Status Summary

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Neon Database + Drizzle ORM | ✅ Concluída |
| Fase 2 | Clerk Authentication | ✅ Concluída |
| Fase 3 | Sistema de Filas (Upstash) | ✅ Concluída |
| **Fase 4** | **Frontend Foundation** | **🔄 Em Andamento** |
| Fase 5 | Lógica de Negócio | ⏳ Futuro |
| Fase 6 | Integrações AI | ⏳ Futuro |

---

## Próximos Passos (Após Fase 4)

1. **Funcionalidades de Chat AI**
   - Conectar com OpenRouter API
   - Implementar streaming de respostas
   - Histórico de conversas
   - Multi-modelo selection

2. **Biblioteca de Conteúdo**
   - CRUD de library_items
   - Upload de arquivos
   - Preview de conteúdo
   - Status management

3. **Calendário de Publicações**
   - Visualização mensal/semanal
   - Agendamento de posts
   - Integração com redes sociais

4. **Fontes de Conteúdo**
   - CRUD de sources
   - Web scraping interface
   - Configurações de extração

5. **Painel de Configurações**
   - Configuração de APIs do usuário
   - OpenRouter API key
   - Tavily API key
   - Firecrawl API key
   - Preferências do sistema

---

## Referências

- `.context/agents/neon-database-specialist.md`
- `.context/agents/clerk-auth-specialist.md`
- `.serena/memories/` - Documentação de padrões
- `.context/docs/architecture.md` - Arquitetura completa
- `.context/docs/development-plan/idea.md` - Visão geral do projeto
- `.context/docs/known-and-corrected-errors/` - Erros conhecidos

---

*Última atualização: 2026-01-15*
