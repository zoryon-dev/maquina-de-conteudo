# Plano de Desenvolvimento Inicial
# Máquina de Conteúdo - AI Content Studio

**Status**: Ready for Implementation
**Branch**: `feat/start-dev`
**Data**: 2026-01-14

---

## Visão Geral

Este plano define a implementação da infraestrutura base da aplicação:
1. **Neon PostgreSQL + Drizzle ORM** - Camada de dados
2. **Clerk Authentication** - Autenticação e autorização
3. **Sistema de Filas (Upstash Qstash)** - Processamento de jobs assíncronos

---

## Fase 1: Neon Database + Drizzle ORM

### 1.1 Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `drizzle.config.ts` | Criar | Configuração do Drizzle Kit |
| `src/db/index.ts` | Criar | Conexão com banco de dados |
| `src/db/schema.ts` | Criar | Schema completo (7 tabelas) |
| `package.json` | Modificar | Adicionar scripts db:* |
| `.env.example` | Modificar | Adicionar DATABASE_URL |

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

- [ ] Criar `drizzle.config.ts`
- [ ] Criar `src/db/index.ts`
- [ ] Criar `src/db/schema.ts` com todas as tabelas
- [ ] Adicionar scripts ao `package.json`
- [ ] Configurar `DATABASE_URL` no `.env.local`
- [ ] Executar `npm run db:generate`
- [ ] Executar `npm run db:migrate`
- [ ] Testar com `npm run db:studio`

---

## Fase 2: Clerk Authentication

### 2.1 Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/middleware.ts` | Criar | Proteção de rotas |
| `src/app/layout.tsx` | Modificar | Adicionar ClerkProvider |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Criar | Página de login customizada |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Criar | Página de cadastro customizada |
| `src/app/api/webhooks/clerk/route.ts` | Criar | Webhook de sincronização |
| `src/components/auth/user-menu.tsx` | Criar | Menu de usuário |

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

- [ ] Criar conta no Clerk Dashboard
- [ ] Obter chaves de API
- [ ] Configurar OAuth (Google, GitHub)
- [ ] Criar `src/middleware.ts`
- [ ] Atualizar `src/app/layout.tsx` com ClerkProvider
- [ ] Criar páginas de sign-in/sign-up com design system
- [ ] Criar webhook handler
- [ ] Testar fluxo de autenticação

---

## Fase 3: Sistema de Filas (Background Jobs)

### 3.1 Decisão de Arquitetura

**Opção Recomendada**: Upstash Qstash

**Motivos**:
- Serverless nativo (sem worker process)
- Free tier generoso (500K requests/dia)
- Built-in retries e scheduling
- Zero infraestrutura adicional

### 3.2 Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/queue/types.ts` | Enums e interfaces de jobs |
| `src/lib/queue/enqueue.ts` | Função para enfileirar jobs |
| `src/lib/queue/store.ts` | Persistência no banco |
| `src/lib/queue/workers/base.ts` | Base worker class |
| `src/lib/queue/workers/ai-text.ts` | Worker para geração de texto |
| `src/hooks/use-job-status.ts` | Hook para polling de status |
| `src/app/api/jobs/route.ts` | POST /api/jobs |
| `src/app/api/jobs/[id]/route.ts` | GET /api/jobs/:id |

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

- [ ] Instalar upstash npm package
- [ ] Criar schema de jobs
- [ ] Implementar enqueue function
- [ ] Criar base worker class
- [ ] Implementar primeiro worker (ai-text)
- [ ] Criar API routes
- [ ] Criar hook useJobStatus
- [ ] Testar fluxo end-to-end

---

## Fase 4: Ordem de Execução

### Sequência Recomendada

```
1. Setup Database (Neon + Drizzle)
   ├─ Criar projeto Neon
   ├─ Configurar Drizzle
   ├─ Criar schema
   └─ Executar migração

2. Setup Authentication (Clerk)
   ├─ Configurar middleware
   ├─ Criar páginas de auth
   └─ Implementar webhook

3. Setup Queue System (Upstash)
   ├─ Criar schema de jobs
   ├─ Implementar enqueue
   └─ Criar primeiro worker

4. Integração
   ├─ Conectar auth com database
   ├─ Proteger API routes
   └─ Testar fluxos completos
```

### Dependências

- **Clerk** pode ser implementado em paralelo com Database
- **Queue** depende de Database (para persistência)
- **Workers** dependem de ambos (auth + database)

---

## Fase 5: Estrutura Final de Arquivos

```
src/
├── db/
│   ├── index.ts              # Conexão DB
│   └── schema.ts             # 7 tabelas
│
├── middleware.ts             # Clerk middleware
│
├── app/
│   ├── layout.tsx            # +ClerkProvider
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── api/
│   │   ├── webhooks/clerk/route.ts
│   │   └── jobs/
│   │       ├── route.ts
│   │       ├── [id]/route.ts
│   │       └── webhook/route.ts
│   └── actions/              # Server Actions
│
├── lib/
│   ├── queue/
│   │   ├── types.ts
│   │   ├── enqueue.ts
│   │   ├── store.ts
│   │   └── workers/
│   │       ├── base.ts
│   │       └── ai-text.ts
│   └── qstash/
│       └── client.ts
│
├── components/
│   └── auth/
│       └── user-menu.tsx
│
└── hooks/
    └── use-job-status.ts

drizzle.config.ts             # Nova config
package.json                  # + scripts db:*
.env.example                  # + variáveis de ambiente
```

---

## Fase 6: Variáveis de Ambiente (Final)

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Queue (Upstash Qstash)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=...
WEBHOOK_SECRET=...

# Job Processing
JOB_MAX_RETRIES=3
JOB_TIMEOUT=900000
```

---

## Próximos Passos (Após Infraestrutura)

1. **Páginas da Aplicação**
   - `/chat` - Interface conversacional
   - `/library` - Biblioteca de conteúdo
   - `/calendar` - Calendário de posts
   - `/sources` - Fontes de conteúdo
   - `/settings` - Configurações

2. **Especialistas AI** (conforme idea.md)
   - @zory - Coordenador
   - @estrategista - Estratégia de conteúdo
   - @calendario - Agendamento
   - @criador - Criação de conteúdo

---

## Referências

- `.context/agents/neon-database-specialist.md`
- `.context/agents/clerk-auth-specialist.md`
- `.context/agents/architect-specialist.md`
- `.serena/memories/` - Documentação de padrões
- `.context/docs/development-plan/idea.md` - Visão completa
