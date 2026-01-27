# 📋 Plano de Implementação - Wizard de Criação

> **Status**: ✅ Implementação Concluída (Janeiro 2026)
> **Fase 2 (Image Generation)**: Em implementação

Este documento descreve o plano completo para o Wizard de Criação, que foi implementado seguindo as 10 fases abaixo, mais a Fase 2 de geração de imagens.

## Status de Implementação por Fase

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Schema do Banco de Dados | ✅ |
| 2 | Queue Types | ✅ |
| 3 | API Routes | ✅ |
| 4 | Shared Components | ✅ |
| 5 | Step 1 - Inputs | ✅ |
| 6 | Step 2 - Processing | ✅ |
| 7 | Step 3 - Narratives | ✅ |
| 8 | Step 4 - Generation | ✅ |
| 9 | Orchestrator Components | ✅ |
| 10 | Worker Handlers | ✅ |
| 2 | **Phase 2 - Image Generation** | 🔄 Em progresso |

## 1. Estrutura de Arquivos Implementada

```
src/
├── app/(app)/wizard/
│   └── components/
│       ├── wizard-page.tsx              # ✅ Client orchestrator (full-page)
│       ├── wizard-dialog.tsx            # ✅ Modal wrapper with hooks
│       ├── steps/
│       │   ├── step-1-inputs.tsx        # ✅ Formulário briefing (refatorado Jan 2026)
│       │   ├── step-2-processing.tsx    # ✅ Loading/polling
│       │   ├── step-3-narratives.tsx    # ✅ Cards de narrativa + síntese (atualizado Jan 2026)
│       │   ├── step-4-generation.tsx    # ✅ Preview + save
│       │   └── step-5-image-generation.tsx # 🔄 Phase 2: Geração de imagens
│       └── shared/
│           ├── document-config-form.tsx     # ✅ RAG configuration
│           ├── narrative-card.tsx            # ✅ Card individual
│           ├── synthesis-summary.tsx       # 🔄 Phase 2: Resumo da pesquisa
│           ├── image-generation-options.tsx # 🔄 Phase 2: Opções de imagem
│           └── wizard-steps-indicator.tsx    # ✅ Progress indicator
│
├── components/ui/
│   └── collapsible.tsx                    # ✅ CollapsibleSection component
│
├── app/api/wizard/
│   ├── route.ts                        # ✅ GET (list), POST (create)
│   └── [id]/
│       ├── route.ts                    # ✅ GET, PATCH, DELETE
│       └── submit/route.ts             # ✅ POST (trigger jobs)
│
├── lib/queue/
│   └── types.ts                       # ✅ + WIZARD_NARRATIVES, WIZARD_GENERATION, WIZARD_IMAGE_GEN
│
├── lib/wizard-services/
│   ├── types.ts                        # ✅ Shared interfaces
│   ├── synthesis-types.ts              # 🔄 Phase 2: Synthesizer v3.1 types
│   ├── image-types.ts                  # 🔄 Phase 2: Image generation types
│   ├── prompts.ts                      # ✅ Prompts (v4.1 carousel, v2.0 image/video)
│   ├── llm.service.ts                  # ✅ LLM generation
│   ├── rag.service.ts                  # ✅ RAG wrapper
│   ├── synthesizer.service.ts          # 🔄 Phase 2: Research synthesis v3.1
│   ├── image-generation.service.ts     # 🔄 Phase 2: AI image generation
│   ├── screenshotone.service.ts        # 🔄 Phase 2: HTML template rendering
│   ├── firecrawl.service.ts            # ✅ Web scraping
│   ├── tavily.service.ts               # ✅ Contextual search
│   ├── apify.service.ts                # ✅ YouTube transcription
│   └── index.ts                        # ✅ Barrel exports
│
└── app/api/workers/
    └── route.ts                        # ✅ + wizard_narratives, wizard_generation, wizard_image_gen handlers
```

