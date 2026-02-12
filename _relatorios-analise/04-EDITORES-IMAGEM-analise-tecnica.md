# Relatório 4 — Editores e Geradores de Imagem: Análise Técnica

**Projeto:** Máquina de Conteúdo
**Data:** 12 de fevereiro de 2026
**Tipo:** Análise Técnica Aprofundada (para desenvolvedores seniores)
**Escopo:** Creative Studio, Editor Visual (Studio), Wizard de conteúdo, sistema de agentes, stores Zustand

---

## 1. Visão Geral da Arquitetura

### 1.1. Stack de Geração de Conteúdo

| Componente | Tecnologia | Arquivos Principais |
|------------|-----------|---------------------|
| Wizard (narrativas + conteúdo) | Vercel AI SDK `generateText()` + OpenRouter | `src/lib/wizard-services/llm.service.ts`, `prompts.ts` |
| Creative Studio (imagens) | Fetch direto para OpenRouter API | `src/lib/creative-studio/openrouter-image.ts` |
| Prompt Builder (imagens) | Custom composition | `src/lib/creative-studio/prompt-builder.ts` |
| Editor Visual (Studio) | Zustand + persist | `src/stores/studio-store.ts` |
| Estado do Creative Studio | Zustand (sem persist) | `src/stores/creative-studio-store.ts` |
| Agentes (chat) | Vercel AI SDK `streamText()` + Zep | `src/app/api/chat/route.ts`, `src/lib/agents/prompts.ts` |
| Storage | Cloudflare R2 / Local abstraction | `src/lib/storage/` |

### 1.2. Fluxo de Dados Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    WIZARD DE CRIAÇÃO                         │
│                                                             │
│  Input (tema, tipo, público)                                │
│       │                                                     │
│       ▼                                                     │
│  loadAndFormatUserVariables()                               │
│       │                                                     │
│       ▼                                                     │
│  getNarrativesSystemPrompt() + variablesContext              │
│       │                                                     │
│       ▼                                                     │
│  generateText() via OpenRouter ──→ 4 Narrativas             │
│       │                                                     │
│       ▼ (user escolhe uma)                                  │
│  getContentPrompt() + variablesContext                       │
│       │                                                     │
│       ▼                                                     │
│  generateText() via OpenRouter ──→ GeneratedContent          │
│       │                                                     │
│       ▼                                                     │
│  structureGeneratedContent() ──→ Slides/Text/Video/Image    │
└─────────────────────────────────────────────────────────────┘
         │ (manual copy)                    │ (manual copy)
         ▼                                  ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  EDITOR VISUAL       │      │  CREATIVE STUDIO              │
│  (Studio Store)      │      │  (Creative Studio Store)      │
│                      │      │                                │
│  slides: StudioSlide[]│      │  prompt + preset + template   │
│  profile, header     │      │       │                        │
│  caption, hashtags   │      │       ▼                        │
│  aspectRatio         │      │  buildCreativePrompt()         │
│                      │      │       │                        │
│  Zustand + persist   │      │       ▼                        │
│  (localStorage)      │      │  generateCreativeImage()       │
│                      │      │       │                        │
│                      │      │       ▼                        │
│                      │      │  OpenRouter API (image model)  │
│                      │      │       │                        │
│                      │      │       ▼                        │
│                      │      │  Storage (R2/Local)            │
└─────────────────────┘      └──────────────────────────────┘
```

---

## 2. Wizard de Criação — Análise Técnica

### 2.1. Geração de Narrativas

**Arquivo:** `src/lib/wizard-services/llm.service.ts` — `generateNarratives()` (linhas 138-278)

**Fluxo:**
1. Verifica disponibilidade do OpenRouter (linha 144)
2. Carrega e mescla variáveis do usuário via `loadAndFormatUserVariables()` (linhas 153-160)
3. Constrói system prompt via `getNarrativesSystemPrompt()` com todos os inputs (linhas 163-177)
4. Appenda contexto de variáveis (linhas 180-182)
5. Appenda termos proibidos (linhas 185-187)
6. Chama LLM com retry (linhas 190-195): `llmCallWithRetry(model, systemPrompt, userMessage, MAX_RETRIES)`
7. Extrai JSON da resposta (linha 198): `extractJSONFromResponse(response)`
8. Valida estrutura (linhas 200-261): exatamente 4 narrativas, cada uma com campos obrigatórios, todos os 4 ângulos tribais presentes

**Validação rigorosa de narrativas (linhas 212-261):**
```typescript
// Campos obrigatórios: id, title, description, angle
// Campos opcionais preservados: hook, core_belief, status_quo_challenged (v4)
//                               viewpoint, whyUse, impact, tone, keywords (legacy)
// Ângulos obrigatórios: "herege", "visionario", "tradutor", "testemunha"
```

**Modelo:** `WIZARD_DEFAULT_MODEL = process.env.WIZARD_DEFAULT_MODEL || DEFAULT_TEXT_MODEL`

**Retry logic (linhas 594-643):**
```typescript
// llmCallWithRetry() — Exponential backoff
// MAX_RETRIES = 2 (3 tentativas no total)
// Delay: 2^attempt * 1000ms (1s, 2s, 4s)
// Detecta respostas vazias como erro retryable
// Temperature: 0.7 (fixo)
```

### 2.2. Geração de Conteúdo

**Arquivo:** `src/lib/wizard-services/llm.service.ts` — `generateContent()` (linhas 315-405)

**Fluxo similar a narrativas, mas com `structureGeneratedContent()` (linhas 416-570) que parseia por tipo:**

**Carousel v4.2 (linhas 440-493):**
```typescript
// Detecta formato novo: { capa, slides, legenda }
// capa → primeiro slide (titulo + subtitulo)
// slides[] → demais slides (numero, tipo, titulo, corpo, imagePrompt)
// legenda → caption
// Validação runtime via validateCarouselResponse()

