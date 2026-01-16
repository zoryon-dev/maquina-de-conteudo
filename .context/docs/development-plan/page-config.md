# Settings Page - Architecture Blueprint

**Projeto:** Máquina de Conteúdo
**Documento:** Planejamento completo da página `/settings`
**Data:** 2025-01-15
**Status:** Planejamento Concluído

---

## 1. Overview & Goals

### 1.1 Objetivos Principais

A página de configurações (`/settings`) é o central de controle do usuário onde:

1. **Gerencia API Keys** - Configurar e validar chaves de APIs externas
2. **Define Modelos** - Selecionar modelos LLM padrão (fallback)
3. **Edita Prompts** - Customizar prompts para cada agente especialista
4. **Configura Variáveis** - Definir variáveis globais para personalização

> **Nota:** O gerenciamento de documentos foi movido para a página `/fontes` para melhor UX.

### 1.2 APIs Suportadas

| Provider | Obrigatório | Uso |
|----------|-------------|-----|
| OpenRouter | ✅ Sim | LLMs para geração de conteúdo |
| Voyage AI | ✅ Sim | Embeddings para RAG |
| Firecrawl | ❌ Não | Web scraping |
| Tavily | ❌ Não | Busca web |
| ScreenshotOne | ❌ Não | Capturas de tela |
| APIfy | ❌ Não | Web scraping alternativo |

### 1.3 Sistema de 4 Camadas de Prompts

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA 4: RAG                        │
│  (Contexto de documentos selecionados pelo usuário)     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                CAMADA 3: VARIÁVEIS                      │
│  (Processadas via Gemini para contexto rico)            │
│  - tone, niche, targetAudience, platform, etc.          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CAMADA 2: USER PROMPT                  │
│  (Editável pelo usuário, visível, customizável)         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CAMADA 1: SYSTEM PROMPT                 │
│  (Robusto, oculto, controlado pelos devs)               │
│  - Instruções obrigatórias                               │
│  - Regras de formato                                     │
│  - Constraints de segurança                             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Hierarchy

```
src/app/(app)/settings/
├── page.tsx                          # Server Component (root)
│   └── components/
│       ├── settings-page.tsx         # Client Component principal
│       │   ├── settings-tabs.tsx     # Navegação por tabs
│       │   ├── settings-actions.tsx  # Botões Save/Reset
│       │   │
│       │   ├── sections/
│       │   │   ├── api-keys-section.tsx
│       │   │   │   ├── api-key-card.tsx
│       │   │   │   ├── api-key-status.tsx
│       │   │   │   └── api-key-input.tsx
│       │   │   │
│       │   │   ├── models-section.tsx
│       │   │   │   ├── model-selector-card.tsx
│       │   │   │   └── fallback-model-selector.tsx
│       │   │   │
│       │   │   ├── prompts-section.tsx
│       │   │   │   ├── prompt-card.tsx
│       │   │   │   ├── prompt-editor.tsx
│       │   │   │   └── system-indicator.tsx
│       │   │   │
│       │   │   └── variables-section.tsx
│       │   │       ├── variable-field.tsx
│       │   │       ├── tone-selector.tsx
│       │   │       ├── platform-selector.tsx
│       │   │       └── cta-style-selector.tsx
│       │   │
│       │   └── shared/
│       │       ├── settings-section.tsx
│       │       └── section-header.tsx
│       │
│       ├── hooks/
│       │   ├── use-settings.ts
│       │   ├── use-api-key-validation.ts
│       │   └── use-prompt-editor.ts
│       │
│       └── actions/
│           ├── save-settings.ts
│           ├── validate-api-key.ts
│           ├── upload-document.ts    # Usado também por /fontes
│           └── delete-document.ts    # Usado também por /fontes

src/app/(app)/sources/
├── page.tsx                          # Enhanced navbar com grid layout
│   └── components/
│       ├── documents-tab.tsx         # Gerenciamento de documentos
│       ├── semantic-search-tab.tsx   # Busca semântica
│       ├── stats-tab.tsx             # Estatísticas e embeddings
│       ├── upload-dialog.tsx         # Dialog de upload com categorias
│       └── document-card.tsx         # Card individual de documento
│
└── actions/
    └── sources-actions.ts            # Server Actions para /fontes
```

