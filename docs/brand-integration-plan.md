# Plano de Integração — Zoryon Brandkit + BrandsDecoded Textual

**Status:** PR 1 em andamento
**Última atualização:** 2026-04-13

---

## 📌 Resumo da Iniciativa

Incorporar dois pacotes externos ao sistema:

1. **`temporaria/zoryon-brandkit/`** — Brandkit completo da Zoryon (20 arquivos: voz, tokens visuais, ICPs, catálogo de serviços, jornada, estratégia de conteúdo). Torna-se a **marca nativa** do sistema, injetada automaticamente em toda geração.
2. **`temporaria/brandformat/`** — Framework editorial BrandsDecoded (7 arquivos: system-prompt máquina-de-carrosseis v4, banco de 8 padrões de headline, filtro editorial, manual de qualidade). Torna-se um **segundo motor textual**, paralelo ao Tribal v4 existente.

---

## ✅ Decisões Arquiteturais Fechadas

| # | Decisão | Valor |
|---|---------|-------|
| 1 | Escopo de marcas | Single-brand agora (Zoryon), arquitetura preparada para multi-brand futuro |
| 2 | Storage da marca | JSONB único (`brands.config`) — evoluível, exportável, menos overhead |
| 3 | Source of truth | **DB é autoritativo**. MDs em `src/content/brands/zoryon/` são doc histórica (git). Seed one-shot. |
| 4 | Edição | UI admin em `/settings/brand` (apenas dono do sistema edita) |
| 5 | Versionamento | Tabela `brand_versions` com snapshot JSONB a cada save |
| 6 | Tribal v4 vs BrandsDecoded v4 | **Dois motores paralelos** selecionáveis no wizard |
| 7 | Combinação cross-motor | **Permitida** — Tribal pode usar headlines do BD e vice-versa (biblioteca compartilhada) |
| 8 | Templates de imagem | **Ambos acervos disponíveis** — nossos (MC) + os deles (BD dark/light alternado) |
| 9 | QA editorial | **Universal** — validador pós-geração em qualquer motor |
| 10 | Injeção da marca | **Desde a Fase 1** — Tribal v4 e BrandsDecoded v4 ambos consomem `brand.config` |

---

## 🏗️ Arquitetura

### Schema Drizzle (novas tabelas)

```ts
brands
├─ id (uuid, PK)
├─ slug (text, unique)               // 'zoryon'
├─ name (text)                       // 'Zoryon'
├─ isDefault (bool)
├─ ownerUserId (text, FK users.id)
├─ config (jsonb)                    // árvore do brandkit
├─ createdAt, updatedAt

brandVersions
├─ id (uuid, PK)
├─ brandId (uuid, FK brands.id, cascade)
├─ config (jsonb)                    // snapshot
├─ message (text)
├─ createdBy (text, FK users.id)
├─ createdAt
```

### Relações (colunas `brand_id` adicionadas)

- `libraryItems.brandId` (nullable, default zoryon)
- `scheduledPosts.brandId`
- `contentWizards.brandId` + `motor` ('tribal_v4' | 'brandsdecoded_v4')
- `themes.brandId`
- `creativeProjects.brandId`

### Formato do `brand.config` (JSONB)

