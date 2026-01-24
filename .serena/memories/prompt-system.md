# Prompt System Architecture

## 4-Layer Prompt Architecture

The Máquina de Conteúdo uses a 4-layer prompt system that allows flexible customization while maintaining consistent behavior.

### Layer 1: System Prompt (dev-defined, hidden)
- **Location**: `src/lib/system-prompts.ts` (SYSTEM_PROMPTS_SEED)
- **Database**: `system_prompts` table
- **Purpose**: Base prompts defined by developers for each agent
- **Agents**: zory, estrategista, calendario, criador
- **Versioning**: Each prompt has a version field for tracking changes

### Layer 2: User Prompt (customizable, overrides system)
- **Database**: `user_prompts` table
- **Purpose**: User can override system prompts with custom versions
- **Location**: UI at `/settings?tab=prompts`
- **Behavior**: If user prompt exists for an agent, use it; otherwise use system prompt

### Layer 3: Processed Variables (AI-enriched via Gemini)
- **Database**: `user_variables` table
- **Purpose**: Global variables expanded by AI for richer context
- **Standard Variables** (10 total):
  - `tone` - Tom de voz geral (profissional, casual, amigável, humorístico)
  - `brandVoice` - Voz única da marca (personalidade que diferencia a comunicação)
  - `niche` - Nichos de atuação
  - `targetAudience` - Público alvo detalhado (demografia + psicografia)
  - `audienceFears` - **Medos e dores** do público (gatilhos emocionais negativos - usar com ética)
  - `audienceDesires` - **Desejos e aspirações** do público (gatilhos emocionais positivos)
  - `negativeTerms` - **TERMOS PROIBIDOS** que a IA NUNCA deve usar
  - `differentiators` - Diferenciais competitivos da marca/produto
  - `contentGoals` - Objetivos do conteúdo (engajamento, conversão, brand awareness)
  - `preferredCTAs` - Chamadas para ação preferidas da marca
- **Expansion**: Uses Gemini Flash to expand brief inputs into rich descriptions
- **Placeholder Format**: `{{variableName}}` in prompts
### Layer 4: RAG Context (document embeddings)
- **Database**: `documents` + `document_embeddings` tables
- **Purpose**: Indexed documents provide business-specific context
- **Embedding Model**: Voyage AI (voyage-large-2)
- **Categories** (7 total):
  - `general` - Documentos gerais sobre o negócio
  - `products` - Catálogo completo de produtos/serviços
  - `offers` - Promoções, descontos, lançamentos
  - `brand` - Marca, identidade, tom de voz, valores
  - `audience` - Personas, pesquisas, dados demográficos
  - `competitors` - Análise competitiva
  - `content` - Posts que funcionaram, calendário anterior
- **Selection**: User can select categories during content generation
## Prompt Building Flow

```typescript
// 1. Select base prompt (system or user)
const basePrompt = await selectBasePrompt(userId, agent)

// 2. Fetch user variables
const userVariables = await getUserVariables(userId)

// 3. Expand variables via AI (Gemini Flash)
const expandedVariables = await expandVariables(userVariables, basePrompt)

// 4. Replace {{variables}} in prompt
let prompt = replaceVariables(basePrompt, expandedVariables)

// 5. Retrieve RAG context based on query and categories
const ragContext = await retrieveRAGContext(userId, query, selectedCategories)

// 6. Add RAG context to prompt
if (ragContext) {
  prompt += `\n\n=== CONTEXTO ADICIONAL ===\n${ragContext}\n=== FIM DO CONTEXTO ===\n`
}

// 7. Add user query
prompt += `\n\n${userQuery}`
```

## Database Schema

### system_prompts
```sql
CREATE TABLE system_prompts (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL UNIQUE,        -- 'zory', 'estrategista', 'calendario', 'criador'
  prompt TEXT NOT NULL,               -- The prompt in markdown
  version INTEGER NOT NULL DEFAULT 1, -- For versioning
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)
```

### user_prompts
```sql
CREATE TABLE user_prompts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,                 -- 'zory', 'estrategista', etc.
  prompt TEXT NOT NULL,                -- Custom prompt
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agent)               -- One prompt per agent per user
)
```

