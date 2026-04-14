# Content Engine Overhaul — Design Spec

**Data:** 2026-04-13
**Status:** Draft — aguardando revisão do usuário
**Escopo:** Reestruturação completa do sistema de geração de conteúdo: isolamento de motores (Tribal v4 vs BrandsDecoded v4), auto-injeção de contexto Zoryon, ativação de inputs link/YouTube, unificação visual do Studio, e integração Discover multi-motor.

---

## 1. Contexto e motivação

A aplicação Máquina de Conteúdo possui hoje dois motores de geração — Tribal v4 (funcional, em produção) e BrandsDecoded v4 (parcialmente integrado). O fluxo atual tem três problemas arquiteturais validados via auditoria:

1. **Contexto Zoryon (brand config + RAG) não entra por default em todas as gerações.** O worker (`src/app/api/workers/route.ts:1039-1044`) só invoca RAG se o usuário configurar manualmente; `src/lib/wizard-services/rag.service.ts:168-174` tem um TODO que desabilita o filtro por `category='brand'`. Resultado: os 12 docs v2 da Zoryon ficam inertes na maioria das gerações.
2. **Motor BD trata brand config como bullets genéricos.** `src/lib/ai/motors/brandsdecoded-v4/_shared/brand-block.ts:7-19` renderiza os 10 campos como lista uniforme nos 5 stages (triagem, headlines, espinha, copy-blocks, legenda). Tribal faz 50+ interpolações field-level; BD deixa o LLM inferir semântica.
3. **Inputs link/YouTube existem no frontend mas nunca são processados.** Campos `referenceUrl` e `referenceVideoUrl` (em `src/app/(app)/wizard/components/steps/step-1-inputs.tsx:388-441`) são armazenados e ignorados pelo pipeline. Serviços Firecrawl/Apify prontos (`src/lib/wizard-services/firecrawl.service.ts`, `apify.service.ts`), mas desconectados.
4. **Wizard atual mistura fluxos Tribal e BD.** BD herda Steps 2-3 (narrativas) do Tribal, forçando usuário a preencher campos fora do framework original. Usuário testou e considerou "não tá legal, principalmente a parte visual".
5. **Visual Studio não consome brand tokens.** Os 15 templates (4 BD exclusivos) usam cores/fontes hardcoded; `brand.config.visual.tokens` existe mas é ignorado em rendering.

### Decisões de produto que guiam o design

- **Isolar por metodologia, unificar o que faz sentido técnico.** Pipelines de geração ficam separados; injeção de contexto, camada visual e entry point permanecem unificados. (feedback `feedback_prefer_rich_context.md`)
- **Zoryon como marca default; arquitetura multi-brand-ready.** Custo marginal; evita refactor grande quando adicionar novas marcas.
- **Deploy incremental e sequencial.** Cada fase vai pra produção antes da próxima começar. Backwards-compat durante transição via feature flags.
- **Tribal existente não regride.** "Tribal já temos tudo funcionando; não mexeríamos."
- **BD ganha wizard próprio, fiel ao framework original.** Semente única (link OU youtube OU keyword OU tema OU insight) → pipeline jornalístico.

---

## 2. Princípios arquiteturais

1. **Isolamento de motores com contexto compartilhado.** Pipelines de geração isolados; injeção de brand/RAG unificada antes do dispatch.
2. **"Coração Zoryon" em 100% das gerações.** Brand config + RAG auto-injetados sem depender de configuração do usuário.
3. **Backwards compatibility durante transição.** Feature flags `visual_tokens_v2` e `bd_wizard_v1` isolam mudanças; carrosséis/wizards existentes continuam válidos.
4. **Cada fase entrega valor independente.** Parando em qualquer fase, o sistema fica em estado estável e útil.
5. **Multi-brand por design, Zoryon na prática.** `brandId` é parâmetro explícito; fallback pra default (Zoryon) quando ausente.

---

## 3. Arquitetura alvo (pós-Fase 7)

