# Article Wizard — Evoluções v2.0
## PRD Técnico — Arquitetura & Especificações

**Versão:** 2.0  
**Data:** Fevereiro 2026  
**Projeto:** Máquina de Conteúdo para Artigos — Módulos de Evolução  
**Contexto:** 6 módulos adicionais ao pipeline base de 9 prompts já existente

---

## Sumário Executivo

Este documento detalha 6 módulos de evolução que expandem o Article Wizard existente, transformando-o de um gerador de artigos em uma plataforma completa de content intelligence. As evoluções foram identificadas a partir de análise competitiva (Soro, Airticles.ai) e gaps do pipeline atual.

**Módulos:**
1. Site Intelligence — Crawling e análise pré-geração
2. Interlinking Contextual Real — Links internos com URLs reais do cliente
3. Output de Metadados Completo — SEO metadata package
4. Camada GEO — Otimização para AI/LLM readiness
5. Modo Extensão — Expansão de artigos existentes
6. Derivação Cross-Format — Artigo → LinkedIn, Vídeo, Carrossel

---

## 1. MÓDULO: SITE INTELLIGENCE

### 1.1 Visão Geral

Módulo de pré-processamento que roda ANTES do pipeline de criação. Crawla o site/blog do cliente para construir um contexto rico que alimenta todos os prompts subsequentes.

### 1.2 Três Sub-módulos

#### 1.2.A — URL Mapper (Mapeamento de URLs)

**Objetivo:** Criar inventário completo de todas as URLs publicadas no blog do cliente.

