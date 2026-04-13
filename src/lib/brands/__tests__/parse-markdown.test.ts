import { describe, it, expect } from "vitest"
import {
  extractSections,
  findSection,
  extractBullets,
  extractNumberedList,
  cleanMarkdownInline,
  parseCssVariables,
  stripBlockquotes,
  extractTableRows,
} from "../seed/parse-markdown"

describe("extractSections", () => {
  it("extracts level-2 sections by default", () => {
    const md = `# Título\n\n## Seção A\n\nParágrafo A\n\n## Seção B\n\nParágrafo B\n`
    const sections = extractSections(md)
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe("Seção A")
    expect(sections[0].level).toBe(2)
    expect(sections[0].content).toBe("Parágrafo A")
    expect(sections[1].title).toBe("Seção B")
  })

  it("extracts level-3 sections when requested", () => {
    const md = `## Main\n\n### Sub 1\n\nconteúdo 1\n\n### Sub 2\n\nconteúdo 2\n`
    const sections = extractSections(md, 3)
    expect(sections).toHaveLength(2)
    expect(sections[0].title).toBe("Sub 1")
    expect(sections[0].level).toBe(3)
    expect(sections[1].content).toBe("conteúdo 2")
  })

  it("stops accumulating when a higher-level heading is encountered", () => {
    const md = `## Seção A\n\nlinha A\n\n# Novo Título\n\n## Seção B\n\nlinha B\n`
    const sections = extractSections(md)
    // "Seção A" deve encerrar ao ver o "# Novo Título"
    const a = sections.find((s) => s.title === "Seção A")
    expect(a).toBeDefined()
    expect(a!.content).toBe("linha A")
    const b = sections.find((s) => s.title === "Seção B")
    expect(b).toBeDefined()
    expect(b!.content).toBe("linha B")
  })
})

describe("findSection", () => {
  it("finds a section by regex on title", () => {
    const md = `## Voz\n\nconteúdo voz\n\n## Identidade da Marca\n\nconteúdo identidade`
    const found = findSection(md, /identidade/i)
    expect(found).not.toBeNull()
    expect(found!.title).toBe("Identidade da Marca")
    expect(found!.content).toBe("conteúdo identidade")
  })

  it("returns null when no section matches", () => {
    const md = `## Voz\n\nconteúdo`
    expect(findSection(md, /audiencia/i)).toBeNull()
  })
})

describe("extractBullets", () => {
  it("extracts bullets and strips inline bold", () => {
    const content = `- **Direto**: fala reto\n- *acessível*: simples\n- item normal\nnão é bullet\n* outro bullet`
    const bullets = extractBullets(content)
    expect(bullets).toEqual([
      "Direto: fala reto",
      "acessível: simples",
      "item normal",
      "outro bullet",
    ])
  })
})

describe("extractNumberedList", () => {
  it("extracts numbered list items", () => {
    const content = `1. Primeiro\n2. **Segundo**\n3. Terceiro [link](http://x)\n- não numerado`
    const items = extractNumberedList(content)
    expect(items).toEqual(["Primeiro", "Segundo", "Terceiro link"])
  })
})

describe("cleanMarkdownInline", () => {
  it("removes bold/italic/code/link markers", () => {
    const input = "**bold** and *italic* plus `code` and [text](http://url)"
    expect(cleanMarkdownInline(input)).toBe("bold and italic plus code and text")
  })

  it("trims surrounding whitespace", () => {
    expect(cleanMarkdownInline("   plain   ")).toBe("plain")
  })
})

describe("parseCssVariables", () => {
  it("parses multiple CSS vars including url() values", () => {
    const css = `:root {\n  --color-primary: #a3e635;\n  --bg-image: url("/img.png");\n  --spacing-sm: 0.5rem;\n}`
    const vars = parseCssVariables(css)
    expect(vars["color-primary"]).toBe("#a3e635")
    expect(vars["bg-image"]).toBe('url("/img.png")')
    expect(vars["spacing-sm"]).toBe("0.5rem")
  })
})

describe("stripBlockquotes", () => {
  it("removes > blockquote lines", () => {
    const md = `> este é um callout\n> segunda linha\n\n## Seção\n\nconteúdo normal\n> mais um callout no meio\ncontinua`
    const stripped = stripBlockquotes(md)
    expect(stripped).not.toContain("este é um callout")
    expect(stripped).not.toContain("segunda linha")
    expect(stripped).not.toContain("mais um callout")
    expect(stripped).toContain("## Seção")
    expect(stripped).toContain("conteúdo normal")
    expect(stripped).toContain("continua")
  })
})

describe("extractTableRows", () => {
  it("extracts table rows skipping the separator line", () => {
    const content = `Texto não-tabela antes\n\n| Nome | Idade |\n|------|------|\n| Ana  | 30   |\n| Beto | 25   |\n\nTexto após`
    const rows = extractTableRows(content)
    // Cabeçalho + 2 linhas de dados (separador é pulado)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual(["Nome", "Idade"])
    expect(rows[1]).toEqual(["Ana", "30"])
    expect(rows[2]).toEqual(["Beto", "25"])
  })

  it("ignores non-table lines entirely", () => {
    const content = `# título\n\nparagrafo\n\nsem tabela aqui`
    expect(extractTableRows(content)).toEqual([])
  })
})
