// ============================================================================
// ZORYON MAPPER
// ============================================================================
// Dado os arquivos do brandkit Zoryon (em src/content/brands/zoryon/),
// monta o BrandConfig. Campos estruturáveis são parseados heuristicamente;
// campos que exigiriam parser complexo (avatares com múltiplas subseções)
// caem em strings semi-estruturadas baseadas em seções.
// ============================================================================

import {
  brandConfigSchema,
  type BrandConfig,
  type BrandAvatar,
  type BrandSetor,
  type BrandCourse,
  type BrandContentPilar,
  type BrandContentCanal,
} from "../schema"
import {
  extractSections,
  findSection,
  extractBullets,
  stripFrontmatter,
  cleanMarkdownInline,
  parseCssVariables,
  extractFirstParagraph,
} from "./parse-markdown"

export type ZoryonSourceFiles = {
  businessOverview: string // 01-business-overview.md
  posicionamento: string // 02-posicionamento-marca.md
  avatares: string // 03-avatares-icps.md
  modeloReceita: string // 04-modelo-receita.md
  catalogoServicos: string // 05-catalogo-servicos.md
  estruturaCursos: string // 06-estrutura-cursos.md
  jornadaCliente: string // 07-jornada-cliente.md
  presencaDigital: string // 08-presenca-digital.md
  estrategiaConteudo: string // 09-estrategia-conteudo.md
  voiceGuide: string // brand-voice-guide.md
  designTokens: string // design-tokens.css
  logoUrl?: string
  logoAltUrl?: string
}

export function buildZoryonConfig(files: ZoryonSourceFiles): BrandConfig {
  const config = {
    identity: mapIdentity(files),
    voice: mapVoice(files),
    visual: mapVisual(files),
    audience: mapAudience(files),
    offer: mapOffer(files),
    journey: mapJourney(files),
    content: mapContent(files),
    meta: {
      seedVersion: "1.0.0",
      seededAt: new Date().toISOString(),
      qaEnabled: true,
    },
  }
  return brandConfigSchema.parse(config)
}

// ============================================================================
// IDENTITY
// ============================================================================

function mapIdentity(files: ZoryonSourceFiles) {
  const bo = stripFrontmatter(files.businessOverview)
  const pos = stripFrontmatter(files.posicionamento)

  const mission =
    findSection(bo, /^Missão$/i)?.content ??
    findSection(bo, /Proposta de Valor/i)?.content ??
    ""

  const vision =
    findSection(bo, /^Visão/i)?.content ??
    ""

  const valuesSection = findSection(bo, /^Valores$/i)
  const values = valuesSection
    ? extractSections(valuesSection.content, 3).map((s) => ({
        name: cleanValueName(s.title),
        description: extractFirstParagraph(s.content),
      }))
    : []

  const positioning =
    findSection(pos, /^Posicionamento em Uma Frase/i)?.content ??
    findSection(pos, /^Frase-Síntese/i)?.content ??
    ""

  const antiPositioningSection = findSection(pos, /^Anti-Posicionamento/i)
  const antiPositioning = antiPositioningSection
    ? extractBullets(antiPositioningSection.content).join(" • ")
    : ""

  const beliefsSection = findSection(pos, /Crenças Que Combatemos|O Inimigo/i)
  const beliefs = beliefsSection
    ? extractSections(beliefsSection.content, 3).map((s) =>
        cleanMarkdownInline(s.title).replace(/^"|"$/g, "")
      )
    : []

  return {
    mission: extractFirstParagraph(mission),
    vision: extractFirstParagraph(vision),
    values,
    positioning: extractFirstParagraph(positioning),
    antiPositioning,
    beliefs,
  }
}

function cleanValueName(raw: string): string {
  return raw.replace(/^\d+\.\s*/, "").trim()
}

// ============================================================================
// VOICE
// ============================================================================

function mapVoice(files: ZoryonSourceFiles) {
  const vg = stripFrontmatter(files.voiceGuide)

  // Atributos: valores oficiais definidos no voice guide
  const atributos = { direto: 80, acessivel: 70, firme: 75, humano: 75, tecnico: 30 }

  const tomSection = findSection(vg, /Identidade de Voz|Tom de Voz/i)
  const tom = tomSection ? extractFirstParagraph(tomSection.content) : ""

  const vocabSection = findSection(vg, /Vocabulário Oficial/i)
  const useBullets = vocabSection
    ? extractBulletsFromSubsection(vocabSection.content, /Use sempre/i)
    : []
  const avoidBullets = vocabSection
    ? extractBulletsFromSubsection(vocabSection.content, /Nunca use/i)
    : []

  const beliefsSection = findSection(vg, /Crenças que Combatemos/i)
  const crencasCombatidas = beliefsSection
    ? extractBullets(beliefsSection.content).filter((b) => b.includes("|") === false)
    : []

  const antiSection = findSection(vg, /Anti-Padrões de Conteúdo/i)
  const antiPatterns = antiSection
    ? extractBulletsFromSubsection(antiSection.content, /NUNCA faz/i)
    : []

  return {
    atributos,
    tom,
    vocabulario: { use: useBullets, avoid: avoidBullets },
    crencasCombatidas,
    antiPatterns,
  }
}

