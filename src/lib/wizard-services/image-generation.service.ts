/**
 * Image Generation Service
 *
 * Handles AI image generation via OpenRouter.
 * Supports multiple models: Gemini, OpenAI, Seedream, Flux.
 */

import { openrouter } from "@/lib/ai/config";
import type {
  AiImageModel,
  AiImageOptions,
  ImageGenerationInput,
  ImageGenerationResult,
  PromptGenerationInput,
  PromptGenerationResult,
  GeneratedImage,
  VideoThumbnailInput,
  NanoBananaThumbnailInput,
  NanoBananaThumbnailOutput,
  NanoBananaStyle,
} from "./image-types";
import type { ServiceResult } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default model for image generation
 */
export const DEFAULT_IMAGE_MODEL: AiImageModel = "google/gemini-3-pro-image-preview";

/**
 * Maximum retries for image generation
 */
const MAX_RETRIES = 2;

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * System prompt for generating image prompts
 * Translates user preferences into detailed AI image prompts
 * Version: v4.3 - Brand Integration
 */
const IMAGE_PROMPT_SYSTEM = `You are a senior visual designer specialized in AI image generation for social media content. Your expertise covers typography hierarchy, color theory, and conversion-focused design.

## CORE DIRECTIVE
Generate prompts that produce images with MANDATORY visible text elements (title + subtitle). The text must be the visual anchor of the composition.

## INPUT STRUCTURE

### Content Variables
- \`slideTitle\`: Primary headline (MUST appear prominently)
- \`slideContent\`: Supporting text/subtitle (MUST appear legibly)
- \`options.color\`: neutro | quente | frio | vibrante | pastel | personalizado
- \`options.style\`: minimalista | moderno | classico | playful | profissional | artístico
- \`options.composition\`: centralizado | grid | diagonal | assimétrico | dinâmico
- \`options.mood\`: calmo | energético | misterioso | inspirador | urgente
- \`options.customColor\`: hex code (when color === "personalizado")
- \`options.additionalContext\`: user notes

### User Brand Presets (when available, integrate into prompt)
- \`brand.voiceTone\`: communication style
- \`brand.brandVoice\`: unique personality
- \`brand.niches\`: market segments
- \`brand.targetAudience\`: demographics + psychographics
- \`brand.fearsAndPains\`: audience pain points (use for visual tension)
- \`brand.desiresAndAspirations\`: audience goals (use for visual aspiration)
- \`brand.differentials\`: unique value (highlight visually)
- \`brand.contentObjectives\`: content goals
- \`brand.preferredCTAs\`: call-to-action style
- \`brand.forbiddenTerms\`: words/concepts to NEVER include

### Context
- \`wizardContext.theme\`: overall theme
- \`wizardContext.niche\`: content niche
- \`wizardContext.targetAudience\`: audience description

## PROMPT CONSTRUCTION RULES

### 1. FORMAT SPECIFICATION (always first)
\`Instagram carousel slide, 1080x1350px, vertical 4:5 aspect ratio, high resolution, sharp details\`

### 2. TEXT HIERARCHY (mandatory - be explicit)
\`\`\`
PRIMARY TEXT: "[slideTitle]" - large, bold, high contrast, dominant position
SECONDARY TEXT: "[slideContent]" - smaller, complementary, legible placement
TYPOGRAPHY: Modern sans-serif, clean kerning, proper text rendering, readable at mobile size
TEXT TREATMENT: [based on style - embossed/flat/gradient/outlined/3D]
\`\`\`

### 3. VISUAL STYLE MAPPING

| Input Style | Prompt Descriptors |
|-------------|-------------------|
| minimalista | clean negative space, simple shapes, limited palette, elegant whitespace, subtle shadows |
| moderno | geometric patterns, bold gradients, contemporary aesthetics, sleek surfaces, tech-forward |
| classico | refined elegance, traditional composition, timeless typography, sophisticated details |
| playful | rounded shapes, bouncy elements, fun illustrations, friendly vibe, organic curves |
| profissional | corporate polish, structured layout, business aesthetic, credibility signals |
| artístico | creative textures, artistic flair, unique visual language, expressive elements |

### 4. COLOR MAPPING

| Input Color | Prompt Descriptors |
|-------------|-------------------|
| neutro | grayscale palette, soft grays, muted tones, black and white accents |
| quente | warm oranges, rich reds, golden yellows, sunset tones, cozy warmth |
| frio | cool blues, teals, silver accents, icy whites, professional coldness |
| vibrante | electric neons, saturated hues, high contrast colors, bold color blocks |
| pastel | soft muted tones, gentle gradients, calming palette, dreamy colors |
| personalizado | dominant use of [customColor] with complementary accents |

### 5. COMPOSITION MAPPING

| Input Comp | Prompt Descriptors |
|------------|-------------------|
| centralizado | centered focal point, symmetrical balance, text at center |
| grid | structured grid layout, organized sections, modular design |
| diagonal | dynamic diagonal lines, angled elements, movement flow |
| assimétrico | intentional asymmetry, visual tension, creative balance |
| dinâmico | kinetic energy, movement suggestion, active composition |

### 6. MOOD MAPPING

| Input Mood | Prompt Descriptors |
|------------|-------------------|
| calmo | serene atmosphere, peaceful vibe, gentle gradients, soft lighting |
| energético | high energy, vibrant motion, dynamic elements, bold contrasts |
| misterioso | dramatic shadows, intrigue elements, deep tones, enigmatic |
| inspirador | uplifting atmosphere, aspirational imagery, bright highlights |
| urgente | attention-grabbing, high contrast, action-oriented, bold statements |

## OUTPUT FORMAT (JSON only, no markdown wrapping)
\`\`\`json
{
  "prompt": "[complete prompt following all rules above, max 900 chars]",
  "negative_prompt": "blurry text, illegible typography, misspelled words, cut-off text, distorted letters, watermark, signature, low quality, pixelated, text outside frame, overlapping unreadable text, wrong aspect ratio, horizontal format, [brand.forbiddenTerms if available]",
  "style_guidance": "[1-2 sentence explanation for user]"
}
\`\`\`

## CRITICAL RULES

1. **TEXT IS NON-NEGOTIABLE**: Every prompt MUST explicitly instruct clear, readable title and subtitle rendering
2. **MOBILE-FIRST**: Design for small screen legibility
3. **BRAND ALIGNMENT**: When brand presets exist, weave them into visual language
4. **FORBIDDEN TERMS**: Never include concepts from \`brand.forbiddenTerms\` in any form
5. **CONTRAST**: Always ensure text has sufficient contrast against background
6. **SINGLE IMAGE**: No collages, no multiple frames - one cohesive design
7. **NO STOCK LOOK**: Avoid generic corporate imagery, prioritize unique visual identity`;

