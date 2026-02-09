# Creative Studio — Plano de Implementação Detalhado

**Versão:** 1.0
**Data:** 2026-02-08
**Branch:** `feat/creative-studio`
**Base:** PRD `prd-creative-studio.md` + análise completa da codebase

---

## 0. Resumo das Adaptações (PRD → Projeto Real)

O PRD original foi escrito com referências a Supabase. Abaixo, o mapeamento para a stack real:

| PRD (Original) | Projeto Real | Notas |
|----------------|-------------|-------|
| Supabase PostgreSQL | **Neon PostgreSQL + Drizzle ORM** | `db.select().from(table).where()` |
| Supabase Storage | **Cloudflare R2** via `getStorageProvider()` | Factory pattern em `src/lib/storage/` |
| Supabase Auth (auth.users) | **Clerk** via `ensureAuthenticatedUser()` | userId é `text`, não UUID |
| Supabase RLS | **Drizzle WHERE clauses** | `eq(table.userId, userId)` em toda query |
| Supabase Realtime | **Polling via job system** | Upstash Redis + QStash |
| UUID PK | **serial PK** (auto-increment integer) | Padrão do projeto |
| gen_random_uuid() | `serial("id").primaryKey()` | Consistente com 30+ tabelas existentes |
| Supabase Storage buckets | **Storage keys** com prefixo | `creative/{userId}/...` |
| `auth.users(id)` FK | `users.id` (text, Clerk ID) | FK com `onDelete: "cascade"` |

### Módulo Existente Relevante

O projeto já possui um `/studio` (Content Studio) com:
- `src/app/(app)/studio/` — UI para criação de carrosséis/posts
- `src/app/api/studio/generate-image/route.ts` — Geração de imagem via OpenRouter
- `src/lib/ai/config.ts` — `AVAILABLE_IMAGE_MODELS` já configurados
- `src/lib/image-generation/build-prompt.ts` — Builder de prompts para imagens

**O Creative Studio será um módulo PARALELO**, acessível via `/creative-studio`, focado em geração/variação/réplica de imagens puras (não carrosséis).

---

## 1. Estrutura de Arquivos

```
src/
├── app/
│   ├── (app)/
│   │   └── creative-studio/
│   │       ├── layout.tsx                     # Layout com breadcrumb + sidebar
│   │       ├── page.tsx                       # Home: seletor de modo + projetos recentes
│   │       ├── create/page.tsx                # Modo 1 — Criar (text-to-image)
│   │       ├── vary/page.tsx                  # Modo 2 — Variar (image-to-image)
│   │       ├── replicate/page.tsx             # Modo 3 — Replicar (reference-to-image)
│   │       ├── projects/page.tsx              # Histórico de projetos
│   │       └── projects/[id]/page.tsx         # Detalhe do projeto
│   └── api/
│       └── creative-studio/
│           ├── analyze/route.ts               # POST — Análise Gemini Vision (Modo 3)
│           ├── generate/route.ts              # POST — Geração de imagem(ns)
│           ├── generate/[jobId]/route.ts      # GET — Status da geração
│           ├── overlay/route.ts               # POST — Text overlay (Sharp)
│           ├── resize/route.ts                # POST — Smart resize
│           ├── projects/route.ts              # GET/POST — CRUD projetos
│           ├── projects/[id]/route.ts         # GET/DELETE — Projeto individual
│           └── projects/[id]/download/route.ts # GET — Download ZIP
├── components/
│   └── creative-studio/
│       ├── format-selector.tsx                # Multi-select de formatos
│       ├── model-selector.tsx                 # Dropdown de modelos IA
│       ├── image-uploader.tsx                 # Drag & drop + preview
│       ├── text-overlay-editor.tsx            # Editor de texto sobreposto
│       ├── output-grid.tsx                    # Grid de outputs + ações
│       ├── generation-queue.tsx               # Status bar de geração
│       ├── side-by-side-preview.tsx           # Comparação ref vs réplica
│       ├── style-presets.tsx                  # Grid de presets tribais + genéricos
│       └── template-selector.tsx              # Seletor de templates
├── lib/
│   └── creative-studio/
│       ├── types.ts                           # Tipos compartilhados
│       ├── constants.ts                       # Formatos, dimensões, modelos
│       ├── openrouter-image.ts                # Client OpenRouter (text2img, img2img)
│       ├── replicate-client.ts                # Fallback Replicate API
│       ├── image-analysis.ts                  # Análise via Gemini Vision
│       ├── text-overlay.ts                    # Sharp para texto sobreposto
│       ├── image-resize.ts                    # Smart resize por formato
│       ├── prompt-builder.ts                  # Construtor de prompts unificado
│       ├── presets.ts                         # Style presets (tribais + genéricos)
│       └── templates.ts                       # Templates pré-prontos
└── stores/
    └── creative-studio-store.ts               # Zustand store (estado do wizard)
```