```ts
{
  identity: {
    mission: string,
    vision: string,
    values: Array<{ name: string, description: string }>,
    positioning: string,
    antiPositioning: string,
    beliefs: string[]              // crenças combatidas
  },
  voice: {
    atributos: { direto: number, acessivel: number, firme: number, humano: number, tecnico: number },
    tom: string,
    vocabulario: { use: string[], avoid: string[] },
    crencasCombatidas: string[],
    antiPatterns: string[]
  },
  visual: {
    tokens: {
      colors: Record<string, string>,
      fonts: Record<string, string>,
      spacing: Record<string, string>,
      shadows: Record<string, string>
    },
    logoUrl: string,
    logoAltUrl: string
  },
  audience: {
    avatares: Array<{
      nome: string,
      faixaSalarial: string,
      estagio: string,
      dores: string[],
      busca: string,
      onde: string,
      transformacao: string
    }>,
    antiAvatar: string
  },
  offer: {
    setores: Array<{
      id: string, nome: string,
      inclui: string[], problemas: string[],
      metricas: string[],
      precoSetup: string, precoRecorrencia: string
    }>,
    pricing: { setupMin: number, setupMax: number, recMin: number, recMax: number },
    courses: Array<{ id: string, nome: string, preco: string, modulos: string[] }>
  },
  journey: {
    motorServicos: Array<{ stage: string, canal: string, acao: string, saidas: string[] }>,
    motorEducacao: Array<{ stage: string, canal: string, acao: string }>
  },
  content: {
    pilares: Array<{ nome: string, objetivo: string, logica: string, exemplos: string[], cta: string, papelFunil: string }>,
    canais: Array<{ nome: string, frequencia: string, tom: string, prioridade: number }>
  },
  meta: {
    seedVersion: string,
    seededAt: string,
    qaEnabled: boolean
  }
}
```

---

## 📁 Estrutura de Arquivos

```
src/
├─ content/brands/zoryon/              # 20 MDs (doc histórica, git)
├─ db/schema.ts                        # + brands, brandVersions
├─ lib/
│   ├─ brands/
│   │   ├─ queries.ts                  # getActiveBrand, updateBrand, listVersions, restoreVersion
│   │   ├─ context.ts                  # server: getActiveBrand() / client: useActiveBrand()
│   │   ├─ injection.ts                # buildVoiceBlock, buildAudienceBlock, buildOfferBlock...
│   │   ├─ schema.ts                   # Zod schema de validação do `config`
│   │   └─ seed/
│   │       ├─ parse-markdown.ts       # helpers de parsing
│   │       └─ zoryon-mapper.ts        # mapeia cada MD → campo do config
│   ├─ ai/
│   │   ├─ motors/
│   │   │   ├─ tribal-v4/              # extraído do prompts.ts atual
│   │   │   │   ├─ orchestrator.ts
│   │   │   │   └─ prompts.ts
│   │   │   └─ brandsdecoded-v4/
│   │   │       ├─ orchestrator.ts
│   │   │       ├─ headline-patterns.ts
│   │   │       ├─ espinha.ts
│   │   │       ├─ copy-blocks.ts
│   │   │       └─ referencias.ts
│   │   ├─ shared/
│   │   │   └─ headline-library.ts     # 8 padrões combináveis
│   │   └─ quality/
│   │       ├─ editorial-qa.ts
│   │       ├─ anti-patterns.ts
│   │       └─ rewrite-loop.ts
│   └─ visual-templates/
│       ├─ mc/                         # existentes
│       └─ brandsdecoded/              # novos (dark/light alternado)
├─ app/(app)/
│   ├─ settings/brand/
│   │   ├─ page.tsx
│   │   ├─ _components/
│   │   │   ├─ brand-form-identity.tsx
│   │   │   ├─ brand-form-voice.tsx
│   │   │   ├─ brand-form-visual.tsx
│   │   │   ├─ brand-form-audience.tsx
│   │   │   ├─ brand-form-offer.tsx
│   │   │   ├─ brand-form-journey.tsx
│   │   │   ├─ brand-form-content.tsx
│   │   │   └─ brand-versions-dialog.tsx
│   │   └─ actions.ts
│   └─ wizard/components/shared/
│       ├─ motor-selector.tsx
│       └─ headline-pattern-picker.tsx
└─ scripts/
    └─ seed-zoryon-brand.ts
```

---

## 🗓️ Plano de PRs

### PR 1 — Infra de marcas (sem tocar geração) ← **✅ CONCLUÍDO (commit `12fcf53`)**

**Objetivo:** schema + seed. Nada na geração ainda.

