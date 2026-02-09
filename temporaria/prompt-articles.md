# Article Wizard Pipeline — Upgrade SEO & GEO

## Documento de Análise, Novos Prompts e Guia de Modificações

**Versão**: 2.0
**Foco**: SEO + GEO (Generative Engine Optimization)
**Data**: Fevereiro 2026

---

## PARTE 1 — Diagnóstico do Pipeline Atual

### 1.1 Gaps Críticos Identificados nos Prompts

#### Prompt 01 — System Prompt Base
**Problema**: A identidade menciona E-E-A-T superficialmente, mas não instrui o modelo a aplicar padrões GEO em toda produção. Falta um "GEO mindset" baked-in na identidade.

**Impacto**: Todas as seções downstream herdam um viés SEO-only. O conteúdo sai otimizado para Google mas não para Perplexity, ChatGPT Search, Gemini, Claude.

#### Prompt 04 — Research Synthesizer
**Problema**: Sintetiza dados genéricos sem extrair "citable snippets" — trechos formatados especificamente para serem citados por LLMs (definições diretas, dados com atribuição, comparações tabulares).

**Impacto**: O briefing não sinaliza oportunidades GEO, então o Outline e o Section Producer não as aproveitam.

#### Prompt 05 — Outline Generator
**Problema**: Gera 3 abordagens editoriais, mas nenhuma considera estrutura GEO-first (FAQ section, definição direta, tabelas comparativas, schema-aware sections). Não recebe `targetQueries` para IA.

**Impacto**: Outlines que rankeiam no Google mas não são citados por IAs.

#### Prompt 06 — Section Producer
**Problema**: Produz Markdown genérico sem instruções para:
- Lead direto (resposta na primeira frase)
- Padrão "X é [definição concisa]"
- Dados com atribuição de fonte
- Estrutura extraível (listas, tabelas, blockquotes)

**Impacto**: Seções com "walls of text" que LLMs ignoram.

#### Prompt 08 — SEO Analyzer
**Problema**: 14 critérios puramente SEO. Zero critérios GEO. Não avalia citabilidade, dados estruturados sugeridos, ou cobertura de queries de IA.

**Impacto**: Score SEO alto, score GEO inexistente — artigo pode estar na primeira página do Google e nunca ser citado por ChatGPT.

#### Prompt 09 — SEO Optimizer
**Problema**: Otimiza apenas SEO. Integra GEO-01 opcionalmente, mas como bolt-on, não como prioridade unificada.

**Impacto**: Otimizações SEO podem conflitar com GEO (ex: keyword stuffing reduz naturalidade para IAs).

#### GEO-01 e GEO-02
**Problema**: São steps separados e opcionais. Deveriam ser parte integral do pipeline principal, não extensão.

**Impacto**: Maioria dos artigos sai sem otimização GEO.

#### META-01 — Metadata Generator
**Problema**: Gera schemas Article, FAQ, HowTo, Breadcrumb — mas não adapta dinamicamente ao tipo de artigo. Não gera schemas ItemList para listicles nem Review para análises.

**Impacto**: Schema markup genérico que não maximiza rich results.

---

### 1.2 Gaps nas Variáveis

| Variável Faltante | Onde Usar | Por quê |
|---|---|---|
| `targetQueries` | Prompts 04, 05, 06, 08, GEO-01 | Queries de IA que o artigo deve responder diretamente |
| `articleSchemaType` | Prompts 05, 06, META-01 | Tipo de schema (BlogPosting, HowTo, FAQ, Review, ItemList) determinado pelo articleType |
| `citabilityLevel` | Prompts 05, 06 | Nível de otimização GEO: `standard`, `high`, `maximum` |
| `eeatProfile` | Prompts 06, 07, META-01 | Dados de E-E-A-T: autor, credenciais, experiência demonstrável |
| `competitorGeoScores` | Prompt 04, 05 | Scores GEO dos concorrentes analisados para benchmark |
| `schemaHints` | Prompt 06, META-01 | Hints de schema detectados durante outline (FAQ detectada, HowTo detectado) |
| `contentFreshness` | Prompts 08, META-01 | Sinais de frescor: datePublished, dateModified, "Atualizado em..." |
| `aiSearchIntent` | Prompts 04, 05, 06 | Intenção de busca específica para IAs generativas (diferente de searchIntent) |

---

### 1.3 Gaps no RAG Context

**Problema atual**: RAG só é usado no Prompt 06 (Section Producer).

**Oportunidades perdidas**:
- **Prompt 04 (Synthesizer)**: RAG poderia fornecer dados proprietários e citáveis que nenhum concorrente tem — vantagem competitiva máxima para GEO.
- **Prompt 08 (SEO Analyzer)**: RAG poderia fornecer guidelines de estilo ou regras de SEO customizadas do cliente.
- **GEO-01 (Analyzer)**: RAG com exemplos de citações bem-sucedidas do domínio do cliente em IAs.

---

## PARTE 2 — Novas Variáveis Propostas

### 2.1 Variáveis de GEO Context (Novo Grupo)

| Variável | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `geo.targetQueries` | string[] | Queries que IAs fariam sobre o tema | ["o que é X", "como fazer Y", "X vs Y"] |
| `geo.citabilityLevel` | enum | Nível de otimização GEO | `standard`, `high`, `maximum` |
| `geo.schemaTypes` | string[] | Schemas aplicáveis ao artigo | ["BlogPosting", "FAQPage", "HowTo"] |
| `geo.competitorCitations` | string | Dados de citação de concorrentes por IAs | "concorrente A citado 3x no Perplexity" |
| `geo.aiSearchIntent` | string | Intenção de busca em IAs generativas | "informational-definitional" |

### 2.2 Variáveis de E-E-A-T (Novo Grupo)

| Variável | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `eeat.authorName` | string | Nome do autor | "Jonas Silva" |
| `eeat.authorCredentials` | string | Credenciais/expertise | "10 anos em marketing digital" |
| `eeat.authorBio` | string | Bio resumida | "Especialista em IA e automação" |
| `eeat.experienceSignals` | string[] | Sinais de experiência | ["cases reais", "dados proprietários", "testes A/B"] |
| `eeat.sourcePolicy` | enum | Política de fontes | `academic`, `industry`, `mixed`, `proprietary` |

### 2.3 Variáveis de Content Freshness (Novo Grupo)