// Fallback para formato antigo: { slides[], caption, hashtags, cta }
```

**Text (linhas 495-506):**
```typescript
// Espera { content: string, hashtags?, cta? }
```

**Image (linhas 508-524):**
```typescript
// Espera { imagePrompt: string, caption?, hashtags?, cta? }
// imagePrompt armazenado em metadata para uso posterior
// Nota: usa `as any` para metadata (linha 523) — type safety reduzida
```

**Video v4.4 (linhas 526-564):**
```typescript
// Formato legado: { script: string|array }
// Formato v4.4 (VideoScriptStructured): { meta, roteiro, thumbnail }
// Script inteiro armazenado como JSON string em 'script' field
// Nota: usa `as any` para metadata (linha 560) — type safety reduzida
```

### 2.3. Tratamento de Erros

| Cenário | Tratamento | Localização |
|---------|-----------|-------------|
| OpenRouter não configurado | Retorna `{ success: false, error }` | linhas 144-148 |
| LLM resposta vazia | Retry com backoff | linhas 611-622 |
| LLM erro de API | Retry com backoff | linhas 626-642 |
| JSON inválido na resposta | `extractJSONFromResponse()` tenta múltiplas estratégias de parsing | `prompts.ts` |
| Estrutura inválida | Throw Error com mensagem descritiva | linhas 200-260 |
| Ângulo tribal faltando | Throw Error listando ângulo faltante | linhas 250-260 |

**Problema potencial:** Erros no parsing JSON (resposta malformada do LLM) não disparam retry automaticamente — apenas erros de API ou respostas vazias são retried. Um JSON malformado após 3 tentativas resultará em erro para o usuário.

### 2.4. Modelos Disponíveis

**Arquivo:** `llm.service.ts` — `getAvailableWizardModels()` (linhas 660-669)

```typescript
return [
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.5",
  "google/gemini-3-pro-preview",
]
```

**Observação:** Lista estática de modelos hardcoded. Não sincroniza com `AVAILABLE_TEXT_MODELS` em `src/lib/ai/config.ts`. Pode ficar desatualizada conforme novos modelos são adicionados ao config.

---

## 3. Creative Studio — Análise Técnica

### 3.1. Geração de Imagem

**Arquivo:** `src/lib/creative-studio/openrouter-image.ts` — `generateCreativeImage()` (linhas 26-136)

**Fluxo:**
1. Verifica `OPENROUTER_API_KEY` (env, não user-provided) (linhas 31-34)
2. Monta `messages[]` com base em text2img ou img2img (linhas 39-62)
3. Fetch para `https://openrouter.ai/api/v1/chat/completions` (linhas 69-84)
4. Timeout: 2 minutos (AbortController) (linhas 64-65)
5. Extrai image URL da resposta (linhas 95-101)
6. Upload para storage provider (linhas 103-126)
7. Retorna `{ url, storageKey, timeMs }` (linhas 131-135)

