# Máquina de Conteúdo - Content Studio

## Visão Geral
Este é um estúdio de conteúdo alimentado por IA que permite criar, editar e gerenciar posts para redes sociais usando agentes especialistas.

## Tech Stack
- **Framework**: Next.js 16.1.1 (App Router + Turbopack)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4
- **Autenticação**: Clerk
- **Banco de Dados**: Neon (PostgreSQL) + Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible)
- **State Management**: Zustand
- **LLM**: Vercel AI SDK + OpenRouter
- **Embeddings**: Voyage AI
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
│   │   ├── ai/              # Vercel AI SDK config
│   │   ├── voyage/          # Voyage AI embeddings
│   │   ├── rag/             # RAG utilities
│   │   ├── storage/         # Storage abstraction layer (R2 + Local)
│   │   └── queue/           # Queue system
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

# ─────────────────────────────────────────────────────────────────────────────
# 📦 CLOUDFLARE R2 STORAGE (Opcional - para armazenamento de arquivos)
# ─────────────────────────────────────────────────────────────────────────────
# Provider: "local" | "r2" (default: local)
STORAGE_PROVIDER=local
#
# R2 Credentials (necessário apenas se STORAGE_PROVIDER=r2)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=maquina-de-conteudo
R2_PUBLIC_URL=https://pub-xxx.r2.dev
# Domínio personalizado para arquivos públicos (opcional)
R2_CUSTOM_DOMAIN=storage-mc.zoryon.org
# Endpoint S3 da Cloudflare R2 (geralmente não precisa alterar)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
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

## Cloudflare R2 Storage Integration

### Visão Geral

Este projeto usa **Cloudflare R2** para armazenamento de arquivos (PDF, TXT, MD) da base de conhecimento. O sistema possui uma camada de abstração que permite alternar entre armazenamento local e R2 via variável de ambiente.

A migração para R2 foi completada em Janeiro 2026.

### Estrutura

```
src/lib/storage/
├── types.ts           # StorageProvider enum, interfaces
├── config.ts          # R2 credentials, getR2PublicUrl()
├── providers/
│   ├── index.ts       # Factory function getStorageProvider()
│   ├── local.ts       # LocalStorageProvider (filesystem)
│   └── r2.ts          # R2StorageProvider (S3 client)
└── utils/
    └── file-url.ts    # getDocumentUrl(), hasStorageLocation()

src/app/api/documents/
├── upload/
│   └── route.ts       # Usa storage abstraction para upload
└── [id]/
    └── route.ts       # Download endpoint
```

### Configuração

**Variável de ambiente:**
```env
STORAGE_PROVIDER=local|r2
```

**R2 Credentials (quando STORAGE_PROVIDER=r2):**
```env
R2_ACCOUNT_ID=11feaa2d9e21cd5a972bccfcb8d1e3d7
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=maquina-de-conteudo
R2_CUSTOM_DOMAIN=storage-mc.zoryon.org
```

### Storage Provider Interface

```typescript
// src/lib/storage/types.ts
export enum StorageProvider {
  LOCAL = "local",
  R2 = "r2",
}

export interface IStorageProvider {
  uploadFile(buffer: Buffer, key: string): Promise<StorageResult>
  deleteFile(key: string): Promise<void>
  batchDelete(keys: string[]): Promise<BatchResult>
  getFileUrl(key: string): string
}

export interface StorageResult {
  provider: StorageProvider
  storageKey: string
  url: string
}
```

### Factory Pattern

```typescript
// src/lib/storage/providers/index.ts
import { LocalStorageProvider } from "./local"
import { R2StorageProvider } from "./r2"
import { STORAGE_PROVIDER_ENV, isR2Configured } from "../config"

export function getStorageProvider(): IStorageProvider {
  if (STORAGE_PROVIDER_ENV === "r2" && isR2Configured()) {
    return new R2StorageProvider()
  }
  return new LocalStorageProvider()
}
```

### Padrões de Uso

**Upload de arquivo:**
```typescript
// src/app/api/documents/upload/route.ts
import { getStorageProvider } from "@/lib/storage/providers"

const storage = getStorageProvider()
const storageKey = `documents/${userId}/${Date.now()}-${sanitizedFilename}`

const result = await storage.uploadFile(buffer, storageKey)

// Salvar no banco
await db.insert(documents).values({
  title,
  content: text,
  fileType,
  storageProvider: result.provider,
  storageKey: result.storageKey,
  userId,
})
```