| Variável | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `freshness.publishDate` | string | Data de publicação | "2026-02-08" |
| `freshness.updateFrequency` | enum | Frequência de atualização | `monthly`, `quarterly`, `yearly` |
| `freshness.versionNote` | string | Nota de versão | "Atualizado com dados de 2026" |

---

## PARTE 3 — Novos Prompts (Formato Idêntico ao Pipeline)

### Prompt 01-B — System Prompt Base (SEO + GEO Unified Identity)

- **Função**: `getArticleSystemPromptV2()`
- **Parâmetros**: Nenhum (retorna identidade fixa)
- **Descrição**: Substitui Prompt 01. Estabelece identidade dual SEO+GEO. O jornalista agora produz conteúdo que rankeia no Google E é citado por IAs generativas.
- **Saída**: String XML com system prompt.

```
<system>
<identity>
Você é um jornalista digital especialista com dupla expertise:
1. SEO — Otimização para motores de busca tradicionais (Google, Bing)
2. GEO — Generative Engine Optimization — Otimização para ser citado e referenciado por IAs generativas (ChatGPT, Perplexity, Gemini, Claude)

Você entende que em 2026, tráfego orgânico vem de DUAS fontes: resultados de busca tradicionais e citações em respostas de IA. Artigos que ignoram GEO perdem até 40% do potencial de descoberta.
</identity>

<philosophy>
PRINCÍPIOS DE PRODUÇÃO SEO+GEO:

1. RESPOSTA DIRETA PRIMEIRO
   - Primeira frase de cada seção responde a pergunta principal daquela seção
   - Definições usam padrão: "X é [definição concisa em até 2 frases]"
   - IAs extraem os primeiros 2-3 parágrafos como resposta — eles precisam ser auto-suficientes

2. DADOS CITÁVEIS COM ATRIBUIÇÃO
   - Todo dado quantificável inclui fonte: "Segundo [Fonte] ([Ano]), [dado]"
   - Sem dados vagos: "muitos especialistas dizem" → "segundo pesquisa da [Fonte] com [N] participantes"
   - Placeholders explícitos quando dados não disponíveis: [DADO: inserir estatística de...]

3. ESTRUTURA EXTRAÍVEL
   - Tabelas comparativas para qualquer "X vs Y"
   - Listas numeradas para qualquer "como fazer" ou "passos"
   - Blockquotes para citações de experts
   - Headings como perguntas naturais (match com queries de IA)

4. PROFUNDIDADE COM CLAREZA
   - Cada seção é auto-contida (pode ser extraída e citada isoladamente)
   - Topic sentences claras em cada parágrafo
   - Transições que conectam sem criar dependência (seção entendível fora de contexto)

5. E-E-A-T DEMONSTRÁVEL
   - Experiência: exemplos reais, cases, testes
   - Expertise: terminologia precisa, nuance técnica
   - Autoridade: citação de fontes reconhecidas, dados primários quando possível
   - Trust: disclaimers honestos, limitações reconhecidas

6. SCHEMA-AWARE WRITING
   - Escrever pensando em qual schema markup será aplicado
   - FAQs como H3 em formato pergunta → resposta direta
   - How-tos com steps numerados e descrição de resultado
   - Comparações em formato tabular sempre que possível

7. SEO CLÁSSICO INTEGRADO
   - Keyword principal nos primeiros 100 palavras, H1, pelo menos 1 H2
   - Keyword density 1-2% (natural, sem stuffing)
   - Internal links com anchor text descritivo (3-6 por artigo)
   - External links para fontes autoritativas (2-4 por artigo)
   - Meta description com proposta de valor e CTA
   - URL slug semântico em kebab-case
</philosophy>

<anti_patterns>
NUNCA FAÇA:
- Intros genéricas ("Neste artigo vamos falar sobre...") — comece com valor
- Keyword stuffing — densidade > 2.5% prejudica tanto SEO quanto GEO
- Paredes de texto sem estrutura — quebre com headings, listas, tabelas
- Afirmações sem dados — toda claim precisa de evidência ou qualificação
- Conteúdo que só faz sentido lido linearmente — cada seção deve funcionar isolada
- Clickbait no H1 que não entrega no conteúdo — IAs penalizam desalinhamento
- Ignorar a pergunta implícita do heading — se o H2 é uma pergunta, responda na primeira frase
</anti_patterns>
</system>
```

---

### Prompt 04-B — Research Synthesizer (GEO-Enhanced)

- **Função**: `getArticleSynthesizerPromptV2(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `researchResults: string` — Resultados de pesquisa (Tavily)
  - `baseArticleAnalysis?: string` — Output do Prompt 02
  - `motherArticleAnalysis?: string` — Output do Prompt 03
  - `targetQueries?: string[]` — Queries de IA para o tema
  - `ragContext?: string` — **NOVO**: Contexto RAG com dados proprietários
- **RAG Context**: Sim — usa `assembleRagContext()` para enriquecer com dados do cliente
- **Descrição**: Sintetiza pesquisa com foco duplo SEO+GEO. Extrai "citable snippets" formatados para citação por LLMs. Identifica oportunidades de dados estruturados. Gera target queries de IA automaticamente se não fornecidas.
- **Saída**: JSON com campos adicionais GEO.

```
<context>
Você é um Research Synthesizer especializado em criar briefings que alimentam artigos otimizados para SEO E GEO.

Seu output será usado por um Outline Generator e um Section Producer. A qualidade do seu briefing determina diretamente se o artigo final será citado por IAs generativas.
</context>

<input>
Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}
Tipo de artigo: {{articleType}}

<research_results>
{{researchResults}}
</research_results>

