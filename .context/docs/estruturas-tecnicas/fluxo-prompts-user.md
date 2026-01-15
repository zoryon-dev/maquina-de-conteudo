# Fluxo de Prompts - Arquitetura e Uso Prático

**Projeto:** Máquina de Conteúdo
**Data:** 2026-01-15
**Versão:** 2.0

---

## 1. Visão Geral

O sistema de prompts da Máquina de Conteúdo utiliza uma **arquitetura de 4 camadas** que permite personalização flexível mantendo consistência de comportamento. Cada camada adiciona contexto ao prompt final enviado ao LLM.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA 1: SYSTEM PROMPT                     │
│  (Definido pelos desenvolvedores, robusto, oculto do usuário)  │
│  → local: lib/system-prompts.ts + DB tabela system_prompts     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA 2: USER PROMPT                       │
│  (Editável pelo usuário em /settings, sobrescreve sistema)     │
│  → local: DB tabela user_prompts                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                CAMADA 3: VARIÁVEIS PROCESSADAS                  │
│  (Expandidas via IA para contexto rico - 10 variáveis)         │
│  → local: DB tabela user_variables                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA 4: RAG CONTEXT                        │
│  (Documentos indexados via embeddings Voyage AI)               │
│  → local: DB tabelas documents + document_embeddings           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ═════════════════
                    ║ PROMPT FINAL ║
                    ═════════════════
                            │
                            ▼
                      Envio ao LLM (OpenRouter)
```

---

## 2. Estrutura de Dados

### 2.1 Tabela `system_prompts` (Camada 1)

Armazena os prompts base definidos pelos desenvolvedores para cada agente especialista.

```sql
CREATE TABLE system_prompts (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL UNIQUE,        -- 'zory', 'estrategista', 'calendario', 'criador'
  prompt TEXT NOT NULL,               -- O prompt completo em markdown
  version INTEGER NOT NULL DEFAULT 1, -- Para versionamento
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)
```

**Fonte de verdade:** `src/lib/system-prompts.ts`

---

### 2.2 Tabela `user_prompts` (Camada 2)

Armazena as personalizações do usuário para cada agente.

```sql
CREATE TABLE user_prompts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,                 -- 'zory', 'estrategista', etc.
  prompt TEXT NOT NULL,                -- O prompt customizado
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agent)               -- Um prompt por agente por usuário
)
```

---

### 2.3 Tabela `user_variables` (Camada 3)

Armazena **10 variáveis globais** do usuário que serão expandidas pela IA.

```sql
CREATE TABLE user_variables (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,          -- Ver lista abaixo
  variable_value TEXT NOT NULL,        -- Valor bruto da variável
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, variable_key)
)
```

#### 10 Variáveis Disponíveis

| Variável | Descrição | Tipo | Exemplo |
|----------|-----------|------|---------|
| `tone` | Tom de voz geral | Texto | "Profissional e acessível" |
| `brandVoice` | Voz única da marca | Texto | "Autêntica e sem filtro" |
| `niche` | Nichos de atuação | Texto | "Ecommerce de moda sustentável" |
| `targetAudience` | Público-alvo | Texto | "Mulheres 25-40, urbana, classe A-B" |
| `audienceFears` | **Medos e dores** | Texto | "Envelhecer, perder dinheiro, ficar para trás" |
| `audienceDesires` | **Desejos e aspirações** | Texto | "Se sentir única, pertencer a comunidade exclusiva" |
| `negativeTerms` | **TERMOS PROIBIDOS** | Texto | "Oba, é assim que, gente, minha gente, oi povo" |
| `differentiators` | Diferenciais competitivos | Texto | "Delivery em 2h, 100% vegano, sustentável" |
| `contentGoals` | Objetivos do conteúdo | Texto | "Engajamento, conversão, brand awareness" |
| `preferredCTAs` | CTAs preferidos | Texto | "Compre agora, Saiba mais, Garanta seu desconto" |

> **Nota importante:** A variável `platform` foi **removida** pois a plataforma deve ser escolhida no momento da criação do conteúdo, não como variável global fixa.

---

### 2.4 Tabela `documents` (Camada 4 - RAG)

Armazena documentos indexados para contexto adicional.

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT,                  -- 'pdf', 'txt', 'md'
  category TEXT DEFAULT 'general', -- Ver categorias abaixo
  metadata TEXT,                   -- JSON para dados adicionais
  embedded BOOLEAN DEFAULT FALSE,  -- Se possui embeddings gerados
  embedding_model TEXT DEFAULT 'voyage-large-2',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)
```