**API call structure:**
```typescript
body: JSON.stringify({
  model: params.model,
  modalities: ["image", "text"],  // Solicita geração de imagem
  messages,
  max_tokens: 1000,
})
```

**Headers de segurança/identificação:**
```typescript
headers: {
  Authorization: `Bearer ${apiKey}`,      // API key do servidor
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
  "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
}
```

**Observação sobre API key:** A geração de imagem usa **sempre** a API key do servidor (`OPENROUTER_API_KEY`), não a API key do usuário (`userApiKeys`). Isso simplifica o fluxo mas centraliza o custo no operador da plataforma.

### 3.2. Extração de Imagem da Resposta

**Função:** `extractImageUrlFromResponse()` (linhas 142-202)

**Formatos suportados (em ordem de prioridade):**

1. **Gemini images array:** `choices[0].message.images[0].inlineData.data` (base64) ou `.url`
2. **Multimodal content array:** `choices[0].message.content[i].image_url.url` ou `.url`
3. **String content URL:** `choices[0].message.content` começando com `http://` ou `https://`
4. **String content JSON:** `JSON.parse(content).url` ou `.image`
5. **Top-level URL:** `response.url` ou `response.image`

**Build data URL helper (linhas 145-148):**
```typescript
const buildDataUrl = (base64: string, mimeType?: string): string => {
  const safeMimeType = mimeType && typeof mimeType === "string" ? mimeType : "image/png"
  return `data:${safeMimeType};base64,${base64}`
}
```

**Robustez:** A função é defensiva e lida com múltiplos formatos de resposta de diferentes provedores de modelo de imagem. Este é um padrão necessário dado a diversidade de APIs no OpenRouter.

### 3.3. Prompt Builder

**Arquivo:** `src/lib/creative-studio/prompt-builder.ts` — `buildCreativePrompt()` (linhas 38-125)

**Composição do prompt (6 camadas):**

```typescript
interface BuildCreativePromptParams {
  userPrompt?: string;           // Texto livre do usuário
  presetId?: string;             // Preset visual (ex: "minimalist")
  templateSlug?: string;         // Template com variáveis
  templateVars?: Record<string, string>; // Valores para template
  format?: string;               // Formato (1:1, 3:4, etc.)
  analysisData?: ImageAnalysis;  // Dados de análise de imagem (Modo Replicar)
}
```

**Camadas:**
1. **Preset** (linhas 45-53): `getPresetById(id)` → `preset.promptPrefix` + `preset.negativePrompt`
2. **Template** (linhas 56-62): `getTemplateBySlug(slug)` → `fillTemplate(template, vars)`
3. **User prompt** (linhas 65-67): Texto direto do usuário
4. **Analysis data** (linhas 70-101): Layout, cores, estilo, textos detectados (Modo Replicar)
5. **Format dimensions** (linhas 104-109): `getFormatDimensions(format)` → `widthxheight pixels`
6. **Quality suffix** (linhas 112-114): "High quality, professional, sharp details, well-composed."

**Saída:**
```typescript
interface BuiltPrompt {
  prompt: string;         // Camadas unidas por "\n\n"
  negativePrompt?: string; // Do preset, se disponível
}
```

**Lacuna documentada:** Nenhuma das 6 camadas consulta `userVariables`. A interface `BuildCreativePromptParams` não inclui parâmetros de marca/tom/público.

**Fix sugerido:**
```typescript
interface BuildCreativePromptParams {
  // ... campos existentes ...
  brandContext?: string;  // formatVariablesForPrompt() output
}

// Na função, entre camada 2 e 3:
if (params.brandContext?.trim()) {
  parts.push(`Brand context: ${params.brandContext.trim()}`);
}
```

### 3.4. Store do Creative Studio

**Arquivo:** `src/stores/creative-studio-store.ts`

**Interface de estado (linhas 12-63):**
```typescript
interface CreativeStudioState {
  mode: CreativeStudioMode;        // "create" | "vary" | "replicate"
  selectedFormats: string[];       // ["1:1"] default
  quantityPerFormat: number;       // 1 default
  selectedModel: string;           // DEFAULT_CREATIVE_MODEL
  selectedPreset: string | null;
  prompt: string;
  textMode: "ai_embedded" | "canvas_overlay" | null;
  textConfig: TextOverlayConfig | null;
  sourceImageUrl: string | null;   // Modo Variar
  sourceImageKey: string | null;
  variationType: "resize" | "restyle" | "inpaint" | null;
  variationStrength: number;       // 0.7 default
  referenceImageUrl: string | null; // Modo Replicar
  referenceImageKey: string | null;
  analysis: ImageAnalysis | null;
  userEdits: Record<string, unknown>;
  isGenerating: boolean;
  currentJobId: number | null;
  currentProjectId: number | null;
  outputs: CreativeOutput[];
}
```

