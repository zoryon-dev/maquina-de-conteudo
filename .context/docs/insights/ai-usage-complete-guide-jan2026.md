# AI Usage Complete Guide

Guia completo e denso de todos os pontos de uso de IA no Máquina de Conteúdo.

**Data:** Janeiro 2026
**Versão:** 1.0

---

## Índice

1. [Overview](#overview)
2. [Modelos de IA Utilizados](#modelos-de-ia-utilizados)
3. [Theme Processing](#1-theme-processing)
4. [Narratives Generation](#2-narratives-generation)
5. [Content Generation](#3-content-generation)
6. [RAG Context](#4-rag-context)
7. [Image Generation](#5-image-generation)
8. [Synthesizer](#6-synthesizer)
9. [Prompt Engineering](#prompt-engineering)
10. [Error Handling](#error-handling)
11. [Custos e Performance](#custos-e-performance)

---

## Overview

O sistema utiliza IA em **7 pontos principais** do fluxo de criação de conteúdo:

```
Discovery → Theme Processing → Narratives → Synthesizer → Content Generation → Image Generation
                ↓                  ↓              ↓               ↓                ↓
              IA refina         IA cria        IA estrutura    IA gera         IA cria
              tema             ângulos        pesquisa        slides/carrousel  imagens
```

### Ponto de Entrada Principal

**Provider:** OpenRouter (https://openrouter.ai)
**Autenticação:** `OPENROUTER_API_KEY` environment variable

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Discovery                                   │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐               │
│  │ YouTube  │───→│ Discovery  │───→│ Perplexity   │               │
│  │ Instagram│    │ Service   │    │ (AI Search)  │               │
│  └──────────┘    └───────────┘    └──────────────┘               │
│                                               │                    │
│                                               ▼                    │
│                                      ┌───────────────┐            │
│                                      │ Theme Save    │            │
│                                      └───────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Theme Processing (API)                            │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │
│  │ Perplexity    │    │ Instagram     │    │ YouTube        │      │
│  │ ThemeProcessor│    │ SocialTheme   │    │ SocialTheme    │      │
│  │ Service       │    │ Processor     │    │ Processor      │      │
│  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘      │
│          │                    │                    │               │
│          └────────────────────┴────────────────────┘               │
│                               │                                     │
│                               ▼                                     │
│                      ┌──────────────────┐                          │
│                      │ Gemini 2.0 Flash │                          │
│                      │ (OpenRouter)     │                          │
│                      └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Wizard                                       │
│  ┌──────────────┐     ┌─────────────┐     ┌─────────────┐         │
│  │ User Input   │────→│ Narratives  │────→│ Synthesizer │         │
│  │ + Theme Data │     │ Generation  │     │ (Tavily)    │         │
│  └──────────────┘     └──────┬───────┘     └──────┬───────┘         │
│                              │                     │                │
│                              ▼                     ▼                │
│                       ┌─────────────┐       ┌─────────────┐        │
│                       │ GPT-4.1     │       │ Gemini Flash │       │
│                       │ (OpenRouter)│       │ (Synthesize)│       │
│                       └─────────────┘       └─────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Content Generation                                │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                    Selected Narrative                       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                     │
│                              ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              LLM Generation (Carousel/Image/Video)          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                     │
│                              ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                   RAG Context (Voyage)                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                     │
│                              ▼                                     │
│  ┌───────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │   Carousel    │     │   Image     │     │   Video     │        │
│  │   v4.1        │     │   Post v2.0 │     │  Script v2.0│        │
│  └───────┬───────┘     └──────┬───────┘     └──────┬───────┘        │
│          │                    │                    │                │
│          └────────────────────┴────────────────────┘               │
│                               │                                     │
│                               ▼                                     │
│                      ┌──────────────────┐                          │
│                      │ GPT-4.1 / Other  │                          │
│                      │ (OpenRouter)     │                          │
│                      └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Image Generation                                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              AI Image Generation (OpenRouter)               │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │     │
│  │  │ Gemini  │ │ GPT-5   │ │ Seedream│ │ Flux    │          │     │
│  │  │ Image   │ │ Image   │ │ 4.5     │ │ 2-max   │          │     │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │     │
│  └───────┼───────────┼───────────┼───────────┼───────────┘     │
│          │           │           │           │                  │
│          └───────────┴───────────┴───────────┘                  │
│                               │                                   │
│                               ▼                                   │
│                      ┌───────────────┐                             │
│                      │ Fallback HTML  │                             │
│                      │   Templates    │                             │
│                      │ (ScreenshotOne)│                             │
│                      └───────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modelos de IA Utilizados

### 1. Google Gemini 2.0 Flash Experimental (Free)

**Modelo ID:** `google/gemini-2.0-flash-exp:free`

**Utilização:**
- Theme Processing (Perplexity, Instagram, YouTube)
- Synthesizer (pesquisa estruturada)

**Características:**
- Grátis via OpenRouter
- Resposta rápida (~1-2 segundos)
- 500 tokens max output
- Temperature: 0.3-0.4

**Custo:** $0

### 2. OpenAI GPT-4.1

**Modelo ID:** `openai/gpt-4.1`

**Utilização:**
- Narratives Generation
- Content Generation (padrão)

**Características:**
- Alta qualidade criativa
- Resposta em ~3-5 segundos
- Temperature: 0.7-0.8

**Custo:** ~$0.002-0.005 por requisição

### 3. Gemini 3 Pro Image

**Modelo ID:** `google/gemini-3-pro-image-preview`

**Utilização:**
- AI Image Generation

**Características:**
- Gera imagens de alta qualidade
- Resposta em ~5-10 segundos

**Custo:** ~$0.01-0.02 por imagem

### 4. Outros Modelos de Imagem

| Modelo | ID | Uso |
|--------|-----|-----|
| GPT-5 Image | `openai/gpt-5-image` | Imagens gerais |
| Seedream 4.5 | `bytedance-seed/seedream-4.5` | Estilo artístico |
| Flux 2 Max | `black-forest-labs/flux.2-max` | Alta qualidade |

---

## 1. Theme Processing

### Propósito

Processar temas salvos do Discovery para melhorar o conteúdo antes de criar um Wizard.

### Localização

```
src/lib/discovery-services/
├── perplexity/theme-processor.service.ts
└── social/social-theme-processor.service.ts
```

### API Route

```
POST /api/themes/[id]/wizard
```

### Serviço Perplexity

```typescript
export class ThemeProcessorService {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'google/gemini-2.0-flash-exp:free';

  async processPerplexityTheme(themeData: PerplexityThemeData): Promise<ProcessedThemeResult> {
    // 1. Extrai melhor conteúdo
    const contentToProcess = themeData.sourceData?.summary || themeData.context || '';

    // 2. Extrai melhor URL de referência
    const citations = (themeData.sourceData?.allCitations || []) as string[];
    const referenceUrl = citations.length > 0 ? citations[0] : themeData.sourceUrl || '';

    // 3. Processa com IA
    const result = await this.processWithAI(contentToProcess, themeData.theme);

    return { ...result, referenceUrl };
  }
}
```

### Prompt (Perplexity)

```typescript
private buildPrompt(content: string, originalTheme: string): string {
  const truncatedContent = content.length > 2500
    ? content.substring(0, 2500) + '...'
    : content;

  return `Analise o seguinte conteúdo sobre "${originalTheme}" e extraia as informações mais importantes para criar conteúdo para redes sociais:

CONTEÚDO:
"""
${truncatedContent}
"""

Por favor, retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{
  "theme": "tema principal em 1-2 frases curtas e impactantes",
  "context": "3-5 pontos principais do conteúdo, cada um em uma linha curta",
  "objective": "objetivo sugerido para o conteúdo em uma frase",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Regras:
- theme: deve ser curto, impactante, ideal para caption
- context: bullet points com as informações mais valiosas
- objective: o que esse conteúdo deve achieve (ex: "educar sobre X", "gerar engajamento sobre Y")
- suggestedTags: 3-5 hashtags relevantes baseadas no conteúdo`;
}
```

### System Prompt

```typescript
private getSystemPrompt(): string {
  return 'Você é um especialista em criar conteúdo para redes sociais. Sua tarefa é processar informações de trending topics e extrair os elementos mais importantes para criar conteúdo viral.';
}
```

### Response Format

```typescript
interface ProcessedThemeResult {
  theme: string;        // 1-2 frases curtas
  context: string;      // 3-5 bullet points
  objective?: string;   // Objetivo em uma frase
  suggestedTags?: string[];
  referenceUrl: string; // Melhor URL das citations
}
```

### Serviço Social (Instagram/YouTube)

```typescript
export class SocialThemeProcessorService {
  private model = 'google/gemini-2.0-flash-exp:free';

  async processSocialTheme(
    themeData: SocialThemeData,
    platform: 'instagram' | 'youtube'
  ): Promise<ProcessedSocialThemeResult> {
    const contentToProcess = themeData.briefing || themeData.context || '';
    const result = await this.processWithAI(contentToProcess, themeData.theme, platform);

    return {
      ...result,
      suggestedContentType: platform === 'youtube' ? 'video' : 'image',
    };
  }
}
```

### System Prompt por Plataforma

**Instagram:**
```typescript
`Você é um especialista em criar conteúdo viral para Instagram. Sua tarefa é processar informações de trending topics do Instagram e transformá-los em ideias de conteúdo engajantes.

Foque em:
- Conteúdo visual e impactante
- Hashtags relevantes
- Call-to-actions eficazes
- Formatos que performam bem (carrossel, reel, post)`
```

**YouTube:**
```typescript
`Você é um especialista em criar conteúdo viral para YouTube e redes sociais. Sua tarefa é processar informações de trending topics do YouTube e transformá-las em ideias de conteúdo engajáveis.

Foque em:
- Conteúdo educativo e entretenimento
- Hooks que prendem a atenção
- Formatos curtos e dinâmicos (Shorts, vídeos)
- Hashtags relevantes`
```

### Response Format (Social)

```typescript
interface ProcessedSocialThemeResult {
  theme: string;
  context: string;
  objective?: string;
  suggestedTags?: string[];
  suggestedContentType?: 'image' | 'carousel' | 'video' | 'text';
}
```

---

## 2. Narratives Generation

### Propósito

Gerar múltiplas narrativas (ângulos) a partir de um tema, permitindo o usuário escolher a melhor abordagem.

### Localização

```
src/lib/wizard-services/llm.service.ts
```

### API Route

```
POST /api/wizard/[id]/submit
Body: { submitType: "narratives" }
```

### Serviço

```typescript
export async function generateNarratives(input: NarrativeInput): Promise<ServiceResult<Narrative[]>> {
  // 1. Gerar contexto RAG
  const ragContext = await generateWizardRagContext(input.ragConfig);

  // 2. Build prompt
  const prompt = buildNarrativesPrompt(input, ragContext);

  // 3. Gerar narrativas
  const result = await generateObject({
    model: openrouter(input.model || 'openai/gpt-4.1'),
    schema: narrativesSchema,
    prompt,
    temperature: 0.7,
  });

  return { success: true, data: result.narratives };
}
```

### Schema

```typescript
const narrativesSchema = z.object({
  narratives: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    angle: z.enum(['criativo', 'estrategico', 'dinamico', 'inspirador']),
    content: z.string(),
  })).min(3).max(5),
});
```

### Prompt Structure

```typescript
function buildNarrativesPrompt(input: NarrativeInput, ragContext: string): string {
  return `<contexto_rag>
${ragContext || '(Nenhum documento adicional fornecido)'}
</contexto_rag>

<tema_central>
${input.theme}
</tema_central>

<contexto_adicional>
${input.context || ''}
</contexto_adicional>

<objetivo>
${input.objective || 'Gerar engajamento'}
</objetivo>

<público_alvo>
${input.targetAudience || 'Público geral interessado no tema'}
</público_alvo>

<instruções>
Gere 3-5 narrativas diferentes para conteúdo de redes sociais, cada uma com um ângulo único:
- criativo: abordagem inovadora, fora da caixa
- estrategico: foco em resultados práticos
- dinamico: tom energético, motivacional
- inspirador: histórias que inspiram ação

Para cada narrativa:
1. Título curto e impactante
2. Descrição de 1-2 frases
3. Ângulo predominante
4. Conteúdo desenvolvido (200-300 caracteres)
</instruções>`;
}
```

### Response Format

```typescript
interface Narrative {
  id: string;
  title: string;
  description: string;
  angle: 'criativo' | 'estrategico' | 'dinamico' | 'inspirador';
  content: string;
}
```

---

## 3. Content Generation

### Propósito

Gerar o conteúdo final baseado na narrativa selecionada pelo usuário.

### Tipos Suportados

| Tipo | Versão | Características |
|------|--------|----------------|
| Carousel | v4.1 | Tags XML, Synthesizer v3.1, ProgressaoSugeridaV3 |
| Image Post | v2.0 | HCCA structure, técnicas de retenção |
| Video Script | v2.0 | 5 estruturas, otimização 3 segundos |
| Text | v1.0 | Thread/Tweet padrão |

### Localização

```
src/lib/wizard-services/
├── llm.service.ts
└── prompts.ts
```

### API Route

```
POST /api/wizard/[id]/submit
Body: { submitType: "generation" }
```

### Carousel Prompt v4.1

```typescript
export function getCarouselPrompt(params: CarouselPromptParams): string {
  return `<identidade>
Você é um especialista em criar conteúdo viral para carrosséis de Instagram, otimizados para engajamento e retenção.
</identidade>

<filosofia_central>
Carrosséis devem ter uma narrativa coesa do primeiro ao último slide, com ganchos visuais e textuais que mantenham o usuário "swipando".
</filosofia_central>

<sistema_throughline>
O throughline é o fio condutor que conecta todos os slides. Deve estar presente em cada slide de forma sutil, criando uma jornada narrativa completa.
</sistema_throughline>

<entrada>
Tema: ${params.theme}
Contexto: ${params.context || ''}
Narrativa selecionada: ${params.narrative?.title || 'Nenhuma'}
Conteúdo da narrativa: ${params.narrative?.content || ''}
Número de slides: ${params.numberOfSlides || 7}
</entrada>

${params.synthesizedResearch ? `
<pesquisa_sintetizada>
<resumo_executivo>${params.synthesizedResearch.resumo_executivo}</resumo_executivo>

<throughlines_potenciais>
${params.synthesizedResearch.throughlines_potenciais.map(t => `- ${t.throughline}: ${t.potencial_viral}`).join('\n')}
</throughlines_potenciais>

<tensoes_narrativas>
${params.synthesizedResearch.tensoes_narrativas.map(t => `- ${t.tensao}: ${t.uso_sugerido}`).join('\n')}
</tensoes_narrativas>

<dados_contextualizados>
${params.synthesizedResearch.dados_contextualizados.map(d => `- ${d.frase_pronta}: ${d.contraste}`).join('\n')}
</dados_contextualizados>

<progressao_sugerida>
Ato 1 - Captura: ${params.synthesizedResearch.progressao_sugerida.ato1_captura.gancho_principal}
Ato 2 - Desenvolvimento: ${params.synthesizedResearch.progressao_sugerida.ato2_desenvolvimento.join(' → ')}
Ato 3 - Resolução: ${params.synthesizedResearch.progressao_sugerida.ato3_resolucao.verdade_central}
</progressao_sugerida>
</pesquisa_sintetizada>
` : ''}

<referencias_rag>
${params.ragContext || '(Nenhuma referência adicional)'}
</referencias_rag>

<instruções_especificas>
1. CRIE ${params.numberOfSlides || 7} SLIDES únicos
2. Cada slide deve ter: título + conteúdo + prompt_para_imagem
3. Use a estrutura de 3 atos da progressão sugerida
4. Inclua pelo menos um dado contextualizado
5. Crie tensão narrativa em 2-3 slides
6. O último slide deve ter CTA baseado na resolução
7. Image prompts devem ser descritivos para IA geradora de imagens
</instruções_especificas>

<output_format>
Retorne APENAS um JSON válido com esta estrutura:
{
  "slides": [
    {
      "title": "Título do slide (máximo 6 palavras)",
      "content": "Conteúdo do slide (2-3 frases, máximo 200 caracteres)",
      "imagePrompt": "Prompt detalhado para geração de imagem em português"
    }
  ],
  "caption": "Caption para o post (150-200 caracteres)",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "cta": "Call-to-action claro (1 frase)"
}
</output_format>`;
}
```

### Image Post Prompt v2.0

```typescript
export function getImagePrompt(params: ImagePromptParams): string {
  return `<identidade>
Você é um especialista em criar posts de imagem viral para Instagram, usando a estrutura HCCA (Hook-Contexto-Conteúdo-Ação).
</identidade>

<filosofia>
Posts de imagem devem seguir HCCA:
1. Hook: Primeira frase que prende a atenção
2. Contexto: Informação relevante que sustenta o hook
3. Conteúdo: Valor principal da mensagem
4. Ação: Call-to-action claro
</filosofia>

<entrada>
Tema: ${params.theme}
Contexto: ${params.context || ''}
Narrativa: ${params.narrative?.content || ''}
</entrada>

<referencias_rag>
${params.ragContext || ''}
</referencias_rag>

<framework_imagem>
Use técnicas de retenção:
- Pattern Interrupt: quebre o padrão visual esperado
- Curiosity Gap: crie lacuna de curiosidade
- Social Proof: inclua prova social
- Urgency: adicione elemento de urgência
</framework_imagem>

<framework_legenda>
Estrutura HCCA para legenda:
1. Hook: Primeira linha (emoji + frase impactante)
2. Contexto: 2-3 linhas de contexto
3. Conteúdo: 3-5 linhas de valor
4. CTA: Call-to-action claro
</framework_legenda>

<output_format>
{
  "imagePrompt": "Prompt para IA geradora de imagem (descrição visual detalhada em português)",
  "caption": "Caption completa em estrutura HCCA",
  "hashtags": ["array", "de", "hashtags"],
  "cta": "Call-to-action específico"
}
</output_format>`;
}
```

### Video Script Prompt v2.0

```typescript
export function getVideoPrompt(params: VideoPromptParams): string {
  return `<identidade>
Você é um especialista em criar scripts de vídeo curto viral (YouTube Shorts, TikTok, Reels).
</identidade>

<filosofia>
Vídeos curtos devem prender a atenção nos primeiros 3 segundos e manter retenção até o final.
</filosofia>

<entrada>
Tema: ${params.theme}
Narrativa: ${params.narrative?.content || ''}
</entrada>

<framework_hooks>
Use estes padrões de hook:
- Pergunta intrigante: "Você sabia que..."
- Promessa ousada: "Em 30 segundos você vai..."
- Número específico: "3 coisas que ninguém te conta sobre..."
- Curiosidade: "O segredo que..."
- Contraste: "Todo mundo faz X, mas você deveria fazer Y"
</framework_hooks>

<framework_estrutura>
Escolha a melhor estrutura:
1. Problema-Solução: Apresenta problema → Mostra solução
2. Lista/Dicas: "X coisas sobre Y" → Enumera → Conclusão
3. Storytelling: Personagem → Conflito → Resolução
4. Polêmica: Opinião contrária → Argumentos → Conclusão
5. Tutorial: Passo a passo → Demo → Resultado
</framework_estrutura>

<output_format>
{
  "hook": "Primeiros 3 segundos (crucial para retenção)",
  "structure": "estrutura_escolhida",
  "sections": [
    {"timestamp": "0-3s", "content": "Hook visual + textual"},
    {"timestamp": "3-15s", "content": "Desenvolvimento principal"},
    {"timestamp": "15-30s", "content": "Conclusão + CTA"}
  ],
  "visualCues": "Instruções visuais para cada seção",
  "caption": "Caption para o post",
  "hashtags": ["array", "de", "hashtags"],
  "cta": "Call-to-action"
}
</output_format>`;
}
```

---

## 4. RAG Context

### Propósito

Enriquecer prompts com documentos do usuário para geração de conteúdo mais relevante e personalizado.

### Localização

```
src/lib/wizard-services/rag.service.ts
```

### Serviço

```typescript
export async function generateWizardRagContext(
  config: RagConfig = {}
): Promise<string> {
  // 1. Buscar chunks baseados em configuração
  const chunks = await fetchRelevantChunks(config);

  // 2. Formatar para prompt
  return formatRagForPrompt(chunks);
}
```

### Voyage AI Embeddings

```typescript
import { voyage } from '@ai-sdk/voyage';

const embedder = voyage({ embeddingModel: 'voyage-4-large' });

const { embedding } = await embedder.doEmbed({
  values: [text],
});

// similarity = cosineSimilarity(queryEmbedding, docEmbedding)
```

### Threshold

**Unificado:** 0.5 (para todas as categorias)

```typescript
const SIMILARITY_THRESHOLD = 0.5;

const relevantChunks = chunks.filter(chunk =>
  chunk.similarity >= SIMILARITY_THRESHOLD
);
```

### Chunking por Categoria

```typescript
function getChunkingOptionsForCategory(category: string): ChunkingOptions {
  const options: Record<string, ChunkingOptions> = {
    'blog-posts': { maxChunkSize: 1500, overlap: 200 },
    'social-media': { maxChunkSize: 800, overlap: 100 },
    'articles': { maxChunkSize: 1200, overlap: 150 },
    'documents': { maxChunkSize: 2000, overlap: 300 },
    default: { maxChunkSize: 1000, overlap: 200 },
  };

  return options[category] || options.default;
}
```

---

## 5. Image Generation

### Propósito

Gerar imagens para posts usando AI ou HTML templates.

### Localização

```
src/lib/wizard-services/
├── image-generation.service.ts
└── screenshotone.service.ts
```

### Modelos Disponíveis

```typescript
const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
};
```

### AI Generation

```typescript
async function generateAiImage(input: ImageGenerationInput): Promise<ServiceResult<ImageGenerationResult>> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      prompt: buildImagePrompt(input),
      response_format: { type: 'url' },
    }),
  });

  const data = await response.json();
  return { success: true, data: { url: data.url } };
}
```

### Image Prompt

```typescript
function buildImagePrompt(input: ImageGenerationInput): string {
  return `Create a social media image with these specifications:

Style: ${input.style}
Color: ${input.color}
Composition: ${input.composition || 'center-focused'}
Mood: ${input.mood || 'professional'}

Content: ${input.content}

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ''}

Requirements:
- High quality, professional look
- Suitable for Instagram/post format
- Text should be readable if included
- Colors should be vibrant and engaging`;
}
```

### HTML Template Fallback

```typescript
async function generateHtmlTemplateImage(input: ImageGenerationInput): Promise<ServiceResult<ImageGenerationResult>> {
  const response = await fetch(`https://api.screenshotone.com/take`, {
    method: 'GET',
    params: {
      access_key: SCREENSHOT_ONE_ACCESS_KEY,
      url: buildHtmlTemplateUrl(input),
      format: 'png',
      viewport_width: '1080',
      viewport_height: '1080',
    },
  });

  return { success: true, data: { url: response.url } };
}
```

### Templates Disponíveis

22+ templates HTML estáticos em `.context/wizard-prompts/`:

| Arquivo | Descrição |
|---------|-----------|
| `dark-mode.html` | Fundo escuro + tipografia clara |
| `white-mode.html` | Fundo claro + tipografia escura |
| `superheadline.html` | Foco em headline impactante |
| `twitter.html` | Formatado para Twitter/X |

---

## 6. Synthesizer

### Propósito

Transformar resultados brutos do Tavily em campos de pesquisa estruturados antes da geração de narrativas.

### Localização

```
src/lib/wizard-services/synthesizer.service.ts
```

### Serviço

```typescript
export async function synthesizeResearch(tavilyResults: TavilyResult[]): Promise<SynthesizedResearch> {
  const prompt = buildSynthesizerPrompt(tavilyResults);

  const result = await generateObject({
    model: openrouter('google/gemini-2.0-flash-exp:free'),
    schema: synthesizedResearchSchema,
    prompt,
    temperature: 0.4,
  });

  return result;
}
```

### Schema

```typescript
interface SynthesizedResearch {
  resumo_executivo: string;
  throughlines_potenciais: ThroughlinePotencial[];
  tensoes_narrativas: TensoesNarrativa[];
  dados_contextualizados: DadoContextualizado[];
  exemplos_narrativos: ExemploNarrativo[];
  erros_armadilhas: ErroArmadilha[];
  frameworks_metodos: FrameworkMetodoV3[];
  hooks: Hook[];
  progressao_sugerida: ProgressaoSugeridaV3;
  perguntas_respondidas: string[];
  gaps_oportunidades: string[];
  sources: string[];
}
```

---

## Prompt Engineering

### Tags XML

Estruturação com tags XML para separar seções:

```typescript
const prompt = `
<identidade>
Você é um especialista em...
</identidade>

<filosofia_central>
Princípios que guiam a criação...
</filosofia_central>

<entrada>
${input}
</entrada>

<referencias_rag>
${ragContext}
</referencias_rag>

<instruções_especificas>
1. Primeira instrução
2. Segunda instrução
</instrucoes_especificas>

<output_format>
Formato esperado da resposta
</output_format>
`;
```

### JSON Output Estrito

```typescript
`Por favor, retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{
  "campo1": "valor",
  "campo2": ["array", "de", "valores"]
}`
```

### Truncagem Inteligente

```typescript
const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};
```

### Temperature por Tipo de Tarefa

| Tarefa | Temperature | Justificativa |
|--------|-------------|---------------|
| Theme Processing | 0.3-0.4 | Precisão > Criatividade |
| Narratives | 0.7 | Diversidade de ângulos |
| Content Generation | 0.8 | Máxima criatividade |
| Synthesizer | 0.4 | Fidelidade aos dados |

---

## Error Handling

### Graceful Degradation

```typescript
async function processWithAI(data: any): Promise<Result> {
  // 1. Verificar configuração
  if (!this.apiKey) {
    console.warn('[Service] API key not configured');
    return this.fallbackResult(data);
  }

  try {
    // 2. Tentar processamento com IA
    return await this.callAI(data);
  } catch (error) {
    console.error('[Service] AI processing failed:', error);
    // 3. Fallback para processamento básico
    return this.fallbackResult(data);
  }
}
```

### Retry Pattern

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### JSON Parse Robusto

```typescript
function parseAIResponse(response: string): any {
  try {
    let jsonStr = response.trim();

    // Remove markdown
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Find JSON
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];

    return JSON.parse(jsonStr);
  } catch (error) {
    return fallbackResponse(response);
  }
}
```

---

## Custos e Performance

### Custos por Operação (Estimativa)

| Operação | Modelo | Custo Estimado |
|----------|--------|---------------|
| Theme Processing | Gemini 2.0 Flash (free) | $0 |
| Narratives (5) | GPT-4.1 | $0.002-0.005 |
| Carousel (7 slides) | GPT-4.1 | $0.003-0.008 |
| Image Post | GPT-4.1 | $0.001-0.003 |
| Video Script | GPT-4.1 | $0.002-0.004 |
| Synthesizer | Gemini 2.0 Flash (free) | $0 |
| AI Image | Gemini 3 Pro Image | $0.01-0.02 |
| RAG Embedding | Voyage 4 Large | $0.0001 por chunk |

### Performance por Operação

| Operação | Tempo Médio |
|----------|-------------|
| Theme Processing | 1-2s |
| Narratives | 3-5s |
| Carousel Generation | 5-8s |
| Image Post | 2-4s |
| Video Script | 3-5s |
| Synthesizer | 2-3s |
| AI Image Generation | 5-10s |
| HTML Template | 2-3s |

### Otimizações Implementadas

1. **Paralelismo:** `Promise.allSettled` para múltiplas plataformas
2. **Caching:** Embeddings em cache (planejado)
3. **Free Tier:** Gemini 2.0 Flash para operações não-críticas
4. **Fallback:** HTML templates quando AI falha

---

## Variáveis de Ambiente

```env
# OpenRouter (principal)
OPENROUTER_API_KEY=sk-or-...

# Perplexity (busca com citações)
PERPLEXITY_API_KEY=your-perplexity-api-key

# Voyage AI (embeddings RAG)
VOYAGE_API_KEY=voyage-...

# Tavily (contextual search)
TAVILY_API_KEY=tvly-...

# Apify (YouTube transcription)
APIFY_API_KEY=apify-...

# Firecrawl (web scraping)
FIRECRAWL_API_KEY=fc-...

# ScreenshotOne (HTML templates)
SCREENSHOT_ONE_ACCESS_KEY=your-access-key
```

---

## Referências

- AI Processing Patterns: `.serena/memories/ai-processing-patterns.md`
- Discovery Patterns: `.serena/memories/discovery-patterns.md`
- Wizard Patterns: `.serena/memories/wizard-patterns.md`
- Vercel AI SDK: `.serena/memories/vercel-ai-sdk-patterns.md`
- RAG Patterns: `.serena/memories/rag-embedding-patterns.md`
