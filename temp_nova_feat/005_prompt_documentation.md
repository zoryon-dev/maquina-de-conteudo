# Documentação de Prompts — Article Wizard Pipeline

> 22 prompts distribuídos em 7 arquivos. Cada prompt é documentado com função, parâmetros, dependências e formato de saída.

---

## Índice

| # | Prompt | Arquivo | Usa User Variables | Usa RAG |
|---|--------|---------|--------------------|---------|
| 01 | `getArticleSystemPrompt()` | base-pipeline.ts | Não | Não |
| 02 | `getBaseArticleAnalyzerPrompt()` | base-pipeline.ts | Não | Não |
| 03 | `getMotherArticleAnalyzerPrompt()` | base-pipeline.ts | Não | Não |
| 04 | `getArticleSynthesizerPrompt()` | base-pipeline.ts | Não | Não |
| 05 | `getOutlineGeneratorPrompt()` | base-pipeline.ts | Sim (SI-03) | Não |
| 06 | `getSectionProducerPrompt()` | base-pipeline.ts | Sim (SI-02) | Sim |
| 07 | `getAssemblerPrompt()` | base-pipeline.ts | Sim (SI) | Não |
| 08 | `getSeoAnalyzerPrompt()` | base-pipeline.ts | Sim (SI-03) | Não |
| 09 | `getSeoOptimizerPrompt()` | base-pipeline.ts | Não | Não |
| 10 | `getTitleGeneratorPrompt()` | base-pipeline.ts | Não | Não |
| SI-02 | `getBrandVoiceExtractorPrompt()` | site-intelligence.ts | Não | Não |
| SI-03 | `getKeywordGapAnalyzerPrompt()` | site-intelligence.ts | Não | Não |
| IL-01 | `getInterlinkingPrompt()` | interlinking.ts | Sim (SI) | Não |
| META-01 | `getMetadataGeneratorPrompt()` | metadata.ts | Opc (SI-02) | Não |
| GEO-01 | `getGeoAnalyzerPrompt()` | geo.ts | Não | Não |
| GEO-02 | `getGeoOptimizerPrompt()` | geo.ts | Opc (SI-02) | Não |
| EXT-01 | `getArticleDiagnosticianPrompt()` | extension.ts | Opc (SI) | Não |
| EXT-02 | `getExpansionPlannerPrompt()` | extension.ts | Opc (SI-02) | Não |
| EXT-03 | `getContentExpanderPrompt()` | extension.ts | Opc (SI-02) | Não |
| CROSS-01 | `getLinkedInDeriverPrompt()` | cross-format.ts | Opc (SI-02) | Não |
| CROSS-02 | `getVideoScriptDeriverPrompt()` | cross-format.ts | Opc (SI-02) | Não |
| CROSS-03 | `getCarouselDeriverPrompt()` | cross-format.ts | Opc (SI-02) | Não |

**Legenda**: Sim = sempre usa; Opc = usa quando disponível; Não = não usa.

---

## Arquivo: `src/lib/article-services/prompts/base-pipeline.ts`

### Prompt 01 — System Prompt Base (Identity)

- **Função**: `getArticleSystemPrompt()`
- **Parâmetros**: Nenhum (retorna identidade fixa)
- **Descrição**: Estabelece a identidade do jornalista e a filosofia de criação de artigos. Define princípios: respostas diretas ao search intent, profundidade, clareza estrutural, interlinking estratégico, E-E-A-T.
- **Anti-patterns**: Clickbait, intros genéricas, keyword stuffing.
- **Saída**: String XML com system prompt.

### Prompt 02 — Base Article Analyzer (Referência)

- **Função**: `getBaseArticleAnalyzerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string` — Conteúdo do artigo concorrente
  - `articleUrl: string` — URL do artigo
  - `primaryKeyword: string` — Keyword alvo
- **Descrição**: Analisa artigo concorrente (referência base) para extrair estrutura, tom, fontes de dados, gaps e posicionamento competitivo.
- **Saída**: JSON com `url, title, word_count, structure[], approach, data_sources[], gaps[], keywords_used[], cta_pattern, differentiation, quality_score, recommendations_to_beat`.

### Prompt 03 — Mother Article Analyzer (Cluster Context)