**Sem persistência:** Diferente do Studio Store, o Creative Studio Store **não** usa `persist` middleware. Estado perdido ao recarregar a página. Isso pode ser intencional (geração é rápida) ou uma lacuna (prompt complexos perdidos).

**Sem middleware `devtools`:** Também não usa devtools. Dificulta debugging em desenvolvimento.

---

## 4. Editor Visual (Studio) — Análise Técnica

### 4.1. Store Architecture

**Arquivo:** `src/stores/studio-store.ts`

**Middlewares:**
```typescript
create<StudioStore>()(
  devtools(            // Redux DevTools support
    persist(           // localStorage persistence
      (set, get) => ({
        // ... implementation
      }),
      {
        name: "studio-store",
        version: 1,
        migrate: (state, version) => { /* 4:5 → 3:4 migration */ },
        partialize: (state) => ({
          // Persiste: contentType, aspectRatio, slides, activeSlideIndex,
          //           caption, hashtags, profile, header, projectTitle
          // NÃO persiste: isDirty, isSaving, isPublishing
        }),
      }
    ),
    { name: "StudioStore" }
  )
)
```

### 4.2. Gerenciamento de Slides

**Tipo de slide:**
```typescript
// StudioSlide (definido em src/lib/studio-templates/types.ts)
interface StudioSlide {
  id: string;              // crypto.randomUUID()
  template: FigmaTemplate; // Template visual
  content: SlideContent;   // Título, corpo, imagem, etc.
  style: SlideStyle;       // Fontes, cores, espaçamento
}
```

**Operações de slide:**

| Operação | Arquivo | Linhas | Notas |
|----------|---------|--------|-------|
| `addSlide()` | studio-store.ts | 112-137 | Verifica `MAX_SLIDES`, usa `getRecommendedTemplate()` |
| `removeSlide()` | studio-store.ts | 139-159 | Impede remover último slide, ajusta `activeSlideIndex` |
| `duplicateSlide()` | studio-store.ts | 161-183 | Deep copy de content e style, novo UUID |
| `moveSlide()` | studio-store.ts | 185-206 | Splice-based, valida bounds |
| `setActiveSlide()` | studio-store.ts | 208-213 | Valida bounds |

**Limite de slides:** `MAX_SLIDES` é importado de `src/lib/studio-templates/types.ts`. Este valor reflete o limite do Instagram para carrosséis.

**Recomendação de template:**
```typescript
// getRecommendedTemplate(insertIndex, totalSlides) — de types.ts
// Sugere template baseado na posição do slide no carrossel
// (ex: primeiro slide = capa, último = CTA)
```

### 4.3. Aplicação de Estilos

```typescript
// Individual
updateSlideStyle(slideId, { backgroundColor: "#000" })

// Global
applyStyleToAllSlides({ fontFamily: "Inter" })
// Aplica via map() sobre todos os slides (linha 247-255)
```

**Pattern:** Sempre gera novo array de slides (imutabilidade). O `set()` do Zustand faz shallow merge no state root.

### 4.4. Migração de Aspect Ratio

**De 4:5 para 3:4 (Feb 2026):**

```typescript
// No loadProject() — linhas 334-337
if ((projectState.aspectRatio as string) === "4:5") {
  projectState.aspectRatio = "3:4"
}

// No migrate() do persist — linhas 356-364
migrate: (persistedState, version) => {
  if (version === 0) {
    if (state.aspectRatio === "4:5") {
      state.aspectRatio = "3:4"
    }
  }
}
```

**Observação:** A migração existe em dois lugares (loadProject e persist.migrate). Isso é redundante mas seguro — cobre tanto projetos carregados explicitamente quanto dados restaurados do localStorage.

### 4.5. Selectors

```typescript
// Selectors otimizados para evitar re-renders desnecessários
useActiveSlide()    // state.slides[state.activeSlideIndex]
useSlides()         // state.slides
useProfile()        // state.profile
useHeader()         // state.header
useCanAddSlide()    // state.slides.length < MAX_SLIDES
useCanRemoveSlide() // state.slides.length > 1
```

