/**
 * Wizard Prompts Configuration
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * INSTRUÇÕES PARA EDIÇÃO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo contém TODOS os prompts usados pelo Wizard de Criação.
 *
 * Para alterar um prompt:
 * 1. Encontre a função correspondente (ex: getNarrativesSystemPrompt)
 * 2. Edite o texto retornado pela função
 * 3. As alterações serão aplicadas na próxima geração
 *
 * Estrutura:
 * - getNarrativesSystemPrompt(): Gera 4 narrativas com diferentes ângulos
 * - getContentPrompt(): Prompts específicos para cada tipo de conteúdo
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { NarrativeAngle, ContentType } from "./types";

// ============================================================================
// NARRATIVES GENERATION PROMPT
// ============================================================================

/**
 * Prompt para geração das 4 narrativas com diferentes ângulos.
 *
 * Cada narrativa representa uma abordagem diferente para o mesmo conteúdo.
 */
export function getNarrativesSystemPrompt(params: {
  contentType: ContentType;
  theme?: string;
  context?: string;
  objective?: string;
  targetAudience?: string;
  cta?: string;
  extractedContent?: string;
  researchData?: string;
}): string {
  const {
    contentType,
    theme,
    context,
    objective,
    targetAudience,
    cta,
    extractedContent,
    researchData,
  } = params;

  return `Você é um estrategista de conteúdo especializado em criar narrativas para redes sociais. Sua tarefa é gerar 4 opções de narrativa diferentes, cada uma com uma abordagem única.

═══════════════════════════════════════════════════════════════════════════
OS 4 ÂNGULOS DE NARRATIVA
═══════════════════════════════════════════════════════════════════════════

1. CRIATIVO (Criativo)
   - Foca em inovação, originalidade e quebra de padrões
   - Usa linguagem criativa e metáforas
   - Propõe ideias fora da caixa
   - Ideal para marcas que querem se diferenciar

2. ESTRATÉGICO (Estratégico)
   - Foca em resultados, benefícios e lógica de negócio
   - Usa dados e argumentos racionais
   - Destaca valor proposition e ROI
   - Ideal para B2B e produtos de maior valor

3. DINÂMICO (Dinâmico)
   - Foca em energia, urgência e captura imediata de atenção
   - Usa linguagem ativa e verbos de ação
   - Cria senso de oportunidade única
   - Ideal para promoções e lançamentos

4. INSPIRADOR (Inspirador)
   - Foca em storytelling, emoção e conexão humana
   - Usa narrativas e exemplos relatables
   - Conecta com propósitos maiores
   - Ideal para construir comunidade e lealdade

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido com esta estrutura:

{
  "narratives": [
    {
      "id": "narrative-1",
      "angle": "criativo",
      "title": "Título curto e impactante (máx 10 palavras)",
      "description": "Descrição da abordagem em 2-3 frases que explicam como esse ângulo será aplicado ao conteúdo"
    },
    {
      "id": "narrative-2",
      "angle": "estrategico",
      "title": "Título...",
      "description": "Descrição..."
    },
    {
      "id": "narrative-3",
      "angle": "dinamico",
      "title": "Título...",
      "description": "Descrição..."
    },
    {
      "id": "narrative-4",
      "angle": "inspirador",
      "title": "Título...",
      "description": "Descrição..."
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════
CONSIDERAÇÕES PARA CADA NARRATIVA
═══════════════════════════════════════════════════════════════════════════

Ao criar cada narrativa, considere:
• Tipo de conteúdo: ${contentType}
${theme ? `• Tema principal: ${theme}` : ""}
${context ? `• Contexto adicional: ${context}` : ""}
${objective ? `• Objetivo do conteúdo: ${objective}` : ""}
${targetAudience ? `• Público-alvo: ${targetAudience}` : ""}
${cta ? `• Call to Action desejado: ${cta}` : ""}
${extractedContent ? `• Conteúdo de referência extraído: ${extractedContent}` : ""}
${researchData ? `• Pesquisa adicional: ${researchData}` : ""}

IMPORTANTE:
- Cada narrativa deve ser DISTINCTA e claramente diferenciada
- Os títulos devem ser CATIVANTES e profissionais
- As descrições devem ser ESPECÍFICAS, não genéricas
- Adapte o tom de voz ao público-alvo especificado`;
}