## Componentes Criados

### WizardPage (`wizard-page.tsx`)
- **Props**: `wizardId?`, `initialStep?`, `onComplete?`, `onClose?`, `className?`
- **State Management**: Gerencia todo o estado do wizard (currentStep, formData, isSubmitting)
- **Auto-save**: Debounced auto-save a cada 1 segundo de inatividade
- **Step Transitions**: Navegação entre input → processing → narratives → generation

### WizardDialog (`wizard-dialog.tsx`)
- **Components**: `WizardDialog`, `useWizardDialog()`, `WizardDialogWithTrigger`
- **Features**: Modal full-screen, backdrop blur, escape key suport
- **Usage**:
  ```tsx
  const { isOpen, openWizard, closeWizard } = useWizardDialog();
  ```

### Step 1 - Inputs (`step-1-inputs.tsx`)
- **Form Fields**: contentType, numberOfSlides, referenceUrl, referenceVideoUrl, theme, context, objective, cta, targetAudience, negativeTerms
- **Validation**: Requer contentType selecionado
- **Visual Design** (Refatorado Jan 2026):
  - Layout em grid 2-colunas com `CollapsibleSection`
  - 5 seções numeradas e expansíveis
  - Inputs com `!border-white/10 !bg-white/[0.02] !text-white` para visibilidade em gradient background
  - Number stepper (+/-) para seleção de slides
  - Botão submit com indicador de progresso visual

### Step 2 - Processing (`step-2-processing.tsx`)
- **Polling**: GET /api/wizard/[id] a cada 2 segundos
- **Progress Indicators**: 3 etapas visuais (Extração → Pesquisa → Geração)
- **Error Handling**: Retry com exponential backoff até 3 tentativas

### Step 3 - Narratives (`step-3-narratives.tsx`)
- **Narratives Display**: Cards agrupados por angle (criativo, estrategico, dinamico, inspirador)
- **Custom Instructions**: Textarea opcional para instruções adicionais
- **RAG Config**: DocumentConfigForm para seleção de documentos/coleções

### Step 4 - Generation (`step-4-generation.tsx`)
- **Polling**: Similar ao Step 2, mas para geração final
- **Preview**: Tabs para Preview visual e JSON raw
- **Actions**: Copiar, Baixar, Salvar na biblioteca, Regenerar

## API Routes

### POST /api/wizard
Cria um novo wizard com estado inicial "input".

### GET /api/wizard
Lista wizards do usuário autenticado com paginação.

### GET /api/wizard/[id]
Retorna dados de um wizard específico.

### PATCH /api/wizard/[id]
Atualiza wizard (auto-save, transição de steps, conclusão/abandono).

### DELETE /api/wizard/[id]
Soft delete (currentStep = "abandoned").

### POST /api/wizard/[id]/submit
Dispara jobs de processamento:
- `submitType: "narratives"` → enfileira WIZARD_NARRATIVES job
- `submitType: "generation"` → enfileira WIZARD_GENERATION job

## Worker Handlers

### wizard_narratives
1. Busca wizard no banco
2. Extrai conteúdo de URLs (Firecrawl)
3. Transcreve vídeo (Apify)
4. Busca contexto (Tavily)
5. **Sintetiza pesquisa** (Synthesizer v3.1)
6. Gera 4 narrativas usando IA
7. Atualiza wizard com narratives + synthesizedResearch

### wizard_generation
1. Busca wizard com narrativa selecionada
2. Busca pesquisa sintetizada
3. Gera conteúdo (slides, caption, hashtags)
4. Salva generatedContent no wizard
5. Atualiza status

### wizard_image_gen (Phase 2)
1. Busca wizard com conteúdo gerado
2. Para cada slide, gera imagem usando:
   - AI Generation (OpenRouter) ou
   - HTML Template (ScreenshotOne)
3. Salva generatedImages no wizard
4. Atualiza status para "completed"