**Input:**
- `site_url` — URL raiz do blog (ex: https://cliente.com.br/blog)
- `crawl_depth` — Profundidade do crawl (padrão: 3 níveis)
- `url_patterns` — Padrões de URL a incluir/excluir (regex)

**Processamento:**
1. FireCrawl crawla o site partindo da URL raiz
2. Para cada URL encontrada, extrai:
   - `url` — URL completa
   - `title` — Tag `<title>` da página
   - `h1` — Heading principal
   - `meta_description` — Meta description existente
   - `word_count` — Contagem de palavras do conteúdo principal
   - `published_date` — Data de publicação (se disponível via schema/meta)
   - `categories` — Categorias/tags da página
   - `internal_links_count` — Quantos links internos a página já tem
   - `external_links_count` — Quantos links externos
3. Armazena no banco como inventário do site

**Output — `site_url_map`:**
```json
{
  "site_url": "https://cliente.com.br/blog",
  "total_urls": 142,
  "crawled_at": "2026-02-06T10:00:00Z",
  "urls": [
    {
      "url": "https://cliente.com.br/blog/marketing-digital-2026",
      "title": "Marketing Digital em 2026: Guia Completo",
      "h1": "Marketing Digital em 2026",
      "meta_description": "Descubra as principais tendências...",
      "word_count": 3200,
      "published_date": "2026-01-15",
      "categories": ["marketing-digital", "tendencias"],
      "internal_links_count": 8,
      "external_links_count": 12,
      "topical_cluster": null
    }
  ]
}
```

**Variável para prompts:** `{{site_url_map}}`

#### 1.2.B — Brand Voice Extractor

**Objetivo:** Analisar 3-5 artigos existentes do cliente para extrair padrões de tom, vocabulário e estrutura.

**Input:**
- `sample_urls` — 3-5 URLs de artigos representativos (seleção manual ou automática dos mais recentes/populares)
- `brand_name` — Nome da marca/autor

**Processamento:**
1. FireCrawl extrai conteúdo completo de cada URL
2. Prompt de análise (Prompt SI-02) processa os artigos e identifica:
   - Tom predominante (formal/informal, técnico/acessível, etc.)
   - Vocabulário recorrente (termos-chave, jargões, expressões)
   - Estrutura preferida (tamanho de parágrafos, uso de listas, formato de headings)
   - Padrões de abertura (como o autor tipicamente começa artigos)
   - Padrões de fechamento (como tipicamente encerra)
   - Uso de dados/estatísticas (frequência, formato de citação)
   - Nível de uso de primeira pessoa vs. terceira pessoa
   - Padrões de CTA (tipo, posicionamento, linguagem)

**Output — `brand_voice_profile`:**
```json
{
  "brand_name": "Voar Digital",
  "analyzed_articles": 5,
  "voice_profile": {
    "tone": "Técnico-acessível com personalidade. Usa analogias do cotidiano para explicar conceitos complexos.",
    "formality_level": "semi-formal",
    "person": "primeira_plural",
    "avg_paragraph_length": "3-4 sentenças",
    "avg_sentence_length": "15-22 palavras",
    "heading_style": "Diretos, com verbo de ação. Evitam clickbait.",
    "data_usage": "Frequente. Cita fontes com link. Prefere dados recentes (<2 anos).",
    "vocabulary_patterns": ["performance", "dados", "inteligência", "resultados", "estratégia"],
    "avoided_terms": ["simplesmente", "basicamente", "na verdade"],
    "opening_pattern": "Começa com contexto de mercado ou dado impactante. Nunca com pergunta retórica.",
    "closing_pattern": "Recap em 2-3 pontos + CTA para contato ou material complementar.",
    "cta_style": "Soft CTA no meio, hard CTA no final. Nunca agressivo.",
    "unique_traits": "Usa analogias de esporte. Referencia cases reais sem naming quando confidencial."
  }
}
```

**Variável para prompts:** `{{brand_voice_profile}}`

#### 1.2.C — Keyword Gap Analyzer

**Objetivo:** Identificar oportunidades de keywords que concorrentes cobrem e o cliente não.

**Input:**
- `site_url` — URL do blog do cliente
- `competitor_urls` — 2-3 URLs de blogs concorrentes
- `target_niche` — Nicho/mercado principal
- `existing_keywords` — Keywords já ranqueadas (opcional, via Google Search Console)

**Processamento:**
1. Tavily Search analisa os tópicos cobertos pelos concorrentes
2. Compara com o inventário de URLs do cliente (do sub-módulo A)
3. Prompt de análise (Prompt SI-03) cruza os dados e identifica:
   - Keywords que concorrentes cobrem e o cliente não
   - Tópicos com alta demanda e baixa concorrência
   - Clusters temáticos subexplorados pelo cliente
   - Oportunidades de long-tail dentro de clusters existentes

**Output — `keyword_gaps`:**
```json
{
  "analysis_date": "2026-02-06",
  "gaps_identified": 23,
  "priority_gaps": [
    {
      "keyword": "automação de marketing com IA",
      "search_volume_estimate": "alto",
      "competition_level": "médio",
      "covered_by_competitors": ["concorrente1.com", "concorrente2.com"],
      "suggested_article_type": "how-to",
      "related_existing_articles": [
        "https://cliente.com.br/blog/marketing-digital-2026"
      ],
      "cluster": "automação"
    }
  ]
}
```

**Variável para prompts:** `{{keyword_gaps}}`

### 1.3 Armazenamento

**Tabela: `site_intelligence`**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| site_url | text | URL raiz do site |
| url_map | jsonb | Inventário completo de URLs |
| brand_voice_profile | jsonb | Perfil de voz extraído |
| keyword_gaps | jsonb | Gaps identificados |
| competitor_urls | text[] | URLs dos concorrentes analisados |
| crawled_at | timestamptz | Data do último crawl |
| urls_count | integer | Total de URLs mapeadas |
| status | text | 'crawling', 'analyzing', 'complete', 'error' |

**Cache:** Dados válidos por 7 dias. Após isso, sistema sugere recrawl. Usuário pode forçar recrawl a qualquer momento.

### 1.4 Integração com Pipeline Existente

O Site Intelligence alimenta os seguintes prompts do pipeline base:
- **Prompt 04 (Gerador de Outlines):** Recebe `keyword_gaps` para sugerir ângulos diferenciados
- **Prompt 05 (Produtor de Seção):** Recebe `brand_voice_profile` para manter consistência de tom
- **Prompt 06 (Montador + Interlinking):** Recebe `site_url_map` para inserir links reais
- **Prompt 07 (SEO Analyzer):** Recebe `keyword_gaps` para validar cobertura temática

### 1.5 UX

- **Configuração inicial:** Tela em Settings onde o usuário cadastra site_url + competitor_urls
- **Primeiro crawl:** Pode levar 2-5 minutos dependendo do tamanho do site. Mostrar progresso.
- **Dashboard:** Card mostrando total de URLs mapeadas, data do último crawl, gaps prioritários
- **Trigger:** Automático antes de cada artigo (usa cache) ou manual via botão "Recrawl"

---

## 2. MÓDULO: INTERLINKING CONTEXTUAL REAL

### 2.1 Visão Geral

Evolução do Prompt 06 (Montador + Interlinking) existente. Em vez de sugerir links genéricos, usa o inventário real de URLs do site do cliente para inserir links internos com anchor text semanticamente relevante.

### 2.2 Modos de Operação

#### Modo Automático
O sistema seleciona automaticamente as URLs mais relevantes e insere links no artigo.

**Regras de seleção:**
1. Relevância semântica: anchor text deve ser naturalmente relacionado ao conteúdo da URL-alvo
2. Distribuição: mínimo 3, máximo 8 links internos por artigo de 2000+ palavras
3. Posicionamento: links distribuídos ao longo do artigo (não concentrados em uma seção)
4. Diversidade: evitar linkar múltiplas vezes para a mesma URL
5. Reciprocidade: priorizar URLs que ainda têm poucos links internos apontando para elas
6. Freshness: leve prioridade para artigos recentes (últimos 90 dias)

#### Modo Manual (Curadoria)
O sistema sugere links, mas o usuário revisa e aprova/rejeita cada um antes da inserção.

**Interface:**
- Lista de sugestões com: anchor text proposto, URL-alvo, título da página alvo, score de relevância
- Toggle para aprovar/rejeitar cada sugestão
- Campo para editar anchor text antes de aprovar
- Opção de adicionar links manuais que o sistema não sugeriu

### 2.3 Algoritmo de Matching

**Input para o prompt:**
1. Texto completo do artigo gerado
2. Lista de URLs do site (`site_url_map`)
3. Modo selecionado (automático/manual)

**Processo de matching:**
1. Para cada URL do inventário, o prompt avalia:
   - Relevância temática com o artigo atual (0-100)
   - Potencial de anchor text natural (existe uma frase no artigo que poderia ser link?)
   - Valor para o leitor (o link agrega ao entendimento do tema?)
2. Ranqueia por score combinado
3. Seleciona top N (conforme regras de distribuição)
4. Gera anchor text contextualizado para cada link

**Output — `interlinking_suggestions`:**
```json
{
  "mode": "manual",
  "suggestions": [
    {
      "target_url": "https://cliente.com.br/blog/seo-para-iniciantes",
      "target_title": "SEO para Iniciantes: Guia Completo",
      "anchor_text": "fundamentos de SEO",
      "context_sentence": "Para quem está começando, entender os [fundamentos de SEO] é essencial antes de avançar.",
      "relevance_score": 92,
      "insertion_point": "section_2_paragraph_3",
      "rationale": "O artigo menciona conceitos de SEO sem explicá-los. Link para guia básico complementa."
    }
  ],
  "reverse_suggestions": [
    {
      "source_url": "https://cliente.com.br/blog/marketing-digital-2026",
      "suggested_anchor": "estratégias avançadas de conteúdo",
      "rationale": "Artigo existente sobre marketing digital poderia linkar para este novo artigo na seção sobre content marketing."
    }
  ]
}
```

### 2.4 Reverse Linking (Bônus)

Além de inserir links NO artigo novo, o sistema sugere links DE artigos existentes PARA o novo artigo. Isso significa:
- Identificar artigos existentes que poderiam se beneficiar de um link para o novo conteúdo
- Sugerir anchor text e ponto de inserção no artigo existente
- Gerar lista de "reverse links" para o usuário implementar manualmente

**Variável:** `{{reverse_link_suggestions}}`

### 2.5 Armazenamento

**Tabela: `article_links`**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| article_id | uuid | FK → articles (artigo que contém o link) |
| target_url | text | URL de destino do link |
| anchor_text | text | Texto âncora usado |
| relevance_score | integer | Score de relevância (0-100) |
| is_reverse | boolean | Se é sugestão de reverse link |
| status | text | 'suggested', 'approved', 'rejected', 'inserted' |
| inserted_at | timestamptz | Quando foi inserido no artigo |

---

## 3. MÓDULO: OUTPUT DE METADADOS COMPLETO

### 3.1 Visão Geral

Expande o output final do pipeline para incluir um pacote completo de metadados SEO, prontos para publicação.

### 3.2 Metadados Gerados

#### 3.2.A — Meta Title
- Até 60 caracteres
- Inclui keyword principal
- 3 variações para A/B testing
- Score de CTR estimado para cada variação

#### 3.2.B — Meta Description
- Até 155 caracteres
- Inclui keyword principal + CTA implícito
- 2 variações (informativa e persuasiva)

#### 3.2.C — Slug
- URL-friendly, kebab-case
- Inclui keyword principal
- Sem stop words desnecessárias
- Máximo 5 palavras

#### 3.2.D — Alt Texts para Imagens
- Para cada imagem sugerida/placeholder no artigo
- Descritivo + keyword relevante quando natural
- Até 125 caracteres

#### 3.2.E — Schema Markup

**Article Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{meta_title}}",
  "description": "{{meta_description}}",
  "author": {
    "@type": "Person",
    "name": "{{author_name}}"
  },
  "datePublished": "{{publish_date}}",
  "publisher": {
    "@type": "Organization",
    "name": "{{brand_name}}"
  }
}
```

**FAQ Schema (quando aplicável):**
- Extraído automaticamente de seções Q&A ou listas de perguntas no artigo
- Formatado como `FAQPage` schema
- Máximo 10 perguntas (Google limita display)

**HowTo Schema (quando aplicável):**
- Extraído de artigos tipo tutorial/how-to
- Steps com nome, texto e imagem (placeholder)
- Tempo estimado e materiais necessários

**Breadcrumb Schema:**
- Gerado a partir da estrutura de categorias do site
- Home → Categoria → Artigo

#### 3.2.F — Sugestões de Anchor Text Reverso
- 3-5 sugestões de como outros artigos poderiam linkar para este novo
- Inclui: anchor text sugerido, contexto de uso, tipo de artigo que se beneficiaria

### 3.3 Output Format

**Output — `seo_metadata_package`:**
```json
{
  "meta_titles": [
    {"text": "Marketing Digital com IA: 10 Estratégias para 2026", "chars": 52, "ctr_score": 87},
    {"text": "Como Usar IA no Marketing Digital [Guia 2026]", "chars": 46, "ctr_score": 82},
    {"text": "IA no Marketing Digital: Guia Prático 2026", "chars": 43, "ctr_score": 79}
  ],
  "meta_descriptions": [
    {"text": "Descubra 10 estratégias práticas de IA para marketing digital em 2026. Automação, personalização e dados para escalar resultados.", "chars": 134, "style": "informativa"},
    {"text": "Sua concorrência já usa IA no marketing. Aprenda as 10 estratégias que geram resultados reais em 2026. Guia com exemplos práticos.", "chars": 133, "style": "persuasiva"}
  ],
  "slug": "ia-marketing-digital-estrategias-2026",
  "alt_texts": [
    {"image_ref": "hero_image", "alt": "Dashboard de marketing digital com métricas de IA em tempo real"},
    {"image_ref": "section_2_image", "alt": "Fluxograma de automação de marketing usando inteligência artificial"}
  ],
  "schema_markup": {
    "article": { /* ... */ },
    "faq": { /* ... */ },
    "howto": null,
    "breadcrumb": { /* ... */ }
  },
  "reverse_anchor_suggestions": [
    {
      "anchor_text": "estratégias de IA para marketing",
      "usage_context": "Em artigos sobre tendências de marketing digital",
      "target_article_types": ["tendências", "guias de marketing"]
    }
  ]
}
```

### 3.4 Integração

O pacote de metadados é gerado como etapa final (após SEO Optimizer), pelo novo **Prompt META-01 (Metadata Generator)**. Recebe:
- Artigo finalizado completo
- Keyword principal e secundárias
- Brand presets
- Estrutura do artigo (headings, seções)

---

## 4. MÓDULO: CAMADA GEO (Generative Engine Optimization)

### 4.1 Visão Geral

Adiciona uma nova dimensão de análise ao SEO Analyzer existente: verificação de "AI-readiness" — o quão bem o conteúdo está otimizado para ser encontrado e citado por LLMs (ChatGPT, Perplexity, Gemini, etc.).

### 4.2 Critérios de Avaliação GEO

#### 4.2.A — Respostas Diretas Extraíveis
- O artigo contém respostas diretas a perguntas que usuários fariam a um LLM?
- As respostas estão em formato que pode ser extraído isoladamente (não dependem de contexto anterior)?
- Existem "definition boxes" — parágrafos curtos e autocontidos que definem conceitos?

**Score:** 0-100 | **Peso:** Alto

#### 4.2.B — Dados Citáveis
- O artigo contém estatísticas, dados ou fatos com fonte citada?
- Os dados estão formatados de forma que um LLM pode citá-los? (ex: "Segundo [fonte], [dado]")
- Existem dados originais (pesquisa própria, cases) que LLMs não encontrariam em outro lugar?

**Score:** 0-100 | **Peso:** Alto

#### 4.2.C — Estrutura Extraível
- Headings descritivos (LLMs usam H2/H3 como "chunks" de informação)?
- Listas e tabelas formatadas corretamente (LLMs preferem dados estruturados)?
- Parágrafos curtos e focados (1 ideia por parágrafo)?
- Ausência de "walls of text" sem marcadores?

**Score:** 0-100 | **Peso:** Médio

#### 4.2.D — Autoridade e E-E-A-T
- Autor identificado com credenciais?
- Fontes de dados são autoritativas (gov, edu, pesquisas publicadas)?
- Conteúdo demonstra experiência prática (exemplos reais, cases)?
- Existem elementos de "Experience" (relato pessoal, metodologia testada)?

**Score:** 0-100 | **Peso:** Médio

#### 4.2.E — Cobertura Temática Completa
- O artigo cobre as sub-perguntas que um LLM geraria sobre o tema?
- Existem gaps temáticos que fariam um LLM buscar complemento em outras fontes?
- O conteúdo é o suficiente para ser a "fonte única" que um LLM usaria?

**Score:** 0-100 | **Peso:** Alto

#### 4.2.F — Schema e Metadata para AI
- Schema markup adequado (Article, FAQ, HowTo)?
- Meta description que funciona como "resumo" do conteúdo?
- Structured data que LLMs podem parsear?

**Score:** 0-100 | **Peso:** Baixo

### 4.3 Output — GEO Report

```json
{
  "geo_score_overall": 78,
  "breakdown": {
    "direct_answers": {"score": 85, "issues": [], "recommendations": []},
    "citable_data": {"score": 62, "issues": ["Seção 3 cita dados sem fonte"], "recommendations": ["Adicionar fonte para estatística de 47%"]},
    "extractable_structure": {"score": 90, "issues": [], "recommendations": []},
    "authority_eeat": {"score": 72, "issues": ["Falta bio do autor"], "recommendations": ["Adicionar parágrafo de credenciais no final"]},
    "topic_coverage": {"score": 80, "issues": ["Não cobre aspecto X"], "recommendations": ["Adicionar seção sobre X"]},
    "schema_metadata": {"score": 70, "issues": ["Sem FAQ schema"], "recommendations": ["Converter seção de perguntas em FAQ schema"]}
  },
  "priority_fixes": [
    {"fix": "Adicionar fontes para 3 estatísticas sem citação", "impact": "alto", "effort": "baixo"},
    {"fix": "Converter lista de perguntas em FAQ schema", "impact": "médio", "effort": "baixo"},
    {"fix": "Expandir seção sobre [tema X] com dados primários", "impact": "alto", "effort": "médio"}
  ]
}
```

### 4.4 Integração

A camada GEO é adicionada como extensão do **Prompt 07 (SEO Analyzer)** existente, via novo **Prompt GEO-01 (AI-Readiness Analyzer)**. Roda em paralelo com o SEO check tradicional. Os resultados são apresentados lado a lado:

| SEO Score | GEO Score |
|-----------|-----------|
| 85/100    | 78/100    |

O **Prompt 08 (SEO Optimizer)** é expandido para também aplicar correções GEO automaticamente, via novo **Prompt GEO-02 (AI-Readiness Optimizer)**.

---

## 5. MÓDULO: MODO EXTENSÃO

### 5.1 Visão Geral

Variação do pipeline onde, em vez de criar um artigo do zero, o sistema analisa um artigo existente e propõe expansões estratégicas para melhorar seu ranking.

### 5.2 Pipeline do Modo Extensão

**Etapa 1 — Ingestão**
- Input: URL do artigo existente
- FireCrawl extrai conteúdo completo
- Sistema identifica: headings, word count por seção, links internos/externos, imagens

**Etapa 2 — Análise de Performance**
- Tavily busca os top 5-10 artigos ranqueados para a mesma keyword principal
- Compara estrutura, profundidade e cobertura temática
- Identifica o que concorrentes cobrem e o artigo atual não

**Etapa 3 — Diagnóstico de Gaps**
- Prompt EXT-01 analisa o artigo e gera relatório:
  - Seções fracas (pouca profundidade, poucos dados, generic)
  - Seções ausentes (tópicos não cobertos que concorrentes cobrem)
  - Problemas de SEO (heading structure, keyword density, meta tags)
  - Problemas de GEO (respostas não-extraíveis, falta de dados citáveis)
  - Oportunidades de interlinking não exploradas

**Etapa 4 — Proposta de Expansão**
- Prompt EXT-02 gera plano de expansão:
  - Para cada seção fraca: proposta de rewrite com mais profundidade
  - Para cada seção ausente: outline + conteúdo sugerido
  - Para cada problema de SEO: fix específico
  - Estimativa de impacto: aumento de word count, novos keywords cobertos, melhoria de score

**Etapa 5 — Execução**
- Usuário seleciona quais expansões quer aplicar (checkboxes)
- Sistema gera conteúdo expandido para cada seção selecionada
- Montador integra novas seções ao artigo existente
- SEO + GEO check no artigo atualizado

### 5.3 Output do Diagnóstico

```json
{
  "article_url": "https://cliente.com.br/blog/marketing-digital",
  "current_word_count": 1800,
  "current_seo_score": 62,
  "current_geo_score": 45,
  "diagnosis": {
    "weak_sections": [
      {
        "heading": "Ferramentas de Marketing Digital",
        "current_word_count": 180,
        "issue": "Lista superficial sem profundidade. Concorrentes têm 500+ palavras com comparativos.",
        "proposed_expansion": "Expandir com comparativo de 5 ferramentas incluindo preço, prós/contras e caso de uso ideal.",
        "estimated_word_count_after": 550,
        "impact": "alto"
      }
    ],
    "missing_sections": [
      {
        "topic": "Marketing com IA Generativa",
        "covered_by": ["concorrente1.com", "concorrente2.com"],
        "proposed_heading": "Como Usar IA Generativa no Marketing Digital",
        "proposed_outline": ["Conceito", "Ferramentas", "Casos práticos", "ROI esperado"],
        "estimated_word_count": 600,
        "impact": "alto"
      }
    ],
    "seo_fixes": [
      {"issue": "H1 não contém keyword principal", "fix": "Alterar H1 para incluir 'marketing digital'", "impact": "médio"}
    ],
    "geo_fixes": [
      {"issue": "Nenhuma estatística com fonte citada", "fix": "Adicionar 3-5 dados de mercado com link para fonte", "impact": "alto"}
    ],
    "interlinking_opportunities": [
      {"target_url": "https://cliente.com.br/blog/seo-2026", "suggested_anchor": "estratégias de SEO", "impact": "médio"}
    ]
  },
  "projected_after_all_fixes": {
    "word_count": 3200,
    "seo_score": 88,
    "geo_score": 76
  }
}
```

### 5.4 Armazenamento

**Tabela: `article_extensions`**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| article_id | uuid | FK → articles |
| original_url | text | URL do artigo original |
| diagnosis | jsonb | Diagnóstico completo |
| selected_fixes | jsonb | Fixes selecionados pelo usuário |
| generated_content | jsonb | Conteúdo gerado para cada fix |
| status | text | 'diagnosed', 'in_progress', 'complete' |
| applied_at | timestamptz | Quando as mudanças foram aplicadas |

---

## 6. MÓDULO: DERIVAÇÃO CROSS-FORMAT

### 6.1 Visão Geral

A partir do artigo finalizado, gera automaticamente versões derivadas para outros formatos, conectando com a Máquina de Conteúdo existente para carrosseis e vídeos.

### 6.2 Formatos de Derivação

#### 6.2.A — Post LinkedIn

**Input:** Artigo completo + brand presets

**Regras de derivação:**
- Máximo 3000 caracteres (limite LinkedIn)
- Estrutura: Hook (1 linha impactante) → Contexto (2-3 linhas) → 3-5 insights-chave do artigo → CTA para ler o artigo completo
- Tom: mais pessoal e opinativo que o artigo (LinkedIn pede posicionamento)
- Usar quebras de linha para escaneabilidade
- Incluir 3-5 hashtags relevantes
- Incluir emoji strategy (sutil, não excessivo)

**Output:**
```json
{
  "format": "linkedin_post",
  "text": "...",
  "char_count": 2450,
  "hashtags": ["#MarketingDigital", "#IA", "#ConteúdoSEO"],
  "cta_url": "https://cliente.com.br/blog/artigo-novo",
  "suggested_image": "hero_image_do_artigo"
}
```

#### 6.2.B — Roteiro de Vídeo Curto (60-90s)

**Input:** Artigo completo + brand presets + persona do apresentador

**Regras de derivação:**
- Duração: 60-90 segundos (150-225 palavras faladas)
- Estrutura: Hook (0-5s) → Problema (5-15s) → 3 pontos-chave (15-60s) → CTA (60-90s)
- Linguagem oral (não "lida", mas "falada")
- Indicações de corte/transição para edição
- Sugestões de B-roll ou texto na tela

**Output:**
```json
{
  "format": "short_video_script",
  "duration_estimate": "75s",
  "word_count": 188,
  "script": [
    {"timecode": "0:00-0:05", "type": "hook", "spoken": "Você sabia que 73% das empresas...", "visual": "Texto na tela com estatística"},
    {"timecode": "0:05-0:15", "type": "problema", "spoken": "...", "visual": "B-roll de pessoa no computador"},
    {"timecode": "0:15-0:35", "type": "ponto_1", "spoken": "...", "visual": "..."},
    {"timecode": "0:35-0:55", "type": "ponto_2", "spoken": "...", "visual": "..."},
    {"timecode": "0:55-1:15", "type": "ponto_3_cta", "spoken": "...", "visual": "CTA na tela com link"}
  ],
  "cta_url": "https://cliente.com.br/blog/artigo-novo"
}
```

#### 6.2.C — Carrossel Instagram (8-12 slides)

**Input:** Artigo completo + brand presets + design presets (cores, fontes)

**Regras de derivação:**
- 8-12 slides
- Slide 1: Título/hook visual (1 frase impactante)
- Slides 2-N: 1 insight por slide, texto curto (máx 30 palavras por slide)
- Slide final: CTA + handle/site
- Conecta com o pipeline tribal já existente da Máquina de Conteúdo
- Variáveis de output compatíveis com o gerador de carrossel existente

**Output:**
```json
{
  "format": "instagram_carousel",
  "total_slides": 10,
  "slides": [
    {"number": 1, "type": "cover", "headline": "IA no Marketing Digital", "subheadline": "10 estratégias que funcionam em 2026"},
    {"number": 2, "type": "content", "headline": "1. Automação Inteligente", "body": "Não é sobre substituir humanos. É sobre amplificar o que já funciona.", "visual_note": "Ícone de robô + humano"},
    {"number": 10, "type": "cta", "headline": "Quer o guia completo?", "body": "Link na bio 👆", "url": "https://cliente.com.br/blog/artigo-novo"}
  ],
  "caption": "...",
  "hashtags": ["#MarketingDigital", "#IA", "#ConteúdoSEO"]
}
```

### 6.3 Integração com Máquina Existente

O módulo Cross-Format atua como BRIDGE entre o Article Wizard e a Máquina de Conteúdo existente:

1. **Carrossel:** O output do Prompt CROSS-03 gera variáveis compatíveis com o pipeline tribal de carrossel existente. O usuário pode pegar o output e refiná-lo no módulo de carrossel.

2. **Vídeo:** O output do Prompt CROSS-02 gera roteiro que pode ser usado diretamente ou alimentar o pipeline de roteiros da Máquina.

3. **LinkedIn:** Output independente, pronto para publicação.

### 6.4 UX

Após finalizar o artigo, botão "Derivar para outros formatos" abre modal com checkboxes:
- [ ] Post LinkedIn
- [ ] Roteiro de Vídeo Curto
- [ ] Carrossel Instagram

Geração em paralelo. Cada formato abre em aba separada para revisão/edição.

---

## 7. MAPA DE VARIÁVEIS — NOVOS MÓDULOS

### 7.1 Variáveis de Site Intelligence (prefixo `si_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{si_url_map}}` | JSON | URL Mapper | Interlinking, SEO Analyzer |
| `{{si_url_map_summary}}` | Text | URL Mapper (resumido) | Outline Generator |
| `{{si_brand_voice_profile}}` | JSON | Brand Voice Extractor | Todos os prompts de produção |
| `{{si_keyword_gaps}}` | JSON | Keyword Gap Analyzer | Outline Generator, SEO Analyzer |
| `{{si_competitor_topics}}` | Text | Keyword Gap Analyzer | Research Synthesizer |

### 7.2 Variáveis de Interlinking (prefixo `il_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{il_mode}}` | Text | Config do usuário | Montador + Interlinking |
| `{{il_available_urls}}` | JSON | Site Intelligence | Montador + Interlinking |
| `{{il_suggestions}}` | JSON | Prompt IL-01 | Review UI |
| `{{il_reverse_suggestions}}` | JSON | Prompt IL-01 | Dashboard |
| `{{il_max_links}}` | Integer | Config do usuário | Montador + Interlinking |

### 7.3 Variáveis de Metadados (prefixo `meta_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{meta_titles}}` | JSON | Prompt META-01 | Output final |
| `{{meta_descriptions}}` | JSON | Prompt META-01 | Output final |
| `{{meta_slug}}` | Text | Prompt META-01 | Output final |
| `{{meta_alt_texts}}` | JSON | Prompt META-01 | Output final |
| `{{meta_schema_article}}` | JSON | Prompt META-01 | Output final |
| `{{meta_schema_faq}}` | JSON | Prompt META-01 | Output final |
| `{{meta_schema_howto}}` | JSON | Prompt META-01 | Output final |
| `{{meta_reverse_anchors}}` | JSON | Prompt META-01 | Dashboard |

### 7.4 Variáveis GEO (prefixo `geo_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{geo_score}}` | Integer | Prompt GEO-01 | Dashboard, SEO Optimizer |
| `{{geo_report}}` | JSON | Prompt GEO-01 | Review UI |
| `{{geo_fixes}}` | JSON | Prompt GEO-01 | SEO Optimizer (expandido) |
| `{{geo_optimized_content}}` | Text | Prompt GEO-02 | Output final |

### 7.5 Variáveis de Extensão (prefixo `ext_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{ext_original_article}}` | Text | FireCrawl | Prompts EXT-01, EXT-02 |
| `{{ext_original_url}}` | Text | Input do usuário | Todos EXT |
| `{{ext_competitor_articles}}` | JSON | Tavily | Prompt EXT-01 |
| `{{ext_diagnosis}}` | JSON | Prompt EXT-01 | Prompt EXT-02, UI |
| `{{ext_selected_fixes}}` | JSON | Seleção do usuário | Prompt EXT-03 |
| `{{ext_expanded_content}}` | Text | Prompt EXT-03 | Montador |

### 7.6 Variáveis Cross-Format (prefixo `cross_`)

| Variável | Tipo | Origem | Usado em |
|----------|------|--------|----------|
| `{{cross_source_article}}` | Text | Artigo finalizado | Todos CROSS |
| `{{cross_linkedin_post}}` | JSON | Prompt CROSS-01 | Output |
| `{{cross_video_script}}` | JSON | Prompt CROSS-02 | Output |
| `{{cross_carousel}}` | JSON | Prompt CROSS-03 | Output / Máquina de Conteúdo |

---

## 8. SCHEMA DO BANCO — NOVAS TABELAS

### 8.1 Diagrama ER (Novas Tabelas)

```
site_intelligence          article_links           article_extensions
├── id                     ├── id                  ├── id
├── project_id (FK)        ├── article_id (FK)     ├── article_id (FK)
├── site_url               ├── target_url          ├── original_url
├── url_map (jsonb)        ├── anchor_text         ├── diagnosis (jsonb)
├── brand_voice (jsonb)    ├── relevance_score     ├── selected_fixes (jsonb)
├── keyword_gaps (jsonb)   ├── is_reverse          ├── generated_content (jsonb)
├── competitor_urls        ├── status              ├── status
├── crawled_at             └── inserted_at         └── applied_at
├── urls_count
└── status