```
ENTRY UNIFICADO
  /wizard/new  →  "O que criar?"  →  "Qual metodologia?" (se carrossel)
                     │                          │
                     ▼                          ▼
         TRIBAL WIZARD                BD WIZARD (novo)
         /wizard/[id]                 /wizard/brandsdecoded/[id]
         (inalterado)                 (4 steps: seed/review/gen/result)
                     │                          │
                     └────────────┬─────────────┘
                                  ▼
CONTEXT INJECTION LAYER (unificado)
  ├─ brand.config
  │   • Tribal: field-level (existente)
  │   • BD: semântico por stage (Fase 2)
  └─ RAG
      • Auto-inject category='brand' (Fase 1)
      • User RAG opcional (existente)
                                  │
                                  ▼
GENERATION PIPELINES (isolados)
  Tribal v4                       BD v4
  (prompts.ts + llm.service.ts)   (motors/brandsdecoded-v4/*)
                                  │
                                  ▼
CONTENT ADAPTER LAYER (unificado)
  • content-mapper.ts (Tribal)
  • bd-adapter.ts (BD, slides flexíveis Fase 7)
                                  │
                                  ▼
VISUAL STUDIO (Fase 3)
  • renderSlideToHtml(brand) — CSS vars via brand.config.visual.tokens
  • library_items.brand_id persistido
                                  │
                                  ▼
SAVE + LIBRARY
  • ScreenshotOne + R2 (retry, Fase 7)
  • metadata.visualStudio + brandId
```

### Invariantes garantidas

| # | Invariante | Mecanismo |
|---|-----------|-----------|
| I1 | Brand config entra em 100% das gerações | Injeção unificada na context layer |
| I2 | RAG `category='brand'` sempre consultado | Auto-inject no worker |
| I3 | Tribal não regride | Zero mudança observável em `/wizard/[id]` |
| I4 | BD fiel ao framework | Wizard próprio, semente única, pipeline jornalístico |
| I5 | Visual consistente com brand | Templates consomem tokens, não hardcoded |
| I6 | Rollback em < 10min | Feature flags + migrations reversíveis |

---

## 4. Fases detalhadas

### Fase 1 — RAG auto-injeção Zoryon

**Objetivo:** Garantir que os 12 docs Zoryon v2 (`category='brand'`) entrem em toda geração, independente de configuração do usuário.

**Componentes:**

- **Novo:** `src/lib/rag/brand-auto-inject.ts`
  ```ts
  export async function getBrandAutoRagContext(
    userId: string,
    query: string,
    brandId?: number
  ): Promise<RagResult | null>
  ```
  Busca com `categories: ['brand']`, `topK=5`, `threshold=0.4`, `maxTokens=1500`. Graceful degradation: retorna `null` se Voyage indisponível.

- **Modificado:** `src/lib/wizard-services/rag.service.ts`
  Nova função `generateWizardRagContextWithBrand()` roda user RAG + brand auto-inject em paralelo (`Promise.all`), merge com labels:
  ```
  ═══ CONTEXTO DA MARCA (auto) ═══
  [brand chunks]
  ═══ CONTEXTO ADICIONAL (user) ═══
  [user chunks]
  ```

- **Modificado:** `src/app/api/workers/route.ts:1036-1061`
  Substituir `if (shouldUseRag) { ... }` por invocação sempre-ativa. `shouldUseRag` passa a controlar apenas o user RAG (mantém semântica existente pra manual selection).

- **Modificado:** `src/lib/rag/assembler.ts`
  Validar que `RagCategory` inclui `'brand'`. Se não incluir, adicionar.

**Feature flag:** `RAG_BRAND_AUTO_INJECT` (server-only, default `true`). Kill-switch de emergência.

**Testes:**
- `brand-auto-inject.test.ts` — filtro de category, graceful degradation
- `rag.service.test.ts` (estendido) — merge ordenado, brand antes de user
- `route-rag.test.ts` — integração: worker injeta brand mesmo com `ragConfig=null`

**Critério de aceite:**
- Geração sem `ragConfig` retorna `metadata.ragSources` com ≥ 1 doc `category='brand'`
- Log `[rag] brand auto-inject: X chunks` em 100% das gerações
- Testes existentes continuam verdes

**Rollback:** `RAG_BRAND_AUTO_INJECT=false` em Vercel → comportamento anterior. Mudança aditiva; `git revert` também seguro.

---

### Fase 2 — BD brand-block semântico

**Objetivo:** Substituir renderização genérica de brand config no BD por seções semânticas customizadas por stage.

**Componentes:**

