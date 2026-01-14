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
