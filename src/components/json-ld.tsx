/**
 * JsonLd - Componente para structured data (JSON-LD)
 *
 * Adiciona metadados estruturados para SEO, ajudando motores de busca
 * a entender melhor o conteúdo do site.
 */

interface JsonLdProps {
  data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/**
 * Gera JSON-LD para Organization
 */
export function organizationJsonLd(domain: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "contentMachine ~ powered by zoryon",
    url: `https://${domain}`,
    logo: `https://${domain}/img/logo_full_content.png`,
    description:
      "Estúdio de conteúdo alimentado por IA para criar, editar e gerenciar posts para redes sociais.",
    sameAs: [
      "https://twitter.com/maquinadeconteudo",
      "https://instagram.com/maquinadeconteudo",
      "https://linkedin.com/company/maquinadeconteudo",
      "https://youtube.com/@maquinadeconteudo",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contato@maquinadeconteudo.com",
      availableLanguage: "Portuguese",
    },
  }
}

/**
 * Gera JSON-LD para WebSite
 */
export function webSiteJsonLd(domain: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Máquina de Conteúdo",
    url: `https://${domain}`,
    description:
      "Seu estúdio de conteúdo alimentado por IA. Crie, edite e agende posts para redes sociais.",
    potentialAction: {
      "@type": "SearchAction",
      target: `https://${domain}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

/**
 * Gera JSON-LD para SoftwareApplication
 */
export function softwareApplicationJsonLd(domain: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "contentMachine",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
    description:
      "Estúdio de conteúdo com IA para criar, editar e gerenciar posts para redes sociais.",
  }
}