- **Modificado:** `src/lib/ai/motors/brandsdecoded-v4/_shared/brand-block.ts`
  Nova assinatura:
  ```ts
  export type BdStage = "triagem" | "headlines" | "espinha" | "copy-blocks" | "legenda"

  export function buildBrandContextBlock(
    vars: BrandPromptVariables | undefined,
    opts: { stage?: BdStage; heading?: string; fallback?: string }
  ): string
  ```

  Mapping stage → campos primários:

  | Stage | Campos | Racional |
  |-------|--------|----------|
  | triagem | targetAudience, audienceFears, differentiators | Extrai fricção/transformação |
  | headlines | tone, niche, audienceDesires | Voz + nicho + desejo guiam headline |
  | espinha | targetAudience, differentiators, contentGoals | Estrutural: posicionamento e objetivos |
  | copy-blocks | tone, brandVoice, negativeTerms, contentGoals | Execução textual |
  | legenda | preferredCTAs, tone, brandVoice | CTA final + voz |

  Output em seções nomeadas:
  ```
  # CONTEXTO DE MARCA

  ## VOZ
  - Tom: {tone}
  - Vocabulário preferido: {brandVoice}

  ## AUDIÊNCIA
  - Público-alvo: {targetAudience}
  - Dores: {audienceFears}

  ## POSICIONAMENTO
  - Nicho: {niche}
  - Diferenciais: {differentiators}

  ## OBJETIVOS E CTAs
  - Goals: {contentGoals}
  - CTAs preferidos: {preferredCTAs}
  ```

  Compatibilidade: `{ stage: undefined }` renderiza bullet-list antigo (backcompat).

- **Modificado (5 sites):**
  - `motors/brandsdecoded-v4/espinha.ts:67` → `{ stage: "triagem" }`
  - `motors/brandsdecoded-v4/headline-patterns.ts:128` → `{ stage: "headlines" }`
  - `motors/brandsdecoded-v4/espinha.ts:150` → `{ stage: "espinha" }`
  - `motors/brandsdecoded-v4/copy-blocks.ts:81` → `{ stage: "copy-blocks" }`
  - `motors/brandsdecoded-v4/orchestrator.ts:268` → `{ stage: "legenda" }`

**Feature flag:** Nenhuma. Mudança aditiva com backcompat.

**Testes:**
- `brand-block.test.ts` — cobertura por stage, fallback, campos ausentes
- `integration/bd-brand-injection.test.ts` — E2E com brand Zoryon completo

**Critério de aceite:**
- Stage triagem não recebe CTAs (foco + tokens)
- Stage headlines não recebe negativeTerms
- QA dry-run `[qa-dry:brandsdecoded-v4]` melhora em ≥ 1 ponto médio de score

**Rollback:** `git revert`. Puramente aditivo.

---

### Fase 3 — Visual Studio: brand tokens nos templates

**Objetivo:** Consumir `brand.config.visual.tokens` em todos os 15 templates via CSS variables, preservando renders antigos.

**Componentes:**

- **Migration:**
  ```sql
  ALTER TABLE library_items
    ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;
  CREATE INDEX idx_library_items_brand_id ON library_items(brand_id);
  ```
  Nullable; rows existentes permanecem válidas.

- **Schema:** `src/db/schema.ts` — adicionar `brandId` em `libraryItems`.

- **Novo:** `src/lib/studio-templates/brand-tokens-css.ts`
  ```ts
  export function buildBrandTokenCss(brand: BrandConfig | undefined): string
  ```
  Converte tokens em `:root { --brand-color-primary: ...; ... }`. Fallback vazio quando brand ausente (templates usam defaults hardcoded).

- **Modificado:** `src/lib/studio-templates/renderer.ts`
  Nova assinatura:
  ```ts
  export function renderSlideToHtml(input: {
    slide: StudioSlide
    profile: StudioProfile
    header: StudioHeader
    brand?: BrandConfig
    featureFlags?: { visualTokensV2?: boolean }
  }): string
  ```
  Injeta `<style>${buildBrandTokenCss(brand)}</style>` quando flag on.

- **Modificado (15 templates):**
  ```diff
  - color: #a3e635;
  + color: var(--brand-color-primary, #a3e635);
  - font-family: "Inter", sans-serif;
  + font-family: var(--brand-font-heading, "Inter", sans-serif);
  ```
  Fallback hardcoded garante non-regression.

