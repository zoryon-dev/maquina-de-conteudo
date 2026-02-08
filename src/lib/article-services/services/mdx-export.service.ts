/**
 * MDX Export Service
 *
 * Pure backend service (no LLM) that transforms article data into
 * a complete .mdx file for the Zoryon Blog (Astro 5).
 *
 * Features:
 * - YAML frontmatter generation
 * - CTA block insertion at optimal positions
 * - Blog category suggestion from internal category
 * - Content processing (H1 removal, MDX imports)
 */

import { db } from "@/db"
import { articles, articleMetadata, articleImages, articleCategories } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// ─── Types ───────────────────────────────────────────────

export type BlogCategory =
  | "ia-negocios"
  | "carreira-formacao"
  | "mercado-tendencias"
  | "agentes-automacao"

export interface MdxExportOptions {
  blogCategory?: BlogCategory
  blogAuthor?: string
  featured?: boolean
  draft?: boolean
}

export interface MdxExportResult {
  mdxContent: string
  filename: string
  suggestedCategory: BlogCategory
}

interface CtaPlacement {
  type: string
  position: number // line index to insert AFTER
  variant: "strip" | "banner"
}

// ─── CTA Config per Blog Category ────────────────────────

const CTA_MAP: Record<BlogCategory, string[]> = {
  "ia-negocios": ["diagnostico", "roi", "newsletter"],
  "carreira-formacao": ["carreira", "newsletter", "consultoria"],
  "mercado-tendencias": ["newsletter", "roi", "diagnostico"],
  "agentes-automacao": ["diagnostico", "consultoria", "newsletter"],
}

// ─── Category Suggestion Keywords ────────────────────────

const CATEGORY_KEYWORDS: Record<BlogCategory, string[]> = {
  "ia-negocios": [
    "negocio", "negocios", "empresa", "empresarial", "corporativo", "roi",
    "receita", "vendas", "marketing", "estrategia", "gestao", "produtividade",
    "eficiencia", "custos", "investimento", "lucro",
  ],
  "carreira-formacao": [
    "carreira", "formacao", "profissional", "skills", "habilidades", "emprego",
    "trabalho", "curriculo", "entrevista", "salario", "certificacao", "curso",
    "aprendizado", "capacitacao", "desenvolvimento pessoal",
  ],
  "mercado-tendencias": [
    "mercado", "tendencia", "tendencias", "futuro", "previsao", "analise",
    "setor", "industria", "crescimento", "inovacao", "disrupcao", "cenario",
    "pesquisa", "dados", "estatisticas",
  ],
  "agentes-automacao": [
    "agente", "agentes", "automacao", "automatizar", "workflow", "pipeline",
    "bot", "chatbot", "ferramenta", "api", "integracao", "no-code", "low-code",
    "prompt", "llm", "modelo de linguagem",
  ],
}

// ─── Main Export Function ────────────────────────────────

export async function buildMdxExport(
  articleId: number,
  userId: string,
  options: MdxExportOptions = {},
): Promise<MdxExportResult> {
  // 1. Fetch article + verify ownership
  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1)

  if (!article) {
    throw new Error("Artigo não encontrado")
  }

  if (!article.finalContent) {
    throw new Error("Artigo ainda não possui conteúdo final")
  }

  // 2. Fetch related data in parallel
  const [metaRows, imageRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(articleMetadata)
      .where(eq(articleMetadata.articleId, articleId))
      .limit(1),
    db
      .select()
      .from(articleImages)
      .where(
        and(
          eq(articleImages.articleId, articleId),
          eq(articleImages.imageType, "featured"),
        ),
      )
      .limit(1),
    article.categoryId
      ? db
          .select()
          .from(articleCategories)
          .where(eq(articleCategories.id, article.categoryId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const meta = metaRows[0] ?? null
  const featuredImage = imageRows[0] ?? null
  const category = categoryRows[0] ?? null

  // 3. Determine blog category
  const suggestedCategory = suggestBlogCategory(
    category?.slug ?? null,
    article.finalContent,
  )
  const blogCategory = options.blogCategory ?? suggestedCategory

  // 4. Process content
  const processedContent = processContentForMdx(article.finalContent)

  // 5. Determine and insert CTAs
  const contentWithCtas = insertCtas(processedContent, blogCategory)

  // 6. Build frontmatter
  const title = article.finalTitle || article.title || "Sem Título"
  const slug = meta?.slug || generateSlug(title)
  const metaTitles = (meta?.metaTitles as Array<{ text: string }>) ?? []
  const metaDescriptions = (meta?.metaDescriptions as Array<{ text: string }>) ?? []
  const excerpt = metaDescriptions[0]?.text || ""
  const readingTime = calculateReadingTime(processedContent)
  const publishedAt = new Date().toISOString().split("T")[0]

  const frontmatterLines = ["---"]
  frontmatterLines.push(`title: "${escapeYaml(metaTitles[0]?.text || title)}"`)
  if (excerpt) frontmatterLines.push(`excerpt: "${escapeYaml(excerpt)}"`)
  if (featuredImage?.imageUrl) {
    frontmatterLines.push(`coverImage: "${featuredImage.imageUrl}"`)
  }
  frontmatterLines.push(`category: "${blogCategory}"`)
  frontmatterLines.push(`author: "${options.blogAuthor || "jonas-kessler"}"`)
  frontmatterLines.push(`publishedAt: "${publishedAt}"`)
  frontmatterLines.push(`readingTime: "${readingTime}"`)
  frontmatterLines.push(`featured: ${options.featured ?? false}`)
  frontmatterLines.push(`draft: ${options.draft ?? false}`)
  if (slug) frontmatterLines.push(`slug: "${slug}"`)

  // Tags from keywords
  const primaryKeyword = article.primaryKeyword || ""
  const secondaryKeywords = (article.secondaryKeywords as string[] | null) || []
  const tags = [primaryKeyword, ...secondaryKeywords].filter(Boolean)
  if (tags.length > 0) {
    frontmatterLines.push("tags:")
    for (const tag of tags) {
      frontmatterLines.push(`  - "${escapeYaml(tag)}"`)
    }
  }

  frontmatterLines.push("---")

  // 7. Build MDX imports
  const imports = buildMdxImports(contentWithCtas)

  // 8. Assemble final MDX
  const parts = [frontmatterLines.join("\n")]
  if (imports) parts.push(imports)
  parts.push(contentWithCtas)

  const mdxContent = parts.join("\n\n")
  const filename = `${slug || "artigo"}.mdx`

  return { mdxContent, filename, suggestedCategory }
}

// ─── Content Processing ──────────────────────────────────

export function processContentForMdx(content: string): string {
  const lines = content.split("\n")
  const processed: string[] = []
  let removedH1 = false

  for (const line of lines) {
    // Remove first H1 (blog renders title from frontmatter)
    if (!removedH1 && /^#\s+/.test(line)) {
      removedH1 = true
      continue
    }
    processed.push(line)
  }

  // Remove leading/trailing blank lines
  const result = processed.join("\n").trim()
  return result
}

// ─── CTA Insertion ───────────────────────────────────────

function parseH2Positions(content: string): number[] {
  const lines = content.split("\n")
  const positions: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      positions.push(i)
    }
  }
  return positions
}

