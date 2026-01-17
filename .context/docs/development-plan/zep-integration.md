# Integração Zep - Máquina de Conteúdo

**Autor:** Claude Code
**Data:** 16 de Janeiro de 2026
**Versão:** 1.0.0

---

## 1. Visão Geral

### O que é Zep

Zep é uma plataforma de *context engineering* para aplicações de IA que fornece memória de longo prazo, construção de contexto personalizado e knowledge graphs temporais. Ele permite que agentes de IA lembrem de conversas passadas, preferências de usuários e dados de negócios, entregando o contexto certo no momento certo.

### Por que escolhemos Zep vs implementação customizada

| Aspecto | Implementação Customizada | Zep Cloud |
|---------|---------------------------|------------|
| **Tempo de implementação** | Meses | Dias |
| **Manutenção** | Complexa | Zero (SaaS) |
| **Knowledge Graph** | Do zero | Pronto (Graphiti) |
| **Context Templates** | Customizar | Built-in |
| **Fact Invalidation** | Manual | Automático (temporal) |
| **Escalabilidade** | Preocupação constante | Infraestrutura Zep |
| **Latência P95** | Variável | < 200ms |

### Benefícios Principais

1. **Memória de Longo Prazo**: Histórico completo de conversas por usuário
2. **Knowledge Graph Temporal**: Fatos com validade (data início/fim)
3. **Context Templates Personalizados**: Formatação de contexto por agente
4. **Fact Invalidation Automática**: Quando um fato muda, o anterior é invalidado
5. **Ontologia Customizada**: Entity Types e Edge Types específicos para domínio de conteúdo
6. **Multi-Agent Session**: Mesma thread com diferentes agentes (estrategista, criador, calendario)

---

## 2. Conceitos do Zep

### Users, Threads, Messages

```typescript
// User - Representa um usuário da aplicação
interface ZepUser {
  user_id: string        // ID interno (usar Clerk user ID)
  email?: string
  first_name?: string
  last_name?: string
  metadata?: Record<string, unknown>
}

// Thread - Uma conversa/sessão
interface ZepThread {
  thread_id: string      // UUID gerado pela app
  user_id: string        // ID do usuário Zep
  created_at: Date
  updated_at: Date
  metadata?: {
    agent?: string       // Agente ativo (zory, estrategista, etc.)
    agent_session_id?: string // ID da sessão multi-agent
  }
}

// Message - Uma mensagem dentro de uma thread
interface ZepMessage {
  role: "user" | "assistant" | "system"
  content: string
  name?: string          // Nome do usuário ou "AI Assistant"
  metadata?: {
    model?: string       // Modelo usado (OpenRouter)
    agent?: string       // Agente que gerou
    tokens?: number
  }
}
```

### Knowledge Graph (Entities + Edges)

O Knowledge Graph do Zep é composto por:

- **Entities (Nós)**: Representam pessoas, lugares, objetos, conceitos
- **Edges (Arestas)**: Representam fatos e relações entre entidades
- **Temporalidade**: Cada fato tem `created_at` e opcional `invalidated_at`

```
[User: Jane] --(DEFINIU_ESTRATEGIA)--> [EstrategiaConteudo: "Luxo Sustentável"]
     |
     +--(GEROU_COM_BASE_EM)--> [PostGerado: "Lançamento Coleção Verão"]
                                  |
                                  +--(AGENDADO_PARA)--> [AgendaPost: "15/01/2026"]
```

### Context Templates

Templates permitem customizar como o contexto é formatado:

```typescript
// Variáveis disponíveis nos templates
%{user_summary}    // Resumo do perfil do usuário
%{edges}           // Fatos/relacionamentos (com limit, types)
%{entities}        // Entidades (com limit, types)
%{episodes}        // Episódios de conversação
```

### Temporal Nature (Data Ranges em Fatos)

Cada fato no knowledge graph tem validade temporal:

```
- User prefere pop music (2024-01-01 - 2024-06-15)  // Inválido
- User prefere rock music (2024-06-15 - present)    // Válido
```

Isso permite que o Zep automaticamente invalide fatos antigos quando novos dados contradizem.

---

## 3. Ontology Customizada (Domínio: Conteúdo)

### Visão Geral

A ontologia customizada define tipos específicos de entidades e relações para o domínio de **criação de conteúdo para redes sociais**.

### Entity Types

#### EstrategiaConteudo

