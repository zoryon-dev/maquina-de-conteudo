/**
 * Article Wizard — Site Intelligence Prompts
 *
 * Prompts for brand voice extraction (SI-02) and keyword gap analysis (SI-03).
 */

// ============================================================================
// SI-02: BRAND VOICE EXTRACTOR
// ============================================================================

export function getBrandVoiceExtractorPrompt(params: {
  brandName: string
  sampleArticles: Array<{ url: string; title: string; content: string }>
}): string {
  const articlesBlock = params.sampleArticles
    .map(
      (a, i) =>
        `--- Artigo ${i + 1} ---\nURL: ${a.url}\nTítulo: ${a.title}\n\n${a.content.slice(0, 5000)}`,
    )
    .join("\n\n")

  return `Você é um linguista computacional especializado em análise de estilo editorial e brand voice.
Analise as amostras de conteúdo da marca "${params.brandName}" e extraia um perfil detalhado de voz.

## Artigos para Análise

${articlesBlock}

## Análise Requerida

Para cada artigo, analise:
1. **Tom e Registro**: formalidade, personalidade, humor, autoridade
2. **Pessoa Gramatical**: predominância (eu, nós, você, impessoal)
3. **Estrutura Textual**: parágrafos, sentenças, listas, headings, ênfase
4. **Abertura e Fechamento**: padrões de abertura, transição, fechamento
5. **Uso de Dados**: frequência, formato de citação
6. **Vocabulário**: termos recorrentes, evitados, anglicismos, metáforas
7. **CTA e Conversão**: tipo, posicionamento, linguagem

## Regras
- Analise TODOS os artigos. Priorize padrões consistentes (3+ artigos).
- Writing guidelines devem ser instruções ACIONÁVEIS.
- Retorne APENAS JSON válido.

## Formato de Saída

\`\`\`json
{
  "brand_name": "${params.brandName}",
  "analyzed_articles": ${params.sampleArticles.length},
  "voice_profile": {
    "tone": "<descrição do tom geral>",
    "formality_level": "<formal|semi-formal|informal|coloquial>",
    "personality": "<neutro|opinativo|provocativo|inspiracional|didático>",
    "person": "<primeira_singular|primeira_plural|segunda_pessoa|terceira_impessoal>",
    "authority_level": "<peer|mentor|especialista|guru>",
    "humor_usage": "<nunca|raro|frequente|central>",
    "avg_paragraph_length": "<X-Y sentenças>",
    "avg_sentence_length": "<X-Y palavras>",
    "heading_style": "<padrão de headings>",
    "heading_frequency": "<a cada ~X palavras>",
    "list_preference": "<bullets|numeradas|inline|mínimo>",
    "data_usage": "<padrão de uso de dados>",
    "vocabulary_patterns": ["termo1", "termo2"],
    "avoided_terms": ["termo1", "termo2"],
    "opening_pattern": "<padrão de abertura>",
    "closing_pattern": "<padrão de fechamento>",
    "transition_style": "<estilo de transição>",
    "cta_style": "<estilo de CTA>",
    "unique_traits": "<características únicas>"
  },
  "writing_guidelines": [
    "<diretriz acionável 1>",
    "<diretriz acionável 2>",
    "<diretriz acionável 3>",
    "<diretriz acionável 4>",
    "<diretriz acionável 5>"
  ],
  "sample_phrases": {
    "typical_openings": ["frase1", "frase2"],
    "typical_transitions": ["frase1", "frase2"],
    "typical_closings": ["frase1", "frase2"]
  }
}
\`\`\``
}

// ============================================================================
// SI-03: KEYWORD GAP ANALYZER
// ============================================================================

export function getKeywordGapAnalyzerPrompt(params: {
  siteUrlMap: string
  competitorData: string
  targetNiche: string
}): string {
  return `Você é um estrategista de SEO especializado em análise de gaps competitivos de conteúdo.

## Inventário de URLs do Cliente

${params.siteUrlMap}

## Dados dos Concorrentes (via Tavily)

${params.competitorData}

## Nicho Alvo

${params.targetNiche}

## Processo de Análise

1. **Mapeamento do Cliente**: identifique clusters temáticos, keywords implícitas, profundidade de cobertura
2. **Mapeamento dos Concorrentes**: tópicos cobertos, tópicos em comum (alta relevância)
3. **Identificação de Gaps**: keywords que concorrentes cobrem e cliente não, clusters subexplorados
4. **Priorização**: relevância, volume estimado, concorrência, facilidade de produção

## Regras
- Priorize gaps CRÍTICOS (cobertos por 2+ concorrentes).
- Sugira ângulos DIFERENCIADOS.
- Conecte gaps a artigos existentes (potencial de interlinking).
- Limite critical_gaps e opportunistic_gaps a máximo 10 cada.
- Retorne APENAS JSON válido.

## Formato de Saída

\`\`\`json
{
  "analysis_date": "${new Date().toISOString()}",
  "gaps_identified": 0,
  "critical_gaps": [
    {
      "keyword": "<keyword>",
      "search_volume_estimate": "<alto|médio|baixo>",
      "competition_level": "<alto|médio|baixo>",
      "covered_by_competitors": ["concorrente1"],
      "suggested_article_type": "<how-to|listicle|guia|comparativo>",
      "suggested_angle": "<ângulo diferenciado>",
      "related_existing_articles": ["url_existente"],
      "priority_score": 0
    }
  ],
  "opportunistic_gaps": [
    {
      "keyword": "<keyword>",
      "search_volume_estimate": "<alto|médio|baixo>",
      "covered_by": "<concorrente>",
      "suggested_article_type": "<tipo>",
      "priority_score": 0
    }
  ],
  "underexplored_clusters": [
    {
      "cluster_name": "<nome>",
      "current_articles": 0,
      "recommended_articles": 0,
      "suggested_topics": ["tópico1", "tópico2"]
    }
  ]
}
\`\`\``
}