- [x] Doc de plano (`docs/brand-integration-plan.md`)
- [x] Migration `drizzle/0029_tranquil_nextwave.sql` (gerada via drizzle-kit)
- [x] Schema atualizado: `brands` + `brandVersions` + colunas `brand_id` nas 5 tabelas (libraryItems, scheduledPosts, contentWizards, themes, creativeProjects)
- [x] Relations Drizzle (brandsRelations, brandVersionsRelations)
- [x] `src/lib/brands/schema.ts` (Zod + tipos)
- [x] `src/lib/brands/queries.ts` (CRUD + versionamento automático)
- [x] `src/lib/brands/context.ts` (resolver da marca ativa server-side)
- [x] `src/content/brands/zoryon/` (21 arquivos copiados)
- [x] `public/brands/zoryon/` (logos SVG para uso em URL)
- [x] `src/lib/brands/seed/parse-markdown.ts` (helpers heurísticos)
- [x] `src/lib/brands/seed/zoryon-mapper.ts` (mapper específico)
- [x] `scripts/seed-zoryon-brand.ts` (validado via --dry)
- [x] Scripts npm: `brand:seed:zoryon` e `brand:seed:zoryon:dry`
- [x] Migration 0029 aplicada em **produção** (`shy-voice-16533241`) via MCP Neon — 20 statements executados, sem conflito
- [x] Seed executado — Zoryon criada com `id=1`, `is_default=true`
- [x] JSONB validado via queries SQL: 8 chaves top-level, todas populadas
- [x] Commit `12fcf53`: `feat(brands): schema multi-brand + seed Zoryon` (35 arquivos, +17.9k linhas)

### 🔧 Correção cirúrgica em `drizzle/meta/0028_snapshot.json`

O projeto tinha inconsistência pré-existente: 0027 e 0028 compartilhavam o mesmo `id` e `prevId`. Para que `drizzle-kit generate` funcionasse, alterei:
- `0028.id`: `3888e7f6-cf0e-4e76-ba06-6210c1e020fa` → `ba025720-bd43-4ba8-b56a-bda98915891e`
- `0028.prevId`: `4d4b0086-06e2-4e62-86db-aee9b4f6a5ba` → `3888e7f6-cf0e-4e76-ba06-6210c1e020fa` (agora aponta pro 0027)

Isso não afeta status de aplicação no DB (drizzle rastreia por tag/nome, não UUID).

### 📋 Passos para ativar PR 1 no DB

```bash
# 1. Criar .env.local com DATABASE_URL (e outras vars necessárias)
cp .env.example .env.local
# editar .env.local e preencher DATABASE_URL

# 2. Aplicar migration 0029
npx drizzle-kit migrate --config=drizzle.config.ts

# 3. Validar config sem escrever no DB (opcional)
npm run brand:seed:zoryon:dry

# 4. Seed Zoryon no DB
npm run brand:seed:zoryon
```

### 📊 Resultado esperado do seed (validado em dry-run)

- **identity**: mission/vision/positioning extraídos, 6 values, 7 beliefs
- **voice**: 12 termos "use", 7 "avoid", 7 anti-patterns, atributos oficiais (80/70/75/75/30)
- **visual**: 26 colors, 9 fonts, 12 spacings do `design-tokens.css`
- **audience**: 3 avatares (Operador Travado, Construtor Solo, Jonas)
- **offer**: 5 setores (Atendimento, Vendas, Marketing, Dados, Operações), 2 cursos
- **content**: 4 pilares (Diagnóstico, Setorização, Educação, Bastidores), 6 canais

Campos esparsos (setor.metricas, avatares.estagio vazio em alguns) são aceitáveis — podem ser refinados via UI de edição na PR 3 ou reeditados no `zoryon-mapper.ts` e re-seedados.

### PR 2 — Injeção no Tribal v4

**Objetivo:** Tribal v4 existente passa a ler voz/ICP/pilares do `brand.config` em vez de hardcoded.