article_metadata           article_geo_scores      article_derivations
├── id                     ├── id                  ├── id
├── article_id (FK)        ├── article_id (FK)     ├── article_id (FK)
├── meta_titles (jsonb)    ├── overall_score       ├── format
├── meta_descriptions      ├── direct_answers      ├── content (jsonb)
├── slug                   ├── citable_data        ├── status
├── alt_texts (jsonb)      ├── extractable_struct  ├── published_at
├── schema_article         ├── authority_eeat      ├── published_url
├── schema_faq             ├── topic_coverage      └── created_at
├── schema_howto           ├── schema_metadata
├── schema_breadcrumb      ├── report (jsonb)
└── reverse_anchors        └── analyzed_at
```

### 8.2 Migrations SQL

```sql
-- Site Intelligence
CREATE TABLE site_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  url_map JSONB DEFAULT '{}',
  brand_voice_profile JSONB DEFAULT '{}',
  keyword_gaps JSONB DEFAULT '{}',
  competitor_urls TEXT[] DEFAULT '{}',
  crawled_at TIMESTAMPTZ,
  urls_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'analyzing', 'complete', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Article Links (Interlinking)
CREATE TABLE article_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  is_reverse BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected', 'inserted')),
  insertion_point TEXT,
  rationale TEXT,
  inserted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Article Metadata
