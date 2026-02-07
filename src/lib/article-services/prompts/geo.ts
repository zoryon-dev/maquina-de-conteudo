/**
 * Article Wizard — GEO Prompts (GEO-01, GEO-02)
 *
 * GEO-01: AI-Readiness Analyzer — evaluates article for LLM discoverability
 * GEO-02: AI-Readiness Optimizer — applies GEO fixes to improve AI citation probability
 */

// ============================================================================
// PROMPT GEO-01 — AI-Readiness Analyzer
// ============================================================================

export function getGeoAnalyzerPrompt(params: {
  articleContent: string;
  primaryKeyword: string;
  targetQueries?: string[];
}): string {
  const queriesSection = params.targetQueries?.length
    ? `<target_queries>
${params.targetQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}
</target_queries>`
    : `<target_queries>
Não fornecidas. Gere 5-7 queries prováveis que um usuário faria a um LLM sobre "${params.primaryKeyword}".
</target_queries>`;

  return `<task id="geo-01-ai-readiness-analyzer">
<role>
Você é um especialista em Generative Engine Optimization (GEO) — a disciplina de
otimizar conteúdo para ser encontrado, compreendido e citado por LLMs como ChatGPT,
Perplexity, Gemini e outros mecanismos de busca com IA.
</role>

<context>
Avalie o quão "AI-ready" este artigo é — quão provável é que LLMs encontrem, extraiam
e citem informações dele. Esta análise roda em PARALELO com o SEO check tradicional.
</context>

<artigo>
${params.articleContent}
</artigo>

<keyword>${params.primaryKeyword}</keyword>

${queriesSection}

<evaluation_criteria>
  <criterion id="direct_answers" weight="alto">
    Respostas Diretas Extraíveis — O artigo contém respostas diretas a perguntas que
    usuários fariam a um LLM?
    Verifique:
    - Parágrafos autocontidos que respondem sem depender de contexto anterior
    - "Definition boxes" — parágrafos curtos que definem conceitos de forma isolável
    - Respostas no início das seções (não enterradas no meio)
    - Formato "Pergunta → Resposta direta → Elaboração"
    - Cada seção H2/H3 pode ser extraída como chunk independente
  </criterion>

  <criterion id="citable_data" weight="alto">
    Dados Citáveis — Estatísticas, dados ou fatos que LLMs podem citar com atribuição?
    Verifique:
    - Estatísticas com fonte explícita ("Segundo [fonte], [dado]")
    - Dados recentes (últimos 2 anos)
    - Dados ORIGINAIS que LLMs não encontrariam em outro lugar
    - Números formatados de forma clara (não ambígua)
    - Fontes autoritativas (gov, edu, pesquisas publicadas)
  </criterion>

  <criterion id="extractable_structure" weight="medio">
    Estrutura Extraível — A estrutura facilita extração por LLMs?
    Verifique:
    - Headings H2/H3 descritivos (usados como labels para chunks)
    - Listas e tabelas formatadas em Markdown válido
    - Parágrafos curtos e focados (1 ideia por parágrafo)
    - Ausência de "walls of text"
    - Seções com tamanho consistente
  </criterion>

  <criterion id="authority_eeat" weight="medio">
    Autoridade e E-E-A-T — Demonstra Experience, Expertise, Authoritativeness, Trust?
    Verifique:
    - Autor com credenciais/bio
    - Fontes autoritativas (não blogs genéricos)
    - Experiência prática (exemplos reais, cases, "nós testamos...")
    - Conteúdo vai além do genérico (insights proprietários)
  </criterion>

  <criterion id="topic_coverage" weight="alto">
    Cobertura Temática Completa — Artigo é "fonte única" para o tema?
    Verifique:
    - Cobre sub-perguntas que LLMs gerariam sobre o tema
    - Sem gaps que fariam LLM buscar complemento em outras fontes
    - Cobertura: definição, como funciona, exemplos, prós/contras, FAQ
    - Perspectivas e nuances que LLMs valorizam
  </criterion>

  <criterion id="schema_metadata" weight="baixo">
    Schema e Metadata para AI — Metadados estruturados facilitam indexação?
    Verifique:
    - Potencial para schema markup (Article, FAQ, HowTo)
    - Meta description como resumo autossuficiente
    - Structured data parseável por crawlers de LLM
  </criterion>
</evaluation_criteria>

<scoring>
Score overall = MÉDIA PONDERADA (alto=3x, médio=2x, baixo=1x).
Cada critério: 0-100.
</scoring>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "geo_score_overall": <0-100>,
  "target_queries_evaluated": ["<query 1>", "<query 2>", ...],
  "breakdown": {
    "direct_answers": {
      "score": <0-100>,
      "issues": ["<issue específica>"],
      "recommendations": ["<recomendação acionável>"],
      "examples": {
        "good": ["<trecho bem extraível>"],
        "needs_improvement": ["<trecho que poderia ser mais extraível>"]
      }
    },
    "citable_data": {
      "score": <0-100>,
      "issues": ["<issue>"],
      "recommendations": ["<rec>"],
      "stats_found": <número com fonte>,
      "stats_without_source": <número sem fonte>
    },
    "extractable_structure": {
      "score": <0-100>,
      "issues": ["<issue>"],
      "recommendations": ["<rec>"]
    },
    "authority_eeat": {
      "score": <0-100>,
      "issues": ["<issue>"],
      "recommendations": ["<rec>"]
    },
    "topic_coverage": {
      "score": <0-100>,
      "issues": ["<issue>"],
      "recommendations": ["<rec>"],
      "missing_subtopics": ["<subtópico não coberto>"]
    },
    "schema_metadata": {
      "score": <0-100>,
      "issues": ["<issue>"],
      "recommendations": ["<rec>"]
    }
  },
  "priority_fixes": [
    {
      "fix": "<descrição da correção>",
      "impact": "<alto|médio|baixo>",
      "effort": "<alto|médio|baixo>",
      "criterion": "<critério que esta fix atende>",
      "estimated_score_improvement": <pontos estimados>
    }
  ],
  "ai_citation_probability": {
    "score": <0-100>,
    "assessment": "<avaliação textual>"
  }
}
</output_format>

<rules>
- Priority fixes ordenadas por impacto DESC, esforço ASC.
- Máximo 7 priority fixes.
- Cada issue deve ser ESPECÍFICA (referenciar seção/parágrafo).
- Cada recommendation deve ser ACIONÁVEL.
- Retorne APENAS o JSON. Sem texto antes ou depois.
</rules>
</task>`;
}

