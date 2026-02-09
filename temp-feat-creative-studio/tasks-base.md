# Creative Studio — Tasks para Claude Code

> **Contexto:** Este módulo faz parte da Máquina de Conteúdo (Next.js + Supabase).
> Cada task é independente e deve ser executada na ordem.
> Ao final de cada task, testar se compila sem erros antes de avançar.

---

## TASK 0 — Setup e Dependências

```
Instale as dependências necessárias para o módulo Creative Studio:

npm install sharp canvas replicate @fal-ai/client uuid

O projeto já usa Next.js App Router, Supabase, Tailwind CSS e shadcn/ui.

Crie a estrutura de pastas:

src/
  app/
    creative/
      page.tsx                    # Página principal com seletor de modo
      create/page.tsx             # Modo 1 - Criar
      vary/page.tsx               # Modo 2 - Variar  
      replicate/page.tsx          # Modo 3 - Replicar
      projects/page.tsx           # Histórico de projetos
      projects/[id]/page.tsx      # Detalhe do projeto
      layout.tsx                  # Layout compartilhado do Creative
  components/
    creative/
      FormatSelector.tsx
      ModelSelector.tsx
      ImageUploader.tsx
      TextOverlayEditor.tsx
      OutputGrid.tsx
      GenerationQueue.tsx
      SideBySidePreview.tsx
      StylePresets.tsx
      TemplateSelector.tsx
  lib/
    creative/
      openrouter-image.ts         # Client OpenRouter para imagens
      image-analysis.ts           # Análise via Gemini Vision
      text-overlay.ts             # Sharp + Canvas para texto
      image-resize.ts             # Resize inteligente por formato
      prompt-builder.ts           # Construtor de prompts por modo
      replicate-client.ts         # Fallback Replicate para img2img
      templates.ts                # Templates pré-prontos
      presets.ts                  # Presets de estilo (tribal, etc)
  api/
    creative/
      analyze/route.ts
      generate/route.ts
      generate/[jobId]/route.ts
      overlay/route.ts
      resize/route.ts
      projects/route.ts
      projects/[id]/route.ts
      projects/[id]/outputs/route.ts

Não implemente lógica ainda. Apenas crie os arquivos com exports vazios ou placeholder.
Cada arquivo deve ter um comentário no topo explicando seu propósito.
```

---

## TASK 1 — Banco de Dados (Supabase Migrations)

```
Crie o arquivo de migration SQL para as tabelas do Creative Studio.
Caminho: supabase/migrations/XXXXXX_creative_studio.sql

Tabelas:

1. creative_projects
   - id: UUID PK default gen_random_uuid()
   - user_id: UUID references auth.users(id)
   - mode: TEXT NOT NULL check ('create', 'vary', 'replicate')
   - title: TEXT
   - status: TEXT default 'draft' check ('draft', 'generating', 'completed', 'error')
   - selected_formats: JSONB default '[]'
   - quantity_per_format: INT default 1
   - selected_model: TEXT
   - prompt: TEXT (Modo 1)
   - text_mode: TEXT check ('ai_embedded', 'canvas_overlay', null)
   - text_config: JSONB (fonte, cor, posição, etc)
   - source_image_url: TEXT (Modo 2)
   - variation_type: TEXT check ('resize', 'restyle', 'inpaint', null)
   - variation_config: JSONB
   - reference_image_url: TEXT (Modo 3)
   - user_photo_url: TEXT (Modo 3)
   - extracted_analysis: JSONB (resultado da análise Gemini)
   - user_edits: JSONB (edições do usuário sobre a análise)
   - preset_used: TEXT (nome do preset/template usado)
   - created_at: TIMESTAMPTZ default now()
   - updated_at: TIMESTAMPTZ default now()

2. creative_outputs
   - id: UUID PK default gen_random_uuid()
   - project_id: UUID references creative_projects(id) ON DELETE CASCADE
   - image_url: TEXT NOT NULL
   - thumbnail_url: TEXT
   - format: TEXT NOT NULL ('1:1', '4:5', '9:16', '1.91:1', '2:3', '16:9')
   - width: INT
   - height: INT
   - generation_prompt: TEXT
   - model_used: TEXT
   - generation_time_ms: INT
   - is_favorite: BOOLEAN default false
   - metadata: JSONB (dados extras flexíveis)
   - created_at: TIMESTAMPTZ default now()

3. creative_templates
   - id: UUID PK default gen_random_uuid()
   - name: TEXT NOT NULL
   - slug: TEXT UNIQUE NOT NULL
   - category: TEXT NOT NULL ('quote', 'before_after', 'comparison', 'announcement', 'testimonial', 'stats', 'tip', 'carousel_cover')
   - description: TEXT
   - preview_url: TEXT
   - prompt_template: TEXT NOT NULL (prompt com {{variáveis}})
   - text_config_template: JSONB (config de texto padrão do template)
   - default_format: TEXT default '1:1'
   - is_active: BOOLEAN default true
   - sort_order: INT default 0
   - created_at: TIMESTAMPTZ default now()

Adicione RLS policies para que cada usuário só acesse seus próprios projects e outputs.
Templates são públicos (leitura para todos).

Crie os storage buckets via SQL:
- creative-uploads (private)
- creative-outputs (public, com transform habilitado)

Adicione índices em:
- creative_projects(user_id, created_at DESC)
- creative_outputs(project_id)
- creative_templates(category, is_active)
```

