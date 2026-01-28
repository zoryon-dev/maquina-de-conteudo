import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://maquinadeconteudo.com"

/**
 * Sitemap para SEO
 *
 * Gera automaticamente o sitemap.xml com todas as páginas importantes do site.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Páginas legais
    {
      url: `${baseUrl}/termos-de-uso`,
      lastModified: new Date("2026-01-27"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/politica-privacidade`,
      lastModified: new Date("2026-01-27"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/lgpd`,
      lastModified: new Date("2026-01-27"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date("2026-01-27"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  return staticPages
}