#### 7 Categorias de Documentos RAG

| Categoria | Descrição | Ícone |
|-----------|-----------|-------|
| `general` | Documentos gerais sobre o negócio | Folder |
| `products` | Catálogo completo de produtos/serviços | Package |
| `offers` | Promoções, descontos, lançamentos | Tag |
| `brand` | Marca, identidade, tom de voz, valores | Palette |
| `audience` | Personas, pesquisas, dados demográficos | Users |
| `competitors` | Análise competitiva | Target |
| `content` | Posts que funcionaram, calendário anterior | FileText |

---

## 3. Fluxo de Construção do Prompt Final

### 3.1 Etapa 1: Seleção do Prompt Base

```typescript
// Tenta buscar prompt customizado do usuário
const userPrompt = await db.query.userPrompts.findFirst({
  where: eq(userPrompts.userId, userId),
  where: eq(userPrompts.agent, agent),
})

// Se existe, usa; senão busca do sistema
const basePrompt = userPrompt?.prompt || systemPrompt?.prompt
```

### 3.2 Etapa 2: Expansão de Variáveis (Camada 3)

As 10 variáveis em formato `{{variavel}}` são expandidas usando IA (Gemini Flash):

```typescript
// Entrada: tone = "profissional"
// Saída expandida: "O tom deve ser profissional mas acessível, usando
//          linguagem clara sem jargões excessivos. Mantenha uma postura
//          consultiva e empática."
```

### 3.3 Etapa 3: Substituição no Prompt

```typescript
let prompt = basePrompt
for (const [key, value] of Object.entries(expandedVariables)) {
  prompt = prompt.replaceAll(`{{${key}}}`, value)
}
```

### 3.4 Etapa 4: Recuperação de Contexto RAG (Camada 4)

```typescript
// Busca documentos relevantes usando busca semântica
const relevantDocs = await semanticSearch({
  userId,
  query,
  categories: ['products', 'offers'], // Seleção por categoria
  limit: 5,
})

// Formata contexto recuperado
const ragContext = relevantDocs.map((doc, i) =>
  `[Documento ${i + 1}: ${doc.title}]\n${doc.content}\n`
).join("\n")
```

---

## 4. Exemplo Prático Completo

### 4.1 Cenário

Usuário quer criar um post para Instagram sobre lançamento de coleção de verão.

**Configuração do usuário:**
- Agente: `@criador`
- Tone: "descontraído e jovem"
- Brand Voice: "Autêntica, sem corporativês, como amiga surfera"
- Niche: "loja de surfwear"
- Target Audience: "Jovens 18-35, praia, verão, liberdade"
- Audience Fears: "Perder a relevância, não pertencer ao grupo, ficar de fora"
- Audience Desires: "Pertencer à tribo, ser admirada, viver o verão intensamente"
- Negative Terms: "Oba, é assim que, gente, minha gente, oi povo, amigx, caro cliente"
- Differentiators: "100% sustainable, eco-friendly packaging, limited editions"
- Content Goals: "Engajamento e conexão emocional"
- Preferred CTAs: "Confira, Garanta o seu, Corre para aproveitar"
- Categorias selecionadas: `products`, `offers`

### 4.2 Prompt Final (Enviado ao LLM)