function extractBulletsFromSubsection(content: string, titlePattern: RegExp): string[] {
  const subs = extractSections(content, 3)
  const section = subs.find((s) => titlePattern.test(s.title))
  if (!section) return []
  return extractBullets(section.content)
}

// ============================================================================
// VISUAL
// ============================================================================

function mapVisual(files: ZoryonSourceFiles) {
  const vars = parseCssVariables(files.designTokens)
  const colors: Record<string, string> = {}
  const fonts: Record<string, string> = {}
  const spacing: Record<string, string> = {}
  const shadows: Record<string, string> = {}

  for (const [name, value] of Object.entries(vars)) {
    if (name.startsWith("color-")) colors[name.replace(/^color-/, "")] = value
    else if (name.startsWith("font-") || name === "font-display" || name === "font-body" || name === "font-mono")
      fonts[name.replace(/^font-/, "")] = value
    else if (name.startsWith("space-")) spacing[name.replace(/^space-/, "")] = value
    else if (name.startsWith("shadow-")) shadows[name.replace(/^shadow-/, "")] = value
  }

  return {
    tokens: { colors, fonts, spacing, shadows },
    logoUrl: files.logoUrl ?? "/brands/zoryon/logo-zoryon-white.svg",
    logoAltUrl: files.logoAltUrl ?? "/brands/zoryon/logo-zoryon-white-v2.svg",
  }
}

// ============================================================================
// AUDIENCE
// ============================================================================

function mapAudience(files: ZoryonSourceFiles) {
  const md = stripFrontmatter(files.avatares)
  const sections = extractSections(md, 2)
  const avatares: BrandAvatar[] = []

  for (const s of sections) {
    const m = s.title.match(/^Avatar\s+(\d+):\s*(.+)$/i)
    if (!m) continue
    const [, , nome] = m
    avatares.push(parseAvatar(nome, s.content))
  }

  const antiSection = sections.find((s) => /^Anti-Avatar/i.test(s.title))
  const antiAvatar = antiSection
    ? extractSections(antiSection.content, 3)
        .map((sub) => `${sub.title}: ${extractFirstParagraph(sub.content)}`)
        .join("\n\n")
    : ""

  return { avatares, antiAvatar }
}

function parseAvatar(nome: string, content: string): BrandAvatar {
  const subs = extractSections(content, 3)
  const perfil = subs.find((s) => /Perfil do negócio/i.test(s.title))
  const dores = subs.find((s) => /As dores principais|dores principais/i.test(s.title))
  const busca = subs.find((s) => /O que ele busca|que ela busca/i.test(s.title))
  const onde = subs.find((s) => /Onde ele está|Onde ela está/i.test(s.title))
  const transform = subs.find((s) => /transformação/i.test(s.title))

  const perfilBullets = perfil ? extractBullets(perfil.content) : []
  const faixaSalarial =
    perfilBullets.find((b) => /R\$|mês/i.test(b))?.replace(/^.*?:\s*/, "") ?? ""
  const estagio = perfilBullets.find((b) => /estruturação|consolidado|estágio/i.test(b)) ?? ""

  return {
    nome: cleanMarkdownInline(nome),
    faixaSalarial,
    estagio,
    dores: dores ? extractBullets(dores.content) : [],
    busca: busca ? extractFirstParagraph(busca.content) : "",
    onde: onde ? extractBullets(onde.content).join(", ") : "",
    transformacao: transform ? extractFirstParagraph(transform.content) : "",
  }
}

// ============================================================================
// OFFER (setores + pricing + cursos)
// ============================================================================

function mapOffer(files: ZoryonSourceFiles) {
  const md = stripFrontmatter(files.catalogoServicos)
  const setorSection = findSection(md, /Os Setores que a Zoryon Cria/i)
  const setores: BrandSetor[] = []

  if (setorSection) {
    const subs = extractSections(setorSection.content, 3)
    for (const s of subs) {
      const m = s.title.match(/^\d+\.\s*(.+)$/)
      if (!m) continue
      const nome = m[1].trim()
      const incluiMatch = s.content.match(/\*\*O que inclui:\*\*([\s\S]*?)(?=\*\*|$)/i)
      const problemasMatch = s.content.match(/\*\*Problemas que resolve:\*\*\s*(.+?)(?=\n|$)/i)
      setores.push({
        id: slugify(nome),
        nome,
        inclui: incluiMatch ? extractBullets(incluiMatch[1]) : [],
        problemas: problemasMatch
          ? problemasMatch[1].split(/[,.;]/).map((p) => cleanMarkdownInline(p)).filter(Boolean)
          : [],
        metricas: [],
        precoSetup: "",
        precoRecorrencia: "",
      })
    }
  }

  // Pricing (extraído do modelo-receita ou hardcoded conforme doc)
  const pricing = { setupMin: 10000, setupMax: 20000, recMin: 2500, recMax: 7000 }

  const cursos = mapCourses(files.estruturaCursos)

  return { setores, pricing, courses: cursos }
}

