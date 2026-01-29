import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://maquinadeconteudo.com"

/**
 * Web App Manifest para PWA
 *
 * Configura o app para instalação em dispositivos móveis e desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "contentMachine",
    short_name: "contentMachine",
    description: "Seu estúdio de conteúdo alimentado por IA. Crie, edite e agende posts para redes sociais.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#a3e635",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/img/logo_full_content.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any" as any, // "any maskable" deprecated, using "any"
      },
      {
        src: "/img/logo_full_content.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any" as any, // "any maskable" deprecated, using "any"
      },
    ],
    categories: ["productivity", "social", "business"],
    shortcuts: [
      {
        name: "Criar Conteúdo",
        short_name: "Criar",
        description: "Crie novo conteúdo com IA",
        url: "/wizard",
        icons: [{ src: "/img/logo_full_content.png", sizes: "96x96" }],
      },
      {
        name: "Biblioteca",
        short_name: "Biblioteca",
        description: "Veja sua biblioteca de conteúdo",
        url: "/library",
        icons: [{ src: "/img/logo_full_content.png", sizes: "96x96" }],
      },
      {
        name: "Calendário",
        short_name: "Calendário",
        description: "Gerencie seu calendário editorial",
        url: "/calendar",
        icons: [{ src: "/img/logo_full_content.png", sizes: "96x96" }],
      },
    ],
  }
}