## Integrações Implementadas ✅

Todas as integrações foram implementadas em Janeiro 2026:

| Integração | Status | Arquivo | Descrição |
|------------|--------|---------|-----------|
| **Firecrawl** | ✅ REST API | `firecrawl.service.ts` | Web scraping de URLs de referência |
| **Apify** | ✅ YouTube Transcript | `apify.service.ts` | Transcrição de vídeos do YouTube |
| **Tavily** | ✅ Search API | `tavily.service.ts` | Busca contextual em tempo real |
| **OpenRouter** | ✅ Vercel AI SDK | `llm.service.ts` | Geração de narrativas e conteúdo |
| **Voyage AI** | ✅ RAG | `rag.service.ts` | Embeddings para RAG (existente) |
| **Synthesizer** | ✅ v3.1 | `synthesizer.service.ts` | Pesquisa estruturada via LLM |
| **Image Gen** | ✅ AI + HTML | `image-generation.service.ts` | Geração de imagens via OpenRouter |
| **ScreenshotOne** | ✅ HTML→Image | `screenshotone.service.ts` | Renderização de templates HTML |

### Estrutura dos Serviços Wizard

```
src/lib/wizard-services/
├── types.ts                    # Interfaces compartilhadas
├── synthesis-types.ts          # Synthesizer v3.1 types
├── image-types.ts              # Image generation types
├── prompts.ts                  # Prompts isolados (v4.1/v2.0)
├── llm.service.ts              # Geração de narrativas e conteúdo
├── rag.service.ts              # Wrapper RAG com graceful degradation
├── synthesizer.service.ts      # Síntese de pesquisa v3.1
├── image-generation.service.ts # Geração de imagens AI
├── screenshotone.service.ts    # Renderização HTML templates
├── firecrawl.service.ts        # Web scraping (opcional)
├── tavily.service.ts           # Contextual search (opcional)
├── apify.service.ts            # YouTube transcription (opcional)
└── index.ts                    # Barrel exports
```

### Características dos Serviços

- **Graceful Degradation**: Serviços opcionais retornam `null` se não configurados
- **Prompts Isolados**: Cada tipo de conteúdo tem seu prompt próprio (fácil edição)
- **Retry Logic**: LLM calls com exponential backoff
- **Type-Safe**: Interfaces TypeScript completas

## Phase 2: Synthesizer v3.1 e Image Generation

### Visão Geral

A Phase 2 adiciona duas funcionalidades críticas ao Wizard:

1. **Synthesizer v3.1**: Uma etapa intermediária que transforma resultados brutos do Tavily em pesquisa estruturada
2. **Image Generation**: Sistema de geração de imagens com dois métodos (AI + HTML Templates)

### Fluxo Atualizado

```
Inputs → Extração → Tavily Search → SYNTHESIZER → Narratives → Content → Images
```

### Synthesizer v3.1 - Pesquisa Estruturada

**Localização**: `src/lib/wizard-services/synthesizer.service.ts`

O Synthesizer é uma etapa crítica que transforma resultados brutos do Tavily em campos de pesquisa estruturados antes da geração de narrativas.

#### Campos de Saída

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `resumo_executivo` | string | Executive summary da pesquisa |
| `throughlines_potenciais` | array | 3-5 throughlines com potencial_viral + justificativa |
| `tensoes_narrativas` | array | Tensões com tipo + uso_sugerido |
| `dados_contextualizados` | array | Dados prontos com frase_pronta + contraste |
| `exemplos_narrativos` | array | Histórias completas com protagonista → resultado |
| `erros_armadilhas` | array | Erros contra-intuitivos que parecem corretos |
| `frameworks_metodos` | array | Frameworks validados com passos |
| `hooks` | array | Ganchos para slides/captions |
| `progressao_sugerida` | object | Estrutura 3 atos (ato1_captura, ato2_desenvolvimento, ato3_resolucao) |
| `perguntas_respondidas` | array | Para open loops |
| `gaps_oportunidades` | array | O que a pesquisa não cobriu |