```
Você é @criador, o gerador de conteúdo criativo da Máquina de Conteúdo.

SEU PAPEL:
- Transformar ideias abstratas em posts concretos e engajadores
- Adaptar conteúdo para diferentes formatos (texto, imagem, carrossel, vídeo)
- Aplicar o tom de voz e personalidade da marca

**Voz da Marca:** Autêntica, sem corporativês, como amiga surfera que fala com
sua tribo de forma genuína e descontraída.

**Tom:** Descontraído e jovem, usando gírias leves apropriadas do universo surf.
Fale como um amigo surfero dando dicas. Seja energético e autêntico.

**Contexto do Nicho:** Focar em cultura surf, praia, verão, liberdade, aventura.
Referências a ondas, mar, sol, viagens. Público jovem (18-35 anos) que pratica ou
aprecia o lifestyle surf.

**Público-Alvo:** Jovens 18-35 anos conectados com praia e verão, buscam
pertencimento e vivências intensas.

**Gatilhos Emocionais - Dores:** O medo de perder a relevância, não pertencer ao grupo,
ficar de fora dos momentos memoráveis de verão.

**Gatilhos Emocionais - Sonhos:** Pertencer à tribo surf, ser admirada pelo estilo,
viver o verão intensamente com experiências únicas.

**⚠️ TERMOS ESTRITAMENTE PROIBIDOS:** Oba, é assim que, gente, minha gente, oi povo,
amigx, caro cliente. **NUNCA use estes termos.**

**Diferenciais:** 100% sustainable, eco-friendly packaging, limited editions -
produtos que respeitam o oceano.

**Objetivo:** Engajamento e conexão emocional - gerar comentários e compartilhamentos.

**CTAs preferidos:** Confira, Garanta o seu, Corre para aproveitar

ESTRUTURA DE POST:
1. Hook/Gancho (primeira linha ou frame) - use medos ou desejos
2. Conteúdo principal (valor ao público, showcase de diferenciais)
3. CTA (use CTAs preferidos) quando aplicável
4. Hashtags estratégicas

=== CONTEXTO ADICIONAL ===
[Documento 1: Coleção Verão 2026]
A coleção de verão 2026 apresenta 12 peças entre biquínis, sungas e boardshorts.
Tecnologia Quick Dry com proteção UV 50+. Cores vibrantes: turquesa, coral, amarelo.
Preços médios: R$ 120 - R$ 280.

[Documento 2: Ofertas Lançamento]
Primeira semana: 20% off na primeira compra. Frete grátis acima de R$ 300.
Brinde exclusive: beach towel personalizada.
=== FIM DO CONTEXTO ===

Crie um post para Instagram anunciando o lançamento da coleção de verão.
```

---

## 5. Integração com Settings Page

### 5.1 Seção de Variáveis

A aba "Variáveis" em `/settings` permite configurar as 10 variáveis:

```
┌─────────────────────────────────────────────────────────────┐
│ Identidade da Marca                                        │
├─────────────────────────────────────────────────────────────┤
│ [Tom de Voz]        [Voz da Marca]      [Nichos]           │
│                                                              │
│ Público-Alvo                                                 │
├─────────────────────────────────────────────────────────────┤
│ [Target Audience]   [Medos e Dores]    [Desejos]           │
│                                                              │
│ Estratégia de Conteúdo                                       │
├─────────────────────────────────────────────────────────────┤
│ [Diferenciais]      [Objetivos]        [CTAs]              │
│                                                              │
│ Restrições                                                   │
├─────────────────────────────────────────────────────────────┤
│ [Termos Proibidos] ⚠️ Usa com ética                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Seção de Documentos

A aba "Documentos" em `/settings` permite upload em 7 categorias:

```
┌─────────────────────────────────────────────────────────────┐
│ Seleccione a categoria antes de fazer o upload:            │
│                                                              │
│ [Geral] [Catálogo] [Ofertas] [Marca] [Público]            │
│         [Concorrentes] [Conteúdo]                           │
│                                                              │
│ ═══════════════════════════════════════════════════════════╗│
│ │  Arraste arquivos aqui ou clique para selecionar          ││
│ │  PDF, TXT, MD (máx. 10MB)                                 ││
│ ═══════════════════════════════════════════════════════════╝│
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Boas Práticas

### Para Desenvolvedores
- **Nunca modificar** prompts do sistema diretamente no banco
- **Sempre atualizar** `SYSTEM_PROMPTS_SEED` e fazer migration
- **Versionar** prompts quando houver mudanças significativas
- **Documentar** variáveis disponíveis no prompt do sistema

### Para Usuários
- **Seja específico** em variáveis como `audienceFears` e `audienceDesires`
- **Use `negativeTerms`** para evitar clichês e linguagem artificial
- **Categorize** documentos para seleção eficiente (products vs offers)
- **Preencha `differentiators`** - isso diferencia sua marca da concorrência
- **Teste** diferentes combinações de variáveis

