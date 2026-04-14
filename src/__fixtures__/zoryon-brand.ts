import type { BrandConfig } from "@/lib/brands/schema"

// Values mirror src/content/brands/zoryon/design-tokens.css — update both together.
export const ZORYON_BRAND_FIXTURE: BrandConfig = {
  identity: {
    mission: "Ajudar empreendedores digitais a construir autoridade editorial",
    vision: "Conteúdo com método jornalístico em escala",
    values: [
      { name: "honestidade", description: "transparência radical com clientes e audiência" },
      { name: "profundidade", description: "evidência acima de opinião" },
      { name: "método", description: "processo repetível acima de receita pronta" },
    ],
    positioning: "Consultoria + método pra educadores e serviços premium",
    antiPositioning: "Não fazemos copywriting genérico, nem hype",
    beliefs: [
      "autoridade se constrói com evidência",
      "mercado recompensa profundidade",
    ],
  },
  voice: {
    atributos: { direto: 85, acessivel: 70, firme: 75, humano: 80, tecnico: 45 },
    tom: "direto, humano, realista — sem hype",
    vocabulario: {
      use: ["método", "evidência", "autoridade", "profundidade", "editorial"],
      avoid: ["revolucionário", "incrível", "game-changer", "mindset", "hack"],
    },
    crencasCombatidas: ["conteúdo só precisa ser bonito"],
    antiPatterns: ["metalinguagem", "estruturas binárias vazias"],
  },
  visual: {
    tokens: {
      colors: {
        primary: "#a3e635",
        secondary: "#1a1a2e",
        accent: "#ffffff",
        background: "#0a0a0f",
        text: "#ffffff",
      },
      fonts: {
        heading: "Inter, sans-serif",
        body: "Inter, sans-serif",
      },
      spacing: {
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      shadows: {
        subtle: "0 1px 3px rgba(0,0,0,0.12)",
        medium: "0 4px 12px rgba(0,0,0,0.2)",
      },
    },
    logoUrl: "https://storage-mc.zoryon.org/brands/zoryon/logo.png",
    logoAltUrl: "https://storage-mc.zoryon.org/brands/zoryon/logo-alt.png",
  },
  audience: {
    avatares: [
      {
        nome: "Empreendedor digital maduro",
        faixaSalarial: "R$ 15k-40k/mês",
        estagio: "operacional buscando escala editorial",
        dores: [
          "conteúdo superficial não converte mais",
          "gasta tempo mas não vira autoridade",
        ],
        busca: "método consistente pra virar voz de referência",
        onde: "instagram, linkedin, podcasts de nicho",
        transformacao: "passar de produtor a referência editorial",
      },
    ],
    antiAvatar: "curioso sem compromisso, quer receita pronta",
  },
  offer: {
    setores: [
      {
        id: "educacao",
        nome: "Educação",
        inclui: ["cursos", "mentorias"],
        problemas: ["churn alto", "dificuldade de diferenciação"],
        metricas: ["matrículas/mês", "NPS"],
        precoSetup: "R$ 5.000-15.000",
        precoRecorrencia: "R$ 2.500-8.000",
      },
      {
        id: "servicos",
        nome: "Serviços premium",
        inclui: ["consultoria", "fracional"],
        problemas: ["pipeline inconsistente"],
        metricas: ["MRR", "LTV"],
        precoSetup: "R$ 8.000",
        precoRecorrencia: "R$ 5.000",
      },
    ],
    pricing: {
      setupMin: 5000,
      setupMax: 15000,
      recMin: 2500,
      recMax: 8000,
    },
    courses: [],
  },
  journey: {
    motorServicos: [],
    motorEducacao: [],
  },
  content: {
    pilares: [
      {
        nome: "educar",
        objetivo: "clarear conceitos complexos",
        logica: "do exemplo pro princípio",
        exemplos: ["checklist", "breakdown de caso"],
        cta: "salve pra revisar",
        papelFunil: "topo",
      },
      {
        nome: "provocar",
        objetivo: "desconforto produtivo",
        logica: "confrontar crença com evidência",
        exemplos: ["hot take com dados"],
        cta: "comente sua visão",
        papelFunil: "meio",
      },
    ],
    canais: [
      {
        nome: "instagram",
        frequencia: "3x/semana",
        tom: "direto com humor",
        prioridade: 1,
      },
      {
        nome: "linkedin",
        frequencia: "2x/semana",
        tom: "analítico",
        prioridade: 2,
      },
    ],
  },
  meta: {
    seedVersion: "2.0.0",
    seededAt: "2026-04-13T00:00:00.000Z",
    qaEnabled: true,
  },
}
