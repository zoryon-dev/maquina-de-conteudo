# AI Processing Patterns

Padrões de uso de IA no Máquina de Conteúdo.

> **Última atualização**: Janeiro 2026
> **Modelo Principal**: google/gemini-2.0-flash-exp:free (via OpenRouter)

## Visão Geral

O sistema utiliza IA em múltiplos pontos do fluxo:
1. **Theme Processing** - Melhora temas salvos antes de criar Wizard
2. **Narratives Generation** - Gera múltiplas narrativas a partir de um tema
3. **Content Generation** - Gera conteúdo final (carousel, imagem, vídeo)
4. **RAG Context** - Enriquece prompts com documentos do usuário
5. **Image Generation** - Gera imagens via AI ou HTML templates

## Localização dos Arquivos

```
src/lib/discovery-services/
├── perplexity/
│   └── theme-processor.service.ts     # Perplexity → Wizard
└── social/
    └── social-theme-processor.service.ts  # Instagram/YouTube → Wizard

src/lib/wizard-services/
├── llm.service.ts                     # Narrativas e conteúdo
├── rag.service.ts                     # Contexto RAG
├── synthesizer.service.ts             # Síntese de pesquisa
├── image-generation.service.ts        # Geração de imagens
└── prompts.ts                         # Prompts isolados
```

## 1. Theme Processing

### Propósito

Processar temas salvos do Discovery para melhorar o conteúdo antes de criar um Wizard.

### Serviços

| Serviço | Plataforma | Modelo | Output |
|---------|-----------|--------|--------|
| `ThemeProcessorService` | Perplexity | gemini-2.0-flash-exp | theme, context, objective, referenceUrl |
| `SocialThemeProcessorService` | Instagram | gemini-2.0-flash-exp | theme, context, objective, suggestedContentType |
| `SocialThemeProcessorService` | YouTube | gemini-2.0-flash-exp | theme, context, objective, suggestedContentType |

### ThemeProcessorService

**Localização**: `src/lib/discovery-services/perplexity/theme-processor.service.ts`

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

### Prompt do ThemeProcessor

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

### SocialThemeProcessorService

**Localização**: `src/lib/discovery-services/social/social-theme-processor.service.ts`

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

```typescript
private getSystemPrompt(platform: SocialPlatform): string {
  if (platform === 'instagram') {
    return `Você é um especialista em criar conteúdo viral para Instagram. Sua tarefa é processar informações de trending topics do Instagram e transformá-los em ideias de conteúdo engajantes.

Foque em:
- Conteúdo visual e impactante
- Hashtags relevantes
- Call-to-actions eficazes
- Formatos que performam bem (carrossel, reel, post)`;
  }

  return `Você é um especialista em criar conteúdo viral para YouTube e redes sociais. Sua tarefa é processar informações de trending topics do YouTube e transformá-las em ideias de conteúdo engajáveis.

Foque em:
- Conteúdo educativo e entretenimento
- Hooks que prendem a atenção
- Formatos curtos e dinâmicos (Shorts, vídeos)
- Hashtags relevantes`;
}
```

## 2. Narratives Generation

### Propósito

Gerar múltiplas narrativas (ângulos) a partir de um tema, permitindo o usuário escolher a melhor abordagem.

### Serviço

**Localização**: `src/lib/wizard-services/llm.service.ts`

```typescript
export async function generateNarratives(input: NarrativeInput): Promise<ServiceResult<Narrative[]>> {
  const ragContext = await generateWizardRagContext(input.ragConfig);
  const prompt = buildNarrativesPrompt(input, ragContext);

  const result = await generateObject({
    model: openrouter(input.model || 'openai/gpt-4.1'),
    schema: narrativesSchema,
    prompt,
    temperature: 0.7,
  });

  return { success: true, data: result.narratives };
}
```

### Schema de Narrativas

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

## 3. Content Generation

### Propósito

Gerar o conteúdo final baseado na narrativa selecionada pelo usuário.

### Serviço

**Localização**: `src/lib/wizard-services/llm.service.ts`