**Gerar URL pública:**
```typescript
// src/lib/storage/utils/file-url.ts
import { getDocumentUrl } from "@/lib/storage/utils/file-url"

const url = getDocumentUrl(document)
// R2: https://storage-mc.zoryon.org/documents/user/1234567890-doc.pdf
// Local: http://localhost:3000/uploads/documents/user/1234567890-doc.pdf
```

**Deletar arquivo:**
```typescript
// src/app/api/documents/[id]/route.ts
import { getStorageProvider } from "@/lib/storage/providers"

const storage = getStorageProvider()
await storage.deleteFile(doc.storageKey)
```

### Custom Domain

O sistema suporta domínio personalizado para arquivos R2:

```typescript
// src/lib/storage/config.ts
export const getR2PublicUrl = (): string | null => {
  return R2_CUSTOM_DOMAIN
    ? `https://${R2_CUSTOM_DOMAIN}`
    : R2_PUBLIC_URL || null
}
```

**Exemplo:** `https://storage-mc.zoryon.org/documents/user/1234567890-doc.pdf`

### CORS Configuration

Configure CORS no bucket R2 para permitir acesso público:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://maquina-de-conteudo.vercel.app",
      "https://storage-mc.zoryon.org",
      "https://*.zoryon.org"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**IMPORTANTE:** R2 NÃO suporta o método `OPTIONS` nem `ExposeHeaders`. Use apenas `GET` e `HEAD`.

### Schema do Banco

```typescript
// src/db/schema.ts
export const documents = pgTable("documents", {
  // ... outros campos
  storageProvider: text("storage_provider"), // "local" | "r2"
  storageKey: text("storage_key"),          // R2 key ou local filename
  filePath: text("file_path"),              // Legacy local path
})
```

### Admin Operations

**Endpoint de limpeza total:** `DELETE /api/admin/clear-documents`

```typescript
// Deleta TODOS os documentos do usuário:
// 1. Arquivos do storage (R2 e local)
// 2. Embeddings (document_embeddings)
// 3. Associações de coleção (document_collection_items)
// 4. Registros de documentos (documents)
```

---

## Vercel AI SDK Integration

### Visão Geral

Este projeto usa **Vercel AI SDK** para acessar múltiplos modelos de IA através do **OpenRouter**. A migração de cliente customizado para o SDK foi completada em Janeiro 2026.

### Estrutura

```
src/lib/ai/
├── config.ts           # Configuração central + modelos disponíveis
└── ...

src/app/api/chat/
└── route.ts            # Streaming chat endpoint com streamText

src/components/chat/
├── ai-chat-sdk.tsx     # Componente com useChat hook
└── model-selector.tsx  # Seletor de modelos
```

### Configuração

```typescript
// src/lib/ai/config.ts
import { createOpenAI } from '@ai-sdk/openai'

export const openrouter = OPENROUTER_API_KEY
  ? createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      headers: {
        'X-Title': OPENROUTER_APP_NAME,
        'HTTP-Referer': OPENROUTER_APP_URL,
      },
    })
  : null
```

### Modelos Disponíveis

**Modelos de Texto (12):**
- `openai/gpt-5-mini`, `openai/gpt-5.1`, `openai/gpt-5.2`
- `openai/gpt-4.1`, `openai/gpt-4.1-mini`
- `anthropic/claude-sonnet-4.5`, `anthropic/claude-opus-4.5`, `anthropic/claude-haiku-4.5`
- `google/gemini-3-flash-preview`, `google/gemini-3-pro-preview`
- `x-ai/grok-4.1-fast`, `x-ai/grok-4`

**Modelos de Imagem (4):**
- `google/gemini-3-pro-image-preview`
- `openai/gpt-5-image`
- `bytedance-seed/seedream-4.5`
- `black-forest-labs/flux.2-max`

### API Route - Streaming Chat

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai'
import { openrouter } from '@/lib/ai/config'

