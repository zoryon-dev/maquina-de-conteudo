# Article Wizard — Plano de Implementação v2.0
## Documento 04 — Plano Detalhado de Execução

**Versão:** 1.0
**Data:** Fevereiro 2026
**Branch:** `feat/article_create`
**Baseado em:** 001_nova_feature.md (PRD), 002_nova_feature.md (Diagramas), 003_nova_feature.md (Prompts)

---

## Sumário

- [Visão Geral da Implementação](#visão-geral)
- [Fase 0 — Fundação (Database + Types + Estrutura)](#fase-0)
- [Fase 1 — Pipeline Base de Artigos (9 Prompts)](#fase-1)
- [Fase 2 — UI do Article Wizard (Steps + Preview)](#fase-2)
- [Fase 3 — Módulo Site Intelligence (Pré-Pipeline)](#fase-3)
- [Fase 4 — Interlinking Real + Metadados (Pós-Pipeline)](#fase-4)
- [Fase 5 — Camada GEO (Generative Engine Optimization)](#fase-5)
- [Fase 6 — Modo Extensão (Pipeline Alternativo)](#fase-6)
- [Fase 7 — Derivação Cross-Format (Integração)](#fase-7)
- [Erros Conhecidos a Evitar](#erros-conhecidos)
- [Padrões Reutilizáveis do Projeto](#padroes-reutilizaveis)
- [Estimativa de Esforço](#estimativa)

---

## Visão Geral da Implementação {#visão-geral}

### Estratégia

O Article Wizard é um **wizard isolado**, separado do wizard de social media existente. Compartilha:
- **Infraestrutura**: Queue system, worker pattern, storage, auth
- **Serviços**: Firecrawl, Tavily, OpenRouter, Voyage AI
- **Componentes UI**: CollapsibleSection, ProcessingModal, StepsIndicator (adaptados)

**NÃO compartilha**:
- Tabelas do banco (novas tabelas `articles`, `projects`, etc.)
- Prompts (novo arquivo `src/lib/article-services/prompts.ts`)
- Steps do wizard (novos componentes em `src/app/(app)/articles/`)
- Tipos (novos tipos em `src/lib/article-services/types.ts`)

### Estrutura de Diretórios Planejada

```
src/
├── app/(app)/articles/
│   ├── page.tsx                          # Lista de artigos (Server Component)
│   ├── new/
│   │   └── page.tsx                      # Entry point do Article Wizard
│   ├── [id]/
│   │   ├── page.tsx                      # Visualização/edição do artigo
│   │   └── extend/
│   │       └── page.tsx                  # Modo Extensão (Fase 6)
│   ├── components/
│   │   ├── article-wizard-page.tsx       # Client orchestrator
│   │   ├── steps/
│   │   │   ├── step-1-inputs.tsx         # Configuração inicial
│   │   │   ├── step-2-research.tsx       # Pesquisa + Análise
│   │   │   ├── step-3-outline.tsx        # Seleção de outline
│   │   │   ├── step-4-production.tsx     # Produção seção a seção (progress)
│   │   │   ├── step-5-assembly.tsx       # Montagem + Interlinking
│   │   │   ├── step-6-seo-geo.tsx        # SEO + GEO Check
│   │   │   ├── step-7-optimization.tsx   # SEO + GEO Optimizer
│   │   │   ├── step-8-metadata.tsx       # Metadados + Preview
│   │   │   └── step-9-cross-format.tsx   # Derivação Cross-Format
│   │   ├── shared/
│   │   │   ├── article-preview.tsx       # Preview do artigo em Markdown
│   │   │   ├── seo-score-card.tsx        # Card de SEO Score
│   │   │   ├── geo-score-card.tsx        # Card de GEO Score
│   │   │   ├── interlinking-review.tsx   # Review de links
│   │   │   ├── metadata-preview.tsx      # Preview de metadados
│   │   │   └── article-steps-indicator.tsx
│   │   └── extension/
│   │       ├── extension-wizard.tsx      # Wizard do modo extensão
│   │       ├── diagnosis-view.tsx        # Visualização do diagnóstico
│   │       └── expansion-selector.tsx    # Seleção de fixes
│   └── actions/
│       ├── article-actions.ts            # Server Actions (CRUD)
│       └── site-intelligence-actions.ts  # Server Actions (SI)
│
├── lib/article-services/
│   ├── types.ts                          # Todos os tipos do Article Wizard
│   ├── prompts/
│   │   ├── index.ts                      # Barrel exports
│   │   ├── base-pipeline.ts             # Prompts 01-09 (pipeline base)
│   │   ├── site-intelligence.ts         # SI-02, SI-03
│   │   ├── interlinking.ts              # IL-01
│   │   ├── metadata.ts                  # META-01
│   │   ├── geo.ts                       # GEO-01, GEO-02
│   │   ├── extension.ts                # EXT-01, EXT-02, EXT-03
│   │   └── cross-format.ts             # CROSS-01, CROSS-02, CROSS-03
│   ├── services/
│   │   ├── pipeline.service.ts           # Orquestrador do pipeline
│   │   ├── research.service.ts          # Análise + Síntese
│   │   ├── outline.service.ts           # Geração de outlines
│   │   ├── section-producer.service.ts  # Produção seção a seção
│   │   ├── assembler.service.ts         # Montagem do artigo
│   │   ├── seo-analyzer.service.ts      # SEO check
│   │   ├── seo-optimizer.service.ts     # SEO optimization
│   │   ├── title-generator.service.ts   # Gerador de títulos
│   │   ├── site-intelligence.service.ts # URL Mapper + Brand Voice + Gap
│   │   ├── interlinking.service.ts      # Interlinking contextual
│   │   ├── metadata.service.ts          # Gerador de metadados
│   │   ├── geo-analyzer.service.ts      # GEO Analysis
│   │   ├── geo-optimizer.service.ts     # GEO Optimization
│   │   ├── extension.service.ts         # Modo Extensão
│   │   └── cross-format.service.ts      # Derivação Cross-Format
│   └── index.ts                          # Barrel exports
│
├── app/api/articles/
│   ├── route.ts                          # CRUD de artigos
│   ├── [id]/
│   │   ├── route.ts                      # GET/PATCH/DELETE artigo
│   │   ├── submit/route.ts              # Dispara jobs do pipeline
│   │   └── derivations/route.ts         # CRUD de derivações
│   └── site-intelligence/
│       ├── route.ts                      # CRUD site intelligence
│       └── crawl/route.ts               # Trigger de crawl
│
└── db/
    └── schema.ts                         # + novas tabelas (articles, projects, etc.)
```

### Dependências entre Fases

```
Fase 0 (Fundação) ─────┐
                        ▼
Fase 1 (Pipeline Base) ─┐
                        ▼
Fase 2 (UI Wizard) ─────┤
                        ├──▶ Fase 3 (Site Intelligence)
                        ├──▶ Fase 4 (Interlinking + Metadados)
                        ├──▶ Fase 5 (GEO)
                        │
                        ▼
                   Fase 6 (Extensão) ← independente após Fase 2
                   Fase 7 (Cross-Format) ← independente após Fase 2
```

---

## Fase 0 — Fundação (Database + Types + Estrutura) {#fase-0}

> **STATUS: ✅ CONCLUÍDA** (2026-02-07)
>
> **Alterações realizadas:**
> - 6 novos enums no `src/db/schema.ts` (articleWizardStep, siteIntelligenceStatus, articleLinkStatus, articleExtensionStatus, articleDerivationFormat, articleDerivationStatus)
> - 12 novos job types adicionados ao `jobTypeEnum` existente
> - 8 novas tabelas: `projects`, `articles`, `site_intelligence`, `article_links`, `article_metadata`, `article_geo_scores`, `article_extensions`, `article_derivations`
> - Relations Drizzle completas + type exports
> - Migration `0020_optimal_nico_minoru.sql` gerada e aplicada com sucesso
> - `src/lib/article-services/types.ts` criado com ~30 interfaces/tipos
> - `src/lib/article-services/index.ts` barrel export
> - Estrutura de diretórios completa (pages, components, actions, api routes, services, prompts)
>
> **Nota:** Migration 0019 estava não-registrada no Drizzle (colunas já existiam no banco). Resolvido inserindo o registro manualmente na tabela `drizzle.__drizzle_migrations`.

### Objetivo
Criar toda a fundação: tabelas do banco, tipos TypeScript, enums, e estrutura de diretórios.

### Etapa 0.1 — Schema do Banco de Dados

**Arquivo:** `src/db/schema.ts`

#### Tarefa 0.1.1 — Novos Enums

```typescript
// Article wizard step enum (NOVO - separado do wizard existente)
export const articleWizardStepEnum = pgEnum("article_wizard_step", [
  "inputs",           // Configuração inicial
  "research",         // Pesquisa + análise
  "outline",          // Seleção de outline
  "production",       // Produção seção a seção
  "assembly",         // Montagem + interlinking
  "seo_geo_check",    // SEO + GEO analysis
  "optimization",     // SEO + GEO optimization
  "metadata",         // Metadados + preview final
  "cross_format",     // Derivação cross-format
  "completed",        // Concluído
  "abandoned",        // Abandonado
]);

// Site intelligence status enum
export const siteIntelligenceStatusEnum = pgEnum("site_intelligence_status", [
  "pending",
  "crawling",
  "analyzing",
  "complete",
  "error",
]);

// Article link status enum
export const articleLinkStatusEnum = pgEnum("article_link_status", [
  "suggested",
  "approved",
  "rejected",
  "inserted",
]);

// Article extension status enum
export const articleExtensionStatusEnum = pgEnum("article_extension_status", [
  "pending",
  "diagnosed",
  "in_progress",
  "complete",
]);

// Article derivation format enum
export const articleDerivationFormatEnum = pgEnum("article_derivation_format", [
  "linkedin",
  "video_script",
  "carousel",
]);

// Article derivation status enum
export const articleDerivationStatusEnum = pgEnum("article_derivation_status", [
  "generated",
  "edited",
  "published",
]);
```

> **IMPORTANTE:** Não usar `IF NOT EXISTS` com `CREATE TYPE` no PostgreSQL.
> **Ref:** `.context/docs/known-and-corrected-errors/index.md` (Erro #7)

#### Tarefa 0.1.2 — Tabela `projects`

```typescript
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  siteUrl: text("site_url"),               // URL do blog do cliente
  brandPresets: jsonb("brand_presets"),     // Configurações da marca
  settings: jsonb("settings"),             // Configurações gerais
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("projects_user_id_idx").on(table.userId),
]);
```

> **Decisão de Design**: Tabela `projects` permite multi-tenant e multi-site. Cada usuário pode ter múltiplos projetos/sites. Os artigos são vinculados a um projeto, que carrega configurações de brand voice, site URL, etc.

#### Tarefa 0.1.3 — Tabela `articles`

```typescript
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "set null" }),

  // Wizard state
  currentStep: articleWizardStepEnum("current_step").notNull().default("inputs"),

  // Inputs
  mode: text("mode").default("create"),     // "create" | "extend"
  title: text("title"),
  primaryKeyword: text("primary_keyword"),
  secondaryKeywords: jsonb("secondary_keywords").$type<string[]>(),
  articleType: text("article_type"),          // "how-to", "listicle", "guia", etc.
  targetWordCount: integer("target_word_count").default(2000),
  referenceUrl: text("reference_url"),       // URL de artigo base
  referenceMotherUrl: text("reference_mother_url"), // URL de artigo mãe
  model: text("model"),                      // OpenRouter model ID
  customInstructions: text("custom_instructions"),
  authorName: text("author_name"),

  // RAG config (reutilizar do wizard existente)
  ragConfig: jsonb("rag_config").$type<{
    mode?: "auto" | "manual" | "off";
    threshold?: number;
    maxChunks?: number;
    documents?: number[];
    collections?: number[];
  }>(),

  // Processing results
  extractedBaseContent: jsonb("extracted_base_content"),   // Firecrawl artigo base
  extractedMotherContent: jsonb("extracted_mother_content"), // Firecrawl artigo mãe
  researchResults: jsonb("research_results"),              // Tavily search
  synthesizedResearch: jsonb("synthesized_research"),      // Synthesizer output

  // Outlines (3 propostas)
  generatedOutlines: jsonb("generated_outlines").$type<Array<{
    id: string;
    title: string;
    description: string;
    sections: Array<{
      heading: string;
      subheadings: string[];
      estimatedWords: number;
      keyPoints: string[];
    }>;
    estimatedTotalWords: number;
    differentiator: string;
  }>>(),
  selectedOutlineId: text("selected_outline_id"),

  // Production (seção a seção)
  producedSections: jsonb("produced_sections").$type<Array<{
    sectionId: string;
    heading: string;
    content: string;
    wordCount: number;
    status: "pending" | "generating" | "completed" | "failed";
  }>>(),

  // Assembled article
  assembledContent: text("assembled_content"),    // Artigo montado (markdown)
  assembledWithLinks: text("assembled_with_links"), // Artigo com links internos

  // SEO + GEO scores
  seoScore: integer("seo_score"),
  geoScore: integer("geo_score"),
  seoReport: jsonb("seo_report"),
  geoReport: jsonb("geo_report"),

  // Optimized content
  optimizedContent: text("optimized_content"),    // Artigo final otimizado

  // Final output
  finalTitle: text("final_title"),
  finalContent: text("final_content"),             // Artigo publicável
  finalWordCount: integer("final_word_count"),

  // Job tracking
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  jobStatus: jobStatusEnum("job_status"),
  processingProgress: jsonb("processing_progress").$type<{
    stage: string;
    percent: number;
    message: string;
  }>(),
  jobError: text("job_error"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("articles_user_id_idx").on(table.userId),
  index("articles_project_id_idx").on(table.projectId),
  index("articles_current_step_idx").on(table.currentStep),
  index("articles_created_at_idx").on(table.createdAt),
]);
```

> **Padrão seguido:** Mesmo padrão do `contentWizards` — JSONB para dados flexíveis, job tracking integrado, processamento via queue.
> **Ref:** `database-patterns` memória Serena

#### Tarefa 0.1.4 — Tabela `site_intelligence`

```typescript
export const siteIntelligence = pgTable("site_intelligence", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  siteUrl: text("site_url").notNull(),
  urlMap: jsonb("url_map").default({}),
  brandVoiceProfile: jsonb("brand_voice_profile").default({}),
  keywordGaps: jsonb("keyword_gaps").default({}),
  competitorUrls: jsonb("competitor_urls").$type<string[]>().default([]),
  crawledAt: timestamp("crawled_at"),
  urlsCount: integer("urls_count").default(0),
  status: siteIntelligenceStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("site_intelligence_project_id_idx").on(table.projectId),
  index("site_intelligence_status_idx").on(table.status),
]);
```

> **Nota:** `competitor_urls` usa `jsonb` com tipo `string[]` em vez de `text[]` do PostgreSQL, seguindo padrão do projeto que prefere JSONB para arrays.

#### Tarefa 0.1.5 — Tabela `article_links`

```typescript
export const articleLinks = pgTable("article_links", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  anchorText: text("anchor_text").notNull(),
  relevanceScore: integer("relevance_score").default(0),
  isReverse: boolean("is_reverse").default(false),
  status: articleLinkStatusEnum("status").notNull().default("suggested"),
  insertionPoint: text("insertion_point"),
  rationale: text("rationale"),
  insertedAt: timestamp("inserted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("article_links_article_id_idx").on(table.articleId),
  index("article_links_status_idx").on(table.status),
]);
```

#### Tarefa 0.1.6 — Tabela `article_metadata`

```typescript
export const articleMetadata = pgTable("article_metadata", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  metaTitles: jsonb("meta_titles").default([]),
  metaDescriptions: jsonb("meta_descriptions").default([]),
  slug: text("slug"),
  altTexts: jsonb("alt_texts").default([]),
  schemaArticle: jsonb("schema_article").default({}),
  schemaFaq: jsonb("schema_faq"),
  schemaHowto: jsonb("schema_howto"),
  schemaBreadcrumb: jsonb("schema_breadcrumb"),
  reverseAnchors: jsonb("reverse_anchors").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("article_metadata_article_id_idx").on(table.articleId),
]);
```

#### Tarefa 0.1.7 — Tabela `article_geo_scores`

```typescript
export const articleGeoScores = pgTable("article_geo_scores", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").default(0),
  directAnswers: integer("direct_answers").default(0),
  citableData: integer("citable_data").default(0),
  extractableStructure: integer("extractable_structure").default(0),
  authorityEeat: integer("authority_eeat").default(0),
  topicCoverage: integer("topic_coverage").default(0),
  schemaMetadata: integer("schema_metadata").default(0),
  report: jsonb("report").default({}),
  priorityFixes: jsonb("priority_fixes").default([]),
  analyzedAt: timestamp("analyzed_at").defaultNow(),
}, (table) => [
  index("article_geo_scores_article_id_idx").on(table.articleId),
]);
```

#### Tarefa 0.1.8 — Tabela `article_extensions`

```typescript
export const articleExtensions = pgTable("article_extensions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  diagnosis: jsonb("diagnosis").default({}),
  selectedFixes: jsonb("selected_fixes").default([]),
  generatedContent: jsonb("generated_content").default({}),
  status: articleExtensionStatusEnum("status").notNull().default("pending"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("article_extensions_article_id_idx").on(table.articleId),
]);
```

#### Tarefa 0.1.9 — Tabela `article_derivations`

```typescript
export const articleDerivations = pgTable("article_derivations", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  format: articleDerivationFormatEnum("format").notNull(),
  content: jsonb("content").default({}),
  status: articleDerivationStatusEnum("status").notNull().default("generated"),
  publishedAt: timestamp("published_at"),
  publishedUrl: text("published_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("article_derivations_article_id_idx").on(table.articleId),
  index("article_derivations_format_idx").on(table.format),
]);
```

#### Tarefa 0.1.10 — Relations Drizzle

```typescript
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  articles: many(articles),
  siteIntelligence: many(siteIntelligence),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  user: one(users, { fields: [articles.userId], references: [users.id] }),
  project: one(projects, { fields: [articles.projectId], references: [projects.id] }),
  links: many(articleLinks),
  metadata: one(articleMetadata),
  geoScores: one(articleGeoScores),
  extensions: many(articleExtensions),
  derivations: many(articleDerivations),
}));
```

#### Tarefa 0.1.11 — Novos Job Types

Adicionar ao `jobTypeEnum` existente:

```typescript
// Adicionar estes valores ao enum existente
"article_research",           // Pesquisa + análise de artigo base/mãe
"article_outline",            // Geração de outlines
"article_section_production", // Produção seção a seção
"article_assembly",           // Montagem + interlinking
"article_seo_geo_check",     // SEO + GEO analysis
"article_optimization",      // SEO + GEO optimization
"article_metadata",          // Geração de metadados
"article_cross_format",      // Derivação cross-format
"site_intelligence_crawl",   // Crawl do site
"site_intelligence_analyze", // Análise pós-crawl
"article_extension_diagnose", // Diagnóstico de extensão
"article_extension_expand",  // Expansão de artigo
```

#### Tarefa 0.1.12 — Gerar e Executar Migration

```bash
npx drizzle-kit generate  # Gerar SQL
npx drizzle-kit migrate   # Executar migration
```

> **CUIDADO:** Testar migration em branch Neon temporário antes de aplicar no main.
> **Ref:** `database-patterns` memória Serena — "Migration com MCP Neon"

#### Tarefa 0.1.13 — Type Exports

```typescript
// Em schema.ts, após as tabelas:
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type SiteIntelligenceRecord = typeof siteIntelligence.$inferSelect;
export type ArticleLink = typeof articleLinks.$inferSelect;
export type ArticleMetadataRecord = typeof articleMetadata.$inferSelect;
export type ArticleGeoScore = typeof articleGeoScores.$inferSelect;
export type ArticleExtension = typeof articleExtensions.$inferSelect;
export type ArticleDerivation = typeof articleDerivations.$inferSelect;
```

---

### Etapa 0.2 — Types do Article Wizard

**Arquivo:** `src/lib/article-services/types.ts`

#### Tarefa 0.2.1 — Tipos Base

```typescript
// ArticleWizardFormData — inputs do formulário
// ArticleOutline — estrutura de outline
// ProducedSection — seção produzida
// SeoReport — relatório SEO
// GeoReport — relatório GEO
// SeoMetadataPackage — pacote de metadados
// InterlinkingSuggestion — sugestão de link
// ReverseLinkSuggestion — sugestão de link reverso
// SiteUrlMapEntry — entrada do mapa de URLs
// BrandVoiceProfile — perfil de voz da marca
// KeywordGap — gap de keyword
// ArticleDiagnosis — diagnóstico de extensão
// ExpansionPlan — plano de expansão
// CrossFormatOutput — output de derivação
// ServiceResult<T> — padrão existente do projeto
```

> **Padrão seguido:** Mesmo pattern de `ServiceResult<T>` do wizard existente.
> **Ref:** `wizard-patterns` memória Serena

### Etapa 0.3 — Estrutura de Diretórios

#### Tarefa 0.3.1 — Criar estrutura de pastas

```bash
mkdir -p src/app/\(app\)/articles/new
mkdir -p src/app/\(app\)/articles/\[id\]/extend
mkdir -p src/app/\(app\)/articles/components/steps
mkdir -p src/app/\(app\)/articles/components/shared
mkdir -p src/app/\(app\)/articles/components/extension
mkdir -p src/app/\(app\)/articles/actions
mkdir -p src/lib/article-services/prompts
mkdir -p src/lib/article-services/services
mkdir -p src/app/api/articles/\[id\]/submit
mkdir -p src/app/api/articles/\[id\]/derivations
mkdir -p src/app/api/articles/site-intelligence/crawl
```

---

## Fase 1 — Pipeline Base de Artigos (9 Prompts) {#fase-1}

> **✅ STATUS: CONCLUÍDA**
> - Etapa 1.1 (Prompts): 10 prompts em `prompts/base-pipeline.ts` + `extractArticleJSON` utility
> - Etapa 1.2 (Services): 8 services (llm, research, outline, section-producer, assembler, seo-analyzer, seo-optimizer, title-generator) + pipeline orchestrator
> - Etapa 1.3 (API Routes): CRUD `/api/articles`, submit `/api/articles/[id]/submit`, 6 article handlers no worker
> - Queue types: `ArticlePipelinePayload` + 6 `JobType` entries
> - Fix: `db.query.articles` → `db.select().from(articles)` (db sem schema generic)

### Objetivo
Implementar os 9 prompts do pipeline base que geram um artigo do zero.

### Etapa 1.1 — Prompts Base (9 etapas)

**Diretório:** `src/lib/article-services/prompts/`

#### Tarefa 1.1.1 — Prompt 01: System Prompt Base

**Arquivo:** `base-pipeline.ts`

System prompt com identidade do agente articulista, filosofia de criação de artigos, regras de qualidade, e formatação Markdown.

#### Tarefa 1.1.2 — Prompt 02: Analisador de Artigo Base

Extrai estrutura, tom, dados-chave do artigo de referência (URL via Firecrawl).

#### Tarefa 1.1.3 — Prompt 03: Analisador de Artigo Mãe

Analisa artigo mãe (se fornecido) para contexto de cluster temático e interlinking.

#### Tarefa 1.1.4 — Prompt 04: Research Synthesizer

Reutiliza padrão do Synthesizer v3.1 existente, adaptado para artigos de blog.

**Importante:** Usar `getSynthesizerPrompt()` como base e adaptar para formato artigo.

#### Tarefa 1.1.5 — Prompt 05: Gerador de Outlines (3 propostas)

Gera 3 outlines diferentes para o artigo. Cada outline com:
- Título
- Seções (H2/H3) com estimativa de palavras
- Diferenciador competitivo
- Estimativa total de palavras

#### Tarefa 1.1.6 — Prompt 06: Produtor de Seção

Produz conteúdo de UMA seção por vez (H2 completa com H3s).

**Decisão:** Produção seção a seção (não artigo inteiro de uma vez) permite:
- Progresso granular na UI
- Menor risco de timeout
- Possibilidade de regenerar seções individuais

#### Tarefa 1.1.7 — Prompt 07: Montador + Interlinking

Monta todas as seções em artigo coeso. Adiciona transições, interlinking placeholder.

#### Tarefa 1.1.8 — Prompt 08: SEO Analyzer

Analisa o artigo montado e gera score SEO com issues e recomendações.

#### Tarefa 1.1.9 — Prompt 09: SEO Optimizer

Aplica correções SEO identificadas, mantendo qualidade do conteúdo.

#### Tarefa 1.1.10 — Prompt 10: Title Generator

Gera 5 opções de título com CTR score estimado.

### Etapa 1.2 — Services do Pipeline Base

**Diretório:** `src/lib/article-services/services/`

#### Tarefa 1.2.1 — Pipeline Orchestrator Service

**Arquivo:** `pipeline.service.ts`

```typescript
export async function runArticlePipeline(
  articleId: number,
  stage: ArticlePipelineStage
): Promise<ServiceResult<void>>
```

Orquestra as etapas do pipeline, atualizando o progresso no banco a cada step.

**Padrão seguido:** Mesmo pattern do worker handler do wizard existente.

#### Tarefa 1.2.2 — Research Service

**Arquivo:** `research.service.ts`

Reutiliza serviços existentes:
- `firecrawl.service.ts` → extractFromUrl()
- `tavily.service.ts` → contextualSearch()
- `synthesizer.service.ts` → synthesizeResearch() (adaptado)

> **IMPORTANTE:** Reutilizar imports dos `wizard-services/` existentes, NÃO duplicar código.

#### Tarefa 1.2.3 — Outline Service

**Arquivo:** `outline.service.ts`

Gera 3 propostas de outline usando Prompt 05.

#### Tarefa 1.2.4 — Section Producer Service

**Arquivo:** `section-producer.service.ts`

Loop sobre seções do outline, produzindo uma a uma com Prompt 06.

#### Tarefa 1.2.5 — Assembler Service

**Arquivo:** `assembler.service.ts`

Monta artigo completo a partir das seções produzidas.

#### Tarefa 1.2.6 — SEO Analyzer Service

**Arquivo:** `seo-analyzer.service.ts`

Analisa artigo e retorna score + report.

#### Tarefa 1.2.7 — SEO Optimizer Service

**Arquivo:** `seo-optimizer.service.ts`

Aplica correções SEO baseado no report.

#### Tarefa 1.2.8 — Title Generator Service

**Arquivo:** `title-generator.service.ts`

Gera títulos com CTR score.

### Etapa 1.3 — API Routes

#### Tarefa 1.3.1 — CRUD de Artigos

**Arquivo:** `src/app/api/articles/route.ts`

- `POST` → Criar artigo (step = "inputs")
- `GET` → Listar artigos do usuário

**Arquivo:** `src/app/api/articles/[id]/route.ts`

- `GET` → Retornar artigo completo
- `PATCH` → Atualizar dados (auto-save, transições)
- `DELETE` → Soft delete

#### Tarefa 1.3.2 — Submit (Trigger Jobs)

**Arquivo:** `src/app/api/articles/[id]/submit/route.ts`

- `POST { submitType: "research" }` → Job ARTICLE_RESEARCH
- `POST { submitType: "outline" }` → Job ARTICLE_OUTLINE
- `POST { submitType: "production" }` → Job ARTICLE_SECTION_PRODUCTION
- `POST { submitType: "assembly" }` → Job ARTICLE_ASSEMBLY
- `POST { submitType: "seo_geo_check" }` → Job ARTICLE_SEO_GEO_CHECK
- `POST { submitType: "optimization" }` → Job ARTICLE_OPTIMIZATION
- `POST { submitType: "metadata" }` → Job ARTICLE_METADATA

> **Padrão seguido:** Mesmo pattern do wizard submit existente, com auto-trigger em dev.
> **Ref:** `wizard-patterns` — "Auto-Trigger Pattern"

#### Tarefa 1.3.3 — Worker Handlers

**Arquivo:** `src/app/api/workers/route.ts` (EXISTENTE — adicionar novos handlers)

Adicionar handlers para os novos job types:
```typescript
case "article_research":
  return handleArticleResearch(job);
case "article_outline":
  return handleArticleOutline(job);
// ... etc
```

> **CUIDADO:** JSONB pode vir como objeto ou string. Sempre usar `parseJSONB()`.
> **Ref:** `.context/docs/known-and-corrected-errors/032-json-parse-object-error.md`

---

## Fase 2 — UI do Article Wizard (Steps + Preview) {#fase-2}

### Objetivo
Implementar toda a interface do Article Wizard, reutilizando componentes UI existentes.

> **✅ STATUS: CONCLUÍDA**
> - Etapa 2.1 (Páginas): `page.tsx`, `articles-list-page.tsx`, `new/page.tsx`, `[id]/page.tsx`
> - Etapa 2.2 (Orchestrator): `article-wizard-page.tsx` com auto-save, polling, step transitions
> - Etapa 2.3 (Steps): 8 steps (inputs, research, outline, production, assembly, seo-geo, optimization, metadata)
> - Etapa 2.4 (Navbar): "Artigos" adicionado ao menu "Criar" com ícone FileText
> - Shared: `article-steps-indicator.tsx` com 8 steps lineares + progress bar
> - Componentes reutilizados: CollapsibleSection, Button, Input, Label, Textarea

### Etapa 2.1 — Página de Entrada

#### Tarefa 2.1.1 — Articles List Page

**Arquivo:** `src/app/(app)/articles/page.tsx` (Server Component)

Lista de artigos com filtros, busca, cards. Seguir padrão da Library page.

#### Tarefa 2.1.2 — New Article Entry Point

**Arquivo:** `src/app/(app)/articles/new/page.tsx` (Server Component)

Cria artigo via server action e redireciona para wizard.

### Etapa 2.2 — Wizard Orchestrator

#### Tarefa 2.2.1 — Article Wizard Page

**Arquivo:** `src/app/(app)/articles/components/article-wizard-page.tsx`

```typescript
"use client"
// Orquestrador com state management para steps
// Polling de progresso para steps de processamento
// Auto-save nos inputs
```

**Reutilizar:**
- `StepsIndicator` (adaptar do wizard existente)
- `ProcessingModal` (pattern existente)

> **CUIDADO:** Infinite loops com useCallback/useEffect. Usar `useRef` para comparação.
> **Ref:** `.context/docs/known-and-corrected-errors/004-infinite-loop-hooks.md`

### Etapa 2.3 — Steps do Wizard

#### Tarefa 2.3.1 — Step 1: Inputs

**Arquivo:** `steps/step-1-inputs.tsx`

Formulário com:
- Projeto/Site (select + criar novo)
- Keyword principal + secundárias
- Tipo de artigo (how-to, listicle, guia, comparativo, opinião, case-study)
- URLs de referência (artigo base + artigo mãe)
- Word count alvo
- Configurações de IA (modelo)
- RAG config (reutilizar `DocumentConfigForm`)
- Instruções customizadas

**Reutilizar:**
- `CollapsibleSection` de `@/components/ui/collapsible`
- Classes de input dark mode: `!border-white/10 !bg-white/[0.02] !text-white`

> **Ref:** `wizard-patterns` — "Inputs com Background Gradiente"

#### Tarefa 2.3.2 — Step 2: Research (Processing)

**Arquivo:** `steps/step-2-research.tsx`

Tela de progresso com stages:
1. Extraindo conteúdo de referência... (Firecrawl)
2. Pesquisando contexto... (Tavily)
3. Sintetizando pesquisa... (Synthesizer)

Usa polling pattern existente.

#### Tarefa 2.3.3 — Step 3: Outline Selection

**Arquivo:** `steps/step-3-outline.tsx`

3 cards com outlines propostos. Cada card mostra:
- Título proposto
- Seções (H2s) com word count estimado
- Diferenciador
- Total de palavras estimado

Usuário seleciona 1 e pode customizar antes de prosseguir.

#### Tarefa 2.3.4 — Step 4: Production (Processing)

**Arquivo:** `steps/step-4-production.tsx`

Progresso seção a seção:
```
[✅] 1. Introdução (350 palavras)
[✅] 2. O que é Marketing Digital (520 palavras)
[⏳] 3. Estratégias Avançadas... (gerando...)
[⬜] 4. Ferramentas Essenciais
[⬜] 5. Cases de Sucesso
[⬜] 6. Conclusão
```

#### Tarefa 2.3.5 — Step 5: Assembly + Interlinking Review

**Arquivo:** `steps/step-5-assembly.tsx`

Preview do artigo montado com:
- Artigo em markdown renderizado
- Sidebar com sugestões de interlinking (se site intelligence disponível)
- Toggle auto/manual para links

#### Tarefa 2.3.6 — Step 6: SEO + GEO Check

**Arquivo:** `steps/step-6-seo-geo.tsx`

Dashboard side-by-side:
```
┌─────────────────┬─────────────────┐
│   SEO Score      │   GEO Score      │
│     85/100       │     72/100       │
│                  │                  │
│  Issues:         │  Issues:         │
│  - H1 missing    │  - No FAQ        │
│  - Keyword low   │  - Low E-E-A-T   │
└─────────────────┴─────────────────┘
```

#### Tarefa 2.3.7 — Step 7: Optimization (Processing)

**Arquivo:** `steps/step-7-optimization.tsx`

Progresso de otimização SEO + GEO. Mostra changes_applied em tempo real.

#### Tarefa 2.3.8 — Step 8: Metadata + Final Preview

**Arquivo:** `steps/step-8-metadata.tsx`

Preview do artigo final com:
- Seleção de meta title (3 opções com CTR score)
- Seleção de meta description (2 opções)
- Slug gerado
- Schema markup preview
- Alt texts para imagens
- Botão "Publicar" → marca como completed

#### Tarefa 2.3.9 — Step 9: Cross-Format (Opcional)

**Arquivo:** `steps/step-9-cross-format.tsx`

Modal com checkboxes:
- [ ] Post LinkedIn
- [ ] Roteiro de Vídeo Curto
- [ ] Carrossel Instagram

Geração em paralelo, resultado em tabs.

### Etapa 2.4 — Navbar Integration

#### Tarefa 2.4.1 — Adicionar "Artigos" ao Navbar

**Arquivo:** `src/components/ui/tubelight-navbar.tsx` (EXISTENTE)

Adicionar item "Artigos" com ícone `FileText` do Lucide.

> **CUIDADO:** Não usar ícones depreciados do Lucide.
> **Ref:** `.context/docs/known-and-corrected-errors/index.md` (Erro #15)

---

## Fase 3 — Módulo Site Intelligence (Pré-Pipeline) {#fase-3}

> **STATUS:** ✅ CONCLUÍDA
> - Etapa 3.1: Services (crawlSite, extractBrandVoice, analyzeKeywordGaps) + Prompts (SI-02, SI-03)
> - Etapa 3.2: API routes (GET/POST SI, POST crawl trigger) + Worker handlers (crawl → auto-analyze pipeline)
> - Etapa 3.3: Settings UI (Projects tab com SI dashboard) + Projects API + Cache 7 dias
> - JobTypes: SITE_INTELLIGENCE_CRAWL, SITE_INTELLIGENCE_ANALYZE
> - Arquivos criados: 6 novos, 5 modificados

### Objetivo
Implementar crawling do site, extração de brand voice e análise de gaps.

### Etapa 3.1 — Site Intelligence Service

#### Tarefa 3.1.1 — URL Mapper

**Arquivo:** `services/site-intelligence.service.ts`

```typescript
export async function crawlSite(
  siteUrl: string,
  options: { crawlDepth?: number; urlPatterns?: string[] }
): Promise<ServiceResult<SiteUrlMap>>
```

Usa Firecrawl para crawl do site. Extrai: URL, title, H1, meta_description, word_count, etc.

**Fallback:** Se Firecrawl indisponível, fetch simples + cheerio para parse HTML básico.

#### Tarefa 3.1.2 — Brand Voice Extractor

```typescript
export async function extractBrandVoice(
  sampleUrls: string[],
  brandName: string
): Promise<ServiceResult<BrandVoiceProfile>>
```

Usa Prompt SI-02 (do doc 003) para analisar 3-5 artigos e extrair perfil de voz.

#### Tarefa 3.1.3 — Keyword Gap Analyzer

```typescript
export async function analyzeKeywordGaps(
  siteUrlMap: SiteUrlMap,
  competitorUrls: string[],
  targetNiche: string
): Promise<ServiceResult<KeywordGaps>>
```

Usa Tavily + Prompt SI-03 para identificar gaps competitivos.

### Etapa 3.2 — Settings UI para Site Intelligence

#### Tarefa 3.2.1 — Project Settings

**Arquivo:** `src/app/(app)/settings/components/sections/projects-section.tsx` (NOVO)

Tela em Settings para:
- Cadastrar site_url + competitor_urls
- Triggerar crawl
- Ver dashboard: total URLs, data do último crawl, gaps prioritários

#### Tarefa 3.2.2 — SI API Routes

**Arquivo:** `src/app/api/articles/site-intelligence/route.ts`
**Arquivo:** `src/app/api/articles/site-intelligence/crawl/route.ts`

CRUD + trigger de crawl.

### Etapa 3.3 — Cache de 7 dias

#### Tarefa 3.3.1 — Cache Logic

Verificar `crawledAt` antes de cada artigo. Se > 7 dias, sugerir recrawl.

```typescript
export function isSiteIntelligenceFresh(si: SiteIntelligenceRecord): boolean {
  if (!si.crawledAt) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return si.crawledAt > sevenDaysAgo;
}
```

---

## Fase 4 — Interlinking Real + Metadados (Pós-Pipeline) {#fase-4} ✅ CONCLUÍDA

### Objetivo
Implementar interlinking contextual com URLs reais e geração de metadados SEO completos.

### Etapa 4.1 — Interlinking Service

#### Tarefa 4.1.1 — Prompt IL-01

**Arquivo:** `prompts/interlinking.ts`

Implementar Prompt IL-01 conforme doc 003.

#### Tarefa 4.1.2 — Interlinking Service

**Arquivo:** `services/interlinking.service.ts`

```typescript
export async function analyzeInterlinking(
  articleContent: string,
  articleKeyword: string,
  siteUrlMap: SiteUrlMap,
  mode: "auto" | "manual",
  maxLinks?: number
): Promise<ServiceResult<InterlinkingResult>>
```

#### Tarefa 4.1.3 — Interlinking Review UI

**Arquivo:** `shared/interlinking-review.tsx`

Lista de sugestões com approve/reject/edit para modo manual.

### Etapa 4.2 — Metadata Service

#### Tarefa 4.2.1 — Prompt META-01

**Arquivo:** `prompts/metadata.ts`

Implementar Prompt META-01 conforme doc 003.

#### Tarefa 4.2.2 — Metadata Service

**Arquivo:** `services/metadata.service.ts`

```typescript
export async function generateMetadata(
  articleContent: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
  brandName: string,
  authorName: string,
  options?: { brandVoiceProfile?: BrandVoiceProfile; siteCategories?: string[] }
): Promise<ServiceResult<SeoMetadataPackage>>
```

#### Tarefa 4.2.3 — Metadata Preview UI

**Arquivo:** `shared/metadata-preview.tsx`

Preview de meta titles com seleção, descriptions, slug, schema markup.

---

## Fase 5 — Camada GEO (Generative Engine Optimization) {#fase-5} ✅ CONCLUÍDA

### Objetivo
Adicionar análise e otimização de AI-readiness ao pipeline.

### Etapa 5.1 — GEO Analysis

#### Tarefa 5.1.1 — Prompt GEO-01

**Arquivo:** `prompts/geo.ts`

Implementar Prompt GEO-01 (AI-Readiness Analyzer) conforme doc 003.

#### Tarefa 5.1.2 — GEO Analyzer Service

**Arquivo:** `services/geo-analyzer.service.ts`

6 critérios de avaliação com scores ponderados.

### Etapa 5.2 — GEO Optimization

#### Tarefa 5.2.1 — Prompt GEO-02

Implementar Prompt GEO-02 (AI-Readiness Optimizer) conforme doc 003.

#### Tarefa 5.2.2 — GEO Optimizer Service

**Arquivo:** `services/geo-optimizer.service.ts`

Aplica correções GEO com rastreabilidade (before/after).

### Etapa 5.3 — GEO UI

#### Tarefa 5.3.1 — GEO Score Card

**Arquivo:** `shared/geo-score-card.tsx`

Card com score geral + breakdown por critério.

#### Tarefa 5.3.2 — Integrar GEO na Step 6

Modificar `step-6-seo-geo.tsx` para mostrar SEO e GEO lado a lado.

---

## Fase 6 — Modo Extensão (Pipeline Alternativo) {#fase-6}

### Objetivo
Implementar pipeline de análise e expansão de artigos existentes.

### Etapa 6.1 — Extension Services

#### Tarefa 6.1.1 — Prompts EXT-01, EXT-02, EXT-03

**Arquivo:** `prompts/extension.ts`

3 prompts conforme doc 003.

#### Tarefa 6.1.2 — Extension Service

**Arquivo:** `services/extension.service.ts`

```typescript
export async function diagnoseArticle(url: string, keyword: string, siteUrlMap?: SiteUrlMap): Promise<ServiceResult<ArticleDiagnosis>>
export async function planExpansion(article: string, diagnosis: ArticleDiagnosis): Promise<ServiceResult<ExpansionPlan>>
export async function expandArticle(article: string, selectedFixes: string[], plan: ExpansionPlan): Promise<ServiceResult<ExpandedArticle>>
```

### Etapa 6.2 — Extension UI

#### Tarefa 6.2.1 — Extension Entry Point

**Arquivo:** `src/app/(app)/articles/[id]/extend/page.tsx`

Página para iniciar modo extensão.

#### Tarefa 6.2.2 — Extension Wizard

**Arquivo:** `components/extension/extension-wizard.tsx`

Fluxo:
1. Input URL → 2. Diagnóstico → 3. Seleção de fixes → 4. Expansão → 5. Review

#### Tarefa 6.2.3 — Diagnosis View

**Arquivo:** `components/extension/diagnosis-view.tsx`

Visualização do diagnóstico com weak sections, missing sections, fixes.

#### Tarefa 6.2.4 — Expansion Selector

**Arquivo:** `components/extension/expansion-selector.tsx`

Checkboxes para selecionar fixes com preview de impacto.

---

## Fase 7 — Derivação Cross-Format (Integração) {#fase-7}

### Objetivo
Gerar LinkedIn, Vídeo Curto e Carrossel a partir do artigo finalizado.

### Etapa 7.1 — Cross-Format Services

#### Tarefa 7.1.1 — Prompts CROSS-01, CROSS-02, CROSS-03

**Arquivo:** `prompts/cross-format.ts`

3 prompts conforme doc 003.

#### Tarefa 7.1.2 — Cross-Format Service

**Arquivo:** `services/cross-format.service.ts`

```typescript
export async function deriveLinkedInPost(article: string, articleUrl: string, options?: CrossFormatOptions): Promise<ServiceResult<LinkedInPostOutput>>
export async function deriveVideoScript(article: string, articleUrl: string, options?: CrossFormatOptions): Promise<ServiceResult<VideoScriptOutput>>
export async function deriveCarousel(article: string, articleUrl: string, options?: CrossFormatOptions): Promise<ServiceResult<CarouselOutput>>
```

**Execução em paralelo** — os 3 formatos podem rodar simultaneamente.

### Etapa 7.2 — Cross-Format UI

#### Tarefa 7.2.1 — Cross-Format Step

**Arquivo:** `steps/step-9-cross-format.tsx`

- Modal com checkboxes de formato
- Geração em paralelo
- Resultado em tabs (LinkedIn | Vídeo | Carrossel)
- Botão para copiar/editar cada formato
- Integração com pipeline tribal existente (carrossel)

### Etapa 7.3 — Derivations API

#### Tarefa 7.3.1 — Derivations CRUD

**Arquivo:** `src/app/api/articles/[id]/derivations/route.ts`

- `POST { formats: ["linkedin", "video_script", "carousel"] }` → Gera derivações
- `GET` → Lista derivações do artigo
- `PATCH` → Atualiza conteúdo da derivação (edição)

---

## Erros Conhecidos a Evitar {#erros-conhecidos}

### Lista de Armadilhas Documentadas

| # | Erro | Ref | Onde Aplicar |
|---|------|-----|-------------|
| 1 | JSONB pode retornar objeto, não string | `032-json-parse-object-error.md` | Todos os handlers de worker |
| 2 | `text-primary` não funciona com Tailwind v4 | `index.md` (Erro #11) | Todos os componentes UI |
| 3 | Infinite loop com useCallback/useEffect | `004-infinite-loop-hooks.md` | Wizard steps com polling |
| 4 | Usar `!border-white/10` em dark mode | `index.md` (Erro #13) | Todos os inputs |
| 5 | Import de DB em client component | `006-db-import-client-component.md` | Separar tipos de funções server |
| 6 | `sendMessage` formato `{ parts: [...] }` | `028-usechat-sendmessage-format.md` | Se usar chat no wizard |
| 7 | `maxTokens` não existe no `generateText()` | `031-vercel-ai-sdk-maxtokens-param.md` | Todos os services de LLM |
| 8 | `IF NOT EXISTS` não funciona com `CREATE TYPE` | `index.md` (Erro #7) | Migrations SQL |
| 9 | Ícones Lucide depreciados | `index.md` (Erro #15) | Todos os ícones de marca |
| 10 | `encoding_format` → `output_dtype` (Voyage) | `025-voyage-api-parameter-deprecated.md` | Se adicionar embeddings |
| 11 | Clerk `null` vs TypeScript `undefined` | `index.md` (Erro #17) | Auth em API routes |
| 12 | `clerkMiddleware` deve retornar `NextResponse.next()` | `023-clerk-middleware-immutable.md` | Se modificar proxy.ts |

### Padrão Obrigatório de Error Handling

```typescript
import { toAppError, getErrorMessage } from "@/lib/errors";

try {
  await operation();
} catch (error) {
  const appError = toAppError(error, "SPECIFIC_CODE");
  console.error("[ArticleWizard] Error:", appError);
  return { error: getErrorMessage(appError), code: appError.code };
}
```

> **Ref:** `.context/docs/known-and-corrected-errors/036-pr-review-error-handling-jan2026.md`

---

## Padrões Reutilizáveis do Projeto {#padroes-reutilizaveis}

### Do Wizard Existente

| Padrão | Arquivo de Referência | Uso no Article Wizard |
|--------|----------------------|----------------------|
| Worker auto-trigger em dev | `wizard/[id]/submit/route.ts` | Submit de cada etapa |
| Polling de progresso | `step-2-processing.tsx` | Steps 2, 4, 7 (processing) |
| CollapsibleSection | `@/components/ui/collapsible.tsx` | Step 1 inputs |
| DocumentConfigForm | `wizard/shared/document-config-form.tsx` | RAG config |
| ProcessingModal | Padrão do wizard | Steps de espera |
| Graceful degradation | Todos os services | Firecrawl, Tavily fallbacks |
| StepsIndicator | `wizard-steps-indicator.tsx` | Article steps indicator |

### Do Queue System

| Padrão | Ref | Uso |
|--------|-----|-----|
| `createJob()` + `enqueueJob()` | `queue/jobs.ts` + `queue/client.ts` | Criar jobs para cada etapa |
| `triggerWorker()` em dev | `queue/client.ts` | Auto-trigger após criar job |
| Retry pattern (3 tentativas) | `api/workers/route.ts` | Handler de cada job type |

### Dos Wizard Services

| Serviço | Reutilizar? | Como |
|---------|-------------|------|
| `firecrawl.service.ts` | ✅ Sim | Import direto |
| `tavily.service.ts` | ✅ Sim | Import direto |
| `synthesizer.service.ts` | ✅ Adaptar | Novo prompt, mesma lógica |
| `llm.service.ts` | ✅ Parcial | Padrão de generateObject/generateText |
| `rag.service.ts` | ✅ Sim | Import direto |
| `prompts.ts` | ❌ Não | Prompts totalmente novos |
| `image-generation.service.ts` | ❌ Não | Artigos não geram imagens (por enquanto) |

### Do Vercel AI SDK

```typescript
import { generateObject, generateText } from "ai";
import { openrouter } from "@/lib/ai/config";

// Para outputs estruturados (outlines, análises)
const result = await generateObject({
  model: openrouter(modelId),
  schema: zodSchema,
  prompt: fullPrompt,
  temperature: 0.7,
});

// Para texto livre (seções do artigo)
const result = await generateText({
  model: openrouter(modelId),
  prompt: fullPrompt,
  temperature: 0.8,
  // NÃO usar maxTokens (não suportado)
});
```

> **Ref:** `vercel-ai-sdk-patterns` memória Serena

---

## Estimativa de Esforço {#estimativa}

### Por Fase

| Fase | Complexidade | Tarefas | Dependência |
|------|-------------|---------|-------------|
| **Fase 0** — Fundação | Média | 13 tarefas | Nenhuma |
| **Fase 1** — Pipeline Base | Alta | 18 tarefas | Fase 0 |
| **Fase 2** — UI Wizard | Alta | 12 tarefas | Fase 1 |
| **Fase 3** — Site Intelligence | Média | 5 tarefas | Fase 0 |
| **Fase 4** — Interlinking + Meta | Média | 6 tarefas | Fase 2 + 3 |
| **Fase 5** — GEO | Média | 5 tarefas | Fase 2 |
| **Fase 6** — Extensão | Média | 7 tarefas | Fase 2 |
| **Fase 7** — Cross-Format | Baixa-Média | 5 tarefas | Fase 2 |

### Ordem de Execução Recomendada

```
Semana 1:  Fase 0 (Fundação) ─────────────────────── ✅ Base pronta
Semana 2:  Fase 1 (Pipeline Base - Prompts) ────────── ✅ Pipeline funcional
Semana 3:  Fase 1 (Pipeline Base - Services + API) ─── ✅ Backend completo
Semana 4:  Fase 2 (UI Wizard - Steps 1-5) ────────── ✅ Fluxo básico funcional
Semana 5:  Fase 2 (UI Wizard - Steps 6-9) ────────── ✅ Wizard completo
Semana 6:  Fase 3 (Site Intelligence) ────────────── ✅ Pré-pipeline pronto
Semana 7:  Fase 4 (Interlinking + Metadados) ─────── ✅ Pós-pipeline pronto
Semana 8:  Fase 5 (GEO) ──────────────────────────── ✅ AI-readiness
Semana 9:  Fase 6 (Modo Extensão) ────────────────── ✅ Pipeline alternativo
Semana 10: Fase 7 (Cross-Format) ─────────────────── ✅ Integração completa
```

### MVP Mínimo (Fases 0-2)

O **MVP mínimo** para um Article Wizard funcional requer apenas as Fases 0, 1 e 2. As fases 3-7 são evoluções que podem ser adicionadas incrementalmente.

O MVP permite:
- Criar artigos do zero com pipeline de 9 etapas
- SEO check e otimização
- Preview e exportação do artigo
- Salvar no banco

As evoluções adicionam:
- Site Intelligence (brand voice, keyword gaps)
- Interlinking real com URLs do site
- Metadados SEO completos (schema markup, alt texts)
- GEO scoring e otimização para LLMs
- Modo de extensão de artigos existentes
- Derivação para LinkedIn, Vídeo, Carrossel

---

## Checklist de Validação por Fase

### Fase 0 — Validação
- [ ] Migration executada com sucesso
- [ ] Tipos TypeScript compilando sem erros
- [ ] Estrutura de diretórios criada
- [ ] `npm run build` passando

### Fase 1 — Validação
- [ ] Prompt de cada etapa testado manualmente
- [ ] Services retornando `ServiceResult<T>` corretamente
- [ ] Jobs criados e processados pelo worker
- [ ] Auto-trigger funcionando em dev
- [ ] Pipeline completo gera artigo de ponta a ponta

### Fase 2 — Validação
- [ ] Wizard navegável por todos os steps
- [ ] Auto-save funcionando nos inputs
- [ ] Polling de progresso sem infinite loops
- [ ] Preview do artigo em markdown renderizado
- [ ] SEO score card funcional
- [ ] Artigo salvo ao completar

### Fase 3 — Validação
- [ ] Crawl do site via Firecrawl funcional
- [ ] Brand voice extraído corretamente
- [ ] Keyword gaps identificados
- [ ] Cache de 7 dias respeitado
- [ ] Settings UI funcional

### Fase 4 — Validação
- [ ] Links internos reais inseridos no artigo
- [ ] Modo manual com approve/reject funcional
- [ ] Metadados completos gerados (titles, descriptions, slug, schema)
- [ ] Preview de schema markup JSON-LD válido

### Fase 5 — Validação
- [ ] GEO score calculado com 6 critérios
- [ ] Dashboard SEO + GEO side-by-side
- [ ] GEO optimizer aplicando correções rastreáveis
- [ ] Score melhora após otimização

### Fase 6 — Validação
- [ ] Diagnóstico de artigo existente funcional
- [ ] Plano de expansão com preview
- [ ] Seleção de fixes e geração de conteúdo
- [ ] Artigo expandido mantém coesão

### Fase 7 — Validação
- [ ] LinkedIn post gerado (≤ 3000 chars)
- [ ] Video script gerado (60-90s)
- [ ] Carrossel gerado (8-12 slides)
- [ ] Output compatível com pipeline tribal existente

---

## Notas Finais

### Convenções de Commit

Seguir padrão do projeto:
```
feat(articles): [descrição]
fix(articles): [descrição]
refactor(articles): [descrição]
```

### Branch Strategy

- Branch principal: `feat/article_create`
- Sub-branches por fase (se necessário): `feat/article_create/phase-0`

### Documentação

- Atualizar `CLAUDE.md` com seção Article Wizard
- Criar memória Serena `article-wizard-patterns` após cada fase
- Documentar erros encontrados em `.context/docs/known-and-corrected-errors/`