---

## TASK 2 — Componentes Base (UI)

```
Implemente os componentes compartilhados do Creative Studio.
Todos usam Tailwind CSS + shadcn/ui. Design escuro/moderno.

### FormatSelector.tsx
- Grid de cards selecionáveis (checkbox multi-select)
- Formatos: 1:1 (Feed), 4:5 (Retrato), 9:16 (Stories), 1.91:1 (Landscape), 2:3 (Pinterest), 16:9 (Cover)
- Cada card mostra: nome, ratio visual (retângulo proporcional), dimensões em px
- Prop: selectedFormats: string[], onChange: (formats: string[]) => void
- Visual: cards com borda que fica highlight quando selecionado

### ModelSelector.tsx
- Dropdown/select com os modelos disponíveis
- Modelos: 
  - Flux (Black Forest Labs) — "Melhor qualidade geral"
  - DALL-E 3 — "Melhor para texto na imagem"  
  - Stable Diffusion XL — "Mais controle, variações"
  - Gemini — "Análise + geração versátil"
- Cada opção mostra: nome, descrição curta, badges de capacidade (text2img, img2img, vision)
- Prop: selectedModel: string, onChange: (model: string) => void
- Quando o modo é 'vary' ou 'replicate', filtrar modelos que suportam img2img

### ImageUploader.tsx
- Drag & drop zone com preview
- Aceita: jpg, png, webp (max 10MB)
- Mostra preview da imagem após upload
- Upload para Supabase Storage
- Props: 
  - onUpload: (url: string) => void
  - label: string (ex: "Imagem de referência", "Sua foto")
  - bucket: string (default: 'creative-uploads')
- Estados: idle, dragging, uploading (progress bar), uploaded (preview)

### OutputGrid.tsx
- Grid responsivo de imagens geradas
- Cada card: imagem, formato badge, botões (favoritar ❤️, download ⬇️, deletar 🗑️)
- Hover: mostra overlay com ações
- Click: abre modal fullscreen
- Props:
  - outputs: CreativeOutput[]
  - onFavorite: (id: string) => void
  - onDelete: (id: string) => void
  - onDownload: (id: string) => void
- Inclua botão "Download All (ZIP)" quando há múltiplos outputs

### GenerationQueue.tsx
- Barra de status fixa no bottom da página
- Mostra: modelo sendo usado, formato atual, progresso (3/8 imagens)
- Animação de loading enquanto gera
- Props: 
  - jobs: { id: string, status: string, progress: number, total: number }[]
```

---

## TASK 3 — Style Presets e Templates