### user_variables
```sql
CREATE TABLE user_variables (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,          -- 'tone', 'brandVoice', 'niche', 'targetAudience', 'audienceFears', 'audienceDesires', 'negativeTerms', 'differentiators', 'contentGoals', 'preferredCTAs'
  variable_value TEXT NOT NULL,        -- Raw variable value
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, variable_key)
)
```
## Server Actions

### save-settings.ts
```typescript
// Seed system prompts from code to database
seedSystemPromptsAction()

// Get all system prompts
getSystemPromptsAction(): Promise<DbSystemPrompt[]>

// Get user's custom prompts
getUserPromptsAction(): Promise<DbUserPrompt[]>

// Save/update custom prompt
savePromptAction(agent: string, prompt: string): Promise<SaveSettingsResult>

// Delete custom prompt (revert to system)
deletePromptAction(agent: string): Promise<SaveSettingsResult>
```

## UI Components

### PromptsSection
- **Location**: `src/app/(app)/settings/components/sections/prompts-section.tsx`
- **Features**:
  - List of all 4 agents with their prompt status
  - View system prompt (read-only)
  - Create/edit custom prompt
  - Reset to system prompt
  - PromptEditorDialog with live preview

### PromptEditorDialog
- **Component**: Dialog from shadcn/ui
- **Features**:
  - Textarea for custom prompt
  - Collapsible system prompt reference
  - 4-layer architecture visualization
  - Save/Reset/Cancel buttons

## Code Locations

| File | Purpose |
|------|---------|
| `src/lib/system-prompts.ts` | System prompts seed + PROMPT_LAYERS constants |
| `src/app/(app)/settings/components/sections/prompts-section.tsx` | Prompts UI |
| `src/app/(app)/settings/actions/save-settings.ts` | Server actions |
| `.context/docs/estruturas-tecnicas/fluxo-prompts-user.md` | Detailed documentation |

## Wizard Prompts v4 - Tribal Philosophy

**Localização:** `src/lib/wizard-services/prompts.ts`

Prompts baseados no livro "Tribos" de Seth Godin para conteúdo que cria pertencimento.

### Novos Prompts Tribais

| Prompt | Modelo | Temp | Propósito |
|--------|--------|------|-----------|
| `getBaseTribalSystemPrompt()` | - | - | System prompt universal tribal |
| `getThemeProcessingPrompt()` | gemini-3-flash-preview | 0.3 | Processamento de temas trending |
| `getNarrativesSystemPrompt()` | gpt-4.1 | 0.7 | Geração de narrativas tribais |
| `getSynthesizerPrompt()` | gpt-4.1-mini | 0.4 | Síntese de pesquisa |

### Ângulos Tribais

| Ângulo | Descrição |
|--------|-----------|
| `herege` | Desafia o senso comum, provoca reflexão |
| `visionario` | Mostra futuro possível, inspira mudança |
| `tradutor` | Simplifica o complexo, democratiza conhecimento |
| `testemunha` | Compartilha jornada pessoal, cria identificação |

### Campos Tribais nas Narrativas

```typescript
interface NarrativeOption {
  hook?: string;                  // Primeira frase que cria reconhecimento
  core_belief?: string;           // Crença compartilhada que une criador e audiência
  status_quo_challenged?: string; // O que o conteúdo questiona
}
```

### Template de Caption Universal

**Função:** `getCaptionTribalTemplateInstructions()`

Estrutura de caption aplicada a todos os tipos de conteúdo:
1. **HOOK** - Emoji contextual + frase que continua o conteúdo visual
2. **BLOCO DE CONEXÃO** (50-80 palavras) - Por que isso importa
3. **BLOCO DE VALOR** (80-120 palavras) - Insights que não estão no visual
4. **BLOCO DE IDENTIFICAÇÃO** (30-50 palavras) - "Se você também..."
5. **CONVITE TRIBAL** (20-40 palavras) - Não peça, convide

Mínimo 200 palavras. Seja generoso.
