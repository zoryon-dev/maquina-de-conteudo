# Project Structure

Estrutura completa do projeto Máquina de Conteúdo.

## Árvore de Diretórios

```
maquina-de-conteudo/
├── .context/                  # Contexto para agentes IA
│   ├── agents/               # Agentes especialistas
│   │   ├── nextjs-specialist.md
│   │   ├── neon-database-specialist.md
│   │   ├── clerk-auth-specialist.md
│   │   └── ...
│   └── docs/                 # Documentação do projeto
│       ├── architecture.md
│       ├── development-workflow.md
│       └── ...
│
├── .claude/                  # Skills do Claude Code
│   └── skills/              # Skills reutilizáveis
│       ├── tailwind-patterns.md
│       └── component-patterns.md
│
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   ├── globals.css      # CSS global + design tokens
│   │   └── styleguide/      # Página de styleguide
│   │
│   ├── components/          # Componentes React
│   │   ├── ui/              # Componentes UI base (shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── tubelight-navbar.tsx
│   │   │   └── ...          # +30 componentes UI
│   │   └── typography.tsx   # Componentes de tipografia
│   │
│   ├── hooks/               # React hooks customizados
│   │   └── use-mobile.ts    # Hook de breakpoint móvel
│   │
│   ├── lib/                 # Utilitários
│   │   └── utils.ts         # cn() + helpers
│   │
│   ├── db/                  # Database (Drizzle)
│   │   ├── schema.ts        # Schema das tabelas
│   │   └── index.ts         # Conexão com DB
│   │
│   └── stores/              # Zustand stores
│       └── *.ts             # State management
│
├── drizzle/                 # Migrations Drizzle
│   └── *.sql               # Arquivos de migração
│
├── public/                  # Arquivos estáticos
├── .env.local              # Variáveis de ambiente (local)
├── .env.example            # Exemplo de env vars
├── components.json          # Config shadcn/ui
├── next.config.ts          # Config Next.js
├── tailwind.config.ts      # Config Tailwind
├── tsconfig.json           # Config TypeScript
└── package.json            # Dependências e scripts
```

## Convenções de Arquivos

### Nomenclatura
- **Componentes**: `PascalCase.tsx` (ex: `Button.tsx`, `UserProfile.tsx`)
- **Utilitários**: `kebab-case.ts` (ex: `format-date.ts`, `api-client.ts`)
- **Hooks**: `usePascalCase.ts` (ex: `useMobile.ts`, `useAuth.ts`)
- **Types**: `PascalCase.ts` (ex: `UserTypes.ts`, `ApiTypes.ts`)

### Server vs Client Components
- **Padrão**: Server Components (sem "use client")
- **Client Components**: Adicionar `"use client"` no topo quando necessário
  - Interações (onClick, onChange)
  - Hooks (useState, useEffect)
  - Browser APIs
  - Context providers

### Estrutura de Rota (App Router)
```
app/
├── layout.tsx              # Layout compartilhado
├── page.tsx                # / (home)
├── about/
│   └── page.tsx            # /about
├── dashboard/
│   ├── layout.tsx          # Layout específico do dashboard
│   ├── page.tsx            # /dashboard
│   └── settings/
│       └── page.tsx        # /dashboard/settings
└── api/                    # API Routes
    └── users/
        └── route.ts        # /api/users
```

## Scripts NPM

```json
{
  "dev": "next dev",           # Servidor desenvolvimento
  "build": "next build",       # Build de produção
  "start": "next start",       # Servidor produção
  "lint": "eslint"             # Linter
}
```

## Scripts de Database (Drizzle)

Adicionar ao package.json:
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate", 
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```