- [ ] `src/lib/brands/injection.ts` (builders de bloco de prompt)
- [ ] Refatorar `src/lib/wizard-services/prompts.ts`: extrair hardcodes de marca, passar a receber `brand.config`
- [ ] `src/lib/wizard-services/llm.service.ts`: carregar brand ativa no início do pipeline
- [ ] Aplicar tokens visuais no `(app)/layout.tsx` via CSS vars dinâmicas
- [ ] Testes smoke: gerar conteúdo no wizard, inspecionar prompt final para ver voz vinda do DB
- [ ] Commit: `feat(brands): injetar marca ativa no motor Tribal v4`

### PR 3 — UI `/settings/brand`

**Objetivo:** editar qualquer campo do `brand.config` via UI, com versionamento automático.

- [ ] `src/app/(app)/settings/brand/page.tsx` (tabs)
- [ ] 7 forms (`_components/brand-form-*.tsx`)
- [ ] `actions.ts` (server actions: `updateBrand`, `restoreVersion`)
- [ ] `brand-versions-dialog.tsx` (histórico + restore)
- [ ] Validação com Zod em cada submit
- [ ] Commit: `feat(brands): UI de edição de marca com versionamento`

### PR 4 — QA Editorial Universal

**Objetivo:** validador pós-geração aplicado a qualquer motor.

- [ ] `src/lib/ai/quality/anti-patterns.ts` (regex do filtro editorial)
- [ ] `src/lib/ai/quality/editorial-qa.ts` (LLM judge 7 parâmetros)
- [ ] `src/lib/ai/quality/rewrite-loop.ts` (retry max 2x)
- [ ] Hook no pipeline do Tribal v4
- [ ] Flag `brand.config.meta.qaEnabled` (default true)
- [ ] Logs em `jobs` para debug de reprovação
- [ ] Commit: `feat(quality): QA editorial universal com rewrite automático`

### PR 5 — Motor BrandsDecoded v4

**Objetivo:** segundo motor textual com pipeline da máquina de carrosseis.

- [ ] `src/lib/ai/motors/brandsdecoded-v4/orchestrator.ts` (triagem → headlines → espinha → copy → legenda)
- [ ] `src/lib/ai/motors/brandsdecoded-v4/headline-patterns.ts` (8 padrões enumerados)
- [ ] `src/lib/ai/motors/brandsdecoded-v4/espinha.ts` (6 campos: headline, hook, mecanismo, prova, aplicação, direção)
- [ ] `src/lib/ai/motors/brandsdecoded-v4/copy-blocks.ts` (18 blocos / 9 slides)
- [ ] `src/lib/ai/motors/brandsdecoded-v4/referencias.ts` (few-shots dos 2 carrosseis de referência)
- [ ] `src/lib/ai/shared/headline-library.ts` (biblioteca combinável)
- [ ] `src/app/(app)/wizard/components/shared/motor-selector.tsx`
- [ ] Coluna `motor` em `contentWizards` (migration)
- [ ] QA Editorial aplica automaticamente
- [ ] Commit: `feat(motors): motor BrandsDecoded v4 com 8 padrões de headline`

### PR 6 — Templates Visuais BrandsDecoded

**Objetivo:** adicionar layouts do BD ao acervo (sem remover os nossos).

- [ ] `src/lib/visual-templates/brandsdecoded/` (dark/light alternado, 9 slides)
- [ ] Mapeamento campo→slot agnóstico de motor
- [ ] Seletor no wizard mostra ambos conjuntos
- [ ] Commit: `feat(templates): adicionar templates visuais BrandsDecoded`

### PR 7 (opcional) — Combinação cross-motor

- [ ] Tribal v4 ganha opção "gerar headlines com padrões BD"
- [ ] BrandsDecoded ganha opção "usar ângulos tribais como tom base"
- [ ] `headline-pattern-picker.tsx` disponível em ambos motores

---

## 🚨 Riscos & Atenções

