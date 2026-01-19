# Wizard de Criação - Patterns

> **Status**: Implementação completa com Synthesizer v3.1 e Image Generation (Janeiro 2026)
> **Última atualização**: Promoções v4.1 (Carousel), v2.0 (Image/Video) integrados

## Visão Geral

O Wizard de Criação é um fluxo multi-step para criação de conteúdo para redes sociais usando IA. Consiste em 5 etapas principais: **Inputs → Processing → Synthesizer → Narratives → Generation → Image Generation**.

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
    │   ├── step-3-narratives.tsx    # Seleção de narrativa + síntese
    │   ├── step-4-generation.tsx    # Preview e salvamento
    │   └── step-5-image-generation.tsx # Geração de imagens (NOVO)
    └── shared/
        ├── document-config-form.tsx # Configuração RAG
        ├── narrative-card.tsx        # Card de narrativa
        ├── synthesis-summary.tsx    # Resumo da pesquisa (NOVO)
        ├── image-generation-options.tsx # Opções de imagem (NOVO)
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

## Synthesizer v3.1 - Pesquisa Estruturada

**Localização**: `src/lib/wizard-services/synthesizer.service.ts`

O Synthesizer é uma etapa intermediária crítica que transforma resultados brutos do Tavily em campos de pesquisa estruturados antes da geração de narrativas.

### Fluxo do Synthesizer

```
Tavily Raw Results → SYNTHESIZER (LLM) → SynthesizedResearch → Narratives
```

### Tipos v3.1

```typescript
export interface SynthesizedResearch {
  resumo_executivo: string;              // Executive summary
  throughlines_potenciais: ThroughlinePotencial[];  // 3-5 throughlines
  tensoes_narrativas: TensoesNarrativa[];          // Tensões para engagement
  dados_contextualizados: DadoContextualizado[];   // Dados prontos para usar
  exemplos_narrativos: ExemploNarrativo[];         // Histórias completas
  erros_armadilhas: ErroArmadilha[];               // Contra-intuitivos
  frameworks_metodos: FrameworkMetodoV3[];         // Frameworks validados
  hooks: Hook[];                                     // Ganchos para slides
  progressao_sugerida: ProgressaoSugeridaV3;       // Estrutura 3 atos
  perguntas_respondidas: string[];                  // Para open loops
  gaps_oportunidades: string[];                     // O que a pesquisa não cobriu
  sources: string[];                                 // Fontes da pesquisa
}

export interface ThroughlinePotencial {
  throughline: string;           // Frase central (10-25 palavras)
  potencial_viral: string;        // Por que funciona (v3.1)
  justificativa: string;          // Racional (v3.1)
  slides_sugeridos?: number[];   // Onde usar
}
```

### Campo Renomeados (v3.1)

| v3.0 | v3.1 | Descrição |
|------|------|-----------|
| `por_que_funciona` | `potencial_viral` | Por que o throughline é viral |
| `como_reforcar` | `justificativa` | Justificativa do throughline |
| `por_que_engaja` | `tipo` | Tipo de tensão |
| `como_explorar` | `uso_sugerido` | Como usar a tensão |
| `dado` | `frase_pronta` | Frase pronta com dado |
| `implicacao_pratica` | `contraste` | Elemento de contraste |

### ProgressaoSugeridaV3 Structure

```typescript
export interface ProgressaoSugeridaV3 {
  ato1_captura: {
    gancho_principal: string;
    tensao_inicial: string;
    promessa: string;
  };
  ato2_desenvolvimento: string[];    // Array de beats narrativos
  ato3_resolucao: {
    verdade_central: string;
    call_to_action_natural: string;
  };
}
```

## Image Generation - Geração de Imagens

**Localização**: `src/lib/wizard-services/image-generation.service.ts` + `screenshotone.service.ts`

Sistema de geração de imagens com dois métodos: AI Generation (OpenRouter) e HTML Templates (ScreenshotOne).

### Métodos Disponíveis

| Método | Descrição | Quando Usar |
|--------|-----------|-------------|
| **AI Generation** | Imagens via OpenRouter (Gemini, GPT-5 Image, etc.) | Qualidade máxima, criativo |
| **HTML Template** | Templates renderizados via ScreenshotOne | Fallback, consistência visual |

### Modelos de Imagem Disponíveis

```typescript
const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
}
```

### ScreenshotOne Configuration

**Importante**: Use o **Access Key** (não o Secret Key) para autenticação padrão:

```env
SCREENSHOT_ONE_ACCESS_KEY=seu-access-key-aqui
# SCREENSHOT_ONE_SECRET_KEY=opcional-apenas-para-urls-publicas-assinadas
```