---

## 3. UI/UX Layout

### 3.1 Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│  Header (AppLayout - existente)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Settings                                             │ │
│  │  Configure suas API keys, prompts e variáveis         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ┌─────────┬─────────┬─────────┬─────────┐             │ │
│  │  │   API   │ Modelos │ Prompts │ Variáv. │             │ │
│  │  │   Keys  │         │         │   eis   │             │ │
│  │  └─────────┴─────────┴─────────┴─────────┘             │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                                                  │ │ │
│  │  │  [Conteúdo da seção selecionada]                │ │ │
│  │  │                                                  │ │ │
│  │  │                                                  │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                              [Cancelar] [Salvar]      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Especificação Visual

**Cores:**
- Background principal: `bg-[#0a0a0f]`
- Cards: `bg-[#1a1a2e]`
- Bordas: `border-white/10`
- Texto primário: `text-white`
- Texto secundário: `text-white/70`
- Primary action: `bg-primary`

**Typography:**
- Título: `text-2xl font-semibold text-white`
- Subtítulo: `text-sm text-white/70`
- Labels: `text-sm font-medium text-white/90`

**Espaçamento:**
- Container: `max-w-4xl mx-auto`
- Padding vertical: `py-8`
- Gap entre seções: `gap-6`

**Components a Reutilizar:**
- `Card` (shadcn)
- `Button` (shadcn)
- `Input` (shadcn)
- `Textarea` (shadcn)
- `Badge` (shadcn)
- `Switch` (shadcn)
- `Separator` (shadcn)

---

## 4. Data Flow

### 4.1 Fluxo de Carregamento

```
User acessa /settings
      │
      ▼
Server Component (page.tsx)
      │
      ├─▶ Busca userId do Clerk (auth())
      │
      ├─▶ Busca configurações do banco
      │   ├─ user_settings
      │   ├─ user_api_keys (encriptadas)
      │   ├─ user_prompts
      │   ├─ user_variables
      │   └─ documents
      │
      ├─▶ Decripta API keys no servidor
      │   (apenas para display, nunca envia pro client)
      │
      └─▶ Renderiza SettingsPage com dados iniciais
```

### 4.2 Fluxo de Salvamento

```
User clica "Salvar"
      │
      ▼
Client Component coleta dados de todas seções
      │
      ├─▶ API Keys: encripta no cliente ANTES de enviar
      │
      └─▶ Server Action (save-settings)
          │
          ├─▶ Valida dados
          ├─▶ Salva no banco (Drizzle)
          ├─▶ Revalida cache
          └─▶ Retorna { success: true }
```

### 4.3 Fluxo de Validação de API Key

```
User insere API key e sai do campo (onBlur)
      │
      ▼
Client Component
      │
      ├─▶ Debounce (500ms)
      │
      └─▶ Server Action (validate-api-key)
          │
          ├─▶ API Route (/api/settings/validate-api-key)
          │   │
          │   └─▶ Chama endpoint do provider
          │       ├─ OpenRouter: GET /api/v1/models
          │       ├─ Voyage: POST /v1/embeddings
          │       └─ outros...
          │
          └─▶ Retorna { valid: boolean, error?: string }
```

### 4.4 Fluxo de Upload de Documento

```
User arrasta arquivo ou seleciona
      │
      ▼
Client Component
      │
      ├─▶ Lê arquivo (FileReader)
      ├─▶ Extrai texto
      │
      └─▶ Server Action (upload-document)
          │
          ├─▶ Salva documento no banco
          ├─▶ Gera embedding (Voyage AI)
          │   │
          │   └─▶ POST https://api.voyageai.com/v1/embeddings
          │       Body: { input: text, model: "voyage-large-2" }
          │
          ├─▶ Salva embedding em document_embeddings
          └─▶ Retorna { success: true, documentId }
```

---

## 5. Database Schema

### 5.1 Tabelas Novas