// ============================================================================
// CONTENT GENERATION PROMPTS - CAROUSEL
// ============================================================================

/**
 * Prompt para geração de carrossel (múltiplos slides).
 */
export function getCarouselPrompt(params: {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  numberOfSlides: number;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
}): string {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    numberOfSlides,
    cta,
    negativeTerms,
    ragContext,
  } = params;

  return `Você é um especialista em criar carrosséis engaging para redes sociais. Sua tarefa é gerar um carrossel com ${numberOfSlides} slides.

═══════════════════════════════════════════════════════════════════════════
NARRATIVA SELECIONADA
═══════════════════════════════════════════════════════════════════════════

Ângulo: ${narrativeAngle}
Título: ${narrativeTitle}
Descrição: ${narrativeDescription}

═══════════════════════════════════════════════════════════════════════════
ESTRUTURA DO CARROSSEL
═══════════════════════════════════════════════════════════════════════════

Slide 1 (HOOK): Deve prender a atenção imediatamente
Slide 2-${numberOfSlides - 1}: Desenvolvimento do conteúdo
Slide ${numberOfSlides} (CTA): Chamada para ação clara

═══════════════════════════════════════════════════════════════════════════
REGRAS PARA CRIAÇÃO
═══════════════════════════════════════════════════════════════════════════

1. CADA SLIDE deve ter:
   - title: Título curto e impactante (3-6 palavras)
   - content: Conteúdo principal do slide (bullet points ou parágrafo curto)
   - imagePrompt: Prompt detalhado para gerar imagem com IA (descreva visualmente: cores, objetos, estilo)

2. Estilo dos imagePrompts:
   - Seja específico sobre cores, objetos e composição
   - Inclua o estilo visual (ex: "minimalista", "3D render", "ilustração flat")
   - Considere o tema e o público-alvo

3. O CAPTION deve:
   - Ser engaging e relacionado ao tema
   - Ter 2-4 parágrafos
   - Incluir o CTA de forma natural

4. As HASHTAGS devem:
   - Ser relevantes ao tema
   - Incluir mix de populares e nicho
   - Máximo 15 hashtags
${negativeTerms ? `\n5. EVITE categoricamente estes termos: ${negativeTerms.join(", ")}` : ""}
${ragContext ? `\n═══════════════════════════════════════════════════════════════════════════\nCONTEXTO ADICIONAL (RAG)\n${ragContext}\n═══════════════════════════════════════════════════════════════════════════` : ""}

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido:

{
  "slides": [
    {
      "title": "Título do slide 1",
      "content": "Conteúdo do slide 1",
      "imagePrompt": "Prompt para imagem do slide 1"
    }
  ],
  "caption": "Caption completo para o post",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "${cta || "Link na bio"}"
}`;
}

// ============================================================================
// CONTENT GENERATION PROMPTS - TEXT POST
// ============================================================================

/**
 * Prompt para geração de post de texto tradicional.
 */