**Pattern correto:** Selectors extraem slices mínimas do state, evitando re-renders em componentes que não dependem do slide ativo quando outro slide muda.

---

## 5. Sistema de Agentes — Análise Técnica

### 5.1. Definição dos Agentes

**Arquivo:** `src/lib/agents/prompts.ts`

**Prompts estáticos (`AGENT_SYSTEM_PROMPTS`):**

| Agente | Tamanho do Prompt | Seções |
|--------|------------------|--------|
| Zory | ~550 palavras | Identidade, Responsabilidades, Quando Sugerir, Formato |
| Estrategista | ~350 palavras | Identidade, Responsabilidades, Insights, Formato |
| Criador | ~350 palavras | Identidade, Responsabilidades, Antes de Criar, Formato |
| Calendário | ~350 palavras | Identidade, Responsabilidades, Antes de Agendar, Formato |

**Observação:** Os prompts mencionam comportamentos que dependem de contexto externo ("verifique estratégias ativas", "use posts anteriores como referência") mas **não fornecem mecanismo** para acessar essas informações. O agente "sabe" que deveria fazer isso mas não tem os dados.

### 5.2. Chat API Route

**Arquivo:** `src/app/api/chat/route.ts`

**Validação de input (linhas 36-56):**
```typescript
const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100).optional(),
  message: z.string().max(50000).optional(),
  model: z.string().max(100).optional(),
  agent: z.enum(["zory", "estrategista", "criador", "calendario"]).optional(),
  zepThreadId: z.string().max(200).nullable().optional(),
  categories: z.array(z.enum([...RAG_CATEGORIES])).max(20).optional(),
  useRag: z.boolean().optional(),
})
```

**Segurança:**
- `checkRateLimit(userId, "ai")` — Rate limiting por usuário (linha 130-131)
- Validação Zod para todos os inputs
- Modelo validado contra allowlist: `isTextModel(requestedModel)` (linha 154)
- Tamanho máximo de mensagem: 50.000 caracteres

**Fluxo do sistema prompt (3 caminhos):**

```
Caminho 1: Zep + RAG
  buildAgentSystemPrompt(zepThreadId, agent) + RAG context appended

Caminho 2: Sem Zep + Com RAG
  RAG_SYSTEM_PROMPT template com {RAG_CONTEXT} e {RAG_SOURCES_SUMMARY}

Caminho 3: Sem Zep + Sem RAG
  STANDARD_SYSTEM_PROMPT (fixo, ~2 frases)
```

**Problema no Caminho 2:** O `RAG_SYSTEM_PROMPT` (linhas 87-97) é genérico:
```
"Você é um assistente especialista em criação de conteúdo para redes sociais."
```
Não utiliza o prompt específico do agente selecionado. Se o usuário está falando com o Estrategista mas o Zep não está configurado, o agente perde sua personalidade.

**Fix sugerido:**
```typescript
// Linha 247 — Combinar prompt do agente com RAG
const agentPrompt = getSystemPrompt(agent)
systemPrompt = ragUsed
  ? `${agentPrompt}\n\n${RAG_SYSTEM_PROMPT
      .replace("{RAG_CONTEXT}", ragContext)
      .replace("{RAG_SOURCES_SUMMARY}", sourceSummary)}`
  : agentPrompt
```

### 5.3. Streaming e Resposta

```typescript
// streamText() com Vercel AI SDK (linhas 267-272)
const result = streamText({
  model: openrouter(model),
  system: systemPromptWithRag,
  messages: modelMessages,       // convertToModelMessages() para format correto
  temperature: 0.7,
})

// Resposta como UI message stream (linhas 285-297)
result.toUIMessageStreamResponse({
  headers: {
    "X-RAG-Used": "true",          // Metadata para o frontend
    "X-RAG-Chunks": count,
    "X-RAG-Sources": JSON.stringify(sources),
    "X-Agent": agent,
    "X-Zep-Configured": "true/false",
  }
})
```

**Integração com Zep (async, non-blocking):**
```typescript
// Linha 277 — Fire-and-forget
addMessageToThread(zepThreadId, "user", userMessage, { agent, model })
  .catch(err => console.error("Failed to save:", err))
```

---

## 6. Problemas Técnicos Específicos

### 6.1. Desconexão Wizard → Studio — Severidade: Alta (UX)