```sql
-- Tabela para configurações gerais do usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- Modelos padrão (fallback)
  default_text_model TEXT NOT NULL DEFAULT 'openai/gpt-5.2',
  default_image_model TEXT NOT NULL DEFAULT 'openai/gpt-5-image',
  embedding_model TEXT NOT NULL DEFAULT 'voyage-large-2',
  variable_processing_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Tabela para API keys encriptadas
CREATE TABLE IF NOT EXISTS user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  nonce TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT NULL,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_api_keys_user_id_idx ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS user_api_keys_provider_idx ON user_api_keys(provider);

-- Tabela para system prompts (controlado pelos devs)
CREATE TABLE IF NOT EXISTS system_prompts (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_prompts_agent_idx ON system_prompts(agent);

-- Tabela para user prompts (sobrescrita do usuário)
CREATE TABLE IF NOT EXISTS user_prompts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agent)
);

CREATE INDEX IF NOT EXISTS user_prompts_user_id_idx ON user_prompts(user_id);

-- Tabela para variáveis do usuário
CREATE TABLE IF NOT EXISTS user_variables (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  variable_value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, variable_key)
);

CREATE INDEX IF NOT EXISTS user_variables_user_id_idx ON user_variables(user_id);
CREATE INDEX IF NOT EXISTS user_variables_key_idx ON user_variables(variable_key);

-- Tabela para documentos (RAG)
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);

-- Tabela para embeddings dos documentos
CREATE TABLE IF NOT EXISTS document_embeddings (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'voyage-large-2',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx ON document_embeddings(document_id);
```

### 5.2 Seed de System Prompts

```sql
INSERT INTO system_prompts (agent, prompt, version) VALUES
  ('zory', 'Você é @zory, especialista em estratégia de conteúdo para redes sociais. Seu objetivo é ajudar o usuário a criar estratégias eficazes, baseadas em dados e tendências atuais.', 1),
  ('estrategista', 'Você é @estrategista, analista de tendências e comportamento do consumidor. Você identifica oportunidades e padrões que podem ser aproveitados para criar conteúdo viral.', 1),
  ('calendario', 'Você é @calendario, especialista em planejamento e agendamento de conteúdo. Você otimiza datas e horários para máxima engajamento.', 1),
  ('criador', 'Você é @criador, gerador de conteúdo criativo. Você transforma ideias em posts envolventes e formatados para cada plataforma.', 1)
ON CONFLICT (agent) DO NOTHING;
```

---

## 6. Security

### 6.1 Encriptação de API Keys

**Abordagem: Client-Side Encryption antes de enviar ao servidor**

```typescript
// src/lib/encryption.ts
import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!
const ALGORITHM = "aes-256-gcm"

const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)

export function encryptApiKey(plaintext: string): {
  encryptedKey: string
  nonce: string
} {
  const nonce = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return {
    encryptedKey: `${encrypted}:${authTag.toString("hex")}`,
    nonce: nonce.toString("hex"),
  }
}

export function decryptApiKey(encryptedKey: string, nonce: string): string {
  const [encrypted, authTagHex] = encryptedKey.split(":")

  const nonceBuffer = Buffer.from(nonce, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonceBuffer)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
```

**Variável de Ambiente:**
```env
# Gerar com: openssl rand -base64 32
ENCRYPTION_KEY=sua-chave-aqui-32-bytes-base64
```

---

## 7. Implementation Map

### 7.1 Arquivos para Criar/Modificar

#### FASE 1: Database Schema & Migrations

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/db/schema.ts` | MODIFY | Adicionar tabelas de settings |
| `drizzle/000X_settings.sql` | CREATE | Migration para criar tabelas |

#### FASE 2: Server Actions & API Routes

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/app/api/settings/validate-api-key/route.ts` | CREATE | API route para validar API keys |
| `src/app/api/settings/upload-document/route.ts` | CREATE | API route para upload de documentos |
| `src/app/api/settings/documents/[id]/route.ts` | CREATE | API route para deletar documentos |
| `src/app/(app)/settings/actions/save-settings.ts` | CREATE | Server action para salvar settings |
| `src/app/(app)/settings/actions/validate-api-key.ts` | CREATE | Server action para validar API key |
| `src/app/(app)/settings/actions/upload-document.ts` | CREATE | Server action para upload |
| `src/app/(app)/settings/actions/delete-document.ts` | CREATE | Server action para deletar |