export function getTextPrompt(params: {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
}): string {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    cta,
    negativeTerms,
    ragContext,
  } = params;

  return `Você é um especialista em criar posts de texto engaging para redes sociais. Sua tarefa é gerar um post completo e otimizado para engajamento.

═══════════════════════════════════════════════════════════════════════════
NARRATIVA SELECIONADA
═══════════════════════════════════════════════════════════════════════════

Ângulo: ${narrativeAngle}
Título: ${narrativeTitle}
Descrição: ${narrativeDescription}

═══════════════════════════════════════════════════════════════════════════
REGRAS PARA CRIAÇÃO
═══════════════════════════════════════════════════════════════════════════

1. O POST deve:
   - Ter um HOOK inicial que prenda a atenção (primeira linha)
   - Ser dividido em 2-4 parágrafos curtos e digestíveis
   - Usar emojis estrategicamente (não excessivamente)
   - Ter whitespace adequado para legibilidade

2. O CTA deve:
   - Ser claro e direto
   - Criar senso de urgência ou oportunidade
   - Estar naturalmente integrado ao final

3. As HASHTAGS devem:
   - Ser relevantes ao tema
   - Incluir mix de populares e nicho
   - Máximo 15 hashtags
${negativeTerms ? `\n4. EVITE categoricamente estes termos: ${negativeTerms.join(", ")}` : ""}
${ragContext ? `\n═══════════════════════════════════════════════════════════════════════════\nCONTEXTO ADICIONAL (RAG)\n${ragContext}\n═══════════════════════════════════════════════════════════════════════════` : ""}

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido:

{
  "content": "Conteúdo completo do post com parágrafos separados por \\n\\n",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "${cta || "Link na bio"}"
}`;
}

// ============================================================================
// CONTENT GENERATION PROMPTS - IMAGE POST
// ============================================================================

/**
 * Prompt para geração de post de imagem com legenda.
 */
export function getImagePrompt(params: {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
}): string {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    cta,
    negativeTerms,
    ragContext,
  } = params;

  return `Você é um especialista em criar posts de imagem para redes sociais. Sua tarefa é gerar uma legenda impactful e o prompt para a imagem.

═══════════════════════════════════════════════════════════════════════════
NARRATIVA SELECIONADA
═══════════════════════════════════════════════════════════════════════════

Ângulo: ${narrativeAngle}
Título: ${narrativeTitle}
Descrição: ${narrativeDescription}

═══════════════════════════════════════════════════════════════════════════
REGRAS PARA CRIAÇÃO
═══════════════════════════════════════════════════════════════════════════

1. A IMAGEM deve:
   - Ser descrita em DETALHES no imagePrompt
   - Incluir estilo visual (ex: "foto profissional", "ilustração 3D", "design minimalista")
   - Especificar cores, objetos, composição
   - Considerar o tema e público-alvo

2. A LEGENDA (caption) deve:
   - Ser concisa e poderosa (1-3 parágrafos)
   - Complementar a imagem (não repetir o óbvio)
   - Ter um HOOK inicial
   - Incluir o CTA de forma natural

3. As HASHTAGS devem:
   - Ser relevantes ao tema
   - Incluir mix de populares e nicho
   - Máximo 15 hashtags
${negativeTerms ? `\n4. EVITE categoricamente estes termos: ${negativeTerms.join(", ")}` : ""}
${ragContext ? `\n═══════════════════════════════════════════════════════════════════════════\nCONTEXTO ADICIONAL (RAG)\n${ragContext}\n═══════════════════════════════════════════════════════════════════════════` : ""}

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido:

{
  "imagePrompt": "Descrição detalhada da imagem para gerar com IA...",
  "caption": "Legenda completa para o post",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "${cta || "Link na bio"}"
}`;
}

// ============================================================================
// CONTENT GENERATION PROMPTS - VIDEO
// ============================================================================

/**
 * Prompt para geração de roteiro de vídeo curto (Reels, TikTok).
 */