---

## 7. Código de Referência

### Arquivos Principais

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/system-prompts.ts` | Seed de prompts + USER_VARIABLES_CONFIG + DOCUMENT_CATEGORIES |
| `src/app/(app)/settings/components/sections/prompts-section.tsx` | UI de edição de prompts |
| `src/app/(app)/settings/components/sections/variables-section.tsx` | UI de edição de variáveis |
| `src/app/(app)/settings/components/sections/documents-section.tsx` | UI de upload de docs |
| `src/app/(app)/sources/page.tsx` | Visualização RAG e estatísticas |
| `src/db/schema.ts` | Definição das tabelas |

### Tipos TypeScript

```typescript
// Variáveis do usuário
interface UserVariables {
  tone?: string                // Tom de voz geral
  brandVoice?: string           // Voz única da marca
  niche?: string                // Nicho de atuação
  targetAudience?: string       // Público-alvo
  audienceFears?: string        // Medos e dores
  audienceDesires?: string      // Desejos e aspirações
  negativeTerms?: string        // Termos proibidos
  differentiators?: string      // Diferenciais competitivos
  contentGoals?: string         // Objetivos do conteúdo
  preferredCTAs?: string        // CTAs preferidos
}

// Categorias de documento
type DocumentCategory =
  | 'general'
  | 'products'
  | 'offers'
  | 'brand'
  | 'audience'
  | 'competitors'
  | 'content'
```

---

## 8. Guia Prático de Uso

### 8.1 Fluxo Completo do Usuário

#### Passo 1: Configurar Variáveis Globais
```
Usuário acessa /settings → Aba "Variáveis"
├── Preenche os 10 campos de personalização
├── Clica em "Salvar Alterações"
└── Dados são salvos na tabela user_variables
```

**O que acontece nos bastidores:**
```typescript
// 1. Frontend coleta os valores do formulário
const formData = {
  tone: "Profissional e acessível",
  brandVoice: "Autêntica, sem corporativês",
  niche: "Ecommerce de moda sustentável",
  // ... demais variáveis
}

// 2. Chama Server Action para cada variável
await saveVariableAction("tone", formData.tone)
await saveVariableAction("brandVoice", formData.brandVoice)
// ...

// 3. Server Action salva no banco
await db.insert(userVariables).values({
  userId,
  variableKey: "tone",
  variableValue: "Profissional e acessível"
})
```

#### Passo 2: Fazer Upload de Documentos (RAG)
```
Usuário acessa /fontes → Aba "Documentos"
├── Clica em "Upload"
├── Seleciona categoria (ex: "products")
├── Arrasta arquivo PDF/TXT/MD
└── Documento é salvo e marcado para indexação
```

**O que acontece nos bastidores:**
```typescript
// 1. Frontend lê o arquivo
const file = selectedFile
const content = await file.text()

// 2. Chama Server Action de upload
const result = await uploadDocumentAction({
  title: file.name,
  type: "pdf",
  category: "products",
  content: content
})

// 3. Server Action salva no banco
const [document] = await db.insert(documents).values({
  userId,
  title: file.name,
  fileType: "pdf",
  category: "products",
  content: content,
  embedded: false  // Será processado por background job
}).returning()

// 4. Background job gera embeddings
// (ainda não implementado - ficará em document_embeddings)
```

#### Passo 3: (Opcional) Customizar Prompts
```
Usuário acessa /settings → Aba "Prompts"
├── Seleciona o agente (ex: "@criador")
├── Clica em "Editar"
├── Modifica o prompt conforme necessidade
└── Salva na tabela user_prompts
```

**Comportamento de sobrescrita:**
```typescript
// Se user_prompt existe para o agente, usa ele
const userPrompt = await db.query.userPrompts.findFirst({
  where: eq(userPrompts.userId, userId),
  where: eq(userPrompts.agent, "criador")
})

