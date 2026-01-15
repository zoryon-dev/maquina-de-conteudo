# Plano de Desenvolvimento Inicial
# Máquina de Conteúdo - AI Content Studio

**Status**: Infraestrutura Concluída ✓ | Frontend Foundation Concluído ✅
**Branch**: `feat/start-dev`
**Data Atualização**: 2026-01-15 (Fase 4: 100% completa)

---

## Visão Geral

Este plano define a implementação da infraestrutura base da aplicação:
1. ✅ **Neon PostgreSQL + Drizzle ORM** - Camada de dados
2. ✅ **Clerk Authentication** - Autenticação e autorização
3. ✅ **Sistema de Filas (Upstash Redis)** - Processamento de jobs assíncronos
4. ✅ **Frontend Foundation** - Interface visual e navegação

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

## Fase 4: Frontend Foundation ✅ CONCLUÍDA (100%)

**Objetivo**: Criar a estrutura visual base da aplicação, focando em UI/UX antes da lógica de negócio.

### Status Final (Janeiro 2026)

| Item | Status | Arquivos |
|------|--------|----------|
| **Telas de Autenticação** | ✅ Concluído | `sign-in-card.tsx`, `sign-up-card.tsx`, `oauth-buttons.tsx`, `auth-layout.tsx` |
| **Landing Page** | ✅ Concluído | `app/page.tsx` com hero e CTAs |
| **AppLayout** | ✅ Concluído | `app-layout.tsx` com header centralizado (grid 3 colunas) |
| **Tubelight Navbar** | ✅ Concluído | `tubelight-navbar.tsx` com detect de rota ativa |
| **UserMenu** | ✅ Concluído | `user-menu.tsx` com Clerk UserButton |
| **Route Groups** | ✅ Concluído | `(auth)` e `(app)` com layouts separados |
| **AnimatedAIChat** | ✅ Concluído | `animated-ai-chat.tsx` com Lime Green e command palette |
| **ModelSelector** | ✅ Concluído | `model-selector.tsx` + `lib/models.ts` com OpenRouter |
| **Páginas Placeholder** | ✅ Concluído | `/library`, `/calendar`, `/sources`, `/settings` |
| **DevHelp** | ✅ Concluído | `dev-help.tsx` (só em dev) |
| **Settings Page** | ✅ Concluído | `/settings` com 5 seções completas |
| **4-Layer Prompt System** | ✅ Concluído | System → User → Variables → RAG |
| **Document Upload** | ✅ Concluído | Categorias, drag & drop, validação |
| **Fontes Page** | ✅ Concluído | Visualização RAG, estatísticas |

### 4.1 Componentes Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/app/page.tsx` | Landing page pública com hero section |
| `src/app/(auth)/layout.tsx` | Layout para páginas não autenticadas |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Página de sign-in |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Página de sign-up |
| `src/app/(app)/layout.tsx` | Layout com AppLayout para rotas protegidas |
| `src/app/(app)/dashboard/page.tsx` | Dashboard com AnimatedAIChat |
| `src/components/app-layout.tsx` | Header com logo, navbar centralizada, user menu |
| `src/components/auth/sign-in-card.tsx` | Card de login com Clerk |
| `src/components/auth/sign-up-card.tsx` | Card de cadastro com Clerk |
| `src/components/auth/oauth-buttons.tsx` | Botões Google + Discord |
| `src/components/auth/dev-help.tsx` | Ajuda em desenvolvimento |
| `src/components/auth/user-menu.tsx` | UserButton do Clerk |
| `src/components/auth/auth-layout.tsx` | Layout container para auth |
| `src/components/auth/forgot-password-card.tsx` | Recuperação de senha |
| `src/components/dashboard/animated-ai-chat.tsx` | Chat com command palette |
| `src/components/chat/model-selector.tsx` | Dropdown para modelos OpenRouter |
| `src/components/page-placeholder.tsx` | Placeholder para páginas futuras |
| `src/lib/models.ts` | Constantes de modelos OpenRouter |
| `src/proxy.ts` | Middleware Clerk (renomeado de middleware.ts) |
| `src/lib/system-prompts.ts` | Seed de prompts do sistema e constantes de camadas |
| `src/app/(app)/settings/page.tsx` | Página de configurações com 4 abas |
| `src/app/(app)/settings/components/sections/` | Componentes de cada seção de settings |
| `src/app/(app)/settings/actions/save-settings.ts` | Server Actions para settings |
| `src/app/(app)/settings/components/settings-tabs.tsx` | Tabs navigation (4 abas) |
| `src/app/(app)/settings/components/settings-page.tsx` | Client component principal |
| `src/app/(app)/sources/page.tsx` | Página de fontes com enhanced navbar |
| `src/app/(app)/sources/components/documents-tab.tsx` | Gerenciamento de documentos |
| `src/app/(app)/sources/components/semantic-search-tab.tsx` | Busca semântica |
| `src/app/(app)/sources/components/stats-tab.tsx` | Estatísticas de embeddings |
| `src/app/(app)/sources/components/upload-dialog.tsx` | Dialog de upload (categorizado) |
| `src/app/(app)/sources/components/document-card.tsx` | Card individual de documento |
| `src/app/(app)/sources/actions/sources-actions.ts` | Server Actions para /fontes |