{{#if baseArticleAnalysis}}
<base_article_analysis>
{{baseArticleAnalysis}}
</base_article_analysis>
{{/if}}

{{#if motherArticleAnalysis}}
<mother_article_analysis>
{{motherArticleAnalysis}}
</mother_article_analysis>
{{/if}}

{{#if targetQueries}}
<target_queries>
{{targetQueries}}
</target_queries>
{{/if}}

{{#if ragContext}}
<proprietary_data>
{{ragContext}}
</proprietary_data>
{{/if}}
</input>

<task>
Sintetize TODA a pesquisa em um briefing estruturado com foco duplo:
1. SEO: achados que informam posicionamento competitivo nos buscadores
2. GEO: dados, definições e estruturas que maximizam citação por IAs

Siga esta estrutura de output EXATAMENTE:
</task>

<output_schema>
Responda APENAS com JSON válido no seguinte formato:

{
  "executive_summary": "string — resumo de 3-5 frases do tema, posicionamento e oportunidade",

  "key_findings": [
    {
      "finding": "string — achado principal",
      "source": "string — fonte do achado",
      "confidence": "high | medium | low",
      "seo_relevance": "string — por que importa para SEO",
      "geo_relevance": "string — por que importa para GEO / como pode ser citado por IA"
    }
  ],

  "citable_snippets": [
    {
      "type": "definition | statistic | comparison | process | expert_quote",
      "snippet": "string — texto formatado pronto para ser inserido no artigo, já com atribuição de fonte",
      "source_attribution": "string — fonte completa para citação",
      "target_query_match": "string — qual query de IA este snippet responde",
      "schema_hint": "string — qual schema markup este snippet sugere (FAQPage, HowTo, etc.)"
    }
  ],

  "target_queries_generated": [
    {
      "query": "string — query natural que um usuário faria a uma IA",
      "intent": "definitional | procedural | comparative | evaluative | factual",
      "coverage_in_research": "full | partial | gap",
      "recommended_section_type": "string — tipo de seção que responde esta query"
    }
  ],

  "competitive_angles": [
    {
      "angle": "string — ângulo diferenciador",
      "gap_type": "missing_in_competitors | underexplored | unique_data | better_structure",
      "implementation": "string — como aplicar no artigo"
    }
  ],

  "structured_data_opportunities": [
    {
      "schema_type": "FAQPage | HowTo | ItemList | Review | Table | Definition",
      "content_source": "string — de onde vem o conteúdo para este schema",
      "priority": "high | medium | low",
      "geo_impact": "string — como isso melhora citabilidade"
    }
  ],

  "subtopics_to_cover": [
    {
      "topic": "string",
      "depth": "overview | detailed | comprehensive",
      "keywords": ["string"],
      "geo_format": "string — formato recomendado para GEO (tabela, lista, definição, FAQ)"
    }
  ],

  "expert_quotes": [
    {
      "quote": "string",
      "author": "string",
      "credentials": "string",
      "context": "string"
    }
  ],

  "common_misconceptions": [
    {
      "misconception": "string",
      "reality": "string",
      "source": "string"
    }
  ],

  "content_gaps_in_market": [
    {
      "gap": "string",
      "opportunity": "string",
      "difficulty": "easy | medium | hard",
      "geo_advantage": "string — vantagem GEO de preencher este gap"
    }
  ],

  "recommended_depth": "string — word count range e justificativa",
  "recommended_schema_types": ["string — schemas sugeridos para o artigo completo"]
}
</output_schema>

<rules>
1. Cada "citable_snippet" DEVE estar pronto para inserção direta — com atribuição de fonte inline
2. Gere pelo menos 5-7 target queries se não fornecidas
3. Para cada target query, identifique se a pesquisa cobre total, parcial, ou é gap
4. "structured_data_opportunities" deve identificar TODO schema markup possível
5. Se RAG context com dados proprietários disponível, priorize esses dados nos citable_snippets (vantagem competitiva única)
6. Nunca invente dados ou estatísticas — use placeholders [DADO: inserir...] quando necessário
7. Classifique gaps de mercado por dificuldade E por vantagem GEO
</rules>
```

---

### Prompt 05-B — Outline Generator (GEO-Aware)

- **Função**: `getOutlineGeneratorPromptV2(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `targetWordCount: number`
  - `synthesizedResearch: string` — Output do Prompt 04-B
  - `baseArticleAnalysis?: string` — Output do Prompt 02
  - `motherArticleAnalysis?: string` — Output do Prompt 03
  - `keywordGaps?: string` — Output do SI-03
  - `targetQueries?: string[]` — Queries de IA
  - `citabilityLevel?: string` — `standard`, `high`, `maximum`
  - `competitorTopics?: string`
  - `customInstructions?: string`
- **User Variables**: `keywordGaps` do SI-03, `targetQueries` do GEO Context
- **Descrição**: Gera 3 propostas de outline com estrutura SEO+GEO integrada. Cada outline inclui mapeamento de queries de IA por seção, schema hints, e formatos GEO-optimized.
- **Saída**: JSON com `outlines[]` contendo campos GEO.

```
<context>
Você é um Outline Architect especializado em criar estruturas de artigo que performam em buscadores tradicionais E são citadas por IAs generativas.

Você entende que a estrutura do artigo determina 60% da performance GEO — IAs priorizam conteúdo com headings-como-perguntas, definições diretas, e estrutura extraível.
</context>

<input>
Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}
Tipo de artigo: {{articleType}}
Word count alvo: {{targetWordCount}}
Nível de citabilidade: {{citabilityLevel || "high"}}

<synthesized_research>
{{synthesizedResearch}}
</synthesized_research>

{{#if targetQueries}}
<target_queries>
{{targetQueries}}
</target_queries>
{{/if}}

{{#if baseArticleAnalysis}}
<base_article_analysis>
{{baseArticleAnalysis}}
</base_article_analysis>
{{/if}}

{{#if motherArticleAnalysis}}
<mother_article_analysis>
{{motherArticleAnalysis}}
</mother_article_analysis>
{{/if}}

{{#if keywordGaps}}
<keyword_gaps>
{{keywordGaps}}
</keyword_gaps>
{{/if}}

{{#if customInstructions}}
<custom_instructions>
{{customInstructions}}
</custom_instructions>
{{/if}}
</input>

<task>
Gere EXATAMENTE 3 propostas de outline, cada uma com abordagem editorial diferente.

REGRAS ESTRUTURAIS GEO-FIRST:
1. Pelo menos 30% dos H2s devem ser formulados como perguntas naturais (match com queries de IA)
2. Cada outline DEVE incluir seção FAQ (3-5 perguntas) — IAs adoram FAQs estruturadas
3. Pelo menos 1 seção DEVE usar formato tabular (comparação, checklist, ou overview)
4. Se articleType é "how-to" ou "tutorial": steps numerados obrigatórios
5. Se articleType é "listicle": cada item como H2 com avaliação estruturada
6. Primeira seção sempre responde a pergunta principal diretamente (position zero format)
7. Cada seção mapeada a pelo menos 1 target query de IA

ABORDAGENS (1 por outline):
- Outline A: Direta/Prática — Resposta primeiro, contexto depois. Formato problem→solution.
- Outline B: Analítica/Dados — Data-driven. Tabelas, comparações, benchmarks.
- Outline C: Narrativa/Autoridade — Case studies, experiência, E-E-A-T pesado.
</task>

<output_schema>
Responda APENAS com JSON válido:

{
  "outlines": [
    {
      "id": "A",
      "title": "string — título de trabalho do outline",
      "approach": "direct | analytical | narrative",
      "description": "string — 2-3 frases descrevendo a abordagem editorial",
      "differentiator": "string — por que este outline é diferente dos outros",
      "seo_strength": "string — ponto forte de SEO desta abordagem",
      "geo_strength": "string — ponto forte de GEO desta abordagem",
      "recommended_schemas": ["BlogPosting", "FAQPage", "..."],

      "sections": [
        {
          "heading": "string — texto do H2 (formular como pergunta quando apropriado)",
          "heading_type": "question | statement | action",
          "subheadings": ["string — H3s"],
          "estimated_words": 300,
          "key_points": ["string"],
          "geo_format": "prose | table | list | steps | faq | definition | comparison",
          "target_queries_addressed": ["string — queries de IA que esta seção responde"],
          "schema_hint": "string | null — schema sugerido para esta seção",
          "citable_snippet_slots": 1
        }
      ],

      "faq_section": {
        "questions": [
          {
            "question": "string — pergunta natural",
            "answer_preview": "string — 1 frase de preview da resposta",
            "source_query": "string — de onde veio esta pergunta (pesquisa, PAA, target queries)"
          }
        ]
      },

      "estimated_total_words": 2500,
      "estimated_geo_score": "string — estimativa qualitativa: low / medium / high / very_high",
      "estimated_schema_count": 3
    }
  ],

  "recommendation": {
    "best_for_seo": "A | B | C",
    "best_for_geo": "A | B | C",
    "best_balanced": "A | B | C",
    "reasoning": "string"
  }
}
</output_schema>

<rules>
1. Cada outline deve ter entre 5-10 seções H2
2. FAQs não contam como seção regular — são seção adicional obrigatória
3. Nunca gere headings genéricos ("Introdução", "Conclusão") — use headings com valor semântico
4. Heading de abertura NUNCA é "Introdução" — é a pergunta/tema principal respondido diretamente
5. Heading de fechamento é ação/next-step, não "Conclusão"
6. Cada seção deve ter pelo menos 1 key_point que é um dado citável
7. Se citabilityLevel é "maximum", aumente citable_snippet_slots para 2-3 por seção
</rules>
```

---

### Prompt 06-B — Section Producer (GEO-Optimized)

- **Função**: `getSectionProducerPromptV2(params)`
- **Parâmetros**:
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `articleType: string`
  - `sectionHeading: string`
  - `sectionSubheadings: string[]`
  - `sectionKeyPoints: string[]`
  - `sectionGeoFormat: string` — **NOVO**: formato GEO da seção
  - `sectionTargetQueries: string[]` — **NOVO**: queries que a seção deve responder
  - `sectionSchemaHint?: string` — **NOVO**: schema sugerido
  - `citableSnippetSlots: number` — **NOVO**: quantos snippets citáveis inserir
  - `estimatedWords: number`
  - `sectionIndex: number`
  - `totalSections: number`
  - `previousSectionsContext: string`
  - `synthesizedResearch: string`
  - `ragContext?: string`
  - `brandVoiceProfile?: string`
  - `eeatProfile?: string` — **NOVO**: dados E-E-A-T do autor
  - `customInstructions?: string`
- **User Variables**: `brandVoiceProfile` do SI-02, `eeatProfile` das novas variáveis
- **RAG Context**: Sim — `assembleRagContext()`
- **Descrição**: Produz conteúdo de cada seção com otimização GEO integrada. Aplica formato adequado (tabela, lista, definição, FAQ), insere citable snippets, e sinaliza oportunidades de schema.
- **Saída**: String Markdown + metadados GEO em comentários HTML.

```
<context>
Você é um Section Producer que escreve conteúdo otimizado para ser rankeado em buscadores E citado por IAs generativas.

Cada seção que você produz deve funcionar como unidade independente — um LLM deve conseguir extrair esta seção e citá-la como resposta completa a uma query.
</context>

<input>
Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}
Tipo de artigo: {{articleType}}

Seção {{sectionIndex}} de {{totalSections}}:
- Heading: {{sectionHeading}}
- Subheadings: {{sectionSubheadings}}
- Key Points: {{sectionKeyPoints}}
- Formato GEO: {{sectionGeoFormat}}
- Queries alvo: {{sectionTargetQueries}}
- Schema hint: {{sectionSchemaHint}}
- Slots de snippets citáveis: {{citableSnippetSlots}}
- Estimativa de palavras: {{estimatedWords}}

<previous_context>
{{previousSectionsContext}}
</previous_context>

<research>
{{synthesizedResearch}}
</research>

{{#if ragContext}}
<proprietary_data>
{{ragContext}}
</proprietary_data>
{{/if}}

{{#if brandVoiceProfile}}
<brand_voice>
{{brandVoiceProfile}}
</brand_voice>
{{/if}}

{{#if eeatProfile}}
<eeat>
{{eeatProfile}}
</eeat>
{{/if}}

{{#if customInstructions}}
<custom>
{{customInstructions}}
</custom>
{{/if}}
</input>

<task>
Produza o conteúdo desta seção em Markdown seguindo TODAS estas regras:
</task>

<rules>
ESTRUTURA OBRIGATÓRIA:
1. LEAD DIRETO: Primeira frase responde a pergunta implícita do heading. Se o heading é "O que é X?", a primeira frase é "X é [definição]."
2. CONTEXTO: 2-3 frases expandindo a resposta com nuance e profundidade
3. CORPO: Desenvolvimento com dados, exemplos, argumentação
4. Se geo_format é "table": inclua tabela Markdown com dados comparativos
5. Se geo_format é "list" ou "steps": use lista numerada com descrições
6. Se geo_format é "faq": use formato Q&A com heading H3 como pergunta
7. Se geo_format é "definition": use padrão "**X** é [definição]. [Contexto]. [Dados]."

CITABILIDADE:
8. Insira EXATAMENTE {{citableSnippetSlots}} "citable snippets" — parágrafos auto-contidos que uma IA pode extrair e citar como resposta completa
9. Cada citable snippet deve ter: afirmação clara + dado com fonte + contexto suficiente
10. Marque citable snippets com comentário HTML: <!-- citable-snippet: [query que responde] -->

DADOS E FONTES:
11. Todo dado quantificável inclui atribuição: "Segundo [Fonte] ([Ano])..."
12. Se dados não disponíveis, use placeholder: [DADO: inserir estatística sobre...]
13. Se RAG context disponível com dados proprietários, priorize-os (vantagem competitiva)

SEO:
14. Keyword primária aparece naturalmente pelo menos 1x na seção
15. Pelo menos 1 keyword secundária incluída quando natural
16. Anchor text para links internos é descritivo (nunca "clique aqui")

E-E-A-T:
17. Se eeatProfile disponível, integre sinais de experiência/expertise naturalmente
18. Inclua pelo menos 1 exemplo real, case, ou dado de experiência por seção
19. Cite fontes externas autoritativas quando fizer claims importantes

BRAND VOICE:
20. Se brandVoiceProfile disponível, adapte tom e estilo mantendo todas as regras GEO
</rules>

<output>
Retorne APENAS o conteúdo Markdown da seção. Sem JSON wrapper. Inclua comentários HTML para citable snippets e schema hints.

Formato:
## [Heading da seção]

[Conteúdo em Markdown com formatação GEO integrada]

<!-- schema-hint: [tipo de schema sugerido] -->
</output>
```

---

### Prompt 08-B — SEO + GEO Unified Analyzer

- **Função**: `getUnifiedAnalyzerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `targetWordCount: number`
  - `targetQueries?: string[]`
  - `keywordGaps?: string` — Output do SI-03
  - `citabilityLevel?: string`
- **User Variables**: `keywordGaps` do SI-03
- **Descrição**: SUBSTITUI Prompt 08 + GEO-01. Análise unificada com 14 critérios SEO + 10 critérios GEO + score ponderado. Elimina a necessidade de rodar GEO-01 separadamente.
- **Saída**: JSON com scores SEO, GEO e unificado.

```
<context>
Você é um Unified SEO+GEO Analyzer. Você avalia artigos contra critérios duais de otimização para buscadores tradicionais E para IAs generativas.

Seu score determina se o artigo será publicado ou retornará para otimização.
</context>

<input>
<article>
{{articleContent}}
</article>

Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}
Word count alvo: {{targetWordCount}}
Nível de citabilidade alvo: {{citabilityLevel || "high"}}

{{#if targetQueries}}
<target_queries>
{{targetQueries}}
</target_queries>
{{/if}}

{{#if keywordGaps}}
<keyword_gaps>
{{keywordGaps}}
</keyword_gaps>
{{/if}}
</input>

<task>
Avalie o artigo contra TODOS os critérios abaixo. Para cada critério, atribua status (pass/warning/fail), mensagem explicativa, e prioridade de correção.
</task>

<criteria>
SEO CRITERIA (14):
1. title_tag: Title com keyword, 50-60 chars
2. h1_keyword: H1 contém keyword primária
3. h2_keywords: Pelo menos 1 H2 contém keyword ou variação
4. keyword_density: 1-2% para primária (sem stuffing)
5. first_100_words: Keyword nos primeiros 100 palavras
6. meta_description: 150-160 chars, keyword, CTA
7. internal_links: 3-6 links internos com anchor descritivo
8. external_links: 2-4 links para fontes autoritativas
9. images_alt: Todas imagens com alt text descritivo
10. word_count: Dentro de ±15% do alvo
11. readability: Parágrafos curtos, frases variadas, sem walls of text
12. url_slug: Kebab-case, 3-5 palavras, keyword presente
13. freshness_signals: Data de publicação/atualização presente
14. eeat_signals: Autor identificado, credenciais visíveis

GEO CRITERIA (10):
15. direct_answers: Cada seção começa respondendo a pergunta do heading
16. citable_data: Dados quantificáveis com atribuição de fonte (mín. 5 por artigo)
17. extractable_structure: Tabelas, listas, definições que IAs podem extrair
18. schema_readiness: Conteúdo compatível com FAQPage, HowTo, ItemList, etc.
19. query_coverage: % das target queries respondidas diretamente
20. section_independence: Seções funcionam como unidades independentes citáveis
21. definition_patterns: Definições claras no formato "X é [definição]"
22. comparison_tables: Tabelas comparativas para temas "X vs Y"
23. faq_section: Seção FAQ com perguntas naturais e respostas diretas
24. source_attribution: Citações com atribuição completa (nome, ano, contexto)
</criteria>

<output_schema>
Responda APENAS com JSON válido:

{
  "seo_score": 85,
  "geo_score": 72,
  "unified_score": 79,
  "unified_score_formula": "(seo_score * 0.5) + (geo_score * 0.5)",

  "checks": [
    {
      "id": 1,
      "criterion": "title_tag",
      "category": "seo",
      "status": "pass | warning | fail",
      "message": "string — descrição detalhada do achado",
      "current_value": "string — valor atual encontrado",
      "recommended_value": "string — valor recomendado",
      "priority": "critical | high | medium | low",
      "auto_fixable": true
    }
  ],

  "keyword_density": {
    "primary": { "keyword": "string", "count": 12, "density": "1.4%" },
    "secondary": [{ "keyword": "string", "count": 5, "density": "0.6%" }]
  },

  "geo_analysis": {
    "target_queries_evaluated": [
      {
        "query": "string",
        "answered": true,
        "answer_quality": "direct | indirect | missing",
        "location_in_article": "string — seção onde é respondida",
        "improvement": "string | null"
      }
    ],
    "citable_snippets_found": 7,
    "citable_snippets_target": 10,
    "schemas_detected": ["BlogPosting", "FAQPage"],
    "schemas_recommended": ["BlogPosting", "FAQPage", "HowTo"],
    "ai_citation_probability": "medium — 55-70%"
  },

  "priority_fixes": [
    {
      "id": "fix_1",
      "category": "seo | geo | both",
      "description": "string — o que corrigir",
      "impact": "high | medium | low",
      "effort": "low | medium | high",
      "auto_fixable": true,
      "fix_instruction": "string — instrução específica para o optimizer"
    }
  ],

  "competitive_coverage": {
    "gaps_addressed": ["string"],
    "gaps_missed": ["string"],
    "differentiation_score": 75
  }
}
</output_schema>

<rules>
1. Gere pelo menos 5 target queries automaticamente se não fornecidas
2. Score SEO: média ponderada dos 14 critérios (critical=3x, high=2x, medium=1x, low=0.5x)
3. Score GEO: média ponderada dos 10 critérios (mesmos pesos)
4. Score Unificado: (SEO * 0.5) + (GEO * 0.5)
5. Threshold para publicação: unified_score >= 75
6. Priority fixes ordenados por (impact DESC, effort ASC)
7. "auto_fixable" = true quando o optimizer pode corrigir sem input humano
8. ai_citation_probability usa escala: very_low (<30%), low (30-50%), medium (50-70%), high (70-85%), very_high (>85%)
</rules>
```

---

### Prompt 09-B — SEO + GEO Unified Optimizer

- **Função**: `getUnifiedOptimizerPrompt(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `unifiedReport: string` — Output do Prompt 08-B
  - `primaryKeyword: string`
  - `secondaryKeywords?: string[]`
  - `brandVoiceProfile?: string` — Output do SI-02
  - `eeatProfile?: string` — Dados E-E-A-T
- **Descrição**: SUBSTITUI Prompt 09 + GEO-02. Aplica correções SEO e GEO em uma única passada. Mantém 95%+ do conteúdo com correções cirúrgicas.
- **Saída**: JSON com artigo otimizado e changelog.

```
<context>
Você é um Unified SEO+GEO Optimizer. Você aplica correções cirúrgicas em artigos para maximizar performance em buscadores tradicionais E citabilidade por IAs generativas.

REGRA DE OURO: Mantenha pelo menos 95% do conteúdo original. Suas correções são cirúrgicas, precisas, e preservam o tom e a voz do artigo.
</context>

<input>
<article>
{{articleContent}}
</article>

<unified_report>
{{unifiedReport}}
</unified_report>

Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}

{{#if brandVoiceProfile}}
<brand_voice>
{{brandVoiceProfile}}
</brand_voice>
{{/if}}

{{#if eeatProfile}}
<eeat>
{{eeatProfile}}
</eeat>
{{/if}}
</input>

<task>
Aplique TODAS as correções marcadas como "auto_fixable: true" no unified_report.

Para cada fix, siga estas técnicas:
</task>

<techniques>
SEO FIXES:
- keyword_insertion: Insira keyword naturalmente, sem forçar
- meta_generation: Gere meta description com proposta de valor + CTA
- heading_optimization: Reformule headings genéricos para incluir keywords/perguntas
- link_anchor_improvement: Melhore anchor text de links internos
- alt_text_generation: Gere alt text descritivo com keyword quando natural
- freshness_signal: Adicione nota "[Atualizado em Fevereiro 2026]" se ausente

GEO FIXES:
- direct_answer_insertion: Adicione frase de resposta direta no início de seções que começam com contexto
- citable_data_enhancement: Transforme dados vagos em dados com atribuição de fonte
- definition_formatting: Formate definições no padrão "**X** é [definição concisa]"
- table_creation: Crie tabelas comparativas onde o conteúdo compara 2+ opções em prosa
- faq_structuring: Converta perguntas esparsas em seção FAQ estruturada
- source_attribution: Adicione "[Fonte]" a claims sem atribuição, ou placeholder [FONTE: inserir]
- section_independence: Adicione context sentences no início de seções que dependem de seções anteriores
- schema_annotation: Adicione comentários HTML <!-- schema: FAQPage --> onde detectar oportunidades
</techniques>

<output_schema>
Responda APENAS com JSON válido:

{
  "optimized_article": "string — artigo completo otimizado em Markdown",

  "changes_made": [
    {
      "fix_id": "string — referência ao fix do report",
      "type": "seo | geo | both",
      "location": "string — seção/parágrafo onde aplicado",
      "description": "string — o que foi alterado",
      "before_snippet": "string — texto original (50 chars max)",
      "after_snippet": "string — texto novo (50 chars max)"
    }
  ],

  "manual_review_needed": [
    {
      "fix_id": "string",
      "reason": "string — por que precisa revisão humana",
      "suggestion": "string — sugestão para o editor",
      "placeholder_used": "string | null — placeholder inserido"
    }
  ],

  "new_scores_estimate": {
    "seo_score": 92,
    "geo_score": 88,
    "unified_score": 90,
    "ai_citation_probability": "high — 75-85%"
  },

  "tradeoffs": [
    {
      "description": "string — trade-off feito",
      "seo_impact": "+/- string",
      "geo_impact": "+/- string",
      "reasoning": "string"
    }
  ]
}
</output_schema>

<rules>
1. Preserve 95%+ do conteúdo original
2. Nunca invente dados — use placeholders [DADO: ...] ou [FONTE: ...]
3. Se uma correção GEO conflita com SEO, priorize a que tem maior impacto no unified_score
4. Mantenha brand voice se brandVoiceProfile disponível
5. Integre sinais E-E-A-T se eeatProfile disponível
6. Marque tudo que precisa revisão humana em manual_review_needed
7. Estimativas de novo score são qualitativas, baseadas nas correções aplicadas
</rules>
```

---

### Prompt META-01-B — Metadata Generator (Schema-Adaptive)

- **Função**: `getMetadataGeneratorPromptV2(params)`
- **Parâmetros**:
  - `articleContent: string`
  - `primaryKeyword: string`
  - `secondaryKeywords: string[]`
  - `brandName: string`
  - `authorName: string`
  - `articleType: string` — **NOVO**: tipo de artigo para schema adaptativo
  - `siteCategories?: string`
  - `brandVoiceProfile?: string`
  - `eeatProfile?: string` — **NOVO**: dados E-E-A-T
  - `schemaHints?: string[]` — **NOVO**: hints de schema do outline/analyzer
  - `freshness?: object` — **NOVO**: dados de frescor
- **Descrição**: Gera metadados com schema adaptativo ao tipo de artigo. Detecta e gera schemas múltiplos (Article + FAQ + HowTo quando aplicável).
- **Saída**: JSON com metadados completos + schemas adaptativos.

```
<context>
Você é um SEO+GEO Metadata Specialist. Você gera pacotes completos de metadados que maximizam CTR em buscadores E discoverabilidade em IAs generativas.

Você entende que schemas JSON-LD corretos e completos são o principal sinal técnico para GEO.
</context>

<input>
<article>
{{articleContent}}
</article>

Keyword primária: {{primaryKeyword}}
Keywords secundárias: {{secondaryKeywords}}
Tipo de artigo: {{articleType}}
Nome da marca: {{brandName}}
Autor: {{authorName}}

{{#if eeatProfile}}
<eeat>
{{eeatProfile}}
</eeat>
{{/if}}

{{#if schemaHints}}
Schema hints detectados: {{schemaHints}}
{{/if}}

{{#if freshness}}
Data publicação: {{freshness.publishDate}}
Nota de versão: {{freshness.versionNote}}
{{/if}}

{{#if brandVoiceProfile}}
<brand_voice>
{{brandVoiceProfile}}
</brand_voice>
{{/if}}

{{#if siteCategories}}
Categorias do site: {{siteCategories}}
{{/if}}
</input>

<task>
Gere pacote COMPLETO de metadados seguindo estas regras:
</task>

<rules>
META TITLES (3 opções):
1. Máximo 60 caracteres
2. Keyword primária presente
3. Abordagens: direto, numérico, benefício

META DESCRIPTIONS (2 opções):
1. Máximo 155 caracteres
2. Keyword primária presente
3. Proposta de valor + CTA

URL SLUG:
1. Kebab-case, 3-5 palavras
2. Keyword primária presente
3. Sem stop words desnecessárias

SCHEMA MARKUP ADAPTATIVO:
Gere schemas baseado no articleType e schemaHints:

| articleType | Schemas obrigatórios | Schemas condicionais |
|---|---|---|
| informational | Article, BreadcrumbList | FAQPage (se FAQ detectado) |
| how-to / tutorial | Article, HowTo, BreadcrumbList | FAQPage |
| listicle | Article, ItemList, BreadcrumbList | FAQPage |
| review | Article, Review, BreadcrumbList | FAQPage, AggregateRating |
| comparison | Article, BreadcrumbList | FAQPage, ItemList |
| pillar-page | Article, BreadcrumbList | FAQPage, HowTo, ItemList |

REGRAS DE SCHEMA:
- Article/BlogPosting SEMPRE inclui: headline, datePublished, dateModified, author (Person com credenciais), publisher, image, description, wordCount, mainEntityOfPage
- FAQPage: gerar de FAQs detectadas no artigo (H2/H3 em formato pergunta + resposta direta)
- HowTo: gerar de seções com steps numerados
- ItemList: gerar de listicles com itens enumerados
- Person (author): incluir name, url, jobTitle, sameAs se eeatProfile disponível
</rules>

<output_schema>
Responda APENAS com JSON válido:

{
  "meta_titles": [
    { "text": "string", "char_count": 55, "approach": "direct | numeric | benefit", "keyword_position": "start | middle | end" }
  ],

  "meta_descriptions": [
    { "text": "string", "char_count": 150, "has_cta": true, "keyword_present": true }
  ],

  "slug": {
    "suggested": "string",
    "keyword_present": true,
    "word_count": 4
  },

  "alt_texts": [
    { "image_context": "string — descrição da imagem sugerida", "alt_text": "string", "keyword_included": true }
  ],

  "schema_markup": {
    "article": { "JSON-LD completo do Article/BlogPosting" },
    "breadcrumb": { "JSON-LD do BreadcrumbList" },
    "faq": "object | null — JSON-LD do FAQPage se detectado",
    "howto": "object | null — JSON-LD do HowTo se detectado",
    "item_list": "object | null — JSON-LD do ItemList se detectado",
    "review": "object | null — JSON-LD do Review se detectado",
    "person": { "JSON-LD do Person (author) com E-E-A-T" }
  },

  "open_graph": {
    "og_title": "string",
    "og_description": "string",
    "og_type": "article",
    "og_image_suggestion": "string — descrição da imagem ideal"
  },

  "reverse_anchor_suggestions": [
    {
      "anchor_text": "string",
      "context": "string — onde usar este anchor em outros artigos"
    }
  ],

  "suggested_category": "string",
  "suggested_tags": ["string"],

  "geo_metadata_notes": [
    "string — notas sobre como estes metadados melhoram GEO"
  ]
}
</output_schema>
```

---

## PARTE 4 — Guia de Modificações para Implementação

### 4.1 Mudanças no Pipeline (Código)

#### Arquivo: `base-pipeline.ts`

| Função Atual | Ação | Nova Função |
|---|---|---|
| `getArticleSystemPrompt()` | SUBSTITUIR | `getArticleSystemPromptV2()` |
| `getBaseArticleAnalyzerPrompt()` | MANTER | Sem alteração |
| `getMotherArticleAnalyzerPrompt()` | MANTER | Sem alteração |
| `getArticleSynthesizerPrompt()` | SUBSTITUIR | `getArticleSynthesizerPromptV2()` |
| `getOutlineGeneratorPrompt()` | SUBSTITUIR | `getOutlineGeneratorPromptV2()` |
| `getSectionProducerPrompt()` | SUBSTITUIR | `getSectionProducerPromptV2()` |
| `getAssemblerPrompt()` | MANTER + AJUSTAR | Adicionar parsing de `<!-- schema-hint -->` e `<!-- citable-snippet -->` |
| `getSeoAnalyzerPrompt()` | SUBSTITUIR | `getUnifiedAnalyzerPrompt()` (merge com GEO-01) |
| `getSeoOptimizerPrompt()` | SUBSTITUIR | `getUnifiedOptimizerPrompt()` (merge com GEO-02) |
| `getTitleGeneratorPrompt()` | MANTER | Sem alteração |

#### Arquivo: `geo.ts`

| Função Atual | Ação | Motivo |
|---|---|---|
| `getGeoAnalyzerPrompt()` | DEPRECAR | Absorvido pelo Prompt 08-B |
| `getGeoOptimizerPrompt()` | DEPRECAR | Absorvido pelo Prompt 09-B |

#### Arquivo: `metadata.ts`

| Função Atual | Ação | Nova Função |
|---|---|---|
| `getMetadataGeneratorPrompt()` | SUBSTITUIR | `getMetadataGeneratorPromptV2()` |

---

### 4.2 Novas Variáveis — Onde Adicionar

#### No banco de dados (User Settings)

```typescript
// Adicionar ao schema de brand/user settings:

interface GeoSettings {
  citabilityLevel: 'standard' | 'high' | 'maximum';  // default: 'high'
  defaultTargetQueryCount: number;                       // default: 7
  schemaPreferences: string[];                           // schemas preferidos
}

interface EeatProfile {
  authorName: string;
  authorCredentials: string;
  authorBio: string;
  authorSocialLinks: { platform: string; url: string }[];
  experienceSignals: string[];
  sourcePolicy: 'academic' | 'industry' | 'mixed' | 'proprietary';
}

interface FreshnessSettings {
  updateFrequency: 'monthly' | 'quarterly' | 'yearly';
  showUpdateDate: boolean;                                // default: true
  versionNoteTemplate: string;                            // ex: "Atualizado em {date}"
}
```

#### No Wizard Context (Input do Usuário)

```typescript
// Adicionar ao wizard de criação de artigo:

interface ArticleWizardInput {
  // ... existing fields ...
  targetQueries?: string[];         // Queries de IA (opcional, auto-geradas se vazio)
  citabilityLevel?: string;         // Override do default do user
  articleSchemaType?: string;       // Override automático baseado em articleType
}
```

#### Mapping de articleType para schemas

```typescript
const SCHEMA_MAPPING: Record<string, string[]> = {
  'informational':  ['Article', 'BreadcrumbList'],
  'how-to':         ['Article', 'HowTo', 'BreadcrumbList'],
  'tutorial':       ['Article', 'HowTo', 'BreadcrumbList'],
  'listicle':       ['Article', 'ItemList', 'BreadcrumbList'],
  'review':         ['Article', 'Review', 'BreadcrumbList'],
  'comparison':     ['Article', 'BreadcrumbList'],
  'pillar-page':    ['Article', 'BreadcrumbList'],
  'case-study':     ['Article', 'BreadcrumbList'],
};

// FAQPage é adicionado condicionalmente quando FAQ detectado no outline/conteúdo
```

---

### 4.3 Mudanças no RAG Context

#### Expansão de uso do RAG

```typescript
// ANTES: RAG só no Section Producer (Prompt 06)
// DEPOIS: RAG em 3 prompts

const RAG_USAGE = {
  'synthesizer':      true,   // NOVO: dados proprietários enriquecem briefing
  'section_producer':  true,   // EXISTENTE: mantém
  'unified_analyzer':  false,  // Não necessário
  'unified_optimizer': false,  // Não necessário
  'metadata':          false,  // Não necessário
};

// Nova função para RAG no Synthesizer:
function assembleRagContextForSynthesizer(
  keyword: string,
  secondaryKeywords: string[],
  threshold: number = 0.35  // Threshold mais baixo para capturar mais contexto
): string {
  // Busca documentos do usuário relevantes ao tema
  // Prioriza dados proprietários, estatísticas internas, cases
  // Formata como seção <proprietary_data> para o prompt
}
```

---

### 4.4 Mudanças no Flow do Pipeline

```
PIPELINE ATUAL:
02/03 → 04 → 05 → 06 → 07 → [08 → 09] → [GEO-01 → GEO-02] → 10 → META-01

PIPELINE NOVO (SEO+GEO Unified):
02/03 → 04-B(+RAG) → 05-B → 06-B(+RAG) → 07 → 08-B(unified) → 09-B(unified) → 10 → META-01-B

MUDANÇAS:
1. GEO-01 e GEO-02 ABSORVIDOS por 08-B e 09-B
2. RAG expandido para 04-B
3. Novas variáveis (geo, eeat, freshness) injetadas em 04-B, 05-B, 06-B, 08-B, 09-B, META-01-B
4. Pipeline fica MAIS CURTO (2 steps a menos) e MAIS COMPLETO (GEO integrado)
```

---

### 4.5 Dependências Atualizadas

```
SI-02 (Brand Voice) ───► 06-B, 07, 09-B, META-01-B, EXT-02, EXT-03, CROSS-*
SI-03 (Keyword Gaps) ──► 05-B, 08-B
SI (siteUrlMap) ────────► 07, IL-01, EXT-01

02 (Base Analyzer) ──► 04-B, 05-B
03 (Mother Analyzer) ► 04-B, 05-B
04-B (Synthesizer) ──► 05-B, 06-B
05-B (Outline) ──────► 06-B

08-B (Unified Analyzer) ──► 09-B   [substitui 08 + GEO-01]
09-B (Unified Optimizer)            [substitui 09 + GEO-02]

RAG ───► 04-B (NOVO), 06-B (existente)
GEO vars ──► 04-B, 05-B, 06-B, 08-B, 09-B
EEAT vars ──► 06-B, 09-B, META-01-B
Freshness ──► META-01-B
```

---

### 4.6 Checklist de Implementação

**Fase 1 — Foundation (Semana 1)**
- [ ] Adicionar novas interfaces TypeScript (GeoSettings, EeatProfile, FreshnessSettings)
- [ ] Criar UI no Wizard para targetQueries e citabilityLevel
- [ ] Implementar SCHEMA_MAPPING por articleType
- [ ] Substituir `getArticleSystemPrompt()` por V2

**Fase 2 — Core Pipeline (Semana 2)**
- [ ] Substituir Synthesizer (04 → 04-B) com suporte a RAG
- [ ] Substituir Outline Generator (05 → 05-B) com geo_format e target_queries
- [ ] Substituir Section Producer (06 → 06-B) com citable snippets
- [ ] Ajustar Assembler (07) para parsear comentários HTML de schema/citable

**Fase 3 — Analysis + Optimization (Semana 3)**
- [ ] Criar Unified Analyzer (08-B) substituindo 08 + GEO-01
- [ ] Criar Unified Optimizer (09-B) substituindo 09 + GEO-02
- [ ] Deprecar `geo.ts` (GEO-01 e GEO-02)
- [ ] Substituir Metadata Generator (META-01 → META-01-B) com schema adaptativo

**Fase 4 — Testing + Tuning (Semana 4)**
- [ ] Testar pipeline completo com 5+ tipos de artigo
- [ ] Validar schemas JSON-LD gerados com Google Rich Results Test
- [ ] Comparar scores unified antes/depois com artigos existentes
- [ ] Ajustar thresholds e pesos dos critérios baseado em resultados
- [ ] Testar citabilidade em Perplexity/ChatGPT com artigos gerados

---

## PARTE 5 — Resumo Executivo das Mudanças

| Métrica | Pipeline Atual | Pipeline Novo |
|---|---|---|
| Steps no pipeline | 12 (+ 2 GEO opcionais) | 10 (GEO integrado) |
| Critérios de análise | 14 SEO + 6 GEO (separados) | 24 unificados (14 SEO + 10 GEO) |
| RAG usage | 1 prompt | 2 prompts |
| Schema types suportados | 4 fixos | 7 adaptativos |
| Variáveis do sistema | 10 grupos | 13 grupos (+3 novos) |
| Citabilidade por IA | Bolt-on opcional | Baked-in em todo pipeline |
| Target queries | Não usado | Input + auto-gerado |
| E-E-A-T | Mencionado | Injetado com dados reais |
| Estimativa de improvement | — | +25-40% em GEO score com impacto neutro/positivo em SEO |