- **Modificado:** `src/app/api/wizard/[id]/save-carousel/route.ts` e `src/app/api/studio/save/route.ts`
  Buscam brand via `brandId` do wizard (ou Zoryon default), passam pro renderer quando flag on, persistem `library_items.brand_id`.

- **Modificado:** `src/app/(app)/studio/components/canvas/canvas-panel.tsx`
  Hook `useBrand()` carrega brand; preview client-side consome mesmas CSS vars.

**Feature flag:** `NEXT_PUBLIC_FEATURE_VISUAL_TOKENS_V2` (default `false`). Liberação: 48h após deploy, com validação visual manual em 3 carrosséis Zoryon de referência.

**Testes:**
- `brand-tokens-css.test.ts` — geração correta, escape de valores, fallback
- `renderer.test.ts` — HTML com flag on/off
- `integration/visual-tokens-e2e.test.ts` — ScreenshotOne render com Zoryon → pixel sampling valida presença de `#a3e635`

**Critério de aceite:**
- Flag on → HTML contém `var(--brand-color-primary)`
- Flag off → comportamento atual preservado byte-a-byte
- `library_items.brand_id` populado em novos saves
- Carrosséis antigos (brand_id=null) continuam renderizando
- Preview no Studio reflete tokens quando flag on

**Rollback:**
1. Flag off → novos renders voltam ao hardcoded
2. Migration reverse testada em staging: `ALTER TABLE library_items DROP COLUMN brand_id`
3. Templates mantêm fallback hardcoded; sem brand = render válido

---

### Fase 4 — Wire-up link/YouTube como semente BD

**Objetivo:** Ativar extração de conteúdo via Firecrawl/Apify como insumo de briefing, controlado pelo usuário via botão explícito.

**Componentes:**

- **Novo:** `src/lib/wizard-services/content-extractor.service.ts`
  ```ts
  export type SeedType = "link" | "youtube" | "keyword" | "theme" | "insight"

  export type SeedInput =
    | { type: "link"; url: string }
    | { type: "youtube"; url: string }
    | { type: "keyword"; value: string }
    | { type: "theme"; value: string }
    | { type: "insight"; value: string }

  export type ExtractedBriefing = {
    seed: SeedInput
    briefing: string
    metadata: {
      title?: string
      author?: string
      publishDate?: string
      source: "firecrawl" | "apify" | "direct"
      rawContent?: string
    }
  }

  export async function extractSeedAsBriefing(
    input: SeedInput
  ): Promise<ServiceResult<ExtractedBriefing>>
  ```

  Lógica por tipo:
  - `link` → `extractFromUrl()` → markdown + metadata
  - `youtube` → `transcribeYouTube()` + `formatYouTubeForPrompt()`
  - `keyword | theme | insight` → pass-through (briefing = value)

- **Schema update:** coluna `seeds` JSONB em `content_wizards`
  ```ts
  seeds: jsonb("seeds").$type<Array<{
    type: SeedType
    value: string
    briefing?: string
    metadata?: Record<string, unknown>
    extractedAt?: string
  }>>().default([])
  ```
  Escolha de JSONB (vs tabela normalizada) por simplicidade; refatorável para tabela se queries demandarem.

- **Nova server action:** `src/app/(app)/wizard/actions/extract-seed.ts`
  ```ts
  "use server"
  export async function extractSeedAction(
    wizardId: number,
    seed: SeedInput
  ): Promise<ActionResult<ExtractedBriefing>>
  ```
  Auth guard, extração, persistência, retorno pro client.

- **Nova UI:** `src/components/wizard/seed-input-panel.tsx`
  - Tabs: Link / YouTube / Keyword / Tema / Insight
  - Botão "Extrair conteúdo" (disabled se vazio)
  - Loading state (10-60s pro YouTube)
  - Preview editável (textarea) do briefing extraído
  - Adicionar/remover múltiplas seeds

- **Consumo no worker BD (Fase 5):** consolida `seeds[]` em `briefing` via `seeds.map(s => s.briefing || s.value).join("\n\n---\n\n")`.

**Feature flag:** Nenhuma. Ação é opt-in (user clica "Extrair").

