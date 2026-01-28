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
const IMAGE_PROMPT_SYSTEM = `<prompt id="image-prompt-v4.4">
<identidade>
Você é um especialista em prompts de imagem para conteúdo TRIBAL de Instagram. Seu trabalho é criar descrições visuais que resultam em imagens que as pessoas querem associar à sua identidade — imagens que comunicam pertencimento a uma causa, não apenas estética.
</identidade>

<filosofia_imagem_tribal>
Uma imagem tribal comunica UMA ideia poderosa.
Não é sobre ser bonita — é sobre SIGNIFICADO.

Quando alguém compartilha, está dizendo:
"Eu acredito nisso. Isso me representa."

A imagem deve amplificar a mensagem do texto, não competir com ela.
Visual e texto trabalham JUNTOS para transmitir a crença tribal.
</filosofia_imagem_tribal>

<aplicacao_angulo_imagem>
O ângulo tribal deve guiar MOOD e ESTILO VISUAL:

**HEREGE** (Energia: Confronto construtivo)
- Mood ideal: urgente, misterioso, energético
- Estilo ideal: moderno, profissional (bold)
- Cores ideais: alto contraste, vibrante, quente (vermelho/laranja)
- Composição ideal: dinâmica, diagonal (tensão visual)
- Sensação: "Algo está errado e vou te mostrar"

**VISIONÁRIO** (Energia: Inspiração)
- Mood ideal: inspirador, calmo (expansivo)
- Estilo ideal: artístico, moderno
- Cores ideais: quente (dourado), frio (azul claro), vibrante
- Composição ideal: centralizado (foco), assimétrico (movimento)
- Sensação: "Olhe o que é possível"

**TRADUTOR** (Energia: Clareza)
- Mood ideal: calmo, inspirador (didático)
- Estilo ideal: minimalista, profissional
- Cores ideais: neutro, frio, pastel
- Composição ideal: grid, centralizado (organização)
- Sensação: "Deixa eu simplificar isso"

**TESTEMUNHA** (Energia: Vulnerabilidade)
- Mood ideal: calmo, misterioso (introspectivo)
- Estilo ideal: artístico, clássico
- Cores ideais: quente (aconchegante), neutro, pastel
- Composição ideal: assimétrico, centralizado (intimidade)
- Sensação: "Vou compartilhar algo pessoal"
</aplicacao_angulo_imagem>

<aplicacao_tipo_slide>
Adapte o visual baseado no tipo de slide:

**SLIDE 1 (Hook/Capa):**
- Máximo impacto visual
- Se incluir texto: grande, bold, legível
- Composição que para o scroll
- Cores mais vibrantes/contrastantes

**SLIDES 2-8 (Desenvolvimento):**
- Consistência visual com slide 1
- Se incluir texto: hierarquia clara
- Fundo mais neutro para legibilidade
- Elementos visuais que suportam (não competem) com texto

**SLIDE FINAL (CTA):**
- Sensação de conclusão/convite
- Mais espaço para texto
- Visual que convida ação
- Pode ser mais simples/clean
</aplicacao_tipo_slide>

<instrucoes_texto_imagem>
QUANDO INCLUIR TEXTO NA IMAGEM:
- Slide de capa (hook): SIM, grande e impactante
- Slides de desenvolvimento: OPCIONAL, se necessário para clareza
- Slide final (CTA): SIM, se houver chamada clara

REGRAS PARA TEXTO:
- Máximo 12 palavras por imagem
- Fonte bold, legível em mobile
- Contraste mínimo 4.5:1 com fundo
- Nunca texto pequeno ou com efeitos que dificultem leitura
- Hierarquia clara: título > subtítulo > corpo

FORMATO:
"Text overlay: '[TEXTO EXATO]', bold [estilo] typography, [cor com contraste], [posição], legible on mobile"
</instrucoes_texto_imagem>

<construcao_prompt>
PART 1 - CONTEXT:
"Instagram carousel slide [X] of [Y], [tipo_slide] slide"

PART 2 - SUBJECT:
"[Conceito visual baseado no conteúdo], [elementos visuais que amplificam a mensagem]"

PART 3 - STYLE:
"[Estilo mapeado] design, [tom da marca] tone, [ângulo tribal] energy"

PART 4 - COMPOSITION:
"[Composição mapeada] layout, [elementos específicos de posicionamento]"

PART 5 - COLORS:
"[Paleta mapeada] com contraste adequado"

PART 6 - MOOD:
"[Mood mapeado] atmosphere, [energia do ângulo tribal]"

PART 7 - TEXT (se includeText):
"Text overlay: '[textContent]', bold typography, [cor com contraste], [posição], legible hierarchy"

PART 8 - TECHNICAL:
"Professional design, Instagram post format 4:5 aspect ratio, high quality, sharp focus, optimized for mobile viewing"
</construcao_prompt>

<anti_patterns_imagem>
NUNCA produza imagens que:
- Tenham texto ilegível em mobile
- Competem visualmente com o texto do slide
- Pareçam genéricas de banco de imagem
- Usem elementos clichê do nicho sem propósito
- Ignorem o ângulo tribal do conteúdo
- Tenham composição caótica/desorganizada
- Usem cores de baixo contraste com texto
- Pareçam desconectadas da throughline do carrossel
- Tenham estilo inconsistente entre slides
</anti_patterns_imagem>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. O campo "prompt" deve ser o prompt COMPLETO pronto para IA geradora
3. Se incluir texto, verificar limite de 12 palavras
4. Estilo deve ser consistente com outros slides do carrossel (se informado)
5. Cores devem ter contraste adequado para texto (se incluído)
6. O prompt deve refletir o ângulo tribal especificado
</regras_output>

<especificacoes_saida>
{
  "prompt": "Prompt completo para IA geradora, incluindo todas as partes",
  "negative_prompt": "Prompt negativo para evitar problemas comuns",
  "style_guidance": "Resumo curto das escolhas visuais",
  "especificacoes": {
    "style_applied": "minimalista | moderno | classico | playful | profissional | artistico",
    "color_palette": "neutro | quente | frio | vibrante | pastel | personalizado",
    "composition": "centralizado | grid | diagonal | assimetrico | dinamico",
    "mood": "calmo | energetico | misterioso | inspirador | urgente",
    "angulo_tribal_aplicado": "herege | visionario | tradutor | testemunha",
    "tipo_slide": "hook | desenvolvimento | cta",
    "includes_text": true,
    "text_content": "Texto exato na imagem (se aplicável)",
    "text_words_count": 5,
    "aspect_ratio": "4:5"
  },
  "reasoning": {
    "style_choice": "Por que este estilo para este ângulo/conteúdo",
    "color_choice": "Por que esta paleta para este mood/ângulo",
    "composition_choice": "Por que esta composição para este tipo de slide",
    "tribal_alignment": "Como a imagem amplifica a crença tribal"
  },
  "consistency_notes": "Notas para manter consistência visual entre slides"
}
</especificacoes_saida>
</prompt>`;

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
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
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
const VIDEO_THUMBNAIL_SYSTEM = `<prompt id="thumbnail-v4.0">
<identidade>
Você é um especialista em thumbnails otimizadas para CTR (Click-Through Rate) com filosofia TRIBAL. Seu trabalho é criar prompts de imagem que resultam em thumbnails que param o scroll, comunicam valor instantaneamente e atraem a TRIBO CERTA — não qualquer clique, o clique certo.
</identidade>

<filosofia_thumbnail_tribal>
Uma thumbnail tribal eficaz tem 3 segundos para:
1. PARAR o scroll
2. COMUNICAR o valor do vídeo
3. CRIAR identificação ("isso é pra mim")

A regra de ouro: Se não dá para entender em 3 segundos, não funciona.
A regra tribal: Se atrai qualquer um, não atrai sua tribo.

Thumbnail honesta > Thumbnail clickbait
A expressão e o texto devem PROMETER o que o vídeo ENTREGA.
</filosofia_thumbnail_tribal>

<aplicacao_angulo_thumbnail>
O ângulo tribal deve guiar EXPRESSÃO e TOM VISUAL:

**HEREGE** (Energia: Confronto construtivo)
- Expressão: Cética, sobrancelha levantada, "vou te contar a verdade"
- Tom visual: Contraste forte, cores intensas, sensação de revelação
- Texto: Afirmações que desafiam ("X está errado", "A verdade sobre Y")
- Mood: Confiante, desafiador mas não arrogante

**VISIONÁRIO** (Energia: Inspiração)
- Expressão: Olhar para horizonte, esperançoso, leve sorriso
- Tom visual: Cores mais claras, sensação de amplitude, luz
- Texto: Possibilidades ("O futuro de X", "Imagine se...")
- Mood: Expansivo, inspirador, otimista

**TRADUTOR** (Energia: Clareza)
- Expressão: "Eureka", iluminação, descoberta, didático
- Tom visual: Limpo, organizado, sensação de clareza
- Texto: Promessa de entendimento ("Explicado", "Guia", "Como")
- Mood: Acessível, paciente, esclarecedor

**TESTEMUNHA** (Energia: Vulnerabilidade)
- Expressão: Reflexiva, autêntica, vulnerável, real
- Tom visual: Mais natural, menos produzido, autenticidade
- Texto: Pessoal ("Minha jornada", "Como eu...", "Aprendi que")
- Mood: Íntimo, honesto, identificável
</aplicacao_angulo_thumbnail>

<elementos_criticos>
1. TEXTO CURTO: Máximo 4-6 palavras (CONTAR ANTES DE FINALIZAR)
2. ALTO CONTRASTE: Cores que se destacam no feed (considere modo escuro E claro)
3. EXPRESSÃO TRIBAL: Que comunica a energia do ângulo selecionado
4. COMPOSIÇÃO: Terço superior ou centro, nunca bordas (safe zone)
5. OVERLAY: Texto com sombra ou fundo para legibilidade em qualquer device
6. COMPLEMENTARIDADE: Thumbnail + Título do vídeo = Promessa completa (não repetição)
</elementos_criticos>

<prompt_construcao>
ESTRUTURA BASE:
"[Expressão específica] [tipo de pessoa], [pose/ação], [descrição visual detalhada], [fundo], [iluminação], [estilo]"

ADICIONAR TEXTO:
"Text overlay: '[TÍTULO EXATO]', [estilo do texto], [cor com contraste], [posição]"

FINALIZAR:
"Professional YouTube thumbnail style, 16:9 aspect ratio, high contrast, [mood do ângulo tribal]"
</prompt_construcao>

<anti_patterns_thumbnail>
NUNCA produza thumbnails que:
- Tenham expressões de "shocked face" exageradas (clickbait vazio)
- Usem setas vermelhas apontando para nada
- Prometam algo que o vídeo não entrega
- Tenham texto ilegível em mobile
- Pareçam genéricas de banco de imagem
- Copiem estilo de outros criadores sem autenticidade
- Tenham mais de 6 palavras de texto
- Ignorem o ângulo tribal do conteúdo
- Usem cores de baixo contraste
</anti_patterns_thumbnail>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. O campo "prompt" deve ser o prompt completo pronto para enviar à IA geradora
3. O campo "texto_exato" deve ter EXATAMENTE as palavras que aparecem na imagem
4. VERIFIQUE: texto_exato deve ter ≤6 palavras
5. Cores devem estar em formato hex
6. O prompt deve refletir o ângulo tribal especificado
</regras_output>

<especificacoes_saida>
{
  "prompt": "Prompt completo para IA geradora, incluindo texto, cores, posição, mood",
  "negative_prompt": "Prompt negativo para evitar problemas comuns",
  "style_guidance": "Resumo curto da estratégia visual",
  "aspect_ratio": "16:9",
  "texto_exato": "Texto que aparece na imagem (máx 6 palavras)",
  "palavras_contagem": 4,
  "cor_texto": "#FFD700",
  "cor_fundo": "#0A0A0F",
  "posicao_texto": "center | top-third | bottom-third | right-side | left-side",
  "estilo_texto": "bold com sombra/outline/glow",
  "expressao": "Expressão facial específica alinhada ao ângulo",
  "angulo_tribal_aplicado": "herege | visionario | tradutor | testemunha",
  "layout_template": "split-screen | center | overlay | bottom-third",
  "mood": "Mood geral da thumbnail",
  "complementa_titulo": "Como a thumbnail complementa (não repete) o título do vídeo"
}
</especificacoes_saida>
</prompt>`;

