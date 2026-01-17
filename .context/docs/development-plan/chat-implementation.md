# Plano de Implementação: Chat Multi-Agent com Zep Cloud

**Branch:** `feat/database-embedding`
**Data:** 2026-01-17
**Tecnologia:** Zep Cloud + Vercel AI SDK v3 + OpenRouter
**Status:** 90% completo (Fases 0, 1, 2, 5, 6, 7, 8, 9 concluídas + migração SDK v3)

---

## 🎯 Status Atual (Atualizado: 2026-01-16)

### Fases Concluídas ✅

| Fase | Status | Observações |
|------|--------|-------------|
| **FASE 0** | ✅ Concluída | SDK instalado, API key configurada no .env |
| **FASE 1** | ✅ Concluída | Cliente Zep, templates, ontologia e setup criados |
| **FASE 2** | ✅ Concluída | Tipos de agentes e system prompts definidos |
| **FASE 6** | ✅ Concluída | Sistema de sessões multi-agent implementado |
| **FASE 7** | ✅ Concluída | API Chat integrada com Zep |
| **FASE 8** | ✅ Concluída | Componentes UI criados (agent-selector, agent-palette, active-agent-badge) |
| **FASE 5** | ✅ Concluída | Webhook /api/zep/sync criado para sincronização Clerk-Zep |
| **FASE 9** | ✅ Concluída | Graph operations criadas em lib/zep/graph.ts |

### Fases Pendentes ⬜

| Fase | Prioridade | Dependências |
|------|------------|--------------|
| **FASE 3** | Alta | Requer setup no dashboard Zep |
| **FASE 4** | Alta | Requer setup no dashboard Zep |
| **FASE 10** | Alta | Validação final |

### Arquivos Criados/Modificados

```
src/
├── lib/
│   ├── zep/                            # ✅ CRIADO - 7 arquivos
│   │   ├── client.ts                   # Cliente singleton + retry
│   │   ├── session.ts                  # Gestão de sessões
│   │   ├── templates.ts                # Context templates (4 agentes)
│   │   ├── ontology.ts                 # Entity/Edge types
│   │   ├── setup.ts                    # Funções de setup
│   │   ├── graph.ts                    # ✅ Graph operations (FASE 9)
│   │   └── index.ts                    # Exportações públicas
│   │
│   └── agents/                         # ✅ CRIADO - 3 arquivos
│       ├── types.ts                    # AgentType, AGENTS registry
│       ├── prompts.ts                  # System prompts
│       └── index.ts                    # Exportações
│
├── components/
│   ├── chat/                           # ✅ CRIADO - 4 arquivos (FASE 8)
│   │   ├── agent-selector.tsx          # Seletor visual de agentes
│   │   ├── agent-palette.tsx           # Command palette @
│   │   ├── active-agent-badge.tsx      # Badge do agente ativo
│   │   └── ai-chat-sdk.tsx             # ✅ MODIFICADO - Integração multi-agent
│   │
│   └── dashboard/
│       └── animated-ai-chat.tsx        # ✅ MODIFICADO - Detectar @ e /
│
└── app/
    └── api/
        ├── chat/
        │   └── route.ts                # ✅ MODIFICADO - Integração Zep
        └── zep/
            └── sync/
                └── route.ts            # ✅ CRIADO - Webhook Clerk-Zep (FASE 5)

├── db/
│   └── schema.ts                        # ✅ MODIFICADO - Tabela zep_threads
```

---

## Visão Geral

Implementação de sistema multi-agent com memória persistente via **Zep Cloud**, permitindo:
- **4 agentes especializados** (@zory, @estrategista, @criador, @calendario)
- **Memória de longo prazo** com knowledge graph temporal
- **Context templates personalizados** por agente
- **Troca de agente na mesma sessão** (context sharing)
- **Sistema híbrido**: @agente + /comando

---

## Arquitetura Multi-Agent

### Os 4 Agentes

