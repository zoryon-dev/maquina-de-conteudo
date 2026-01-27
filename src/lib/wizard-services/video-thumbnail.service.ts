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
  return `<system_prompt id="thumbnail-v4.3-nano-banana">
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

<formato_saida>
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

RETORNE APENAS O JSON.
</formato_saida>`;
}

function getNanoBananaUserPrompt(params: GenerateVideoThumbnailParams): string {
  const {
    thumbnailTitle,
    estilo,
    contextoTematico,
    expressao,
    referenciaImagem1,
    referenciaImagem2,
    variacaoIndex,
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