```typescript
class EstrategiaConteudo extends EntityModel {
  /**
   * Estratégia de conteúdo definida pelo usuário
   * Representa o posicionamento global de conteúdo
   */
  temaPrincipal: EntityText = Field(
    description="O tema central da estratégia (ex: 'Luxo Sustentável', 'Tech B2B')"
  )
  tomDeVoz: EntityText = Field(
    description="Tom de voz predominante (ex: 'Profissional', 'Casual', 'Humorístico')"
  )
  publicoAlvo: EntityText = Field(
    description="Descrição do público-alvo (ex: 'Mulheres 25-40, classe A-B')"
  )
  plataformas: EntityText = Field(
    description="Plataformas de atuação (ex: 'Instagram, LinkedIn, TikTok')"
  )
  validadeInicio: EntityText = Field(
    description="Data de início da validade desta estratégia (ISO 8601)"
  )
  validadeFim: EntityText = Field(
    description="Data de fim da validade (ou 'present' se ainda válida)"
  )
}
```

#### PostGerado

```typescript
class PostGerado extends EntityModel {
  /**
   * Post criado pelo sistema
   * Representa conteúdo individual gerado
   */
  tipo: EntityText = Field(
    description="Tipo do post (text, image, carousel, video, story)"
  )
  plataforma: EntityText = Field(
    description="Plataforma do post (instagram, twitter, linkedin, tiktok)"
  )
  topico: EntityText = Field(
    description="Tópico abordado no post"
  )
  status: EntityText = Field(
    description="Status atual (draft, scheduled, published, archived)"
  )
  libraryItemId: EntityText = Field(
    description="ID do item na biblioteca interna"
  )
}
```

#### IdeiaConteudo

```typescript
class IdeiaConteudo extends EntityModel {
  /**
   * Ideia de conteúdo ainda não realizada
   * Capturada durante conversas com o agente
   */
  descricao: EntityText = Field(
    description="Descrição da ideia de conteúdo"
  )
  categoria: EntityText = Field(
    description="Categoria (ex: 'tutorial', 'inspiração', 'promocional')"
  )
  prioridade: EntityText = Field(
    description="Nível de prioridade (alta, media, baixa)"
  )
}
```

#### AgendaPost

```typescript
class AgendaPost extends EntityModel {
  /**
   * Entrada no calendário editorial
   * Representa um agendamento
   */
  dataAgendada: EntityText = Field(
    description="Data de agendamento (ISO 8601)"
  )
  horaSugerida: EntityText = Field(
    description="Horário sugerido para publicação"
  )
  tipo: EntityText = Field(
    description="Tipo de conteúdo agendado"
  )
}
```

#### MarcaBrand

```typescript
class MarcaBrand extends EntityModel {
  /**
   * Marca ou business do usuário
   * Representa a identidade da marca
   */
  nome: EntityText = Field(
    description="Nome da marca ou negócio"
  )
  segmento: EntityText = Field(
    description="Segmento de atuação (ex: 'Moda', 'SaaS B2B', 'Food Service')"
  )
  valores: EntityText = Field(
    description="Valores da marca (ex: 'Sustentabilidade, Inovação, Qualidade')"
  )
}
```

### Edge Types

#### DEFINIU_ESTRATEGIA

```typescript
class DefiniuEstrategia extends EdgeModel {
  /**
   * Usuário definiu uma estratégia de conteúdo
   * Conecta: User → EstrategiaConteudo
   */
  dataDefinicao: EntityText = Field(
    description="Timestamp quando a estratégia foi definida"
  )
  contexto: EntityText = Field(
    description="Contexto adicional sobre a definição"
  )
}
```

#### GEROU_COM_BASE_EM

```typescript
class GerouComBaseEm extends EdgeModel {
  /**
   * Post foi gerado com base em estratégia específica
   * Conecta: PostGerado → EstrategiaConteudo
   */
  dataGeracao: EntityText = Field(
    description="Timestamp de geração"
  )
  agente: EntityText = Field(
    description="Agente que gerou (criador, estrategista)"
  )
}
```

#### AGENDADO_PARA

```typescript
class AgendadoPara extends EdgeModel {
  /**
   * Post foi agendado para uma data específica
   * Conecta: PostGerado → AgendaPost
   */
  dataAgendamento: EntityText = Field(
    description="Quando o agendamento foi feito"
  )
  plataforma: EntityText = Field(
    description="Plataforma de publicação"
  )
}
```

#### PERTENCE_A_CAMPANHA