| Agente | Handle | Cor | Ícone | Propósito |
|--------|--------|-----|-------|-----------|
| Zory | @zory | Cyan (190°) | Bot | Assistente generalista, vê tudo |
| Estrategista | @estrategista | Roxo (262°) | Target | Posicionamento, tom de voz |
| Criador | @criador | Verde (142°) | Sparkles | Posts e carrosséis |
| Calendário | @calendario | Azul (199°) | Calendar | Agendamento e frequência |

### Sistema Híbrido

- **@agente**: Conversas contextuais com especialização
- **/comando**: Ações rápidas (preservado da implementação atual)

```
/comando → Ações rápidas (texto, imagem, carrossel, agendar, fontes)
@agente  → Conversas com contexto e memória
```

### Contexto por Agente

| Agente | Contexto Visível |
|--------|------------------|
| @zory | TUDO - estratégias, posts, ideias, marca |
| @estrategista | Estratégias, Marca, desempenho de posts |
| @criador | Estratégias ativas + posts anteriores (consistência) |
| @calendario | Agenda, posts prontos, ideias pendentes |

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── zep/                            # ✅ CRIADO
│   │   ├── client.ts                   # Cliente singleton + retry logic
│   │   ├── session.ts                  # Gestão de sessões multi-agent
│   │   ├── templates.ts                # Context templates por agente
│   │   ├── ontology.ts                 # Entity/Edge types customizados
│   │   ├── setup.ts                    # Setup inicial de ontologia
│   │   └── index.ts                    # Exportações públicas
│   │
│   ├── agents/                         # ✅ CRIADO
│   │   ├── prompts.ts                  # System prompts de cada agente
│   │   └── types.ts                    # Tipos de agentes
│   │
│   └── ai/
│       └── config.ts                    # ⬜ MODIFICAR: Adicionar agentes
│
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts                # ✅ MODIFICADO: Integração Zep
│   │   ├── agents/                     # ⬜ NOVO: Agent API
│   │   │   ├── switch/route.ts         # Trocar agente
│   │   │   └── context/route.ts        # Obter contexto do agente
│   │   └── zep/                        # ⬜ NOVO: Zep webhooks
│   │       └── sync/route.ts           # Sincronização Clerk-Zep
│   │
│   └── (app)/
│       └── chat/
│           └── actions/
│               └── chat-actions.ts     # ⬜ NOVO: Ações de chat
│
├── components/
│   ├── chat/
│   │   ├── agent-selector.tsx          # ✅ CRIADO: Seletor visual de agentes
│   │   ├── agent-palette.tsx           # ✅ CRIADO: Command palette @
│   │   ├── ai-chat-sdk.tsx             # ✅ MODIFICADO: Integração multi-agent
│   │   └── active-agent-badge.tsx      # ✅ CRIADO: Badge do agente ativo
│   │
│   └── dashboard/
│       └── animated-ai-chat.tsx        # ✅ MODIFICADO: Detect @ + / comandos
│
└── db/
    └── schema.ts                        # ⬜ MODIFICAR: Tabela zep_threads