export function determineCtas(
  content: string,
  blogCategory: BlogCategory,
): CtaPlacement[] {
  const h2Positions = parseH2Positions(content)
  const lines = content.split("\n")
  const ctaTypes = CTA_MAP[blogCategory] || CTA_MAP["ia-negocios"]
  const placements: CtaPlacement[] = []

  if (h2Positions.length <= 1) {
    // Very short article — no CTAs
    return []
  }

  if (h2Positions.length === 2) {
    // 2 H2s → 1 strip CTA between them
    const midLine = findParagraphBreak(lines, h2Positions[0], h2Positions[1])
    placements.push({
      type: ctaTypes[0],
      position: midLine,
      variant: "strip",
    })
  } else {
    // 3+ H2s → up to 3 CTAs
    // 1. Strip after first section (between H2[0] and H2[1])
    const afterIntro = findParagraphBreak(lines, h2Positions[0], h2Positions[1])
    placements.push({
      type: ctaTypes[0],
      position: afterIntro,
      variant: "strip",
    })

    // 2. Strip in the middle
    const midIdx = Math.floor(h2Positions.length / 2)
    const midStart = h2Positions[midIdx - 1] ?? h2Positions[0]
    const midEnd = h2Positions[midIdx] ?? lines.length
    const midLine = findParagraphBreak(lines, midStart, midEnd)
    placements.push({
      type: ctaTypes[1],
      position: midLine,
      variant: "strip",
    })

    // 3. Banner before conclusion (before last H2)
    const lastH2 = h2Positions[h2Positions.length - 1]
    placements.push({
      type: ctaTypes[2],
      position: lastH2 - 1,
      variant: "banner",
    })
  }

  return placements
}

function findParagraphBreak(
  lines: string[],
  startLine: number,
  endLine: number,
): number {
  // Find first empty line between startLine and endLine
  for (let i = startLine + 1; i < endLine; i++) {
    if (lines[i].trim() === "") {
      return i
    }
  }
  // Fallback: midpoint
  return Math.floor((startLine + endLine) / 2)
}

function insertCtas(content: string, blogCategory: BlogCategory): string {
  const placements = determineCtas(content, blogCategory)
  if (placements.length === 0) return content

  const lines = content.split("\n")

  // Sort placements by position descending so inserts don't shift indices
  const sorted = [...placements].sort((a, b) => b.position - a.position)

  for (const cta of sorted) {
    const ctaBlock =
      cta.variant === "banner"
        ? `\n<CTABlock type="${cta.type}" variant="banner" />\n`
        : `\n<CTABlock type="${cta.type}" />\n`

    lines.splice(cta.position + 1, 0, ctaBlock)
  }

  return lines.join("\n")
}

// ─── MDX Imports ─────────────────────────────────────────

function buildMdxImports(content: string): string {
  const imports: string[] = []

  if (content.includes("<CTABlock")) {
    imports.push('import { CTABlock } from "@/components/blog/CTABlock"')
  }
  if (content.includes("<ImageBlock")) {
    imports.push('import { ImageBlock } from "@/components/blog/ImageBlock"')
  }

  return imports.join("\n")
}

// ─── Category Suggestion ─────────────────────────────────

export function suggestBlogCategory(
  internalSlug: string | null,
  content: string,
): BlogCategory {
  // First: check if internal slug directly maps
  if (internalSlug) {
    const slug = internalSlug.toLowerCase()
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => slug.includes(kw))) {
        return category as BlogCategory
      }
    }
  }

  // Second: keyword frequency analysis on content
  const lowerContent = content.toLowerCase()
  let bestCategory: BlogCategory = "ia-negocios"
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      const regex = new RegExp(kw, "gi")
      const matches = lowerContent.match(regex)
      if (matches) score += matches.length
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as BlogCategory
    }
  }

  return bestCategory
}

// ─── Utilities ───────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim hyphens
}

export function calculateReadingTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${minutes} min`
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"')
}
