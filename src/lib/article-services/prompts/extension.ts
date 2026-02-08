/**
 * Article Wizard — Extension Prompts (EXT-01, EXT-02, EXT-03)
 *
 * EXT-01: Article Diagnostician — audits existing article vs competitors
 * EXT-02: Expansion Planner — turns diagnosis into actionable plan
 * EXT-03: Content Expander — generates expanded content for selected fixes
 */

import type { SiteUrlMapEntry } from "../types";

// ============================================================================
// PROMPT EXT-01 — Article Diagnostician
// ============================================================================

export function getArticleDiagnosticianPrompt(params: {
  originalArticle: string;
  originalUrl: string;
  competitorArticles: string;
  targetKeyword: string;
  siteUrlMap?: SiteUrlMapEntry[];
}): string {
  const urlMapSection = params.siteUrlMap?.length
    ? `\n<site_url_map>
${JSON.stringify(params.siteUrlMap.slice(0, 50), null, 2)}
</site_url_map>`
    : "";

  return `<task id="ext-01-article-diagnostician">
<role>
Você é um auditor de conteúdo SEO e GEO. Analise o artigo existente e gere um
diagnóstico completo de gaps, fraquezas e oportunidades de melhoria, comparando
com os artigos concorrentes.
</role>

<original_article>
${params.originalArticle}
</original_article>

<original_url>${params.originalUrl}</original_url>
<target_keyword>${params.targetKeyword}</target_keyword>

<competitor_articles>
${params.competitorArticles}
</competitor_articles>
${urlMapSection}

<diagnosis_framework>
  <analysis name="content_depth">
    Para CADA seção (H2):
    - Word count atual vs. média dos concorrentes para seção equivalente
    - Profundidade: superficial/moderada/profunda
    - Presença de dados/estatísticas com fonte
    - Presença de exemplos práticos ou cases
  </analysis>

  <analysis name="missing_topics">
    Compare headings do artigo com concorrentes:
    - Tópicos cobertos por 3+ concorrentes que o artigo NÃO cobre (gap crítico)
    - Tópicos cobertos por 1-2 concorrentes que agregam valor (gap oportunístico)
  </analysis>

  <analysis name="seo_health">
    - Keyword density, heading structure, meta tags
    - Links internos/externos, imagens, word count
  </analysis>

  <analysis name="geo_health">
    Avalie os 6 critérios GEO de forma resumida:
    - Respostas diretas extraíveis, dados citáveis, estrutura extraível
    - E-E-A-T, cobertura temática, schema/metadata
  </analysis>

  <analysis name="interlinking_opportunities" condition="se site_url_map fornecido">
    - URLs que poderiam ser linkadas neste artigo
    - URLs que poderiam linkar PARA este artigo
  </analysis>
</diagnosis_framework>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "article_url": "<url>",
  "target_keyword": "<keyword>",
  "current_metrics": {
    "word_count": <número>,
    "heading_count": {"h2": <n>, "h3": <n>},
    "internal_links": <número>,
    "external_links": <número>,
    "images": <número>,
    "estimated_seo_score": <0-100>,
    "estimated_geo_score": <0-100>
  },
  "competitor_benchmark": {
    "avg_word_count": <número>,
    "avg_heading_count": <número>,
    "avg_internal_links": <número>,
    "top_competitor": {"url": "<url>", "word_count": <n>, "strengths": ["<ponto>"]}
  },
  "weak_sections": [
    {
      "heading": "<heading H2>",
      "current_word_count": <número>,
      "competitor_avg_word_count": <número>,
      "depth_assessment": "<superficial|moderada|profunda>",
      "issues": ["<issue>"],
      "proposed_expansion": "<descrição>",
      "estimated_word_count_after": <número>,
      "impact": "<alto|médio|baixo>"
    }
  ],
  "missing_sections": [
    {
      "topic": "<tópico ausente>",
      "covered_by": ["<concorrente>"],
      "proposed_heading": "<heading sugerido>",
      "proposed_outline": ["<subtópico>"],
      "estimated_word_count": <número>,
      "impact": "<alto|médio|baixo>",
      "rationale": "<justificativa>"
    }
  ],
  "seo_fixes": [
    {
      "category": "<keyword|structure|meta|links|images>",
      "issue": "<problema>",
      "fix": "<correção>",
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>"
    }
  ],
  "geo_fixes": [
    {
      "criterion": "<critério GEO>",
      "issue": "<problema>",
      "fix": "<correção>",
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>"
    }
  ],
  "interlinking_opportunities": [
    {
      "type": "<inbound|outbound>",
      "target_url": "<URL>",
      "target_title": "<título>",
      "suggested_anchor": "<anchor text>",
      "impact": "<alto|médio|baixo>"
    }
  ],
  "projected_after_all_fixes": {
    "word_count": <número>,
    "seo_score": <0-100>,
    "geo_score": <0-100>,
    "improvement_summary": "<resumo>"
  },
  "priority_ranking": ["<descrição curta, em ordem de prioridade>"]
}
</output_format>

<rules>
- Seja ESPECÍFICO — referencie seções e parágrafos concretos.
- Missing sections limitadas a máximo 5 (as mais impactantes).
- Priority ranking: impacto alto + esforço baixo = prioridade máxima.
- Retorne APENAS o JSON.
</rules>
</task>`;
}