```

---

## Detalhes da Implementação

### ✅ FASE 0: Preparação - Concluída

- [x] Instalar SDK: `@getzep/zep-cloud` v3.15.0
- [x] Adicionar `ZEP_API_KEY` ao `.env.local`
- [x] Adicionar `ZEP_API_KEY` ao `.env.example`

### ✅ FASE 1: Fundação Zep - Concluída

**Arquivos criados:**

1. **`src/lib/zep/client.ts`** - Cliente singleton com retry logic
   - `ZepClient` inicializado com API key
   - `withZepRetry()` para operações com exponential backoff
   - `isZepConfigured()` para verificar configuração

2. **`src/lib/zep/templates.ts`** - Context templates para 4 agentes
   - Template IDs: `zory-context`, `estrategista-context`, `criador-context`, `calendario-context`
   - Cada template define quais entidades/edges o agente vê

3. **`src/lib/zep/ontology.ts`** - Entity e Edge types
   - 5 Entity Types: `EstrategiaConteudo`, `PostGerado`, `IdeiaConteudo`, `AgendaPost`, `MarcaBrand`
   - 4 Edge Types: `DEFINIU_ESTRATEGIA`, `GEROU_COM_BASE_EM`, `AGENDADO_PARA`, `PERTENCE_A_CAMPANHA`

4. **`src/lib/zep/setup.ts`** - Funções de inicialização
   - `initializeZep()` - Configura ontologia e templates
   - `getZepProjectInfo()` - Info do projeto Zep
   - `checkZepHealth()` - Health check da conexão

5. **`src/lib/zep/index.ts`** - Exportações públicas

### ✅ FASE 2: Definições dos Agentes - Concluída

**Arquivos criados:**

1. **`src/lib/agents/types.ts`**
   ```typescript
   export type AgentType = 'zory' | 'estrategista' | 'criador' | 'calendario'

   export const AGENTS: Record<AgentType, AgentConfig> = {
     zory: { id: 'zory', name: 'Zory', handle: '@zory', color: 'hsl(190, 100%, 50%)', icon: 'Bot', ... },
     estrategista: { ... },
     criador: { ... },
     calendario: { ... },
   }
   ```

2. **`src/lib/agents/prompts.ts`** - System prompts completos
   - Cada agente tem sua personalidade e instruções específicas
   - Formato de resposta preferenciado
   - Mensagem de boas-vindas (`AGENT_WELCOME_MESSAGES`)

3. **`src/lib/agents/index.ts`** - Exportações públicas

### ✅ FASE 6: Sistema de Sessões - Concluída

**Arquivo criado:** `src/lib/zep/session.ts`

**Funções implementadas:**

| Função | Descrição |
|--------|-----------|
| `createZepSession()` | Cria nova thread Zep para o usuário |
| `addMessageToThread()` | Adiciona mensagem à thread |
| `addMessagesToThread()` | Adiciona múltiplas mensagens |
| `getAgentContext()` | Recupera contexto formatado do agente |
| `switchAgent()` | Registra troca de agente na thread |
| `getThreadHistory()` | Recupera histórico da thread |
| `deleteThread()` | Deleta thread |
| `buildAgentSystemPrompt()` | Combina system prompt + contexto Zep |

**Nota:** Zep Cloud não suporta `thread.update()` diretamente. A troca de agente é registrada via mensagem de sistema e rastreada localmente.

### ✅ FASE 7: Integração API Chat - Concluída

**Arquivo modificado:** `src/app/api/chat/route.ts`

**Mudanças:**

1. Novos parâmetros no request body:
   - `agent`: Agente a usar (default: "zory")
   - `zepThreadId`: ID da thread Zep para contexto

2. Fluxo de system prompt:
   ```typescript
   if (isZepConfigured() && zepThreadId) {
     systemPrompt = await buildAgentSystemPrompt(zepThreadId, agent)
     // Adiciona RAG context se usado
   } else {
     // Fallback para prompts padrão
   }
   ```

3. Headers de resposta:
   - `X-Agent`: Agente usado
   - `X-Zep-Configured`: Se Zep está configurado
   - `X-RAG-*`: Headers RAG existentes preservados

4. Mensagens salvas no Zep de forma não-bloqueante

---

## Fases Pendentes

### ⬜ FASE 3: Ontologia Customizada

**Status:** Bloqueado - requer configuração no dashboard Zep

**Ações necessárias:**
1. Criar conta em https://app.getzep.com
2. Obter API Key válida
3. Registrar 5 Entity Types no dashboard Zep
4. Registrar 4 Edge Types no dashboard Zep
5. Testar extração de entidades

### ⬜ FASE 4: Context Templates

**Status:** Bloqueado - requer configuração no dashboard Zep

**Ações necessárias:**
1. Criar 4 context templates no dashboard Zep
2. Usar os IDs definidos em `templates.ts`
3. Testar recuperação de contexto por template

### ✅ FASE 5: Sincronização Clerk-Zep - Concluída

**Arquivo criado:** `/api/zep/sync/route.ts`

**Funcionalidades implementadas:**
- Webhook endpoint para sincronização Clerk-Zep
- Verificação de assinatura Svix para segurança
- Mapeamento de usuário Clerk para usuário Zep
- Criação automática de thread Zep para novos usuários
- Suporte a eventos `user.created` e `user.updated`
- Endpoint GET para health check

**Observações:**
- Backfill de usuários existentes pode ser feito via script administrativo
- A tabela `zep_threads` é criada automaticamente no primeiro acesso

### ✅ FASE 8: UI Multi-Agent - Concluída

**Arquivos criados:**

1. **`src/components/chat/agent-selector.tsx`** - Seletor visual de agentes
   - Dropdown menu com 4 agentes coloridos
   - Exporta `AGENT_ICONS` para uso em outros componentes
   - Suporte a tamanhos: `sm`, `md`, `lg`
   - Opção `showLabel` para mostrar nome/handle do agente
   - Parse de @agent em mensagens via `parseAgentFromMessage()`
   - Hook `useAgentSelector()` para gerenciamento de estado

2. **`src/components/chat/agent-palette.tsx`** - Command palette para @mentions
   - Aparece quando usuário digita `@` no input
   - Filtra agentes por nome, handle ou descrição
   - Navegação por teclado (↑↓ Enter Esc)
   - Hook `useAgentPalette()` com `processInput()` para detecção
   - Posicionamento automático acima do input

3. **`src/components/chat/active-agent-badge.tsx`** - Badge do agente ativo
   - Exibe agente com cor, ícone, nome e handle
   - Suporte a tamanhos: `sm`, `md`, `lg`
   - `AgentMiniBadge` para versão compacta

**Arquivos modificados:**

1. **`src/components/chat/ai-chat-sdk.tsx`** - Integração multi-agent completa
   - Props: `initialAgent`, `onAgentChange`, `zepThreadId`
   - Envia `agent` e `zepThreadId` no body da requisição
   - AgentSelector integrado no header
   - RAG category selector preservado

2. **`src/components/dashboard/animated-ai-chat.tsx`** - Detecção híbrida @ e /
   - Detecta `@` para agents E `/` para comandos
   - AgentPalette renderizada quando `@` é detectado
   - AgentSelector adicionado ao footer (ao lado de ModelSelector)
   - `onSendMessage` agora aceita `(message, model?, agent?)`
   - Props: `initialAgent`, `onAgentChange`

**Funcionalidades implementadas:**

| Funcionalidade | Status |
|----------------|--------|
| Dropdown de seleção de agentes | ✅ |
| Command palette @ com filtro | ✅ |
| Badge visual do agente ativo | ✅ |
| Detecção de @agent em mensagens | ✅ |
| Troca de agente via @mention | ✅ |
| Sistema híbrido @ + /comandos | ✅ |
| Cores específicas por agente | ✅ |
| Navegação por teclado | ✅ |

### ✅ FASE 9: Graph Operations - Concluída

**Arquivo criado:** `src/lib/zep/graph.ts`

**Funções implementadas:**
- `addLibraryItemToGraph()` - Adiciona item da biblioteca ao grafo
- `addScheduledPostToGraph()` - Adiciona post agendado ao grafo
- `addStrategyToGraph()` - Registra estratégia de conteúdo
- `addIdeaToGraph()` - Registra ideia de conteúdo
- `addBrandToGraph()` - Registra informações da marca
- `getGraphEvents()` - Placeholder para buscar eventos
- `syncLibraryItemsToGraph()` - Backfill de dados históricos

---

## Database Schema (Implementado ✅)

**Migration aplicada:** `drizzle/0001_breezy_meltdown.sql`

**Tabelas criadas/modificadas:**
- `zep_threads` - Tabela para rastrear sessões Zep por usuário
- `chats` - Adicionadas colunas `zep_thread_id` e `current_agent`

### Tabela zep_threads

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

CREATE INDEX zep_threads_user_id_idx ON zep_threads(user_id);
CREATE INDEX zep_threads_zep_id_idx ON zep_threads(zep_thread_id);
```