#### Campos Renomeados (v3.1)

| v3.0 | v3.1 | Descrição |
|------|------|-----------|
| `por_que_funciona` | `potencial_viral` | Por que o throughline é viral |
| `como_reforcar` | `justificativa` | Justificativa do throughline |
| `por_que_engaja` | `tipo` | Tipo de tensão |
| `como_explorar` | `uso_sugerido` | Como usar a tensão |
| `dado` | `frase_pronta` | Frase pronta com dado |
| `implicacao_pratica` | `contraste` | Elemento de contraste |

### Image Generation - Geração de Imagens

**Localização**: `src/lib/wizard-services/image-generation.service.ts` + `screenshotone.service.ts`

Sistema de geração de imagens com dois métodos:

#### Métodos Disponíveis

| Método | Descrição | Quando Usar |
|--------|-----------|-------------|
| **AI Generation** | Imagens via OpenRouter (Gemini, GPT-5 Image, etc.) | Qualidade máxima, criativo |
| **HTML Template** | Templates renderizados via ScreenshotOne | Fallback, consistência visual |

#### Modelos de Imagem AI

```typescript
const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
}
```

#### ScreenshotOne Configuration

**Importante**: Use o **Access Key** (não o Secret Key) para autenticação padrão:

```env
SCREENSHOT_ONE_ACCESS_KEY=seu-access-key-aqui
# SCREENSHOT_ONE_SECRET_KEY=opcional-apenas-para-urls-publicas-assinadas
```

**Por que Access Key?**
- Uso server-side (nosso caso)
- Imagens retornadas diretamente, não URLs públicas
- Secret Key só é necessária para compartilhar URLs em `<img>` tags

#### HTML Templates (22+ opções)

A partir de Janeiro 2026, os templates HTML foram **migrados de JS/JSON dinâmicos para arquivos HTML estáticos**.

**Templates Estáticos** (`.context/wizard-prompts/`):

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `dark-mode.html` | Fundo escuro + tipografia clara | Posts noturnos, tech |
| `white-mode.html` | Fundo claro + tipografia escura | Posts diurnos, corporativos |
| `superheadline.html` | Foco em headline impactante | Anúncios, promoções |
| `twitter.html` | Formatado para Twitter/X | Threads, posts textuais |

**Templates Dinâmicos** (via código TypeScript):

```typescript
const HTML_TEMPLATES = {
  // Gradient-based (4)
  GRADIENT_SOLID: "gradiente-solid",
  GRADIENT_LINEAR: "gradiente-linear",
  GRADIENT_RADIAL: "gradiente-radial",
  GRADIENT_MESH: "gradiente-mesh",

  // Typography (3)
  TYPOGRAPHY_BOLD: "tipografia-bold",
  TYPOGRAPHY_CLEAN: "tipografia-clean",
  TYPOGRAPHY_OVERLAY: "tipografia-overlay",

  // Patterns (4)
  PATTERN_GEOMETRIC: "padrão-geométrico",
  PATTERN_DOTS: "padrão-círculos",
  PATTERN_LINES: "padrão-linhas",
  PATTERN_WAVES: "padrão-ondas",

  // Styles (4)
  GLASSMORPHISM: "glassmorphism",
  NEOMORPHISM: "neomorphism",
  BRUTALIST: "brutalista",
  NEUMORPHISM: "neumorphism",

  // Themes (4)
  DARK_MODE: "dark-mode",
  LIGHT_MODE: "light-mode",
  NEON_GLOW: "neon-glow",
  SUNSET_VIBES: "sunset-vibes",
}
```

**Vantagens dos templates estáticos:**
- Edição visual direta no arquivo HTML
- Preview imediato no navegador antes de usar
- Versionamento via Git
- Fácil adição de novos templates