**Testes:**
- `content-extractor.service.test.ts` — cada tipo, graceful degradation sem API keys
- `actions/extract-seed.test.ts` — auth guard, persistência, shapes
- `integration/wizard-seeds-flow.test.ts` — fluxo completo: extract → persist → fetch → usar em gen

**Critério de aceite:**
- Link: briefing visível em < 30s
- YouTube: transcrição em < 60s
- Seeds múltiplas concatenadas corretamente
- Fallback graceful se Firecrawl/Apify indisponível

**Rollback:** `git revert` remove painel. Coluna `seeds` pode ser mantida (nullable, inofensiva) ou revertida via migration.

---

### Fase 5 — Wizard BrandsDecoded isolado

**Objetivo:** Criar fluxo BD fiel ao framework original — semente única → pipeline jornalístico → headline picker → Visual Studio —, sem acoplamento com Tribal.

**Componentes:**

- **Nova árvore de rotas:**
  ```
  src/app/(app)/wizard/
  ├── new/                             ← Step 0 (NOVO)
  │   └── page.tsx
  ├── [id]/                            ← Tribal (inalterado)
  └── brandsdecoded/
      └── [id]/
          ├── page.tsx
          ├── components/
          │   ├── bd-wizard.tsx
          │   └── steps/
          │       ├── bd-step-1-seed.tsx
          │       ├── bd-step-2-review.tsx
          │       ├── bd-step-3-generate.tsx
          │       └── bd-step-4-result.tsx
          └── actions/
              └── bd-wizard-actions.ts
  ```

- **Step 0 (`/wizard/new`):** entrada compartilhada
  - "O que quer criar?" → tipo de conteúdo
  - Se carrossel: "Qual metodologia?" (Tribal / BrandsDecoded)
  - Cria `contentWizards` com `motor` correto
  - Redireciona pra rota apropriada

- **BD Wizard steps:**
  - **Step 1 (seed):** painel de seeds (Fase 4) + ângulo tribal opcional
  - **Step 2 (review):** preview do briefing consolidado, edição inline
  - **Step 3 (generate):** progress bar por stage (triagem → headlines → espinha → copy-blocks → legenda)
  - **Step 4 (result):** grid de 10 headlines (5 IC + 5 NM) com preview + avg likes → user escolhe → re-roda downstream stages (espinha + blocks + legenda, cache triagem+headlines) → botão "Ir pro Visual Studio"

- **BD Wizard store:** `src/stores/bd-wizard-store.ts`
  ```ts
  type BdWizardState = {
    wizardId: number
    currentStep: 1 | 2 | 3 | 4
    seeds: Seed[]
    consolidatedBriefing: string
    tribalAngle?: TribalAngleId
    generatedResult?: BrandsDecodedResult
    selectedHeadlineId?: number
  }
  ```

- **Server action chave:** `generateBdContentAction(wizardId)`
  1. Lê `seeds[]`
  2. Consolida briefing
  3. Auto-injeta brand RAG (Fase 1)
  4. Chama `generateWithBrandsDecoded()` com brandPromptVariables semânticos (Fase 2)
  5. Persiste resultado
  6. Retorna agregado pro Step 3

- **Action pra re-headline:** `selectHeadlineAndRebuildAction(wizardId, headlineId)`
  - Re-roda espinha + blocks + legenda com nova headline
  - Triagem + headlines cacheadas (não re-executa)

- **Integração Visual Studio:** botão final dispara `bdResultToGeneratedContent()` → cria `libraryItem` draft → redireciona pra `/studio/[libraryItemId]`. Visual Studio já suporta templates BD_*.

**Isolamento:**
- Nenhum componente Tribal importado pelo BD
- Shared apenas: types (`BrandConfig`, `BrandPromptVariables`), schemas, Visual Studio, RAG service

**Feature flag:** `NEXT_PUBLIC_FEATURE_BD_WIZARD_V1` (default `false`).
- Off → Step 0 só mostra Tribal; rota BD responde 404
- Liberação progressiva: admin-only → beta (5 users) → geral

**Testes:**
- `bd-wizard-store.test.ts` — state transitions, briefing consolidation
- `bd-wizard-actions.test.ts` — auth, persistência, errors
- `integration/bd-wizard-flow.test.ts` — E2E Step 0→4
- `integration/bd-wizard-tribal-isolation.test.ts` — Tribal não afetado

