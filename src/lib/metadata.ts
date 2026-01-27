import { Metadata } from "next"

/**
 * Configurações base do site para SEO
 */
export const siteConfig = {
  name: "contentMachine",
  title: "contentMachine | Estúdio de Conteúdo com IA",
  description:
    "Seu estúdio de conteúdo alimentado por IA. Crie, edite e agende posts para redes sociais com especialistas AI. Gerencie seu calendário editorial em um só lugar.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://maquinadeconteudo.com",
  ogImage: "/img/og-image.png",
  links: {
    twitter: "https://twitter.com/maquinadeconteudo",
    instagram: "https://instagram.com/maquinadeconteudo",
    linkedin: "https://linkedin.com/company/maquinadeconteudo",
    youtube: "https://youtube.com/@maquinadeconteudo",
  },
  author: {
    name: "contentMachine ~ powered by zoryon",
    url: "https://maquinadeconteudo.com",
  },
  keywords: [
    "conteúdo com ia",
    "estúdio de conteúdo",
    "redes sociais",
    "agendamento de posts",
    "calendário editorial",
    "criação de conteúdo",
    "marketing digital",
    "instagram",
    "facebook",
    "linkedin",
    "ai content studio",
    "inteligência artificial",
    "gerador de conteúdo",
  ],
}

/**
 * Cria metadata base para todas as páginas
 */
export function createBaseMetadata(): Metadata {
  return {
    title: {
      default: siteConfig.title,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    creator: siteConfig.author.name,
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: siteConfig.url,
      title: siteConfig.title,
      description: siteConfig.description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
      creator: siteConfig.links.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }
}

/**
 * Interface para metadata de página específica
 */
export interface PageMetadataOptions {
  title: string
  description?: string
  ogImage?: string
  ogType?: "website" | "article"
  noIndex?: boolean
  noFollow?: boolean
  keywords?: string[]
  canonical?: string
}

/**
 * Cria metadata para uma página específica
 */
export function createPageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description = siteConfig.description,
    ogImage = siteConfig.ogImage,
    ogType = "website",
    noIndex = false,
    noFollow = false,
    keywords,
    canonical,
  } = options

  const metadata: Metadata = {
    title,
    description,
    keywords: keywords || siteConfig.keywords,
    openGraph: {
      type: ogType,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
    },
  }

  if (canonical) {
    metadata.alternates = { canonical }
  }

  return metadata
}

/**
 * Cria metadata para artigos/blog posts
 */
export interface ArticleMetadataOptions extends PageMetadataOptions {
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  section?: string
  tags?: string[]
}

export function createArticleMetadata(options: ArticleMetadataOptions): Metadata {
  const base = createPageMetadata({ ...options, ogType: "article" })

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: options.publishedTime,
      modifiedTime: options.modifiedTime,
      authors: options.authors,
      section: options.section,
      tags: options.tags,
    },
  }
}
