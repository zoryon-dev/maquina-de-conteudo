# Creative Studio — PRD (Módulo da Máquina de Conteúdo)

**Versão:** 1.0
**Data:** 2026-02-08
**Autor:** Jonas / VOAR DIGITAL
**Status:** Em definição

---

## 1. Visão Geral

O Creative Studio é um módulo isolado dentro da Máquina de Conteúdo (Next.js) que permite criar, variar e replicar imagens com IA. Opera em 3 modos que compartilham a mesma infraestrutura base.

### Problema que resolve
Hoje, gerar imagens para conteúdo social exige: abrir ferramentas externas (Canva, Midjourney), gerar manualmente cada formato, aplicar textos em editor separado, e repetir tudo para cada variação. O Creative Studio unifica esse fluxo em uma interface única integrada ao pipeline de conteúdo.

---

## 2. Arquitetura dos 3 Modos

### Modo 1 — CRIAR (Text-to-Image)
**Input:** Prompt textual + configurações
**Output:** Imagem(ns) gerada(s) com ou sem texto sobreposto

**Fluxo:**
1. Usuário escreve prompt (ou usa prompt builder tribal existente)
2. Seleciona modelo (Flux / DALL-E 3 / SDXL / Gemini)
3. Seleciona formato(s) de saída
4. Escolhe: texto embutido pela IA OU imagem limpa + texto via canvas
5. Se canvas: define texto, fonte, cor, posição
6. Gera → preview → ajusta → salva

### Modo 2 — VARIAR (Image-to-Image)
**Input:** Imagem existente + configurações de variação
**Output:** N variações em N formatos

**Fluxo:**
1. Usuário faz upload de imagem base
2. Seleciona tipo de variação:
   - Redimensionar (adaptar para outros formatos)
   - Reestilizar (mudar estilo visual mantendo composição)
   - Alterar elementos (inpainting — mudar fundo, objeto, cor)
3. Seleciona formato(s) de saída (1:1, 4:5, 9:16, 1.91:1)
4. Define quantidade de variações por formato
5. Gera → preview em grid → seleciona favoritas → salva

### Modo 3 — REPLICAR (Reference-to-Image)
**Input:** Imagem de referência + foto do usuário (opcional) + ajustes textuais
**Output:** Réplica(s) adaptada(s) nos formatos desejados

**Fluxo:**
1. Usuário faz upload da imagem de referência
2. IA analisa e extrai automaticamente:
   - Layout/composição (grid, posição de elementos)
   - Paleta de cores (hex values principais)
   - Estilo tipográfico (serif/sans, peso, tamanho relativo)
   - Textos via OCR (editáveis pelo usuário)
3. Usuário revisa extrações e ajusta:
   - Edita textos (substitui pelo seu conteúdo)
   - Opcionalmente sobe foto pessoal para substituir imagem da referência
   - Ajusta cores se quiser
4. Seleciona formato(s) de saída
5. Gera → preview lado-a-lado (referência vs réplica) → ajusta → salva

---

## 3. Stack Técnica

### APIs de Geração de Imagem (via OpenRouter)

| Modelo | Melhor para | Suporta img2img | Suporta texto nativo |
|--------|-------------|-----------------|---------------------|
| **Flux (Black Forest Labs)** | Qualidade geral, estilos variados | ✅ (via Replicate) | ⚠️ Limitado |
| **DALL-E 3** | Texto embutido na imagem, composições conceituais | ❌ (só text2img) | ✅ Bom |
| **Stable Diffusion XL** | Controle fino, inpainting, variações | ✅ Nativo | ❌ |
| **Gemini (Nano Banana 3)** | Análise de imagem + geração | ✅ | ✅ |

### Roteamento por Modo

```
Modo 1 (Criar):
  - Com texto embutido → DALL-E 3 ou Gemini (melhores em texto)
  - Sem texto (imagem limpa) → Flux ou SDXL (melhor qualidade visual)
  - Texto via canvas → qualquer modelo + Sharp/Canvas no backend

Modo 2 (Variar):
  - Redimensionar → Sharp (backend, sem IA)
  - Reestilizar → Flux img2img ou SDXL img2img
  - Inpainting → SDXL inpainting
  - ⚠️ DALL-E 3 NÃO suporta img2img

Modo 3 (Replicar):
  - Análise → Gemini Vision (extrai layout, cores, OCR, tipografia)
  - Geração → Flux ou SDXL (seguindo prompt construído da análise)
  - Composição com foto → SDXL inpainting ou composição via Sharp
```

