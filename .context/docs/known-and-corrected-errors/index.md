# Known Errors and Solutions

Documentação de erros encontrados durante o desenvolvimento e suas soluções.

## Erros de TypeScript

### 1. "Duplicate identifier" em imports

**Erro:**
```
Duplicate identifier 'eq', 'desc', 'sql', 'and'
```

**Causa:** Import duplicado quando usando `import` no topo e depois novamente no final do arquivo.

**Solução:** Manter todos os imports no topo do arquivo:
```typescript
// ✅ Correto
import { eq, desc, sql, and } from "drizzle-orm";

// ❌ Errado - não importar novamente no final
import { eq, desc, sql, and } from "drizzle-orm";
```

### 2. "Argument of type '{}' is not assignable to parameter of type 'JobPayload'"

**Erro:**
```
Type error: Argument of type '{}' is not assignable to parameter of type 'JobPayload'.
```

**Causa:** Usar `unknown` como tipo de payload ao invés do tipo union correto.

**Solução:** Tipar corretamente o body da requisição:
```typescript
// ✅ Correto
const body = await request.json() as {
  type: JobType;
  payload: JobPayload;  // Usar o tipo union
};

// ❌ Errado
const body = await request.json() as {
  type: JobType;
  payload: unknown;
};
```

### 3. "Property 'where' does not exist on type 'Omit<PgSelectBase...'"

**Erro:**
```
Property 'where' does not exist on type 'Omit<PgSelectBase...'
```

**Causa:** Tentar encadear múltiplas chamadas `.where()` em uma query já construída.

**Solução:** Usar `and()` para combinar múltiplas condições:
```typescript
// ✅ Correto
const conditions = [eq(jobs.userId, userId)];
if (filters?.status) {
  conditions.push(eq(jobs.status, filters.status as any));
}
await db.select().from(jobs).where(and(...conditions));

// ❌ Errado
const query = db.select().from(jobs).where(eq(jobs.userId, userId));
query.where(eq(jobs.status, status));  // Não funciona
```

### 4. "Argument of type 'number | null' is not assignable to parameter of type 'number'"

**Erro:**
```
Type error: 'job.attempts' is possibly 'null'
```

**Causa:** Colunas do banco podem ser `null` mas TypeScript espera `number`.

**Solução:** Usar null coalescing operator:
```typescript
// ✅ Correto
const attempts = job.attempts ?? 0;
const maxAttempts = job.maxAttempts ?? 3;
const shouldRetry = attempts + 1 < maxAttempts;

// ❌ Errado
const shouldRetry = job.attempts + 1 < job.maxAttempts;
```

## Erros de Build

### 5. "The 'middleware' file convention is deprecated"

**Aviso:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Causa:** Next.js 16+ prefere `proxy.ts` ao invés de `middleware.ts`.

**Solução:** Renomear `src/middleware.ts` → `src/proxy.ts` (futuramente).

**Status:** Apenas um aviso, o código funciona normalmente.

## Erros de Banco de Dados

### 6. "Connection string provided to neon() is not a valid URL"

**Erro:**
```
Database connection string provided to `neon()` is not a valid URL.
Connection string: postgresql://project-id:hostname/database
```

**Causa:** Connection string incompleta, faltando usuário e senha.

**Solução:** Usar o formato completo com pooler:
```env
# ❌ Errado
DATABASE_URL=postgresql://project-id:hostname/database

# ✅ Correto
DATABASE_URL=postgresql://username:password@hostname-pooler.region.neon.tech/database?sslmode=require
```

**Como obter:** Use `get_connection_string` do MCP Neon ou Neon Dashboard.

### 7. "syntax error at or near 'NOT'" (PostgreSQL)

**Erro:**
```
syntax error at or near "NOT"
```

**Causa:** PostgreSQL não suporta `IF NOT EXISTS` com `CREATE TYPE`.

**Solução:** Remover `IF NOT EXISTS` de enums:
```sql
-- ❌ Errado
CREATE TYPE IF NOT EXISTS job_type AS ENUM (...);

-- ✅ Correto
CREATE TYPE job_type AS ENUM (...);
```

## Erros de Autenticação

### 8. Webhook Clerk não funciona em localhost

**Problema:** Clerk não consegue enviar webhooks para `http://localhost:3000`.

