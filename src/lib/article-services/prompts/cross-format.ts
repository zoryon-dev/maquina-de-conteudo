/**
 * Article Wizard — Cross-Format Prompts (CROSS-01, CROSS-02, CROSS-03)
 *
 * CROSS-01: LinkedIn Post Deriver
 * CROSS-02: Video Script Deriver
 * CROSS-03: Carousel Deriver
 */

// ============================================================================
// PROMPT CROSS-01 — LinkedIn Post Deriver
// ============================================================================

export function getLinkedInDeriverPrompt(params: {
  articleContent: string;
  articleUrl: string;
  brandVoiceProfile?: string;
  authorPersona?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>\n${params.brandVoiceProfile}\n</brand_voice_profile>`
    : "";
  const authorSection = params.authorPersona
    ? `\n<author_persona>${params.authorPersona}</author_persona>`
    : "";

  return `<task id="cross-01-linkedin-deriver">
<role>
Você é um especialista em conteúdo para LinkedIn com foco em engajamento orgânico
e thought leadership. Derive um post de LinkedIn a partir do artigo.
</role>

<article_content>
${params.articleContent.substring(0, 8000)}
</article_content>

<article_url>${params.articleUrl}</article_url>
${brandSection}
${authorSection}

<structure>
1. HOOK (1ª linha): Frase impactante que para o scroll
2. CONTEXTO (2-3 linhas): Expanda o hook brevemente
3. INSIGHTS (3-5 itens): Pontos mais valiosos do artigo (emoji + texto curto)
4. BRIDGE (1-2 linhas): Transição para o CTA
5. CTA (1 linha): "Link no primeiro comentário 👇"
6. HASHTAGS (3-5): Na última linha
</structure>

<rules>
- MÁXIMO 3000 caracteres
- Tom pessoal e opinativo (LinkedIn pede posicionamento)
- O post deve ter VALOR STANDALONE
- Link vai no PRIMEIRO COMENTÁRIO
- Nenhuma frase com mais de 20 palavras
- Incluir 1-2 insights exclusivos que NÃO estão no artigo
</rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "format": "linkedin_post",
  "text": "<post completo>",
  "char_count": <número>,
  "hashtags": ["#tag1", "#tag2"],
  "cta_url": "${params.articleUrl}",
  "hook_style": "<dado|contrarian|pergunta|observação>",
  "suggested_image": "<descrição de imagem>",
  "engagement_tips": ["<dica>"],
  "first_comment_text": "<texto com link para primeiro comentário>"
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT CROSS-02 — Video Script Deriver
// ============================================================================

export function getVideoScriptDeriverPrompt(params: {
  articleContent: string;
  articleUrl: string;
  brandVoiceProfile?: string;
  presenterPersona?: string;
  targetPlatform?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>\n${params.brandVoiceProfile}\n</brand_voice_profile>`
    : "";
  const presenterSection = params.presenterPersona
    ? `\n<presenter_persona>${params.presenterPersona}</presenter_persona>`
    : "";
  const platform = params.targetPlatform || "reels";

  return `<task id="cross-02-video-script-deriver">
<role>
Você é um roteirista de vídeos curtos (Instagram Reels, TikTok, YouTube Shorts).
Derive um roteiro de 60-90 segundos otimizado para retenção nos primeiros 3 segundos.
</role>

<article_content>
${params.articleContent.substring(0, 8000)}
</article_content>

<article_url>${params.articleUrl}</article_url>
<target_platform>${platform}</target_platform>
${brandSection}
${presenterSection}

<script_structure>
  hook (0:00-0:05, 10-15 palavras): Frase que PRENDE. NUNCA "Olá" ou "Neste vídeo..."
  problema (0:05-0:15, 25-35 palavras): Dor que o artigo resolve. Use "você".
  pontos_chave (0:15-0:55, 80-120 palavras): 3 pontos máximo. Linguagem ORAL.
  cta (0:55-1:15, 20-30 palavras): "Link na bio para o guia completo"
</script_structure>

<rules>
- Linguagem ORAL — escrita para ser FALADA
- Total: 150-225 palavras (60-90 segundos)
- Hook funciona nos primeiros 3 SEGUNDOS
- Máximo 3 pontos-chave
- Indicações visuais para cada segmento
- Incluir 2 hooks alternativos
</rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "format": "short_video_script",
  "target_platform": "${platform}",
  "duration_estimate": "<Xs>",
  "total_word_count": <número>,
  "script": [
    {
      "timecode": "0:00-0:05",
      "type": "hook",
      "spoken": "<texto falado>",
      "visual": "<descrição visual>",
      "editing_note": "<nota de edição>"
    }
  ],
  "cta_url": "${params.articleUrl}",
  "suggested_caption": "<caption para o post>",
  "suggested_hashtags": ["#tag"],
  "thumbnail_suggestion": "<descrição de thumbnail>",
  "hook_alternatives": ["<hook alt 1>", "<hook alt 2>"]
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT CROSS-03 — Carousel Deriver
// ============================================================================

export function getCarouselDeriverPrompt(params: {
  articleContent: string;
  articleUrl: string;
  brandVoiceProfile?: string;
  instagramHandle?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>\n${params.brandVoiceProfile}\n</brand_voice_profile>`
    : "";
  const handleSection = params.instagramHandle
    ? `\n<instagram_handle>${params.instagramHandle}</instagram_handle>`
    : "";

  return `<task id="cross-03-carousel-deriver">
<role>
Você é um designer de conteúdo para Instagram especializado em carrosséis educativos.
Derive um carrossel de 8-12 slides otimizado para saves e shares.
</role>

<article_content>
${params.articleContent.substring(0, 8000)}
</article_content>

<article_url>${params.articleUrl}</article_url>
${brandSection}
${handleSection}

<carousel_structure>
  Slide 1 (cover): Headline impactante (máx 8 palavras) + subheadline opcional
  Slide 2 (context): Contextualiza o tema (máx 25 palavras)
  Slides 3-N (content): 1 insight por slide. Headline curto + body (máx 25 palavras)
  Penúltimo (summary, opcional): Recap dos pontos
  Último (cta): "Salve este post" + "Link na bio" + handle
</carousel_structure>

<rules>
- Mínimo 8, máximo 12 slides
- NENHUM slide com mais de 30 palavras total
- Cover deve gerar curiosidade para swipe
- Cada slide funciona como SCREENSHOT compartilhável
- CTA pede SAVE primeiro (melhor para algoritmo), link depois
- Caption máximo 2200 caracteres
- Hashtags: 3-5 de alta relevância
</rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "format": "instagram_carousel",
  "total_slides": <número>,
  "slides": [
    {
      "number": 1,
      "type": "cover",
      "headline": "<máx 8 palavras>",
      "subheadline": "<máx 12 palavras ou null>",
      "visual_note": "<sugestão visual>",
      "background_style": "<solid_color|gradient|image_overlay>"
    },
    {
      "number": 2,
      "type": "content",
      "headline": "<3-6 palavras>",
      "body": "<máx 25 palavras>",
      "visual_note": "<ícone ou ilustração>",
      "numbering": "<1/N ou null>"
    }
  ],
  "caption": "<caption completa>",
  "hashtags": ["#tag1", "#tag2"],
  "posting_tips": ["<dica>"],
  "tribal_integration": {
    "compatible": true,
    "tribal_variables": {
      "carousel_topic": "<tópico>",
      "carousel_angle": "<ângulo>",
      "carousel_hook": "<hook>",
      "slides_content": "<conteúdos por slide>"
    }
  }
}
</output_format>
</task>`;
}