### Fallback para img2img
O OpenRouter pode não rotear image-to-image diretamente para todos os modelos. Plano B:
- **Replicate API** para Flux img2img
- **Fal.ai** para SDXL img2img/inpainting
- Ambas têm billing por uso, custo baixo

### Texto Sobreposto — Duas Abordagens

**Abordagem A: IA gera com texto**
- Usa DALL-E 3 ou Gemini que são bons em renderizar texto
- Prompt inclui especificação exata do texto
- Pros: resultado orgânico, texto integrado ao design
- Cons: texto pode sair distorcido, pouco controle tipográfico

**Abordagem B: Canvas/Sharp no backend**
- IA gera imagem limpa
- Backend usa Sharp (Node.js) + Canvas para sobrepor texto
- Usuário configura: fonte, tamanho, cor, posição, sombra, fundo
- Pros: texto 100% legível, controle total
- Cons: resultado mais "colado", menos orgânico

**Implementação:** Toggle na UI — "Texto integrado pela IA" vs "Texto sobreposto manual"

---

## 4. Modelo de Dados (Supabase)

### Tabela: `creative_projects`
```sql
CREATE TABLE creative_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  mode TEXT NOT NULL CHECK (mode IN ('create', 'vary', 'replicate')),
  title TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'error')),
  
  -- Configurações comuns
  selected_formats JSONB DEFAULT '[]', -- ["1:1", "4:5", "9:16", "1.91:1"]
  quantity_per_format INT DEFAULT 1,
  selected_model TEXT, -- flux, dalle3, sdxl, gemini
  
  -- Modo 1: Criar
  prompt TEXT,
  text_mode TEXT CHECK (text_mode IN ('ai_embedded', 'canvas_overlay', NULL)),
  text_config JSONB, -- {content, font, size, color, position, shadow}
  
  -- Modo 2: Variar
  source_image_url TEXT,
  variation_type TEXT CHECK (variation_type IN ('resize', 'restyle', 'inpaint', NULL)),
  variation_config JSONB, -- configurações específicas da variação
  
  -- Modo 3: Replicar
  reference_image_url TEXT,
  user_photo_url TEXT,
  extracted_analysis JSONB, -- {layout, colors, typography, texts}
  user_edits JSONB, -- edições do usuário sobre a análise
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela: `creative_outputs`
```sql
CREATE TABLE creative_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES creative_projects(id) ON DELETE CASCADE,
  
  image_url TEXT NOT NULL, -- URL no storage
  thumbnail_url TEXT,
  format TEXT NOT NULL, -- "1:1", "4:5", "9:16", "1.91:1"
  width INT,
  height INT,
  
  generation_prompt TEXT, -- prompt final enviado à API
  model_used TEXT,
  generation_time_ms INT,
  
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Storage (Supabase Storage)
```
creative-uploads/
  {user_id}/
    sources/       -- imagens originais do usuário
    references/    -- imagens de referência (Modo 3)
    
creative-outputs/
  {user_id}/
    {project_id}/  -- outputs gerados
```

---

## 5. Componentes de UI (React/Next.js)

### Página principal: `/creative`
```
┌─────────────────────────────────────────────────┐
│  Creative Studio                                │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  CRIAR   │ │  VARIAR  │ │ REPLICAR │       │
│  │ 🎨       │ │ 🔄       │ │ 📋       │       │
│  │ Gerar do │ │ Adaptar  │ │ Copiar   │       │
│  │ zero     │ │ existente│ │ estilo   │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                 │
│  [Projetos recentes em grid]                    │
└─────────────────────────────────────────────────┘
```

### Componentes compartilhados
- `<FormatSelector />` — checkboxes para 1:1, 4:5, 9:16, 1.91:1 com preview visual
- `<ModelSelector />` — dropdown com Flux, DALL-E 3, SDXL, Gemini + info de capacidades
- `<ImageUploader />` — drag & drop com preview
- `<TextOverlayEditor />` — configuração de texto (fonte, cor, posição, etc)
- `<OutputGrid />` — grid de imagens geradas com ações (favoritar, download, deletar)
- `<GenerationQueue />` — status de gerações em andamento
- `<SideBySidePreview />` — comparação referência vs output (Modo 3)

### Fluxo do Modo 3 (Replicar) — UI específica

