// Parser heurístico pragmático: dado os arquivos do brandkit Zoryon
// (em src/content/brands/zoryon/), monta o BrandConfig. Campos
// estruturáveis são parseados via regex; campos que exigiriam parser
// complexo (avatares com múltiplas subseções) caem em strings
// semi-estruturadas baseadas em seções.
//
// Quando uma seção/regex falha, em vez de silenciar (ex: string vazia,
// `continue`), o mapper acumula `SeedWarning`s para que o caller possa
// reportar problemas no markdown sem quebrar o seed inteiro.

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
  stripBlockquotes,
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

export type SeedWarning = { section: string; field: string; reason: string }

export function buildZoryonConfig(files: ZoryonSourceFiles): {
  config: BrandConfig
  warnings: SeedWarning[]
} {
  const warnings: SeedWarning[] = []
  const config = {
    identity: mapIdentity(files, warnings),
    voice: mapVoice(files, warnings),
    visual: mapVisual(files),
    audience: mapAudience(files, warnings),
    offer: mapOffer(files, warnings),
    journey: mapJourney(files),
    content: mapContent(files, warnings),
    meta: {
      seedVersion: "1.0.0",
      seededAt: new Date().toISOString(),
      qaEnabled: true,
    },
  }
  return { config: brandConfigSchema.parse(config), warnings }
}