// ============================================================================
// PROMPT EXT-02 — Expansion Planner
// ============================================================================

export function getExpansionPlannerPrompt(params: {
  originalArticle: string;
  diagnosis: string;
  targetKeyword: string;
  brandVoiceProfile?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>\n${params.brandVoiceProfile}\n</brand_voice_profile>`
    : "";

  return `<task id="ext-02-expansion-planner">
<role>
Você é um estrategista de conteúdo que transforma diagnósticos em planos de ação
detalhados com outlines, previews e estimativas de impacto.
</role>

<original_article>
${params.originalArticle}
</original_article>

<diagnosis>
${params.diagnosis}
</diagnosis>

<target_keyword>${params.targetKeyword}</target_keyword>
${brandSection}

<planning_rules>
  Para cada item no diagnóstico:
  - weak_section: outline da expansão, preview de 2-3 parágrafos, fontes sugeridas
  - missing_section: outline completo (H2/H3), preview, ponto de inserção
  - seo_fix: antes/depois quando aplicável
  - geo_fix: técnica GEO, trecho a modificar, preview
</planning_rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "expansion_plan": {
    "total_fixes": <número>,
    "estimated_total_word_addition": <número>,
    "estimated_final_word_count": <número>,
    "estimated_final_seo_score": <0-100>,
    "estimated_final_geo_score": <0-100>
  },
  "section_expansions": [
    {
      "id": "exp_<N>",
      "type": "<weak_section|missing_section>",
      "heading": "<heading>",
      "current_state": "<estado atual ou 'nova seção'>",
      "proposed_state": "<resultado esperado>",
      "outline": ["<subtópico>"],
      "preview_content": "<2-3 parágrafos amostra>",
      "insertion_point": "<após qual H2 ou 'expand_in_place'>",
      "estimated_word_count": <número>,
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>",
      "data_sources_suggested": ["<fonte>"],
      "dependencies": ["<id de outro fix>"]
    }
  ],
  "seo_fixes_detailed": [
    {
      "id": "seo_<N>",
      "category": "<keyword|structure|meta|links|images>",
      "description": "<o que mudar>",
      "before": "<estado atual>",
      "after": "<estado proposto>",
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>"
    }
  ],
  "geo_fixes_detailed": [
    {
      "id": "geo_<N>",
      "criterion": "<critério GEO>",
      "technique": "<técnica>",
      "description": "<o que mudar>",
      "location": "<onde>",
      "before": "<trecho atual>",
      "after": "<trecho proposto>",
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>"
    }
  ],
  "recommended_execution_order": ["<id do fix>"]
}
</output_format>

<rules>
- Previews refletem o brand_voice_profile se fornecido.
- IDs devem ser únicos e referenciáveis (exp_1, seo_1, geo_1).
- Recommended execution order: dependências primeiro, depois impacto/esforço.
- Retorne APENAS o JSON.
</rules>
</task>`;
}

// ============================================================================
// PROMPT EXT-03 — Content Expander
// ============================================================================

export function getContentExpanderPrompt(params: {
  originalArticle: string;
  selectedFixes: string;
  expansionPlan: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  brandVoiceProfile?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>\n${params.brandVoiceProfile}\n</brand_voice_profile>`
    : "";
  const secondarySection = params.secondaryKeywords?.length
    ? `\n<secondary_keywords>${params.secondaryKeywords.join(", ")}</secondary_keywords>`
    : "";

  return `<task id="ext-03-content-expander">
<role>
Você é um redator sênior de conteúdo SEO. Gere o conteúdo expandido para as
correções selecionadas, integrando-as naturalmente ao artigo existente.
</role>

<original_article>
${params.originalArticle}
</original_article>

<selected_fixes>
${params.selectedFixes}
</selected_fixes>

<expansion_plan>
${params.expansionPlan}
</expansion_plan>

<target_keyword>${params.targetKeyword}</target_keyword>
${secondarySection}
${brandSection}

<generation_rules>
  - Integre NATURALMENTE: transições suaves, tom consistente, sem repetições
  - ALTA QUALIDADE: dados com fontes (ou placeholders [NOTA:]), exemplos práticos
  - SEO: keywords naturais, heading hierarchy, alt text sugerido
  - GEO: respostas diretas no início de cada nova seção, parágrafos autocontidos
</generation_rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "expanded_article": "<artigo COMPLETO com expansões integradas, em markdown>",
  "changes_log": [
    {
      "fix_id": "<id>",
      "type": "<section_expansion|new_section|seo_fix|geo_fix>",
      "description": "<resumo>",
      "word_count_added": <número>,
      "location": "<onde>"
    }
  ],
  "metrics_after": {
    "total_word_count": <número>,
    "word_count_added": <número>,
    "new_sections_count": <número>,
    "expanded_sections_count": <número>,
    "seo_fixes_applied": <número>,
    "geo_fixes_applied": <número>
  },
  "editor_review_notes": ["<nota sobre item que precisa revisão humana>"]
}
</output_format>

<rules>
- O expanded_article é o artigo COMPLETO (não apenas partes novas).
- Placeholders: [NOTA: Verificar dado X] ou [IMAGEM: Descrição].
- Mantenha TODO conteúdo original NÃO selecionado para mudança.
- Se brand_voice_profile fornecido, siga writing_guidelines.
- Retorne APENAS o JSON.
</rules>
</task>`;
}