```
Passo 1: Upload referência
┌──────────────────────────────────┐
│  [Imagem de referência]          │
│                                  │
│  Análise IA:                     │
│  ├─ Layout: grid 2x2             │
│  ├─ Cores: #1a1a1a, #ff6b35...  │
│  ├─ Tipografia: Sans-serif bold  │
│  └─ Textos encontrados:          │
│     ├─ "Título Original" [edit]  │
│     ├─ "Subtítulo" [edit]        │
│     └─ "CTA aqui" [edit]         │
└──────────────────────────────────┘

Passo 2: Personalização
┌──────────────────────────────────┐
│  Textos (editáveis):             │
│  ├─ "Meu Novo Título" ✏️         │
│  ├─ "Meu Subtítulo" ✏️           │
│  └─ "Compre Agora" ✏️            │
│                                  │
│  Foto pessoal: [Upload]          │
│  Ajuste de cores: [Manter/Editar]│
│  Formatos: ☑️1:1 ☑️4:5 ☑️9:16    │
└──────────────────────────────────┘

Passo 3: Preview
┌──────────────────────────────────┐
│  Referência    →    Réplica      │
│  [original]         [gerada]     │
│                                  │
│  [Regenerar] [Ajustar] [Salvar]  │
└──────────────────────────────────┘
```

---

## 6. API Routes (Next.js App Router)

```
/api/creative/
  ├── analyze/          POST — Análise de imagem via Gemini Vision (Modo 3)
  │   └── Body: { imageUrl, analysisType: 'full' | 'colors' | 'ocr' }
  │   └── Response: { layout, colors, typography, texts }
  │
  ├── generate/         POST — Gerar imagem(ns)
  │   └── Body: { mode, prompt, model, formats[], quantity, textConfig?, sourceImage? }
  │   └── Response: { jobId } (async)
  │
  ├── generate/[jobId]  GET — Status da geração
  │   └── Response: { status, outputs[], progress }
  │
  ├── overlay/          POST — Aplicar texto sobre imagem (canvas mode)
  │   └── Body: { imageUrl, textConfig: { content, font, size, color, position } }
  │   └── Response: { resultUrl }
  │
  ├── resize/           POST — Redimensionar/adaptar para formato
  │   └── Body: { imageUrl, targetFormat, fitMode: 'crop' | 'fill' | 'extend' }
  │   └── Response: { resultUrl }
  │
  └── projects/         CRUD padrão
      ├── GET            — Listar projetos
      ├── POST           — Criar projeto
      ├── [id] GET       — Detalhe do projeto
      └── [id]/outputs   — Outputs do projeto
```

---

## 7. Formatos de Saída

| Nome | Ratio | Pixels | Uso |
|------|-------|--------|-----|
| Feed Quadrado | 1:1 | 1080x1080 | Instagram feed, Facebook |
| Feed Retrato | 4:5 | 1080x1350 | Instagram feed (max height) |
| Stories/Reels | 9:16 | 1080x1920 | Instagram Stories, Reels, TikTok |
| Landscape | 1.91:1 | 1200x628 | LinkedIn, Twitter/X, Blog OG |
| Pinterest | 2:3 | 1000x1500 | Pinterest pins |
| Cover | 16:9 | 1920x1080 | YouTube thumbnail, apresentações |

---

## 8. Fluxo Técnico Detalhado — Modo 3 (Replicar)

Este é o modo mais complexo. Detalhamento do pipeline:

### Etapa 1: Análise via Gemini Vision
```javascript
// Prompt para Gemini analisar a referência
const analysisPrompt = `
Analise esta imagem de design/post social e extraia:

1. LAYOUT:
   - Tipo de grid (centralizado, 2 colunas, assimétrico, etc)
   - Posição dos elementos principais (imagem, texto, logo)
   - Margens e espaçamentos relativos

2. CORES (em hex):
   - Background principal
   - Cor do texto principal
   - Cor de destaque/accent
   - Cores secundárias

3. TIPOGRAFIA:
   - Família (serif, sans-serif, display, monospace)
   - Peso aparente (light, regular, bold, black)
   - Tamanho relativo (heading vs body)
   - Caixa (uppercase, lowercase, mixed)

4. TEXTOS (OCR):
   - Liste todos os textos visíveis na ordem visual
   - Indique a hierarquia (título, subtítulo, body, CTA)
   - Posição relativa na imagem (top-left, center, bottom-right)

Retorne em JSON estruturado.
`;
```