**Problema:** Conteúdo gerado pelo Wizard (`GeneratedContent` com slides, caption, hashtags) não tem pathway programático para popular o Studio Store.

**Estado atual:** O `GeneratedContent` contém:
```typescript
{
  type: "carousel",
  slides: Array<{ title, content, imagePrompt? }>,
  caption?: string,
  hashtags?: string[],
  cta?: string,
  metadata: { narrativeId, narrativeTitle, narrativeAngle, model, generatedAt, ragUsed }
}
```

O Studio Store espera:
```typescript
{
  slides: Array<StudioSlide>,  // Mais complexo: id, template, content, style
  caption: string,
  hashtags: string[],
  // + profile, header, aspectRatio, etc.
}
```

**Gap:** Não existe função de conversão `GeneratedContent → StudioState`. Seria necessário:
1. Mapear `slides[]` do Wizard para `StudioSlide[]` com templates default
2. Copiar `caption`, `hashtags`
3. Preservar `imagePrompt` de cada slide para geração posterior
4. Chamar `loadProject()` do Studio Store

### 6.2. Creative Studio sem Variáveis de Marca — Severidade: Alta

**Detalhado na Seção 3.3.** O `BuildCreativePromptParams` não inclui campo para variáveis do usuário.

### 6.3. Prompts de Agentes sem Contexto de Marca (sem Zep) — Severidade: Média-Alta

**Problema:** Quando Zep não está configurado (que é o caso para muitos deployments), os agentes usam prompts completamente genéricos que não refletem a marca do usuário.

**Arquivo:** `src/app/api/chat/route.ts`, linhas 246-254

**Impacto adicional:** Mesmo o `STANDARD_SYSTEM_PROMPT` (sem RAG) é extremamente curto (2 linhas). O agente selecionado (Estrategista, Criador, etc.) perde toda sua personalidade neste caminho.

### 6.4. Type Safety Reduzida em Metadata — Severidade: Baixa

**Arquivos:** `src/lib/wizard-services/llm.service.ts`, linhas 523, 560

```typescript
// Image metadata
metadata: {
  ...baseMetadata,
  imagePrompt: response.imagePrompt,
} as any,  // ← Type safety perdida

// Video metadata (v4.4)
metadata: {
  ...baseMetadata,
  script: videoScript,
} as any,  // ← Type safety perdida
```

**Fix:** Estender a interface `GeneratedContent.metadata` para incluir campos opcionais:
```typescript
interface ContentMetadata {
  // ... campos base ...
  imagePrompt?: string;
  throughline?: string;
  valor_central?: string;
  script?: VideoScriptStructured;
}
```

### 6.5. Lista de Modelos do Wizard Hardcoded — Severidade: Baixa

**Arquivo:** `llm.service.ts`, linhas 662-668

A lista de modelos disponíveis para o Wizard é estática e independente de `AVAILABLE_TEXT_MODELS` em `config.ts`. Novos modelos adicionados ao config não aparecem automaticamente no Wizard.

**Fix:** Importar e usar `getTextModels()` de `src/lib/ai/config.ts`.

### 6.6. Creative Studio Store sem Persistência — Severidade: Baixa-Média

**Arquivo:** `src/stores/creative-studio-store.ts`

O store usa `create()` simples sem `persist`. Um reload da página durante configuração de um prompt complexo perde todo o trabalho.

**Consideração:** Pode ser intencional — geração de imagem é rápida e o resultado (output URLs) é armazenado no servidor. Mas prompts longos e configurações de preset/template são perdidos.

---

## 7. Mapa Completo de Arquivos

### 7.1. Wizard de Criação

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/wizard-services/llm.service.ts` | Geração de narrativas e conteúdo via LLM |
| `src/lib/wizard-services/prompts.ts` | Templates de prompts para narrativas e conteúdo |
| `src/lib/wizard-services/types.ts` | Tipos: NarrativeOption, GeneratedContent, etc. |
| `src/lib/wizard-services/user-variables.service.ts` | CRUD e formatação de variáveis do usuário |
| `src/lib/wizard-services/validation.ts` | Validação de respostas do LLM (carousel v4.2) |

### 7.2. Creative Studio

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/creative-studio/openrouter-image.ts` | Chamada API OpenRouter para geração de imagem |
| `src/lib/creative-studio/prompt-builder.ts` | Composição de prompts (preset + template + user + analysis) |
| `src/lib/creative-studio/presets.ts` | Presets visuais (minimalista, bold, etc.) |
| `src/lib/creative-studio/templates.ts` | Templates com variáveis substituíveis |
| `src/lib/creative-studio/constants.ts` | Formatos, dimensões, modelo padrão |
| `src/lib/creative-studio/types.ts` | Tipos: ImageAnalysis, TextOverlayConfig, etc. |
| `src/stores/creative-studio-store.ts` | Estado Zustand (sem persist) |

