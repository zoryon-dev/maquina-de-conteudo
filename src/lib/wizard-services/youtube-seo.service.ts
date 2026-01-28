/**
 * YouTube SEO Content Generation Service
 *
 * Generates optimized YouTube metadata (title, description, tags, hashtags)
 * using the comprehensive SEO prompt from @temporaria/prompts/09-youtube-seo-v1-novo.md
 *
 * Uses GPT-5-mini for high-quality SEO optimization
 */

import { openrouter } from "@/lib/ai/config";
import type { ServiceResult } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Narrative angle from previous prompts
 */
export type NarrativeAngle =
  | "HEREGE"
  | "VISIONÁRIO"
  | "TRADUTOR"
  | "TESTEMUNHA"
  | "PROVOCADOR"
  | "CURADOR";

/**
 * Search intent categorization
 */
export type SearchIntent = "informational" | "transactional" | "navigational";

/**
 * Input parameters for YouTube SEO generation
 */
export interface GenerateYouTubeSEOParams {
  // From previous prompts
  narrativeAngle?: NarrativeAngle;
  narrativeTitle?: string;
  narrativeDescription?: string;
  coreBelief?: string;
  statusQuoChallenged?: string;
  thumbnailTitle: string;

  // Content context
  theme: string;
  targetAudience: string;
  objective?: string;
  niche?: string;

  // Script context (CRITICAL for SEO alignment)
  roteiroContext: {
    valorCentral?: string;
    hookTexto?: string;
    topicos?: string[]; // For timestamps
    duracao?: string; // Video duration estimate
    transformacao?: string;
  };

  // SEO inputs
  primaryKeyword: string;
  secondaryKeywords?: string[];
  competitorVideos?: string[]; // URLs for tag research
  searchIntent?: SearchIntent;

  // Brand presets (optional)
  brand?: {
    voiceTone?: string;
    brandVoice?: string;
    channelName?: string;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      youtube?: string;
    };
    targetAudience?: string;
    preferredCTAs?: string;
    forbiddenTerms?: string[];
  };
}

/**
 * Generated YouTube SEO metadata output
 */
export interface YouTubeSEOOutput {
  titulo: {
    principal: string;
    caracteres: number;
    formula_usada: string;
    keyword_position: string;
    variações: string[];
  };

  descricao: {
    above_the_fold: string;
    corpo_completo: string;
    caracteres_total: number;
    estrutura: {
      hook: string;
      valor: string;
      contexto: string;
      timestamps: string;
      cta_engagement: string;
      cta_subscribe: string;
      links_relacionados: string;
      recursos: string;
      hashtags: string;
      keyword_block: string;
    };
  };

  tags: {
    lista_ordenada: string[];
    caracteres_total: number;
    estrategia: string;
  };

  hashtags: {
    acima_titulo: string[];
    na_descricao: string[];
  };

  seo_analysis: {
    primary_keyword: string;
    keyword_density_titulo: string;
    keyword_density_descricao: string;
    search_intent_match: string;
    estimated_search_volume: string;
    competition_level: string;
    ranking_potential: string;
  };

  engagement_hooks: {
    comment_question: string;
    controversy_angle: string;
    share_trigger: string;
  };

  analise_tribal?: {
    angulo_tribal_aplicado: string;
    estrategia_tribal: string;
    authenticity_score: string;
    tribe_identification: string;
  };
}

/**
 * Service result wrapper
 */
