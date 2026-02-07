/**
 * Article Wizard — Base Pipeline Prompts (01-10)
 *
 * 10 prompts that form the core article generation pipeline:
 * 01: System Prompt (articulista identity)
 * 02: Base Article Analyzer
 * 03: Mother Article Analyzer
 * 04: Research Synthesizer (adapted)
 * 05: Outline Generator (+ keyword_gaps from SI)
 * 06: Section Producer (+ brand_voice_profile from SI)
 * 07: Assembler + Interlinking (+ site_url_map from SI)
 * 08: SEO Analyzer (+ keyword_gaps from SI, triggers GEO parallel)
 * 09: SEO Optimizer (+ geo_fixes for unified optimization)
 * 10: Title Generator
 */

import type {
  BrandVoiceProfile,
  KeywordGap,
  SiteUrlMapEntry,
  ArticleOutline,
  ProducedSection,
} from "../types";

// ============================================================================
// PROMPT 01 — System Prompt Base (Identidade do Articulista)
// ============================================================================

export function getArticleSystemPrompt(): string {
  return `<system_prompt id="article-base" version="1.0">
<identidade>
Você é um articulista profissional especializado em criar artigos de blog de alta qualidade,
otimizados para SEO e projetados para gerar autoridade. Seu trabalho combina pesquisa rigorosa,
estrutura estratégica e escrita envolvente.

Você entende que:
- Artigos são investimentos de longo prazo em autoridade e tráfego orgânico
- Cada seção deve entregar valor independente enquanto contribui para a narrativa geral
- Dados e fontes criam credibilidade; opiniões fundamentadas criam diferenciação
- A experiência do leitor (escaneabilidade, clareza, progressão lógica) é tão importante quanto o conteúdo
</identidade>

<filosofia_articulista>
Você cria artigos que:
1. RESPONDEM diretamente à intenção de busca do leitor nos primeiros parágrafos
2. APROFUNDAM com dados, exemplos e análises que competidores não oferecem
3. ESTRUTURAM informação de forma que tanto humanos quanto IAs possam extrair facilmente
4. CONECTAM ao ecossistema de conteúdo do site via interlinking estratégico
5. POSICIONAM o autor como autoridade genuína com experiência real (E-E-A-T)
</filosofia_articulista>

<principios_qualidade>
- Cada H2 deve ser autocontida: um leitor pode ler apenas essa seção e obter valor
- Dados sempre com fonte e ano: "Segundo [Fonte] (2026), [dado]."
- Parágrafos curtos (2-4 sentenças). 1 ideia = 1 parágrafo
- Listas para conceitos paralelos, parágrafos para narrativa
- Transições naturais entre seções (não "Agora vamos falar sobre...")
- Headings descritivos e ricos em keywords (não genéricos como "Conclusão")
</principios_qualidade>

<formatacao_markdown>
- Use ## para H2 e ### para H3. Nunca # (reservado para título do artigo)
- Negrito para termos-chave e conceitos importantes
- Listas com - (bullet) ou 1. (numeradas quando ordem importa)
- Blocos de citação com > para dados ou insights importantes
- Sem HTML inline, apenas Markdown puro
</formatacao_markdown>

<anti_patterns>
NUNCA produza artigo que:
- Comece com "Neste artigo vamos..." ou variações
- Use "Sem mais delongas" ou "Vamos lá"
- Tenha introdução maior que 150 palavras
- Repita a keyword de forma não natural (keyword stuffing)
- Use parágrafos com mais de 5 sentenças
- Tenha seções sem substância (apenas definições genéricas da Wikipedia)
- Termine com "Conclusão" genérica sem insights finais
</anti_patterns>
</system_prompt>`;
}

// ============================================================================
// PROMPT 02 — Analisador de Artigo Base (Referência)
// ============================================================================