```typescript
class PertenceACampanha extends EdgeModel {
  /**
   * Post ou ideia pertence a uma campanha/estratégia
   * Conecta: PostGerado | IdeiaConteudo → EstrategiaConteudo
   */
  papel: EntityText = Field(
    description="Papel na campanha (ex: 'awareness', 'conversão', 'engajamento')"
  )
}
```

### Diagrama da Ontologia

```
┌─────────────┐
│  Zep User   │
│ (Clerk ID)  │
└──────┬──────┘
       │
       ├─[DEFINIU_ESTRATEGIA]─→ ┌────────────────────┐
       │                          │  EstrategiaConteudo │
       │                          │  - temaPrincipal   │
       │                          │  - tomDeVoz        │
       │                          │  - publicoAlvo    │
       └─[POSSUI]─→ ┌─────────────┴─────────────────┐
                     │  MarcaBrand                  │
                     │  - nome                      │
                     │  - segmento                  │
                     └──────────────────────────────┘

       ├─[GEROU]─→ ┌──────────────┐
       │            │  PostGerado  │
       │            │  - tipo      │
       │            │  - plataforma│
       │            │  - status    │
       │            └───────┬──────┘
       │                    │
       │                    ├─[COM_BASE_EM]─→ ┌────────────────┐
       │                    │                  │EstrategiaConteudo│
       │                    └─[AGENDADO_PARA]→ ┌──────────────┐
       │                                      │  AgendaPost  │
       │                                      │  - data      │
       │                                      └──────────────┘

       └─[TEM_IDEIA]─→ ┌──────────────┐
                       │ IdeiaConteudo│
                       │ - descricao  │
                       │ - categoria  │
                       └──────────────┘
```

---

## 4. Context Templates por Agente

Cada agente tem um template específico que formata o contexto de acordo com suas necessidades.

### Template: @zory (Assistente Generalista)

```typescript
const ZORY_TEMPLATE = `
# CONTEXTO DO USUÁRIO
%{user_summary}

# MARCA E NEGÓCIO
%{entities types=[MarcaBrand] limit=3}

# ESTRATÉGIAS DEFINIDAS
%{edges types=[DEFINIU_ESTRATEGIA] limit=5}

# CONTEÚDOS RECENTES
%{entities types=[PostGerado] limit=5}

# IDEIAS PENDENTES
%{entities types=[IdeiaConteudo] limit=5}
`;
```

### Template: @estrategista (Análise de Tendências)

```typescript
const ESTRATEGISTA_TEMPLATE = `
# PERFIL ESTRATÉGICO
%{user_summary}

# MARCA - SEGMENTO E VALORES
%{entities types=[MarcaBrand] limit=3 include_attributes=true}

# ESTRATÉGIAS DE CONTEÚDO VIGENTES
%{edges types=[DEFINIU_ESTRATEGIA] limit=10 include_attributes=true}

# HISTÓRICO DE POSTS POR PLATAFORMA
%{entities types=[PostGerado] limit=10 include_attributes=true}

# AGENDAMENTOS FUTUROS
%{edges types=[AGENDADO_PARA] limit=10}

# PREFERÊNCIAS DE CONTEÚDO
%{edges types=[PERTENCE_A_CAMPANHA] limit=5}
`;
```

### Template: @criador (Gerador de Conteúdo)

```typescript
const CRIADOR_TEMPLATE = `
# PERFIL CRIATIVO
%{user_summary}

# VOZ DA MARCA
%{entities types=[MarcaBrand, EstrategiaConteudo] limit=5 include_attributes=true}

# TOM E ESTILO PREFERIDO
%{edges types=[DEFINIU_ESTRATEGIA] limit=3 include_attributes=true}

# CONTEÚDOS SIMILARES (REFERÊNCIA)
%{entities types=[PostGerado] limit=5 include_attributes=true}

# IDEIAS PARA DESENVOLVER
%{entities types=[IdeiaConteudo] limit=5 include_attributes=true}

# PLATAFORMAS E FORMATOS
%{edges types=[GEROU_COM_BASE_EM] limit=10}
`;
```

### Template: @calendario (Agendamento)

```typescript
const CALENDARIO_TEMPLATE = `
# PERFIL DE CALENDÁRIO
%{user_summary}

# AGENDA ATUAL E FUTURA
%{entities types=[AgendaPost] limit=20 include_attributes=true}

# POSTS AGENDADOS
%{edges types=[AGENDADO_PARA] limit=15 include_attributes=true}