---

## 2. Schema do Banco de Dados (Drizzle ORM)

### 2.1 Enums

```typescript
// Em src/db/schema.ts

// Creative Studio Mode
export const creativeStudioModeEnum = pgEnum("creative_studio_mode", [
  "create",     // Modo 1: text-to-image
  "vary",       // Modo 2: image-to-image
  "replicate",  // Modo 3: reference-to-image
]);

// Creative Project Status
export const creativeProjectStatusEnum = pgEnum("creative_project_status", [
  "draft",       // Configurando
  "generating",  // Em geração
  "completed",   // Geração concluída
  "error",       // Falhou
]);

// Variation Type (Modo 2)
export const creativeVariationTypeEnum = pgEnum("creative_variation_type", [
  "resize",    // Smart crop/fill
  "restyle",   // Mudar estilo visual
  "inpaint",   // Alterar elementos
]);

// Text Mode (Modo 1)
export const creativeTextModeEnum = pgEnum("creative_text_mode", [
  "ai_embedded",     // IA gera com texto embutido
  "canvas_overlay",  // Texto sobreposto via Sharp
]);
```

### 2.2 Tabela: `creative_projects`

```typescript
export const creativeProjects = pgTable(
  "creative_projects",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Core
    mode: creativeStudioModeEnum("mode").notNull(),
    title: text("title"),
    status: creativeProjectStatusEnum("status").default("draft").notNull(),

    // Config compartilhada
    selectedFormats: jsonb("selected_formats").$type<string[]>().default([]),
    quantityPerFormat: integer("quantity_per_format").default(1),
    selectedModel: text("selected_model"),
    presetUsed: text("preset_used"),

    // Modo 1: Criar
    prompt: text("prompt"),
    textMode: creativeTextModeEnum("text_mode"),
    textConfig: jsonb("text_config").$type<TextOverlayConfig | null>(),

    // Modo 2: Variar
    sourceImageUrl: text("source_image_url"),
    sourceImageKey: text("source_image_key"), // Storage key
    variationType: creativeVariationTypeEnum("variation_type"),
    variationConfig: jsonb("variation_config").$type<Record<string, unknown>>(),

    // Modo 3: Replicar
    referenceImageUrl: text("reference_image_url"),
    referenceImageKey: text("reference_image_key"),
    userPhotoUrl: text("user_photo_url"),
    userPhotoKey: text("user_photo_key"),
    extractedAnalysis: jsonb("extracted_analysis").$type<ImageAnalysis | null>(),
    userEdits: jsonb("user_edits").$type<Record<string, unknown>>(),

    // Job tracking
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
    jobError: text("job_error"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("creative_projects_user_id_idx").on(table.userId),
    index("creative_projects_status_idx").on(table.status),
    index("creative_projects_created_at_idx").on(table.createdAt),
    index("creative_projects_mode_idx").on(table.mode),
  ]
);
```

### 2.3 Tabela: `creative_outputs`

```typescript
export const creativeOutputs = pgTable(
  "creative_outputs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => creativeProjects.id, { onDelete: "cascade" }),

    // Imagem
    imageUrl: text("image_url").notNull(),
    storageKey: text("storage_key"),
    thumbnailUrl: text("thumbnail_url"),
    format: text("format").notNull(), // "1:1", "4:5", etc
    width: integer("width"),
    height: integer("height"),

    // Geração
    generationPrompt: text("generation_prompt"),
    modelUsed: text("model_used"),
    generationTimeMs: integer("generation_time_ms"),

    // Status
    isFavorite: boolean("is_favorite").default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("creative_outputs_project_id_idx").on(table.projectId),
    index("creative_outputs_format_idx").on(table.format),
  ]
);
```

### 2.4 Tabela: `creative_templates` (Seeding)

```typescript
export const creativeTemplates = pgTable(
  "creative_templates",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(), // quote, before_after, stats, tip, etc
    description: text("description"),
    previewUrl: text("preview_url"),
    promptTemplate: text("prompt_template").notNull(), // Com {{variáveis}}
    textConfigTemplate: jsonb("text_config_template").$type<Record<string, unknown>>(),
    defaultFormat: text("default_format").default("1:1"),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("creative_templates_category_idx").on(table.category),
    index("creative_templates_active_idx").on(table.isActive),
  ]
);
```

### 2.5 Relations

```typescript
export const creativeProjectsRelations = relations(creativeProjects, ({ one, many }) => ({
  user: one(users, {
    fields: [creativeProjects.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [creativeProjects.jobId],
    references: [jobs.id],
  }),
  outputs: many(creativeOutputs),
}));

export const creativeOutputsRelations = relations(creativeOutputs, ({ one }) => ({
  project: one(creativeProjects, {
    fields: [creativeOutputs.projectId],
    references: [creativeProjects.id],
  }),
}));
```