#### FASE 3: Utility Libraries

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/encryption.ts` | CREATE | Funções de encriptação/decriptação |
| `src/lib/voyage-ai.ts` | CREATE | Cliente Voyage AI para embeddings |
| `src/lib/rag.ts` | CREATE | Funções de RAG (busca semântica) |

#### FASE 4-10: UI Components

Ver hierarquia completa na seção 2.

---

## 8. Build Sequence

### 8.1 Fases de Implementação (Checklist)

#### FASE 1: Fundação (Database & Security)
- [x] Criar tabelas no schema (`src/db/schema.ts`)
- [x] Gerar migration (`npx drizzle-kit generate`)
- [x] Executar migration (`npx drizzle-kit push`)
- [x] Implementar encriptação (`src/lib/encryption.ts`)
- [x] Gerar `ENCRYPTION_KEY` e adicionar ao `.env`

#### FASE 2: API Layer
- [x] Criar API route para validar API keys
- [x] Implementar validators para cada provider
- [x] Criar Server Actions para salvar settings
- [x] Criar Server Actions para upload/delete de documentos

#### FASE 3: Layout & Navigation
- [x] Criar `SettingsPage` Client Component principal
- [x] Implementar tabs de navegação
- [x] Criar actions bar (Save/Reset)

#### FASE 4: API Keys Section
- [x] Criar `ApiKeysSection` component
- [x] Criar `ApiKeyCard` component
- [x] Implementar validação no blur com debounce

#### FASE 5: Models Section
- [x] Criar `ModelsSection` component
- [x] Reutilizar `ModelSelector` existente

#### FASE 6: Prompts Section
- [x] Criar `PromptsSection` component
- [x] Criar `PromptEditor` modal com Dialog
- [x] Integrar com getSystemPromptsAction/getUserPromptsAction
- [x] Seed system prompts no banco (`src/lib/system-prompts.ts`)

#### FASE 7: Variables Section
- [x] Criar `VariablesSection` component
- [x] Criar seletores customizados (Tone, Platform, CTA)

#### FASE 8: Documents Section (RAG) - MOVIDO para /fontes
> **Alteração (Jan 2026):** Gerenciamento de documentos movido para `/fontes` para melhor UX.
- [x] Criar `DocumentsSection` component (originalmente em /settings)
- [x] Implementar drag & drop upload
- [x] Adicionar categorização de documentos
- [x] Integrar com server actions (upload/delete/fetch)
- [x] **Mover document upload para /fontes (UploadDialog)**
- [x] **Remover aba "Documentos" de /settings**
- [x] **Criar sources-actions.ts com operações específicas**

#### FASE 9: Página Fontes - REFACTORING COMPLETO (Jan 2026)
- [x] **Enhanced navbar com grid layout (3 colunas)**
- [x] **Adicionar active indicator animado (Framer Motion layoutId)**
- [x] **UploadDialog integrado em DocumentsTab**
- [x] **Estatísticas de documentos com cards visuais**
- [x] **Filtros por categoria com scroll horizontal**
- [x] **Busca integrada com documentos**
- [x] **Visualização de status de indexação (embedded/ chunks)**

#### FASE 10: Integração & Testes
- [x] Integrar todas as seções
- [ ] Testar fluxo completo com usuários reais
- [ ] Seed de system prompts na inicialização

#### FASE 11: Polish & UX
- [x] Adicionar skeletons, empty states
- [ ] Otimizar performance (lazy load de seções)
- [ ] Testar acessibilidade

---

## 9. Critical Details

### 9.1 Padrão de Error Handling

```typescript
"use server"