| Risco | Mitigação |
|-------|-----------|
| `prompts.ts` tem 2872 linhas | Refatoração cirúrgica na PR 2, mantendo API externa estável |
| Migration adiciona `brand_id` em 7 tabelas | Default Zoryon para linhas existentes, `ON DELETE SET NULL` (não cascade — deletar marca não perde conteúdo) |
| `userVariables` pode sobrepor `brand.config` | Verificar na PR 1; se houver overlap, manter `userVariables` para vars pessoais e `brand.config` para marca |
| Parsing dos MDs é heurístico | Revisar manualmente após seed; ajustar mapper se necessário |
| QA pode reprovar muito | Flag `qaEnabled` permite desligar; logar tudo em `jobs` |

---

## 📚 Referências

- `temporaria/zoryon-brandkit/PLANO-MESTRE.md` — índice do brandkit
- `temporaria/zoryon-brandkit/CLAUDE.md` — guia de consumo
- `temporaria/brandformat/system-prompt-maquina-carrosseis-v4.md` — orquestrador BD
- `temporaria/brandformat/brandsdecoded-banco-de-headlines.md` — 8 padrões
- `temporaria/brandformat/brandsdecoded-manual-de-qualidade.md` — 7 parâmetros QA

---

## ✅ PR 1 Review Fixes (aplicados)

Após review via `pr-review-toolkit`, aplicados em 4 agentes paralelos:

### Core logic (queries/context/seed)
- `updateBrandConfig` atômico via `db.batch([...])` — neon-http não suporta `db.transaction`
- `getBrandConfig` lança `ConfigError` com `issues` do Zod (em vez de `null` silencioso)
- `context.ts` usa `NotFoundError`/`ConfigError` de `src/lib/errors.ts`
- `ACTIVE_BRAND_SLUG` inexistente agora lança em vez de fallback silencioso
- Seed usa `createBrand`/`updateBrandConfig` (via queries layer) — preserva `seededAt` original
- `readBrandkitFile` com erro contextualizado por campo

### Parser/mapper
- `buildZoryonConfig` retorna `{ config, warnings[] }` — acumula `SeedWarning` quando regex falha
- `parsePricing` parseia ranges do `04-modelo-receita.md` (fallback hardcoded com warning)
- `stripBlockquotes` renomeado (era `stripFrontmatter`, não removia frontmatter)
- Banners ASCII decorativos removidos

### Schema Zod/Drizzle
- `brands.config` e `brand_versions.config` tipados como `jsonb().$type<BrandConfig>()`
- Partial unique index `brands_single_default_idx` em `is_default WHERE is_default = true` (migration 0030)
- `slugSchema` regex kebab-case lowercase exportado
- `pricing` com `.refine()` para setupMin≤setupMax e recMin≤recMax
- Journey stages separados em `servico` (com `saidas`) e `educacao` (sem)
- `seededAt` como `z.string().datetime()`

### Testes (novo precedente)
- Vitest instalado, `vitest.config.ts` na raiz
- `src/lib/brands/__tests__/` com 30 testes (parse-markdown, schema, queries) — todos passam
- Scripts npm `test` e `test:watch`

## ✅ PR 2 — Injeção do brand ativo no Tribal v4 (feito nesta mesma sessão)

- `src/lib/brands/injection.ts`: `brandConfigToPromptVariables`, `getBrandPromptVariables`, builders por bloco
- `llm.service.ts`: `loadAndFormatUserVariables` agora tem **3 camadas** de precedência: marca ativa (base) < user variables < inputs do wizard
- `generate-titles/route.ts`: mesmo padrão de merge para rotas de vídeo
- Helper `splitCsv` localizado na rota que precisa
- Zero mudanças em `prompts.ts` — injeção via `variablesContext` string (arquitetura existente)

## 📊 Estado do DB (produção `shy-voice-16533241`)

- Migration 0029 aplicada ✅
- Migration 0030 aplicada ✅ (partial unique index)
- Zoryon re-seedada via queries layer ✅ (versions_count=1, seededAt preservado)

## 🔄 Changelog deste documento

- **2026-04-13** — Documento criado, PR 1 iniciado
- **2026-04-13** — PR 1 concluído (commit `12fcf53`)
- **2026-04-13** — PR 1 review fixes + PR 2 (injeção Tribal v4) concluídos