### 2.6 Type Exports

```typescript
export type CreativeProject = typeof creativeProjects.$inferSelect;
export type NewCreativeProject = typeof creativeProjects.$inferInsert;
export type CreativeOutput = typeof creativeOutputs.$inferSelect;
export type NewCreativeOutput = typeof creativeOutputs.$inferInsert;
export type CreativeTemplate = typeof creativeTemplates.$inferSelect;
export type CreativeStudioMode = typeof creativeStudioModeEnum.enumValues[number];
export type CreativeProjectStatus = typeof creativeProjectStatusEnum.enumValues[number];
```

---

## 3. Fases de Implementação

---

### FASE 0 — Setup e Infraestrutura

**Objetivo:** Dependências, schema, migration, estrutura base de arquivos.

#### Task 0.1 — Instalar dependências

```bash
npm install sharp archiver
npm install -D @types/archiver
```

> **Nota:** `replicate` e `@fal-ai/client` serão instalados apenas se necessário (Fase 5).
> O `canvas` NPM **NÃO será usado** — usaremos Sharp SVG overlay (mais leve, sem binários nativos).

#### Task 0.2 — Schema Drizzle + Migration

1. Adicionar os 4 enums em `src/db/schema.ts`
2. Adicionar as 3 tabelas (`creative_projects`, `creative_outputs`, `creative_templates`)
3. Adicionar relations e type exports
4. Gerar migration: `npx drizzle-kit generate`
5. Executar migration: `npx drizzle-kit migrate`

**Arquivo:** `src/db/schema.ts` (adicionar ao final)

#### Task 0.3 — Tipos compartilhados

**Arquivo:** `src/lib/creative-studio/types.ts`

```typescript
// TextOverlayConfig
// ImageAnalysis
// StylePreset
// Template
// Format dimensions map
// Generation params/results
```

#### Task 0.4 — Constantes

**Arquivo:** `src/lib/creative-studio/constants.ts`

```typescript
export const FORMAT_DIMENSIONS = {
  "1:1":    { width: 1080, height: 1080, label: "Feed Quadrado" },
  "4:5":    { width: 1080, height: 1350, label: "Feed Retrato" },
  "9:16":   { width: 1080, height: 1920, label: "Stories/Reels" },
  "1.91:1": { width: 1200, height: 628,  label: "Landscape" },
  "2:3":    { width: 1000, height: 1500, label: "Pinterest" },
  "16:9":   { width: 1920, height: 1080, label: "Cover" },
} as const;

export const CREATIVE_MODELS = { ... }; // Modelos disponíveis com capabilities
```

#### Task 0.5 — Estrutura de arquivos placeholder

Criar todos os arquivos da estrutura (Seção 1) com exports vazios e comentários de propósito.

**Critério de conclusão:** `npm run build` passa sem erros.

---

### FASE 1 — Componentes Base (UI)

**Objetivo:** Componentes reutilizáveis compartilhados entre os 3 modos.

#### Task 1.1 — FormatSelector

**Arquivo:** `src/components/creative-studio/format-selector.tsx`

- Grid de cards selecionáveis (multi-select)
- 6 formatos com preview visual proporcional
- Props: `selectedFormats`, `onChange`, `disabled`
- Design: cards glassmorphism com borda primary quando selecionado
- Classes: `backdrop-blur-xl bg-white/[0.02] border-white/[0.05]`

#### Task 1.2 — ModelSelector

**Arquivo:** `src/components/creative-studio/model-selector.tsx`

- Dropdown com modelos de `AVAILABLE_IMAGE_MODELS` (já existe em `src/lib/ai/config.ts`)
- Badges de capacidade (text2img, img2img, vision)
- Filtro por modo (vary/replicate só mostra modelos com img2img)
- Reutilizar `getModelInfo()` de `src/lib/ai/config.ts`

#### Task 1.3 — ImageUploader

**Arquivo:** `src/components/creative-studio/image-uploader.tsx`

- Drag & drop zone com preview
- Upload direto para R2 via `getStorageProvider()`
- Key pattern: `creative/{userId}/uploads/{timestamp}-{filename}`
- Aceita: jpg, png, webp (max 10MB)
- Estados: idle → dragging → uploading (progress) → uploaded (preview)

#### Task 1.4 — OutputGrid

**Arquivo:** `src/components/creative-studio/output-grid.tsx`

- Grid responsivo (1/2/3 colunas)
- Cada card: imagem, formato badge, ações (favoritar, download, deletar)
- Hover overlay com ações
- Click abre modal fullscreen (usar Dialog do shadcn)
- Botão "Download All (ZIP)"

#### Task 1.5 — GenerationQueue

**Arquivo:** `src/components/creative-studio/generation-queue.tsx`

