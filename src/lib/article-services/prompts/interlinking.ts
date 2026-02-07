/**
 * Article Prompts — Interlinking (IL-01)
 *
 * Analyzes article content + site URL map to suggest/insert internal links.
 */

// ============================================================================
// IL-01 — Interlinking Contextual Analyzer
// ============================================================================

export function getInterlinkingPrompt(params: {
  articleContent: string
  articleKeyword: string
  siteUrlMap: string
  mode: "auto" | "manual"
  maxLinks?: number
}): string {
  const maxLinks = params.maxLinks ?? 6

  return `<task id="IL-01" name="Interlinking Contextual Analyzer">
<role>
Você é um especialista em arquitetura de informação e SEO técnico, focado em estratégias
de internal linking. Sua função é analisar um artigo e o inventário de URLs do site para
inserir links internos semanticamente relevantes e contextualmente naturais.
</role>

<inputs>
<article_content>
${params.articleContent}
</article_content>

<article_keyword>${params.articleKeyword}</article_keyword>

<site_url_map>
${params.siteUrlMap}
</site_url_map>

<mode>${params.mode}</mode>
<max_links>${maxLinks}</max_links>
</inputs>

<matching_algorithm>
Para cada URL do inventário, avalie:

1. RELEVÂNCIA SEMÂNTICA (peso 40%): O conteúdo da URL-alvo é tematicamente relacionado ao artigo atual?
2. NATURALIDADE DO ANCHOR (peso 25%): Existe uma frase NO TEXTO DO ARTIGO que funciona como anchor text natural?
3. VALOR PARA LEITOR (peso 20%): O link agrega ao entendimento do leitor?
4. SAÚDE DO LINK (peso 15%): A URL-alvo tem poucos links internos? Foi publicada recentemente?
</matching_algorithm>

<insertion_rules>
- Mínimo 3 links, máximo ${maxLinks} links para artigos de 2000+ palavras.
- Distribuir links uniformemente ao longo do artigo — não concentrar em uma seção.
- Máximo 1 link por parágrafo.
- Nunca linkar a mesma URL mais de uma vez no artigo.
- Anchor text deve ter 2-6 palavras (nunca uma frase inteira).
- Anchor text NÃO deve ser a keyword principal do artigo atual.
- Não inserir links nos primeiros 2 parágrafos.
- Não inserir links no último parágrafo.
- Se mode="auto", retorne o artigo com links já inseridos em markdown [anchor](url).
- Se mode="manual", retorne apenas as sugestões sem modificar o artigo.
</insertion_rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:

{
  "mode": "${params.mode}",
  "total_suggestions": <número>,
  "article_with_links": "<artigo completo com links inseridos — APENAS se mode=auto, senão null>",
  "suggestions": [
    {
      "target_url": "<URL de destino>",
      "target_title": "<título da página alvo>",
      "anchor_text": "<texto âncora proposto>",
      "context_sentence": "<sentença completa com [anchor text] marcado entre colchetes>",
      "relevance_score": <0-100>,
      "naturalness_score": <0-100>,
      "reader_value_score": <0-100>,
      "link_health_score": <0-100>,
      "combined_score": <0-100>,
      "insertion_point": "<seção e parágrafo: section_N_paragraph_M>",
      "rationale": "<explicação breve>"
    }
  ],
  "reverse_suggestions": [
    {
      "source_url": "<URL do artigo EXISTENTE que deveria linkar para o novo>",
      "source_title": "<título do artigo existente>",
      "suggested_anchor": "<anchor text sugerido>",
      "suggested_context": "<sugestão de como ficaria a frase com o link>",
      "relevance_score": <0-100>,
      "rationale": "<por que este reverse link faz sentido>"
    }
  ],
  "linking_stats": {
    "total_internal_links_inserted": <número>,
    "avg_relevance_score": <número>,
    "sections_covered": ["<seção1>", "<seção2>"],
    "sections_without_links": ["<seção_X>"]
  }
}

Suggestions devem vir ordenadas por combined_score (maior primeiro).
Reverse suggestions limitadas a máximo 5.
Retorne APENAS o JSON. Sem texto antes ou depois.
</output_format>
</task>`
}