### 7.3. Editor Visual (Studio)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/stores/studio-store.ts` | Estado Zustand (com persist + devtools) |
| `src/lib/studio-templates/types.ts` | Tipos: StudioSlide, FigmaTemplate, MAX_SLIDES |

### 7.4. Agentes

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/agents/prompts.ts` | System prompts dos 4 agentes |
| `src/lib/agents/types.ts` | Tipos: AgentType |
| `src/app/api/chat/route.ts` | API route do chat com streaming |
| `src/lib/zep/` | Integração Zep (memória, grafos, sessões) |

---

## 8. Métricas de Qualidade do Código

### 8.1. Pontos Positivos

- **Validação estruturada:** `validateCarouselResponse()` garante integridade do conteúdo gerado
- **Pattern de retry:** Exponential backoff no Wizard é robusto e bem implementado
- **Zustand patterns:** Studio Store usa `partialize` para controlar o que persiste, `devtools` para debug
- **Imutabilidade:** Todas as operações de slide geram novos arrays (pattern correto)
- **Selectors otimizados:** Evitam re-renders desnecessários
- **Persistência inteligente:** Flags de loading não persistidas
- **Extraction robusta:** `extractImageUrlFromResponse()` lida com múltiplos formatos de provedores
- **Segurança no chat:** Validação Zod, rate limiting, model allowlist

### 8.2. Pontos de Atenção

- **`as any` em metadata:** Perda de type safety em 2 pontos do Wizard
- **Modelos hardcoded:** Lista de modelos do Wizard diverge do config central
- **Prompt do agente perdido:** Sem Zep, agentes perdem personalidade no caminho RAG
- **TODO no código:** `studio-store.ts` linha 343: "Consider migrating to activeSlideId" — fragilidade reconhecida
- **Sem testes unitários visíveis:** As funções de validação, parsing JSON, e composição de prompt não têm testes associados nos arquivos examinados

---

## 9. Recomendações Técnicas Priorizadas

### P0 — Imediato

1. **Injetar variáveis no Creative Studio prompt builder**
   - Adicionar `brandContext?: string` em `BuildCreativePromptParams`
   - No caller, chamar `formatVariablesForPrompt()` e passar resultado
   - ~10 linhas de mudança no prompt-builder.ts + ~5 no caller

2. **Preservar prompt do agente sem Zep**
   - No caminho 2 e 3 do chat route, usar `getSystemPrompt(agent)` como base
   - Append RAG context ao prompt do agente, não substituí-lo

3. **Injetar variáveis no chat API route**
   - (Já detalhado no Relatório 2)

### P1 — Próximo trimestre

4. **Criar bridge Wizard → Studio**
   - Função `wizardContentToStudioState(content: GeneratedContent): Partial<StudioState>`
   - Mapear slides, preservar imagePrompt, copiar caption/hashtags
   - Botão "Editar no Studio" na UI do Wizard

5. **Adicionar persistência ao Creative Studio Store**
   - Adicionar `persist` middleware com `partialize` (persistir prompt, preset, model)
   - Não persistir outputs, isGenerating, sourceImage

6. **Unificar lista de modelos**
   - Wizard usar `getTextModels()` do config central
   - Creative Studio usar `getImageModels()` do config central

### P2 — Evolução

7. **Geração de imagem inline no Studio**
   - Cada slide com `imagePrompt` pode disparar geração diretamente
   - Usar prompt do Wizard + variáveis da marca + contexto do slide

8. **Type safety completa**
   - Eliminar `as any` estendendo interfaces de metadata
   - Adicionar tipos discriminated unions para VideoScriptStructured

9. **Integrar agentes com editores**
   - Tool calling: agente Criador gera conteúdo e dispara projeto no Studio
   - Requer implementação de function/tool calling no streamText()

---

*Este relatório foi gerado via análise estática do código-fonte. Todas as referências de arquivo e linha foram verificadas contra o estado atual do repositório.*
