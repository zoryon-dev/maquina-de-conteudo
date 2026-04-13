// ============================================================================
// MARKDOWN PARSING HELPERS
// ============================================================================
// Heurísticas simples para extrair seções, bullets e tabelas dos MDs do
// brandkit. Não é um parser MD completo — só cobre os padrões que usamos no
// Zoryon. Caso um documento tenha estrutura diferente, o mapper resolve caso
// a caso.
// ============================================================================

export type Section = { title: string; content: string; level: number }

export function stripFrontmatter(md: string): string {
  return md.replace(/^>\s.*$/gm, "").trim()
}

export function extractSections(md: string, level = 2): Section[] {
  const lines = md.split("\n")
  const sections: Section[] = []
  let current: Section | null = null
  const headerPrefix = "#".repeat(level) + " "

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const hashes = match[1].length
      const title = match[2].trim()
      if (hashes === level) {
        if (current) sections.push(current)
        current = { title, content: "", level: hashes }
        continue
      }
      if (hashes < level) {
        if (current) sections.push(current)
        current = null
        continue
      }
    }
    if (current) {
      current.content += line + "\n"
    }
  }
  if (current) sections.push(current)
  return sections.map((s) => ({ ...s, content: s.content.trim() }))
}

export function findSection(md: string, titlePattern: RegExp, level = 2): Section | null {
  const sections = extractSections(md, level)
  return sections.find((s) => titlePattern.test(s.title)) ?? null
}

export function extractBullets(content: string): string[] {
  const lines = content.split("\n")
  const bullets: string[] = []
  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+(.+)$/)
    if (match) {
      bullets.push(cleanMarkdownInline(match[1]))
    }
  }
  return bullets
}

export function extractNumberedList(content: string): string[] {
  const lines = content.split("\n")
  const items: string[] = []
  for (const line of lines) {
    const match = line.match(/^\s*\d+\.\s+(.+)$/)
    if (match) {
      items.push(cleanMarkdownInline(match[1]))
    }
  }
  return items
}

export function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim()
}

export function extractTableRows(content: string): string[][] {
  const lines = content.split("\n").map((l) => l.trim())
  const rows: string[][] = []
  let inTable = false
  for (const line of lines) {
    if (!line.startsWith("|")) {
      inTable = false
      continue
    }
    if (/^\|[\s|:-]+\|$/.test(line)) {
      inTable = true
      continue
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => cleanMarkdownInline(c.trim()))
    if (inTable || cells.length >= 2) {
      rows.push(cells)
    }
  }
  return rows
}

export function extractFirstParagraph(content: string): string {
  const trimmed = content.trim()
  const parts = trimmed.split(/\n\s*\n/)
  return parts[0]?.trim() ?? ""
}

export function extractAllParagraphs(content: string): string[] {
  return content
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

// ============================================================================
// CSS VARIABLE PARSER
// ============================================================================

export function parseCssVariables(css: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const re = /--([\w-]+):\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = re.exec(css)) !== null) {
    const [, name, value] = match
    vars[name] = value.trim()
  }
  return vars
}

export function groupCssVariablesByPrefix(
  vars: Record<string, string>,
  prefixes: Record<string, string>
): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, string>> = {}
  for (const groupKey of Object.keys(prefixes)) grouped[groupKey] = {}
  for (const [name, value] of Object.entries(vars)) {
    for (const [groupKey, prefix] of Object.entries(prefixes)) {
      if (name.startsWith(prefix)) {
        const shortKey = name.slice(prefix.length).replace(/^-/, "")
        grouped[groupKey][shortKey || name] = value
        break
      }
    }
  }
  return grouped
}