### 4.2 Design System Implementado

```css
/* Primary - Lime Green */
--primary: hsl(84 76% 55%);      /* #a3e635 */

/* Backgrounds (Dark Mode Only) */
--bg-primary: #0a0a0f;
--bg-card: #1a1a2e;
--bg-overlay: #0a0a0f/90;

/* Text (Dark Mode) */
--text-white: #ffffff;
--text-white/90: rgba(255,255,255,0.9);
--text-white/70: rgba(255,255,255,0.7);
--text-white/40: rgba(255,255,255,0.4);
```

**IMPORTANTE**: Devido a problemas com Tailwind v4 `@theme inline`, classes explícitas foram criadas em `globals.css`:
```css
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }
```

### 4.3 OpenRouter Models Configurados

**Modelos de Texto:**
- `openai/gpt-5.2` (default)
- `openai/gpt-5.1`, `openai/gpt-5.2-chat`
- `google/gemini-3-flash-preview`, `google/gemini-3-pro-preview`
- `anthropic/claude-sonnet-4.5`, `claude-opus-4.5`, `claude-haiku-4.5`
- `x-ai/grok-4.1-fast`, `x-ai/grok-4-fast`

**Modelos de Imagem:**
- `openai/gpt-5-image` (default)
- `google/gemini-3-pro-image-preview`
- `black-forest-labs/flux.2-pro`, `flux.2-flex`, `flux.2-max`
- `sourceful/riverflow-v2-max-preview`
- `bytedance-seed/seedream-4.5`

### 4.4 Command Palette Implementada

| Comando | Descrição | Status |
|---------|-----------|--------|
| `/texto` | Criar texto para redes sociais | ✅ UI pronta |
| `/imagem` | Gerar imagem com IA | ✅ UI pronta |
| `/carrossel` | Criar carrossel para post | ✅ UI pronta |
| `/agendar` | Agendar publicação | ✅ UI pronta |
| `/fontes` | Adicionar fonte de conteúdo | ✅ UI pronta |
| `/especialistas` | Ver especialistas disponíveis | ✅ UI pronta |

### 4.5 Checklist Fase 4 - Status

- [x] Criar `auth-layout.tsx` com background animado
- [x] Criar `sign-in-card.tsx` com inputs estilizados
- [x] Criar `sign-up-card.tsx` com validações
- [x] Criar `forgot-password-card.tsx`
- [x] Criar `oauth-buttons.tsx` com ícones (Google, Discord)
- [x] Atualizar páginas de sign-in/sign-up para usar novos componentes
- [x] Adicionar transições e animações (Framer Motion)
- [x] Instalar/baixar componente AnimatedAIChat do 21st.dev
- [x] Adaptar cores para Lime Green
- [x] Criar estrutura de diretórios `dashboard/`
- [x] Implementar chat com auto-resize e command palette
- [x] Adicionar loading states
- [x] Configurar itens do menu tubelight-navbar
- [x] Criar `AppLayout` component com header centralizado
- [x] Criar grupo de rotas `(app)` com layout
- [x] Criar grupo de rotas `(auth)` com layout
- [x] Implementar páginas placeholder
- [x] Adicionar página inicial (landing) pública
- [x] Integrar ModelSelector com OpenRouter
- [x] Renomear middleware.ts para proxy.ts (Next.js 16)