### Etapa 2: Construção do Prompt de Réplica
```javascript
// Usa a análise + edições do usuário para construir prompt final
const buildReplicaPrompt = (analysis, userEdits) => {
  return `
    Create an image with the following specifications:
    
    Layout: ${analysis.layout.type}, elements positioned at ${analysis.layout.positions}
    
    Color palette: background ${userEdits.colors?.bg || analysis.colors.background},
    text ${userEdits.colors?.text || analysis.colors.text},
    accent ${userEdits.colors?.accent || analysis.colors.accent}
    
    Typography: ${analysis.typography.family} ${analysis.typography.weight}
    
    Text content:
    ${userEdits.texts.map(t => `- ${t.hierarchy}: "${t.content}" at ${t.position}`).join('\n')}
    
    ${userEdits.userPhoto ? 'Include a portrait photo of a person as the main visual element' : ''}
    
    Style: professional social media post, ${analysis.layout.type} composition
    Aspect ratio: ${userEdits.format}
  `;
};
```

### Etapa 3: Geração + Composição
```
Se userPhoto fornecida:
  Opção A: Inpainting via SDXL (substitui região da imagem)
  Opção B: Geração + composição via Sharp (mais controle)
  
Se só texto mudou:
  Geração com novo prompt baseado na análise
  
Output → resize para todos os formatos selecionados
```

---

## 9. Dependências e Custos

### Pacotes NPM
```json
{
  "sharp": "^0.33.0",          // Resize, crop, composição de imagens
  "canvas": "^2.11.0",         // Texto overlay avançado (server-side)
  "openai": "^4.0.0",          // OpenRouter é compatível com SDK OpenAI
  "replicate": "^0.31.0",      // Fallback para img2img (Flux, SDXL)
  "@fal-ai/client": "^1.0.0"   // Fallback para inpainting
}
```

### Custo estimado por geração (OpenRouter)
| Modelo | Custo aprox/imagem |
|--------|--------------------|
| Flux Schnell | $0.003 |
| Flux Pro | $0.05 |
| DALL-E 3 | $0.04-0.08 |
| SDXL | $0.002-0.01 |
| Gemini (análise) | $0.001 |

---

## 10. Fases de Implementação

### Fase 1 — Infraestrutura (1-2 dias)
- [ ] Tabelas Supabase (`creative_projects`, `creative_outputs`)
- [ ] Storage buckets configurados
- [ ] Rota base `/creative` com seletor de modo
- [ ] `<ImageUploader />` componente
- [ ] `<FormatSelector />` componente
- [ ] `<ModelSelector />` componente
- [ ] Integração OpenRouter para geração de imagem (text2img)

### Fase 2 — Modo 1: Criar (2-3 dias)
- [ ] UI do prompt input + configurações
- [ ] Rota `/api/creative/generate` (text-to-image)
- [ ] Toggle texto embutido vs canvas overlay
- [ ] `<TextOverlayEditor />` para modo canvas
- [ ] Rota `/api/creative/overlay` (Sharp + Canvas)
- [ ] `<OutputGrid />` com preview e download
- [ ] Salvar projeto + outputs no Supabase

### Fase 3 — Modo 2: Variar (2-3 dias)
- [ ] Upload de imagem base
- [ ] Seletor de tipo de variação (resize/restyle/inpaint)
- [ ] Rota `/api/creative/resize` (Smart crop via Sharp)
- [ ] Integração img2img (Replicate ou Fal.ai como fallback)
- [ ] Geração em batch (múltiplos formatos de uma vez)
- [ ] Grid de outputs com seleção de favoritos

### Fase 4 — Modo 3: Replicar (3-4 dias)
- [ ] Upload de referência + foto do usuário
- [ ] Rota `/api/creative/analyze` (Gemini Vision)
- [ ] UI de revisão da análise (editar textos, cores, etc)
- [ ] Pipeline de construção de prompt a partir da análise
- [ ] `<SideBySidePreview />` (referência vs réplica)
- [ ] Composição com foto do usuário

### Fase 5 — Polish (1-2 dias)
- [ ] Fila de geração com status real-time
- [ ] Download em batch (ZIP)
- [ ] Histórico de projetos
- [ ] Integração com biblioteca da Máquina de Conteúdo

**Total estimado: 9-14 dias de desenvolvimento**

---

## 11. Decisões em Aberto

1. **Fila de geração**: usar Supabase Realtime para polling de status ou implementar WebSocket?
2. **Limite de gerações**: rate limiting por usuário? Quantas imagens/dia?
3. **Templates pré-prontos**: oferecer templates de composição populares (quote card, before/after, etc)?
4. **Integração tribal**: o Modo 1 deve puxar dados do prompt builder tribal existente automaticamente?
5. **Mobile**: priorizar responsividade ou focar em desktop first?