CREATE TABLE article_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  meta_titles JSONB DEFAULT '[]',
  meta_descriptions JSONB DEFAULT '[]',
  slug TEXT,
  alt_texts JSONB DEFAULT '[]',
  schema_article JSONB DEFAULT '{}',
  schema_faq JSONB,
  schema_howto JSONB,
  schema_breadcrumb JSONB,
  reverse_anchors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GEO Scores
CREATE TABLE article_geo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  direct_answers INTEGER DEFAULT 0,
  citable_data INTEGER DEFAULT 0,
  extractable_structure INTEGER DEFAULT 0,
  authority_eeat INTEGER DEFAULT 0,
  topic_coverage INTEGER DEFAULT 0,
  schema_metadata INTEGER DEFAULT 0,
  report JSONB DEFAULT '{}',
  priority_fixes JSONB DEFAULT '[]',
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Article Extensions
CREATE TABLE article_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  diagnosis JSONB DEFAULT '{}',
  selected_fixes JSONB DEFAULT '[]',
  generated_content JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'diagnosed', 'in_progress', 'complete')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Article Derivations
CREATE TABLE article_derivations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('linkedin', 'video_script', 'carousel')),
  content JSONB DEFAULT '{}',
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'edited', 'published')),
  published_at TIMESTAMPTZ,
  published_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_site_intelligence_project ON site_intelligence(project_id);