/**
 * Generates an optimized prompt for AI image generation based on user options
 */
export async function generateImagePrompt(
  input: PromptGenerationInput
): Promise<PromptGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { slideContent, slideTitle, options, wizardContext, brand } = input;

    // Build context for prompt generation
    const contextParts: string[] = [];

    if (slideTitle) {
      contextParts.push(`Title: "${slideTitle}"`);
    }
    contextParts.push(`Content: "${slideContent}"`);

    if (wizardContext?.theme) {
      contextParts.push(`Theme: ${wizardContext.theme}`);
    }
    if (wizardContext?.niche) {
      contextParts.push(`Niche: ${wizardContext.niche}`);
    }
    if (wizardContext?.targetAudience) {
      contextParts.push(`Target Audience: ${wizardContext.targetAudience}`);
    }

    // Build user preferences
    const preferencesParts: string[] = [];
    preferencesParts.push(`Color: ${options.color}`);
    preferencesParts.push(`Style: ${options.style}`);
    if (options.composition) {
      preferencesParts.push(`Composition: ${options.composition}`);
    }
    if (options.mood) {
      preferencesParts.push(`Mood: ${options.mood}`);
    }
    if (options.customColor) {
      preferencesParts.push(`Custom Color: ${options.customColor}`);
    }
    if (options.additionalContext) {
      preferencesParts.push(`Additional: ${options.additionalContext}`);
    }

    // Build brand context (v4.3 integration)
    let brandContext = "";
    if (brand) {
      const brandParts: string[] = [];
      if (brand.voiceTone) brandParts.push(`Voice Tone: ${brand.voiceTone}`);
      if (brand.brandVoice) brandParts.push(`Brand Voice: ${brand.brandVoice}`);
      if (brand.niches) brandParts.push(`Niches: ${brand.niches}`);
      if (brand.targetAudience) brandParts.push(`Target Audience: ${brand.targetAudience}`);
      if (brand.fearsAndPains) brandParts.push(`Audience Pain Points: ${brand.fearsAndPains}`);
      if (brand.desiresAndAspirations) brandParts.push(`Audience Aspirations: ${brand.desiresAndAspirations}`);
      if (brand.differentials) brandParts.push(`Differentials: ${brand.differentials}`);
      if (brand.contentObjectives) brandParts.push(`Content Objectives: ${brand.contentObjectives}`);
      if (brand.preferredCTAs) brandParts.push(`Preferred CTAs: ${brand.preferredCTAs}`);
      if (brand.forbiddenTerms) brandParts.push(`Forbidden Terms: ${brand.forbiddenTerms}`);

      if (brandParts.length > 0) {
        brandContext = `\n\nUser Brand Presets:\n${brandParts.join("\n")}`;
      }
    }

    const userMessage = `Generate an AI image prompt for:

${contextParts.join("\n")}

User Preferences:
${preferencesParts.join("\n")}${brandContext}

Respond with JSON only: { prompt, negative_prompt, style_guidance }`;

    // Use a lightweight text model for prompt generation
    const promptModel = process.env.WIZARD_DEFAULT_MODEL || "openai/gpt-4.1-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: promptModel,
        messages: [
          { role: "system", content: IMAGE_PROMPT_SYSTEM },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      }),
      // AbortSignal removed - see callImageModel for details
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[IMAGE-GEN] Prompt generation failed:", response.status, errorText);
      return {
        success: false,
        error: `Failed to generate prompt: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in prompt generation response",
      };
    }

    const parsed = JSON.parse(content);

    return {
      success: true,
      data: {
        prompt: parsed.prompt || "",
        negativePrompt: parsed.negative_prompt || "",
        styleGuidance: parsed.style_guidance || "",
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Prompt generation timed out",
      };
    }
    console.error("[IMAGE-GEN] Error generating image prompt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generates an image using OpenRouter's image models
 */
export async function generateAiImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { slideNumber, slideContent, slideTitle, wizardContext, config } = input;

    if (!config.aiOptions) {
      return {
        success: false,
        error: "AI options not provided in config",
      };
    }

    // Step 1: Generate the optimized prompt
    console.log(`[IMAGE-GEN] Generating prompt for slide ${slideNumber}...`);

    const promptResult = await generateImagePrompt({
      slideContent,
      slideTitle,
      options: config.aiOptions,
      wizardContext,
    });

    if (!promptResult.success || !promptResult.data) {
      return {
        success: false,
        error: `Failed to generate prompt: ${promptResult.error}`,
      };
    }

    const { prompt, negativePrompt } = promptResult.data;
    console.log(`[IMAGE-GEN] Generated prompt:`, prompt.substring(0, 200) + "...");

    // Step 2: Call the image model
    console.log(`[IMAGE-GEN] Calling model ${config.aiOptions.model}...`);

    const model = config.aiOptions.model;
    const imageData = await callImageModel(model, prompt, negativePrompt);

    if (!imageData) {
      return {
        success: false,
        error: "Failed to generate image",
      };
    }

    // Step 3: Return the result
    const result: GeneratedImage = {
      id: `img-${Date.now()}-${slideNumber}`,
      slideNumber,
      method: "ai",
      model,
      imageUrl: imageData.url,
      thumbnailUrl: imageData.thumbnailUrl,
      config,
      promptUsed: prompt,
      createdAt: new Date(),
    };

    console.log(`[IMAGE-GEN] Image generated successfully: ${imageData.url}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[IMAGE-GEN] Error generating AI image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// VIDEO THUMBNAIL GENERATION (v4.0)
// ============================================================================

/**
 * System prompt for generating VIDEO THUMBNAIL prompts
 * Optimized for 16:9 horizontal format with thumbnail-specific best practices
 */
const VIDEO_THUMBNAIL_SYSTEM = `You are a YouTube thumbnail expert specialized in creating high-CTR (Click-Through Rate) thumbnails that drive views while maintaining authenticity.

## CORE DIRECTIVE
Generate prompts for horizontal 16:9 video thumbnails that CREATE CURIOSITY and stop the scroll. The thumbnail must be visually striking but not clickbait.

## INPUT STRUCTURE

### Content Variables
- \`thumbnailTitle\`: Short title from video script (4-8 words)
- \`narrativeTitle\`: Additional context from narrative (optional)
- \`options.color\`: neutro | quente | frio | vibrante | pastel | escuro | claro | neon | terroso | monocromático | personalizado
- \`options.style\`: minimalista | moderno | vintage | abstrato | realista | cartoon | aquarela | cyberpunk | grunge | elegante | lúdico | profissional
- \`options.composition\`: centralizado | terços | simétrico | assimétrico | dinâmico | minimal
- \`options.mood\`: energético | calmo | misterioso | alegre | sério | dramático | romântico | lúdico | profissional
- \`options.customColor\`: hex code (when color === "personalizado")

### Context
- \`wizardContext.theme\`: overall theme
- \`wizardContext.niche\`: content niche
- \`wizardContext.objective\`: video objective
- \`wizardContext.targetAudience\`: audience description

## THUMBNAIL-SPECIFIC RULES

### 1. FORMAT SPECIFICATION (always first)
\`YouTube thumbnail, 1920x1080px, horizontal 16:9 aspect ratio, high resolution, sharp details\`

### 2. TEXT VISIBILITY CRITICAL
\`\`\`
THUMBNAIL TEXT: "[thumbnailTitle]" - MUST be readable at 200px width
TEXT PLACEMENT: Center or upper-third (never edges that get cut off)
TYPOGRAPHY: Bold, thick, high-contrast font (no thin/light fonts)
TEXT TREATMENT: Text stroke, outline, or shadow for visibility against any background
COLOR: White or bright yellow text on dark background, or black text on bright background
MAXIMUM WORDS: 4-6 words maximum (truncate title if longer)
\`\`\`

### 3. THUMBNAIL COMPOSITION
- **Subject**: Single clear focal point (person face, object, or scene)
- **Expression**: Emotional expression matching the mood (surprise, shock, smile, serious)
- **Background**: Simple, non-distracting background (solid color, gradient, or blurred)
- **Colors**: High contrast, vibrant, eye-catching but not overwhelming
- **Rule of Thirds**: Place subject off-center for more dynamic composition

### 4. VISUAL STYLE MAPPING (Thumbnail-Optimized)

| Input Style | Thumbnail Prompt Descriptors |
|-------------|----------------------------|
| minimalista | clean solid background, bold text, single focal point, white space, simple |
| moderno | vibrant gradient background, bold typography, clean lines, contemporary |
| vintage | film grain overlay, muted tones, retro typography, nostalgic feel |
| abstrato | geometric shapes, bold colors, artistic interpretation, eye-catching patterns |
| realista | photo-realistic, natural lighting, authentic expression, credible appearance |
| cartoon | colorful illustration style, friendly characters, approachable, fun vibe |
| aquarela | soft watercolor background, artistic text overlay, gentle feel |
| cyberpunk | neon colors, dark background, futuristic elements, high-tech aesthetic |
| grunge | textured background, bold distressed text, raw feeling, edgy |
| elegante | sophisticated color palette, refined typography, premium feel |
| lúdico | playful colors, fun elements, approachable, friendly vibe |
| profissional | clean business aesthetic, trustworthy colors, credible appearance |

### 5. COLOR MAPPING (Thumbnail-Optimized)

| Input Color | Thumbnail Prompt Descriptors |
|-------------|----------------------------|
| neutro | black and white with accent color, professional, clean |
| quente | oranges and reds, energetic, warm lighting, inviting |
| frio | blues and teals, professional, calm, trustworthy |
| vibrante | saturated colors, high contrast, eye-catching, bold |
| pastel | soft colors, friendly, approachable, gentle feel |
| escuro | dark background with bright text, dramatic, mysterious |
| claro | white or light background with dark text, clean, fresh |
| neon | glowing colors, dark background, cyberpunk aesthetic |
| terroso | browns and greens, natural, grounded, authentic |
| monocromático | single color palette, bold, unified look |
| personalizado | dominant use of [customColor] with complementary accents |

### 6. MOOD MAPPING (Thumbnail-Specific)

| Input Mood | Thumbnail Expression & Atmosphere |
|------------|---------------------------------|
| energético | big smile, bright colors, dynamic pose, excitement |
| calmo | serene expression, soft colors, peaceful background |
| misterioso | dramatic lighting, shadows, intrigued expression, dark tones |
| alegre | happy expression, bright smile, vibrant colors, positive |
| sério | focused expression, professional lighting, credible appearance |
| dramático | intense expression, strong contrast, powerful atmosphere |
| romântico | soft lighting, gentle expression, warm colors |
| lúdico | playful expression, fun elements, colorful, approachable |
| profissional | confident expression, business attire, trustworthy appearance |

### 7. SUBJECT SUGGESTIONS
Based on niche and theme, suggest appropriate thumbnail subject:
- **Business/Finance**: Person in professional attire, money/wealth symbols, charts
- **Tech/Tutorials**: Laptop, code screen, tech device, person working
- **Lifestyle/Health**: Person in action, healthy food, exercise pose
- **Education**: Person teaching, whiteboard, books, learning environment
- **Entertainment**: Character illustration, scene from content, dramatic moment

## OUTPUT FORMAT (JSON only, no markdown wrapping)
\`\`\`json
{
  "prompt": "[complete thumbnail prompt following all rules above, optimized for 16:9 horizontal format, max 900 chars]",
  "negative_prompt": "blurry text, illegible typography, misspelled words, cut-off text at edges, distorted letters, watermark, signature, low quality, pixelated, text outside frame, overlapping unreadable text, vertical format, portrait orientation, too many elements, cluttered composition",
  "style_guidance": "[1-2 sentence explanation of thumbnail strategy for user]"
}
\`\`\`

## CRITICAL THUMBNAIL RULES

1. **HORIZONTAL FORMAT ONLY**: 16:9 landscape, never vertical/portrait
2. **TEXT MUST POP**: Bold, thick fonts with stroke/outline for visibility
3. **HIGH CONTRAST**: Background and text must have strong contrast
4. **STOP THE SCROLL**: Eye-catching colors, emotional expression, curiosity gap
5. **SIMPLE SUBJECT**: One clear focal point, not cluttered with multiple elements
6. **SAFE ZONE**: Keep text centered, avoid edges that get cut off on YouTube
7. **READABILITY**: Must be legible at 200px width (small thumbnail preview)
8. **AUTHENTICITY**: Professional but not clickbait, credible appearance`;

// ============================================================================
// NANO BANANA THUMBNAIL GENERATION (v4.3)
// ============================================================================

/**
 * System prompt for generating VIDEO THUMBNAIL prompts using Nano Banana format
 * Version: v4.3 - High-CTR optimized with 5-line structured format
 * Reference: @temporario/prp.md
 */
const NANO_BANANA_SYSTEM = `<system_prompt id="thumbnail-v4.3-nano-banana">
<identidade>
Você é um especialista em thumbnails de YouTube de ALTO CTR.

Seu trabalho é gerar prompts no formato NANO BANANA para criar thumbnails que:
- CRIAM CURIOSIDADE sem ser clickbait
- SÃO legíveis em 200px de largura
- TÊM texto com ALTO CONTRASTE
- FUNCIONAM no formato 16:9 horizontal (1280x720 ou 1920x1080)
</identidade>

<regras_absolutas>
1. Texto: máximo 4-6 palavras, BOLD, legível em miniatura
2. Contraste: texto SEMPRE legível sobre o fundo
3. Composição: sujeito principal + texto + fundo simples
4. Safe zone: nada cortado nas bordas (margem 10%)
5. Formato: 16:9 horizontal SEMPRE
</regras_absolutas>

<formato_nano_banana>
Nano Banana usa estrutura específica de prompt:

[ESTILO] [SUJEITO] [AÇÃO/POSE] [EXPRESSÃO] [FUNDO] [ILUMINAÇÃO] [EXTRAS]

Exemplo:
"professional photography, brazilian man 30s, facing camera, confident smile, solid dark blue background, studio lighting, holding coffee mug, text overlay '5 REGRAS' in bold white"
</formato_nano_banana>

<prompt id="thumbnail-generator-v4.3">
<entradas>
<thumbnail_title>\${thumbnailTitle}</thumbnail_title>
<estilo>\${estilo || "profissional"}</estilo>
<tema>\${contextoTematico}</tema>
<expressao_sugerida>\${expressao || "confiante"}</expressao_sugerida>
<referencia_pessoa>\${referenciaImagem1 || null}</referencia_pessoa>
<referencia_estilo>\${referenciaImagem2 || null}</referencia_estilo>
</entradas>

<mapeamento_estilos>
| Estilo | Descritores Nano Banana | Cores | Fundo |
|--------|------------------------|-------|-------|
| profissional | professional photography, clean, business | navy, white, gold | solid dark, gradient |
| minimalista | minimal, clean, simple | black, white, accent | solid single color |
| moderno | contemporary, vibrant, bold | bright gradients | gradient, geometric |
| energético | dynamic, high contrast, punchy | orange, yellow, red | energetic gradient |
| educacional | friendly, approachable, clear | blue, green, white | soft solid |
| provocativo | bold, dramatic, intense | red, black, white | dark dramatic |
| inspirador | warm, uplifting, hopeful | gold, orange, cream | warm gradient |
| tech | futuristic, sleek, modern | cyan, purple, dark | dark with glow |
</mapeamento_estilos>

<estrutura_prompt_nano_banana>
Gere o prompt seguindo EXATAMENTE esta estrutura:

═══════════════════════════════════════════════════
LINHA 1 — FORMATO E ESTILO BASE
"YouTube thumbnail, 1280x720, 16:9 horizontal, [estilo_base]"

LINHA 2 — SUJEITO PRINCIPAL
"[descrição pessoa/objeto], [pose], [expressão], [vestuário]"

LINHA 3 — TEXTO OVERLAY
"bold text overlay '[TEXTO]' in [cor] [tipografia], [posição], high contrast, readable at small size"

LINHA 4 — FUNDO
"[tipo fundo] background, [cores], [elementos extras se houver]"

LINHA 5 — ILUMINAÇÃO E MOOD
"[tipo iluminação], [atmosfera], [extras visuais]"
═══════════════════════════════════════════════════
</estrutura_prompt_nano_banana>

<regras_texto_thumbnail>
TEXTO: "\${thumbnailTitle}"

Regras para texto na thumbnail:
1. Máximo 6 palavras (ideal: 3-4)
2. SEMPRE em CAPS para impacto
3. Fonte: Bold sans-serif (nunca thin/script)
4. Cor: Alto contraste com fundo
   - Fundo escuro → texto branco/amarelo
   - Fundo claro → texto preto/azul escuro
5. Posição: centro ou terço superior
6. Tratamento: outline ou shadow para legibilidade
</regras_texto_thumbnail>

<mapeamento_expressoes>
| Tema do Conteúdo | Expressão Sugerida |
|------------------|-------------------|
| Erro/Problema | surpreso, preocupado |
| Dicas/Tutorial | confiante, amigável |
| Revelação | chocado, boca aberta |
| Motivação | determinado, inspirado |
| Polêmico | sério, olhar direto |
| Divertido | sorrindo, alegre |
| Educacional | pensativo, explicativo |
</mapeamento_expressoes>

<checklist_qualidade>
Antes de finalizar, verifique:

□ Texto tem no máximo 6 palavras?
□ Texto está em CAPS?
□ Alto contraste entre texto e fundo?
□ Posição do texto em zona segura?
□ Expressão facial combina com tema?
□ Fundo não compete com texto?
□ Formato é 16:9 horizontal?
□ Legível em 200px de largura?
</checklist_qualidade>

═══════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════

Retorne APENAS JSON válido:

{
  "prompt": "[prompt completo no formato Nano Banana, 5 linhas estruturadas]",

  "negative_prompt": "blurry text, illegible typography, misspelled words, text cut off at edges, distorted letters, watermark, low quality, pixelated, vertical format, portrait orientation, cluttered composition, too many elements, generic stock photo, text outside safe zone",

  "especificacoes": {
    "texto": "[texto exato que aparece na thumbnail]",
    "cor_texto": "[cor do texto em hex]",
    "cor_fundo": "[cor principal do fundo em hex]",
    "posicao_texto": "centro|terco_superior|terco_inferior",
    "expressao": "[expressão facial]"
  },

  "variacoes": [
    "Variação 1: [descrição curta de alternativa]",
    "Variação 2: [descrição curta de alternativa]"
  ]
}

═══════════════════════════════════════════════════════════════
REGRAS CRÍTICAS v4.3
═══════════════════════════════════════════════════════════════

✅ OBRIGATÓRIO:
1. Formato Nano Banana com 5 linhas estruturadas
2. Texto em CAPS, máximo 6 palavras
3. Alto contraste texto/fundo especificado
4. Cores em hexadecimal
5. Expressão facial definida
6. Formato 16:9 horizontal sempre

❌ PROIBIDO:
- Texto com mais de 6 palavras
- Fontes finas ou script
- Fundo que compete com texto
- Formato vertical
- Elementos nas bordas (fora safe zone)
- Composição poluída

RETORNE APENAS O JSON.
</prompt>
</system_prompt>`;

/**
 * Generates an optimized prompt for VIDEO THUMBNAIL image generation (legacy v4.0)
 * Reuses the prompt generation infrastructure but with thumbnail-specific system prompt
 */
async function generateVideoThumbnailPrompt(
  input: Omit<PromptGenerationInput, "slideContent" | "slideTitle"> & {
    thumbnailTitle: string;
    narrativeTitle?: string;
  }
): Promise<PromptGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { thumbnailTitle, narrativeTitle, options, wizardContext, brand } = input;

    // Build context for prompt generation
    const contextParts: string[] = [];
    contextParts.push(`Thumbnail Title: "${thumbnailTitle}"`);

    if (narrativeTitle) {
      contextParts.push(`Narrative: "${narrativeTitle}"`);
    }

    if (wizardContext?.theme) {
      contextParts.push(`Theme: ${wizardContext.theme}`);
    }
    if (wizardContext?.niche) {
      contextParts.push(`Niche: ${wizardContext.niche}`);
    }
    if (wizardContext?.objective) {
      contextParts.push(`Objective: ${wizardContext.objective}`);
    }
    if (wizardContext?.targetAudience) {
      contextParts.push(`Target Audience: ${wizardContext.targetAudience}`);
    }

    // Build user preferences
    const preferencesParts: string[] = [];
    preferencesParts.push(`Color: ${options.color}`);
    preferencesParts.push(`Style: ${options.style}`);
    if (options.composition) {
      preferencesParts.push(`Composition: ${options.composition}`);
    }
    if (options.mood) {
      preferencesParts.push(`Mood: ${options.mood}`);
    }
    if (options.customColor) {
      preferencesParts.push(`Custom Color: ${options.customColor}`);
    }
    if (options.additionalContext) {
      preferencesParts.push(`Additional: ${options.additionalContext}`);
    }

    // Build brand context
    let brandContext = "";
    if (brand) {
      const brandParts: string[] = [];
      if (brand.voiceTone) brandParts.push(`Voice Tone: ${brand.voiceTone}`);
      if (brand.brandVoice) brandParts.push(`Brand Voice: ${brand.brandVoice}`);
      if (brand.fearsAndPains) brandParts.push(`Audience Pain Points: ${brand.fearsAndPains}`);
      if (brand.desiresAndAspirations) brandParts.push(`Audience Aspirations: ${brand.desiresAndAspirations}`);
      if (brand.forbiddenTerms) brandParts.push(`Forbidden Terms: ${brand.forbiddenTerms}`);

      if (brandParts.length > 0) {
        brandContext = `\n\nUser Brand Presets:\n${brandParts.join("\n")}`;
      }
    }

    const userMessage = `Generate a VIDEO THUMBNAIL prompt for:

${contextParts.join("\n")}

User Preferences:
${preferencesParts.join("\n")}${brandContext}

Respond with JSON only: { prompt, negative_prompt, style_guidance }`;

    // Use a lightweight text model for prompt generation
    const promptModel = process.env.WIZARD_DEFAULT_MODEL || "openai/gpt-4.1-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: promptModel,
        messages: [
          { role: "system", content: VIDEO_THUMBNAIL_SYSTEM },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[THUMBNAIL-GEN] Prompt generation failed:", response.status, errorText);
      return {
        success: false,
        error: `Failed to generate thumbnail prompt: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in thumbnail prompt generation response",
      };
    }

    const parsed = JSON.parse(content);

    return {
      success: true,
      data: {
        prompt: parsed.prompt || "",
        negativePrompt: parsed.negative_prompt || "",
        styleGuidance: parsed.style_guidance || "",
      },
    };
  } catch (error) {
    console.error("[THUMBNAIL-GEN] Error generating thumbnail prompt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// NANO BANANA THUMBNAIL GENERATION (v4.3)
// ============================================================================

/**
 * Generates an optimized prompt for VIDEO THUMBNAIL using Nano Banana format (v4.3)
 * Uses the NANO_BANANA_SYSTEM prompt for structured, high-CTR thumbnail generation
 *
 * @param input - NanoBananaThumbnailInput with thumbnail details and references
 * @returns ServiceResult with NanoBananaThumbnailOutput containing structured prompt
 */
export async function generateVideoThumbnailPromptNanoBanana(
  input: NanoBananaThumbnailInput
): Promise<ServiceResult<NanoBananaThumbnailOutput>> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { thumbnailTitle, estilo, contextoTematico, expressao, referenciaImagem1, referenciaImagem2, wizardContext } = input;

    // Build context for prompt generation
    const contextParts: string[] = [];
    contextParts.push(`Thumbnail Title: "${thumbnailTitle}"`);
    contextParts.push(`Estilo: ${estilo || "profissional"}`);
    contextParts.push(`Contexto Temático: ${contextoTematico}`);

    if (expressao) {
      contextParts.push(`Expressão Sugerida: ${expressao}`);
    }

    if (referenciaImagem1) {
      contextParts.push(`Referência Pessoa (URL): ${referenciaImagem1}`);
    }

    if (referenciaImagem2) {
      contextParts.push(`Referência Estilo (URL): ${referenciaImagem2}`);
    }

    // Add wizard context
    if (wizardContext?.theme) {
      contextParts.push(`Theme: ${wizardContext.theme}`);
    }
    if (wizardContext?.niche) {
      contextParts.push(`Niche: ${wizardContext.niche}`);
    }
    if (wizardContext?.objective) {
      contextParts.push(`Objective: ${wizardContext.objective}`);
    }
    if (wizardContext?.targetAudience) {
      contextParts.push(`Target Audience: ${wizardContext.targetAudience}`);
    }

    const userMessage = `Generate a VIDEO THUMBNAIL prompt using Nano Banana format:

${contextParts.join("\n")}

Respond with JSON only following the Nano Banana output format.`;

    // Use a lightweight text model for prompt generation
    const promptModel = process.env.WIZARD_DEFAULT_MODEL || "openai/gpt-4.1-mini";

    console.log(`[NANO-BANANA] Generating thumbnail prompt with estilo="${estilo || "profissional"}"...`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
      },
      body: JSON.stringify({
        model: promptModel,
        messages: [
          { role: "system", content: NANO_BANANA_SYSTEM },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NANO-BANANA] Prompt generation failed:", response.status, errorText);
      return {
        success: false,
        error: `Failed to generate Nano Banana thumbnail prompt: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in Nano Banana thumbnail prompt generation response",
      };
    }

    const parsed = JSON.parse(content);

    // Validate the response structure
    if (!parsed.prompt || !parsed.especificacoes) {
      console.error("[NANO-BANANA] Invalid response structure:", parsed);
      return {
        success: false,
        error: "Invalid Nano Banana response structure",
      };
    }

    console.log(`[NANO-BANANA] ✅ Prompt generated successfully`);
    console.log(`[NANO-BANANA] Texto: "${parsed.especificacoes.texto}"`);
    console.log(`[NANO-BANANA] Cores: texto=${parsed.especificacoes.cor_texto}, fundo=${parsed.especificacoes.cor_fundo}`);

    return {
      success: true,
      data: {
        prompt: parsed.prompt,
        negative_prompt: parsed.negative_prompt || "",
        especificacoes: {
          texto: parsed.especificacoes.texto,
          cor_texto: parsed.especificacoes.cor_texto,
          cor_fundo: parsed.especificacoes.cor_fundo,
          posicao_texto: parsed.especificacoes.posicao_texto,
          expressao: parsed.especificacoes.expressao,
        },
        variacoes: parsed.variacoes || [],
      },
    };
  } catch (error) {
    console.error("[NANO-BANANA] Error generating thumbnail prompt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generates a video thumbnail using Nano Banana format (v4.3)
 * Uses the structured Nano Banana prompt generation with reference image support
 *
 * @param input - NanoBananaThumbnailInput with thumbnail details
 * @param model - Optional AI model to use (defaults to Gemini 3 Pro)
 * @returns ImageGenerationResult with generated thumbnail
 */
export async function generateVideoThumbnailNanoBanana(
  input: NanoBananaThumbnailInput,
  model: AiImageModel = DEFAULT_IMAGE_MODEL
): Promise<ImageGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    console.log(`[NANO-BANANA] Starting thumbnail generation...`);

    // Step 1: Generate the Nano Banana prompt
    const promptResult = await generateVideoThumbnailPromptNanoBanana(input);

    if (!promptResult.success || !promptResult.data) {
      return {
        success: false,
        error: `Failed to generate Nano Banana thumbnail prompt: ${promptResult.error}`,
      };
    }

    const { prompt, negative_prompt } = promptResult.data;
    console.log(`[NANO-BANANA] Generated prompt (${prompt.length} chars):`, prompt.substring(0, 200) + "...");

    // Step 2: Call the image model
    console.log(`[NANO-BANANA] Calling model ${model}...`);

    const imageData = await callImageModel(model, prompt, negative_prompt);

    if (!imageData) {
      return {
        success: false,
        error: "Failed to generate thumbnail image",
      };
    }

    // Step 3: Return the result
    const result: GeneratedImage = {
      id: `thumb-nb-${Date.now()}`,
      slideNumber: 0, // Thumbnails don't have slide numbers
      method: "ai",
      model,
      imageUrl: imageData.url,
      thumbnailUrl: imageData.thumbnailUrl,
      config: {
        method: "ai",
        aiOptions: {
          model,
          color: "personalizado", // Nano Banana uses specific hex colors
          style: "profissional", // Will be overridden by Nano Banana estilo
        },
      },
      promptUsed: prompt,
      createdAt: new Date(),
    };

    console.log(`[NANO-BANANA] ✅ Thumbnail generated successfully: ${imageData.url}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[NANO-BANANA] Error generating video thumbnail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generates a video thumbnail using OpenRouter's image models (legacy v4.0)
 * Reuses the existing AI image generation pipeline with thumbnail-specific prompts
 */
export async function generateVideoThumbnail(
  input: VideoThumbnailInput
): Promise<ImageGenerationResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const { thumbnailTitle, narrativeTitle, thumbnailConfig, wizardContext } = input;

    if (!thumbnailConfig.aiOptions) {
      return {
        success: false,
        error: "AI options not provided in thumbnailConfig",
      };
    }

    console.log(`[THUMBNAIL-GEN] Generating prompt for video thumbnail...`);

    // Step 1: Generate the optimized thumbnail prompt
    const promptResult = await generateVideoThumbnailPrompt({
      thumbnailTitle,
      narrativeTitle,
      options: thumbnailConfig.aiOptions,
      wizardContext,
    });

    if (!promptResult.success || !promptResult.data) {
      return {
        success: false,
        error: `Failed to generate thumbnail prompt: ${promptResult.error}`,
      };
    }

    const { prompt, negativePrompt } = promptResult.data;
    console.log(`[THUMBNAIL-GEN] Generated prompt:`, prompt.substring(0, 200) + "...");

    // Step 2: Call the image model (reuse existing infrastructure)
    console.log(`[THUMBNAIL-GEN] Calling model ${thumbnailConfig.aiOptions.model}...`);

    const model = thumbnailConfig.aiOptions.model;
    const imageData = await callImageModel(model, prompt, negativePrompt);

    if (!imageData) {
      return {
        success: false,
        error: "Failed to generate thumbnail image",
      };
    }

    // Step 3: Return the result
    const result: GeneratedImage = {
      id: `thumb-${Date.now()}`,
      slideNumber: 0, // Thumbnails don't have slide numbers
      method: "ai",
      model,
      imageUrl: imageData.url,
      thumbnailUrl: imageData.thumbnailUrl,
      config: thumbnailConfig,
      promptUsed: prompt,
      createdAt: new Date(),
    };

    console.log(`[THUMBNAIL-GEN] Thumbnail generated successfully: ${imageData.url}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[THUMBNAIL-GEN] Error generating video thumbnail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calls a specific image model via OpenRouter
 *
 * IMPORTANT: OpenRouter now requires the `modalities` parameter to be set
 * to ["image", "text"] for image generation models to work correctly.
 *
 * Reference: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
async function callImageModel(
  model: AiImageModel,
  prompt: string,
  negativePrompt?: string
): Promise<{ url: string; thumbnailUrl?: string } | null> {
  // Build the prompt with negative prompt if provided
  const fullPrompt = negativePrompt
    ? `${prompt}\n\nAvoid: ${negativePrompt}`
    : prompt;

  console.log(`[IMAGE-GEN] Calling model ${model} with modalities: ["image", "text"]`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Máquina de Conteúdo",
    },
    body: JSON.stringify({
      model,
      // REQUIRED: Tell OpenRouter we want both image and text output
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      max_tokens: 1000,
    }),
    // TEMPORARILY DISABLED: AbortSignal.timeout(REQUEST_TIMEOUT),
    // The timeout was causing issues with large base64 responses
    // TODO: Re-enable with custom timeout handling that doesn't interfere with response body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[IMAGE-GEN] ❌ Model ${model} failed:`, response.status, errorText);
    return null;
  }

  console.log(`[IMAGE-GEN] ✅ Response OK, reading response body...`);

  let data: unknown;
  try {
    // Add timeout wrapper for response.text() - Gemini can return 500KB-1MB base64
    const STREAM_TIMEOUT = 60000; // 60 seconds timeout for reading

    const responseTextPromise = response.text();

    // Add timeout protection
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error(`Response read timeout after ${STREAM_TIMEOUT}ms`)), STREAM_TIMEOUT);
    });

    console.log(`[IMAGE-GEN] 🔄 Reading response text (with ${STREAM_TIMEOUT/1000}s timeout)...`);

    const responseText = await Promise.race([responseTextPromise, timeoutPromise]) as string;

    console.log(`[IMAGE-GEN] ✅ Response text received (${responseText.length} chars, ${Math.round(responseText.length / 1024)}KB)`);

    // Parse JSON with error handling
    console.log(`[IMAGE-GEN] 🔄 Parsing JSON...`);
    data = JSON.parse(responseText);
    console.log(`[IMAGE-GEN] ✅ JSON parsed successfully`);
  } catch (parseError) {
    console.error(`[IMAGE-GEN] ❌ Failed to process response:`, parseError);
    if (parseError instanceof Error) {
      console.error(`[IMAGE-GEN] ❌ Error message:`, parseError.message);
      console.error(`[IMAGE-GEN] ❌ Error name:`, parseError.name);
    }
    return null;
  }

  // Extract image URL from response
  // The structure varies by model, so we need to handle different formats
  const imageUrl = extractImageUrl(data, model);

  if (!imageUrl) {
    console.error("[IMAGE-GEN] ❌ No image URL found!");
    console.error("[IMAGE-GEN] ❌ Response structure not recognized by extractImageUrl()");

    // Log response structure safely (even if very large)
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const preview = dataStr.length > 5000 ? dataStr.substring(0, 5000) + `\n... (truncated, total ${dataStr.length} chars)` : dataStr;
      console.error("[IMAGE-GEN] ❌ Response preview:", preview);
    } catch (e) {
      console.error("[IMAGE-GEN] ❌ Could not stringify response:", typeof data, data);
    }

    return null;
  }

  console.log(`[IMAGE-GEN] ✅ URL extracted: ${imageUrl.substring(0, 100)}...`);
  return { url: imageUrl };
}