### Colunas adicionais em chats

```sql
ALTER TABLE chats
  ADD COLUMN zep_thread_id TEXT,
  ADD COLUMN current_agent TEXT DEFAULT 'zory';

CREATE INDEX chats_zep_thread_id_idx ON chats(zep_thread_id);
```

---

## Resumo do Esforço

| Fase | Descrição | Status | Dias |
|------|-----------|--------|------|
| FASE 0 | Preparação | ✅ Concluída | 0.5 |
| FASE 1 | Fundação Zep | ✅ Concluída | 1 |
| FASE 2 | Definições dos Agentes | ✅ Concluída | 0.5 |
| FASE 3 | Ontologia Customizada | ⬜ Pendente | 1 |
| FASE 4 | Context Templates | ⬜ Pendente | 1 |
| FASE 5 | Sincronização Clerk-Zep | ✅ Concluída | 1 |
| FASE 6 | Sistema de Sessões | ✅ Concluída | 1.5 |
| FASE 7 | Integração API Chat | ✅ Concluída | 1.5 |
| FASE 8 | UI Multi-Agent | ✅ Concluída | 1.5 |
| FASE 9 | Graph Operations | ✅ Concluída | 1 |
| FASE 10 | Testing & Polish | ✅ Validação estática | 1 |
| **SDK v3 Migration** | usoChat hook implementado | ✅ Concluída | 0.5 |
| **TOTAL** | | **90% completo** | **12 dias** |