# CONTEÚDOS PARA AGENDAR
%{entities types=[PostGerado] limit=10 include_attributes=true}
  Filter: status = draft

# ESTRATÉGIAS TEMPORAIS
%{edges types=[PERTENCE_A_CAMPANHA] limit=10}

# FREQUÊNCIA POR PLATAFORMA
%{entities types=[PostGerado] limit=20 include_attributes=true}
`;
```

### Exemplo de Saída Formatada

Quando `@criador` solicita contexto, o Zep retorna:

```
# PERFIL CRIATIVO
João Silva é criador de conteúdo focado em marketing digital para pequenos negócios.
Prefere tom profissional mas acessível, focado em educação e dicas práticas.

# VOZ DA MARCA
- { name: "MarketingTips", types: [MarcaBrand],
   attributes: { segmento: "Educação B2B", valores: "Praticidade, Autoridade, Empatia" } }
- { name: "Estratégia Q1 2026", types: [EstrategiaConteudo],
   attributes: { temaPrincipal: "Dicas de Marketing Local", tomDeVoz: "Amigável e expert" } }

# TOM E ESTILO PREFERIDO
- (2025-12-01 - present) [DEFINIU_ESTRATEGIA] João definiu estratégia "Dicas Rápidas"
  { dataDefinicao: "2025-12-01T10:00:00Z", contexto: "Foco em vídeos curtos" }

# CONTEÚDOS SIMILARES (REFERÊNCIA)
- { name: "Post 5 Dicas Instagram", types: [PostGerado],
   attributes: { tipo: "carousel", plataforma: "instagram", status: "published" } }
- { name: "Post SEO para Locais", types: [PostGerado],
   attributes: { tipo: "text", plataforma: "linkedin", status: "published" } }

# IDEIAS PARA DESENVOLVER
- { name: "Série sobre Google Business", types: [IdeiaConteudo],
   attributes: { categoria: "tutorial", prioridade: "alta" } }

# PLATAFORMAS E FORMATOS
- (2025-01-10 - present) [GEROU_COM_BASE_EM] "Post 5 Dicas" baseado em "Estratégia Q1"
  { dataGeracao: "2025-01-10", agente: "criador" }
```

---

## 5. Fluxo Multi-Agent

### Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                     │
│              "Quero posts sobre lançamento de verão"                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       @zory (Router)                                │
│  Analisa intenção → roteia para @estrategista                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     @estrategista                                   │
│  Recupera contexto da marca, define estratégia                      │
│  → Cria [EstrategiaConteudo] no knowledge graph                    │
│  → Cria edge [DEFINIU_ESTRATEGIA]                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       @criador                                      │
│  Usa contexto da estratégia para gerar posts                        │
│  → Cria [PostGerado] no knowledge graph                             │
│  → Cria edge [GEROU_COM_BASE_EM]                                    │
│  → Salva na libraryItems (PostgreSQL)                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     @calendario                                     │
│  Sugere datas e horários baseado na estratégia                     │
│  → Cria [AgendaPost] no knowledge graph                             │
│  → Cria edge [AGENDADO_PARA]                                        │
│  → Salva em scheduledPosts (PostgreSQL)                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Troca de Agente na Mesma Sessão

```typescript
// A mesma thread Zep pode ter múltiplos agentes
// Metadata da thread rastreia o agente atual

async function switchAgent(
  threadId: string,
  newAgent: 'zory' | 'estrategista' | 'criador' | 'calendario'
) {
  // Atualiza metadata da thread
  await zepClient.thread.update(threadId, {
    metadata: {
      agent: newAgent,
      agent_switched_at: new Date().toISOString()
    }
  })

  // Recupera contexto com template específico do novo agente
  const templateId = AGENT_TEMPLATES[newAgent]
  const context = await zepClient.thread.get_user_context({
    thread_id: threadId,
    template_id: templateId
  })

  return context
}
```

---

## 6. Integração Técnica

### Instalação

```bash
npm install @getzep/zep-cloud
```

### Estrutura de Arquivos

```
src/lib/zep/
├── client.ts           # Cliente Zep singleton
├── setup.ts            # Setup de ontologia e templates
├── templates.ts        # Definição dos templates
├── session.ts          # Gestão de sessões multi-agent
├── ontology.ts         # Entity e Edge types customizados
└── index.ts            # Exportações públicas
```

### Cliente Zep (src/lib/zep/client.ts)