function mapCourses(md: string): BrandCourse[] {
  const content = stripFrontmatter(md)
  const sections = extractSections(content, 2)
  const courses: BrandCourse[] = []
  for (const s of sections) {
    const m = s.title.match(/^(Degrau [^:]+|Curso [^:]+|Módulo [^:]+)(?::\s*(.+))?$/i)
    if (!m) continue
    const nome = m[2] ?? m[1]
    const priceMatch = s.content.match(/R\$\s*[\d.,]+(?:\s*[-–]\s*R?\$?\s*[\d.,]+)?/i)
    const modulosSection = extractSections(s.content, 3).find((x) => /módulo/i.test(x.title))
    courses.push({
      id: slugify(nome),
      nome: cleanMarkdownInline(nome),
      preco: priceMatch ? priceMatch[0] : "",
      modulos: modulosSection ? extractBullets(modulosSection.content) : [],
      prerequisitos: [],
      targetAvatar: "",
    })
  }
  return courses
}

// ============================================================================
// JOURNEY
// ============================================================================

function mapJourney(files: ZoryonSourceFiles) {
  const md = stripFrontmatter(files.jornadaCliente)
  const sections = extractSections(md, 2)

  const motorServicos = sections
    .filter((s) => /^Jornada.*A|Motor 1|Serviços|Avatar 1/i.test(s.title))
    .flatMap((s) =>
      extractSections(s.content, 3).map((sub) => ({
        stage: cleanMarkdownInline(sub.title),
        canal: "",
        acao: extractFirstParagraph(sub.content),
        saidas: [],
      }))
    )

  const motorEducacao = sections
    .filter((s) => /^Jornada.*B|Motor 2|Educ|Avatar 2/i.test(s.title))
    .flatMap((s) =>
      extractSections(s.content, 3).map((sub) => ({
        stage: cleanMarkdownInline(sub.title),
        canal: "",
        acao: extractFirstParagraph(sub.content),
        saidas: [],
      }))
    )

  return { motorServicos, motorEducacao }
}

// ============================================================================
// CONTENT (pilares + canais)
// ============================================================================

function mapContent(files: ZoryonSourceFiles) {
  const md = stripFrontmatter(files.estrategiaConteudo)
  const pilaresSection = findSection(md, /Os 4 Pilares|Pilares de Conteúdo/i)
  const pilares: BrandContentPilar[] = []

  if (pilaresSection) {
    const subs = extractSections(pilaresSection.content, 3)
    for (const s of subs) {
      const m = s.title.match(/^Pilar\s+\d+\s*[—-]\s*(.+)$/i)
      if (!m) continue
      const nome = m[1].trim()
      const objMatch = s.content.match(/\*\*Objetivo:\*\*\s*(.+?)(?=\n|$)/i)
      const logicaMatch = s.content.match(/\*\*A lógica:\*\*\s*(.+?)(?=\n|$)/i)
      const exemplosMatch = s.content.match(/\*\*Exemplos de conteúdo:\*\*([\s\S]*?)(?=\*\*|$)/i)
      const ctaMatch = s.content.match(/\*\*CTA padrão:?\*\*([\s\S]*?)(?=\*\*|$)/i)
      const papelMatch = s.content.match(/\*\*Papel no funil:\*\*\s*(.+?)(?=\n|$)/i)

      pilares.push({
        nome,
        objetivo: objMatch ? cleanMarkdownInline(objMatch[1]) : "",
        logica: logicaMatch ? cleanMarkdownInline(logicaMatch[1]) : "",
        exemplos: exemplosMatch ? extractBullets(exemplosMatch[1]) : [],
        cta: ctaMatch ? extractBullets(ctaMatch[1]).join(" | ") : "",
        papelFunil: papelMatch ? cleanMarkdownInline(papelMatch[1]) : "",
      })
    }
  }

  const canais = mapCanais(files.presencaDigital)

  return { pilares, canais }
}

function mapCanais(md: string): BrandContentCanal[] {
  const content = stripFrontmatter(md)
  const sections = extractSections(content, 2)
  const canais: BrandContentCanal[] = []
  let prioridade = 1

  for (const s of sections) {
    if (!/Canais Prioritários|Canais Secundários/i.test(s.title)) continue
    const subs = extractSections(s.content, 3)
    for (const sub of subs) {
      const nome = sub.title.trim()
      const freqMatch = sub.content.match(/\*\*Frequência:\*\*([\s\S]*?)(?=\*\*|$)/i)
      const tomMatch = sub.content.match(/\*\*Tom:\*\*\s*(.+?)(?=\n|$)/i)
      canais.push({
        nome,
        frequencia: freqMatch ? extractBullets(freqMatch[1]).join(" | ") || cleanMarkdownInline(freqMatch[1]) : "",
        tom: tomMatch ? cleanMarkdownInline(tomMatch[1]) : "",
        prioridade: prioridade++,
      })
    }
  }
  return canais
}

// ============================================================================
// UTILS
// ============================================================================

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