// ============================================================================
// PROMPT GEO-02 — AI-Readiness Optimizer
// ============================================================================

export function getGeoOptimizerPrompt(params: {
  articleContent: string;
  geoReport: string;
  priorityFixes: string;
  brandVoiceProfile?: string;
}): string {
  const brandSection = params.brandVoiceProfile
    ? `\n<brand_voice_profile>
${params.brandVoiceProfile}
</brand_voice_profile>
<instrucao_brand>Mantenha o tom e estilo do brand voice profile.</instrucao_brand>`
    : "";

  return `<task id="geo-02-ai-readiness-optimizer">
<role>
Você é um editor especializado em Generative Engine Optimization. Aplique correções
ao artigo para melhorar seu GEO score, tornando-o mais provável de ser citado por LLMs.
</role>

<context>
Aplique as correções priorizadas para melhorar o AI-readiness do conteúdo, sem
comprometer a qualidade SEO ou a legibilidade humana.
</context>

<artigo>
${params.articleContent}
</artigo>

<geo_report>
${params.geoReport}
</geo_report>

<priority_fixes>
${params.priorityFixes}
</priority_fixes>
${brandSection}

<optimization_techniques>
  <technique name="direct_answer_insertion">
    - Adicione parágrafo de abertura em cada H2 com resposta direta à pergunta implícita
    - Crie "definition boxes" — parágrafos curtos autocontidos para conceitos-chave
    - Reestruture parágrafos narrativos: informação-chave primeiro (pirâmide invertida)
  </technique>

  <technique name="data_citation_improvement">
    - Adicione atribuição explícita: "Segundo [fonte], ..."
    - Se não há dados, insira [NOTA: Adicionar estatística sobre X com fonte]
    - Reformate dados para formato mais citável
    - Adicione contexto temporal: "Em 2025, ..." ou "Dados de [ano] mostram que..."
  </technique>

  <technique name="structure_optimization">
    - Quebre parágrafos com mais de 4 sentenças
    - Transforme headings genéricos em descritivos/pergunta
    - Adicione listas onde há enumerações em prosa
    - Garanta que cada seção funcione como chunk independente
  </technique>

  <technique name="eeat_enhancement">
    - Adicione frases de experiência: "Na nossa experiência...", "Ao testar..."
    - Inclua exemplos concretos e cases reais (ou placeholders)
  </technique>

  <technique name="coverage_expansion">
    - Adicione breves parágrafos cobrindo subtópicos faltantes
    - Adicione seção FAQ com perguntas que LLMs receberiam sobre o tema
  </technique>
</optimization_techniques>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "optimized_article": "<artigo completo com otimizações GEO aplicadas>",
  "changes_applied": [
    {
      "fix_id": <número>,
      "description": "<o que foi mudado>",
      "criterion_improved": "<critério GEO melhorado>",
      "location": "<seção/parágrafo>",
      "before_snippet": "<trecho antes>",
      "after_snippet": "<trecho depois>"
    }
  ],
  "estimated_new_scores": {
    "geo_score_overall": <novo score>,
    "direct_answers": <novo score>,
    "citable_data": <novo score>,
    "extractable_structure": <novo score>,
    "authority_eeat": <novo score>,
    "topic_coverage": <novo score>,
    "schema_metadata": <novo score>
  },
  "editor_notes": ["<nota para revisão humana>"]
}
</output_format>

<rules>
- NUNCA invente dados ou estatísticas. Use placeholders [NOTA: ...] quando necessário.
- Não remova conteúdo existente — apenas adicione, reestruture ou reformate.
- Cada mudança deve ser rastreável (antes/depois).
- Otimizações GEO NÃO devem prejudicar SEO.
- Se uma fix requer informação real, use placeholder.
- Retorne APENAS o JSON.
</rules>
</task>`;
}