- Barra fixa no bottom
- Status: modelo, formato atual, progresso (3/8)
- Animação de loading (Framer Motion)
- Props: `jobs[]` com status/progress

**Critério de conclusão:** Todos os componentes renderizam corretamente em Storybook-like preview. Build passa.

---

### FASE 2 — Presets, Templates e Prompt Builder

**Objetivo:** Sistema de presets tribais, templates, e construção de prompts.

#### Task 2.1 — Style Presets

**Arquivo:** `src/lib/creative-studio/presets.ts`

- **4 presets tribais:** HEREGE, VISIONARIO, TRADUTOR, TESTEMUNHA
  - Cada um com: `promptPrefix`, `negativePrompt`, `textConfig`, `colorPalette`, `previewGradient`
  - Baseados na filosofia tribal v4 existente (`getBaseTribalSystemPrompt()`)
- **6 presets genéricos:** MINIMALISTA, CORPORATE, VIBRANT, ELEGANT, TECH, ORGANIC
- Tipo: `StylePreset` com `id`, `name`, `category`, `promptPrefix`, etc.

#### Task 2.2 — Templates

**Arquivo:** `src/lib/creative-studio/templates.ts`

- 8 templates com `{{variáveis}}` substituíveis:
  1. QUOTE_CARD, 2. BEFORE_AFTER, 3. STAT_HIGHLIGHT, 4. TIP_CARD
  5. TESTIMONIAL, 6. ANNOUNCEMENT, 7. COMPARISON, 8. CAROUSEL_COVER
- Tipo: `Template` com `slug`, `category`, `promptTemplate`, `variables[]`

#### Task 2.3 — Prompt Builder

**Arquivo:** `src/lib/creative-studio/prompt-builder.ts`

- Função `buildCreativePrompt(params)` que unifica:
  - Preset → Template → Análise (Modo 3) → User prompt → Format specs
- Retorna `{ prompt, negativePrompt }`
- Lógica: template variables → preset prefix → format dimensions → quality suffix

#### Task 2.4 — StylePresets Component

**Arquivo:** `src/components/creative-studio/style-presets.tsx`

- Grid horizontal scrollable
- Seções: "Tribal" e "Estilos"
- Cards com preview gradient + nome
- Click aplica promptPrefix + textConfig

#### Task 2.5 — TemplateSelector Component

**Arquivo:** `src/components/creative-studio/template-selector.tsx`

- Grid de templates por categoria
- Click abre modal com campos dinâmicos para `{{variáveis}}`
- Preview do prompt resultante

**Critério de conclusão:** Presets e templates exportam corretamente. Components renderizam. Build passa.

---

### FASE 3 — TextOverlayEditor

**Objetivo:** Editor visual de texto sobreposto (modo canvas).

#### Task 3.1 — TextOverlayEditor Component

**Arquivo:** `src/components/creative-studio/text-overlay-editor.tsx`

- **Campos:**
  - content (textarea), fontFamily (select), fontSize (slider 12-120)
  - fontWeight, textColor (color picker), textAlign (toggle group)
  - position (grid 3x3), backgroundColor + opacity
  - shadow (toggle + config), textTransform, lineHeight, letterSpacing, maxWidth
- **Preview:** Canvas HTML `<div>` com estilos inline (tempo real)
  - Fundo cinza ou `previewImage` se fornecido
  - Texto renderizado com todos os estilos
- Props: `config: TextOverlayConfig`, `onChange`, `previewImage?`

> **Nota sobre fontes:** No client, usar Google Fonts CSS import no layout.
> No server (Sharp overlay), usar SVG `<text>` com web-safe fonts.
> Fontes especiais: Inter (já no projeto), Montserrat, Playfair Display, Roboto Mono.

#### Task 3.2 — Sharp Text Overlay (Server)

**Arquivo:** `src/lib/creative-studio/text-overlay.ts`

```typescript
export async function applyTextOverlay(
  imageBuffer: Buffer,
  config: TextOverlayConfig,
  outputWidth: number,
  outputHeight: number
): Promise<Buffer>
```

- Usa Sharp + SVG overlay (sem canvas nativo!)
- Posição calculada pelo grid 3x3
- Safe zone de 5% nas bordas
- Background retângulo se configurado
- Shadow via SVG filter
- Retorna PNG buffer

**Critério de conclusão:** Editor mostra preview em tempo real. Server overlay gera imagem correta.

---

### FASE 4 — APIs de Geração

**Objetivo:** Endpoints de geração, resize e análise.

#### Task 4.1 — OpenRouter Image Client

**Arquivo:** `src/lib/creative-studio/openrouter-image.ts`