**Critério de aceite:**
- Flag off → Tribal funciona idêntico
- Flag on → `/wizard/new` mostra ambas opções
- BD completa com seed=link em < 2min (excluindo Visual Studio)
- Trocar headline no Step 4 não re-roda triagem/headlines
- Carrossel BD salvo usa templates BD_* automaticamente

**Rollback:**
1. Flag off → rota BD retorna 404
2. Wizards BD em progresso ficam órfãos (não quebram)
3. Migration da coluna `seeds` (Fase 4) é nullable, rollback seguro

---

### Fase 6 — Discover → botões duplos

**Objetivo:** Permitir que temas descobertos no Discover alimentem qualquer um dos dois motores.

**Componentes:**

- **Modificado:** `src/app/(app)/discover/components/discover-page.tsx:362-410`

  Dropdown substitui botão único:
  ```tsx
  <DropdownMenu>
    <DropdownMenuTrigger>Criar Wizard ▾</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => handleCreateWizard(theme, "tribal_v4")}>
        Tribal v4 — narrativas
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleCreateWizard(theme, "brandsdecoded_v4")}
        disabled={!featureBdWizard}
      >
        BrandsDecoded v4 — pipeline jornalístico
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  ```

- **Modificado:** `src/app/api/themes/[id]/wizard/route.ts`

  Body aceita `motor`:
  ```ts
  POST /api/themes/[id]/wizard
  Body: { motor: "tribal_v4" | "brandsdecoded_v4" }
  ```

  Comportamento:
  - `tribal_v4` → pré-preenche theme/context/referenceUrl (atual)
  - `brandsdecoded_v4` → cria wizard com `motor='brandsdecoded_v4'` e popula `seeds[]`:
    - `referenceUrl` presente → seed `{ type: "link", value: url }`
    - Source YouTube → seed `{ type: "youtube", value: url }`
    - Senão → seed `{ type: "theme", value: title }`
  - Redireciona cliente pra rota correta

- **Nova função pura:** `src/lib/wizard/create-wizard.ts`
  ```ts
  export async function createWizardFromTheme(
    themeId: number,
    motor: "tribal_v4" | "brandsdecoded_v4",
    userId: string
  ): Promise<{ wizardId: number; redirectPath: string }>
  ```

**Feature flag:** Herda `NEXT_PUBLIC_FEATURE_BD_WIZARD_V1` (item BD fica disabled com tooltip quando off).

**Testes:**
- `discover-dual-button.test.ts` — dropdown render + disabled state
- `api/themes/[id]/wizard.test.ts` — motor param, seed populada por source type
- `create-wizard.test.ts` — função pura

**Critério de aceite:**
- Flag off → BD disabled com tooltip
- Flag on → user escolhe qualquer motor
- Theme com referenceUrl → seed="link" no BD
- Theme YouTube/Instagram → seed correto por source
- Theme Perplexity sem URL → seed="theme"

**Rollback:** `git revert` do componente. Endpoint mantém compat com requests sem `motor`.

---

### Fase 7 — Polimento BD (3 subtasks independentes)

#### 7.1 BD flexível > 9 slides

- `generateCopyBlocks()` aceita `numberOfSlides` (default 9, max 10)
- Adapter calcula ranges dinamicamente
- `bd-step-1-seed.tsx` adiciona slider 6-10
- Prompt ajusta quotas de palavras proporcionalmente

Arquivos: `motors/brandsdecoded-v4/copy-blocks.ts`, `bd-adapter.ts`, `bd-step-1-seed.tsx`

#### 7.2 Retry logic no rendering

- `render-to-image.ts` ganha retry com backoff exponencial (3 tentativas: 0ms, 2s, 8s)
- Partial success: `save-carousel` retorna `{ failedSlides: [7] }` + `hasPartialFailure` flag
- UI Studio mostra "Slide 7 não renderizou — re-render?"

Arquivos: `render-to-image.ts`, `save-carousel/route.ts`, `studio-page.tsx`

#### 7.3 i18n CTA BD

- `texto3Instruction?: string` em `SlideContent`
- `brand.config.content.ctaInstructionTemplate` (opcional)
- Precedência: content.texto3Instruction → brand → default PT-BR