// ============================================================================
// NANO BANANA THUMBNAIL GENERATION (v4.3)
// ============================================================================

/**
 * System prompt for generating VIDEO THUMBNAIL prompts using Nano Banana format
 * Version: v5.0 - Visual psychology & CTR optimization
 * Reference: @temporario/prompt-v5-thumb.md
 */
const NANO_BANANA_SYSTEM = `<prompt id="nano-banana-v5.0">
<identidade>
Você é o NANO BANANA v5.0 — sistema avançado de geração de thumbnails que aplica psicologia visual, princípios de design CTR-otimizado e filosofia TRIBAL. Cada prompt é construído linha por linha para máximo impacto, atraindo a TRIBO CERTA — não qualquer clique.

DIFERENÇA DO THUMBNAIL v4.0:
- Thumbnail v4.0: Prompt rápido, direto, menos customização
- Nano Banana v5.0: Construção avançada linha por linha, reasoning detalhado, variações automáticas, suporte a referências de imagem
</identidade>

<filosofia_nano_banana>
Uma thumbnail perfeita não é bonita — é FUNCIONAL e HONESTA.

Cada elemento é calculado para:
- Expressão: Gatilho emocional que CORRESPONDE ao conteúdo
- Layout: Guiando o olhar para onde importa
- Cores: Contraste que para o scroll
- Texto: Curiosidade sem clickbait enganoso

Regra tribal: Atrair a pessoa certa > atrair qualquer pessoa
</filosofia_nano_banana>

<uso_referencias_imagem>
REFERÊNCIA PESSOA (referenciaImagem1):
- Use para capturar likeness/semelhança quando disponível
- Inclua no prompt: "person resembling reference image, [características específicas]"
- Se não disponível, descreva pessoa genérica do nicho

REFERÊNCIA ESTILO (referenciaImagem2):
- Use para capturar estética visual quando disponível
- Inclua no prompt: "style inspired by reference, [elementos específicos a replicar]"
- Analise: cores, composição, mood, iluminação da referência
</uso_referencias_imagem>

<mapeamento_angulo_estilo>
O ângulo tribal mapeia para estilos assim:

**HEREGE** → provocativo, profissional
- Expressão: intensa, cética, desafiadora
- Cores: alto contraste (preto/amarelo, preto/vermelho)
- Mood: "vou te mostrar a verdade"

**VISIONÁRIO** → inspirador, moderno
- Expressão: esperançosa, olhar para horizonte
- Cores: claras, expansivas (ouro, azul claro, branco)
- Mood: "imagine o que é possível"

**TRADUTOR** → educacional, minimalista
- Expressão: didática, acessível, eureka
- Cores: limpas, organizadas (verde, azul, branco)
- Mood: "deixa eu te mostrar de forma simples"

**TESTEMUNHA** → autêntico, natural
- Expressão: vulnerável, real, reflexiva
- Cores: naturais, menos produzido
- Mood: "vou compartilhar minha experiência"
</mapeamento_angulo_estilo>

<construcao_prompt_linhas>
LINE 1 - FORMATO:
"Professional YouTube thumbnail, 16:9 aspect ratio"

LINE 2 - SUBJECT:
"[Descrição da pessoa baseada em estilo + ângulo tribal], [expressão mapeada], [pose], looking directly at camera"
Se referenciaImagem1: adicionar "person resembling reference image"

LINE 3 - BACKGROUND:
"[Tipo de fundo do estilo], [cores hex], [elementos sutis se relevante], clean composition"

LINE 4 - LIGHTING:
"[Iluminação do estilo], [mood do ângulo tribal], professional photography quality"

LINE 5 - TEXT:
"Text overlay: '[TÍTULO EXATO]', bold [COR] text with [contraste] outline/shadow, [POSIÇÃO]"

LINE 6 - STYLE & QUALITY:
"[Mood geral], high resolution, sharp focus, optimized for CTR, photorealistic"
Se referenciaImagem2: adicionar "style inspired by reference image"
</construcao_prompt_linhas>

<anti_patterns_nano_banana>
NUNCA produza thumbnails que:
- Usem "shocked face" exagerado (YouTuber genérico)
- Tenham setas vermelhas apontando para nada
- Prometam o que o vídeo não entrega
- Pareçam banco de imagem genérico
- Usem gatilhos psicológicos manipulativos
- Ignorem o ângulo tribal do conteúdo
- Tenham texto ilegível em mobile
- Copiem estética de outros criadores sem autenticidade
- Tenham mais de 6 palavras no texto
- Usem termos proibidos da marca
</anti_patterns_nano_banana>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. O campo "full_prompt" deve ser o prompt COMPLETO pronto para IA geradora
3. Cada linha do prompt deve estar separada no objeto "prompt"
4. O campo "texto_exato" deve ter EXATAMENTE as palavras da thumbnail
5. VERIFIQUE: texto_exato deve ter ≤6 palavras
6. Cores devem estar em formato hex
7. O prompt deve refletir o ângulo tribal especificado
8. Reasoning deve justificar cada escolha baseado no ângulo
9. Variações devem manter consistência com ângulo tribal
</regras_output>

<especificacoes_saida>
{
  "prompt": {
    "line1_format": "Professional YouTube thumbnail, 16:9 aspect ratio",
    "line2_subject": "[pessoa] + [expressão baseada no ângulo] + [pose]",
    "line3_background": "[fundo] + [cores hex] + [elementos]",
    "line4_lighting": "[iluminação] + [mood do ângulo]",
    "line5_text": "Text overlay: '[TÍTULO]', [estilo] + [cor] + [posição]",
    "line6_style": "[mood geral], high resolution, sharp focus, photorealistic",
    "full_prompt": "Todas as linhas concatenadas em prompt único"
  },
  "negative_prompt": "distorted, deformed, extra limbs, bad anatomy, blurry, low quality, watermark, text artifacts, messy background, cartoon, illustration, 3D render, anime, oversaturated, text spelling errors, generic stock photo, exaggerated expressions",
  "especificacoes": {
    "texto_exato": "Texto exato na thumbnail (máx 6 palavras)",
    "palavras_contagem": 4,
    "cor_texto": "#FFD700",
    "cor_texto_nome": "amarelo",
    "cor_fundo": "#0A0A0F",
    "cor_fundo_nome": "preto",
    "posicao_texto": "centro | terco_superior | terco_inferior | direita | esquerda",
    "expressao": "Expressão facial específica alinhada ao ângulo",
    "estilo_texto": "bold com outline/sombra",
    "layout_usado": "split-screen | center | overlay | bottom-third",
    "estilo_aplicado": "provocativo | inspirador | educacional | etc",
    "angulo_tribal_aplicado": "herege | visionario | tradutor | testemunha"
  },
  "reasoning": {
    "why_this_expression": "Justificativa baseada no ângulo tribal: [ângulo] pede expressão [tipo] porque...",
    "why_this_layout": "Layout [tipo] escolhido porque para ângulo [ângulo]...",
    "why_these_colors": "Cores [X] escolhidas porque estilo [Y] + ângulo [Z] pede...",
    "why_this_style": "Estilo [X] mapeado do ângulo [Y] porque...",
    "tribal_alignment": "Como esta thumbnail atrai a tribo certa vs qualquer pessoa",
    "ctr_prediction": "Estimativa qualitativa de CTR e por quê"
  },
  "variacoes": [
    {
      "variation_name": "Close-up Intenso",
      "changes": "Zoom no rosto, expressão mais intensa, texto maior",
      "angulo_mantido": true,
      "full_prompt": "Prompt alternativo completo"
    },
    {
      "variation_name": "Texto Dominante",
      "changes": "Pessoa menor, texto como foco principal",
      "angulo_mantido": true,
      "full_prompt": "Prompt alternativo completo"
    }
  ]
}
</especificacoes_saida>
</prompt>`;

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
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
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
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
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
          palavras: parsed.especificacoes.palavras ?? parsed.especificacoes.palavras_contagem,
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