```typescript
import { Zep } from "@getzep/zep-cloud"

const API_KEY = process.env.ZEP_API_KEY!

/**
 * Cliente Zep singleton
 * Reutilize esta instância em toda a aplicação
 */
export const zepClient = new Zep({
  apiKey: API_KEY,
})

/**
 * Wrapper com retry logic
 */
export async function withZepRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
    }
  }

  throw lastError
}
```

### Setup de Ontologia (src/lib/zep/ontology.ts)

```typescript
import { EntityModel, EdgeModel, EntityText, Field } from "@getzep/zep-cloud"

// Entity Types
export class EstrategiaConteudo extends EntityModel {
  temaPrincipal: EntityText = Field(
    description="O tema central da estratégia de conteúdo"
  )
  tomDeVoz: EntityText = Field(description="Tom de voz predominante")
  publicoAlvo: EntityText = Field(description="Público-alvo da estratégia")
  plataformas: EntityText = Field(description="Plataformas de atuação")
}

export class PostGerado extends EntityModel {
  tipo: EntityText = Field(description="Tipo do post")
  plataforma: EntityText = Field(description="Plataforma do post")
  topico: EntityText = Field(description="Tópico abordado")
  status: EntityText = Field(description="Status atual")
  libraryItemId: EntityText = Field(description="ID na biblioteca")
}

export class IdeiaConteudo extends EntityModel {
  descricao: EntityText = Field(description="Descrição da ideia")
  categoria: EntityText = Field(description="Categoria da ideia")
  prioridade: EntityText = Field(description="Prioridade")
}

export class AgendaPost extends EntityModel {
  dataAgendada: EntityText = Field(description="Data de agendamento")
  horaSugerida: EntityText = Field(description="Horário sugerido")
  tipo: EntityText = Field(description="Tipo de conteúdo")
}

export class MarcaBrand extends EntityModel {
  nome: EntityText = Field(description="Nome da marca")
  segmento: EntityText = Field(description="Segmento de atuação")
  valores: EntityText = Field(description="Valores da marca")
}

// Edge Types
export class DefiniuEstrategia extends EdgeModel {
  dataDefinicao: EntityText = Field(description="Data da definição")
}

export class GerouComBaseEm extends EdgeModel {
  dataGeracao: EntityText = Field(description="Data de geração")
  agente: EntityText = Field(description="Agente criador")
}

export class AgendadoPara extends EdgeModel {
  dataAgendamento: EntityText = Field(description="Data do agendamento")
  plataforma: EntityText = Field(description="Plataforma")
}

export class PertenceACampanha extends EdgeModel {
  papel: EntityText = Field(description="Papel na campanha")
}
```

### Setup Inicial (src/lib/zep/setup.ts)

```typescript
import { zepClient } from "./client"
import * as ontology from "./ontology"
import { AGENT_TEMPLATES } from "./templates"

/**
 * Configura ontologia customizada para o projeto
 * Executar uma vez ao inicializar a aplicação
 */
export async function setupZepOntology() {
  await zepClient.graph.setOntology({
    // Entity types
    entities: {
      EstrategiaConteudo: ontology.EstrategiaConteudo,
      PostGerado: ontology.PostGerado,
      IdeiaConteudo: ontology.IdeiaConteudo,
      AgendaPost: ontology.AgendaPost,
      MarcaBrand: ontology.MarcaBrand,
    },
    // Edge types
    edges: {
      DEFINIU_ESTRATEGIA: ontology.DefiniuEstrategia,
      GEROU_COM_BASE_EM: ontology.GerouComBaseEm,
      AGENDADO_PARA: ontology.AgendadoPara,
      PERTENCE_A_CAMPANHA: ontology.PertenceACampanha,
    },
  })
}

/**
 * Cria context templates para cada agente
 */
export async function setupContextTemplates() {
  // Template @zory
  await zepClient.context.createContextTemplate({
    templateId: "zory-context",
    template: AGENT_TEMPLATES.zory,
  })

  // Template @estrategista
  await zepClient.context.createContextTemplate({
    templateId: "estrategista-context",
    template: AGENT_TEMPLATES.estrategista,
  })

  // Template @criador
  await zepClient.context.createContextTemplate({
    templateId: "criador-context",
    template: AGENT_TEMPLATES.criador,
  })

  // Template @calendario
  await zepClient.context.createContextTemplate({
    templateId: "calendario-context",
    template: AGENT_TEMPLATES.calendario,
  })
}

/**
 * Setup completo - executar na inicialização
 */
export async function initializeZep() {
  await setupZepOntology()
  await setupContextTemplates()
}
```