export async function POST(request: NextRequest) {
  const { messages, model, ragOptions } = await request.json()

  const result = streamText({
    model: openrouter(model),
    messages,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}
```

### Client Component - useChat Hook

```typescript
// src/components/chat/ai-chat-sdk.tsx
import { useChat } from "@ai-sdk/react"
import type { UIMessage } from "ai"

const {
  messages,
  status,
  error,
  sendMessage,
  stop,
  clearError,
} = useChat({
  onFinish: ({ message }) => {
    const text = getMessageText(message)
    onComplete?.(text)
  },
})

const isLoading = status === "streaming"

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("")
}
```

### Importante: API do useChat

**Propriedades retornadas:**
- `messages` - Array de mensagens
- `status` - `"ready" | "streaming" | "error"`
- `error` - Error object quando status é "error"
- `sendMessage(message)` - Enviar mensagem
- `stop()` - Parar streaming
- `clearError()` - Limpar erro

**Não usar:**
- ❌ `input`, `handleInputChange`, `handleSubmit` (não existem)
- ❌ `isLoading` (use `status === "streaming"`)
- ❌ `CoreMessage` (use `UIMessage`)

### Formato de Mensagens SDK v3

**IMPORTANTE:** `sendMessage` requer o formato `{ parts: [...] }`:

```typescript
// ✅ CORRETO
sendMessage(
  { parts: [{ type: "text", text: messageToSend }] },
  { body: { agent, model, categories, useRag } }
)

// ❌ ERRADO - não funciona
sendMessage({ text: messageToSend })
```

### Memoização para Performance

**Sempre memoizar valores derivados de `messages`:**

```typescript
// Helper function com useCallback
const getMessageText = useCallback((message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}, [])

// Valor derivado com useMemo (evita infinite loops)
const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])
```

**Por que isso é importante:**
- Valores computados sem `useMemo` criam nova referência a cada render
- Se usado em `useEffect` dependencies, causa infinite loop
- `useCallback` é necessário para funções usadas em `useMemo`

### Environment Variables

```env
# OBRIGATÓRIO para LLMs
OPENROUTER_API_KEY=sk-or-v1-...

# OBRIGATÓRIO para Embeddings (Voyage)
VOYAGE_API_KEY=voyage-...

# OPCIONAIS
FIRECRAWL_API_KEY=fc-...
TAVILY_API_KEY=tvly-...
```

### System Status Monitoring

Use `getSystemStatusAction()` para verificar configuração:

```typescript
import { getSystemStatusAction } from "@/app/(app)/settings/actions"

const status = await getSystemStatusAction()
// Returns: { overallConfigured: boolean, services: {...} }
```

---

## OpenRouter Legacy (Referência)

**Nota:** OpenRouter agora é acessado via Vercel AI SDK. Abaixo, referência para IDs de modelo.

**IMPORTANTE:** IDs dos modelos devem ser usados **EXATAMENTE** como documentados em `src/lib/ai/config.ts`. Small differences cause API failures.

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

## RAG & Embeddings (Voyage AI)

### Visão Geral

Sistema RAG (Retrieval-Augmented Generation) com embeddings da **Voyage AI** para busca semântica em documentos do usuário.

### Configuração

**Modelo:** `voyage-4-large`
- Dimensões: 1024
- Contexto: 32k tokens
- Custo: $0.07/1M tokens

### Chunking por Categoria

| Categoria | Chunk Size | Overlap | Uso |
|-----------|-----------|---------|-----|
| `products` | 800 | 100 | Catálogo de produtos |
| `offers` | 900 | 150 | Promoções e descontos |
| `brand` | 1300 | 200 | Tom de voz, valores |
| `audience` | 1000 | 150 | Personas e público-alvo |
| `competitors` | 900 | 150 | Análise competitiva |
| `content` | 1200 | 180 | Posts e calendários |
| `general` | 1000 | 150 | Padrão balanceado |

### Threshold de Similaridade

**Valor padrão:** `0.5` (unificado em toda a pipeline)
- Range efetivo: 0-1 (cosine similarity)
- Trade-off: 0.5 = melhor balanceamento recall/precision

### Módulos RAG

```
src/lib/voyage/
├── embeddings.ts    → generateEmbedding(), generateEmbeddingsBatch()
├── chunking.ts      → splitDocumentIntoChunks(), getChunkingOptionsForCategory()
├── search.ts        → semanticSearch(), hybridSearch(), getRagContext()
└── types.ts         → VoyageModel, SemanticSearchOptions