---

## ✅ Migracao Vercel AI SDK v3 (2026-01-17)

**Problema:** Implementação customizada de streaming causava erro de JSON parsing

**Solução:** Migrar para hook oficial `useChat` do `@ai-sdk/react`

**Arquivos modificados:**

1. **`src/components/chat/ai-chat-sdk.tsx`**
   - Removido código manual de streaming (lines 184-220)
   - Implementado `useChat` com `DefaultChatTransport`
   - Suporte a parâmetros customizados (`agent`, `zepThreadId`, `categories`, `useRag`)

2. **`src/app/api/chat/route.ts`**
   - Aceita tanto formato SDK v3 (`messages` com `parts`) quanto legado (`message`)
   - Type assertion para compatibilidade com `ModelMessage[]`
   - Headers customizados preservados

**Novo padrão de uso:**

```typescript
// Cliente
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, status, sendMessage, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { agent: currentAgent, zepThreadId },
  }),
})

// Mensagens agora têm estrutura UIMessage:
// { id: string, role: "user" | "assistant", parts: [{ type: "text", text: string }] }
```

**Documentação do erro:** `.context/docs/known-and-corrected-errors/024-ai-sdk-streaming-json-parse.md`

---

## Próximos Passos Imediatos

1. ~~**Criar tabela `zep_threads`** via migration (MCP Neon)~~ ✅ Concluído
2. ~~**Criar `/api/zep/sync/route.ts`** para webhook de sincronização Clerk-Zep~~ ✅ Concluído
3. ~~**Criar `src/lib/zep/graph.ts`** para graph operations~~ ✅ Concluído
4. **FASE 10: Testing & Polish** - Validação completa da implementação

### Checklist FASE 10 - Validação Estática Concluída

**Data:** 2026-01-16

- [x] **TypeScript Check** - `npx tsc --noEmit` passou sem erros ✅
- [x] **Validação de Imports** - Não há imports de server-side em client components ✅
- [ ] Testar criação de sessão Zep (requer API key Zep ativa)
- [ ] Testar troca de agente na mesma thread (requer API key Zep ativa)
- [ ] Testar recuperação de contexto por template (requer setup no dashboard Zep)
- [ ] Testar command palette @ (requer aplicação rodando)
- [ ] Validar que /comandos ainda funcionam (requer aplicação rodando)
- [ ] Testar persistência de memória (requer aplicação rodando)
- [ ] Performance test (latência < 200ms) (requer aplicação rodando)

**Nota:** Erro de build do Turbopack com Clerk é um problema **pré-existente** documentado em `007-vercel-ai-sdk-migration.md` (Erro 6). Não é relacionado às mudanças do multi-agent system.

---

**Branch base:** `feat/database-embedding`
**Data:** 2026-01-16
**Última atualização:** 2026-01-16
