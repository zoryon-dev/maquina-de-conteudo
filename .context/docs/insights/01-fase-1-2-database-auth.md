# Fase 1-2: Database & Authentication Insights

**Data:** 2026-01-14
**Fases:** Fase 1 (Neon Database), Fase 2 (Clerk Authentication)

## Visão Geral

Implementação completa da camada de dados e autenticação usando Neon PostgreSQL com Drizzle ORM e Clerk para autenticação.

## Decisões Arquiteturais

### 1. HTTP Adapter para Neon

**Decisão:** Usar `drizzle-orm/neon-http` ao invés de connection pooling tradicional.

**Justificativa:**
- Compatível com Edge Runtime (Vercel, Cloudflare Workers)
- Sem conexões persistentes que precisam ser gerenciadas
- Ideal para serverless onde cold starts são frequentes
- Menor overhead em funções serverless

**Trade-off:**
- Slight latency increase vs conexões persistentes
- Não é adequado para transações muito longas

### 2. Soft Delete em Usuários

**Decisão:** Usar campo `deletedAt` ao invés de DELETE físico.

**Justificativa:**
- Preserva histórico de mensagens e conteúdo
- Permite recuperação de conta
- Mantém integridade referencial (mensagens não ficam órfãs)

### 3. Webhook para Sincronização Clerk

**Decisão:** Usar webhooks do Clerk ao invés de sincronização sob demanda.

**Justificativa:**
- Dados sempre atualizados
- Event-driven (mais eficiente que polling)
- Suporte para deletar/soft delete automaticamente

**Desafio Local:**
- Clerk não envia webhooks para localhost
- Solução: usar ngrok para desenvolvimento
- Alternativa: criar endpoint manual de sync para testes

### 4. Schema JSONB para Payloads Flexíveis

**Decisão:** Usar `jsonb` para payloads de jobs e conteúdo.

**Justificativa:**
- Flexibilidade para adicionar campos sem migrations
- Tipos TypeScript garantem type-safety em runtime
- Query eficiente com índices GIN quando necessário

## Lições Aprendidas

### 1. Migration com MCP Neon

O MCP Neon permite criar migrations em branch temporário, testar, e depois aplicar. Isso é **muito mais seguro** do que aplicar migrations diretamente.

```typescript
// Fluxo seguro
await prepare_database_migration({ ... });  // Branch temporário
await describe_branch({ branchId: "temp" });  // Testar
await complete_database_migration({ ... });  // Aplicar
```

### 2. Connection String do Neon

A connection string do Neon tem formatos diferentes:
- **Direto:** `postgresql://user:pass@host.region.neon.tech/db` (não recomendado para serverless)
- **Pooler:** `postgresql://user:pass@host-pooler.region.neon.tech/db` (recomendado)

O pooler é essencial para serverless pois gerencia conexões automaticamente.

### 3. Enums no PostgreSQL

PostgreSQL não suporta `IF NOT EXISTS` em `CREATE TYPE`. Para migrations idempotentes:
- Verificar se o enum existe antes de criar
- Ou usar `DO` blocks com PL/pgSQL
- Ou aceitar que a migration pode falhar se já existe

## Problemas Encontrados e Soluções

### Problema 1: Branch "main" não encontrado

**Erro:** Ao tentar descrever o branch no Neon, recebi "branch not found".

**Causa:** O projeto Neon foi criado mas o branch principal tem um ID diferente (ex: `br-sweet-rain-acrh1ez5`).

**Solução:** Usar o branch ID retornado por `list_branch_computes()` ao invés de "main".

### Problema 2: Middleware deprecated

**Aviso:** Next.js 16 mostra aviso sobre `middleware.ts` sendo deprecated.

**Status:** Apenas aviso, código funciona. Planejado renomear para `proxy.ts` no futuro.

### Problema 3: Types não sendo inferidos

**Erro:** `job.attempts` pode ser `null` mas TypeScript não sabe.

**Solução:** Sempre usar null coalescing: `job.attempts ?? 0`.

## Arquivos Criados/Modificados

### Criados:
- `drizzle.config.ts` - Config Drizzle Kit
- `src/db/index.ts` - Conexão Neon
- `src/db/schema.ts` - Schema completo (7 tabelas inicialmente)
- `src/middleware.ts` - Proteção de rotas
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/app/api/webhooks/clerk/route.ts`

### Modificados:
- `src/app/layout.tsx` - Adicionado ClerkProvider
- `package.json` - Adicionados scripts db:*
- `.env.example` / `.env.local` - Variáveis de ambiente

## Próximos Passos

1. Criar conta Upstash para Redis
2. Configurar webhook Clerk com ngrok
3. Implementar sistema de filas (Fase 3)