```typescript
export async function generateContent(input: ContentInput): Promise<ServiceResult<GeneratedContent>> {
  const ragContext = await generateWizardRagContext(input.ragConfig);
  const prompt = getContentPrompt(input.contentType, input, ragContext);

  const result = await generateObject({
    model: openrouter(input.model),
    schema: getSchemaForContentType(input.contentType),
    prompt,
    temperature: 0.8,
  });

  return { success: true, data: result };
}
```

### Prompts por Tipo

**Localização**: `src/lib/wizard-services/prompts.ts`

| Tipo | Versão | Características |
|------|--------|----------------|
| **Carousel** | v4.1 | Tags XML, Synthesizer v3.1, ProgressaoSugeridaV3 |
| **Image Post** | v2.0 | HCCA structure, técnicas de retenção |
| **Video Script** | v2.0 | 5 estruturas, otimização 3 segundos |
| **Text** | v1.0 | Thread/Tweet padrão |

## 4. RAG Context

### Propósito

Enriquecer prompts com documentos do usuário para geração de conteúdo mais relevante e personalizado.

### Serviço

**Localização**: `src/lib/wizard-services/rag.service.ts`

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

## 5. Image Generation

### Propósito

Gerar imagens para posts usando AI ou HTML templates.

### Serviço

**Localização**: `src/lib/wizard-services/image-generation.service.ts`

```typescript
export async function generateImageWithFallback(
  input: ImageGenerationInput
): Promise<ServiceResult<ImageGenerationResult>> {
  // 1. Tenta AI generation primeiro
  const aiResult = await generateAiImage(input);
  if (aiResult.success) return aiResult;

  // 2. Fallback para HTML template
  return await generateHtmlTemplateImage(input);
}
```

### Modelos de Imagem

```typescript
const AI_IMAGE_MODELS = {
  GEMINI_IMAGE: "google/gemini-3-pro-image-preview",
  OPENAI_IMAGE: "openai/gpt-5-image",
  SEEDREAM: "bytedance-seed/seedream-4.5",
  FLUX: "black-forest-labs/flux.2-max",
};
```

## Graceful Degradation

Todos os serviços de IA implementam graceful degradation:

```typescript
// Se API key não configurada, retorna fallback
if (!this.apiKey) {
  console.warn('[Service] API key not configured, using fallback');
  return this.fallbackProcessing(data);
}

// Se AI falhar, retorna resultado básico
try {
  return await this.processWithAI(data);
} catch (error) {
  console.error('[Service] AI processing failed:', error);
  return this.fallbackProcessing(data);
}
```

## Variáveis de Ambiente

```env
# OpenRouter (principal para LLM)
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

## Modelos de LLM Utilizados

| Serviço | Modelo Padão | Propósito |
|---------|--------------|-----------|
| Theme Processing | gemini-2.0-flash-exp:free | Processamento rápido |
| Narratives | gpt-4.1 | Criatividade |
| Content Generation | gpt-4.1 | Qualidade |
| Synthesizer | gemini-2.0-flash-exp:free | Velocidade |

## Prompt Engineering Patterns

### 1. Tags XML para Estruturação

```typescript
const prompt = `
<identidade>
Você é um especialista em conteúdo viral...
</identidade>

<filosofia_central>
O conteúdo deve seguir a estrutura HCCA...
</filosofia_central>

<framework_imagem>
...instruções específicas...
</framework_imagem>
`;
```

### 2. JSON Output Estrito

```typescript
`Por favor, retorne APENAS um JSON válido (sem markdown, sem blocos de código) com este formato exato:
{
  "theme": "...",
  "context": "...",
  ...
}`
```

### 3. Truncagem Inteligente

```typescript
const truncatedContent = content.length > 2500
  ? content.substring(0, 2500) + '...'
  : content;
```

## Retry Pattern

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

## Referências

- Discovery Patterns: `.serena/memories/discovery-patterns.md`
- Wizard Patterns: `.serena/memories/wizard-patterns.md`
- Vercel AI SDK Patterns: `.serena/memories/vercel-ai-sdk-patterns.md`
- RAG Patterns: `.serena/memories/rag-embedding-patterns.md`
