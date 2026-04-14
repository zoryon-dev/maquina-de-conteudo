/**
 * Guardrail: isolamento entre wizard BD e wizard Tribal.
 *
 * Motivação: a rota /wizard/brandsdecoded/[id] é isolada para não regredir o Tribal v4.
 * Imports cruzados (em qualquer direção)
 * indicam acoplamento indevido — este teste detecta a violação antes do
 * merge.
 */

import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

const bdRoot = path.join(
  process.cwd(),
  "src/app/(app)/wizard/brandsdecoded"
)
// Tribal hoje vive em /wizard/ (page.tsx + components/ + actions/). O guardrail
// percorre o diretório raiz mas IGNORA subpastas BD/new/__tests__ (isoladas).
const wizardRoot = path.join(process.cwd(), "src/app/(app)/wizard")
const TRIBAL_IGNORE_DIRS = new Set([
  "brandsdecoded",
  "new",
  "__tests__",
])

function readAllTs(
  dir: string,
  skipDirs: Set<string> = new Set()
): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...readAllTs(full, skipDirs))
    else if (/\.(tsx?|mts|cts)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe("isolamento BD <-> Tribal", () => {
  it("BD não importa de Tribal (/wizard/page|components|actions)", () => {
    const bdFiles = readAllTs(bdRoot)
    expect(bdFiles.length).toBeGreaterThan(0) // sanity: rota existe
    const violations: Array<{ file: string; line: string }> = []
    // Regex resolve import relativos a dir do arquivo e valida que o alvo
    // resolvido fica DENTRO do tree BD. Imports absolutos (@/app/(app)/wizard/)
    // para componentes/actions Tribal são sempre proibidos.
    const forbiddenAbsolute = [
      // Permite @/app/(app)/wizard/actions/extract-seed (utilitário compartilhado entre wizards), bloqueia o resto de /wizard/actions/ e /wizard/components/.
      /from\s+['"]@\/app\/\(app\)\/wizard\/components\//,
      /from\s+['"]@\/app\/\(app\)\/wizard\/actions\/(?!extract-seed)/,
    ]
    const importRelRegex = /from\s+['"](\.[^'"]+)['"]/g
    for (const f of bdFiles) {
      const content = fs.readFileSync(f, "utf-8")
      for (const pat of forbiddenAbsolute) {
        const match = content.match(pat)
        if (match) violations.push({ file: f, line: match[0] })
      }
      for (const m of content.matchAll(importRelRegex)) {
        const rel = m[1]
        const resolved = path.resolve(path.dirname(f), rel)
        // Permite imports dentro do bdRoot; qualquer saída é violação.
        if (!resolved.startsWith(bdRoot)) {
          violations.push({
            file: f,
            line: `${m[0]} -> ${path.relative(process.cwd(), resolved)}`,
          })
        }
      }
    }
    expect(
      violations,
      `BD com import cruzado:\n${violations.map((v) => `  ${v.file}: ${v.line}`).join("\n")}`
    ).toEqual([])
  })

  it("Tribal não importa de /wizard/brandsdecoded (BD)", () => {
    const tribalFiles = readAllTs(wizardRoot, TRIBAL_IGNORE_DIRS)
    expect(tribalFiles.length).toBeGreaterThan(0) // sanity: Tribal existe
    const violations: string[] = []
    for (const f of tribalFiles) {
      const content = fs.readFileSync(f, "utf-8")
      if (
        /from\s+['"]@\/app\/\(app\)\/wizard\/brandsdecoded/.test(content) ||
        /from\s+['"]\.\/brandsdecoded\//.test(content) ||
        /from\s+['"]\.\.\/brandsdecoded\//.test(content)
      ) {
        violations.push(f)
      }
    }
    expect(
      violations,
      `Tribal com import de BD: ${violations.join(", ")}`
    ).toEqual([])
  })
})