```
Implemente o sistema de presets de estilo e templates pré-prontos.

### src/lib/creative/presets.ts

Crie um objeto exportado STYLE_PRESETS com os seguintes presets:

**Tribais (da Máquina de Conteúdo):**
- HEREGE: tons escuros, vermelho accent, tipografia bold, mood provocativo
  - promptPrefix: "Dark moody atmosphere, rebellious energy, bold contrast..."
  - textConfig: { font: 'bold sans-serif', color: '#ffffff', shadow: true, bgColor: '#1a1a1a' }
  
- VISIONÁRIO: tons azul/roxo, futurista, tipografia moderna, mood inspirador
  - promptPrefix: "Futuristic aesthetic, innovation, blue-purple palette..."
  - textConfig: { font: 'modern sans-serif', color: '#ffffff', shadow: true, bgColor: '#0a0a2e' }

- TRADUTOR: tons neutros/warm, acessível, tipografia clean, mood didático
  - promptPrefix: "Clean modern design, warm neutral tones, educational..."
  - textConfig: { font: 'clean sans-serif', color: '#333333', shadow: false, bgColor: '#f5f0eb' }

- TESTEMUNHA: tons terrosos, autêntico, tipografia orgânica, mood pessoal
  - promptPrefix: "Authentic warm tones, personal storytelling, earthy..."
  - textConfig: { font: 'serif', color: '#2d2d2d', shadow: false, bgColor: '#e8ddd3' }

**Genéricos:**
- MINIMALISTA: branco, muito espaço negativo, tipografia thin
- CORPORATE: azul navy, cinza, tipografia profissional
- VIBRANT: cores saturadas, energia alta, tipografia display
- ELEGANT: preto e dourado, tipografia serif, sofisticado
- TECH: gradientes neon, grid, tipografia mono/futurista
- ORGANIC: verdes e terrosos, texturas naturais, serif

Cada preset tem: id, name, category ('tribal' | 'generic'), promptPrefix, negativePrompt, textConfig, colorPalette (array de hex), previewGradient (CSS gradient para preview na UI).

### src/lib/creative/templates.ts

Crie TEMPLATES pré-prontos com prompt_template usando {{variáveis}}:

1. QUOTE_CARD
   - category: 'quote'
   - Variáveis: {{quote}}, {{author}}, {{style_preset}}
   - Template: fundo + texto grande centralizado + autor embaixo

2. BEFORE_AFTER
   - category: 'before_after'
   - Variáveis: {{before_label}}, {{after_label}}, {{context}}
   - Template: split vertical ou horizontal

3. STAT_HIGHLIGHT
   - category: 'stats'
   - Variáveis: {{number}}, {{label}}, {{context}}
   - Template: número grande central + label + contexto

4. TIP_CARD
   - category: 'tip'
   - Variáveis: {{tip_number}}, {{tip_title}}, {{tip_body}}
   - Template: badge com número + título bold + corpo

5. TESTIMONIAL
   - category: 'testimonial'
   - Variáveis: {{quote}}, {{name}}, {{role}}, {{company}}
   - Template: aspas grandes + quote + info da pessoa

6. ANNOUNCEMENT
   - category: 'announcement'
   - Variáveis: {{headline}}, {{subheadline}}, {{cta}}
   - Template: headline impactante + sub + CTA

7. COMPARISON
   - category: 'comparison'
   - Variáveis: {{option_a}}, {{option_b}}, {{verdict}}
   - Template: lado a lado com destaque pro vencedor

8. CAROUSEL_COVER
   - category: 'carousel_cover'
   - Variáveis: {{hook}}, {{subhook}}, {{brand}}
   - Template: design de capa de carrossel (swipe bait)

### StylePresets.tsx (componente)
- Grid horizontal scrollable de presets
- Cada preset: card com preview (gradient + nome)
- Seções: "Tribal" e "Estilos"
- Click seleciona e aplica promptPrefix e textConfig
- Props: selectedPreset: string | null, onChange: (presetId: string) => void

### TemplateSelector.tsx (componente)
- Grid de templates por categoria
- Cada template: card com mini preview visual + nome + descrição
- Click abre modal com campos para preencher as {{variáveis}}
- O modal tem: campos dinâmicos baseados nas variáveis do template + preview
- Props: onSelect: (template: Template, variables: Record<string, string>) => void
```

---

## TASK 4 — TextOverlayEditor (Componente Avançado)