- **Função**: `getMotherArticleAnalyzerPrompt(params)`
- **Parâmetros**:
  - `motherContent: string` — Conteúdo do artigo pilar
  - `motherUrl: string` — URL do artigo pilar
  - `primaryKeyword: string` — Keyword alvo
- **Descrição**: Analisa artigo pilar para entender contexto temático do cluster. Identifica onde o novo artigo filho se encaixa e oportunidades de interlinking.
- **Saída**: JSON com `mother_topic, mother_level, subtopics_covered[], connection_point, depth_gaps[], existing_internal_links[], natural_anchor_points[], recommended_approach`.

### Prompt 04 — Research Synthesizer

- **Função**: `getArticleSynthesizerPrompt(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `researchResults: string` — Resultados de pesquisa (Tavily)
  - `baseArticleAnalysis?: string` — Output do Prompt 02
  - `motherArticleAnalysis?: string` — Output do Prompt 03
- **Descrição**: Sintetiza resultados de pesquisa em briefing estruturado com achados-chave, dados citáveis, ângulos competitivos, subtópicos, citações de experts, e gaps de mercado.
- **Saída**: JSON com `executive_summary, key_findings[], citable_data[], competitive_angles[], subtopics_to_cover[], expert_quotes[], common_misconceptions[], recommended_depth, content_gaps_in_market[]`.

### Prompt 05 — Outline Generator (3 Propostas)

- **Função**: `getOutlineGeneratorPrompt(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `targetWordCount: number`
  - `synthesizedResearch: string` — Output do Prompt 04
  - `baseArticleAnalysis?: string` — Output do Prompt 02
  - `motherArticleAnalysis?: string` — Output do Prompt 03
  - `keywordGaps?: string` — Output do SI-03
  - `competitorTopics?: string`
  - `customInstructions?: string`
- **User Variables**: `keywordGaps` vem do SI-03 (Site Intelligence)
- **Descrição**: Gera 3 propostas de outline com abordagens editoriais diferentes (direta/prática, analítica/dados, narrativa/cases). Cada outline tem 5-10 seções H2 com sub-tópicos H3.
- **Saída**: JSON com `outlines[]` contendo `id, title, description, differentiator, sections[] { heading, subheadings[], estimated_words, key_points[] }, estimated_total_words`.

### Prompt 06 — Section Producer (Seção a Seção)

- **Função**: `getSectionProducerPrompt(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `sectionHeading: string`
  - `sectionSubheadings: string[]`
  - `sectionKeyPoints: string[]`
  - `estimatedWords: number`
  - `sectionIndex: number`
  - `totalSections: number`
  - `previousSectionsContext: string`
  - `synthesizedResearch: string`
  - `ragContext?: string` — Contexto RAG montado
  - `brandVoiceProfile?: string` — Output do SI-02
  - `customInstructions?: string`
- **User Variables**: `brandVoiceProfile` vem do SI-02
- **RAG Context**: Sim — usa `assembleRagContext()` para injetar documentos relevantes
- **Descrição**: Produz conteúdo individual de cada seção em Markdown. Integra brand voice para consistência.
- **Saída**: String Markdown com o conteúdo da seção (sem JSON wrapper).

### Prompt 07 — Assembler + Interlinking

- **Função**: `getAssemblerPrompt(params)`
- **Parâmetros**:
  - `sections: ProducedSection[]`
  - `primaryKeyword: string`
  - `articleType: string`
  - `authorName?: string`
  - `siteUrlMap?: string` — Output do SI (mapa de URLs)
  - `interlinkingMode?: string`
  - `maxLinks?: number`
- **User Variables**: `siteUrlMap` vem do SI
- **Descrição**: Monta seções individuais num artigo coeso. Adiciona transições, unifica tom, aplica interlinking (auto ou manual). Gera sugestões de reverse linking.
- **Saída**: JSON com `assembled_article, word_count, transitions_added, interlinking { links_inserted[], suggestions[], reverse_suggestions[] }`.

### Prompt 08 — SEO Analyzer

- **Função**: `getSeoAnalyzerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `targetWordCount: number`
  - `keywordGaps?: string` — Output do SI-03
- **User Variables**: `keywordGaps` vem do SI-03
- **Descrição**: Avalia artigo contra 14 critérios SEO (title, H1, H2s, keyword density, meta description, links internos/externos, imagens, word count, legibilidade, primeiras 100 palavras, URL slug, freshness, E-E-A-T). Gera score e recomendações.
- **Saída**: JSON com `overall_score, checks[] { criterion, status, message, priority }, keyword_density, suggestions[], competitive_coverage { gaps_addressed, gaps_missed[], differentiation_score }`.

### Prompt 09 — SEO + GEO Optimizer

- **Função**: `getSeoOptimizerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `seoReport: string` — Output do Prompt 08
  - `primaryKeyword: string`
  - `geoReport?: string` — Output do GEO-01
  - `geoFixes?: string` — Output do GEO-01
- **Descrição**: Aplica recomendações do SEO analyzer. Integra opcionalmente fixes GEO para otimização unificada. Mantém 95%+ do conteúdo original com correções cirúrgicas.
- **Saída**: JSON com `optimized_article, changes_made[] { type, location, description }, new_seo_score_estimate, new_geo_score_estimate, tradeoffs[]`.

### Prompt 10 — Title Generator

- **Função**: `getTitleGeneratorPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `articleType: string`
  - `currentTitle?: string`
- **Descrição**: Gera 5 opções de título com abordagens diferentes (direto, numérico/listicle, provocativo, benefit-driven, autoridade). Otimizados para CTR e SEO.
- **Saída**: JSON com `titles[] { id, text, char_count, approach, ctr_score, seo_score, reason }, recommended, recommendation_reason`.

---

## Arquivo: `src/lib/article-services/prompts/site-intelligence.ts`

### Prompt SI-02 — Brand Voice Extractor

- **Função**: `getBrandVoiceExtractorPrompt(params)`
- **Parâmetros**:
  - `brandName: string`
  - `sampleArticles: Array<{ url, title, content }>`
- **Descrição**: Analisa 3+ amostras de conteúdo da marca para extrair perfil detalhado de voz: tom, formalidade, personalidade, pessoa, nível de autoridade, uso de humor, padrões de vocabulário, estilos de abertura/fechamento/transição, padrões de CTA, e traços únicos.
- **Saída**: JSON com `brand_name, voice_profile { tone, formality_level, personality, person, authority_level, humor_usage, ... }, writing_guidelines[], sample_phrases { typical_openings[], typical_transitions[], typical_closings[] }`.

### Prompt SI-03 — Keyword Gap Analyzer

- **Função**: `getKeywordGapAnalyzerPrompt(params)`
- **Parâmetros**:
  - `siteUrlMap: string` — Inventário de URLs do site
  - `competitorData: string` — Dados de competidores (pré-formatado)
  - `targetNiche: string`
- **Descrição**: Compara inventário de conteúdo do cliente contra cobertura de competidores. Identifica gaps críticos (2+ competidores cobrem), gaps oportunísticos (1-2), e clusters sub-explorados.
- **Saída**: JSON com `gaps_identified, critical_gaps[] { keyword, search_volume_estimate, competition_level, ... }, opportunistic_gaps[], underexplored_clusters[]`.

---

## Arquivo: `src/lib/article-services/prompts/interlinking.ts`

### Prompt IL-01 — Interlinking Contextual Analyzer

- **Função**: `getInterlinkingPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `articleKeyword: string`
  - `siteUrlMap: string` — Output do SI
  - `mode: "auto" | "manual"`
  - `maxLinks?: number` (default 6)
- **User Variables**: `siteUrlMap` do SI
- **Descrição**: Analisa artigo e mapa de URLs do site para sugerir/inserir links internos. Algoritmo com pesos: relevância semântica (40%), naturalidade da âncora (25%), valor ao leitor (20%), saúde do link (15%). Distribui 3-6 links uniformemente. Auto mode insere links; manual mode lista sugestões.
- **Saída**: JSON com `mode, total_suggestions, article_with_links (se auto), suggestions[], reverse_suggestions[], linking_stats`.

---

## Arquivo: `src/lib/article-services/prompts/metadata.ts`

### Prompt META-01 — SEO Metadata Generator

- **Função**: `getMetadataGeneratorPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `secondaryKeywords: string[]`
  - `brandName: string`
  - `authorName: string`
  - `siteCategories?: string`
  - `brandVoiceProfile?: string` — Output do SI-02
- **User Variables**: Opcionalmente `brandVoiceProfile` do SI-02
- **Descrição**: Gera pacote completo de metadados SEO: 3 meta titles (60 chars), 2 meta descriptions (155 chars), URL slug (kebab-case, 5 palavras), alt texts, schema markup (Article, FAQ, HowTo, Breadcrumb), e 3-5 sugestões de âncoras reversas.
- **Saída**: JSON com `meta_titles[], meta_descriptions[], slug, alt_texts[], schema_markup { article, faq, howto, breadcrumb }, reverse_anchor_suggestions[], suggested_category`.

---

## Arquivo: `src/lib/article-services/prompts/geo.ts`

### Prompt GEO-01 — AI-Readiness Analyzer

- **Função**: `getGeoAnalyzerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `targetQueries?: string[]` (gera 5-7 automaticamente se não fornecido)
- **Descrição**: Avalia artigo para Generative Engine Optimization (discoverability e citabilidade por LLMs). Pontua 6 critérios: direct_answers, citable_data, extractable_structure, authority_eeat, topic_coverage, schema_metadata. Retorna score geral ponderado e priority fixes ranqueados por impacto/esforço.
- **Saída**: JSON com `geo_score_overall, target_queries_evaluated[], breakdown { direct_answers, citable_data, extractable_structure, authority_eeat, topic_coverage, schema_metadata }, priority_fixes[], ai_citation_probability`.

### Prompt GEO-02 — AI-Readiness Optimizer

- **Função**: `getGeoOptimizerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `geoReport: string` — Output do GEO-01
  - `priorityFixes: string` — Output do GEO-01
  - `brandVoiceProfile?: string` — Output do SI-02
- **Descrição**: Aplica fixes GEO para melhorar citabilidade por LLMs. Técnicas: inserção de respostas diretas, melhoria de citações com atribuição, otimização de estrutura, enhancement E-E-A-T, expansão de cobertura. Usa placeholders `[NOTA: ...]` para dados não disponíveis.
- **Saída**: JSON com `optimized_article, changes_applied[], estimated_new_scores, editor_notes[]`.

---

## Arquivo: `src/lib/article-services/prompts/extension.ts`

### Prompt EXT-01 — Article Diagnostician

- **Função**: `getArticleDiagnosticianPrompt(params)`
- **Parâmetros**:
  - `originalArticle: string`
  - `originalUrl: string`
  - `competitorArticles: string`
  - `targetKeyword: string`
  - `siteUrlMap?: string` — Output do SI
- **Descrição**: Audita artigo existente contra competidores. Analisa: profundidade por seção, tópicos faltantes (gap crítico = 3+ competidores, oportunístico = 1-2), saúde SEO/GEO, oportunidades de interlinking. Projeta métricas após correções.
- **Saída**: JSON com `current_metrics, competitor_benchmark, weak_sections[], missing_sections[], seo_fixes[], geo_fixes[], interlinking_opportunities[], projected_after_all_fixes, priority_ranking[]`.

### Prompt EXT-02 — Expansion Planner

- **Função**: `getExpansionPlannerPrompt(params)`
- **Parâmetros**:
  - `originalArticle: string`
  - `diagnosis: string` — Output do EXT-01
  - `targetKeyword: string`
  - `brandVoiceProfile?: string` — Output do SI-02
- **Descrição**: Transforma diagnóstico em plano de ação detalhado. Para cada item: outlines, previews de 2-3 parágrafos, fontes de dados sugeridas, dependências. IDs únicos (exp_N, seo_N, geo_N) para rastreabilidade.
- **Saída**: JSON com `expansion_plan, section_expansions[], seo_fixes_detailed[], geo_fixes_detailed[], recommended_execution_order[]`.

### Prompt EXT-03 — Content Expander

- **Função**: `getContentExpanderPrompt(params)`
- **Parâmetros**:
  - `originalArticle: string`
  - `selectedFixes: string` — Fixes selecionados pelo usuário
  - `expansionPlan: string` — Output do EXT-02
  - `targetKeyword: string`
  - `secondaryKeywords?: string[]`
  - `brandVoiceProfile?: string` — Output do SI-02
- **Descrição**: Gera conteúdo expandido para fixes selecionados. Integra novas seções com transições suaves, tom consistente, sem repetição. Usa placeholders `[NOTA: ...]` e `[IMAGEM: ...]`.
- **Saída**: JSON com `expanded_article, changes_log[], metrics_after, editor_review_notes[]`.

---

## Arquivo: `src/lib/article-services/prompts/cross-format.ts`

### Prompt CROSS-01 — LinkedIn Post Deriver

- **Função**: `getLinkedInDeriverPrompt(params)`
- **Parâmetros**:
  - `articleContent: string` (primeiros 8000 chars)
  - `articleUrl: string`
  - `brandVoiceProfile?: string` — Output do SI-02
  - `authorPersona?: string`
- **Descrição**: Deriva post LinkedIn. Estrutura: Hook (1 linha), Contexto (2-3 linhas), Insights (3-5 itens com emoji), Bridge (1-2 linhas), CTA (link no primeiro comentário). Tom pessoal e opinativo. Max 3000 chars.
- **Saída**: JSON com `format, text, char_count, hashtags[], cta_url, hook_style, suggested_image, engagement_tips[], first_comment_text`.

### Prompt CROSS-02 — Video Script Deriver

- **Função**: `getVideoScriptDeriverPrompt(params)`
- **Parâmetros**:
  - `articleContent: string` (primeiros 8000 chars)
  - `articleUrl: string`
  - `brandVoiceProfile?: string` — Output do SI-02
  - `presenterPersona?: string`
  - `targetPlatform?: string` (default "reels"; options: reels/tiktok/shorts)
- **Descrição**: Deriva script de vídeo curto (60-90s). Estrutura: Hook (0:00-0:05), Problema (0:05-0:15), Key Points (0:15-0:55, máx 3), CTA (0:55-1:15). Inclui 2 hooks alternativos. 150-225 palavras.
- **Saída**: JSON com `format, target_platform, duration_estimate, total_word_count, script[] { timecode, type, spoken, visual, editing_note }, cta_url, suggested_caption, thumbnail_suggestion, hook_alternatives[]`.

### Prompt CROSS-03 — Carousel Deriver

- **Função**: `getCarouselDeriverPrompt(params)`
- **Parâmetros**:
  - `articleContent: string` (primeiros 8000 chars)
  - `articleUrl: string`
  - `brandVoiceProfile?: string` — Output do SI-02
  - `instagramHandle?: string`
- **Descrição**: Deriva carrossel Instagram (8-12 slides). Slide 1: cover com hook (máx 8 palavras). Slides 2-N: 1 insight por slide (máx 25 palavras). Último: CTA save + link na bio. Caption máx 2200 chars, 3-5 hashtags.
- **Saída**: JSON com `format, total_slides, slides[] { number, type, headline, body?, visual_note, background_style }, caption, hashtags[], posting_tips[], tribal_integration`.

---

## Dependências entre Prompts

```
SI-02 (Brand Voice) ───► Prompt 06, 07, GEO-02, EXT-02, EXT-03, CROSS-01, CROSS-02, CROSS-03, META-01
SI-03 (Keyword Gaps) ──► Prompt 05, 08
SI (siteUrlMap) ────────► Prompt 07, IL-01, EXT-01

Prompt 02 (Base Analyzer) ──► Prompt 04, 05
Prompt 03 (Mother Analyzer) ► Prompt 04, 05
Prompt 04 (Synthesizer) ────► Prompt 05, 06
Prompt 05 (Outline) ────────► Prompt 06

GEO-01 ──► Prompt 09, GEO-02
EXT-01 ──► EXT-02 ──► EXT-03
```

## Integração de User Variables

As `User Variables` (`getUserVariables()`) são variáveis configuráveis por usuário em Settings. No pipeline de artigos, elas NÃO são injetadas diretamente nos prompts. Em vez disso, os dados do Site Intelligence (SI) servem como "user variables" contextuais:

- **Brand Voice Profile** (SI-02): Configuração de tom e estilo da marca
- **Keyword Gaps** (SI-03): Gaps competitivos para informar outlines e SEO
- **Site URL Map** (SI): Inventário de URLs para interlinking

## Integração de RAG Context

O RAG Context (`assembleRagContext()`) é usado **apenas no Prompt 06** (Section Producer). Ele injeta chunks relevantes de documentos do usuário (fontes, PDFs, etc.) como contexto adicional para a produção de cada seção. O modelo Voyage AI (`voyage-4-large`) é usado para embeddings com threshold de similaridade `0.4`.