const basePrompt = userPrompt?.prompt || systemPrompt?.prompt
```

#### Passo 4: Usar o Chat
```
Usuário acessa /dashboard
├── Digita: "@criador Crie um post sobre lançamento de coleção de verão"
├── Sistema monta o prompt final
└── Envia para OpenRouter API
```

---

### 8.2 Ciclo de Vida dos Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CICLO DE VIDA DOS PROMPTS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DEVELOPMENT (system_prompts)                                           │
│     ├── Definido em src/lib/system-prompts.ts                              │
│     ├── Seed executado na primeira vez                                     │
│     └── Tabela system_prompts preenchida                                   │
│                                                                              │
│  2. USER CONFIGURATION (user_variables, user_prompts)                      │
│     ├── Usuário preenche variáveis em /settings                            │
│     ├── Usuário (opcionalmente) customiza prompts                         │
│     └── Dados salvos nas tabelas user_*                                    │
│                                                                              │
│  3. DOCUMENT UPLOAD (documents, document_embeddings)                        │
│     ├── Usuário faz upload em /fontes                                      │
│     ├── Documentos salvos em documents                                     │
│     └── Embeddings gerados em document_embeddings                          │
│                                                                              │
│  4. PROMPT ASSEMBLY (Runtime)                                              │
│     ├── System/User Prompt selecionado                                     │
│     ├── Variáveis expandidas via IA (Gemini Flash)                        │
│     ├── Contexto RAG recuperado (busca semântica)                          │
│     └── Prompt final montado e enviado ao LLM                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 8.3 Mapeamento Tabela ↔ Interface

#### Tabela `system_prompts`
| Campo | Valor Exemplo | Origem |
|-------|---------------|---------|
| agent | `"criador"` | Definido em código |
| prompt | `"Você é @criador..."` | SYSTEM_PROMPTS_SEED |
| version | `2` | Controle de versão |

**Como usar:** Não editável diretamente pelo usuário. Apenas via código+migration.

#### Tabela `user_prompts`
| Campo | Valor Exemplo | Interface |
|-------|---------------|-----------|
| user_id | `"user_abc123"` | Clerk auth() |
| agent | `"criador"` | Seletor de agente |
| prompt | `"Você é @criador MODIFICADO..."` | Textarea em /settings |

**Como usar:** `/settings?tab=prompts` → Selecionar agente → Editar prompt → Salvar

#### Tabela `user_variables`
| Campo | Valor Exemplo | Interface |
|-------|---------------|-----------|
| user_id | `"user_abc123"` | Clerk auth() |
| variable_key | `"tone"` | Um dos 10 campos |
| variable_value | `"Profissional e acessível"` | Input em /settings |

**Como usar:** `/settings?tab=variables` → Preencher campos → Salvar

#### Tabela `documents`
| Campo | Valor Exemplo | Interface |
|-------|---------------|-----------|
| user_id | `"user_abc123"` | Clerk auth() |
| title | `"catalogo-verao-2026.txt"` | Nome do arquivo |
| content | `"Coleção com 12 peças..."` | Conteúdo extraído |
| category | `"products"` | Seletor no upload |
| embedded | `false` | Atualizado por job |

**Como usar:** `/fontes?tab=documentos` → Botão Upload → Selecionar categoria → Arrastar arquivo

#### Tabela `document_embeddings`
| Campo | Valor Exemplo | Origem |
|-------|---------------|---------|
| document_id | `42` | FK para documents |
| embedding | `"[0.123, -0.456, ...]"` | Voyage AI API |
| model | `"voyage-large-2"` | Configuração |

**Como usar:** Gerado automaticamente após upload (ainda a implementar)

---

### 8.4 Exemplo de Código Real

#### Frontend: Salvando uma variável
```typescript
// src/app/(app)/settings/components/sections/variables-section.tsx

import { saveVariableAction } from "../../actions/save-settings"
import { toast } from "sonner"

async function handleVariableChange(key: string, value: string) {
  const result = await saveVariableAction(key, value)

  if (result.success) {
    toast.success("Variável salva com sucesso!")
    markAsChanged() // Notifica o componente pai que há mudanças
  } else {
    toast.error(result.error || "Falha ao salvar variável")
  }
}
```

#### Frontend: Fazendo upload de documento
```typescript
// src/app/(app)/sources/components/upload-dialog.tsx

import { uploadDocumentAction } from "../../settings/actions/save-settings"