export interface GenerateYouTubeSEOResult {
  success: boolean;
  data?: YouTubeSEOOutput;
  error?: string;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * System prompt for YouTube SEO generation
 * Based on @temporario/prompt-seo.md
 */
function getYouTubeSEOSystemPrompt(params: GenerateYouTubeSEOParams): string {
  return `<prompt id="youtube-seo-v1.0">
<identidade>
Você é um especialista em SEO do YouTube com filosofia TRIBAL. Você entende que YouTube SEO é um equilíbrio entre ALGORITMO (buscabilidade) e HUMANO (conexão). Você otimiza para descoberta sem sacrificar autenticidade — porque clickbait pode trazer cliques, mas só conteúdo genuíno constrói tribo.
</identidade>

<contexto_marca>
<tom>${params.brand?.voiceTone || "Autêntico e direto"}</tom>
<canal>${params.brand?.channelName || ""}</canal>
<termos_proibidos>${params.brand?.forbiddenTerms?.join(", ") || "nenhum"}</termos_proibidos>
</contexto_marca>

<core_mission>
Gerar metadata de YouTube que:
1. RANQUEIA em buscas do YouTube e Google
2. CONVERTE impressões em cliques (alto CTR)
3. RETÉM espectadores (sinais de watch time)
4. ATRAI A TRIBO CERTA (não qualquer clique — o clique certo)
5. REFLETE a voz autêntica da marca
6. ENTREGA o que promete (hook honesto)
</core_mission>

<sistemas_descoberta>
### 3 Sistemas de Descoberta YouTube

1. BUSCA (YouTube + Google)
   - Trigger: keywords em title, description, tags
   - Fatores: relevance, watch time, CTR, freshness
   - Estratégia: Target queries específicas da tribo

2. SUGERIDO/RECOMENDADO
   - Trigger: padrões de comportamento do espectador
   - Fatores: session time, topic relevance, engagement
   - Estratégia: Otimizar para related videos do nicho

3. BROWSE (Home, Subscriptions)
   - Trigger: relacionamento de subscribe, trending
   - Fatores: CTR, early engagement velocity
   - Estratégia: Hook subscribers com reconhecimento ("isso é pra mim")
</sistemas_descoberta>

<prioridade_seo>
| Element | Search Weight | CTR Weight | Character Limit |
|---------|---------------|------------|-----------------|
| **Title** | 35% | 45% | 100 chars (70 visible) |
| **Description (first 150 chars)** | 25% | 30% | 150 chars above fold |
| **Description (full)** | 15% | 5% | 5000 chars total |
| **Tags** | 10% | 0% | 500 chars total |
| **Hashtags** | 5% | 0% | 3-5 hashtags |
</prioridade_seo>

<entrada>
<thumbnail_title>${params.thumbnailTitle}</thumbnail_title>
<tema>${params.theme}</tema>
<publico_alvo>${params.targetAudience}</publico_alvo>
<objective>${params.objective || ""}</objective>
<nicho>${params.niche || ""}</nicho>
<primary_keyword>${params.primaryKeyword}</primary_keyword>
<secondary_keywords>${params.secondaryKeywords?.join(", ") || ""}</secondary_keywords>
<search_intent>${params.searchIntent || "informational"}</search_intent>

<narrativa_tribal>
  <angulo>${params.narrativeAngle || ""}</angulo>
  <crenca_central>${params.coreBelief || ""}</crenca_central>
  <status_quo_desafiado>${params.statusQuoChallenged || ""}</status_quo_desafiado>
</narrativa_tribal>

<roteiro_contexto>
  <valor_central>${params.roteiroContext?.valorCentral || ""}</valor_central>
  <hook>${params.roteiroContext?.hookTexto || ""}</hook>
  <topicos>${params.roteiroContext?.topicos?.join(", ") || ""}</topicos>
  <duracao>${params.roteiroContext?.duracao || ""}</duracao>
  <transformacao>${params.roteiroContext?.transformacao || ""}</transformacao>
</roteiro_contexto>
</entrada>

<aplicacao_angulo_seo>
O ângulo tribal "${params.narrativeAngle || "não especificado"}" deve influenciar o SEO:

**HEREGE** → Títulos que desafiam consenso
- Fórmulas ideais: REVELATION, CONTRARIAN, WARNING
- Palavras-poder: Verdade, Errado, Ninguém fala, Mito
- Tom: Confronto construtivo, "vou te mostrar o outro lado"

**VISIONÁRIO** → Títulos que inspiram possibilidade
- Fórmulas ideais: CASE STUDY, YEAR/CURRENT, ULTIMATE
- Palavras-poder: Futuro, Novo, Transformação, Possível
- Tom: Esperançoso, expansivo, "imagine se..."

**TRADUTOR** → Títulos que prometem clareza
- Fórmulas ideais: HOW TO, KEYWORD FIRST, ULTIMATE
- Palavras-poder: Simples, Passo a passo, Explicado, Definitivo
- Tom: Didático, acessível, "finalmente entenda"

**TESTEMUNHA** → Títulos com elemento pessoal
- Fórmulas ideais: CASE STUDY, STORY, REVELATION
- Palavras-poder: Minha jornada, Como eu, Aprendi, Descobri
- Tom: Vulnerável, autêntico, "vou compartilhar"
</aplicacao_angulo_seo>

<titulo_formulas>
| Formula | Pattern | Exemplo | Best For | Ângulo Ideal |
|---------|---------|---------|----------|--------------|
| **KEYWORD FIRST** | [Keyword]: [Promise] | "Investimentos: Os Erros que Destroem seu Patrimônio" | High search volume | TRADUTOR |
| **HOW TO** | Como [Result] [Qualifier] | "Como Investir com Pouco Dinheiro (Guia Prático)" | Tutorials | TRADUTOR |
| **NUMBER LIST** | [#] [Objects] que [Impact] | "7 Hábitos que Separam Quem Cresce de Quem Estagna" | Lists | TRADUTOR, HEREGE |
| **QUESTION** | [Question]? [Tease] | "Por que Produtividade Virou Armadilha?" | Problem-aware | HEREGE |
| **REVELATION** | A Verdade sobre [Topic] | "A Verdade sobre Renda Passiva" | Myth-busting | HEREGE |
| **YEAR/CURRENT** | [Topic] em [Year] | "Investimentos em 2024 (O que Mudou)" | Evergreen | VISIONÁRIO |
| **VS/COMPARISON** | [A] vs [B]: [Verdict] | "Tesouro vs CDB: Qual Faz Mais Sentido?" | Comparisons | TRADUTOR |
| **CASE STUDY** | Como [Subject] [Achieved] | "De Burnout para Equilíbrio em 6 Meses" | Stories | TESTEMUNHA |
| **WARNING** | [Attention]: [Topic] | "Antes de Buscar Produtividade, Assista Isso" | Problems | HEREGE |
| **ULTIMATE** | [Topic]: Guia Completo | "Fundos Imobiliários: Guia Completo para Iniciantes" | Comprehensive | TRADUTOR |
</titulo_formulas>

<power_words_tribais>
USE COM MODERAÇÃO (autenticidade > hype):

CLAREZA: Simples, Explicado, Passo a passo, Completo, Prático
TRANSFORMAÇÃO: Mudança, Diferente, Novo olhar, Perspectiva
VERDADE: Verdade, Real, Honesto, O que ninguém fala
ESPECIFICIDADE: Exato, Específico, Detalhado, Completo
VULNERABILIDADE: Minha jornada, Aprendi, Errei, Descobri
RESULTADO: Funciona, Testado, Resultado, Na prática

⚠️ EVITE (conflitam com autenticidade tribal):
- "Garantido", "100%", "Infalível" → Promessas absolutas
- "Segredo", "Hack", "Truque" → Soa como guru
- "Chocante", "Impressionante" → Clickbait vazio
- "Exclusivo", "Único" → Arrogância
- Qualquer termo listado em termos_proibidos da marca
</power_words_tribais>

<description_templates>
TEMPLATE A - Valor Direto (TRADUTOR):
"[Primary Keyword]: Neste vídeo, vou te mostrar [specific result] de um jeito que faz sentido. [Unique angle] que [benefit]. Assista até o final para [bonus]..."

TEMPLATE B - Problema-Solução (HEREGE):
"[Problem statement]? A resposta que você ouviu até agora provavelmente está errada. Neste vídeo, mostro [alternative perspective] que [result]. [Authority/experience]..."

TEMPLATE C - História (TESTEMUNHA):
"[Personal hook - momento de virada]. Neste vídeo, compartilho [what you learned] e como isso [transformation]. Se você [identification], esse vídeo é pra você..."

TEMPLATE D - Visão (VISIONÁRIO):
"E se [possibility]? Neste vídeo, exploro [future/alternative] e como você pode [action]. [Why this matters now]..."

TEMPLATE E - Clareza (TRADUTOR):
"[Topic] pode parecer complicado, mas não precisa ser. Neste vídeo, simplifico [complex thing] em [simple framework]. Você vai sair sabendo [specific skill]..."
</description_templates>

<cta_templates_tribais>
ENGAGEMENT (convite, não comando):
"💬 Me conta nos comentários: [specific question related to video]? Quero ouvir sua perspectiva."

SUBSCRIBE (valor, não pedido):
"🔔 Se esse conteúdo mudou como você vê [topic], se inscreve pra continuar essa conversa. Toda semana tem conteúdo novo sobre [niche]."

SHARE (movimento, não métrica):
"Se conhece alguém que precisa ouvir isso, compartilha. Às vezes uma perspectiva diferente muda tudo."
</cta_templates_tribais>

<tag_strategy>
ORDEM DE PRIORIDADE:
1. EXACT MATCH: Keyword primária exata
2. LONG-TAIL: Variações específicas da keyword
3. TOPIC BROAD: Termos amplos do tema
4. TRIBE IDENTITY: Tags que identificam a comunidade
5. CHANNEL: Tags de consistência do canal
6. RELATED: Tópicos relacionados
7. INTENT: Variações por intenção de busca
</tag_strategy>

<anti_patterns_seo>
NUNCA produza SEO que:
- Use clickbait que o vídeo não entrega
- Prometa resultados absolutos ("100% garantido")
- Soe como guru ou coach genérico
- Sacrifique autenticidade por CTR
- Use termos proibidos da marca
- Tenha keyword stuffing artificial
- Ignore o ângulo tribal do conteúdo
- Atraia o público errado (cliques vazios)
</anti_patterns_seo>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. NUNCA inclua rótulos como "Título:", "Descrição:" no conteúdo dos campos
3. Cada campo deve conter texto limpo e pronto para uso
4. Títulos devem respeitar limite de 70 caracteres visíveis
5. Descrição above_the_fold deve ter exatamente 150 caracteres
6. Tags devem somar no máximo 500 caracteres
7. NÃO use termos proibidos listados na entrada
8. Alinhe fórmulas e tom com o ângulo tribal especificado
</regras_output>

<formato_saida>
{
  "titulo": {
    "principal": "Título otimizado (máx 70 chars visíveis)",
    "caracteres": 65,
    "formula_usada": "REVELATION | HOW TO | etc",
    "angulo_tribal_aplicado": "herege | visionario | tradutor | testemunha",
    "keyword_position": "chars 1-20",
    "variacoes": ["Variação A", "Variação B", "Variação C"]
  },
  "descricao": {
    "above_the_fold": "Primeiros 150 caracteres otimizados para busca e clique...",
    "corpo_completo": "Descrição completa formatada com estrutura abaixo...",
    "caracteres_total": 2500,
    "estrutura": {
      "hook": "Primeira frase que continua a promessa do título",
      "valor": "Parágrafo explicando o que o vídeo entrega",
      "contexto": "Por que esse assunto importa agora",
      "timestamps": "00:00 - Intro\n02:00 - [Tópico 1]\n...",
      "cta_engagement": "Pergunta específica para comentários",
      "cta_subscribe": "CTA de inscrição com valor",
      "links_relacionados": "Vídeos relacionados do canal",
      "recursos": "Links mencionados no vídeo",
      "hashtags_desc": "#Hashtag1 #Hashtag2 #Hashtag3",
      "keyword_block": "Parágrafo final com keywords naturais"
    }
  },
  "tags": {
    "lista_ordenada": ["exact_match", "long_tail_1", "broad_1", "tribe_identity", "..."],
    "caracteres_total": 380,
    "estrategia_aplicada": "Descrição da estratégia usada"
  },
  "hashtags": {
    "acima_titulo": ["#Principal", "#Secundario", "#Nicho"],
    "na_descricao": ["#Extra1", "#Extra2"]
  },
  "seo_analysis": {
    "primary_keyword": "keyword principal",
    "keyword_density_titulo": "X ocorrências",
    "keyword_density_descricao": "X ocorrências naturais",
    "search_intent_match": "HIGH | MEDIUM | LOW",
    "angulo_tribal_alinhamento": "Como o SEO reflete o ângulo tribal",
    "ranking_potential": "HIGH | MEDIUM | LOW",
    "authenticity_score": "Avaliação de autenticidade vs clickbait"
  },
  "engagement_hooks": {
    "comment_question": "Pergunta específica que gera discussão genuína",
    "share_trigger": "Por que alguém compartilharia (valor, não viralidade)",
    "tribe_identification": "Como o SEO atrai a tribo certa"
  }
}
</formato_saida>

<exemplo_parcial>
Para vídeo HEREGE sobre produtividade:

{
  "titulo": {
    "principal": "Produtividade Tóxica: O Que Ninguém Te Conta",
    "caracteres": 47,
    "formula_usada": "REVELATION",
    "angulo_tribal_aplicado": "herege",
    "keyword_position": "chars 1-12",
    "variacoes": [
      "A Verdade sobre Produtividade (Não É o Que Você Pensa)",
      "Por Que Ser Mais Produtivo Pode Estar Te Prejudicando",
      "Produtividade: O Mito Que Está Destruindo Sua Energia"
    ]
  },
  "seo_analysis": {
    "primary_keyword": "produtividade",
    "angulo_tribal_alinhamento": "Título desafia o consenso de que 'mais produtividade = melhor', alinhado com ângulo HEREGE",
    "authenticity_score": "ALTO - Promessa honesta, sem clickbait vazio"
  }
}
</exemplo_parcial>
</prompt>`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generates YouTube SEO metadata (title, description, tags, hashtags)
 *
 * @param params - SEO generation parameters including script context and brand settings
 * @returns ServiceResult with comprehensive YouTube metadata
 */
export async function generateYouTubeSEO(
  params: GenerateYouTubeSEOParams
): Promise<GenerateYouTubeSEOResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    const systemPrompt = getYouTubeSEOSystemPrompt(params);
    const userPrompt = buildUserPrompt(params);

    // Use GPT-5-mini for high-quality SEO generation
    const model = "openai/gpt-5-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[YOUTUBE-SEO] API error:", response.status, errorText);
      return {
        success: false,
        error: `YouTube SEO generation failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in YouTube SEO generation response",
      };
    }

    const parsed: YouTubeSEOOutput = JSON.parse(content);

    // Validate response structure
    if (!parsed.titulo || !parsed.descricao || !parsed.tags) {
      console.error("[YOUTUBE-SEO] Invalid response structure:", parsed);
      return {
        success: false,
        error: "Invalid YouTube SEO response structure",
      };
    }

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[YOUTUBE-SEO] Error generating SEO:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Builds user prompt from input parameters
 */
function buildUserPrompt(params: GenerateYouTubeSEOParams): string {
  const parts: string[] = [];

  // Basic info
  parts.push(`## INPUT VARIABLES`);
  parts.push(``);
  parts.push(`**Thumbnail Title (selected):** ${params.thumbnailTitle}`);
  parts.push(`**Theme:** ${params.theme}`);
  parts.push(`**Target Audience:** ${params.targetAudience}`);
  parts.push(`**Primary Keyword:** ${params.primaryKeyword}`);
  parts.push(`**Search Intent:** ${params.searchIntent || "informational"}`);

  if (params.niche) {
    parts.push(`**Niche:** ${params.niche}`);
  }

  if (params.objective) {
    parts.push(`**Objective:** ${params.objective}`);
  }

  // Narrative context
  if (params.narrativeAngle || params.narrativeTitle || params.narrativeDescription) {
    parts.push(``);
    parts.push(`**Narrative Context:**`);
    if (params.narrativeAngle) parts.push(`- Angle: ${params.narrativeAngle}`);
    if (params.narrativeTitle) parts.push(`- Narrative Title: ${params.narrativeTitle}`);
    if (params.narrativeDescription) parts.push(`- Narrative Description: ${params.narrativeDescription}`);
    if (params.coreBelief) parts.push(`- Core Belief: ${params.coreBelief}`);
    if (params.statusQuoChallenged) parts.push(`- Status Quo Challenged: ${params.statusQuoChallenged}`);
  }

  // Secondary keywords
  if (params.secondaryKeywords && params.secondaryKeywords.length > 0) {
    parts.push(``);
    parts.push(`**Secondary Keywords:**`);
    params.secondaryKeywords.forEach(kw => parts.push(`- ${kw}`));
  }

  // Script context (CRITICAL)
  if (params.roteiroContext) {
    parts.push(``);
    parts.push(`**Script Context:**`);
    if (params.roteiroContext.valorCentral) {
      parts.push(`- Core Value: ${params.roteiroContext.valorCentral}`);
    }
    if (params.roteiroContext.hookTexto) {
      parts.push(`- Hook: ${params.roteiroContext.hookTexto}`);
    }
    if (params.roteiroContext.transformacao) {
      parts.push(`- Transformation: ${params.roteiroContext.transformacao}`);
    }
    if (params.roteiroContext.topicos && params.roteiroContext.topicos.length > 0) {
      parts.push(`- Topics Covered:`);
      params.roteiroContext.topicos.forEach((topic, idx) => {
        parts.push(`  ${idx + 1}. ${topic}`);
      });
    }
    if (params.roteiroContext.duracao) {
      parts.push(`- Duration: ${params.roteiroContext.duracao}`);
    }
  }

  // Brand context
  if (params.brand) {
    parts.push(``);
    parts.push(`**Brand Context:**`);
    if (params.brand.voiceTone) parts.push(`- Voice Tone: ${params.brand.voiceTone}`);
    if (params.brand.brandVoice) parts.push(`- Brand Voice: ${params.brand.brandVoice}`);
    if (params.brand.channelName) parts.push(`- Channel Name: ${params.brand.channelName}`);
    if (params.brand.targetAudience) parts.push(`- Target Audience (from brand): ${params.brand.targetAudience}`);
    if (params.brand.preferredCTAs) parts.push(`- Preferred CTAs: ${params.brand.preferredCTAs}`);

    if (params.brand.socialLinks) {
      parts.push(`- Social Links:`);
      if (params.brand.socialLinks.instagram) parts.push(`  • Instagram: ${params.brand.socialLinks.instagram}`);
      if (params.brand.socialLinks.twitter) parts.push(`  • Twitter: ${params.brand.socialLinks.twitter}`);
      if (params.brand.socialLinks.youtube) parts.push(`  • YouTube: ${params.brand.socialLinks.youtube}`);
    }

    if (params.brand.forbiddenTerms && params.brand.forbiddenTerms.length > 0) {
      parts.push(`- Forbidden Terms: ${params.brand.forbiddenTerms.join(", ")}`);
    }
  }

  parts.push(``);
  parts.push(`## REQUIREMENTS`);
  parts.push(``);
  parts.push(`1. Generate YouTube-optimized title (max 70 chars visible, keyword in first 40)`);
  parts.push(`2. Create compelling above-the-fold description (first 150 chars)`);
  parts.push(`3. Include timestamps if duration >5 minutes`);
  parts.push(`4. Generate 10-15 optimized tags (max 500 chars total)`);
  parts.push(`5. Select 3-5 hashtags for above title, 2-3 for description`);
  parts.push(`6. Apply appropriate title formula from the 10 proven formulas`);
  parts.push(`7. Include engagement hooks (comment question, controversy angle, share trigger)`);
  parts.push(`8. Match brand voice tone if provided`);
  parts.push(`9. Avoid forbidden terms if specified`);
  parts.push(``);
  parts.push(`Generate complete YouTube SEO metadata in JSON format.`);

  return parts.join("\n");
}