**Solução:** Usar ngrok para expor localhost:
```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Expor porta 3000
ngrok http 3000

# 3. Copiar a URL gerada (ex: https://abc123.ngrok-free.app)

# 4. No Clerk Dashboard → Webhooks → Add Endpoint:
#    URL: https://abc123.ngrok-free.app/api/webhooks/clerk

# 5. Copiar o CLERK_WEBHOOK_SECRET gerado para o .env.local
```

## Erros de Redis/Upstash

### 9. "UPSTASH_REDIS_REST_URL is not set"

**Erro:** Warning no console sobre variáveis de ambiente não configuradas.

**Solução:** Criar banco Redis gratuito em https://upstash.com e adicionar ao `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Nota:** O sistema funciona mesmo sem Redis (jobs ficam apenas no DB), mas o processamento assíncrono não funciona.

## Erros de Frontend (Fase 4)

### 10. "Event handlers cannot be passed to Client Component props"

**Erro:**
```
Error: Event handlers cannot be passed to Client Component props.
  <DashboardPage ... onSendMessage={fn} />
           ^^^^^^^^^^^
```

**Causa:** Passar uma função (event handler) de um Server Component para um Client Component via props.

**Solução:** Converter a página para Client Component quando precisar de interatividade:
```typescript
// ❌ Errado - Server Component tentando passar handler
// app/dashboard/page.tsx (sem "use client")
export default function DashboardPage() {
  const handleSend = (msg: string) => { ... }
  return <AnimatedAIChat onSendMessage={handleSend} />
}

// ✅ Correto - Client Component com "use client"
// app/dashboard/page.tsx
"use client"
export default function DashboardPage() {
  const handleSend = (msg: string) => { ... }
  return <AnimatedAIChat onSendMessage={handleSend} />
}
```

**Padrão:** Páginas com formulários, event handlers ou estado devem ser Client Components.

### 11. "text-primary" e "bg-primary" não mostram a cor correta

**Problema:** Classes Tailwind como `text-primary`, `bg-primary`, `border-primary` não aplicam a cor Lime Green.

**Causa:** Tailwind CSS v4 com `@theme inline` não resolve corretamente CSS custom properties como `--primary: 84 76% 55%` em todos os contextos.

**Solução:** Adicionar classes CSS explícitas em `globals.css`:
```css
/* ❌ Não funciona confiavelmente com @theme inline */
@theme inline {
  --color-primary: oklch(0.86 0.18 142);
}

/* ✅ Funciona - classe CSS explícita */
.bg-primary {
  background-color: hsl(84 76% 55%);
}
.text-primary {
  color: hsl(84 76% 55%);
}
.border-primary {
  border-color: hsl(84 76% 55%);
}
```

**Nota:** O valor `hsl(84 76% 55%)` é equivalente a `#a3e635` (Lime Green).

### 12. "redirectUrl is deprecated" (Clerk)

**Aviso:**
```
⚠ 'redirectUrl' is deprecated. Use 'forceRedirectUrl' instead.
```

**Causa:** Clerk atualizou a API e `redirectUrl` foi depreciado.

**Solução:** Substituir `redirectUrl` por `forceRedirectUrl`:
```typescript
// ❌ Errado - deprecated
<SignIn redirectUrl="/dashboard" />

// ✅ Correto
<SignIn forceRedirectUrl="/dashboard" />
```

### 13. Texto do menu navbar ilegível (preto no escuro)

**Problema:** Itens do menu não ativos ficam com texto preto, ilegível no fundo escuro.

**Causa:** Usar `text-foreground/80` que não resolve corretamente em dark mode com Tailwind v4.

**Solução:** Usar cores explícitas:
```typescript
// ❌ Errado - não resolve corretamente
className="text-foreground/80 hover:text-foreground"

// ✅ Correto - cores explícitas
className="text-white/70 hover:text-white hover:bg-white/5"
```

**Padrão:** Em dark mode, sempre usar `text-white/X` ao invés de tokens de cor.

### 14. "Invalid import - 'client-only' cannot be imported from a Server Component"

**Erro:**
```
Error: Invalid import - 'client-only' cannot be imported from a Server Component module.
```

**Causa:** Usar `<style jsx>` que depende do módulo `client-only` em um Server Component.

