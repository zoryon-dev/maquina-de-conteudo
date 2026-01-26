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

## Patterns
- Componentes client apenas quando necessário (ex.: menu usuário, navbar)
- Layouts com `max-w-6xl` e padding consistente
- Header do `AppLayout` usa padding vertical (`pt-5 pb-5`) no container glassmorphism
- Itens de lista clicáveis com checkbox: usar `div` com `role="button"` e `tabIndex` para evitar `<button>` aninhado
- Botões `outline` no dark mode precisam cores explícitas (ex.: `bg-white/5`, `text-white/80`, `border-white/20`)
- Seleção de tipo "Vídeo" no wizard deve redirecionar para `/wizard?type=video`
- Blocos de ações rápidas no dashboard devem ficar dentro de card com borda sutil e grid 2 colunas
- Preview de vídeo na biblioteca usa thumbnail 16:9 com ações e seções colapsáveis (SEO/hashtags/descrição/roteiro)
- Conteúdo de vídeo na biblioteca é detectado também por metadata/JSON (não só por `item.type`)
- Ações de vídeo incluem copiar/baixar roteiro e copiar SEO via dropdown de ações
- Geração de imagem via OpenRouter pode retornar base64 em `message.images` (Gemini), exigir parsing e conversão para data URL antes de subir para storage
- Gemini via OpenRouter pode retornar `message.images[0].image_url.url` já como `data:image/png;base64,...`

## User Defined Namespaces
- [Leave blank - user populates]