---

## 4.6 Arquitetura de Componentes

### Server vs Client Components

```typescript
// ✅ Server Components (padrão)
// - Páginas (page.tsx)
// - Layouts (layout.tsx)
// - Dados estáticos

// ⚠️ Client Components (use client quando necessário)
// - AnimatedAIChat (interatividade)
// - AppLayout (event handlers)
// - Formulários
// - Componentes com useState/useEffect
```

### Estrutura de Rotas Final

```
src/app/
├── (auth)/                          # Route group - SEM navbar
│   ├── layout.tsx                   # AuthLayout
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                 # Usa SignInCard
│   └── sign-up/[[...sign-up]]/
│       └── page.tsx                 # Usa SignUpCard
│
├── (app)/                           # Route group - COM navbar
│   ├── layout.tsx                   # AppLayout + Navbar
│   ├── dashboard/page.tsx           # Chat AI
│   ├── library/page.tsx             # Placeholder
│   ├── calendar/page.tsx            # Placeholder
│   ├── sources/page.tsx             # Placeholder
│   └── settings/page.tsx            # Placeholder
│
├── layout.tsx                       # Root layout (ClerkProvider)
└── page.tsx                         # Landing page pública
```

---

## 4.7 Próximos Passos Fase 4 - Pendentes de Decisão

### 🔴 PENDENTE: Sistema de Agentes Especializados

**Definição do `idea.md`:** 4 agentes com handles, cores e system prompts:

| Agente | Handle | Cor | Ícone | Propósito |
|--------|--------|-----|-------|-----------|
| **Zory** | `@zory` | Cyan (190°) | Bot | Assistente generalista |
| **Estrategista** | `@estrategista` | Roxo (262°) | Target | Posicionamento, tom de voz |
| **Calendário** | `@calendario` | Azul (199°) | Calendar | Frequência de posts |
| **Criador** | `@criador` | Verde (142°) | Sparkles | Gera posts/carrosséis |

**Ações Necessárias:**
- [ ] Substituir command palette de `/comando` para `@agente`
- [ ] Implementar cores temáticas para cada agente
- [ ] Criar system prompts configuráveis via settings
- [ ] Adicionar ícones específicos para cada agente

**Decisão Pendente:** Manter ambos (`/comando` E `@agente`) ou substituir completamente?

---

### 🟡 PENDENTE: Integração OpenRouter API

**Status:** Componente ModelSelector criado, mas sem integração real com API.

**Ações Necessárias:**
- [ ] Criar API route `/api/chat/stream` para streaming
- [ ] Implementar chamada real à OpenRouter com API key do usuário
- [ ] Adicionar suporte a streaming de respostas
- [ ] Implementar rate limiting por usuário
- [ ] Tratar erros de API

**Decisão Pendente:** API key do usuário fica em settings ou é solicitada no primeiro uso?

---

### 🟢 PENDENTE: Desenvolvimento de Páginas Funcionais

| Página | Prioridade | Dependências | Ações |
|--------|-----------|--------------|-------|
| `/library` | Alta | Database | CRUD de library_items, upload, preview |
| `/settings` | Alta | Database | Configuração de API keys, system prompts |
| `/calendar` | Média | Database | Visualização de agendamentos |
| `/sources` | Média | Database | Gerenciamento RAG, upload de docs |

---

### 🔵 PENDENTE: Histórico de Conversas

**Status:** Schema do banco tem tabelas `chats` e `messages`, mas sem implementação.

**Ações Necessárias:**
- [ ] Criar API routes para CRUD de chats
- [ ] Implementar sidebar com histórico
- [ ] Adicionar funcionalidade de criar nova conversa
- [ ] Implementar renomear/arquivar conversas
- [ ] Adicionar busca no histórico

**Decisão Pendente:** Histórico por agente ou geral?

---

## 4.8 Resumo Fase 4