export function getVideoPrompt(params: {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
}): string {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    cta,
    negativeTerms,
    ragContext,
  } = params;

  return `Você é um especialista em criar roteiros para vídeos curtos (Reels, TikTok). Sua tarefa é gerar um roteiro engaging e otimizado para retenção.

═══════════════════════════════════════════════════════════════════════════
NARRATIVA SELECIONADA
═══════════════════════════════════════════════════════════════════════════

Ângulo: ${narrativeAngle}
Título: ${narrativeTitle}
Descrição: ${narrativeDescription}

═══════════════════════════════════════════════════════════════════════════
ESTRUTURA DE VÍDEO CURTO
═══════════════════════════════════════════════════════════════════════════

Um vídeo curto eficaz tem:
0:00-0:03 - HOOK (prende a atenção imediatamente)
0:03-0:15 - CONTEÚDO (desenvolvimento da ideia)
0:15-0:30 - CTA (chamada para ação)
0:30-0:60 - Varia conforme conteúdo, mas mantenha a dinâmica

═══════════════════════════════════════════════════════════════════════════
REGRAS PARA CRIAÇÃO
═══════════════════════════════════════════════════════════════════════════

1. O ROTEIRO deve incluir:
   - time: Timestamp da cena
   - visual: Descrição do que aparece na tela
   - audio: O que é dito (narração) ou som indicado
   - text: Texto na tela (overlay) se aplicável

2. Para o HOOK inicial:
   - Seja impactante nas primeiras 3 segundos
   - Faça uma pergunta, afirme algo surpreendente, ou mostre o resultado final

3. Para o CTA:
   - Seja claro e direto
   - Repita se necessário
   - Indique a ação específica
${negativeTerms ? `\n4. EVITE categoricamente estes termos: ${negativeTerms.join(", ")}` : ""}
${ragContext ? `\n═══════════════════════════════════════════════════════════════════════════\nCONTEXTO ADICIONAL (RAG)\n${ragContext}\n═══════════════════════════════════════════════════════════════════════════` : ""}

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido:

{
  "script": [
    {"time": "0:00", "visual": "Descrição visual", "audio": "O que é dito", "text": "Texto na tela (opcional)"},
    {"time": "0:05", "visual": "...", "audio": "...", "text": "..."}
  ],
  "caption": "Caption para o post do vídeo",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "${cta || "Link na bio"}"
}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retorna o prompt de geração de conteúdo baseado no tipo de conteúdo.
 */
export function getContentPrompt(params: {
  contentType: ContentType;
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  numberOfSlides?: number;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
}): string {
  const {
    contentType,
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    numberOfSlides,
    cta,
    negativeTerms,
    ragContext,
  } = params;

  switch (contentType) {
    case "carousel":
      return getCarouselPrompt({
        narrativeAngle,
        narrativeTitle,
        narrativeDescription,
        numberOfSlides: numberOfSlides || 10,
        cta,
        negativeTerms,
        ragContext,
      });
    case "text":
      return getTextPrompt({
        narrativeAngle,
        narrativeTitle,
        narrativeDescription,
        cta,
        negativeTerms,
        ragContext,
      });
    case "image":
      return getImagePrompt({
        narrativeAngle,
        narrativeTitle,
        narrativeDescription,
        cta,
        negativeTerms,
        ragContext,
      });
    case "video":
      return getVideoPrompt({
        narrativeAngle,
        narrativeTitle,
        narrativeDescription,
        cta,
        negativeTerms,
        ragContext,
      });
    default:
      return getTextPrompt({
        narrativeAngle,
        narrativeTitle,
        narrativeDescription,
        cta,
        negativeTerms,
        ragContext,
      });
  }
}

/**
 * Retorna a descrição do ângulo em português.
 */
export function getAngleDescription(angle: NarrativeAngle): string {
  const descriptions: Record<NarrativeAngle, string> = {
    criativo: "Abordagem criativa focada em inovação e originalidade",
    estrategico: "Abordagem estratégica focada em resultados e benefícios",
    dinamico: "Abordagem dinâmica focada em energia e urgência",
    inspirador: "Abordagem inspiradora focada em storytelling e emoção",
  };
  return descriptions[angle];
}

/**
 * Retorna o nome legível do tipo de conteúdo.
 */
export function getContentTypeName(contentType: ContentType): string {
  const names: Record<ContentType, string> = {
    text: "Post de Texto",
    image: "Post de Imagem",
    carousel: "Carrossel",
    video: "Vídeo Curto",
  };
  return names[contentType];
}

/**
 * Helper para extrair JSON da resposta do LLM.
 */
export function extractJSONFromResponse(text: string): object {
  // Tenta encontrar o primeiro { e o último }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON found in response");
  }

  const jsonStr = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonStr);
}