### Context Templates (src/lib/zep/templates.ts)

```typescript
export const AGENT_TEMPLATES = {
  zory: `
# CONTEXTO DO USUÁRIO
%{user_summary}

# MARCA E NEGÓCIO
%{entities types=[MarcaBrand] limit=3}

# ESTRATÉGIAS DEFINIDAS
%{edges types=[DEFINIU_ESTRATEGIA] limit=5}

# CONTEÚDOS RECENTES
%{entities types=[PostGerado] limit=5}

# IDEIAS PENDENTES
%{entities types=[IdeiaConteudo] limit=5}
`,

  estrategista: `
# PERFIL ESTRATÉGICO
%{user_summary}

# MARCA - SEGMENTO E VALORES
%{entities types=[MarcaBrand] limit=3 include_attributes=true}

# ESTRATÉGIAS DE CONTEÚDO VIGENTES
%{edges types=[DEFINIU_ESTRATEGIA] limit=10 include_attributes=true}

# HISTÓRICO DE POSTS POR PLATAFORMA
%{entities types=[PostGerado] limit=10 include_attributes=true}

# AGENDAMENTOS FUTUROS
%{edges types=[AGENDADO_PARA] limit=10}
`,

  criador: `
# PERFIL CRIATIVO
%{user_summary}

# VOZ DA MARCA
%{entities types=[MarcaBrand, EstrategiaConteudo] limit=5 include_attributes=true}

# TOM E ESTILO PREFERIDO
%{edges types=[DEFINIU_ESTRATEGIA] limit=3 include_attributes=true}

# CONTEÚDOS SIMILARES (REFERÊNCIA)
%{entities types=[PostGerado] limit=5 include_attributes=true}

# IDEIAS PARA DESENVOLVER
%{entities types=[IdeiaConteudo] limit=5 include_attributes=true}
`,

  calendario: `
# PERFIL DE CALENDÁRIO
%{user_summary}

# AGENDA ATUAL E FUTURA
%{entities types=[AgendaPost] limit=20 include_attributes=true}

# POSTS AGENDADOS
%{edges types=[AGENDADO_PARA] limit=15 include_attributes=true}

# CONTEÚDOS PARA AGENDAR
%{entities types=[PostGerado] limit=10 include_attributes=true}
`,
} as const

export type AgentType = keyof typeof AGENT_TEMPLATES

export function getTemplateId(agent: AgentType): string {
  return `${agent}-context`
}
```

### Gestão de Sessões (src/lib/zep/session.ts)

```typescript
import { zepClient } from "./client"
import { getTemplateId, AgentType } from "./templates"
import type { Message } from "@getzep/zep-cloud"

export interface ZepSession {
  userId: string
  threadId: string
  currentAgent: AgentType
  agentSessionId: string
}

/**
 * Cria uma nova sessão Zep para um usuário
 */
export async function createZepSession(
  clerkUserId: string,
  agent: AgentType = "zory"
): Promise<ZepSession> {
  // Garante que usuário existe no Zep
  // (Usar Clerk user ID como Zep user ID)
  const threadId = crypto.randomUUID()

  await zepClient.thread.create({
    threadId,
    userId: clerkUserId,
    metadata: {
      agent,
      agent_session_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    },
  })

  return {
    userId: clerkUserId,
    threadId,
    currentAgent: agent,
    agentSessionId: crypto.randomUUID(),
  }
}

/**
 * Adiciona mensagem à thread Zep
 */
export async function addMessageToThread(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  userName?: string,
  metadata?: Record<string, unknown>
) {
  await zepClient.thread.addMessages(threadId, [
    {
      role,
      content,
      name: role === "user" ? userName : "AI Assistant",
      metadata,
    },
  ])
}

/**
 * Recupera contexto para um agente específico
 */
export async function getAgentContext(
  threadId: string,
  agent: AgentType
): Promise<string> {
  const templateId = getTemplateId(agent)

  const response = await zepClient.thread.getUserContext({
    threadId,
    templateId,
  })

  return response.context
}

/**
 * Troca agente da sessão atual
 */
export async function switchAgent(
  threadId: string,
  newAgent: AgentType
): Promise<void> {
  await zepClient.thread.update(threadId, {
    metadata: {
      agent: newAgent,
      agent_switched_at: new Date().toISOString(),
    },
  })
}

/**
 * Adiciona dados de negócio ao knowledge graph
 */
export async function addBusinessData(
  userId: string,
  type: "json" | "text",
  data: string
) {
  await zepClient.graph.add({
    userId,
    type,
    data,
  })
}
```