**Solução:** Remover styled-jsx e usar Tailwind com arbitrary values:
```typescript
// ❌ Errado - styled-jsx em Server Component
<style jsx>{`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`}</style>

// ✅ Correto - Tailwind arbitrary value
className="[animation:pulse_4s_ease-in-out_infinite]"
```

### 15. Ícones Lucide depreciados

**Aviso:** TypeScript warnings sobre `Chrome`, `Github` e outros ícones serem depreciados.

**Causa:** Lucide React removeu alguns ícones de marcas específicas.

**Solução:** Usar SVG inline para ícones de marcas:
```typescript
// ❌ Errado - ícone depreciado
import { Chrome, Github } from "lucide-react"

// ✅ Correto - SVG inline
<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  {/* ... */}
</svg>
```

### 16. Model IDs incorretos da OpenRouter

**Erro:** Modelos não funcionam porque o ID está incorreto.

**Causa:** Usar IDs genéricos ou desatualizados (ex: `gpt-4.2` quando o correto é `gpt-5.2`).

**Solução:** Usar **EXATAMENTE** os IDs fornecidos pela OpenRouter:
```typescript
// ❌ Errado - IDs incorretos ou genéricos
{ id: "openai/gpt-4.2", ... }
{ id: "google/gemini-2-flash", ... }

// ✅ Correto - IDs exatos da OpenRouter
{ id: "openai/gpt-5.2", name: "GPT 5.2", type: "text", provider: "openai" }
{ id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", type: "text", provider: "google" }
{ id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "text", provider: "anthropic" }
{ id: "openai/gpt-5-image", name: "GPT 5 Image", type: "image", provider: "openai" }
{ id: "black-forest-labs/flux.2-pro", name: "Flux 2 Pro", type: "image", provider: "black-forest-labs" }
// ... ver lista completa em src/lib/models.ts
```

**Importante:** Documentar todos os IDs exatos em `src/lib/models.ts` para reuso.

### 17. Type error: 'string | null' not assignable to 'string | undefined'

**Erro:**
```
Type 'string | null' is not assignable to type 'string | undefined'.
```

**Causa:** Clerk retorna `null` para valores ausentes, mas TypeScript espera `undefined`.

**Solução:** Usar null coalescing operator:
```typescript
// ❌ Errado
const userId = auth().userId
// Type: string | null

// ✅ Correto
const userId = auth().userId ?? undefined
// Type: string | undefined
```

### 18. Missing Icon Import (X from lucide-react)

**Erro:**
```
Cannot find name 'X'. [2304]
```

**Contexto:** Após refatorar o navbar da página `/fontes`, o ícone `X` foi adicionado ao componente mas não foi importado.

**Causa:** Adicionar `<X className="h-3 w-3" />` no componente sem importar o ícone de `lucide-react`.

**Solução:** Adicionar `X` à lista de imports:
```typescript
// ❌ Errado - X não está nos imports
import { Globe, FileText, Search, BarChart3 } from "lucide-react"

// ✅ Correto - adicionar X aos imports
import { Globe, FileText, Search, BarChart3, X } from "lucide-react"
```

**Arquivo:** `src/app/(app)/sources/page.tsx`

**Prevenção:** Sempre verificar se todos os ícones usados no componente estão importados.

### 19. Infinite Loop em React Hooks com useCallback

**Erro:** Componente React faz requests POST infinitas para o servidor.

**Sintoma:**
```
POST /calendar 200 in 93ms
POST /calendar 200 in 93ms
POST /calendar 200 in 101ms
... (repeating infinitely)
```

**Causa:** Usar `useCallback` com dependências de objeto (`dateRange`, `filters`) que criam nova referência a cada render:
```typescript
// ❌ ERRADO
const fetchPosts = useCallback(async () => {
  const result = await getCalendarPostsAction(dateRange, filters)
  setPosts(result)
}, [dateRange, filters])  // Nova referência a cada render!
```

**Solução:** Usar `useRef` para comparação de estabilidade:
```typescript
// ✅ CORRETO
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])
```

**Arquivos:**
- `.context/docs/known-and-corrected-errors/004-infinite-loop-hooks.md`
- `src/app/(app)/calendar/hooks/use-calendar-posts.ts` (Fase 6)
- `src/app/(app)/library/hooks/use-library-data.ts` (Fase 7)