Reutilizar padrão existente de `src/app/api/studio/generate-image/route.ts`:
- Mesmos headers OpenRouter (`Authorization`, `HTTP-Referer`, `X-Title`)
- Mesma lógica de `extractImageUrlFromResponse()`
- Modelos: `AVAILABLE_IMAGE_MODELS` de `src/lib/ai/config.ts`
- Suporte a `modalities: ["image", "text"]`

```typescript
export async function generateImage(params: {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  sourceImage?: string; // base64 para img2img
}): Promise<{ url: string; timeMs: number }>
```

#### Task 4.2 — Replicate Client (Fallback para img2img)

**Arquivo:** `src/lib/creative-studio/replicate-client.ts`

- Implementar apenas se modelos OpenRouter não suportarem img2img adequadamente
- Replicate API para Flux img2img
- Polling de status até completar
- Opcional — Fase 5 se necessário

#### Task 4.3 — Smart Resize

**Arquivo:** `src/lib/creative-studio/image-resize.ts`

```typescript
export async function smartResize(params: {
  imageBuffer: Buffer;
  targetFormat: string; // "1:1", "4:5", etc
  fitMode: "crop" | "fill";
}): Promise<Buffer>
```

- **Crop:** `sharp.resize({ fit: "cover", position: "attention" })` (smart crop)
- **Fill:** Imagem principal + background blur da mesma imagem

#### Task 4.4 — Image Analysis (Gemini Vision)

**Arquivo:** `src/lib/creative-studio/image-analysis.ts`

```typescript
export async function analyzeImage(imageBase64: string): Promise<ImageAnalysis>
```

- Usa Gemini via OpenRouter (`google/gemini-3-pro-image-preview`)
- Prompt estruturado pedindo: layout, cores, tipografia, textos (OCR)
- Parse do JSON retornado com fallback seguro
- Retorna `ImageAnalysis` tipado

#### Task 4.5 — API Route: Generate

**Arquivo:** `src/app/api/creative-studio/generate/route.ts`

```
POST /api/creative-studio/generate
Body: { projectId?, mode, prompt, model, formats[], quantity, textConfig?, sourceImage?, preset? }
Response: { projectId, jobId } (async via job queue)
```

1. Auth via `ensureAuthenticatedUser()`
2. Cria/atualiza `creative_project`
3. Cria job (`JobType.CREATIVE_STUDIO_GENERATE`)
4. Retorna `{ projectId, jobId }`
5. Worker processa: gera imagem → upload R2 → salva `creative_outputs`

#### Task 4.6 — Job Type + Worker Handler

Adicionar ao enum `JobType`:
```typescript
CREATIVE_STUDIO_GENERATE = "creative_studio_generate"
```

Handler no `/api/workers/route.ts`:
```typescript
creative_studio_generate: async (payload) => {
  // 1. Buscar projeto
  // 2. Para cada formato × quantidade:
  //    a. Gerar imagem via openrouter-image
  //    b. Se textMode=canvas_overlay, aplicar text overlay
  //    c. Upload para R2
  //    d. Salvar creative_output
  // 3. Atualizar projeto status → completed
}
```

#### Task 4.7 — API Route: Resize

**Arquivo:** `src/app/api/creative-studio/resize/route.ts`

```
POST /api/creative-studio/resize
Body: { imageUrl, targetFormats[], fitMode }
Response: { results: [{ format, url, width, height }] }
```

#### Task 4.8 — API Route: Overlay

**Arquivo:** `src/app/api/creative-studio/overlay/route.ts`

```
POST /api/creative-studio/overlay
Body: { imageUrl, textConfig, outputWidth, outputHeight }
Response: { resultUrl, width, height }
```

#### Task 4.9 — API Route: Analyze

**Arquivo:** `src/app/api/creative-studio/analyze/route.ts`

```
POST /api/creative-studio/analyze
Body: { imageUrl }
Response: ImageAnalysis
```

#### Task 4.10 — API Route: Generate Status

**Arquivo:** `src/app/api/creative-studio/generate/[jobId]/route.ts`

```
GET /api/creative-studio/generate/{jobId}
Response: { status, outputs[], progress }
```

Usa `getJob(jobId)` existente + busca outputs do projeto.

**Critério de conclusão:** Todos os endpoints retornam respostas corretas. Geração funciona end-to-end via job queue.

---

### FASE 5 — Página Principal e Modo 1 (Criar)

**Objetivo:** Interface completa do Creative Studio e fluxo do Modo Criar.

#### Task 5.1 — Layout

**Arquivo:** `src/app/(app)/creative-studio/layout.tsx`

- Header: "Creative Studio" + breadcrumb
- Links laterais (colapsáveis): Criar, Variar, Replicar, Projetos
- Importar fontes Google (Montserrat, Playfair Display) via `next/font/google`

#### Task 5.2 — Página Home

**Arquivo:** `src/app/(app)/creative-studio/page.tsx`