```
Implemente o editor de texto sobreposto para o modo canvas.

### src/components/creative/TextOverlayEditor.tsx

Interface visual para configurar texto que será colocado sobre a imagem.

**Campos de configuração:**
- content: textarea (o texto em si)
- fontFamily: select (Inter, Montserrat, Playfair Display, Roboto Mono, Bebas Neue)
- fontSize: slider (12-120px, default 48)
- fontWeight: select (300, 400, 600, 700, 900)
- textColor: color picker (default #ffffff)
- textAlign: toggle group (left, center, right)
- position: grid seletor visual 3x3 (top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right)
- backgroundColor: color picker com opacidade slider (para badge/box atrás do texto)
- backgroundPadding: slider (0-40px)
- backgroundRadius: slider (0-20px)
- shadow: toggle (on/off) + se on: color, blur, offset
- textTransform: select (none, uppercase, lowercase)
- lineHeight: slider (1.0-2.0)
- letterSpacing: slider (-2 a 10)
- maxWidth: slider (50%-100% da imagem)

**Preview em tempo real:**
- Mostra um canvas preview (300x300) com fundo cinza
- O texto aparece no preview com todas as configs aplicadas
- Atualiza em tempo real conforme muda os campos

**Props:**
- config: TextOverlayConfig
- onChange: (config: TextOverlayConfig) => void
- previewImage?: string (se tiver, usa como fundo do preview)

**Type:**
```typescript
interface TextOverlayConfig {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  position: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  backgroundRadius?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  lineHeight?: number;
  letterSpacing?: number;
  maxWidthPercent?: number;
}
```

Use as fontes do Google Fonts (importar no layout.tsx do creative).
```

---

## TASK 5 — API: Geração de Imagem (OpenRouter)

```
Implemente a integração com OpenRouter para geração de imagens.

### src/lib/creative/openrouter-image.ts

Crie um client que abstraia as chamadas para OpenRouter com modelos de imagem.

A URL base do OpenRouter é: https://openrouter.ai/api/v1

Para gerar imagens, a chamada depende do modelo:

**Para modelos que geram imagem via chat completion (Gemini, DALL-E):**
```typescript
// POST https://openrouter.ai/api/v1/chat/completions
{
  model: "google/gemini-2.0-flash-exp:free", // ou outro
  messages: [{ role: "user", content: prompt }],
  // Gemini precisa de parâmetro extra para output de imagem
}
```

**Para Flux e SDXL, o OpenRouter pode não suportar diretamente.**
Nesse caso, implemente fallback para:
- Replicate API (para Flux): https://api.replicate.com/v1/predictions
- Fal.ai (para SDXL): https://fal.run/

### src/lib/creative/replicate-client.ts

Client para Replicate API como fallback:
- text-to-image: black-forest-labs/flux-schnell ou flux-pro
- image-to-image: com parâmetro image + prompt + strength

### Função principal: generateImage()

```typescript
interface GenerateImageParams {
  mode: 'text2img' | 'img2img' | 'inpaint';
  model: 'flux' | 'dalle3' | 'sdxl' | 'gemini';
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  sourceImage?: string; // base64 ou URL (para img2img)
  mask?: string; // base64 (para inpaint)
  strength?: number; // 0-1 (para img2img, quanto mudar)
  numOutputs?: number;
}