const processFile = async (file: File) => {
  // Valida tipo
  const validTypes = [".pdf", ".txt", ".md"]
  if (!validTypes.some((type) => file.name.toLowerCase().endsWith(type))) {
    toast.error("Tipo de arquivo inválido. Use PDF, TXT ou MD.")
    return
  }

  // Valida tamanho (10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast.error("Arquivo muito grande. Máximo 10MB.")
    return
  }

  // Lê conteúdo
  const content = await file.text()
  const fileType = file.name.split(".").pop()?.toLowerCase() || "txt"

  // Envia para servidor
  const result = await uploadDocumentAction({
    title: file.name,
    type: fileType,
    category: selectedCategory,
    content,
  })

  if (result.success) {
    toast.success("Documento enviado com sucesso!")
    onSuccess?.() // Refresh na lista de documentos
    onOpenChange(false) // Fecha dialog
  } else {
    toast.error(result.error || "Falha ao enviar documento")
  }
}
```

#### Backend: Recuperando documentos com embeddings
```typescript
// src/app/(app)/sources/actions/sources-actions.ts

export async function getDocumentsWithEmbeddingsAction(): Promise<DocumentWithEmbeddings[]> {
  const { userId } = await auth()
  if (!userId) return []

  // Busca documentos do usuário
  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      fileType: documents.fileType,
      category: documents.category,
      embedded: documents.embedded,
      embeddingModel: documents.embeddingModel,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt))

  // Para cada documento, conta embeddings
  const result: DocumentWithEmbeddings[] = []
  for (const doc of docs) {
    const embeddingCount = await db
      .select({ count: count() })
      .from(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, doc.id))

    result.push({
      ...doc,
      embeddingCount: embeddingCount[0]?.count || 0,
    })
  }

  return result
}
```

---

### 8.5 Localização Física dos Arquivos

```
projeto/
├── src/
│   ├── db/
│   │   └── schema.ts                    # Definições das tabelas SQL
│   ├── lib/
│   │   └── system-prompts.ts            # SYSTEM_PROMPTS_SEED + constantes
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx             # Página de configurações
│   │   │   │   └── components/
│   │   │   │       ├── settings-tabs.tsx
│   │   │   │       ├── settings-page.tsx
│   │   │   │       ├── sections/
│   │   │   │       │   ├── api-keys-section.tsx
│   │   │   │       │   ├── prompts-section.tsx
│   │   │   │       │   ├── variables-section.tsx
│   │   │   │       │   └── models-section.tsx
│   │   │   │       └── actions/
│   │   │   │           └── save-settings.ts    # Server Actions
│   │   │   └── sources/
│   │   │       ├── page.tsx             # Página de fontes
│   │   │       ├── components/
│   │   │       │   ├── documents-tab.tsx
│   │   │       │   ├── semantic-search-tab.tsx
│   │   │       │   ├── stats-tab.tsx
│   │   │       │   ├── upload-dialog.tsx
│   │   │       │   └── document-card.tsx
│   │   │       └── actions/
│   │   │           └── sources-actions.ts      # Server Actions para /fontes
│   │   └── api/
│   │       └── webhooks/
│   │           └── clerk/
│   │               └── route.ts        # Sincronização user_created
│
└── drizzle/
    └── migrations/                      # Migrações do banco
```

---

## 9. Troubleshooting

### Problema: Variáveis não aparecem no prompt
**Causa:** Variáveis não foram salvas ou `{{variavel}}` tem nome incorreto
**Solução:**
1. Verifique se `saveVariableAction` foi chamado
2. Confirme que a variável existe em `user_variables`
3. Verifique ortografia no placeholder (case-sensitive)

### Problema: Documento não aparece na busca semântica
**Causa:** `embedded = false` ou embeddings não gerados
**Solução:**
1. Verifique status de "Indexado" na lista de documentos
2. Aguarde processamento do background job
3. Reenvie documento se necessário

### Problema: Prompt customizado não funciona
**Causa:** Prompt customizado tem sintaxe inválida ou está vazio
**Solução:**
1. Verifique se o prompt foi salvo em `user_prompts`
2. Confirme que o `agent` bate com o selecionado
3. Use "Resetar" para voltar ao system prompt

---

**Fim do Documento**