---

## 7. Variáveis de Ambiente

Adicione ao `.env` ou `.env.local`:

```env
# Zep Cloud
ZEP_API_KEY=sk_abcdefghijklmnopqrstuvwxyz
# Opcional: especifique um project ID se tiver múltiplos
ZEP_PROJECT_ID=your-project-id
```

**Obtendo as credenciais:**

1. Acesse [https://app.getzep.com](https://app.getzep.com)
2. Crie um projeto
3. Copie a API Key das configurações do projeto
4. (Opcional) Copie o Project ID se necessário

---

## 8. Exemplos de Uso

### Criar Usuário Zep ao Criar Usuário Clerk

```typescript
// src/app/api/auth/callback/route.ts (ou webhook Clerk)
import { zepClient } from "@/lib/zep/client"
import { clerkClient } from "@clerk/nextjs/server"

export async function POST(req: Request) {
  const { data } = await clerkClient.users.getUserList()

  for (const user of data) {
    // Cria usuário Zep usando Clerk ID
    await zepClient.user.add({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      metadata: {
        createdAt: user.createdAt,
      },
    })
  }

  return Response.json({ success: true })
}
```

### Criar Thread ao Iniciar Chat

```typescript
// src/lib/actions/chat.ts
import { createZepSession } from "@/lib/zep/session"
import { db } from "@/db"
import { chats } from "@/db/schema"

export async function startNewChat(clerkUserId: string) {
  // Cria sessão Zep
  const zepSession = await createZepSession(clerkUserId, "zory")

  // Cria chat local
  const [newChat] = await db
    .insert(chats)
    .values({
      userId: clerkUserId,
      title: "Nova Conversa",
      model: "openai/gpt-5.2",
    })
    .returning()

  return {
    chat: newChat,
    zepSession,
  }
}
```

### Adicionar Mensagens

```typescript
// src/lib/actions/chat.ts
import { addMessageToThread } from "@/lib/zep/session"

export async function addUserMessage(
  threadId: string,
  userId: string,
  content: string,
  userName: string
) {
  // Adiciona ao Zep
  await addMessageToThread(threadId, "user", content, userName, {
    timestamp: new Date().toISOString(),
  })

  // Adiciona ao banco local
  await db.insert(messages).values({
    chatId: localChatId,
    role: "user",
    content,
  })
}

export async function addAssistantMessage(
  threadId: string,
  content: string,
  agent: string,
  model: string
) {
  // Adiciona ao Zep
  await addMessageToThread(threadId, "assistant", content, "AI Assistant", {
    agent,
    model,
    timestamp: new Date().toISOString(),
  })

  // Adiciona ao banco local
  await db.insert(messages).values({
    chatId: localChatId,
    role: "assistant",
    content,
  })
}
```

### Recuperar Contexto por Template

```typescript
// src/lib/actions/agent.ts
import { getAgentContext } from "@/lib/zep/session"

export async function generateResponse(
  threadId: string,
  userMessage: string,
  agent: "estrategista" | "criador" | "calendario"
) {
  // Recupera contexto específico do agente
  const zepContext = await getAgentContext(threadId, agent)

  // Monta prompt com contexto
  const systemPrompt = `${getSystemPrompt(agent)}\n\n${zepContext}`

  // Gera resposta com OpenRouter
  const response = await openrouter.chat.completions.create({
    model: "openai/gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  })

  return response.choices[0]?.message?.content
}
```

### Trocar Agente na Mesma Sessão

```typescript
// src/components/chat/agent-switcher.tsx
import { switchAgent, getAgentContext } from "@/lib/zep/session"

async function handleAgentSwitch(
  threadId: string,
  newAgent: "criador" | "estrategista" | "calendario"
) {
  // Atualiza agente na thread Zep
  await switchAgent(threadId, newAgent)

  // Recupera novo contexto
  const newContext = await getAgentContext(threadId, newAgent)

  // Atualiza UI com novo contexto
  updateAgentContext(newAgent, newContext)
}
```

### Adicionar Evento de Negócio ao Knowledge Graph

```typescript
// src/lib/actions/library.ts
import { addBusinessData } from "@/lib/zep/session"

export async function saveLibraryItem(
  userId: string,
  item: LibraryItemData
) {
  // Salva no PostgreSQL
  const [savedItem] = await db
    .insert(libraryItems)
    .values(item)
    .returning()

  // Adiciona ao knowledge graph Zep
  const businessData = {
    user_id: userId,
    event_type: "content_created",
    item_type: item.type,
    item_status: item.status,
    title: item.title,
    library_item_id: savedItem.id,
  }

  await addBusinessData(userId, "json", JSON.stringify(businessData))

  return savedItem
}
```

---

## 9. Considerações de Implementação

### Sincronização Clerk-Zep

Sempre que um usuário Clerk for criado, crie o usuário Zep correspondente:

```typescript
// Usar Clerk user ID como Zep user ID
await zepClient.user.add({
  userId: clerkUser.id,  // ← Mesmo ID!
  email: clerkUser.email,
  firstName: clerkUser.firstName,
  lastName: clerkUser.lastName,
})
```

### Backfill de Dados Existentes

Para usuários e conversas existentes:

```typescript
// Backfill de usuários
async function backfillUsers() {
  const existingUsers = await db.select().from(users)

  for (const user of existingUsers) {
    await zepClient.user.add({
      userId: user.id,
      email: user.email,
      firstName: user.name?.split(" ")[0],
      lastName: user.name?.split(" ").slice(1).join(" "),
    })
  }
}

// Backfill de conversas
async function backfillChats() {
  const existingChats = await db.select().from(chats)
  const existingMessages = await db.select().from(messages)

  for (const chat of existingChats) {
    // Cria thread
    await zepClient.thread.create({
      threadId: `chat-${chat.id}`,
      userId: chat.userId,
    })

    // Adiciona mensagens em batch
    const chatMessages = existingMessages.filter(m => m.chatId === chat.id)
    await zepClient.thread.addMessages(
      `chat-${chat.id}`,
      chatMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        name: m.role === "user" ? "User" : "AI Assistant",
      }))
    )
  }
}
```

### Tratamento de Erros

```typescript
import { withZepRetry } from "@/lib/zep/client"

async function safeAddMessage(threadId: string, message: Message) {
  try {
    await withZepRetry(() =>
      zepClient.thread.addMessages(threadId, [message])
    )
  } catch (error) {
    // Log mas não quebra o fluxo
    console.error("Zep error:", error)

    // Fallback: continua sem contexto Zep
    return { fallback: true }
  }
}
```

### Monitoramento

```typescript
// Métricas para monitorar Zep
export const zepMetrics = {
  contextRetrievalTime: 0,
  graphAddTime: 0,
  errorCount: 0,

  async timeContext(fn: () => Promise<void>) {
    const start = Date.now()
    try {
      await fn()
      this.contextRetrievalTime = Date.now() - start
    } catch {
      this.errorCount++
    }
  },
}
```

---

## 10. Próximos Passos

### Fase 1: Setup Inicial
- [ ] Instalar `@getzep/zep-cloud`
- [ ] Configurar variáveis de ambiente
- [ ] Criar estrutura de pastas `src/lib/zep/`
- [ ] Implementar cliente singleton

### Fase 2: Ontologia e Templates
- [ ] Definir Entity Types customizados
- [ ] Definir Edge Types customizados
- [ ] Criar Context Templates para cada agente
- [ ] Executar `initializeZep()` no startup

### Fase 3: Integração com Clerk
- [ ] Webhook para criar usuário Zep ao criar Clerk user
- [ ] Sincronizar updates de usuário
- [ ] Script de backfill para usuários existentes

### Fase 4: Integração com Chat
- [ ] Criar thread Zep ao iniciar chat
- [ ] Adicionar mensagens ao Zep
- [ ] Recuperar contexto por template
- [ ] Implementar troca de agente na mesma thread

### Fase 5: Business Data
- [ ] Adicionar library items ao graph
- [ ] Adicionar scheduled posts ao graph
- [ ] Adicionar estratégias definidas ao graph

### Fase 6: Monitoramento e Otimização
- [ ] Métricas de latência
- [ ] Error tracking
- [ ] Otimização de templates

---

## Referências

- [Zep Documentation](https://help.getzep.com/)
- [Zep Quickstart](https://help.getzep.com/quickstart)
- [Zep SDK Reference](https://help.getzep.com/sdk-reference)
- [Context Templates](https://help.getzep.com/context-templates)
- [Customizing Graph Structure](https://help.getzep.com/customizing-graph-structure)
- [npm: @getzep/zep-cloud](https://www.npmjs.com/package/@getzep/zep-cloud)

---

**Fim do Documento**
