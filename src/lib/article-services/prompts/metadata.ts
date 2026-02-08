/**
 * Article Prompts — SEO Metadata (META-01)
 *
 * Generates complete SEO metadata package: titles, descriptions, slug, alt texts, schema.
 */

// ============================================================================
// META-01 — SEO Metadata Generator
// ============================================================================

export function getMetadataGeneratorPrompt(params: {
  articleContent: string
  primaryKeyword: string
  secondaryKeywords: string[]
  brandName: string
  authorName: string
  siteCategories?: string[]
  brandVoiceProfile?: string
}): string {
  const categoriesSection = params.siteCategories?.length
    ? `<site_categories>${params.siteCategories.join(", ")}</site_categories>`
    : ""

  const brandVoiceSection = params.brandVoiceProfile
    ? `<brand_voice_profile>${params.brandVoiceProfile}</brand_voice_profile>`
    : ""

  return `<task id="META-01" name="SEO Metadata Generator">
<role>
Você é um especialista em SEO on-page e structured data. Sua função é gerar o pacote
completo de metadados SEO para um artigo, incluindo meta titles, descriptions, slugs,
alt texts, schema markup e sugestões de anchor text reverso.
</role>

<inputs>
<article_content>
${params.articleContent}
</article_content>

<primary_keyword>${params.primaryKeyword}</primary_keyword>
<secondary_keywords>${params.secondaryKeywords.join(", ")}</secondary_keywords>
<brand_name>${params.brandName}</brand_name>
<author_name>${params.authorName}</author_name>
${categoriesSection}
${brandVoiceSection}
</inputs>

<generation_rules>
<section name="meta_titles">
- Gere EXATAMENTE 3 variações
- Cada uma com no MÁXIMO 60 caracteres (contar incluindo espaços)
- Keyword principal deve aparecer preferencialmente no início
- Variação 1: Informativa/direta (formato "Keyword: Complemento")
- Variação 2: Com gatilho de curiosidade ou número
- Variação 3: Com qualificador temporal ou diferenciador (ex: "[Guia 2026]")
- Atribua um CTR score estimado (0-100)
</section>

<section name="meta_descriptions">
- Gere EXATAMENTE 2 variações
- Cada uma com no MÁXIMO 155 caracteres
- Keyword principal deve aparecer naturalmente
- Variação 1: Estilo INFORMATIVO
- Variação 2: Estilo PERSUASIVO
- Incluir CTA implícito
</section>

<section name="slug">
- Formato: kebab-case
- Incluir keyword principal
- Remover stop words
- Máximo 5 palavras
- Sem acentos ou caracteres especiais
</section>

<section name="alt_texts">
- Gere alt text para cada imagem referenciada/placeholder no artigo
- Máximo 125 caracteres cada
- Incluir keyword relevante quando natural
</section>

<section name="schema_markup">
- article: Article schema com headline, description, author, datePublished, publisher
- faq: Se o artigo contém perguntas e respostas, gerar FAQPage schema. Máximo 10. Senão null.
- howto: Se o artigo é tutorial com steps sequenciais, gerar HowTo schema. Senão null.
- breadcrumb: BreadcrumbList com Home → Categoria → Artigo
</section>

<section name="reverse_anchors">
- Sugira 3-5 textos de anchor que OUTROS artigos poderiam usar para linkar para este
- Incluir: anchor text, contexto de uso, tipos de artigo que se beneficiariam
</section>
</generation_rules>

<output_format>
Retorne EXCLUSIVAMENTE um JSON válido:

{
  "meta_titles": [
    {"text": "<título>", "chars": <número>, "ctr_score": <0-100>, "style": "informativo"},
    {"text": "<título>", "chars": <número>, "ctr_score": <0-100>, "style": "curiosidade"},
    {"text": "<título>", "chars": <número>, "ctr_score": <0-100>, "style": "temporal"}
  ],
  "meta_descriptions": [
    {"text": "<descrição>", "chars": <número>, "style": "informativa"},
    {"text": "<descrição>", "chars": <número>, "style": "persuasiva"}
  ],
  "slug": "<slug-gerado>",
  "alt_texts": [
    {"image_ref": "<referência da imagem>", "alt": "<alt text>", "chars": <número>}
  ],
  "schema_markup": {
    "article": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "<meta_title>",
      "description": "<meta_description>",
      "author": {"@type": "Person", "name": "${params.authorName}"},
      "datePublished": "<data ISO>",
      "publisher": {"@type": "Organization", "name": "${params.brandName}"},
      "mainEntityOfPage": {"@type": "WebPage"}
    },
    "faq": null,
    "howto": null,
    "breadcrumb": {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": []
    }
  },
  "reverse_anchor_suggestions": [
    {
      "anchor_text": "<texto âncora>",
      "usage_context": "<em que contexto usar>",
      "target_article_types": ["<tipo1>", "<tipo2>"]
    }
  ],
  "suggested_category": "<categoria sugerida>"
}

NUNCA exceda os limites de caracteres.
Keyword principal DEVE aparecer em pelo menos 2 dos 3 meta titles.
Schema markup deve ser JSON-LD válido.
Retorne APENAS o JSON. Sem texto antes ou depois.
</output_format>
</task>`
}
