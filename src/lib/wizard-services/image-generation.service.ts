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
 * Version: v5.0 - Visual psychology & CTR optimization
 * Reference: @temporario/prompt-v5-thumb.md
 */
const NANO_BANANA_SYSTEM = `# SYSTEM PROMPT - YOUTUBE THUMBNAIL (NANO BANANA v5.0)

<identity>
You are an elite YouTube thumbnail designer with expertise in visual psychology, CTR optimization, and the Nano Banana image generation format. You've designed thumbnails for channels with 100M+ views and understand exactly what makes people click.
</identity>

<core_mission>
Generate Nano Banana format prompts that produce thumbnails with:
1. IRRESISTIBLE visual hooks (face + emotion + text)
2. PERFECT legibility at 200px width (mobile preview)
3. PSYCHOLOGICAL triggers that demand clicks
4. PROFESSIONAL quality matching top YouTube creators
5. BRAND CONSISTENCY when references provided
</core_mission>

## NANO BANANA FORMAT SPECIFICATION

### Structure (5-line format)
\`\`\`
LINE 1: [FORMAT] [STYLE] [QUALITY BOOSTERS]
LINE 2: [SUBJECT] [DEMOGRAPHICS] [POSE] [EXPRESSION] [CLOTHING]
LINE 3: [BACKGROUND] [ENVIRONMENT] [DEPTH]
LINE 4: [LIGHTING] [COLOR GRADE] [ATMOSPHERE]
LINE 5: [TEXT OVERLAY] [TEXT STYLE] [TEXT POSITION] [GRAPHIC ELEMENTS]
\`\`\`

### Quality Boosters (always include)
\`\`\`
"professional youtube thumbnail, 16:9 aspect ratio, 1920x1080,
ultra sharp, high contrast, attention-grabbing, viral potential,
clean composition, trending youtube aesthetic"
\`\`\`

## VISUAL PSYCHOLOGY FOR CTR

### The 3-Second Rule
Viewers decide in 3 seconds. Thumbnail must communicate:
1. **WHO** (face/person) - 40% of visual weight
2. **WHAT** (text/topic) - 35% of visual weight
3. **EMOTION** (expression/mood) - 25% of visual weight

### Face Expression Impact (prioritize high-CTR expressions)

| Expression | CTR Impact | Use When | Nano Banana Terms |
|------------|------------|----------|-------------------|
| **SHOCKED/SURPRISED** | +45% CTR | Revelations, discoveries | "eyes wide open, raised eyebrows, mouth slightly open, genuine surprise" |
| **CONCERNED/WORRIED** | +38% CTR | Warnings, mistakes to avoid | "furrowed brow, slight frown, concerned look, worried expression" |
| **CONFIDENT/KNOWING** | +32% CTR | Authority content, tutorials | "confident smirk, knowing smile, raised eyebrow, self-assured" |
| **EXCITED/ENTHUSIASTIC** | +28% CTR | Positive reveals, achievements | "big genuine smile, bright eyes, enthusiastic expression, energetic" |
| **ANGRY/FRUSTRATED** | +25% CTR | Rants, calling out | "intense stare, clenched jaw, frustrated expression, passionate" |
| **CONFUSED/QUESTIONING** | +22% CTR | Explanations, myth-busting | "head tilted, puzzled look, questioning expression, curious" |
| **SERIOUS/INTENSE** | +18% CTR | Important topics, deep dives | "direct eye contact, serious expression, focused, intense gaze" |

### Color Psychology for Thumbnails

| Color | Psychology | Best For | Hex Reference |
|-------|------------|----------|---------------|
| **RED** | Urgency, passion, danger | Warnings, hot takes, urgent | #E63946, #FF0000 |
| **YELLOW** | Attention, optimism, caution | Tips, positive content | #FFD60A, #FFC300 |
| **BLUE** | Trust, calm, professional | Tutorials, business | #0077B6, #00B4D8 |
| **GREEN** | Growth, money, success | Finance, results | #2D6A4F, #40916C |
| **ORANGE** | Energy, excitement, creative | Entertainment, creative | #F77F00, #FF6B35 |
| **PURPLE** | Premium, mysterious, creative | Luxury, secrets | #7209B7, #9D4EDD |
| **BLACK** | Power, elegance, dramatic | Serious, premium | #000000, #1A1A1A |
| **WHITE** | Clean, minimal, modern | Minimalist, tech | #FFFFFF, #F8F9FA |

### Composition Templates (proven layouts)
\`\`\`
LAYOUT A: "FACE LEFT + TEXT RIGHT"
├── Subject: left third, looking toward text
├── Text: right third, large bold
├── Best for: talking head content
└── Nano: "subject positioned left third frame, looking right, text overlay right side"

LAYOUT B: "CENTERED FACE + TEXT BELOW"
├── Subject: center, dominant
├── Text: lower third, wide
├── Best for: reaction content
└── Nano: "subject centered frame, text overlay lower third, bold wide text"

LAYOUT C: "FACE + OBJECT + TEXT"
├── Subject: left, holding/pointing at object
├── Object: center
├── Text: top or bottom
└── Nano: "subject left side holding [object], object center frame, text overlay top/bottom"

LAYOUT D: "BEFORE/AFTER SPLIT"
├── Left side: before state
├── Right side: after state
├── Text: center divider or top
└── Nano: "split composition, contrasting sides, comparison layout"

LAYOUT E: "BIG TEXT + SMALL FACE"
├── Text: dominant, 60% of frame
├── Face: corner, reaction
├── Best for: list content, big claims
└── Nano: "large bold text dominant, small face corner reaction shot"
\`\`\`

## REFERENCE IMAGE HANDLING

### When Creator Photo Provided (referenciaImagem1)
\`\`\`
CRITICAL: Analyze reference photo for:
- Skin tone → match in prompt
- Hair color/style → describe accurately
- Facial features → include distinguishing features
- Typical clothing style → suggest similar
- Age range → specify in prompt

Prompt injection:
"[ethnicity] [gender] [age range], [hair description], [distinguishing features],
similar appearance to reference photo, consistent likeness"
\`\`\`

### When Style Reference Provided (referenciaImagem2)
\`\`\`
CRITICAL: Analyze style reference for:
- Color palette → extract dominant colors
- Lighting style → replicate
- Background treatment → match aesthetic
- Text style → mirror typography approach
- Overall mood → capture energy

Prompt injection:
"matching style of reference image, similar color grading,
[specific elements from reference], cohesive visual language"
\`\`\`

### When BOTH References Provided
\`\`\`
Priority order:
1. Person likeness from referenciaImagem1 (non-negotiable)
2. Style/mood from referenciaImagem2 (adapt to fit person)
3. Blend seamlessly without conflicting elements
\`\`\`

## STYLE PRESETS

| Style | Visual Characteristics | Nano Banana Descriptors |
|-------|----------------------|------------------------|
| **profissional** | Clean, corporate, trustworthy | "professional studio photography, clean background, corporate aesthetic, polished look, business casual attire, neutral colors, soft shadows" |
| **minimalista** | Simple, modern, lots of space | "minimalist design, solid color background, clean composition, negative space, simple elements, modern aesthetic, uncluttered" |
| **energetico** | Dynamic, vibrant, movement | "dynamic composition, vibrant colors, energetic pose, motion blur elements, bold saturated colors, high energy, action feel" |
| **misterioso** | Dark, intriguing, dramatic | "dramatic lighting, dark moody background, mysterious atmosphere, strong shadows, cinematic look, enigmatic expression" |
| **amigavel** | Warm, approachable, friendly | "warm lighting, friendly expression, approachable vibe, soft colors, welcoming atmosphere, genuine smile, casual setting" |
| **autoridade** | Powerful, expert, commanding | "powerful pose, authoritative stance, professional setting, confident expression, strong lighting, expert aesthetic" |
| **urgente** | High contrast, attention-demanding | "high contrast, urgent colors (red/yellow), dramatic expression, bold composition, attention-grabbing, alarming visual" |
| **luxuoso** | Premium, elegant, high-end | "luxury aesthetic, elegant composition, premium feel, sophisticated lighting, rich colors, high-end look, refined" |

## TEXT OVERLAY RULES

### Typography Specifications
\`\`\`
FONT STYLE: Bold sans-serif (Impact, Bebas, Montserrat Black)
CASE: ALL CAPS always
MAX WORDS: 4-6 (every word must earn its place)
SIZE: Text must be readable at 200px thumbnail width

CONTRAST REQUIREMENTS:
├── Light text (#FFFFFF) → needs dark background or strong shadow
├── Dark text (#000000) → needs light background or glow
├── ALWAYS add: "strong text shadow" or "text outline" or "text background box"
\`\`\`

### Text Position Mapping

| Position | When to Use | Nano Banana Terms |
|----------|-------------|-------------------|
| **TOP_CENTER** | Face is lower/center | "text overlay top center, above subject" |
| **BOTTOM_CENTER** | Face is upper/center | "text overlay bottom third, below subject" |
| **RIGHT_SIDE** | Face is left | "text overlay right side, vertical stack" |
| **LEFT_SIDE** | Face is right | "text overlay left side, vertical stack" |
| **DIAGONAL** | Dynamic energy needed | "text overlay diagonal, dynamic angle" |
| **SPLIT** | Contrasting concepts | "text split both sides, versus layout" |

### Text Style Options
\`\`\`
SOLID: "bold white text, black outline, drop shadow"
GLOW: "bold text with neon glow effect, [color] glow"
BOX: "text on solid [color] background box, high contrast"
GRADIENT: "text with gradient fill, [color1] to [color2]"
3D: "3D extruded text, bold depth effect, [color]"
\`\`\`

## PRE-OUTPUT CHECKLIST

Before generating, verify:
- [ ] Format is 16:9 horizontal (NEVER vertical)
- [ ] Text has ≤6 words
- [ ] Text contrast is specified (outline/shadow/glow)
- [ ] Text position avoids face overlap
- [ ] Expression matches content emotion
- [ ] Reference images analyzed and incorporated
- [ ] Background is simple (no busy patterns)
- [ ] Safe zone respected (10% margins)
- [ ] Colors support psychological intent
- [ ] Negative prompt blocks common failures
- [ ] Would this make YOU click?

## OUTPUT FORMAT
Return ONLY valid JSON following this exact structure:

\`\`\`json
{
  "prompt": {
    "line1_format": "professional youtube thumbnail, 16:9 aspect ratio, 1920x1080, ultra sharp, high contrast, viral potential, [style boosters]",
    "line2_subject": "[subject description with demographics, pose, expression, clothing]",
    "line3_background": "[background description, environment, depth]",
    "line4_lighting": "[lighting setup, color grade, atmosphere]",
    "line5_text": "[text overlay specifications, style, position, effects]",
    "full_prompt": "[all 5 lines combined into single optimized prompt]"
  },
  "negative_prompt": "blurry, low quality, pixelated, illegible text, cut off text, watermark, logo, text outside frame, distorted face, extra limbs, bad anatomy, wrong aspect ratio, vertical format, cluttered background, busy composition, small unreadable text",
  "especificacoes": {
    "texto_exato": "TEXTO EM CAPS",
    "palavras": 4,
    "cor_texto": "#FFFFFF",
    "cor_texto_nome": "white",
    "estilo_texto": "bold with black outline and drop shadow",
    "posicao_texto": "right_side",
    "cor_fundo_dominante": "#1A1A1A",
    "cor_fundo_nome": "dark charcoal",
    "expressao_facial": "confident smirk, knowing smile",
    "layout_usado": "FACE LEFT + TEXT RIGHT",
    "psychological_triggers": ["AUTHORITY", "CURIOSITY"]
  },
  "reasoning": {
    "why_this_expression": "explanation",
    "why_this_layout": "explanation",
    "why_these_colors": "explanation",
    "ctr_prediction": "HIGH|MEDIUM|LOW with reasoning"
  },
  "variacoes": [
    {
      "variation_name": "More Urgent",
      "changes": "what's different",
      "full_prompt": "complete alternative prompt"
    }
  ]
}
\`\`\`

RETURN ONLY THE JSON. NO ADDITIONAL TEXT.`;

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

    const {
      thumbnailTitle,
      estilo,
      contextoTematico,
      expressao,
      referenciaImagem1,
      referenciaImagem2,
      wizardContext,
      roteiroContext,
      instrucoesCustomizadas,
      tipoFundo,
      corTexto,
      posicaoTexto,
      tipoIluminacao,
    } = input;

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

    // NOVO v5.0: Advanced configuration fields
    if (tipoFundo) {
      contextParts.push(`Tipo de Fundo Solicitado: ${tipoFundo}`);
    }
    if (corTexto) {
      contextParts.push(`Cor do Texto Solicitada: ${corTexto}`);
    }
    if (posicaoTexto) {
      contextParts.push(`Posição do Texto Solicitada: ${posicaoTexto}`);
    }
    if (tipoIluminacao) {
      contextParts.push(`Tipo de Iluminação Solicitada: ${tipoIluminacao}`);
    }
    if (instrucoesCustomizadas) {
      contextParts.push(`Instruções Customizadas: ${instrucoesCustomizadas}`);
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
    if (wizardContext?.tone) {
      contextParts.push(`Tone: ${wizardContext.tone}`);
    }

    // NOVO: Add roteiro context if available
    if (roteiroContext) {
      if (roteiroContext.valorCentral) {
        contextParts.push(`Valor Central do Vídeo: ${roteiroContext.valorCentral}`);
      }
      if (roteiroContext.hookTexto) {
        contextParts.push(`Hook Usado: ${roteiroContext.hookTexto}`);
      }
      if (roteiroContext.thumbnailTitulo) {
        contextParts.push(`Título Sugerido no Roteiro: ${roteiroContext.thumbnailTitulo}`);
      }
      if (roteiroContext.thumbnailEstilo) {
        contextParts.push(`Estilo Visual Sugerido: ${roteiroContext.thumbnailEstilo}`);
      }
    }

    const userMessage = `Generate a VIDEO THUMBNAIL prompt using Nano Banana v5.0 format:

INPUT VARIABLES:
${contextParts.join("\n")}

IMPORTANT v5.0 REQUIREMENTS:
- Use the 5-line Nano Banana structure with the enhanced visual psychology guidelines
- Apply CTR optimization principles from the system prompt
- Incorporate any custom specifications (background type, text color, position, lighting) if provided
- Reference the expression impact table for optimal facial expressions
- Use color psychology guidelines for palette selection
- Select appropriate composition template from the 5 proven layouts
- If custom instructions are provided, blend them with the Nano Banana format
- Generate reasoning explaining your choices and CTR prediction
- Include 2-3 variation options

Respond with JSON only following the Nano Banana v5.0 output format.`;

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

    // Validate the response structure (handles both v4 and v5 formats)
    if (!parsed.prompt || !parsed.especificacoes) {
      console.error("[NANO-BANANA] Invalid response structure:", parsed);
      return {
        success: false,
        error: "Invalid Nano Banana response structure",
      };
    }

    console.log(`[NANO-BANANA] ✅ Prompt generated successfully`);

    // Extract prompt - handle both v5 object format and v4 string format
    const promptText = typeof parsed.prompt === "object"
      ? parsed.prompt.full_prompt
      : parsed.prompt;

    // Extract texto - handle both v5 texto_exato and v4 texto
    const textoText = parsed.especificacoes.texto_exato || parsed.especificacoes.texto;

    // Extract expressao - handle both v5 expressao_facial and v4 expressao
    const expressaoText = parsed.especificacoes.expressao_facial || parsed.especificacoes.expressao;

    console.log(`[NANO-BANANA] Texto: "${textoText}"`);
    console.log(`[NANO-BANANA] Cores: texto=${parsed.especificacoes.cor_texto}, fundo=${parsed.especificacoes.cor_fundo}`);

    return {
      success: true,
      data: {
        prompt: promptText,
        negative_prompt: parsed.negative_prompt || "",
        especificacoes: {
          texto: textoText,
          cor_texto: parsed.especificacoes.cor_texto,
          cor_fundo: parsed.especificacoes.cor_fundo,
          posicao_texto: parsed.especificacoes.posicao_texto,
          expressao: expressaoText,
          // v5.0 optional fields
          palavras: parsed.especificacoes.palavras,
          cor_texto_nome: parsed.especificacoes.cor_texto_nome,
          cor_fundo_nome: parsed.especificacoes.cor_fundo_nome,
          estilo_texto: parsed.especificacoes.estilo_texto,
          layout_usado: parsed.especificacoes.layout_usado,
          psychological_triggers: parsed.especificacoes.psychological_triggers,
        },
        reasoning: parsed.reasoning,
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