interface GenerateImageResult {
  images: { url: string; width: number; height: number }[];
  model: string;
  timeMs: number;
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult>
```

A função deve:
1. Resolver qual provider usar (OpenRouter → Replicate → Fal.ai)
2. Fazer a chamada
3. Se for Replicate, fazer polling do status até completar
4. Retornar URLs das imagens geradas
5. Tratar erros com mensagens claras

### src/app/api/creative/generate/route.ts

POST endpoint que:
1. Recebe: { mode, prompt, model, formats[], quantity, textConfig?, sourceImage?, preset? }
2. Cria um creative_project no Supabase
3. Para cada formato × quantidade, chama generateImage()
4. Se textMode é 'canvas_overlay', após gerar a imagem limpa, aplica texto
5. Upload das imagens para Supabase Storage
6. Salva creative_outputs no Supabase
7. Retorna { projectId, outputs[] }

Use variáveis de ambiente:
- OPENROUTER_API_KEY
- REPLICATE_API_TOKEN
- FAL_KEY (opcional)
```

---

## TASK 6 — API: Text Overlay (Sharp + Canvas)

```
Implemente a sobreposição de texto em imagens no server-side.

### src/lib/creative/text-overlay.ts

Função que recebe uma imagem + TextOverlayConfig e retorna a imagem com texto.

```typescript
export async function applyTextOverlay(
  imageBuffer: Buffer,
  config: TextOverlayConfig,
  outputWidth: number,
  outputHeight: number
): Promise<Buffer>
```

Implementação:
1. Use Sharp para ler a imagem e resize para outputWidth x outputHeight
2. Crie um SVG overlay com o texto configurado:
   - Posição calculada baseada no config.position (9 posições possíveis)
   - Margens de safe zone (5% das bordas)
   - Se backgroundColor, renderizar retângulo atrás do texto
   - Aplicar shadow se configurado
   - fontFamily, fontSize, fontWeight, textColor, textAlign
   - textTransform (uppercase/lowercase)
   - lineHeight e letterSpacing
   - maxWidthPercent para quebra de linha
3. Composite o SVG sobre a imagem usando Sharp
4. Retorne o buffer resultante (PNG ou JPEG quality 90)

**Observação sobre fontes:**
No server (Node.js), as fontes precisam estar instaladas ou usar @canvas/registerFont.
Registrar as fontes: Inter, Montserrat, Playfair Display, Roboto Mono, Bebas Neue.
Baixar os .ttf para uma pasta src/lib/creative/fonts/ e registrar via canvas.

### src/app/api/creative/overlay/route.ts

POST endpoint:
1. Recebe: { imageUrl, textConfig, outputWidth, outputHeight }
2. Baixa a imagem do imageUrl
3. Aplica applyTextOverlay()
4. Upload do resultado para Supabase Storage
5. Retorna { resultUrl, width, height }
```

---

## TASK 7 — API: Resize Inteligente

```
Implemente o resize/crop inteligente para adaptar imagens entre formatos.

### src/lib/creative/image-resize.ts

```typescript
interface ResizeParams {
  imageBuffer: Buffer;
  targetFormat: '1:1' | '4:5' | '9:16' | '1.91:1' | '2:3' | '16:9';
  fitMode: 'crop' | 'fill' | 'extend';
  // crop: corta a imagem para o ratio (smart crop com atenção ao centro)
  // fill: adiciona padding/blur para preencher
  // extend: usa IA para estender a imagem (outpainting) — futuro
}

export async function smartResize(params: ResizeParams): Promise<Buffer>
```

Dimensões por formato:
- 1:1 → 1080x1080
- 4:5 → 1080x1350
- 9:16 → 1080x1920
- 1.91:1 → 1200x628
- 2:3 → 1000x1500
- 16:9 → 1920x1080

**Modo crop:**
Use sharp.resize({ fit: 'cover', position: 'attention' }) que faz smart crop
baseado em entropia (foco automático na parte mais importante da imagem).

**Modo fill:**
1. Resize a imagem para caber dentro do formato (fit: 'inside')
2. Crie um background blur da mesma imagem (resize + blur 40)
3. Composite a imagem nítida centralizada sobre o fundo blur

### src/app/api/creative/resize/route.ts

POST endpoint:
1. Recebe: { imageUrl, targetFormats: string[], fitMode }
2. Para cada formato, executa smartResize()
3. Upload dos resultados
4. Retorna: { results: [{ format, url, width, height }] }
```

---

## TASK 8 — API: Análise de Imagem (Gemini Vision)

```
Implemente a análise de imagem de referência para o Modo 3 (Replicar).

### src/lib/creative/image-analysis.ts

Usa Gemini via OpenRouter para analisar uma imagem e extrair informações estruturadas.

```typescript
interface ImageAnalysis {
  layout: {
    type: string; // 'centered', 'split-vertical', 'split-horizontal', 'grid-2x2', 'asymmetric', etc
    description: string; // descrição em linguagem natural
    elements: { type: string; position: string; sizePercent: number }[];
  };
  colors: {
    background: string; // hex
    primary: string; // hex
    accent: string; // hex
    secondary: string[]; // hex[]
    palette: string[]; // all colors as array
  };
  typography: {
    family: 'serif' | 'sans-serif' | 'display' | 'monospace';
    weight: 'light' | 'regular' | 'bold' | 'black';
    casing: 'uppercase' | 'lowercase' | 'mixed';
    estimatedSize: 'small' | 'medium' | 'large' | 'display';
  };
  texts: {
    content: string;
    hierarchy: 'title' | 'subtitle' | 'body' | 'cta' | 'caption';
    position: string; // 'top-center', 'middle-left', etc
  }[];
  overallStyle: string; // descrição do estilo geral
  suggestedPrompt: string; // prompt sugerido para replicar
}

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis>
```

**Prompt para o Gemini:**
Envie a imagem como base64 no content com type "image_url" e peça análise estruturada.
O prompt deve pedir resposta em JSON com o schema acima.
Inclua instrução para ser preciso nos hex colors e no OCR dos textos.

### src/app/api/creative/analyze/route.ts

POST endpoint:
1. Recebe: { imageUrl }
2. Baixa a imagem e converte para base64
3. Chama analyzeImage()
4. Retorna a análise estruturada
```

---

## TASK 9 — Prompt Builder Unificado

```
Implemente o construtor de prompts que unifica presets, templates, análise e input do usuário.

### src/lib/creative/prompt-builder.ts

```typescript
interface PromptBuildParams {
  // Base
  mode: 'create' | 'vary' | 'replicate';
  userPrompt?: string;
  