/**
 * Extracts the image URL from various model response formats
 *
 * OpenRouter image models can return the image URL in different formats:
 * 1. Direct URL in choices[0].message.content
 * 2. JSON in content with url/image field
 * 3. Array in data field with url
 * 4. Direct url field at root
 * 5. **GEMINI 3 PRO**: message.images[] array with inlineData.data (base64)
 *
 * When modalities: ["image", "text"] is used, the response typically includes:
 * - content: string (text description) OR
 * - content: array with image data OR
 * - url field directly in the message
 * - images: array with inlineData (Gemini 3 Pro specific)
 */
function extractImageUrl(response: unknown, model: AiImageModel): string | null {
  const data = response as Record<string, unknown>;

  console.log(`[IMAGE-GEN] 🔍 Extracting URL from response`, {
    model,
    keys: Object.keys(data),
    hasChoices: Array.isArray(data.choices),
    hasData: !!data.data,
  });

  const buildDataUrl = (base64: string, mimeType?: string): string => {
    const safeMimeType = mimeType && typeof mimeType === "string" ? mimeType : "image/png";
    return `data:${safeMimeType};base64,${base64}`;
  };

  // Se há choices, mostrar estrutura do primeiro choice
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const firstChoice = data.choices[0] as Record<string, unknown>;
    console.log(`[IMAGE-GEN] 🔍 First choice structure:`, {
      keys: Object.keys(firstChoice),
      hasMessage: !!firstChoice.message,
      messageKeys: firstChoice.message ? Object.keys(firstChoice.message as Record<string, unknown>) : [],
    });
  }

  // Format 1: OpenRouter 2025 format - nested in choices.message.content
  // When modalities: ["image", "text"] is used, images may be in content array
  if (Array.isArray(data.choices)) {
    const firstChoice = data.choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    const content = message?.content;

    // Handle array content format (new multimodal format)
    if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "object" && item !== null) {
          const itemObj = item as Record<string, unknown>;
          // Check for image_url field (OpenAI-style format)
          if (itemObj.image_url && typeof itemObj.image_url === "object") {
            const imageUrl = (itemObj.image_url as Record<string, unknown>).url;
            if (typeof imageUrl === "string") {
              console.log(`[IMAGE-GEN] Found URL in content[].image_url.url`);
              return imageUrl;
            }
          }
          // Check for direct url field
          if (itemObj.url && typeof itemObj.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in content[].url`);
            return itemObj.url;
          }
          // Check for type: "image" with url
          if (itemObj.type === "image" && itemObj.url && typeof itemObj.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in content[] (type:image)`);
            return itemObj.url;
          }
        }
      }
    }

    // Handle string content format
    if (typeof content === "string") {
      // Direct URL
      if (content.startsWith("http://") || content.startsWith("https://")) {
        console.log(`[IMAGE-GEN] Found direct URL in content`);
        return content;
      }
      // Try parsing as JSON
      try {
        const parsed = JSON.parse(content);
        if (parsed.url && typeof parsed.url === "string") {
          console.log(`[IMAGE-GEN] Found URL in JSON content`);
          return parsed.url;
        }
        if (parsed.image && typeof parsed.image === "string") {
          console.log(`[IMAGE-GEN] Found image in JSON content`);
          return parsed.image;
        }
        // Check for images array in parsed content
        if (parsed.images && Array.isArray(parsed.images) && parsed.images[0]?.url) {
          console.log(`[IMAGE-GEN] Found URL in JSON images array`);
          return parsed.images[0].url;
        }
      } catch {
        // Not JSON, continue
      }
    }

    // Check for tool_calls (some models use this)
    if (Array.isArray(message?.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        const tc = toolCall as Record<string, unknown>;
        if (tc.output && typeof tc.output === "object") {
          const output = tc.output as Record<string, unknown>;
          if (output.url && typeof output.url === "string") {
            console.log(`[IMAGE-GEN] Found URL in tool_calls.output`);
            return output.url;
          }
        }
      }
    }

    // Format 1.5: Gemini 3 Pro format - images array in message
    // Gemini returns images in message.images array with base64 data
    if (Array.isArray(message?.images) && message.images.length > 0) {
      console.log(`[IMAGE-GEN] Found ${message.images.length} image(s) in message.images array`);

      const firstImage = message.images[0] as Record<string, unknown>;

      // Log the COMPLETE structure of the first image for debugging
      console.log(`[IMAGE-GEN] 🔍 First image FULL structure (JSON):`);
      try {
        const firstImageStr = JSON.stringify(firstImage, null, 2);
        // Log full structure if small enough, otherwise log preview
        if (firstImageStr.length > 10000) {
          console.log(`[IMAGE-GEN] First ${5000} chars:\n${firstImageStr.substring(0, 5000)}`);
          console.log(`[IMAGE-GEN] Last ${5000} chars:\n${firstImageStr.substring(firstImageStr.length - 5000)}`);
        } else {
          console.log(`[IMAGE-GEN] ${firstImageStr}`);
        }
      } catch (e) {
        console.log(`[IMAGE-GEN] Could not stringify firstImage:`, typeof firstImage, firstImage);
      }

      // Now try all possible extraction paths
      console.log(`[IMAGE-GEN] 🔍 Attempting all extraction paths...`);

      // Path 1: Check for inlineData.base64 (standard Gemini format)
      if (firstImage.inlineData && typeof firstImage.inlineData === "object") {
        const inlineData = firstImage.inlineData as Record<string, unknown>;
        console.log(`[IMAGE-GEN] ✅ Has inlineData object`);

        if (inlineData.data && typeof inlineData.data === "string") {
          console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].inlineData.data (${inlineData.data.length} chars)`);
          const mimeType = (inlineData.mimeType || firstImage.mimeType) as string | undefined;
          return buildDataUrl(inlineData.data, mimeType);
        }

        if (inlineData.base64 && typeof inlineData.base64 === "string") {
          console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].inlineData.base64 (${inlineData.base64.length} chars)`);
          const mimeType = (inlineData.mimeType || firstImage.mimeType) as string | undefined;
          return buildDataUrl(inlineData.base64, mimeType);
        }
      }

      // Path 2: Check for direct url field
      if (firstImage.url && typeof firstImage.url === "string") {
        console.log(`[IMAGE-GEN] ✅ Found URL in message.images[0].url`);
        return firstImage.url;
      }

      // Path 2.5: OpenRouter image_url wrapper (Gemini)
      if (firstImage.image_url && typeof firstImage.image_url === "object") {
        const imageUrlObject = firstImage.image_url as Record<string, unknown>;
        if (imageUrlObject.url && typeof imageUrlObject.url === "string") {
          console.log(`[IMAGE-GEN] ✅ Found URL in message.images[0].image_url.url`);
          return imageUrlObject.url;
        }
      }

      // Path 3: Check for direct data field (base64 string)
      if (firstImage.data && typeof firstImage.data === "string") {
        console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].data (${firstImage.data.length} chars)`);
        return buildDataUrl(firstImage.data, firstImage.mimeType as string | undefined);
      }

      // Path 4: Check for base64 field directly
      if (firstImage.base64 && typeof firstImage.base64 === "string") {
        console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].base64 (${firstImage.base64.length} chars)`);
        return buildDataUrl(firstImage.base64, firstImage.mimeType as string | undefined);
      }

      // Path 5: Check for image field (base64 or URL)
      if (firstImage.image && typeof firstImage.image === "string") {
        console.log(`[IMAGE-GEN] ✅ Found image in message.images[0].image (${firstImage.image.length} chars)`);
        // Check if it's already a data URL
        if (firstImage.image.startsWith("data:")) {
          return firstImage.image;
        }
        // Otherwise assume it's base64
        return buildDataUrl(firstImage.image, firstImage.mimeType as string | undefined);
      }

      // Path 6: Check for content field (sometimes used)
      if (firstImage.content && typeof firstImage.content === "string") {
        console.log(`[IMAGE-GEN] ✅ Found content in message.images[0].content (${firstImage.content.length} chars)`);
        if (firstImage.content.startsWith("data:")) {
          return firstImage.content;
        }
        return buildDataUrl(firstImage.content, firstImage.mimeType as string | undefined);
      }

      // Path 7: Gemini variants with nested image object
      if (firstImage.image && typeof firstImage.image === "object") {
        const imageObject = firstImage.image as Record<string, unknown>;
        const nestedMimeType = (imageObject.mimeType || imageObject.mime_type) as string | undefined;

        if (imageObject.url && typeof imageObject.url === "string") {
          console.log(`[IMAGE-GEN] ✅ Found URL in message.images[0].image.url`);
          return imageObject.url;
        }

        if (imageObject.data && typeof imageObject.data === "string") {
          console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].image.data (${imageObject.data.length} chars)`);
          return buildDataUrl(imageObject.data, nestedMimeType);
        }

        if (imageObject.base64 && typeof imageObject.base64 === "string") {
          console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].image.base64 (${imageObject.base64.length} chars)`);
          return buildDataUrl(imageObject.base64, nestedMimeType);
        }

        if (imageObject.bytes && typeof imageObject.bytes === "string") {
          console.log(`[IMAGE-GEN] ✅ Found base64 in message.images[0].image.bytes (${imageObject.bytes.length} chars)`);
          return buildDataUrl(imageObject.bytes, nestedMimeType);
        }
      }

      console.log(`[IMAGE-GEN] ❌ None of the extraction paths found an image`);
    }
  }

  // Format 2: Direct URL in data field (legacy format)
  if (typeof data.data === "string") {
    console.log(`[IMAGE-GEN] Found URL in data field (string)`);
    return data.data as string;
  }

  // Format 3: Array with url field in data
  if (Array.isArray(data.data)) {
    const firstItem = data.data[0] as Record<string, unknown> | undefined;
    if (firstItem?.url && typeof firstItem.url === "string") {
      console.log(`[IMAGE-GEN] Found URL in data[0].url`);
      return firstItem.url;
    }
    if (firstItem?.image && typeof firstItem.image === "string") {
      console.log(`[IMAGE-GEN] Found URL in data[0].image`);
      return firstItem.image;
    }
    // Check for b64_json base64 encoded image
    if (firstItem?.b64_json && typeof firstItem.b64_json === "string") {
      console.log(`[IMAGE-GEN] Found base64 image in data[0].b64_json`);
      // Convert base64 to data URL
      return `data:image/png;base64,${firstItem.b64_json}`;
    }
  }

  // Format 4: Direct url field at root
  if (data.url && typeof data.url === "string") {
    console.log(`[IMAGE-GEN] Found URL in root url field`);
    return data.url;
  }

  // Format 5: image field at root
  if (data.image && typeof data.image === "string") {
    console.log(`[IMAGE-GEN] Found URL in root image field`);
    return data.image;
  }

  console.log(`[IMAGE-GEN] No image URL found in response`);
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Checks if image generation service is available
 */
