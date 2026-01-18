# 📋 Plano de Implementação - Wizard de Criação

> **Status**: ✅ Implementação Concluída (Janeiro 2026)

Este documento descreve o plano completo para o Wizard de Criação, que foi implementado seguindo as 10 fases abaixo.

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
│       │   ├── step-3-narratives.tsx    # ✅ Cards de narrativa (fixado Jan 2026)
│       │   └── step-4-generation.tsx    # ✅ Preview + save
│       └── shared/
│           ├── document-config-form.tsx     # ✅ RAG configuration
│           ├── narrative-card.tsx            # ✅ Card individual
│           └── wizard-steps-indicator.tsx    # ✅ Progress indicator
│
├── components/ui/
│   └── collapsible.tsx                    # ✅ NEW: CollapsibleSection component
│
├── app/api/wizard/
│   ├── route.ts                        # ✅ GET (list), POST (create)
│   └── [id]/
│       ├── route.ts                    # ✅ GET, PATCH, DELETE
│       └── submit/route.ts             # ✅ POST (trigger jobs)
│
├── lib/queue/
│   └── types.ts                       # ✅ + WIZARD_NARRATIVES, WIZARD_GENERATION
│
└── app/api/workers/
    └── route.ts                        # ✅ + wizard_narratives, wizard_generation handlers
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
2. Extrai conteúdo de URLs (placeholder Firecrawl)
3. Transcreve vídeo (placeholder Apify)
4. Busca contexto (placeholder Tavily)
5. Gera 4 narrativas usando IA (placeholder)
6. Atualiza wizard com narratives

### wizard_generation
1. Busca wizard com narrativas selecionada
2. Gera conteúdo (slides, caption, hashtags)
3. Salva generatedContent no wizard
4. Atualiza status

## Integrações Implementadas ✅

Todas as integrações foram implementadas em Janeiro 2026:

| Integração | Status | Arquivo |
|------------|--------|---------|
| **Firecrawl** | ✅ REST API | `src/lib/wizard-services/firecrawl.service.ts` |
| **Apify** | ✅ YouTube Transcript Actor | `src/lib/wizard-services/apify.service.ts` |
| **Tavily** | ✅ Search API | `src/lib/wizard-services/tavily.service.ts` |
| **OpenRouter** | ✅ Vercel AI SDK | `src/lib/wizard-services/llm.service.ts` |
| **Voyage AI** | ✅ RAG (existente) | `src/lib/wizard-services/rag.service.ts` |

### Estrutura dos Serviços Wizard

```
src/lib/wizard-services/
├── types.ts                    # Interfaces compartilhadas
├── prompts.ts                  # Prompts isolados por tipo de conteúdo
├── llm.service.ts              # Geração de narrativas e conteúdo
├── rag.service.ts              # Wrapper RAG com graceful degradation
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