export async function saveSettingsAction(formData: SettingsFormData) {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db.update(userSettings)
      .set({ ...formData, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Save settings error:", error)
    return { success: false, error: "Failed to save settings" }
  }
}
```

### 9.2 State Management

**Abordagem: State Local + Server Actions** (sem Zustand para settings)

Settings não precisam de estado global. State local com Server Actions é mais simples.

### 9.3 Performance Optimizations

1. **Debounce na validação de API keys** (500ms)
2. **Memo de componentes pesados** (`React.memo`)
3. **Lazy loading de seções** (`dynamic` import)
4. **Virtualization para lista de documentos** (se > 50 itens)

---

## 10. Summary

### 10.1 Arquitetura Definitiva

**Decisões Arquiteturais:**
1. ✅ Server Components + Server Actions + Client Components híbridos
2. ✅ State local (sem Zustand para settings)
3. ✅ Encriptação client-side para API keys
4. ✅ Validação em tempo real com debounce
5. ✅ Arquitetura de 4 camadas para prompts
6. ✅ Embeddings Voyage AI para RAG
7. ✅ Normalização de banco de dados com relações

### 10.2 Próximos Passos

**Imediato:**
1. Executar migration do banco
2. Implementar encriptação
3. Criar Server Actions base
4. Implementar API Keys Section (MVP)

**Curto Prazo:**
1. Models Section
2. Prompts Section
3. Variables Section
4. Documents Section → **MOVIDO para /fontes** ✓

---

## 11. Atualizações Recentes (Janeiro 2026)

### 11.1 Biblioteca de Conteúdos - Fase Completa (Janeiro 2026)

**Status:** ✅ CONCLUÍDA (100%)

**Objetivo:** Implementar Biblioteca de Conteúdos completa para gerenciar todos os posts criados.

**Funcionalidades Implementadas:**

| Componente | Status | Descrição |
|-----------|--------|-----------|
| `library-page.tsx` | ✅ | Client Component principal |
| `library-header.tsx` | ✅ | Header com search, view toggle, sort controls |
| `library-filter-bar.tsx` | ✅ | Barra de filtros expansível |
| `library-grid.tsx` | ✅ | Grid view com cards |
| `library-list.tsx` | ✅ | List view (tabela) |
| `content-card.tsx` | ✅ | Card individual com edição inline |
| `content-row.tsx` | ✅ | Row individual (lista) |
| `content-dialog.tsx` | ✅ | Modal de edição completa |
| `category-picker.tsx` | ✅ | Seletor de categoria com busca |
| `tag-picker.tsx` | ✅ | Multi-select de tags com busca |
| `empty-library-state.tsx` | ✅ | Estado vazio |
| `use-library-data.ts` | ✅ | Hook de dados com cache |
| `use-library-filters.ts` | ✅ | Hook de filtros |
| `use-library-view.ts` | ✅ | Hook de view mode |
| `library-actions.ts` | ✅ | Server Actions completas |

**Arquivos Criados:**
```
src/app/(app)/library/
├── page.tsx
├── components/
│   ├── library-page.tsx
│   ├── library-header.tsx
│   ├── library-filter-bar.tsx
│   ├── library-grid.tsx
│   ├── library-list.tsx
│   ├── content-card.tsx
│   ├── content-row.tsx
│   ├── content-dialog.tsx
│   ├── category-picker.tsx
│   ├── tag-picker.tsx
│   └── empty-library-state.tsx
├── hooks/
│   ├── use-library-data.ts
│   ├── use-library-filters.ts
│   └── use-library-view.ts
└── actions/
    └── library-actions.ts

src/types/
└── library.ts
```

**Próximos Passos para Biblioteca:**
1. Integrar com Calendário (agendar conteúdo)
2. Adicionar funcionalidade de duplicar
3. Implementar drag & drop para reordenar
4. Adicionar export de conteúdos

---

### 11.2 Refatoração da Página /fontes

**Objetivo:** Melhorar UX do gerenciamento de documentos RAG, centralizando em uma página dedicada.

**Alterações realizadas:**

1. **Removido de /settings:**
   - Aba "Documentos" removida do navigation tabs
   - Tipo `TabValue` atualizado (removido "documents")
   - Import e render de `DocumentsSection` removidos

2. **Adicionado em /fontes:**
   - `UploadDialog` - Dialog com seleção de categoria e drag-and-drop
   - Botão "Upload" integrado ao DocumentsTab
   - `sources-actions.ts` - Server Actions específicas para /fontes

3. **Enhanced Navbar (/fontes):**
   - Grid layout (3 colunas no desktop)
   - Active indicator animado (Framer Motion `layoutId`)
   - Descrição para cada aba
   - Glow effect no estado ativo
   - Checkmark visual

**Arquivos modificados:**
- `src/app/(app)/sources/page.tsx` - Enhanced navbar
- `src/app/(app)/sources/components/documents-tab.tsx` - Upload integrado
- `src/app/(app)/sources/components/upload-dialog.tsx` - NOVO
- `src/app/(app)/sources/actions/sources-actions.ts` - Server Actions
- `src/app/(app)/settings/components/settings-tabs.tsx` - Docs removido
- `src/app/(app)/settings/components/settings-page.tsx` - Docs removido

---

### 11.2 Calendário Editorial - Fase Inicial (Janeiro 2026)

**Status:** 🚧 EM DESENVOLVIMENTO (Fase 1-4 Concluída)

**Objetivo:** Implementar calendário editorial completo para visualização e gerenciamento de posts agendados.

**Fases Concluídas:**

| Fase | Componentes | Status |
|------|-------------|--------|
| Fase 1: Foundation | `src/types/calendar.ts`, `src/lib/calendar-utils.ts`, `calendar-actions.ts` | ✅ |
| Fase 2: Navigation & Filters | `use-calendar-navigation.ts`, `use-calendar-filters.ts`, `month-navigation.tsx`, `view-switcher.tsx`, `filter-bar.tsx` | ✅ |
| Fase 3: Calendar Grid | `calendar-grid.tsx`, `calendar-day-header.tsx`, `calendar-day.tsx` | ✅ |
| Fase 4: Post Cards | `post-card.tsx` com badges de plataforma | ✅ |
| Fase 5: Drag & Drop | Drag & drop para reagendar | ⏸️ |
| Fase 6: Post Dialog | `post-dialog.tsx` para criar/editar | ⏸️ |

**Arquivos Criados:**
```
src/app/(app)/calendar/
├── page.tsx                    # Server Component
├── components/
│   ├── calendar-page.tsx       # Client Component principal
│   ├── calendar-header.tsx     # Header com navegação
│   ├── month-navigation.tsx    # Botões ← mês → Hoje
│   ├── view-switcher.tsx       # Mês/Semana/Dia
│   ├── filter-bar.tsx          # Filtros plataforma/status
│   ├── calendar-grid.tsx       # Grid principal
│   ├── calendar-day-header.tsx # Dom Seg Ter...
│   ├── calendar-day.tsx        # Célula do dia
│   └── post-card.tsx           # Card de post
├── hooks/
│   ├── use-calendar-navigation.ts  # Navegação (sem URL sync)
│   ├── use-calendar-filters.ts     # Filtros (state local)
│   └── use-calendar-posts.ts       # Posts (useRef cache)
└── actions/
    └── calendar-actions.ts     # Server Actions CRUD
```

**Melhorias Visuais (Janeiro 2026):**
- Datas: `text-base font-bold` (mais visíveis)
- "Hoje": círculo aumentado (w-7 h-7)
- Células: bordas `border-white/5`
- Badges: ícones de plataforma com cores específicas

**Bugs Corrigidos:**
- Infinite POST loop: removido URL sync, usado `useRef` para cache
- TypeScript errors: corrigidos imports e tipos

**Próximos Passos:**
1. Implementar drag & drop para reagendar
2. Criar post dialog para criar/editar posts
3. Implementar week e day views
4. Adicionar skeleton loading e error handling

**Documentação Relacionada:**
- `.context/docs/development-plan/calendar-dev-plan.md` - Planejamento completo

---

## Referências

### Arquivos do Projeto

- **Schema DB:** `src/db/schema.ts`
- **Modelos LLM:** `src/lib/models.ts`
- **ModelSelector:** `src/components/chat/model-selector.tsx`
- **UI Components:** `src/components/ui/`
- **App Layout:** `src/components/app-layout.tsx`
- **Settings Page:** `src/app/(app)/settings/page.tsx`

### Links Úteis

- **Next.js Server Actions:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Drizzle ORM:** https://orm.drizzle.team/
- **shadcn/ui:** https://ui.shadcn.com/
- **Clerk Auth:** https://clerk.com/docs
- **OpenRouter:** https://openrouter.ai/docs
- **Voyage AI:** https://docs.voyageai.com/

---

**Fim do Planejamento**

Este documento fornece uma arquitetura completa e implementável para a página de configurações do projeto "Máquina de Conteúdo".