**Por que Access Key?**
- Uso server-side (nosso caso)
- Imagens retornadas diretamente, não URLs públicas
- Secret Key só é necessária para compartilhar URLs em `<img>` tags

### HTML Templates (18 opções)

```typescript
const HTML_TEMPLATES = {
  // Gradient-based
  GRADIENT_SOLID: "gradiente-solid",
  GRADIENT_LINEAR: "gradiente-linear",
  GRADIENT_RADIAL: "gradiente-radial",
  GRADIENT_MESH: "gradiente-mesh",

  // Typography
  TYPOGRAPHY_BOLD: "tipografia-bold",
  TYPOGRAPHY_CLEAN: "tipografia-clean",
  TYPOGRAPHY_OVERLAY: "tipografia-overlay",

  // Patterns
  PATTERN_GEOMETRIC: "padrão-geométrico",
  PATTERN_DOTS: "padrão-círculos",
  PATTERN_LINES: "padrão-linhas",
  PATTERN_WAVES: "padrão-ondas",

  // Styles
  GLASSMORPHISM: "glassmorphism",
  NEOMORPHISM: "neomorphism",
  BRUTALIST: "brutalista",
  NEUMORPHISM: "neumorphism",

  // Themes
  DARK_MODE: "dark-mode",
  LIGHT_MODE: "light-mode",
  NEON_GLOW: "neon-glow",
  SUNSET_VIBES: "sunset-vibes",
}
```

### Tipos de Geração de Imagem

```typescript
export interface ImageGenerationConfig {
  method: "ai" | "html-template";
  aiOptions?: AiImageOptions;      // Para AI generation
  htmlOptions?: HtmlTemplateOptions; // Para HTML templates
}

export interface AiImageOptions {
  model: AiImageModel;
  color: ColorOption;              // vibrante, pastel, neon, etc.
  customColor?: string;            // Hex quando color="personalizado"
  style: VisualStyle;              // minimalista, moderno, etc.
  composition?: CompositionOption;
  mood?: MoodOption;
  additionalContext?: string;
}

export interface HtmlTemplateOptions {
  template: HtmlTemplate;
  primaryColor: string;            // Hex obrigatório
  secondaryColor?: string;         // Hex opcional
  backgroundColor?: string;        // Hex opcional
  textColor?: string;              // Hex opcional
  overlay?: boolean;
  opacity?: number;                // 0-1
}
```

### Padrão de Fallback

```typescript
// Tenta AI primeiro, fallback para HTML template
async function generateImageWithFallback(input) {
  const aiResult = await generateAiImage(input);
  if (aiResult.success) return aiResult;

  // Fallback para ScreenshotOne HTML template
  return await generateHtmlTemplateImage(input);
}
```

## Prompts v4.1 / v2.0

**Localização**: `src/lib/wizard-services/prompts.ts`

Atualização dos prompts com tags XML e integração Synthesizer v3:

### Carousel v4.1

- Tags XML: `<identidade>`, `<filosofia_central>`, `<sistema_throughline>`, etc.
- Integração com `throughlines_potenciais[]`, `tensoes_narrativas[]`, `dados_contextualizados[]`
- ProgressaoSugeridaV3 structure

### Image Post v2.0

- Tags XML: `<identidade>`, `<filosofia>`, `<framework_imagem>`, `<framework_legenda>`
- Estrutura HCCA: Hook → Contexto → Conteúdo → Ação
- Técnicas de retenção: Pattern Interrupt, Curiosity Gap, Social Proof

### Video Script v2.0

- Tags XML: `<identidade>`, `<filosofia>`, `<framework_hooks>`, `<framework_estrutura>`
- 5 estruturas: Problema-Solução, Lista/Dicas, Storytelling, Polêmica, Tutorial
- Otimização para retenção nos primeiros 3 segundos

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
| **Synthesizer** | ✅ | v3.1 pesquisa estruturada | `synthesizer.service.ts` |
| **Image Gen** | ✅ | AI + HTML templates | `image-generation.service.ts` |
| **ScreenshotOne** | ✅ | HTML rendering | `screenshotone.service.ts` |

### Estrutura dos Wizard Services