### Prompts v4.1 / v2.0

**Localização**: `src/lib/wizard-services/prompts.ts`

Atualização dos prompts com tags XML e integração Synthesizer v3.1:

| Tipo | Versão | Características |
|------|--------|-----------------|
| **Carousel** | v4.1 | Tags XML, integração Synthesizer v3.1, ProgressaoSugeridaV3 |
| **Image Post** | v2.0 | Estrutura HCCA, técnicas de retenção |
| **Video Script** | v2.0 | 5 estruturas, otimização 3 segundos |

### Environment Variables - Phase 2

```env
# ─────────────────────────────────────────────────────────────────────────────
# 🖼️ IMAGE GENERATION (Wizard)
# ─────────────────────────────────────────────────────────────────────────────
# ScreenshotOne - HTML to Image rendering (OPCIONAL)
# Obtenha em: https://dash.screenshotone.com/
#
# • Use o ACCESS KEY (não o Secret Key) para autenticação padrão
# • O Secret Key é opcional, apenas para assinar URLs públicas
#
# Para gerar imagens com templates HTML (fallback quando Gemini/Freepik não estão disponíveis)
SCREENSHOT_ONE_ACCESS_KEY=your-access-key-here
# SCREENSHOT_ONE_SECRET_KEY=your-secret-key-here  # Opcional - apenas para URLs públicas assinadas
```

## Uso Básico

```tsx
// Full-page
import { WizardPage } from "@/app/(app)/wizard/components/wizard-page";

<WizardPage
  onComplete={(wizardId, content) => {
    console.log("Wizard completed!", wizardId, content);
  }}
  onClose={() => router.push("/")}
/>

// Dialog
import { WizardDialog, useWizardDialog } from "@/app/(app)/wizard/components/wizard-dialog";

const { isOpen, openWizard, closeWizard } = useWizardDialog();

<WizardDialog
  isOpen={isOpen}
  onClose={closeWizard}
  onComplete={(wizardId, content) => {
    // Salvar na biblioteca ou redirecionar
  }}
/>

// With trigger button
import { WizardDialogWithTrigger } from "@/app/(app)/wizard/components/wizard-dialog";

<WizardDialogWithTrigger
  onComplete={(wizardId, content) => {
    saveToLibrary(content);
  }}
>
  <Button>Criar Conteúdo</Button>
</WizardDialogWithTrigger>
```

## Schema do Banco (contentWizards)

A tabela `contentWizards` foi criada com todos os campos necessários:

- **Inputs**: contentType, numberOfSlides, model, referenceUrl, referenceVideoUrl, theme, context, objective, cta, targetAudience
- **RAG**: ragConfig (JSONB com mode, threshold, maxChunks, documents[], collections[])
- **Processamento**: extractedContent, researchQueries, narratives (JSONB)
- **Saída**: generatedContent (JSONB), libraryItemId

## Próximos Passos

1. ~~Implementar as integrações pendentes~~ ✅ FEITO
2. ~~Adicionar prompts reais para geração de narrativas e conteúdo~~ ✅ FEITO
3. Implementar salvamento automático na biblioteca após geração
4. Adicionar analytics para tracking do wizard funnel
5. Implementar testes E2E para o fluxo completo

## Histórico de Atualizações

### Janeiro 2026 - Templates HTML Estáticos
- **Migração**: Templates JS/JSON dinâmicos → Arquivos HTML estáticos
- **Novos templates**: `dark-mode.html`, `white-mode.html`, `superheadline.html`, `twitter.html`
- **Benefícios**: Edição visual direta, preview no navegador, versionamento Git
- **Arquivos removidos**: `prompt-carrosel.js`, `prompt-sintetizer.js`, `model-*.json`
- **Localização**: `.context/wizard-prompts/*.html`

