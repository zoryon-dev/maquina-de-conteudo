/**
 * Article Prompts — SEO+GEO Metadata (META-01-B)
 *
 * Generates complete metadata package with adaptive schema markup:
 * meta titles, descriptions, slug, alt texts, JSON-LD schemas, Open Graph, GEO notes.
 */

// ============================================================================
// Schema mapping by article type
// ============================================================================

export const SCHEMA_MAPPING: Record<string, string[]> = {
  "informational": ["Article", "BreadcrumbList"],
  "how-to": ["Article", "HowTo", "BreadcrumbList"],
  "tutorial": ["Article", "HowTo", "BreadcrumbList"],
  "listicle": ["Article", "ItemList", "BreadcrumbList"],
  "review": ["Article", "Review", "BreadcrumbList"],
  "comparison": ["Article", "BreadcrumbList"],
  "pillar-page": ["Article", "BreadcrumbList"],
  "case-study": ["Article", "BreadcrumbList"],
};

// ============================================================================
// META-01-B — SEO+GEO Metadata Generator (Schema-Adaptive)
// ============================================================================

export function getMetadataGeneratorPromptV2(params: {
  articleContent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  brandName: string;
  authorName: string;
  articleType: string;
  siteCategories?: string[];
  brandVoiceProfile?: string;
  eeatProfile?: string;
  schemaHints?: string[];
  freshness?: { publishDate?: string; versionNote?: string };
}): string {
  const eeatSection = params.eeatProfile
    ? `\n<eeat>\n${params.eeatProfile}\n</eeat>`
    : "";

  const schemaHintsSection = params.schemaHints?.length
    ? `\nSchema hints detectados: ${params.schemaHints.join(", ")}`
    : "";

  const freshnessSection = params.freshness
    ? `${params.freshness.publishDate ? `\nData publicação: ${params.freshness.publishDate}` : ""}${params.freshness.versionNote ? `\nNota de versão: ${params.freshness.versionNote}` : ""}`
    : "";

  const brandVoiceSection = params.brandVoiceProfile
    ? `\n<brand_voice>\n${params.brandVoiceProfile}\n</brand_voice>`
    : "";

  const categoriesSection = params.siteCategories?.length
    ? `\nCategorias do site: ${params.siteCategories.join(", ")}`
    : "";

  return `<context>
Você é um SEO+GEO Metadata Specialist. Você gera pacotes completos de metadados que maximizam CTR em buscadores E discoverabilidade em IAs generativas.

Você entende que schemas JSON-LD corretos e completos são o principal sinal técnico para GEO.
</context>

<input>
<article>
${params.articleContent}
</article>

Keyword primária: ${params.primaryKeyword}
Keywords secundárias: ${params.secondaryKeywords.join(", ")}
Tipo de artigo: ${params.articleType}
Nome da marca: ${params.brandName}
Autor: ${params.authorName}
${eeatSection}${schemaHintsSection}${freshnessSection}${brandVoiceSection}${categoriesSection}
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
</output_schema>`;
}

/** @deprecated Use getMetadataGeneratorPromptV2() */
export const getMetadataGeneratorPrompt = getMetadataGeneratorPromptV2;