function mapIdentity(files: ZoryonSourceFiles, warnings: SeedWarning[]) {
  const bo = stripBlockquotes(files.businessOverview)
  const pos = stripBlockquotes(files.posicionamento)

  const mission =
    findSection(bo, /^Missão$/i)?.content ??
    findSection(bo, /Proposta de Valor/i)?.content ??
    ""
  if (!mission) {
    warnings.push({
      section: "identity",
      field: "mission",
      reason: "no section matched /^Missão$/i nor /Proposta de Valor/i in business-overview",
    })
  }

  const vision = findSection(bo, /^Visão/i)?.content ?? ""
  if (!vision) {
    warnings.push({
      section: "identity",
      field: "vision",
      reason: "no section matched /^Visão/i in business-overview",
    })
  }

  const valuesSection = findSection(bo, /^Valores$/i)
  if (!valuesSection) {
    warnings.push({
      section: "identity",
      field: "values",
      reason: "no section matched /^Valores$/i in business-overview",
    })
  }
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
  if (!positioning) {
    warnings.push({
      section: "identity",
      field: "positioning",
      reason:
        "no section matched /Posicionamento em Uma Frase/i nor /Frase-Síntese/i in posicionamento",
    })
  }

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

function mapVoice(files: ZoryonSourceFiles, warnings: SeedWarning[]) {
  const vg = stripBlockquotes(files.voiceGuide)

  // Valores oficiais definidos no voice guide (não estão estruturados de forma
  // parseável no MD — hardcoded para evitar regex frágil).
  const atributos = { direto: 80, acessivel: 70, firme: 75, humano: 75, tecnico: 30 }

  const tomSection = findSection(vg, /Identidade de Voz|Tom de Voz/i)
  const tom = tomSection ? extractFirstParagraph(tomSection.content) : ""
  if (!tom) {
    warnings.push({
      section: "voice",
      field: "tom",
      reason: "no section matched /Identidade de Voz|Tom de Voz/i in voice guide",
    })
  }

  const vocabSection = findSection(vg, /Vocabulário Oficial/i)
  if (!vocabSection) {
    warnings.push({
      section: "voice",
      field: "vocabulario",
      reason: "no section matched /Vocabulário Oficial/i in voice guide",
    })
  }
  const useBullets = vocabSection
    ? extractBulletsFromSubsection(vocabSection.content, /Use sempre/i)
    : []
  const avoidBullets = vocabSection
    ? extractBulletsFromSubsection(vocabSection.content, /Nunca use/i)
    : []
  if (vocabSection && useBullets.length === 0) {
    warnings.push({
      section: "voice",
      field: "vocabulario.use",
      reason: "subsection /Use sempre/i empty or missing in vocabulario",
    })
  }
  if (vocabSection && avoidBullets.length === 0) {
    warnings.push({
      section: "voice",
      field: "vocabulario.avoid",
      reason: "subsection /Nunca use/i empty or missing in vocabulario",
    })
  }

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

function mapAudience(files: ZoryonSourceFiles, warnings: SeedWarning[]) {
  const md = stripBlockquotes(files.avatares)
  const sections = extractSections(md, 2)
  const avatares: BrandAvatar[] = []

  for (const s of sections) {
    if (!/^Avatar\s+\d+/i.test(s.title)) continue
    const m = s.title.match(/^Avatar\s+(\d+):\s*(.+)$/i)
    if (!m) {
      warnings.push({
        section: "audience",
        field: "avatar",
        reason: `avatar section title did not match pattern: ${s.title}`,
      })
      continue
    }
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

function mapOffer(files: ZoryonSourceFiles, warnings: SeedWarning[]) {
  const md = stripBlockquotes(files.catalogoServicos)
  const setorSection = findSection(md, /Os Setores que a Zoryon Cria/i)
  const setores: BrandSetor[] = []

  if (!setorSection) {
    warnings.push({
      section: "offer",
      field: "setores",
      reason: "no section matched /Os Setores que a Zoryon Cria/i in catalogo-servicos",
    })
  } else {
    const subs = extractSections(setorSection.content, 3)
    for (const s of subs) {
      const m = s.title.match(/^\d+\.\s*(.+)$/)
      if (!m) {
        warnings.push({
          section: "offer",
          field: "setor",
          reason: `setor discarded: title did not match /^\\d+\\.\\s*(.+)$/: ${s.title}`,
        })
        continue
      }
      const nome = m[1].trim()
      const incluiMatch = s.content.match(/\*\*O que inclui:\*\*([\s\S]*?)(?=\*\*|$)/i)
      const problemasMatch = s.content.match(/\*\*Problemas que resolve:\*\*\s*(.+?)(?=\n|$)/i)
      if (!incluiMatch) {
        warnings.push({
          section: "offer",
          field: `setor.${nome}.inclui`,
          reason: "no **O que inclui:** block found",
        })
      }
      if (!problemasMatch) {
        warnings.push({
          section: "offer",
          field: `setor.${nome}.problemas`,
          reason: "no **Problemas que resolve:** block found",
        })
      }
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

  const pricing = parsePricing(files.modeloReceita, warnings)
  const cursos = mapCourses(files.estruturaCursos)

  return { setores, pricing, courses: cursos }
}

// Extrai ranges de pricing do 04-modelo-receita.md. Padrão esperado em tabela:
//   | Setup (implementação)        | R$10.000 – R$20.000     | ... |
//   | Recorrência (acompanhamento) | R$2.500 – R$7.000/mês   | ... |
// Aceita "-" ou "–" como separador. Se a regex falhar, emite warning e cai
// no fallback hardcoded (valores atuais conhecidos do brandkit).
function parsePricing(md: string, warnings: SeedWarning[]) {
  const stripped = stripBlockquotes(md)
  const fallback = { setupMin: 10000, setupMax: 20000, recMin: 2500, recMax: 7000 }

  const rangeRe = /R\$\s*([\d.,]+)\s*[-–]\s*R\$\s*([\d.,]+)/i
  const lines = stripped.split("\n")
  const setupLine = lines.find((l) => /setup/i.test(l) && /R\$/.test(l))
  const recLine = lines.find((l) => /recorr/i.test(l) && /R\$/.test(l) && /mês/i.test(l))

  let { setupMin, setupMax, recMin, recMax } = fallback

  if (setupLine) {
    const m = setupLine.match(rangeRe)
    if (m) {
      setupMin = parseBrl(m[1])
      setupMax = parseBrl(m[2])
    } else {
      warnings.push({
        section: "offer",
        field: "pricing.setup",
        reason: `setup line found but range regex failed: "${setupLine.trim()}"`,
      })
    }
  } else {
    warnings.push({
      section: "offer",
      field: "pricing.setup",
      reason: "no line matching /setup/ + R$ found in modelo-receita; using fallback",
    })
  }

  if (recLine) {
    const m = recLine.match(rangeRe)
    if (m) {
      recMin = parseBrl(m[1])
      recMax = parseBrl(m[2])
    } else {
      warnings.push({
        section: "offer",
        field: "pricing.recorrencia",
        reason: `recorrência line found but range regex failed: "${recLine.trim()}"`,
      })
    }
  } else {
    warnings.push({
      section: "offer",
      field: "pricing.recorrencia",
      reason: "no line matching /recorr/ + R$/mês found in modelo-receita; using fallback",
    })
  }

  return { setupMin, setupMax, recMin, recMax }
}

// "10.000" → 10000, "2.500" → 2500. Brazilian thousand separator is dot.
function parseBrl(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function mapCourses(md: string): BrandCourse[] {
  const content = stripBlockquotes(md)
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

function mapJourney(files: ZoryonSourceFiles) {
  const md = stripBlockquotes(files.jornadaCliente)
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

function mapContent(files: ZoryonSourceFiles, warnings: SeedWarning[]) {
  const md = stripBlockquotes(files.estrategiaConteudo)
  const pilaresSection = findSection(md, /Os 4 Pilares|Pilares de Conteúdo/i)
  const pilares: BrandContentPilar[] = []

  if (!pilaresSection) {
    warnings.push({
      section: "content",
      field: "pilares",
      reason: "no section matched /Os 4 Pilares|Pilares de Conteúdo/i in estrategia-conteudo",
    })
  } else {
    const subs = extractSections(pilaresSection.content, 3)
    for (const s of subs) {
      const m = s.title.match(/^Pilar\s+\d+\s*[—-]\s*(.+)$/i)
      if (!m) {
        warnings.push({
          section: "content",
          field: "pilar",
          reason: `pilar discarded: title did not match /^Pilar\\s+\\d+\\s*[—-]\\s*(.+)$/: ${s.title}`,
        })
        continue
      }
      const nome = m[1].trim()
      const objMatch = s.content.match(/\*\*Objetivo:\*\*\s*(.+?)(?=\n|$)/i)
      const logicaMatch = s.content.match(/\*\*A lógica:\*\*\s*(.+?)(?=\n|$)/i)
      const exemplosMatch = s.content.match(/\*\*Exemplos de conteúdo:\*\*([\s\S]*?)(?=\*\*|$)/i)
      const ctaMatch = s.content.match(/\*\*CTA padrão:?\*\*([\s\S]*?)(?=\*\*|$)/i)
      const papelMatch = s.content.match(/\*\*Papel no funil:\*\*\s*(.+?)(?=\n|$)/i)

      if (!objMatch) {
        warnings.push({
          section: "content",
          field: `pilar.${nome}.objetivo`,
          reason: "no **Objetivo:** block found",
        })
      }
      if (!logicaMatch) {
        warnings.push({
          section: "content",
          field: `pilar.${nome}.logica`,
          reason: "no **A lógica:** block found",
        })
      }

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
  const content = stripBlockquotes(md)
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
