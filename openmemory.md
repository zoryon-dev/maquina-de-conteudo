# OpenMemory

## Overview
- Projeto Next.js 16 (App Router) para o estúdio "Máquina de Conteúdo"
- Stack principal: TypeScript, Tailwind CSS, Clerk, Neon (Postgres) + Drizzle, Zustand

## Architecture
- `src/app/layout.tsx` aplica `ClerkProvider`, fontes e tema global
- `src/app/(app)/layout.tsx` protege rotas com `auth()` e usa `AppLayout`
- Rotas de app em `src/app/(app)` e APIs em `src/app/api`
- Client de banco em `src/db/index.ts` com Neon serverless + Drizzle

## Components
- `src/components/app-layout.tsx`: layout principal com header e navegação
- `src/components/auth/user-menu.tsx`: menu de usuário com `UserButton`
- `src/components/ui/tubelight-navbar.tsx`: navbar animada do header
- `src/app/(app)/sources/components/documents-tab.tsx`: filtros de documentos com categorias em uma linha e ações (busca/seleção/processar/upload) em outra

## Patterns
- Componentes client apenas quando necessário (ex.: menu usuário, navbar)
- Layouts com `max-w-6xl` e padding consistente
- Header do `AppLayout` usa padding vertical (`pt-5 pb-5`) no container glassmorphism
- Elementos do overlay de dev do Next.js (ex.: `nextjs-portal`) são injetados em runtime e não vivem no código-fonte

## User Defined Namespaces
- [Leave blank - user populates]