CREATE INDEX idx_article_links_article ON article_links(article_id);
CREATE INDEX idx_article_links_status ON article_links(status);
CREATE INDEX idx_article_metadata_article ON article_metadata(article_id);
CREATE INDEX idx_article_geo_article ON article_geo_scores(article_id);
CREATE INDEX idx_article_extensions_article ON article_extensions(article_id);
CREATE INDEX idx_article_derivations_article ON article_derivations(article_id);
CREATE INDEX idx_article_derivations_format ON article_derivations(format);
```

---

## 9. CONSIDERAÇÕES TÉCNICAS

### 9.1 Performance

| Módulo | Tempo Estimado | Pode rodar em paralelo? |
|--------|---------------|------------------------|
| Site Intelligence (crawl) | 2-5 min | Sim (pré-pipeline) |
| Site Intelligence (análise) | 30-60s | Sim (após crawl) |
| Interlinking | 15-30s | Não (depende do artigo pronto) |
| Metadados | 10-20s | Sim (paralelo com interlinking) |
| GEO Analysis | 15-30s | Sim (paralelo com SEO check) |
| GEO Optimization | 20-40s | Não (depende da análise) |
| Extensão (diagnóstico) | 30-60s | N/A (pipeline separado) |
| Extensão (geração) | 1-3 min | Depende do nº de fixes |
| Cross-Format (cada) | 15-30s | Sim (todos em paralelo) |

### 9.2 Custos de API

| Módulo | Chamadas externas | Custo estimado/artigo |
|--------|-------------------|----------------------|
| Site Intelligence | FireCrawl (crawl) + Tavily (gap analysis) | $0.05-0.15 |
| Interlinking | Nenhuma adicional (usa dados do SI) | $0.00 |
| Metadados | Nenhuma adicional | $0.00 |
| GEO | Nenhuma adicional | $0.00 |
| Extensão | FireCrawl (1 URL) + Tavily (competitors) | $0.03-0.08 |
| Cross-Format | Nenhuma adicional | $0.00 |

**Custo LLM adicional (OpenRouter):** ~$0.02-0.08 por módulo (depende do modelo selecionado)

### 9.3 Fallbacks

- **FireCrawl indisponível:** Fallback para extração via fetch simples + cheerio
- **Tavily indisponível:** Fallback para Perplexity API
- **Modelo LLM indisponível:** Fallback para modelo secundário configurado em Settings

### 9.4 Ordem de Implementação Sugerida

1. **Interlinking Contextual Real** — Maior impacto SEO imediato, menor complexidade
2. **Output de Metadados Completo** — Quick win, melhora qualidade do output
3. **Módulo Site Intelligence** — Fundação para interlinking real e gap analysis
4. **Camada GEO** — Diferencial competitivo único
5. **Modo Extensão** — Feature complementar de alto valor
6. **Derivação Cross-Format** — Integração com ecossistema existente