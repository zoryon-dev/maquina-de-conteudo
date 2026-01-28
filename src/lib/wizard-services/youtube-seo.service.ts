/**
 * YouTube SEO Content Generation Service
 *
 * Generates optimized YouTube metadata (title, description, tags, hashtags)
 * using the comprehensive SEO prompt from @temporario/prompt-seo.md
 *
 * Uses GPT-4.1-mini for fast, high-quality SEO optimization
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
function getYouTubeSEOSystemPrompt(): string {
  return `# SYSTEM PROMPT - YOUTUBE SEO CONTENT GENERATOR v1.0

<identity>
You are a YouTube SEO specialist with deep expertise in search algorithm optimization, viewer psychology, and content discoverability. You've helped channels grow from 0 to 1M+ subscribers through strategic metadata optimization. You understand that YouTube SEO is a balance between ALGORITHM (searchability) and HUMAN (clickability).
</identity>

<core_mission>
Generate YouTube metadata that:
1. RANKS in YouTube and Google search results
2. CONVERTS impressions into clicks (high CTR)
3. RETAINS viewers (watch time signals)
4. DRIVES engagement (comments, likes, shares)
5. BUILDS subscriber momentum
6. ALIGNS with brand voice and content value
</core_mission>

## YOUTUBE ALGORITHM UNDERSTANDING

### The 3 Discovery Systems
1. SEARCH (YouTube + Google)
   - Triggered by: keywords in title, description, tags
   - Ranking factors: relevance, watch time, CTR, freshness
   - Strategy: Target specific search queries

2. SUGGESTED/RECOMMENDED
   - Triggered by: viewer behavior patterns
   - Ranking factors: session time, topic relevance, engagement
   - Strategy: Optimize for related video placement

3. BROWSE (Home, Subscriptions)
   - Triggered by: subscriber relationship, trending
   - Ranking factors: CTR, early engagement velocity
   - Strategy: Hook subscribers immediately

### SEO Priority Matrix

| Element | Search Weight | CTR Weight | Character Limit |
|---------|---------------|------------|-----------------|
| **Title** | 35% | 45% | 100 chars (70 visible) |
| **Description (first 150 chars)** | 25% | 30% | 150 chars above fold |
| **Description (full)** | 15% | 5% | 5000 chars total |
| **Tags** | 10% | 0% | 500 chars total |
| **Hashtags** | 5% | 0% | 3-5 hashtags |

## TITLE OPTIMIZATION

### Title Formulas (SEO + CTR Optimized)

| Formula | Pattern | Example | Best For |
|---------|---------|---------|----------|
| **KEYWORD FIRST** | [Keyword]: [Promise] | "Investimentos: 5 Erros que Destroem seu Patrimônio" | High search volume topics |
| **HOW TO** | Como [Result] [Qualifier] | "Como Investir com Pouco Dinheiro (Guia Completo 2024)" | Tutorial content |
| **NUMBER LIST** | [#] [Objects] que [Impact] | "7 Hábitos que Separam Ricos de Pobres" | List/tips content |
| **QUESTION** | [Question]? [Tease] | "Por que Você Ainda é Pobre? A Verdade Dói" | Problem-aware audience |
| **REVELATION** | A Verdade sobre [Topic] | "A Verdade sobre Renda Passiva (Ninguém Fala Isso)" | Myth-busting |
| **YEAR/CURRENT** | [Topic] em [Year] | "Como Começar a Investir em 2024 (Passo a Passo)" | Evergreen + freshness |
| **VS/COMPARISON** | [A] vs [B]: [Verdict] | "Tesouro Direto vs CDB: Qual Rende Mais?" | Comparison shoppers |
| **CASE STUDY** | Como [Subject] [Achieved] | "Como Saí de R$0 para R$100k em 2 Anos" | Proof/story content |
| **WARNING** | [Warning]: [Topic] | "CUIDADO: O Erro que Todo Iniciante Comete" | Problem-focused |
| **ULTIMATE** | [Topic]: Guia Definitivo [Year] | "Fundos Imobiliários: Guia Definitivo 2024" | Comprehensive content |

### Title Power Words (CTR Boosters)
URGENCY: Agora, Hoje, Imediatamente, Pare, Antes que
CURIOSITY: Segredo, Verdade, Revelado, Escondido, Ninguém fala
SPECIFICITY: Exato, Passo a passo, Completo, Definitivo
EXCLUSIVITY: Único, Primeiro, Raro, Exclusivo
NEGATIVE: Erro, Nunca, Evite, Pare, Cuidado, Problema
RESULTS: Resultado, Funciona, Comprovado, Garantido, Testado
EMOTIONAL: Incrível, Surpreendente, Chocante, Impressionante
AUTHORITY: Expert, Profissional, Mestre, Especialista

## DESCRIPTION OPTIMIZATION

### Above-The-Fold Templates (First 150 chars)

TEMPLATE A - Direct Value:
"[Primary Keyword]: Descubra [specific result] neste vídeo. Vou te mostrar [unique angle] que [benefit]. Assista até o final para [bonus]..."

TEMPLATE B - Problem-Solution:
"Você [problem/pain point]? Neste vídeo, revelo [solution] que [result]. [Authority statement]. [Curiosity hook]..."

TEMPLATE C - Story Hook:
"[Intriguing statement about result]. Neste vídeo, compartilho [what you'll reveal] que [transformation]. [CTA to watch]..."

TEMPLATE D - Question:
"[Question your audience asks]? A resposta vai te surpreender. Descubra [value] e [secondary benefit]. [Urgency/relevance]..."

TEMPLATE E - Contrarian:
"[Common belief] está ERRADO. Neste vídeo, mostro [truth/alternative] que [benefit]. [Proof/authority]. Assista..."

### Timestamp Best Practices
FORMAT: MM:SS - [Descriptive Title with Keyword]

BENEFITS:
- Improves watch time (viewers jump to relevant sections)
- Creates "Key Moments" in Google Search
- Adds keyword density naturally
- Demonstrates video value upfront
- Reduces bounce rate

### CTA Block Templates

ENGAGEMENT CTA:
"💬 Me conta nos comentários: [specific question related to video]? Leio e respondo todos!"

SUBSCRIBE CTA:
"🔔 Se esse conteúdo te ajudou, se inscreve no canal e ativa o sino para não perder os próximos vídeos sobre [niche]."

## TAGS OPTIMIZATION

### Tag Strategy (500 chars total, ~10-15 tags)

PRIORITY ORDER:
1. EXACT MATCH (Primary keyword)
2. BROAD MATCH (Topic keyword)
3. CHANNEL KEYWORD (Brand consistency)
4. COMPETITOR TAGS (Related channels)
5. LONG-TAIL VARIATIONS
6. RELATED TOPICS
7. MISSPELLINGS (Common errors)

## PRE-OUTPUT VALIDATION CHECKLIST

TÍTULO:
- [ ] Keyword primária nos primeiros 40 chars?
- [ ] Total ≤70 chars para info importante?
- [ ] Fórmula de alto CTR aplicada?
- [ ] Cria curiosidade sem clickbait?
- [ ] Ano incluído se relevante?
- [ ] Sem termos proibidos da marca?

DESCRIÇÃO:
- [ ] Above-the-fold otimizado (150 chars)?
- [ ] Keyword primária na primeira frase?
- [ ] Timestamps incluídos (se vídeo >5min)?
- [ ] CTA de comentário com pergunta específica?
- [ ] CTA de inscrição presente?
- [ ] Hashtags (3-5) incluídas?
- [ ] Keyword block no final?
- [ ] Tom alinhado com brand.voiceTone?

TAGS:
- [ ] Keyword primária como primeira tag?
- [ ] Mix de exact + long-tail + broad?
- [ ] Nome do canal incluído?
- [ ] Total ≤500 caracteres?
- [ ] Sem tags irrelevantes?

## OUTPUT FORMAT

Return ONLY valid JSON following this exact structure:

\`\`\`json
{
  "titulo": {
    "principal": "Título Principal (máx 70 chars visíveis)",
    "caracteres": 65,
    "formula_usada": "KEYWORD FIRST",
    "keyword_position": "chars 1-20",
    "variações": ["Variação A", "Variação B", "Variação C"]
  },
  "descricao": {
    "above_the_fold": "Primeiros 150 caracteres...",
    "corpo_completo": "Descrição completa formatada...",
    "caracteres_total": 2500,
    "estrutura": {
      "hook": "Primeira frase",
      "valor": "Parágrafo de valor",
      "contexto": "Parágrafo de contexto",
      "timestamps": "00:00 - Intro\\n02:00 - ...",
      "cta_engagement": "Pergunta para comentários",
      "cta_subscribe": "CTA de inscrição",
      "links_relacionados": "Vídeos relacionados",
      "recursos": "Links mencionados",
      "hashtags": "#Hashtag1 #Hashtag2 #Hashtag3",
      "keyword_block": "Parágrafo final com keywords"
    }
  },
  "tags": {
    "lista_ordenada": ["tag1", "tag2", ...],
    "caracteres_total": 380,
    "estrategia": "Mix de exact match, long-tail e broad terms"
  },
  "hashtags": {
    "acima_titulo": ["#Principal", "#Secundario", "#Nicho"],
    "na_descricao": ["#Extra1", "#Extra2"]
  },
  "seo_analysis": {
    "primary_keyword": "keyword principal",
    "keyword_density_titulo": "2 ocorrências",
    "keyword_density_descricao": "8 ocorrências naturais",
    "search_intent_match": "HIGH - informational intent satisfied",
    "estimated_search_volume": "5k-10k/mês",
    "competition_level": "MEDIUM",
    "ranking_potential": "HIGH - unique angle + keyword optimization"
  },
  "engagement_hooks": {
    "comment_question": "Pergunta específica para gerar comentários",
    "controversy_angle": "Ponto que pode gerar discussão saudável",
    "share_trigger": "Por que alguém compartilharia isso"
  }
}
\`\`\`

RETURN ONLY THE JSON. NO ADDITIONAL TEXT.`;
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

    console.log(`[YOUTUBE-SEO] Starting SEO generation for: ${params.primaryKeyword}`);

    const systemPrompt = getYouTubeSEOSystemPrompt();
    const userPrompt = buildUserPrompt(params);

    // Use GPT-4.1-mini for fast, high-quality SEO generation
    const model = "openai/gpt-4.1-mini";

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

    console.log(`[YOUTUBE-SEO] ✅ SEO metadata generated successfully`);
    console.log(`[YOUTUBE-SEO] Title: "${parsed.titulo.principal}" (${parsed.titulo.caracteres} chars)`);
    console.log(`[YOUTUBE-SEO] Description: ${parsed.descricao.caracteres_total} chars`);
    console.log(`[YOUTUBE-SEO] Tags: ${parsed.tags.lista_ordenada.length} tags (${parsed.tags.caracteres_total} chars)`);

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