src/lib/rag/
├── assembler.ts     → assembleRagContext(), getRelevantDocuments()
├── filters.ts       → filterByRelevance(), diversifyChunks()
├── token-budget.ts  → estimateTokens(), selectChunksWithinBudget()
└── index.ts         → Client-safe exports (tipos, constantes)
```

### APIs de Integração

**Chat com RAG:**
```typescript
// src/app/api/chat/route.ts
const ragResult = await assembleRagContext(userId, query, {
  categories,
  threshold: 0.5,
  maxChunks: 15,
  maxTokens: 3000,
  includeSources: true,
})
```

**Busca Semântica:**
```typescript
// src/lib/voyage/search.ts
const results = await semanticSearch(userId, query, {
  categories: ["brand", "products"],
  threshold: 0.5,
  limit: 10,
})
```

**Worker de Embeddings:**
```typescript
// src/app/api/workers/route.ts (job: document_embedding)
const chunkingOptions = getChunkingOptionsForCategory(doc.category ?? "general")
const chunks = await splitDocumentIntoChunks(doc.content, chunkingOptions)
const embeddings = await generateEmbeddingsBatch(texts, "voyage-4-large")
```

### Padrões de Uso

1. **Sempre usar `voyage-4-large`:**
```typescript
const model = "voyage-4-large"  // ✅
```

2. **Category-specific chunking:**
```typescript
const options = getChunkingOptionsForCategory(category)
const chunks = await splitDocumentIntoChunks(content, options)
```

3. **Threshold consistente:** `0.5` em toda a pipeline

4. **Client-safe imports:**
```typescript
// ✅ CORRETO - importar tipos do index
import { RAG_CATEGORIES, type RagCategory } from "@/lib/rag"

// ❌ ERRADO - importar assembler em client component
import { assembleRagContext } from "@/lib/rag/assembler"  // usa db!
```

### Componentes UI

**RAG Context Selector:**
```typescript
// src/components/chat/rag-context-selector.tsx
<RagContextSelector />  // Seletor de categorias para RAG
```

**Semantic Search Tab:**
```typescript
// src/app/(app)/sources/components/semantic-search-tab.tsx
<SemanticSearchTab />  // Interface para testar buscas semânticas
```

### Environment Variables

```env
# OBRIGATÓRIO para Embeddings
VOYAGE_API_KEY=voyage-...
```

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

## Fontes e Documentos (`/fontes`)

### Visão Geral

A página de Fontes (`/sources`) é o centro de gerenciamento de documentos para RAG (Retrieval Augmented Generation). Localizada em `/fontes`, permite:

- **Upload de arquivos** (PDF, TXT, MD) com extração automática de texto
- **Coleções** para organizar documentos em pastas
- **Categorias** para classificar tipo de conteúdo
- **Busca e filtros** por categoria e termo de busca
- **Estatísticas** de documentos, chunks e indexação

### Estrutura de Arquivos

```
src/app/(app)/sources/
├── page.tsx                               # Server Component (root)
├── components/
│   ├── sources-page.tsx                   # Client Component principal
│   ├── collections-sidebar.tsx            # Sidebar com coleções
│   ├── documents-tab.tsx                  # Tab de documentos
│   ├── upload-dialog.tsx                  # Modal de upload
│   ├── collection-card.tsx                # Card de coleção
│   ├── collection-form-dialog.tsx         # Modal criar/editar coleção
│   └── document-card.tsx                  # Card de documento
├── actions/
│   ├── sources-actions.ts                 # Ações de documentos
│   └── collections-actions.ts             # Ações de coleções
└── hooks/
    └── use-sources-data.ts                # Hook de dados

src/app/api/documents/
└── upload/
    └── route.ts                           # Endpoint de upload com PDF parse
```

### Schema do Banco

```typescript
// Tabela de coleções (pastas)
export const documentCollections = pgTable("document_collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
})

// Tabela de junção (many-to-many)
export const documentCollectionItems = pgTable("document_collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id")
    .references(() => documentCollections.id)
    .notNull(),
  documentId: integer("document_id")
    .references(() => documents.id)
    .notNull(),
  addedAt: timestamp("added_at").defaultNow(),
})