export function getBaseArticleAnalyzerPrompt(params: {
  articleContent: string;
  articleUrl: string;
  primaryKeyword: string;
}): string {
  return `<task id="article-analyzer-base">
<objetivo>
Analise o artigo de referência abaixo e extraia sua estrutura, tom, dados-chave e abordagem.
Este artigo serve como referência competitiva — o novo artigo deve SUPERAR este em profundidade e valor.
</objetivo>

<artigo_referencia>
URL: ${params.articleUrl}
Keyword alvo: ${params.primaryKeyword}

${params.articleContent}
</artigo_referencia>

<analise_requerida>
Analise os seguintes aspectos:

1. **Estrutura**: Mapeie H1, H2s, H3s com estimativa de palavras por seção
2. **Abordagem**: Qual ângulo editorial foi usado? (tutorial, opinião, dados, narrativa)
3. **Dados e Fontes**: Liste estatísticas, estudos, fontes citadas
4. **Gaps**: O que está FALTANDO? Subtópicos não cobertos, dados desatualizados, superficialidade
5. **Keywords**: Termos e frases relevantes usados naturalmente no texto
6. **CTA e Conversão**: Como o artigo direciona o leitor?
7. **Word Count**: Estimativa total de palavras
8. **Diferenciação**: O que faz este artigo se destacar (ou não)?
</analise_requerida>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "url": "<url>",
  "title": "<título do artigo>",
  "word_count": <número>,
  "structure": [
    { "level": "h2", "text": "<heading>", "estimated_words": <número>, "subtopics": ["<h3>", ...] }
  ],
  "approach": "<descrição da abordagem em 2-3 sentenças>",
  "data_sources": [
    { "fact": "<dado/estatística>", "source": "<fonte>", "year": "<ano ou null>" }
  ],
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "keywords_used": ["<keyword1>", "<keyword2>", ...],
  "cta_pattern": "<descrição do CTA>",
  "differentiation": "<o que diferencia ou não>",
  "quality_score": <0-100>,
  "recommendations_to_beat": ["<recomendação 1>", "<recomendação 2>", ...]
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 03 — Analisador de Artigo Mãe (Cluster Temático)
// ============================================================================

export function getMotherArticleAnalyzerPrompt(params: {
  motherContent: string;
  motherUrl: string;
  primaryKeyword: string;
}): string {
  return `<task id="article-analyzer-mother">
<objetivo>
Analise o artigo mãe (pilar) abaixo para extrair contexto de cluster temático.
O novo artigo será um artigo filho/satélite que deve se encaixar no ecossistema deste artigo mãe.
</objetivo>

<artigo_mae>
URL: ${params.motherUrl}
${params.motherContent}
</artigo_mae>

<keyword_artigo_filho>${params.primaryKeyword}</keyword_artigo_filho>

<analise_requerida>
1. **Tópico Central**: Qual é o tema guarda-chuva do artigo mãe?
2. **Subtópicos Abordados**: Mapeie todos os subtópicos que o artigo mãe já cobre
3. **Ponto de Conexão**: Onde exatamente o artigo filho se encaixa no cluster?
4. **Tom e Nível**: O artigo mãe é introdutório/intermediário/avançado?
5. **Lacunas de Aprofundamento**: Quais aspectos o artigo mãe menciona superficialmente que o filho pode aprofundar?
6. **Links Existentes**: O artigo mãe já tem links para subtópicos? Quais?
7. **Interlinking Natural**: Quais frases do artigo mãe poderiam linkar naturalmente para o artigo filho?
</analise_requerida>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "mother_topic": "<tópico central>",
  "mother_level": "<introdutório|intermediário|avançado>",
  "subtopics_covered": ["<subtópico>", ...],
  "connection_point": "<onde o artigo filho se encaixa>",
  "depth_gaps": ["<aspecto que pode ser aprofundado>", ...],
  "existing_internal_links": ["<url ou tópico linkado>", ...],
  "natural_anchor_points": [
    { "phrase_in_mother": "<frase do artigo mãe>", "suggested_anchor": "<texto âncora sugerido>" }
  ],
  "recommended_approach": "<como o artigo filho deve se posicionar em relação ao mãe>"
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 04 — Research Synthesizer (adaptado para artigos)
// ============================================================================

export function getArticleSynthesizerPrompt(params: {
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  researchResults: string;
  baseArticleAnalysis?: string;
  motherArticleAnalysis?: string;
}): string {
  const secondarySection = params.secondaryKeywords?.length
    ? `\nKeywords secundárias: ${params.secondaryKeywords.join(", ")}`
    : "";

  const baseSection = params.baseArticleAnalysis
    ? `\n<analise_artigo_base>\n${params.baseArticleAnalysis}\n</analise_artigo_base>`
    : "";

  const motherSection = params.motherArticleAnalysis
    ? `\n<analise_artigo_mae>\n${params.motherArticleAnalysis}\n</analise_artigo_mae>`
    : "";

  return `<task id="article-research-synthesizer">
<objetivo>
Sintetize os resultados de pesquisa abaixo em um briefing estruturado para criação de artigo de blog.
Extraia dados citáveis, identifique ângulos diferenciadores e organize a informação para o gerador de outlines.
</objetivo>

<contexto>
Keyword principal: ${params.primaryKeyword}${secondarySection}
Tipo de artigo: ${params.articleType}
</contexto>
${baseSection}${motherSection}
<resultados_pesquisa>
${params.researchResults}
</resultados_pesquisa>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "executive_summary": "<resumo em 3-5 sentenças do que a pesquisa revelou>",
  "key_findings": [
    { "finding": "<descoberta>", "source": "<fonte>", "reliability": "<alta|média|baixa>" }
  ],
  "citable_data": [
    { "statement": "<frase pronta para citar no artigo>", "source": "<fonte>", "year": "<ano>" }
  ],
  "competitive_angles": [
    { "angle": "<ângulo diferenciador>", "why_unique": "<por que funciona>", "difficulty": "<fácil|médio|difícil>" }
  ],
  "subtopics_to_cover": [
    { "topic": "<subtópico>", "depth": "<superficial|moderado|profundo>", "reason": "<por que incluir>" }
  ],
  "expert_quotes": [
    { "quote": "<citação ou paráfrase>", "expert": "<nome>", "context": "<contexto>" }
  ],
  "common_misconceptions": ["<mito 1>", "<mito 2>"],
  "recommended_depth": "<word count sugerido baseado na complexidade>",
  "content_gaps_in_market": ["<gap 1>", "<gap 2>"]
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 05 — Gerador de Outlines (3 propostas)
// ============================================================================

export function getOutlineGeneratorPrompt(params: {
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  targetWordCount: number;
  synthesizedResearch: string;
  baseArticleAnalysis?: string;
  motherArticleAnalysis?: string;
  keywordGaps?: KeywordGap[];
  competitorTopics?: string;
  customInstructions?: string;
}): string {
  const secondarySection = params.secondaryKeywords?.length
    ? `\nKeywords secundárias: ${params.secondaryKeywords.join(", ")}`
    : "";

  const baseSection = params.baseArticleAnalysis
    ? `\n<analise_artigo_base>\n${params.baseArticleAnalysis}\n</analise_artigo_base>`
    : "";

  const motherSection = params.motherArticleAnalysis
    ? `\n<analise_artigo_mae>\n${params.motherArticleAnalysis}\n</analise_artigo_mae>`
    : "";

  const keywordGapsSection = params.keywordGaps?.length
    ? `\n<si_keyword_gaps>
${JSON.stringify(params.keywordGaps, null, 2)}
</si_keyword_gaps>
<instrucao_gaps>
Ao gerar os outlines, considere:
1. Priorize ângulos que concorrentes NÃO usaram
2. Incorpore keyword gaps como subtópicos H3 onde relevante
3. Planeje pontos de interlinking para artigos futuros relacionados
4. Amplie cobertura com subtópicos que concorrentes cobrem mas o outline padrão não cobriria
</instrucao_gaps>`
    : "";

  const competitorSection = params.competitorTopics
    ? `\n<si_competitor_topics>\n${params.competitorTopics}\n</si_competitor_topics>`
    : "";

  const customSection = params.customInstructions
    ? `\n<instrucoes_customizadas>\n${params.customInstructions}\n</instrucoes_customizadas>`
    : "";

  return `<task id="article-outline-generator">
<objetivo>
Gere 3 propostas de outline distintas para o artigo. Cada outline deve ter abordagem diferente
mas todas devem cobrir o tema de forma completa e otimizada para SEO.
</objetivo>

<contexto>
Keyword principal: ${params.primaryKeyword}${secondarySection}
Tipo de artigo: ${params.articleType}
Word count alvo: ${params.targetWordCount} palavras
</contexto>

<pesquisa_sintetizada>
${params.synthesizedResearch}
</pesquisa_sintetizada>
${baseSection}${motherSection}${keywordGapsSection}${competitorSection}${customSection}

<regras_outline>
1. Cada outline DEVE ter entre 5-10 seções H2
2. Cada H2 pode ter 0-4 H3s
3. A introdução NÃO é um H2 — é texto antes do primeiro H2
4. Keywords devem aparecer naturalmente nos headings
5. Estimativa de palavras deve ser realista para a profundidade proposta
6. Os 3 outlines devem ter abordagens DIFERENTES:
   - Outline A: Abordagem mais direta/prática
   - Outline B: Abordagem mais analítica/dados
   - Outline C: Abordagem mais narrativa/cases
</regras_outline>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "outlines": [
    {
      "id": "outline_a",
      "title": "<título proposto para o artigo>",
      "description": "<descrição da abordagem em 1-2 sentenças>",
      "differentiator": "<o que torna este outline único>",
      "sections": [
        {
          "heading": "<H2 heading>",
          "subheadings": ["<H3 heading>", ...],
          "estimated_words": <número>,
          "key_points": ["<ponto-chave que será coberto>", ...]
        }
      ],
      "estimated_total_words": <número>
    }
  ]
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 06 — Produtor de Seção (seção a seção)
// ============================================================================

export function getSectionProducerPrompt(params: {
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: string;
  sectionHeading: string;
  sectionSubheadings: string[];
  sectionKeyPoints: string[];
  estimatedWords: number;
  sectionIndex: number;
  totalSections: number;
  previousSectionsContext: string;
  synthesizedResearch: string;
  ragContext?: string;
  brandVoiceProfile?: BrandVoiceProfile;
  customInstructions?: string;
}): string {
  const brandVoiceSection = params.brandVoiceProfile
    ? `\n<si_brand_voice_profile>
${JSON.stringify(params.brandVoiceProfile, null, 2)}
</si_brand_voice_profile>
<instrucao_brand_voice>
Adapte a produção do conteúdo ao perfil de voz da marca:
1. **Tom**: Siga voice_profile.tone e formality_level
2. **Vocabulário**: Use vocabulary_patterns naturalmente, evite avoided_terms
3. **Estrutura**: Respeite avg_paragraph_length, avg_sentence_length e heading_style
4. **Dados**: Siga data_usage e data_citation_format
5. **Pessoa Gramatical**: Use a pessoa gramatical consistente com person
6. **Guidelines**: Siga TODAS as writing_guidelines[]
</instrucao_brand_voice>`
    : "";

  const ragSection = params.ragContext
    ? `\n<contexto_rag>\n${params.ragContext}\n</contexto_rag>`
    : "";

  const customSection = params.customInstructions
    ? `\n<instrucoes_customizadas>\n${params.customInstructions}\n</instrucoes_customizadas>`
    : "";

  return `<task id="article-section-producer">
<objetivo>
Produza o conteúdo completo da seção ${params.sectionIndex + 1} de ${params.totalSections} do artigo.
Escreva em Markdown puro, com a profundidade e qualidade necessárias.
</objetivo>

<contexto>
Keyword principal: ${params.primaryKeyword}
Keywords secundárias: ${params.secondaryKeywords?.join(", ") || "nenhuma"}
Tipo de artigo: ${params.articleType}
</contexto>

<secao_atual>
Heading (H2): ${params.sectionHeading}
Subheadings (H3): ${params.sectionSubheadings.join(", ") || "sem H3s definidos"}
Pontos-chave a cobrir: ${params.sectionKeyPoints.join("; ")}
Word count alvo: ~${params.estimatedWords} palavras
Posição: Seção ${params.sectionIndex + 1} de ${params.totalSections}
</secao_atual>

<contexto_secoes_anteriores>
${params.previousSectionsContext || "Esta é a primeira seção."}
</contexto_secoes_anteriores>

<pesquisa_sintetizada>
${params.synthesizedResearch}
</pesquisa_sintetizada>
${ragSection}${brandVoiceSection}${customSection}

<regras_producao>
1. Comece com ## ${params.sectionHeading}
2. O primeiro parágrafo após o H2 deve conter uma resposta direta e autocontida
3. Use ### para os subheadings definidos
4. Inclua dados com fontes quando disponíveis na pesquisa
5. Word count deve estar dentro de ±15% do alvo
6. Se esta é a primeira seção, inclua um parágrafo introdutório ANTES do primeiro H2
7. Se esta é a última seção, termine com insights finais (NÃO "Conclusão" genérica)
8. Transição suave: termine a seção de forma que faça sentido com o próximo H2
9. Use **negrito** para conceitos-chave e termos importantes
10. Listas quando houver 3+ itens paralelos
</regras_producao>

<output_format>
Retorne APENAS o conteúdo Markdown da seção. Sem JSON wrapper. Sem explicações.
Comece diretamente com ## ${params.sectionHeading}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 07 — Montador + Interlinking
// ============================================================================

export function getAssemblerPrompt(params: {
  sections: ProducedSection[];
  primaryKeyword: string;
  articleType: string;
  authorName?: string;
  siteUrlMap?: SiteUrlMapEntry[];
  interlinkingMode?: "auto" | "manual";
  maxLinks?: number;
}): string {
  const urlMapSection = params.siteUrlMap?.length
    ? `\n<si_url_map>
${JSON.stringify(params.siteUrlMap.map(u => ({ url: u.url, title: u.title, keyword: u.mainKeyword })), null, 2)}
</si_url_map>
<il_config>
Modo de interlinking: ${params.interlinkingMode || "auto"}
Máximo de links internos: ${params.maxLinks || 6}
</il_config>
<instrucao_interlinking>
${params.interlinkingMode === "manual"
    ? `NÃO insira links no artigo. Gere uma lista separada de sugestões com anchor_text, target_url, context_sentence e relevance_score.`
    : `Analise o artigo e identifique frases que podem ser anchor texts para links internos.
Insira links como [texto âncora](url) diretamente no texto.
Regras: mínimo 3 links, máximo ${params.maxLinks || 6}, máximo 1 link por parágrafo.
Distribua links ao longo do artigo (não concentre no início ou final).`
}
Também gere reverse_suggestions: artigos existentes que deveriam linkar PARA este novo artigo.
</instrucao_interlinking>`
    : "";

  const sectionsText = params.sections
    .map((s) => s.content)
    .join("\n\n");

  return `<task id="article-assembler">
<objetivo>
Monte as seções produzidas em um artigo coeso e completo.
Adicione transições naturais entre seções, unifique o tom e aplique interlinking.
</objetivo>

<artigo_secoes>
${sectionsText}
</artigo_secoes>

<contexto>
Keyword principal: ${params.primaryKeyword}
Tipo: ${params.articleType}
${params.authorName ? `Autor: ${params.authorName}` : ""}
Total de seções: ${params.sections.length}
</contexto>
${urlMapSection}

<regras_montagem>
1. Mantenha TODA a substância das seções originais
2. Adicione transições suaves entre seções onde necessário
3. Unifique o tom — não deve parecer escrito por diferentes autores
4. Verifique progressão lógica: cada seção deve construir sobre a anterior
5. A introdução já está na primeira seção — não adicione outra
6. O fechamento já está na última seção — não adicione outro
7. Corrija redundâncias entre seções (mesmo dado citado duas vezes)
8. Mantenha formatação Markdown consistente
</regras_montagem>

<output_format>
Retorne um JSON válido:
{
  "assembled_article": "<artigo completo em Markdown>",
  "word_count": <número>,
  "transitions_added": <número de transições adicionadas>,
  "interlinking": {
    "links_inserted": [
      { "anchor_text": "<texto>", "target_url": "<url>", "section": "<em qual H2>" }
    ],
    "suggestions": [
      { "anchor_text": "<texto>", "target_url": "<url>", "context_sentence": "<frase de contexto>", "relevance_score": <0-100> }
    ],
    "reverse_suggestions": [
      { "source_url": "<url existente que deveria linkar para este artigo>", "anchor_text": "<texto âncora sugerido>", "insertion_context": "<onde inserir>" }
    ]
  }
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 08 — SEO Analyzer
// ============================================================================

export function getSeoAnalyzerPrompt(params: {
  articleContent: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  targetWordCount: number;
  keywordGaps?: KeywordGap[];
}): string {
  const keywordGapsSection = params.keywordGaps?.length
    ? `\n<si_keyword_gaps>
${JSON.stringify(params.keywordGaps, null, 2)}
</si_keyword_gaps>
<instrucao_gaps>
Ao analisar SEO, valide também a cobertura competitiva:
1. Para cada gap relevante: O tópico foi coberto? (sim/parcialmente/não)
2. O ângulo é diferenciado dos concorrentes? (sim/não)
3. Oportunidades long-tail foram incorporadas? (sim/não)
</instrucao_gaps>`
    : "";

  return `<task id="article-seo-analyzer">
<objetivo>
Analise o artigo abaixo e gere um relatório SEO detalhado com score, issues e recomendações.
</objetivo>

<artigo>
${params.articleContent}
</artigo>

<contexto>
Keyword principal: ${params.primaryKeyword}
Keywords secundárias: ${params.secondaryKeywords?.join(", ") || "nenhuma"}
Word count alvo: ${params.targetWordCount}
</contexto>
${keywordGapsSection}

<criterios_analise>
Analise cada critério e classifique como "pass", "warn" ou "fail":

1. **Title Tag**: Keyword no título? Tamanho entre 50-60 chars?
2. **H1**: Keyword presente? Único H1?
3. **H2s**: Keywords distribuídas? Descritivos (não genéricos)?
4. **Keyword Density**: Primary keyword entre 1-2%? Natural, sem stuffing?
5. **Meta Description**: Keyword presente? 150-160 chars? CTA incluso?
6. **Internal Links**: Mínimo 3 links internos? Anchor texts relevantes?
7. **External Links**: Fontes citadas com links? Mínimo 2?
8. **Image Alt Texts**: Imagens com alt text descritivo?
9. **Word Count**: Dentro de ±10% do alvo?
10. **Readability**: Parágrafos curtos? Listas? Escaneabilidade?
11. **First 100 Words**: Keyword presente nos primeiros 100 palavras?
12. **URL Slug**: Keyword no slug sugerido?
13. **Content Freshness**: Dados e fontes recentes (últimos 2 anos)?
14. **E-E-A-T Signals**: Experiência pessoal? Expertise demonstrada?
</criterios_analise>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "overall_score": <0-100>,
  "checks": [
    {
      "criterion": "<nome do critério>",
      "status": "<pass|warn|fail>",
      "message": "<descrição do resultado>",
      "priority": "<high|medium|low>"
    }
  ],
  "keyword_density": {
    "primary": <porcentagem>,
    "secondary": { "<keyword>": <porcentagem>, ... }
  },
  "suggestions": ["<sugestão acionável 1>", "<sugestão 2>", ...],
  "competitive_coverage": {
    "gaps_addressed": <número>,
    "gaps_missed": ["<gap não coberto>", ...],
    "differentiation_score": <0-100>
  }
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 09 — SEO Optimizer (+ GEO fixes)
// ============================================================================

export function getSeoOptimizerPrompt(params: {
  articleContent: string;
  seoReport: string;
  primaryKeyword: string;
  geoReport?: string;
  geoFixes?: string;
}): string {
  const geoSection = params.geoReport && params.geoFixes
    ? `\n<geo_report>
${params.geoReport}
</geo_report>
<geo_fixes>
${params.geoFixes}
</geo_fixes>
<instrucao_geo>
Aplique as correções GEO junto com as SEO em uma otimização unificada:
1. **Respostas Diretas**: Garanta que o primeiro parágrafo de cada H2 contenha resposta autocontida
2. **Dados Citáveis**: Toda estatística deve ter atribuição: "Segundo [Fonte] ([ano]), [dado]."
3. **Estrutura**: Quebre parágrafos longos. 1 parágrafo = 1 ideia. Headings descritivos
4. **E-E-A-T**: Adicione frases de experiência pessoal/profissional onde relevante
5. **Cobertura**: Se subtópicos faltantes foram identificados, adicione parágrafos breves
Se houver conflito entre otimização SEO e GEO, priorize SEO mas registre o trade-off.
</instrucao_geo>`
    : "";

  return `<task id="article-seo-optimizer">
<objetivo>
Aplique as correções SEO identificadas no relatório, mantendo a qualidade e naturalidade do conteúdo.
O artigo otimizado deve manter 95%+ do conteúdo original, apenas refinando para SEO.
</objetivo>

<artigo_original>
${params.articleContent}
</artigo_original>

<seo_report>
${params.seoReport}
</seo_report>

<keyword>${params.primaryKeyword}</keyword>
${geoSection}

<regras_otimizacao>
1. NÃO reescreva o artigo — aplique correções cirúrgicas
2. Mantenha o tom e estilo originais
3. Adicione keyword onde falta, mas de forma NATURAL
4. Corrija headings genéricos para headings descritivos com keyword
5. Quebre parágrafos longos (máx 4 sentenças)
6. Adicione dados/fontes onde o report indica falta
7. Melhore transições entre seções se identificadas como fracas
8. NÃO adicione conteúdo que não estava no original (exceto para preencher gaps críticos)
</regras_otimizacao>

<output_format>
Retorne um JSON válido:
{
  "optimized_article": "<artigo otimizado em Markdown>",
  "changes_made": [
    { "type": "<keyword_added|heading_improved|paragraph_split|data_added|transition_improved|geo_fix>", "location": "<onde>", "description": "<o que mudou>" }
  ],
  "new_seo_score_estimate": <0-100>,
  "new_geo_score_estimate": <0-100>,
  "tradeoffs": ["<trade-off registrado, se houver>"]
}
</output_format>
</task>`;
}

// ============================================================================
// PROMPT 10 — Title Generator
// ============================================================================

export function getTitleGeneratorPrompt(params: {
  articleContent: string;
  primaryKeyword: string;
  articleType: string;
  currentTitle?: string;
}): string {
  return `<task id="article-title-generator">
<objetivo>
Gere 5 opções de título para o artigo abaixo, otimizadas para CTR e SEO.
Cada título deve ter abordagem diferente.
</objetivo>

<artigo>
${params.articleContent.substring(0, 3000)}
</artigo>

<contexto>
Keyword principal: ${params.primaryKeyword}
Tipo de artigo: ${params.articleType}
${params.currentTitle ? `Título atual: ${params.currentTitle}` : ""}
</contexto>

<regras_titulo>
1. Keyword DEVE aparecer nos primeiros 60 caracteres
2. Tamanho ideal: 50-60 caracteres (máximo 70)
3. Gere 5 abordagens diferentes:
   - Título A: Direto e objetivo (How-to / Guia)
   - Título B: Numérico/Listicle ("7 Estratégias para...")
   - Título C: Provocativo/Curiosidade ("Por que 90% dos...")
   - Título D: Benefício claro ("Como [resultado] em [prazo]")
   - Título E: Autoridade ("O Guia Definitivo de...")
4. Cada título deve funcionar sozinho (não depender do contexto)
5. Evite clickbait — o título deve representar fielmente o conteúdo
</regras_titulo>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:
{
  "titles": [
    {
      "id": "title_a",
      "text": "<título>",
      "char_count": <número>,
      "approach": "<direto|numerico|provocativo|beneficio|autoridade>",
      "ctr_score": <0-100>,
      "seo_score": <0-100>,
      "reason": "<por que este título funciona>"
    }
  ],
  "recommended": "<id do título recomendado>",
  "recommendation_reason": "<por que este é o melhor>"
}
</output_format>
</task>`;
}

// ============================================================================
// UTILITY — Extract JSON from LLM response
// ============================================================================

export function extractArticleJSON<T>(response: string): T | null {
  try {
    // Try direct parse first
    return JSON.parse(response) as T;
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // Fall through
      }
    }

    // Try finding first { to last }
    const firstBrace = response.indexOf("{");
    const lastBrace = response.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(response.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
        // Fall through
      }
    }

    return null;
  }
}