  // Preset
  preset?: StylePreset;
  
  // Template
  template?: Template;
  templateVariables?: Record<string, string>;
  
  // Análise (Modo 3)
  analysis?: ImageAnalysis;
  userEdits?: {
    texts?: { original: string; replacement: string }[];
    colors?: Partial<ImageAnalysis['colors']>;
  };
  
  // Output
  targetFormat: string;
  targetWidth: number;
  targetHeight: number;
  includeText: boolean;
  textContent?: string;
}

export function buildPrompt(params: PromptBuildParams): {
  prompt: string;
  negativePrompt: string;
}
```

**Lógica de construção:**

1. Se tem template:
   - Substitui {{variáveis}} no prompt_template
   - Aplica preset se selecionado (merge promptPrefix)

2. Se tem preset sem template:
   - Prepend o promptPrefix do preset ao userPrompt
   - Append negativePrompt do preset

3. Se Modo 3 (replicate) com análise:
   - Usa analysis.suggestedPrompt como base
   - Substitui textos conforme userEdits
   - Ajusta cores conforme userEdits
   - Append: "Style: {analysis.overallStyle}"

4. Para todos:
   - Append formato: "aspect ratio {ratio}, {width}x{height} pixels"
   - Se includeText: append "Text overlay: '{textContent}', bold typography, legible"
   - Append: "Professional quality, high resolution, sharp focus"

5. Negative prompt:
   - Base: "blurry, low quality, distorted, watermark, text artifacts"
   - Merge com negativePrompt do preset
   - Se includeText: append "illegible text, distorted letters"
```

---

## TASK 10 — Página Principal e Modo 1 (Criar)

```
Implemente as páginas do Creative Studio.

### src/app/creative/layout.tsx
- Layout com header: "Creative Studio" + breadcrumb
- Sidebar colapsável com links: Criar, Variar, Replicar, Projetos
- Área principal com children

### src/app/creative/page.tsx
- Página de seleção de modo
- 3 cards grandes clicáveis:
  - CRIAR (ícone 🎨) — "Gerar imagens do zero com IA"
  - VARIAR (ícone 🔄) — "Criar variações de uma imagem existente"
  - REPLICAR (ícone 📋) — "Copiar o estilo de uma referência"
- Abaixo: grid de projetos recentes (últimos 6)
- Cada projeto recente: thumbnail, título, modo badge, data

### src/app/creative/create/page.tsx

Fluxo completo do Modo 1:

**Layout: duas colunas (config à esquerda, preview à direita)**

**Coluna esquerda (configuração):**
1. Seção "Estilo" — <StylePresets /> (presets tribais + genéricos)
2. Seção "Template" — <TemplateSelector /> (opcional, se selecionado mostra campos de variáveis)
3. Seção "Prompt" — textarea grande para prompt livre (pré-preenchido se tem preset/template)
4. Seção "Modelo" — <ModelSelector />
5. Seção "Formatos" — <FormatSelector />
6. Seção "Quantidade" — number input (1-4 por formato)
7. Seção "Texto na imagem" — toggle on/off
   - Se on: radio "IA integra o texto" vs "Sobrepor manualmente"
   - Se "sobrepor": <TextOverlayEditor />
8. Botão "Gerar" (primário, grande)

**Coluna direita (preview/output):**
- Antes de gerar: preview das configurações (formatos selecionados, preset visual, etc)
- Durante geração: <GenerationQueue />
- Após gerar: <OutputGrid /> com as imagens

**Lógica de submit:**
1. Monta prompt via buildPrompt()
2. POST /api/creative/generate com todos os params
3. Polling ou realtime para atualizar status
4. Exibe outputs no grid

Deve ser funcional end-to-end: gerar imagem real via API.
```

---

## TASK 11 — Modo 2 (Variar)

```
Implemente a página do Modo 2.

### src/app/creative/vary/page.tsx

**Layout: wizard de 3 passos**

**Passo 1: Upload**
- <ImageUploader /> centralizado
- Após upload: mostra preview da imagem + info (dimensões, formato original)
- Botão "Continuar"

**Passo 2: Configuração**
- Tipo de variação (radio group com descrição visual):
  - "Redimensionar" — Adaptar para outros formatos (smart crop)
  - "Reestilizar" — Mudar o estilo visual mantendo composição
  - "Alterar elementos" — Modificar partes específicas (inpainting)
  
- Se "Redimensionar":
  - <FormatSelector /> (selecionar formatos de saída)
  - Modo de ajuste: Crop inteligente | Preencher com blur
  
- Se "Reestilizar":
  - <StylePresets /> (selecionar estilo target)
  - <ModelSelector /> (filtrar para modelos que suportam img2img)
  - Slider "Intensidade da mudança" (strength: 0.3 a 0.9)
  - <FormatSelector />
  
- Se "Alterar elementos":
  - Prompt: "Descreva o que quer mudar" (textarea)
  - <ModelSelector /> (filtrar para modelos com inpainting)
  - <FormatSelector />
  - Quantidade: slider 1-4

**Passo 3: Resultado**
- <OutputGrid /> com imagens geradas
- Preview: imagem original à esquerda, variações à direita
- Botões: Download, Favoritar, Gerar mais

**Lógica por tipo:**
- Redimensionar: chama /api/creative/resize (só Sharp, sem IA)
- Reestilizar: chama /api/creative/generate com mode='img2img'
- Alterar: chama /api/creative/generate com mode='inpaint'
```

---

## TASK 12 — Modo 3 (Replicar)

```
Implemente a página do Modo 3.

### src/app/creative/replicate/page.tsx

**Layout: wizard de 4 passos**

**Passo 1: Upload da referência**
- <ImageUploader label="Imagem de referência" />
- Após upload: botão "Analisar com IA"
- Loading state: "Analisando layout, cores, tipografia e textos..."

**Passo 2: Revisão da análise**
Exibe os resultados da análise do Gemini em seções editáveis:

- **Layout detectado:** 
  - Tipo: exibe como badge (ex: "Grid 2x2")
  - Descrição: texto editável
  - Mini mapa: representação visual simplificada dos elementos

- **Paleta de cores:**
  - Swatches clicáveis com hex
  - Cada swatch é editável (color picker)
  - Botão "Usar cores da minha marca" (futuro)

- **Tipografia:**
  - Família detectada + select para alterar
  - Peso detectado + select para alterar

- **Textos encontrados (OCR):**
  - Lista de textos com hierarchy badge (título, sub, body, CTA)
  - Cada texto é um input editável
  - Botão "Limpar todos" e "Restaurar originais"

- **Upload foto pessoal (opcional):**
  - <ImageUploader label="Sua foto (substituir foto da referência)" />
  - Toggle: "Substituir imagem principal pela minha foto"

**Passo 3: Configuração de saída**
- <FormatSelector />
- Quantidade por formato
- <ModelSelector /> (sugestão automática baseada na complexidade)
- Preview do prompt construído (colapsável, para power users)
- Botão "Gerar réplica"

**Passo 4: Resultado**
- <SideBySidePreview /> — referência original à esquerda, réplica à direita
- Se múltiplos formatos: tabs ou scroll horizontal
- Botões: Download, Regenerar (com ajustes), Salvar

### src/components/creative/SideBySidePreview.tsx
- Duas imagens lado a lado com slider de comparação (drag para revelar)
- Labels: "Referência" e "Réplica"
- Responsive: empilha vertical no mobile
- Props: referenceUrl: string, replicaUrl: string, format: string
```

---

## TASK 13 — Projetos e Histórico

```
Implemente o CRUD de projetos e a galeria de histórico.

### src/app/creative/projects/page.tsx

- Grid de projetos com filtros
- Filtros: Todos | Criar | Variar | Replicar + Status (Draft, Completed)
- Cada card de projeto:
  - Thumbnail (primeira imagem do output, ou placeholder se draft)
  - Título (auto-gerado se não definido: "Projeto {modo} - {data}")
  - Badge do modo (Criar/Variar/Replicar)
  - Badge do status
  - Data de criação
  - Quantidade de outputs
  - Ações: Abrir, Duplicar, Deletar
- Paginação ou infinite scroll
- Ordenação: Mais recente (default) | Mais antigo | Mais outputs

### src/app/creative/projects/[id]/page.tsx

- Header: título editável + badges (modo, status, modelo usado)
- Se draft: retomar de onde parou (redireciona para o wizard do modo)
- Se completed:
  - Config resumida (prompt, preset, formatos, etc) — colapsável
  - <OutputGrid /> com todas as imagens
  - Botão "Gerar mais variações" (reabre com mesma config)
  - Botão "Download All (ZIP)"

### API Routes:
- GET /api/creative/projects — listar projetos do usuário
- POST /api/creative/projects — criar projeto
- GET /api/creative/projects/[id] — detalhe com outputs
- DELETE /api/creative/projects/[id] — deletar projeto + outputs + storage

Implementar paginação via cursor (created_at) no GET de listagem.
```

---

## TASK 14 — Download em Batch (ZIP)

```
Implemente o download de múltiplas imagens como ZIP.

### src/app/api/creative/projects/[id]/download/route.ts

GET endpoint:
1. Busca todos os outputs do projeto
2. Baixa cada imagem do Supabase Storage
3. Cria um ZIP usando archiver (npm install archiver)
4. Nomeia cada arquivo: {format}_{index}.png (ex: 1x1_1.png, 4x5_1.png)
5. Retorna o ZIP como stream com headers de download

Adicione o botão de download no OutputGrid.tsx e na página do projeto.
```

---

## TASK 15 — Testes e Polish

```
Revisão final do módulo Creative Studio.

1. Verifique que TODAS as rotas API tratam erros corretamente:
   - Validação de input (zod schemas)
   - Rate limiting básico (max 10 gerações/minuto por usuário)
   - Tratamento de timeout das APIs de imagem
   - Mensagens de erro amigáveis na UI

2. Loading states em todas as interações:
   - Skeleton loaders na página de projetos
   - Spinner nos botões de ação
   - Progress bar na geração
   - Toast notifications para sucesso/erro

3. Responsividade:
   - Testar todas as páginas em mobile (375px)
   - Wizards devem empilhar verticalmente
   - Grid de outputs: 1 coluna mobile, 2 tablet, 3 desktop

4. Acessibilidade básica:
   - Labels em todos os inputs
   - Alt text nas imagens
   - Keyboard navigation nos selectors

5. Crie um arquivo .env.example com todas as variáveis necessárias:
   - OPENROUTER_API_KEY
   - REPLICATE_API_TOKEN
   - FAL_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

6. Adicione link para o Creative Studio na navegação principal da Máquina de Conteúdo.
```

---

## Ordem de Execução Recomendada

```
TASK 0  → Setup (5 min)
TASK 1  → Banco de dados (10 min)
TASK 2  → Componentes base (30 min)
TASK 3  → Presets e templates (20 min)
TASK 4  → TextOverlayEditor (20 min)
TASK 5  → API geração de imagem (30 min)
TASK 6  → API text overlay (20 min)
TASK 7  → API resize (15 min)
TASK 8  → API análise Gemini (20 min)
TASK 9  → Prompt builder (15 min)
TASK 10 → Página criar (30 min)
TASK 11 → Página variar (25 min)
TASK 12 → Página replicar (30 min)
TASK 13 → Projetos/histórico (20 min)
TASK 14 → Download ZIP (10 min)
TASK 15 → Testes e polish (30 min)
```

**Total estimado: ~5-6 horas de execução com Claude Code**