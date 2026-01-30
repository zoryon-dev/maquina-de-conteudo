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
- Logging: evitar `console.log`/`console.warn`/`console.info`/`console.debug` no app; manter apenas `console.error` quando necessário (falhas/observabilidade), sem vazar tokens/segredos
- Scripts de migração devem validar `DATABASE_URL` dentro da função antes de usar `neon()` para evitar erro de tipo no build
- Seleção de tipo "Vídeo" no wizard deve redirecionar para `/wizard?type=video`
- Blocos de ações rápidas no dashboard devem ficar dentro de card com borda sutil e grid 2 colunas
- Preview de vídeo na biblioteca usa thumbnail 16:9 com ações e seções colapsáveis (SEO/hashtags/descrição/roteiro)
- Conteúdo de vídeo na biblioteca é detectado também por metadata/JSON (não só por `item.type`)
- Ações de vídeo incluem copiar/baixar roteiro e copiar SEO via dropdown de ações
- Integração Meta usa backoff para erro code 4 e busca tokens de página com `fields=access_token`
- Integração Meta aplica cache curto de páginas e fallback quando rate limit ocorre
- Geração de imagem via OpenRouter pode retornar base64 em `message.images` (Gemini), exigir parsing e conversão para data URL antes de subir para storage
- Gemini via OpenRouter pode retornar `message.images[0].image_url.url` já como `data:image/png;base64,...`
- Refactor de roteiro de vídeo usa prompt `video-script-refactor-v1.0` com checklist, anti-patterns e metadata de refactor
- Carousel v4.2: títulos máx 6 palavras, corpo ≤130 chars, caption 200-400 palavras; slides podem incluir `imagePrompt`; resposta inclui `hashtags` e `cta`
- Video script v4.4: output inclui `transformacao_prometida`, `contexto` e `duracao_segundos`; vídeos longos usam `anthropic/claude-haiku-4.5`, curtos usam `google/gemini-3-flash-preview`
- APIs que usam `ensureAuthenticatedUser()` devem usar o ID retornado (DB userId) nas queries; não usar diretamente o Clerk ID para evitar violação de foreign key em contas recriadas
- Actions/queries de temas devem sempre filtrar por `themes.userId` para evitar vazamento entre usuários
- Webhooks que criam `zepThreads` devem resolver o DB userId por email (reuse) e usar esse ID nas FK inserts
- Endpoints do wizard que usam `auth()` devem migrar para `ensureAuthenticatedUser()` para evitar 404/403 em contas recriadas

## User Defined Namespaces
- [Leave blank - user populates]