// Tabela de documentos
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type"), // "pdf", "txt", "md"
  category: text("category"), // "general", "products", "offers", etc.
  userId: text("user_id").notNull(),
  embedded: boolean("embedded").default(false),
  embeddingModel: text("embedding_model").default("voyage-4-large"),
  embeddingStatus: text("embedding_status"), // "pending", "processing", "completed", "failed"
  embeddingProgress: integer("embedding_progress").default(0),
  chunksCount: integer("chunks_count").default(0),
  lastEmbeddedAt: timestamp("last_embedded_at"),
  filePath: text("file_path"), // Caminho do arquivo (opcional)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
})
```

### Categorias de Documentos

As categorias correspondem aos tipos de conteúdo usados pelo sistema de prompts:

```typescript
const DOCUMENT_CATEGORIES = {
  general: "Geral - Documentos gerais sobre o negócio",
  products: "Catálogo - Lista completa de produtos/serviços",
  offers: "Ofertas - Promoções, descontos, lançamentos",
  brand: "Marca - Tom de voz, valores, missão, visão",
  audience: "Público - Personas, pesquisas, dados demográficos",
  competitors: "Concorrentes - Análise competitiva",
  content: "Conteúdo - Posts que funcionaram, calendário anterior",
}
```

### Upload de Arquivos

**Cliente (FormData):**
```typescript
const formData = new FormData()
formData.append("file", file)
formData.append("title", file.name.replace(/\.[^/.]+$/, ""))
formData.append("category", selectedCategory)
if (collectionId) {
  formData.append("collectionId", collectionId.toString())
}

await fetch("/api/documents/upload", {
  method: "POST",
  body: formData,
})
```

**Servidor (request.formData()):**
```typescript
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File
  const title = formData.get("title") as string
  const category = formData.get("category") as string
  const collectionId = formData.get("collectionId") as string | null

  const buffer = Buffer.from(await file.arrayBuffer())

  // Extrair texto do PDF se necessário
  const text = fileType === "pdf"
    ? await extractTextFromPDF(buffer)
    : buffer.toString("utf-8")

  // Salvar no banco
  await db.insert(documents).values({
    title,
    content: text,
    fileType,
    category,
    userId,
  })
}
```

### Extração de Texto PDF

**IMPORTANTE:** Usar o padrão correto para pdf-parse v2.4.5:

```typescript
// ✅ CORRETO
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const uint8Array = new Uint8Array(buffer)
  const parser = new PDFParse({ data: uint8Array })
  const data = await parser.getText()
  return data.text || ""
}
```

### Server Actions - Coleções

```typescript
// Listar coleções do usuário
getCollectionsAction(): Promise<DocumentCollection[]>

// Criar nova coleção
createCollectionAction(data: {
  name: string
  description?: string
}): Promise<ActionResult>

// Atualizar coleção
updateCollectionAction(id: number, data: {
  name?: string
  description?: string
}): Promise<ActionResult>

// Soft delete coleção
deleteCollectionAction(id: number): Promise<ActionResult>

// Adicionar documento a coleção
addDocumentToCollectionAction(
  documentId: number,
  collectionId: number
): Promise<ActionResult>

// Remover documento de coleção
removeDocumentFromCollectionAction(
  documentId: number,
  collectionId: number
): Promise<ActionResult>
```

### Server Actions - Documentos

```typescript
// Buscar documentos (todos ou de uma coleção)
getDocumentsByCollectionAction(
  collectionId: number | null
): Promise<DocumentWithEmbeddings[]>

// Buscar estatísticas
getDocumentStatsAction(): Promise<DocumentStats>

// Atualizar documento
updateDocumentAction(
  documentId: number,
  data: { title?: string; category?: string; content?: string }
): Promise<SourceResult>

// Excluir documento (e embeddings)
deleteDocumentWithEmbeddingsAction(
  documentId: number
): Promise<SourceResult>

// Buscar por categoria
getDocumentsByCategoryAction(
  category: string | null
): Promise<Document[]>

// Busca simples (ILIKE)
searchDocumentsAction(
  query: string,
  category?: string | null,
  limit?: number
): Promise<Document[]>

// Re-embed documento
reembedDocumentAction(
  documentId: number,
  force?: boolean
): Promise<SourceResult & { jobId?: number }>

// Status de embedding
getEmbeddingStatusAction(documentId: number): Promise<EmbeddingStatus | null>
```

### Padrões de UI

**Sidebar de Coleções:**
- Lista hierárquica de pastas
- Active state com `bg-primary`
- Contador de documentos por coleção
- Ações: criar, editar, excluir

**Cards de Documento:**
- Badge de categoria com cor específica
- Badge de status de embedding (Indexado/Pendente/Processando)
- Contador de chunks
- Ações: editar, excluir, re-embed

**Upload Dialog:**
- Drag & drop com highlight visual
- Seletor de categoria em grid
- Validação: PDF, TXT, MD (max 10MB)
- Progress indicator durante upload

---
