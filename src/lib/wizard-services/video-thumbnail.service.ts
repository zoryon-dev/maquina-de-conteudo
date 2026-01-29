/**
 * Video Thumbnail Generation Service with Nano Banana v4.3
 *
 * Generates YouTube thumbnails using Nano Banana format based on prp.md prompt.
 * Supports reference images (base64) and style selection.
 */

import { generateText } from "ai";
import { openrouter } from "@/lib/ai/config";
import type { NanoBananaStyle, NanoBananaThumbnailOutput } from "./image-types";

export interface GenerateVideoThumbnailParams {
  thumbnailTitle: string; // Selected title (max 6 words)
  estilo: NanoBananaStyle;
  contextoTematico: string;
  expressao?: string;
  referenciaImagem1?: string; // Base64 of creator's photo (optional)
  referenciaImagem2?: string; // Base64 of style reference (optional)
  variacaoIndex?: number; // For generating variations (0-4)
}

export interface GenerateVideoThumbnailResult {
  success: boolean;
  data?: NanoBananaThumbnailOutput;
  error?: string;
}

/**
 * Generates a YouTube thumbnail prompt using Nano Banana v4.3 format.
 *
 * Based on the prp.md specification, this creates a structured prompt
 * that can be used with AI image generation services.
 */
export async function generateVideoThumbnail(
  params: GenerateVideoThumbnailParams
): Promise<GenerateVideoThumbnailResult> {
  const {
    thumbnailTitle,
    estilo,
    contextoTematico,
    expressao,
    referenciaImagem1,
    referenciaImagem2,
    variacaoIndex = 0,
  } = params;

  const systemPrompt = getNanoBananaSystemPrompt();
  const userPrompt = getNanoBananaUserPrompt({
    thumbnailTitle,
    estilo,
    contextoTematico,
    expressao,
    referenciaImagem1,
    referenciaImagem2,
    variacaoIndex,
  });

  try {
    // Direct LLM call
    const responseText = await llmCallWithRetry(
      "openai/gpt-4.1",
      systemPrompt,
      userPrompt,
      3 // max retries
    );

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: "Invalid JSON response from LLM",
      };
    }

    const parsed: NanoBananaThumbnailOutput = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.prompt || !parsed.especificacoes) {
      return {
        success: false,
        error: "Invalid response format: missing required fields",
      };
    }

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[VIDEO THUMBNAIL] Error generating thumbnail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getNanoBananaSystemPrompt(): string {
  return `<prompt id="nano-banana-v5.0">
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

<construcao_prompt_linhas>
LINE 1 - FORMATO:
"Professional YouTube thumbnail, 16:9 aspect ratio"

LINE 2 - SUBJECT:
"[Descrição da pessoa baseada em estilo + ângulo tribal], [expressão mapeada], [pose], looking directly at camera"

LINE 3 - BACKGROUND:
"[Tipo de fundo do estilo], [cores hex], [elementos sutis se relevante], clean composition"

LINE 4 - LIGHTING:
"[Iluminação do estilo], [mood do ângulo tribal], professional photography quality"

LINE 5 - TEXT:
"Text overlay: '[TÍTULO EXATO]', bold [COR] text with [contraste] outline/shadow, [POSIÇÃO]"

LINE 6 - STYLE & QUALITY:
"[Mood geral], high resolution, sharp focus, optimized for CTR, photorealistic"
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
}

function getNanoBananaUserPrompt(params: GenerateVideoThumbnailParams): string {
  const {
    thumbnailTitle,
    estilo,
    contextoTematico,
    expressao,
    referenciaImagem1,
    referenciaImagem2,
    variacaoIndex = 0,
  } = params;

  // Style mapping
  const styleDescriptors: Record<NanoBananaStyle, string> = {
    profissional: "professional photography, clean, business | navy, white, gold | solid dark, gradient",
    minimalista: "minimal, clean, simple | black, white, accent | solid single color",
    moderno: "contemporary, vibrant, bold | bright gradients | gradient, geometric",
    energético: "dynamic, high contrast, punchy | orange, yellow, red | energetic gradient",
    educacional: "friendly, approachable, clear | blue, green, white | soft solid",
    provocativo: "bold, dramatic, intense | red, black, white | dark dramatic",
    inspirador: "warm, uplifting, hopeful | gold, orange, cream | warm gradient",
    tech: "futuristic, sleek, modern | cyan, purple, dark | dark with glow",
  };

  const styleInfo = styleDescriptors[estilo] || styleDescriptors.profissional;

  let prompt = `<entradas>
<titulo_thumbnail>${thumbnailTitle}</titulo_thumbnail>
<estilo>${estilo}</estilo>
<estilo_descritores>${styleInfo}</estilo_descritores>
<tema>${contextoTematico}</tema>
<expressao_sugerida>${expressao || "confiante"}</expressao_sugerida>
<referencia_pessoa>${referenciaImagem1 ? "SIM (foto fornecida em base64)" : "NÃO (use pessoa genérica compatível)"}</referencia_pessoa>
<referencia_estilo>${referenciaImagem2 ? "SIM (referência visual fornecida)" : "NÃO"}</referencia_estilo>
</entradas>

<mapeamento_estilos>
O estilo selecionado (${estilo}) tem as seguintes características:
- Descritores: ${styleInfo.split("|")[0].trim()}
- Paleta de cores: ${styleInfo.split("|")[1].trim()}
- Tipo de fundo: ${styleInfo.split("|")[2].trim()}
</mapeamento_estilos>

<regras_texto_thumbnail>
TEXTO: "${thumbnailTitle}"

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

<variacao_index>
Variação solicitada: ${variacaoIndex + 1} de 5
Isso significa: ajuste sutis na composição, cores ou expressão para criar uma opção única.
</variacao_index>`;

  if (referenciaImagem1) {
    prompt += `\n\n<referencia_pessoa_base64>
${referenciaImagem1.substring(0, 100)}... (truncated, use full base64 in generation)
</referencia_pessoa_base64>`;
  }

  if (referenciaImagem2) {
    prompt += `\n\n<referencia_estilo_base64>
${referenciaImagem2.substring(0, 100)}... (truncated, use full base64 in generation)
</referencia_estilo_base64>`;
  }

  prompt += `

<instrucoes_geracao>
1. Gere o prompt Nano Banana seguindo EXATAMENTE a estrutura de 5 linhas
2. Use o título "${thumbnailTitle}" como texto overlay
3. Adapte o estilo "${estilo}" conforme os descritores fornecidos
4. ${referenciaImagem1 ? "Use a foto fornecida como referência principal para a pessoa" : "Use pessoa genérica compatível com o contexto"}
5. Garanta alto contraste entre texto e fundo
6. Inclua sugestões de variação para facilitar refinamentos
</instrucoes_geracao>

Retorne APENAS o JSON com o prompt Nano Banana completo.`;

  return prompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * LLM call with retry logic for thumbnail generation
 */
async function llmCallWithRetry(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number,
  attempt: number = 0
): Promise<string> {
  try {
    if (!openrouter) {
      throw new Error("OpenRouter API key not configured");
    }

    const result = await generateText({
      model: openrouter(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return result.text;
  } catch (error) {
    const isLastAttempt = attempt >= maxRetries;

    if (isLastAttempt) {
      throw error;
    }

    // Exponential backoff
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return llmCallWithRetry(model, systemPrompt, userPrompt, maxRetries, attempt + 1);
  }
}