- 3 cards grandes clicáveis: CRIAR, VARIAR, REPLICAR
  - Ícones Lucide: `Palette`, `RefreshCw`, `Copy`
  - Glassmorphism cards com hover glow
- Grid de projetos recentes (últimos 6)
  - Fetch via `db.select().from(creativeProjects).where(eq(...userId)).orderBy(desc(createdAt)).limit(6)`

#### Task 5.3 — Zustand Store

**Arquivo:** `src/stores/creative-studio-store.ts`

```typescript
interface CreativeStudioState {
  // Modo atual
  mode: CreativeStudioMode;

  // Config compartilhada
  selectedFormats: string[];
  quantityPerFormat: number;
  selectedModel: string;
  selectedPreset: string | null;

  // Modo 1
  prompt: string;
  textMode: "ai_embedded" | "canvas_overlay" | null;
  textConfig: TextOverlayConfig | null;

  // Modo 2
  sourceImageUrl: string | null;
  variationType: string | null;
  variationStrength: number;

  // Modo 3
  referenceImageUrl: string | null;
  analysis: ImageAnalysis | null;
  userEdits: Record<string, unknown>;

  // Status
  isGenerating: boolean;
  currentJobId: number | null;
  outputs: CreativeOutput[];

  // Actions
  setMode: (mode: CreativeStudioMode) => void;
  setFormats: (formats: string[]) => void;
  setModel: (model: string) => void;
  setPreset: (preset: string | null) => void;
  setPrompt: (prompt: string) => void;
  generate: () => Promise<void>;
  reset: () => void;
}
```

#### Task 5.4 — Página Criar (Modo 1)

**Arquivo:** `src/app/(app)/creative-studio/create/page.tsx`

Layout: duas colunas (config | preview)

**Coluna esquerda:**
1. `<StylePresets />` — Presets tribais + genéricos
2. `<TemplateSelector />` — Templates com variáveis (opcional)
3. Textarea de prompt (pré-preenchido se preset/template)
4. `<ModelSelector />`
5. `<FormatSelector />`
6. Quantidade (NumberInput 1-4)
7. Toggle "Texto na imagem"
   - Radio: "IA integra o texto" | "Sobrepor manualmente"
   - Se sobrepor: `<TextOverlayEditor />`
8. Botão "Gerar" (CTA primary, Lucide `Sparkles`)

**Coluna direita:**
- Antes: Preview das configs (formatos selecionados, preset visual)
- Durante: `<GenerationQueue />`
- Após: `<OutputGrid />`

**Fluxo submit:**
1. `buildCreativePrompt()` com preset/template/user input
2. POST `/api/creative-studio/generate`
3. Polling do jobId a cada 3s
4. Exibir outputs no grid

#### Task 5.5 — Adicionar no Navbar

Adicionar link "Creative Studio" na navegação principal:
- **Arquivo:** componente de navegação (provavelmente `src/components/navbar/` ou `src/app/(app)/layout.tsx`)
- Ícone: `Palette` (Lucide)
- Rota: `/creative-studio`

**Critério de conclusão:** Fluxo completo do Modo 1 funcional end-to-end. Gerar imagem real via OpenRouter.

---

### FASE 6 — Modo 2 (Variar)

**Objetivo:** Interface e fluxo do Modo Variar (image-to-image).

#### Task 6.1 — Página Variar

**Arquivo:** `src/app/(app)/creative-studio/vary/page.tsx`

Wizard de 3 passos:

**Passo 1 — Upload:**
- `<ImageUploader />` centralizado
- Preview + info (dimensões, formato original)
- Botão "Continuar"

**Passo 2 — Configuração:**
- Tipo de variação (radio group visual):
  - "Redimensionar" — Smart crop/fill
  - "Reestilizar" — Mudar estilo (img2img)
  - "Alterar elementos" — Inpainting
- Config condicional por tipo:
  - Resize: `<FormatSelector />` + fitMode (crop/fill)
  - Restyle: `<StylePresets />` + `<ModelSelector />` + slider strength
  - Inpaint: Textarea "descreva a mudança" + `<ModelSelector />`
- `<FormatSelector />` + Quantidade

**Passo 3 — Resultado:**
- `<OutputGrid />` com imagens geradas
- Preview: original à esquerda, variações à direita

**Lógica por tipo:**
- Resize → `/api/creative-studio/resize` (Sharp, sem IA)
- Restyle → `/api/creative-studio/generate` com `mode: "img2img"`
- Inpaint → `/api/creative-studio/generate` com `mode: "inpaint"`

**Critério de conclusão:** Os 3 tipos de variação funcionam. Resize via Sharp, restyle via OpenRouter.

---

### FASE 7 — Modo 3 (Replicar)

**Objetivo:** Interface e fluxo do Modo Replicar (reference-to-image).

#### Task 7.1 — SideBySidePreview Component