Arquivos: `studio-templates/types.ts`, `bd-cta.ts`, `brands/schema.ts`, `brand-content-form.tsx`

**Feature flags:** Nenhuma (subtasks independentes e baixo risco).

**Testes:** unit + E2E carrossel 10 slides BD sem falha; retry log correto; i18n custom.

---

## 5. Feature flags — estratégia global

| Flag | Fase | Default inicial | Liberação | Remoção |
|------|------|-----------------|-----------|---------|
| `RAG_BRAND_AUTO_INJECT` | 1 | `true` | Imediato | Nunca (vira permanente na v2) |
| — | 2 | N/A | Imediato | N/A |
| `NEXT_PUBLIC_FEATURE_VISUAL_TOKENS_V2` | 3 | `false` | 48h + validação visual | 2 semanas |
| — | 4 | N/A | Imediato (opt-in user) | N/A |
| `NEXT_PUBLIC_FEATURE_BD_WIZARD_V1` | 5 | `false` | Admin → beta (5) → geral | 4 semanas |
| — | 6 | N/A | Junto com Fase 5 | Junto com Fase 5 |
| — | 7 | N/A | Imediato | N/A |

**Convenções:**
- `NEXT_PUBLIC_` prefix → client-side (UI condicional)
- Sem prefix → server-only
- Valores `"true"/"false"` (string)
- Helper: `src/lib/features.ts` com `isFeatureEnabled(name)`

**Critério pra remover flag:**
1. Ativa em produção ≥ 2 semanas
2. Zero bugs relacionados reportados
3. Métricas (QA score, feedback) mantidas/melhoradas
4. PR dedicado: deleta flag check + testes do path off

---

## 6. Testing strategy

### Níveis por fase

| Fase | Unit | Integration | E2E | Visual regression |
|------|------|-------------|-----|-------------------|
| 1 | RAG filter, merge | Worker dispatch auto-inject | Wizard Tribal com brand docs | — |
| 2 | brand-block per stage | BD motor com Zoryon | BD pipeline completo | — |
| 3 | CSS var gen | Renderer brand injection | ScreenshotOne render | ✓ Percy/Chromatic |
| 4 | Extractor per seed | Extract action + persist | Step 1 link → briefing | — |
| 5 | Store transitions | Actions + worker | Flow BD Step 0→4 | — |
| 6 | Dropdown logic | Endpoint motor param | Discover → BD wizard | — |
| 7 | Retry, i18n, slides | Render retry | Carrossel 10 slides BD | ✓ |

### Fixtures

**Novo:** `src/__fixtures__/zoryon-brand.ts` — brand config Zoryon completa. Refresh via `npm run fixtures:refresh`.

### QA manual obrigatório (checklist no PR)

- [ ] Smoke test na rota principal
- [ ] Wizard Tribal não regride
- [ ] Vercel build passa
- [ ] TypeCheck + lint passam
- [ ] Testes afetados passam

### Performance budget

| Métrica | Budget |
|---------|--------|
| BD E2E (seed=tema) | < 90s |
| BD E2E (seed=YouTube 10min) | < 180s |
| Render 9 slides | < 45s |
| Auto-inject RAG brand | +500ms máx no worker |

---

## 7. Rollback detalhado

| Fase | Estratégia primária | Secundária | Dados preservados |
|------|---------------------|-----------|-------------------|
| 1 | `RAG_BRAND_AUTO_INJECT=false` | `git revert` | Sem efeito |
| 2 | `git revert` | — | Sem efeito |
| 3 | `VISUAL_TOKENS_V2=false` | Migration reverse `DROP COLUMN brand_id` | Carrosséis v2 permanecem imutáveis no R2 |
| 4 | `git revert` + migration reverse coluna `seeds` | Deixar coluna nullable | Seeds extraídas perdidas se revert; mantidas senão |
| 5 | `BD_WIZARD_V1=false` | Rota BD passa a 404 | Wizards BD em DB preservados |
| 6 | `git revert` Discover | — | Sem efeito |
| 7 | `git revert` por subtask | — | Sem efeito |

**Reversão em cascata:** Fase 5 rollback → Fase 6 rollback obrigatório. Demais fases independentes.

