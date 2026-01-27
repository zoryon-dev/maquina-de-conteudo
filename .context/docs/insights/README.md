# Insights do Projeto

Documentação de insights e padrões aprendidos durante cada fase do desenvolvimento.

## Índice de Insights

### Fase Inicial (1-2)
- **[01](./01-fase-1-2-database-auth.md)** - Database, Autenticação e Queue System

### Fase 3
- **[02](./02-fase-3-queue-system.md)** - Sistema de Fila com Upstash Redis

### Fase 4
- **[03](./03-fase-4-frontend-foundation.md)** - Fundação Frontend e Design System

### Fase 5
- **[04](./04-fase-5-settings-page.md)** - Página de Configurações
- **[05](./05-fase-5-sources-page-refactor.md)** - Refatoração da Página de Fontes

### Fase 6
- **[06](./06-fase-6-calendar.md)** - Calendário Editorial

### Fase 7
- **[07](./07-fase-7-library.md)** - Biblioteca de Conteúdo

### Fase 8
- **[008](./008-collections-rag-patterns.md)** - Sistema de Coleções e Upload de Documentos
- **[009](./009-rag-module-structure.md)** - Estrutura de Módulos RAG (Server/Client Separation)

### Vercel AI SDK Migration
- **[010](./010-vercel-ai-sdk-migration.md)** - Migração para Vercel AI SDK (useChat, streamText)

### Wizard Phase 2
- **[014](./014-wizard-phase2-synthesizer-image-gen-jan2026.md)** - Synthesizer v3.1 e Image Generation
- **[015](./015-wizard-static-html-templates-jan2026.md)** - Migração para Templates HTML Estáticos

### Discovery Feature
- **[016](./016-discovery-feature-implementation-jan2026.md)** - Trending Discovery Service ✨ NOVO

### Instagram Integration
- **[017](./017-instagram-integration-jan2026.md)** - Meta OAuth & Publishing API
- **[018](./018-social-publishing-fixes-jan2026.md)** - Async Publishing + Bug Fixes ✨ NOVO

### PR Reviews
- **[019](./019-pr-review-improvements-jan2026.md)** - Error Handling Improvements ✨ NOVO

## Tópicos Recorrentes

### Padrões React
- **Server vs Client Components**: Quando usar `"use client"`
- **useCallback e useEffect**: Como evitar infinite loops
- **State Management**: Padrão de estado "source of truth" no pai

### Padrões UI
- **Dark Mode**: Usar cores explícitas (`text-white/70`) vs tokens
- **Glassmorphism**: `backdrop-blur-xl bg-white/[0.02]`
- **Active States**: Padrão `cn(condition, active, inactive)`

### Drizzle ORM
- **Queries compostas**: Usar `and()`, `or()` para múltiplas condições
- **Joins**: `innerJoin()` para relacionamentos
- **Soft delete**: Usar `deletedAt` timestamp

### Next.js 16
- **App Router**: Route groups `(auth)`, `(app)`
- **Server Actions**: `"use server"` para mutations
- **FormData**: `request.formData()` para uploads
