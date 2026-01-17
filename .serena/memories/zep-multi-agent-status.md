# Zep Multi-Agent Implementation Status

**Branch:** `feat/database-embedding`
**Data:** 2026-01-16
**Status:** 50% completo

## Fases Concluídas ✅

### FASE 0: Preparação
- SDK `@getzep/zep-cloud` v3.15.0 instalado
- `ZEP_API_KEY` adicionada ao `.env.local` e `.env.example`

### FASE 1: Fundação Zep
Arquivos criados em `src/lib/zep/`:
- `client.ts` - Cliente singleton com retry logic
- `templates.ts` - Context templates para 4 agentes
- `ontology.ts` - Entity e Edge types
- `setup.ts` - Funções de inicialização
- `index.ts` - Exportações públicas

### FASE 2: Definições dos Agentes
Arquivos criados em `src/lib/agents/`:
- `types.ts` - AgentType, AGENTS registry, configs
- `prompts.ts` - System prompts completos
- `index.ts` - Exportações públicas

### FASE 6: Sistema de Sessões
- `src/lib/zep/session.ts` criado com:
  - `createZepSession()` - Cria thread Zep
  - `addMessageToThread()` - Adiciona mensagens
  - `getAgentContext()` - Recupera contexto do agente
  - `switchAgent()` - Registra troca de agente
  - `buildAgentSystemPrompt()` - Combina prompt + contexto

### FASE 7: Integração API Chat
- `src/app/api/chat/route.ts` modificado:
  - Novos parâmetros: `agent`, `zepThreadId`
  - System prompt específico por agente
  - Mensagens salvas no Zep (async, non-blocking)
  - Headers: `X-Agent`, `X-Zep-Configured`

## Fases Pendentes ⬜

### FASE 3: Ontologia Customizada
- Bloqueado - requer setup no dashboard Zep
- Criar conta em https://app.getzep.com
- Registrar 5 Entity Types e 4 Edge Types

### FASE 4: Context Templates
- Bloqueado - requer setup no dashboard Zep
- Criar 4 templates no dashboard

### FASE 5: Sincronização Clerk-Zep
- Criar `/api/zep/sync/route.ts` para webhook
- Implementar backfill para usuários existentes

### FASE 8: Migrar AnimatedAIChat
Componentes a criar:
- `agent-selector.tsx` - Seletor visual de agentes
- `agent-palette.tsx` - Command palette ao digitar @
- `active-agent-badge.tsx` - Badge do agente ativo

Modificações:
- `animated-ai-chat.tsx` - Detectar @ ao invés de /
- `ai-chat-sdk.tsx` - Enviar `agent` e `zepThreadId`

### FASE 9: Graph Operations
- Criar `src/lib/zep/graph.ts`
- `addLibraryItemToGraph()` - Adicionar item ao grafo
- `addScheduledPostToGraph()` - Adicionar post agendado

### FASE 10: Testing & Polish
- Testar criação de sessão Zep
- Testar troca de agente
- Testar command palette @
- Validar /comandos ainda funcionam
- Performance test (< 200ms)

## Database Schema Pendente

```sql
CREATE TABLE zep_threads (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  zep_thread_id TEXT NOT NULL UNIQUE,
  current_agent TEXT NOT NULL DEFAULT 'zory',
  agent_session_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE chats
  ADD COLUMN zep_thread_id TEXT,
  ADD COLUMN current_agent TEXT DEFAULT 'zory';
```