**Sanity check pós-rollback:** script `scripts/sanity-post-rollback.ts`
1. Cria wizard Tribal teste → gera → valida output
2. Lista últimos 10 carrosséis → valida renderização
3. Reporta em stdout

---

## 8. Timeline estimada

| Fase | Esforço (dias úteis) | User testing |
|------|----------------------|--------------|
| 1 | 1-2 | 1 dia |
| 2 | 1 | 1 dia |
| 3 | 4-6 | 2 dias |
| 4 | 2-3 | 1 dia |
| 5 | 6-10 | 3 dias |
| 6 | 1-2 | 1 dia |
| 7 | 3-4 | 1 dia |
| **Total** | **18-28** | **+10** |

Janela realista end-to-end: **6-8 semanas** com testes entre fases.

---

## 9. Cross-cutting concerns

### Observabilidade
- Logs estruturados: `[phase:N][subsystem] key=value ...`
- Exemplos:
  - `[rag-auto] brand_chunks=5 user_chunks=3 merge_tokens=1840`
  - `[bd-wizard] seed_type=link extract_ms=12400`
- Dashboard opcional Fase 7.5: tabela `wizard_events` + query Neon

### Segurança
- Auth guard Clerk em todas server actions
- `isAdmin()` onde aplicável (brand edit, flags admin)
- Firecrawl/Apify/Voyage API keys server-only
- Rate limiting `/api/themes/[id]/wizard` (10 req/min/user via Upstash)

### Performance
- RAG auto-inject paralelo ao user RAG (`Promise.all`)
- Extrações Firecrawl/Apify explícitas (user clica) — não bloqueiam Step 1
- BD pipeline mantém streaming por stage (progress granular)

### Acessibilidade
- Dropdown Discover: `aria-label`, keyboard nav
- Loading states: `aria-busy`
- Step 0: radio group semântico

---

## 10. Decisões deferidas

Pontos explicitamente fora do escopo desta reestruturação, a reavaliar pós-Fase 7:

- **Normalização do schema libraryItems** — content/mediaUrl/metadata como JSON strings. Refactor pra colunas typed ou tabelas relacionadas: fica pra iteração futura.
- **Template versioning** — rastrear qual versão de template foi usada em cada render histórico.
- **Multi-brand UI de seleção** — quando houver > 1 marca, adicionar seletor de brand no wizard. Arquitetura já pronta; UI fica pra quando Zoryon não for a única.
- **Streaming de UI para Step 3 BD** — usar Server Actions streaming / Resumable streams quando Next.js 16 suportar nativamente. Hoje usamos polling.
- **Observabilidade dashboard** — fica opcional; adicionar só se sinal de necessidade aparecer.

---

## 11. Referências de código

| Assunto | Arquivo principal |
|---------|-------------------|
| Brand config schema | `src/lib/brands/schema.ts` |
| Brand injection layer | `src/lib/brands/injection.ts` |
| BD orchestrator | `src/lib/ai/motors/brandsdecoded-v4/orchestrator.ts` |
| BD brand block (alvo Fase 2) | `src/lib/ai/motors/brandsdecoded-v4/_shared/brand-block.ts` |
| Tribal prompts | `src/lib/wizard-services/prompts.ts` |
| Worker dispatch | `src/app/api/workers/route.ts` |
| RAG service | `src/lib/wizard-services/rag.service.ts` |
| RAG assembler | `src/lib/rag/assembler.ts` |
| Studio renderer | `src/lib/studio-templates/renderer.ts` |
| Studio templates | `src/lib/studio-templates/*.ts` |
| Firecrawl service | `src/lib/wizard-services/firecrawl.service.ts` |
| Apify service | `src/lib/wizard-services/apify.service.ts` |
| Wizard step 1 | `src/app/(app)/wizard/components/steps/step-1-inputs.tsx` |
| Discover page | `src/app/(app)/discover/components/discover-page.tsx` |
| Theme → wizard bridge | `src/app/api/themes/[id]/wizard/route.ts` |
| Seed script Zoryon | `scripts/seed-zoryon-brand.ts` |
| Reseed script Zoryon docs | `scripts/reseed-zoryon-docs.ts` |

---

**Fim do design. Próximo passo:** `writing-plans` skill gera plano de implementação a partir deste spec.
