# Arquitetura - Máquina de Conteúdo

## Visão Geral

Este projeto segue uma arquitetura baseada em **App Router do Next.js 15**, com separação clara entre Server Components (renderização e fetch de dados) e Client Components (interatividade).

## Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │    Layouts   │  │
│  │ (app/*.tsx)  │  │ (components) │  │ (layouts)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     Business Logic Layer                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Server Acts  │  │   Stores     │  │     Hooks    │  │
│  │ (*/actions)  │  │  (zustand)   │  │  (use*.ts)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       Data Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    DB ORM    │  │  API Client  │  │     Cache    │  │
│  │  (drizzle)   │  │  (lib/api)   │  │  (next/cache)│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    External Services                     │
│  ┌──────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Neon │  │ Clerk  │  │OpenRouter│  │ Tavily/FireC │  │
│  └──────┘  └────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Estrutura de Arquivos

```
src/
├── app/                          # Next.js App Router
│   ├── (chat)/                   # Grupo de rotas de chat
│   │   ├── chat/
│   │   │   ├── [id]/             # Chat específico
│   │   │   │   ├── page.tsx      # Server Component
│   │   │   │   └── loading.tsx
│   │   │   └── page.tsx          # Lista de chats
│   │   └── layout.tsx            # Layout compartilhado
│   ├── (dashboard)/              # Rotas do dashboard
│   │   ├── library/
│   │   ├── knowledge/
│   │   └── settings/
│   ├── api/                      # API Routes
│   │   ├── chat/
│   │   ├── generate/
│   │   └── webhooks/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── components/                   # Componentes React
│   ├── ui/                       # Componentes base
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── modal.tsx
│   ├── chat/                     # Componentes de chat
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   └── chat-list.tsx
│   ├── library/                  # Componentes de biblioteca
│   └── knowledge/                # Componentes de knowledge
│
├── db/                           # Database
│   ├── schema.ts                 # Drizzle schema
│   └── index.ts                  # DB connection
│
├── lib/                          # Utilitários e configs
│   ├── api/                      # API clients
│   │   ├── openrouter.ts
│   │   ├── tavily.ts
│   │   └── firecrawl.ts
│   ├── utils.ts                  # Helpers (cn, etc)
│   └── constants.ts              # Constantes globais
│
└── stores/                       # Zustand stores
    ├── chat.ts                   # Chat state
    ├── library.ts                # Library state
    └── ui.ts                     # UI state (modals, etc)
```

## Server vs Client Components

### Server Components (Padrão)

```typescript
// app/chat/page.tsx
async function ChatListPage() {
  // ✅ Pode fazer fetch de dados
  const chats = await db.query.chats.findMany();

  // ✅ Pode acessar banco diretamente
  // ✅ Pode usar server actions
  // ✅ Mais performático (sem JS enviado)

  return <ChatList initialData={chats} />;
}
```

### Client Components

```typescript
// 'use client'
import { useState } from 'react';

export function ChatInput() {
  // ✅ Pode usar useState, useEffect
  // ✅ Pode ter event handlers
  // ✅ Pode acessar browser APIs

  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### Padrão: Compound Components

Separe a lógica:

```typescript
// app/chat/[id]/page.tsx (Server)
async function ChatPage({ params }) {
  const chat = await getChat(params.id);
  return <ChatContainer chatId={chat.id} />;
}

// components/chat/chat-container.tsx (Client)
'use client';
export function ChatContainer({ chatId }) {
  // Toda a interatividade fica aqui
}
```

## Fluxo de Dados

### Criar um Chat

```
User Action (Client Component)
    │
    ▼
Server Action (app/chat/actions.ts)
    │
    ▼
Database (drizzle)
    │
    ▼
Revalidate Path (Next.js cache)
    │
    ▼
UI Update (automatic via Server Component re-render)
```

### Gerar Conteúdo com IA

```
User Input (Client)
    │
    ▼
Server Action (app/api/generate/route.ts)
    │
    ├──▶ OpenRouter API
    │        │
    │        ▼
    │   LLM Response
    │
    ├──▶ Tavily (se search)
    │
    └──▶ Firecrawl (se scraping)
    │
    ▼
Database (salvar mensagem)
    │
    ▼
UI Update (stream via SSE ou revalidate)
```

## Database Schema

### Tabelas Principais

```sql
-- Chats (conversas)
chats (id, title, created_at, updated_at)

-- Messages (mensagens do chat)
messages (id, chat_id, role, content, metadata, created_at)

-- Library Items (conteúdo criado)
library_items (id, type, content, metadata, status, created_at)

-- Knowledge Docs (documentos base)
knowledge_docs (id, filename, content, embedding, status, created_at)
```

### Relacionamentos

```
chats 1──N messages
              │
              └──> metadata pode referenciar library_items
```

## Autenticação (Clerk)

### Middleware Proteção

```typescript
// middleware.ts
const isPublicRoute = createRouteMatcher(['/', '/sign-in', '/sign-up']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});
```

### Acesso ao Usuário

```typescript
// Server Component
const user = await currentUser();

// Client Component
const { user } = useUser();
```

## Estado Global (Zustand)

### Chat Store

```typescript
interface ChatStore {
  // Estado
  activeChatId: string | null;
  messages: Message[];
  isGenerating: boolean;

  // Actions
  setActiveChat: (id: string) => void;
  addMessage: (msg: Message) => void;
  setGenerating: (bool: boolean) => void;
}
```

## API Routes

### Estrutura

```
app/api/
├── chat/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       └── route.ts          # GET, PUT, DELETE
├── generate/
│   └── route.ts              # POST (gerar conteúdo)
└── webhooks/
    └── clerk/
        └── route.ts          # POST (webhooks do Clerk)
```

## Performance

### Estratégias

1. **Server Components por padrão** - Menos JS enviado
2. **Streaming com Suspense** - Loading progressivo
3. **RevalidatePath** - Invalidação de cache granular
4. **Dynamic imports** - Code splitting para componentes pesados
5. **Images com next/image** - Otimização automática

### Exemplo de Streaming

```typescript
// app/chat/[id]/page.tsx
export default function ChatPage({ params }) {
  return (
    <Suspense fallback={<ChatListSkeleton />}>
      <ChatList chatId={params.id} />
    </Suspense>
  );
}
```

## Segurança

### Práticas

1. **API Keys** - Sempre em variáveis de ambiente
2. **Server Actions** - Validar permissões no servidor
3. **SQL Injection** - Usar Drizzle ORM (parameterized queries)
4. **XSS** - React escapa automaticamente, cuidado com dangerouslySetInnerHTML
5. **CSRF** - Next.js protege automaticamente

## Monitoramento

### Logs Estruturados

```typescript
console.log(JSON.stringify({
  event: 'chat_created',
  userId: user.id,
  chatId: chat.id,
  timestamp: new Date().toISOString(),
}));
```

### Error Tracking

```typescript
// Error boundaries em cada rota
// app/chat/[id]/error.tsx
export default function Error({ error }) {
  // Log error para serviço de monitoring
  return <ErrorUI />;
}
```
