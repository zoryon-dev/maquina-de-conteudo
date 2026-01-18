# Wizard de Criação - Patterns

> **Status**: Implementação completa com refatoração visual (Janeiro 2026)

## Visão Geral

O Wizard de Criação é um fluxo multi-step para criação de conteúdo para redes sociais usando IA. Consiste em 4 etapas principais: Inputs → Processing → Narratives → Generation.

## Estrutura de Arquivos

```
src/app/(app)/wizard/
├── page.tsx                          # Server Component entry point
└── components/
    ├── wizard-page.tsx               # Client orchestrator
    ├── wizard-dialog.tsx             # Modal wrapper (opcional)
    ├── steps/
    │   ├── step-1-inputs.tsx        # Formulário de briefing
    │   ├── step-2-processing.tsx    # Polling de progresso
    │   ├── step-3-narratives.tsx    # Seleção de narrativa
    │   └── step-4-generation.tsx    # Preview e salvamento
    └── shared/
        ├── document-config-form.tsx # Configuração RAG
        ├── narrative-card.tsx        # Card de narrativa
        └── wizard-steps-indicator.tsx # Indicador de progresso
```

## Componentes UI

### CollapsibleSection

**Localização**: `/src/components/ui/collapsible.tsx`

Componente reutilizável para seções expansíveis com Radix UI e Framer Motion:

```tsx
<CollapsibleSection
  title="Título da Seção"
  description="Descrição opcional"
  icon={IconComponent}
  defaultOpen={true}
>
  {children}
</CollapsibleSection>
```

**Propriedades**:
- `title`: string (obrigatório)
- `description?`: string
- `icon?`: React.ElementType
- `defaultOpen?`: boolean (padrão: true)
- `children`: React.ReactNode

## Padrões Visuais Importantes

### Inputs com Background Gradiente

**Problema**: Em páginas com background gradiente customizado (sem classe `.dark`), os tokens do Tailwind v4 (`border-input`, `text-muted-foreground`) não funcionam.

**Solução**: Usar cores explícitas com `!important`:

```tsx
<Input
  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
/>
```

**Classes padrão para inputs em dark mode sem classe `.dark`**:
- `!border-white/10` - borda visível sutil
- `!bg-white/[0.02]` - fundo semi-transparente
- `!text-white` - texto branco
- `!placeholder:text-white/40` - placeholder visível
- `focus-visible:!border-primary/50` - foco com cor primária

### Layout Grid para Forms

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div className="space-y-4">
    {/* Coluna esquerda */}
  </div>
  <div className="space-y-4">
    {/* Coluna direita */}
  </div>
</div>
```

## Tipos de Dados

### WizardFormData

```typescript
export interface WizardFormData {
  contentType?: PostType;
  numberOfSlides?: number;
  model?: string;
  referenceUrl?: string;
  referenceVideoUrl?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: RagConfig;
  negativeTerms?: string[];
  selectedNarrativeId?: string;
  customInstructions?: string;
}
```

### Narrative (Step 3)

```typescript
export interface Narrative {
  id: string;
  title: string;
  description: string;
  angle: "criativo" | "estrategico" | "dinamico" | "inspirador";
  content: string;
}

export interface RagConfig {
  mode?: "auto" | "manual";
  threshold?: number;
  maxChunks?: number;
  documents?: number[];
  collections?: number[];
}
```

### GeneratedContent (Step 4)

```typescript
export interface GeneratedContent {
  type: PostType;
  slides: GeneratedSlide[];
  caption?: string;
  hashtags?: string[];
  cta?: string;
  metadata?: {
    narrative?: string;
    model?: string;
    generatedAt?: string;
  };
}

export interface GeneratedSlide {
  title?: string;
  content: string;
  imagePrompt?: string;
}
```

## API Routes

### POST /api/wizard
Cria novo wizard com estado inicial "input".

### GET /api/wizard/[id]
Retorna dados completos do wizard.

### PATCH /api/wizard/[id]
Atualiza dados do wizard (auto-save, transições).

### POST /api/wizard/[id]/submit
Dispara jobs:
- `submitType: "narratives"` → Job WIZARD_NARRATIVES
- `submitType: "generation"` → Job WIZARD_GENERATION

## States do Wizard

| State | Descrição |
|-------|------------|
| `input` | Usuário preenchendo formulário inicial |
| `processing` | Gerando narrativas em background |
| `narratives` | Usuário selecionando narrativa |
| `generation` | Gerando conteúdo final |
| `completed` | Conteúdo pronto |
| `abandoned` | Usuário abandonou o fluxo |

## Integrações Implementadas ✅

Todas as integrações foram implementadas em Janeiro 2026 via módulo `src/lib/wizard-services/`:

| Integração | Status | Serviço | Arquivo |
|------------|--------|---------|---------|
| **Firecrawl** | ✅ | Web scraping | `firecrawl.service.ts` |
| **Apify** | ✅ | YouTube transcription | `apify.service.ts` |
| **Tavily** | ✅ | Contextual search | `tavily.service.ts` |
| **OpenRouter** | ✅ | LLM generation | `llm.service.ts` |
| **Voyage AI** | ✅ | RAG embeddings | `rag.service.ts` |

### Estrutura dos Wizard Services

```
src/lib/wizard-services/
├── types.ts                    # Interfaces: NarrativeAngle, ContentType, ServiceResult
├── prompts.ts                  # Prompts isolados por tipo (carousel, text, image, video)
├── llm.service.ts              # generateNarratives(), generateContent() com retry
├── rag.service.ts              # generateWizardRagContext(), formatRagForPrompt()
├── firecrawl.service.ts        # extractFromUrl(), extractFromMultipleUrls()
├── tavily.service.ts           # contextualSearch(), searchTrends()
├── apify.service.ts            # transcribeYouTube(), transcribeMultipleVideos()
└── index.ts                    # Barrel exports + getWizardServicesStatus()
```

### Padrão de Graceful Degradation

Serviços opcionais (Firecrawl, Tavily, Apify) retornam `null` se não configurados:

```typescript
const result = await extractFromUrl(referenceUrl)
if (result.success && result.data) {
  extractedContent = result.data.content
}
// Se não configurado: result.success = true, result.data = null
```

### Padrão de Prompts Isolados

Cada tipo de conteúdo tem sua própria função de prompt:

```typescript
// src/lib/wizard-services/prompts.ts
export function getCarouselPrompt(params: {
  theme, context, objective, cta, targetAudience, ...
}): string

export function getTextPrompt(params: { ... }): string
export function getImagePrompt(params: { ... }): string
export function getVideoPrompt(params: { ... }): string
```

**IMPORTANTE**: Para alterar prompts de um tipo específico, edite apenas a função correspondente em `prompts.ts`.

### Seletor de Modelos de IA

**Localização**: `step-1-inputs.tsx` → CollapsibleSection "6. Configurações de IA"

- Usa `TEXT_MODELS` de `@/lib/models` (OpenRouter)
- Agrupa por provider: OpenAI, Anthropic, Google, xAI
- Dropdown com AnimatePresence para animações suaves
- Badge mostrando modelo selecionado
- Valor padrão: `openai/gpt-5.2`

## Referências

- Documento completo: `.context/docs/development-plan/dev-wizard.md`
- Architecture: `.context/docs/architecture.md`
- Wizard Services: `src/lib/wizard-services/`