### 20. pdf-parse v2.4.5 Import Pattern

**Erro:** Multiple TypeScript errors when using pdf-parse:
```
Property 'default' does not exist on 'typeof import("pdf-parse")'
Value of type 'typeof PDFParse' is not callable
Property 'parse' does not exist on type 'PDFParse'
```

**Causa:** O pacote `pdf-parse` v2.4.5 mudou sua API. A importação antiga não funciona mais.

**Solução:** Usar named import com construtor que recebe `{ data: Uint8Array }`:
```typescript
// ❌ ERRADO - Não funciona mais
import pdf from 'pdf-parse'
const data = await pdf(buffer)

// ✅ CORRETO
const { PDFParse } = await import("pdf-parse")
const uint8Array = new Uint8Array(buffer)
const parser = new PDFParse({ data: uint8Array })
const data = await parser.getText()
return data.text || ""
```

**Contexto de Uso:** `/src/app/api/documents/upload/route.ts`

**Documentação:** `.context/docs/known-and-corrected-errors/005-pdf-parse-import.md`

---

**Erro:** Componente React faz requests POST infinitas para o servidor.

**Sintoma:**
```
POST /calendar 200 in 93ms
POST /calendar 200 in 93ms
POST /calendar 200 in 101ms
... (repeating infinitely)
```

**Causa:** Usar `useCallback` com dependências de objeto (`dateRange`, `filters`) que criam nova referência a cada render:
```typescript
// ❌ ERRADO
const fetchPosts = useCallback(async () => {
  const result = await getCalendarPostsAction(dateRange, filters)
  setPosts(result)
}, [dateRange, filters])  // Nova referência a cada render!
```

**Solução:** Usar `useRef` para comparação de estabilidade:
```typescript
// ✅ CORRETO
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])
```

**Arquivos:**
- `.context/docs/known-and-corrected-errors/004-infinite-loop-hooks.md`
- `src/app/(app)/calendar/hooks/use-calendar-posts.ts` (Fase 6)
- `src/app/(app)/library/hooks/use-library-data.ts` (Fase 7)

---

### 21. DATABASE_URL no Browser - Import de Banco em Client Component

**Erro:**
```
Runtime Error: DATABASE_URL environment variable is not set
    at module evaluation (src/db/index.ts:5:9)
```

**Contexto:** O erro ocorre no **browser**, não no servidor. Stack trace mostra:
```
rag-context-selector.tsx (client) → lib/rag/index.ts → lib/rag/assembler.ts → db/index.ts
```

**Causa:** Código que acessa banco de dados foi importado por um Client Component. No Next.js, quando um Client Component importa um módulo, todo o código é enviado ao browser - incluindo código server-side como `process.env.DATABASE_URL`.

**Solução:** Separar exports do módulo RAG:
```typescript
// lib/rag/index.ts - Apenas tipos e constantes (safe for client)
export type { RagCategory, RagContextOptions } from "./types"
export { RAG_CATEGORIES } from "./types"
// NOTA: assembleRagContext NÃO é re-exportado (usa db)

// API routes importam diretamente
import { assembleRagContext } from "@/lib/rag/assembler"
```

**Padrão:**
```
Client Component → lib/rag/index.ts (tipos/constantes) ✅
Server/API Route → lib/rag/assembler.ts (funções com db) ✅
Client Component → lib/rag/assembler.ts ❌
```

**Arquivos:**
- `.context/docs/known-and-corrected-errors/006-db-import-client-component.md`
- `src/lib/rag/index.ts`
- `src/app/api/rag/route.ts`
- `src/app/api/chat/route.ts`

---

## Padrões de Solução

### 1. Sempre validar tipos de DB
```typescript
// Campos do banco podem ser null
const value = row.nullableField ?? defaultValue;
```

### 2. Usar type assertions com cuidado
```typescript
// Evitar 'as any' quando possível
status: filters.status as "pending" | "processing" | "completed" | "failed"

// Melhor: criar tipos explícitos
type JobStatusFilter = "pending" | "processing" | "completed" | "failed" | undefined;
```

### 3. Testar migrações em branch temporário
```typescript
// Usar MCP Neon para testar antes de aplicar
await prepare_database_migration({ ... });
await describe_branch({ branchId: "temp-branch" });
await complete_database_migration({ migrationId: "..." });
```