```
✅ CONCLUÍDO (100%):
├── Estrutura visual base completa
├── Autenticação com design refinado
├── AppLayout com navbar centralizada
├── AnimatedAIChat com command palette
├── ModelSelector para OpenRouter
├── Landing page pública
├── Páginas placeholder criadas
├── Design system com Lime Green
├── Settings page com 4 seções funcionais
│   ├── API Keys (com criptografia AES-256-GCM)
│   ├── System Prompts (4-layer architecture)
│   ├── User Variables (expansão via IA)
│   └── Models (seleção de modelos padrão)
├── Fontes page com gerenciamento completo RAG (Janeiro 2026)
│   ├── Enhanced navbar (3 colunas, animado)
│   ├── UploadDialog com categorização
│   ├── DocumentsTab com filtros e busca
│   ├── SemanticSearchTab (busca semântica)
│   ├── StatsTab (estatísticas de embeddings)
│   └── Ação "Documentos" removida de /settings
└── Sistema de prompts em 4 camadas
    ├── Layer 1: System Prompt (dev-defined)
    ├── Layer 2: User Prompt (customizável)
    ├── Layer 3: Variáveis Processadas (IA-enriched)
    └── Layer 4: RAG Context (document embeddings)

⏳ PENDENTE (Fases Futuras):
├── Sistema de @agentes especializados
├── Integração real com OpenRouter API
├── Histórico de conversas
├── Páginas funcionais (library, calendar)
└── Streaming de respostas
```

---

## 4.9 Estrutura Final de Arquivos (Status Atual)