```
src/lib/wizard-services/
├── types.ts                    # Interfaces: NarrativeAngle, ContentType, ServiceResult
├── synthesis-types.ts          # Synthesizer v3.1 types
├── image-types.ts              # Image generation types
├── prompts.ts                  # Prompts isolados por tipo (v4.1/v2.0)
├── llm.service.ts              # generateNarratives(), generateContent() com retry
├── rag.service.ts              # generateWizardRagContext(), formatRagForPrompt()
├── synthesizer.service.ts      # synthesizeResearch() - Tavily → Estruturado
├── firecrawl.service.ts        # extractFromUrl(), extractFromMultipleUrls()
├── tavily.service.ts           # contextualSearch(), searchTrends()
├── apify.service.ts            # transcribeYouTube(), transcribeMultipleVideos()
├── image-generation.service.ts # AI image generation via OpenRouter
├── screenshotone.service.ts   # HTML template rendering (18 templates)
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
export function getNarrativesSystemPrompt(): string         // v1.0
export function getCarouselPrompt(params: { ... }): string   // v4.1
export function getTextPrompt(params: { ... }): string       // v1.0
export function getImagePrompt(params: { ... }): string      // v2.0
export function getVideoPrompt(params: { ... }): string       // v2.0
```

**Versões dos Prompts:**
- **Carousel v4.1**: Tags XML, integração Synthesizer v3.1, ProgressaoSugeridaV3
- **Image Post v2.0**: HCCA structure, técnicas de retenção
- **Video Script v2.0**: 5 estruturas, otimização 3 segundos

**IMPORTANTE**: Para alterar prompts de um tipo específico, edite apenas a função correspondente em `prompts.ts`.

### Seletor de Modelos de IA

**Localização**: `step-1-inputs.tsx` → CollapsibleSection "6. Configurações de IA"

- Usa `TEXT_MODELS` de `@/lib/models` (OpenRouter)
- Agrupa por provider: OpenAI, Anthropic, Google, xAI
- Dropdown com AnimatePresence para animações suaves
- Badge mostrando modelo selecionado
- Valor padrão: `openai/gpt-5.2`

## Worker System - Development vs Production

### Auto-Trigger Pattern

**Problema:** Vercel Cron (`vercel.json`) só funciona em produção. Em desenvolvimento, o worker nunca é acionado.

**Solução:** Auto-trigger do worker após criar jobs em modo de desenvolvimento:

```typescript
// src/app/api/wizard/[id]/submit/route.ts
import { triggerWorker } from "@/lib/queue/client";

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

// Após criar job (narratives ou generation)
if (isDevelopment()) {
  // Fire and forget - don't wait for completion
  triggerWorker().catch((err) => {
    console.error("Failed to trigger worker in development:", err);
  });
}
```

### Worker Authentication

O endpoint `/api/workers` usa `WORKER_SECRET` em vez de Clerk auth:

```typescript
// src/proxy.ts
const isWorkerRoute = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname === "/api/workers";
};

export default clerkMiddleware(async (auth, request) => {
  // Allow worker endpoint to bypass Clerk auth (uses WORKER_SECRET instead)
  if (isWorkerRoute(request)) {
    return NextResponse.next();
  }
  // ... rest of middleware
});
```

### Queue Debugging

**Problema:** Jobs antigos acumulados no Redis bloqueiam jobs novos (FIFO).

**Solução:** Limpar jobs pending antigos e filas Redis:

```typescript
// Delete old pending jobs
await sql`DELETE FROM jobs WHERE status = 'pending' AND id < ${currentJobId}`;

// Clear Redis queues
await redis.del('jobs:pending');
await redis.del('jobs:processing');
```

**Trigger manual do worker (debug):**
```bash
curl -X POST http://localhost:3000/api/workers \
  -H "Authorization: Bearer dev-secret-change-in-production"
```

### triggerWorker() Helper

**Localização:** `src/lib/queue/client.ts`

```typescript
export async function triggerWorker(options?: {
  waitForJobId?: number;
  timeoutMs?: number;
}): Promise<{
  success: boolean;
  message: string;
  jobId?: number;
  result?: unknown;
}>
```

**Uso:**
- `triggerWorker()` - Fire and forget
- `triggerWorker({ waitForJobId: 123 })` - Aguarda conclusão do job

## JSONB Parsing Pattern

**Problema:** PostgreSQL JSONB columns podem ser retornados como objetos JavaScript, não strings.

**Solução:** Sempre verificar tipo antes de `JSON.parse()`:

```typescript
// ❌ ERRADO
const content = JSON.parse(wizard.generatedContent)

// ✅ CORRETO
const content = typeof wizard.generatedContent === 'string'
  ? JSON.parse(wizard.generatedContent)
  : wizard.generatedContent
```

**Por que isso acontece:**
- `response.json()` já faz o parse da resposta HTTP
- Drizzle ORM retorna JSONB como objetos JavaScript
- JSON armazenado como string vem como string

## Referências

- Documento completo: `.context/docs/development-plan/dev-wizard.md`
- Architecture: `.context/docs/architecture.md`
- Wizard Services: `src/lib/wizard-services/`
- Queue System: `.serena/memories/queue-patterns.md`
- Erro JSON.parse: `.context/docs/known-and-corrected-errors/032-json-parse-object-error.md`