export function isImageGenerationAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Gets available AI image models
 */
export function getAvailableImageModels(): AiImageModel[] {
  return [
    "google/gemini-3-pro-image-preview",
    "openai/gpt-5-image",
    "bytedance-seed/seedream-4.5",
    "black-forest-labs/flux.2-max",
  ];
}

/**
 * Gets a user-friendly label for a model
 */
export function getModelLabel(model: AiImageModel): string {
  const labels: Record<AiImageModel, string> = {
    "google/gemini-3-pro-image-preview": "Gemini 3 Pro",
    "openai/gpt-5-image": "GPT-5 Image",
    "bytedance-seed/seedream-4.5": "Seedream 4.5",
    "black-forest-labs/flux.2-max": "Flux 2.0 Max",
  };
  return labels[model] || model;
}

/**
 * Validates image generation options
 */
export function validateImageOptions(options: AiImageOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.color === "personalizado" && !options.customColor) {
    errors.push("Custom color hex code is required when color is 'personalizado'");
  }

  if (options.customColor && !/^#[0-9A-Fa-f]{6}$/.test(options.customColor)) {
    errors.push("Custom color must be a valid hex code (e.g., #FF5733)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export types for external use
export type {
  PromptGenerationResult,
  ImageGenerationResult,
  GeneratedImage,
  NanoBananaThumbnailInput,
  NanoBananaThumbnailOutput,
  NanoBananaStyle,
};