```
src/
├── db/
│   ├── index.ts              # ✅ Conexão DB (Neon HTTP)
│   └── schema.ts             # ✅ 8 tabelas
│
├── proxy.ts                  # ✅ Clerk middleware (renomeado)
│
├── app/
│   ├── layout.tsx            # ✅ +ClerkProvider + dark mode
│   ├── globals.css           # ✅ Classes explícitas primary
│   ├── page.tsx              # ✅ Landing page
│   ├── (auth)/               # ✅ Grupo de rotas públicas
│   │   ├── layout.tsx        # ✅ AuthLayout
│   │   ├── sign-in/[[...sign-in]]/page.tsx  # ✅
│   │   └── sign-up/[[...sign-up]]/page.tsx  # ✅
│   ├── (app)/                # ✅ Grupo de rotas protegidas
│   │   ├── layout.tsx        # ✅ AppLayout + Navbar
│   │   ├── dashboard/page.tsx# ✅ AnimatedAIChat
│   │   ├── library/page.tsx  # ✅ Placeholder
│   │   ├── calendar/page.tsx # ✅ Placeholder
│   │   ├── sources/page.tsx  # ✅ Enhanced navbar + upload
│   │   │   └── components/
│   │   │       ├── documents-tab.tsx      # ✅ Gerenciamento
│   │   │       ├── semantic-search-tab.tsx # ✅ Busca semântica
│   │   │       ├── stats-tab.tsx          # ✅ Estatísticas
│   │   │       ├── upload-dialog.tsx      # ✅ Upload categorizado
│   │   │       └── document-card.tsx      # ✅ Card individual
│   │   │   └── actions/
│   │   │       └── sources-actions.ts     # ✅ Server Actions
│   │   └── settings/page.tsx # ✅ 4 abas (docs movido p/ fontes)
│   └── api/
│       └── webhooks/clerk/route.ts  # ✅ Criado
│
├── lib/
│   ├── models.ts             # ✅ OpenRouter models
│   ├── queue/
│   │   ├── types.ts          # ✅ Criado
│   │   ├── client.ts         # ✅ Upstash Redis client
│   │   └── jobs.ts           # ✅ CRUD de jobs
│   └── utils.ts              # ✅ cn() helper
│
├── components/
│   ├── ui/                   # ✅ shadcn/ui + tubelight-navbar
│   ├── auth/
│   │   ├── sign-in-card.tsx  # ✅
│   │   ├── sign-up-card.tsx  # ✅
│   │   ├── oauth-buttons.tsx # ✅
│   │   ├── dev-help.tsx      # ✅
│   │   ├── user-menu.tsx     # ✅
│   │   ├── auth-layout.tsx   # ✅
│   │   └── forgot-password-card.tsx # ✅
│   ├── chat/
│   │   └── model-selector.tsx# ✅
│   ├── dashboard/
│   │   └── animated-ai-chat.tsx # ✅
│   ├── app-layout.tsx        # ✅ Grid centralizado
│   └── page-placeholder.tsx  # ✅
│
└── hooks/
    └── use-job-status.ts     # ⏸️ Futuro

drizzle.config.ts             # ✅ Criado
package.json                  # ✅ Scripts db:* adicionados
.env.example                  # ✅ Atualizado
DEV_AUTH.md                    # ✅ Documentação auth
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
| **Fase 4** | **Frontend Foundation** | **✅ Concluída (100%)** |
| Fase 5 | Agentes Especializados | ⏳ Pendente de Decisão |
| Fase 6 | Integrações AI | ⏳ Futuro |

---

## Atualização Recente (Janeiro 2026)

### Refatoração da Página /fontes

**Alterações realizadas:**
- ✅ Enhanced navbar com grid layout (3 colunas)
- ✅ Active indicator animado (Framer Motion `layoutId`)
- ✅ UploadDialog integrado com categorização
- ✅ Botão Upload integrado ao DocumentsTab
- ✅ Filtros por categoria com scroll horizontal
- ✅ Estatísticas visuais (cards de contagem)
- ✅ Busca integrada com documentos
- ✅ Remoção da aba "Documentos" de /settings
- ✅ Criação de `sources-actions.ts` com operações específicas

**Arquivos criados:**
- `src/app/(app)/sources/components/upload-dialog.tsx`
- `src/app/(app)/sources/actions/sources-actions.ts`

**Arquivos modificados:**
- `src/app/(app)/sources/page.tsx` - Enhanced navbar
- `src/app/(app)/sources/components/documents-tab.tsx` - Upload integrado
- `src/app/(app)/settings/components/settings-tabs.tsx` - Docs removido
- `src/app/(app)/settings/components/settings-page.tsx` - Docs removido

---

## Próximos Passos (Após Fase 4)

### 🔴 URGENTE - Decisão Necessária: Sistema de @agentes

**Pergunta:** Devemos manter os comandos `/texto`, `/imagem` OU substituir por `@criador`, `@zory`, etc?

**Opções:**
1. **Híbrido:** Manter `/comando` para ações rápidas E adicionar `@agente` para especializar
2. **Substituição:** Usar apenas `@agente` (ex: `@criador criar post sobre X`)
3. **Separado:** Comandos `/` em uma paleta, agentes `@` em outra

**Referência:** `.context/docs/development-plan/idea.md` - Seção "Sistema de Agentes de IA"

---

### 🟡 ALTA PRIORIDADE - Integração OpenRouter

1. **API Route `/api/chat/stream`**
   - Endpoint para streaming de respostas OpenRouter
   - Autenticação via userId (Clerk)
   - Rate limiting por usuário

2. **Frontend Integration**
   - Conectar AnimatedAIChat com API real
   - Exibir typing indicator durante streaming
   - Tratar erros de API (timeout, quota, etc.)

3. **API Key Management**
   - Decisão: Onde configurar API key do usuário?
     - Opção A: Campo em `/settings`
     - Opção B: Solicitar no primeiro uso
     - Opção C: Ambos

---

### 🟢 MÉDIA PRIORIDADE - Páginas Funcionais

| Página | Funcionalidades Principais | Dependências |
|--------|---------------------------|--------------|
| `/settings` | API keys, system prompts, preferências | Database |
| `/library` | CRUD de conteúdo, preview, status | Database |
| `/calendar` | Visualização de agendamentos | Database |
| `/sources` | Upload docs, gerenciar RAG | Database |

---

### 🔵 BAIXA PRIORIDADE - Histórico de Conversas

- Sidebar com lista de conversas
- Criar/nova/renomear/arquivar conversas
- Busca no histórico
- Decisão: Histórico por agente ou geral?

---

## Referências

- `.context/agents/neon-database-specialist.md`
- `.context/agents/clerk-auth-specialist.md`
- `.serena/memories/` - Documentação de padrões
- `.context/docs/architecture.md` - Arquitetura completa
- `.context/docs/development-plan/idea.md` - Visão completa do projeto (agentes!)
- `.context/docs/known-and-corrected-errors/` - Erros conhecidos
- `.context/docs/insights/03-fase-4-frontend-foundation.md` - Insights Fase 4

---

*Última atualização: 2026-01-15*