### Janeiro 2026 - Refatoração Visual
- **Step 1**: Grid 2-colunas, CollapsibleSection, inputs visíveis
- **Step 3**: Textarea com estilos dark mode corrigidos
- **Novo Componente**: `CollapsibleSection` com Radix UI + Framer Motion
- **Fix**: Ícone `Youtube` depreciado → `PlayCircle`
- **Fix**: Rodapé do Step 1 - removido `sticky`, adicionado `pt-8`

### Janeiro 2026 - Integrações Completas
- **Wizard Services**: Módulo `src/lib/wizard-services/` com 8 arquivos
- **Firecrawl**: Web scraping via REST API (graceful degradation)
- **Apify**: Transcrição de YouTube via Transcript Actor
- **Tavily**: Busca contextual com formatação para prompts
- **OpenRouter**: Geração de narrativas (4 ângulos) e conteúdo final
- **Prompts Isolados**: `prompts.ts` com funções separadas por tipo de conteúdo
- **Model Selector**: Seletor de modelos de IA no Step 1 (TEXT_MODELS da OpenRouter)
- **Worker Handlers**: Handlers `wizard_narratives` e `wizard_generation` completos

### Janeiro 2026 - Worker Debugging
- **Problema**: Worker nunca executado em desenvolvimento (Vercel Cron só funciona em produção)
- **Solução**: Auto-trigger do worker após criar jobs em `isDevelopment()`
- **Proxy.ts**: Bypass Clerk auth para `/api/workers` (usa `WORKER_SECRET`)
- **Queue Client**: Novo helper `triggerWorker()` com opção `waitForJobId`
- **JSONB Fix**: Step 4 agora verifica tipo antes de `JSON.parse()` (objeto vs string)
- **Documentação**: `.context/docs/insights/013-wizard-worker-debugging-jan2026.md`

## Worker System - Development vs Production

O sistema de worker funciona de forma diferente em desenvolvimento e produção:

| Aspecto | Development | Production |
|---------|-------------|------------|
| **Trigger** | Manual via `triggerWorker()` | Vercel Cron (1 minuto) |
| **Auth** | `WORKER_SECRET` | `WORKER_SECRET` |
| **Endpoint** | `/api/workers` | `/api/workers` |

### Auto-Trigger em Desenvolvimento

```typescript
// src/app/api/wizard/[id]/submit/route.ts
import { triggerWorker } from "@/lib/queue/client";

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

// Após criar job (narratives ou generation)
if (isDevelopment()) {
  triggerWorker().catch((err) => {
    console.error("Failed to trigger worker in development:", err);
  });
}
```

### triggerWorker() Helper

```typescript
// src/lib/queue/client.ts
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
- `triggerWorker()` - Fire and forget (padrão)
- `triggerWorker({ waitForJobId: 123 })` - Aguarda conclusão do job

### Worker Authentication Bypass

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

### Comandos de Debug

```bash
# Trigger worker manualmente
curl -X POST http://localhost:3000/api/workers \
  -H "Authorization: Bearer dev-secret-change-in-production"

# Verificar estado do wizard
curl http://localhost:3000/api/wizard/6
```

## Troubleshooting - Wizard

### Jobs não processam

1. **Verificar se worker está sendo acionado:**
   - Em dev: verificar logs para "Failed to trigger worker"
   - Verificar se `WORKER_SECRET` está correto

2. **Limpar jobs pending antigos:**
   ```sql
   DELETE FROM jobs WHERE status = 'pending' AND id < X;
   ```

3. **Limpar filas Redis:**
   ```bash
   redis-cli DEL jobs:pending jobs:processing
   ```

### JSON.parse Error no Step 4

**Sintoma:** `SyntaxError: "[object Object]" is not valid JSON`

**Causa:** PostgreSQL JSONB columns podem ser objetos, não strings.

**Solução:**
```typescript
const content = typeof wizard.generatedContent === 'string'
  ? JSON.parse(wizard.generatedContent)
  : wizard.generatedContent;
```