**Arquivo:** `src/components/creative-studio/side-by-side-preview.tsx`

- Duas imagens lado a lado com slider de comparação
- Labels: "Referência" e "Réplica"
- Drag para revelar (CSS clip-path)
- Responsive: empilha vertical no mobile

#### Task 7.2 — Página Replicar

**Arquivo:** `src/app/(app)/creative-studio/replicate/page.tsx`

Wizard de 4 passos:

**Passo 1 — Upload referência:**
- `<ImageUploader label="Imagem de referência" />`
- Botão "Analisar com IA"
- Loading: "Analisando layout, cores, tipografia e textos..."
- Chama `/api/creative-studio/analyze`

**Passo 2 — Revisão da análise:**
- Layout detectado (badge + descrição editável)
- Paleta de cores (swatches editáveis com color picker)
- Tipografia (family + weight selects)
- Textos OCR (inputs editáveis por hierarquia)
- Upload foto pessoal (opcional)

**Passo 3 — Configuração de saída:**
- `<FormatSelector />`
- Quantidade
- `<ModelSelector />`
- Preview do prompt construído (colapsável)
- Botão "Gerar réplica"

**Passo 4 — Resultado:**
- `<SideBySidePreview />` (referência vs réplica)
- Tabs por formato se múltiplos
- Botões: Download, Regenerar, Salvar

**Critério de conclusão:** Análise retorna dados estruturados. Geração de réplica funciona com edições do usuário.

---

### FASE 8 — Projetos e Histórico

**Objetivo:** CRUD de projetos, listagem, detalhe.

#### Task 8.1 — API Routes: Projects CRUD

**Arquivo:** `src/app/api/creative-studio/projects/route.ts`

```
GET  /api/creative-studio/projects?mode=create&status=completed&limit=20&offset=0
POST /api/creative-studio/projects  (criar projeto)
```

**Arquivo:** `src/app/api/creative-studio/projects/[id]/route.ts`

```
GET    /api/creative-studio/projects/{id}   (com outputs)
DELETE /api/creative-studio/projects/{id}   (delete cascade + storage cleanup)
```

#### Task 8.2 — Página de Projetos

**Arquivo:** `src/app/(app)/creative-studio/projects/page.tsx`

- Grid de cards com filtros (modo, status)
- Cada card: thumbnail, título, badge modo, badge status, data, qty outputs
- Ações: Abrir, Duplicar, Deletar
- Paginação offset/limit
- Ordenação: Mais recente | Mais outputs

#### Task 8.3 — Página Detalhe do Projeto

**Arquivo:** `src/app/(app)/creative-studio/projects/[id]/page.tsx`

- Header: título editável + badges
- Se draft: botão "Retomar" → redireciona para wizard do modo
- Se completed: config resumida (colapsável) + `<OutputGrid />`
- Botão "Gerar mais" (reabre com mesma config)
- Botão "Download All (ZIP)"

**Critério de conclusão:** CRUD funcional. Listagem com filtros. Detalhe com outputs.

---

### FASE 9 — Download ZIP e Polish

**Objetivo:** Download em batch, polish visual, integração final.

#### Task 9.1 — Download ZIP

**Arquivo:** `src/app/api/creative-studio/projects/[id]/download/route.ts`

```
GET /api/creative-studio/projects/{id}/download
Response: application/zip (stream)
```

- Busca outputs do projeto
- Baixa cada imagem do R2
- Cria ZIP com `archiver`: `{format}_{index}.png`
- Retorna como stream

#### Task 9.2 — Loading States

- Skeleton loaders na listagem de projetos
- Spinner nos botões de ação
- Progress bar na geração (via polling)
- Toast notifications (sucesso/erro) via sonner/toast do shadcn

#### Task 9.3 — Responsividade

- Testar todas as páginas em mobile (375px)
- Wizards empilham verticalmente
- Grid de outputs: 1 col mobile, 2 tablet, 3 desktop
- TextOverlayEditor: tabs para mobile (config | preview)

#### Task 9.4 — Validação de Input (Zod)

Adicionar schemas Zod em todas as API routes:
- `generateSchema` — validar prompt, model, formats, quantity
- `resizeSchema` — validar imageUrl, formats, fitMode
- `overlaySchema` — validar textConfig completo
- `analyzeSchema` — validar imageUrl

#### Task 9.5 — Integração com Biblioteca

- Botão "Salvar na Biblioteca" nos outputs
- Cria `libraryItem` com tipo "image" e link para o output
- Permite agendar publicação a partir do output

**Critério de conclusão:** ZIP funciona. UI polida. Validações aplicadas. Build clean.

---

## 4. Job Types a Adicionar

```typescript
// Em src/lib/queue/types.ts
export enum JobType {
  // ... existentes ...

  // Creative Studio
  CREATIVE_STUDIO_GENERATE = "creative_studio_generate",
}
```

**Payload:**
```typescript
interface CreativeStudioGeneratePayload {
  projectId: number;
  userId: string;
  mode: "text2img" | "img2img" | "inpaint";
  model: string;
  prompt: string;
  negativePrompt?: string;
  formats: string[];         // ["1:1", "4:5"]
  quantity: number;          // Per format
  textMode?: "ai_embedded" | "canvas_overlay";
  textConfig?: TextOverlayConfig;
  sourceImage?: string;      // URL para img2img
  strength?: number;         // 0-1 para img2img
}
```

---

## 5. Storage Keys

```
creative/{userId}/uploads/{timestamp}-{filename}     # Uploads do usuário
creative/{userId}/outputs/{projectId}/{format}_{n}.png # Outputs gerados
creative/{userId}/overlays/{timestamp}-overlay.png     # Text overlays
creative/{userId}/resized/{timestamp}-{format}.png     # Resized images
```

---

## 6. Variáveis de Ambiente

Nenhuma variável nova obrigatória! O Creative Studio usa:
- `OPENROUTER_API_KEY` — já configurado
- `STORAGE_PROVIDER` + R2 credentials — já configurado
- `DATABASE_URL` — já configurado

Opcionais (Fase futura):
- `REPLICATE_API_TOKEN` — para img2img via Replicate (se OpenRouter não suportar)
- `FAL_KEY` — para SDXL inpainting (se necessário)

---

## 7. Estimativa de Execução

| Fase | Descrição | Tasks | Estimativa |
|------|-----------|-------|------------|
| **0** | Setup + Schema + Migration | 5 | 15-20 min |
| **1** | Componentes Base (UI) | 5 | 40-60 min |
| **2** | Presets + Templates + Prompt Builder | 5 | 30-40 min |
| **3** | TextOverlayEditor | 2 | 25-35 min |
| **4** | APIs de Geração | 10 | 60-90 min |
| **5** | Home + Modo 1 (Criar) | 5 | 45-60 min |
| **6** | Modo 2 (Variar) | 1 | 30-40 min |
| **7** | Modo 3 (Replicar) | 2 | 40-50 min |
| **8** | Projetos e Histórico | 3 | 30-40 min |
| **9** | ZIP + Polish + Validação | 5 | 30-45 min |
| **TOTAL** | | **43 tasks** | **~5-8 horas** |

---

## 8. Decisões Tomadas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| PKs | `serial` (integer) | Consistência com 30+ tabelas existentes |
| Storage | R2 via `getStorageProvider()` | Factory pattern já existe |
| Text Overlay Server | Sharp + SVG | Evita `canvas` (binários nativos problemáticos) |
| Job Queue | Upstash Redis existente | Reutiliza infra + QStash para polling |
| Polling vs Realtime | Polling cada 3s | Simples, sem WebSocket extra |
| Rotas | `/creative-studio` (não `/creative`) | Evita conflito com futuro `/create` |
| Modelos IA | `AVAILABLE_IMAGE_MODELS` existente | Reutiliza config centralizada |
| Replicate/Fal.ai | Opcional (Fase futura) | OpenRouter cobre text2img; img2img TBD |
| Fontes Server | Web-safe + SVG | Evita download de .ttf para server |
| UUID vs Serial | Serial | Padrão do projeto |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| OpenRouter não suporta img2img para todos os modelos | Alta | Implementar fallback Replicate na Fase 4.2 |
| Sharp SVG overlay limitado em fontes | Média | Usar fontes web-safe; fallback ScreenshotOne (já existe) |
| Geração lenta (30-60s por imagem) | Alta | Job queue async + polling; UX de progresso |
| Gemini Vision retorna JSON mal formatado | Média | Parse com try/catch + fallback schema default |
| Timeout em batch (múltiplos formatos × quantidade) | Média | Processar sequencialmente no worker; timeout 5min |

---

## 10. Ordem de Execução Recomendada

```
FASE 0 → Setup (Tasks 0.1-0.5)
FASE 1 → UI Components (Tasks 1.1-1.5)
FASE 2 → Presets + Builder (Tasks 2.1-2.5)
FASE 3 → Text Overlay (Tasks 3.1-3.2)
FASE 4 → APIs (Tasks 4.1-4.10)       ← Core da feature
FASE 5 → Página Criar (Tasks 5.1-5.5) ← Primeiro fluxo E2E
FASE 6 → Página Variar (Task 6.1)
FASE 7 → Página Replicar (Tasks 7.1-7.2)
FASE 8 → Projetos (Tasks 8.1-8.3)
FASE 9 → Polish (Tasks 9.1-9.5)
```

**Checkpoint após Fase 5:** Testar fluxo completo Modo 1 (Criar) end-to-end antes de avançar.
