// ============================================================================
// SEED: Zoryon Brand
// ============================================================================
// Lê os MDs em src/content/brands/zoryon/, monta o BrandConfig via mapper,
// valida com Zod, e faz upsert na tabela `brands` (slug='zoryon', is_default=true).
//
// Uso:
//   npx tsx scripts/seed-zoryon-brand.ts           # seed/update
//   npx tsx scripts/seed-zoryon-brand.ts --dry     # apenas imprime o config
// ============================================================================

import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local", quiet: true })
loadEnv({ quiet: true })

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { buildZoryonConfig } from "../src/lib/brands/seed/zoryon-mapper"
import {
  createBrand,
  getBrandBySlug,
  updateBrandConfig,
} from "../src/lib/brands/queries"
import { brandConfigSchema, type BrandConfig } from "../src/lib/brands/schema"

const BRANDKIT_DIR = resolve(process.cwd(), "src/content/brands/zoryon")

/**
 * Lê um arquivo do brandkit local. Lança erro com nome lógico do campo
 * (não só o path) para facilitar diagnóstico quando o brandkit fica
 * desincronizado com o mapper.
 */
async function readBrandkitFile(field: string, filename: string): Promise<string> {
  const path = resolve(BRANDKIT_DIR, filename)
  try {
    return await readFile(path, "utf-8")
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Missing Zoryon brandkit file for '${field}' (${filename}): ${cause}`
    )
  }
}

async function main() {
  const isDryRun = process.argv.includes("--dry")
  const emitJson = process.argv.includes("--emit-json")

  if (!emitJson) {
    console.log("[seed] reading Zoryon brandkit from", BRANDKIT_DIR)
  }

  const files = {
    businessOverview: await readBrandkitFile("businessOverview", "01-business-overview.md"),
    posicionamento: await readBrandkitFile("posicionamento", "02-posicionamento-marca.md"),
    avatares: await readBrandkitFile("avatares", "03-avatares-icps.md"),
    modeloReceita: await readBrandkitFile("modeloReceita", "04-modelo-receita.md"),
    catalogoServicos: await readBrandkitFile("catalogoServicos", "05-catalogo-servicos.md"),
    estruturaCursos: await readBrandkitFile("estruturaCursos", "06-estrutura-cursos.md"),
    jornadaCliente: await readBrandkitFile("jornadaCliente", "07-jornada-cliente.md"),
    presencaDigital: await readBrandkitFile("presencaDigital", "08-presenca-digital.md"),
    estrategiaConteudo: await readBrandkitFile("estrategiaConteudo", "09-estrategia-conteudo.md"),
    voiceGuide: await readBrandkitFile("voiceGuide", "brand-voice-guide.md"),
    designTokens: await readBrandkitFile("designTokens", "design-tokens.css"),
    logoUrl: "/brands/zoryon/logo-zoryon-white.svg",
    logoAltUrl: "/brands/zoryon/logo-zoryon-white-v2.svg",
  }

  if (!emitJson) {
    console.log("[seed] building config via mapper...")
  }
  const { config, warnings } = buildZoryonConfig(files)

  if (emitJson) {
    process.stdout.write(JSON.stringify(config))
    return
  }

  if (warnings.length > 0) {
    console.warn(`[seed] mapper produced ${warnings.length} warning(s):`)
    for (const w of warnings) {
      console.warn(`  - [${w.section}.${w.field}] ${w.reason}`)
    }
  }

  const summary = {
    identity: {
      mission: config.identity.mission.slice(0, 80) + "...",
      values: config.identity.values.length + " values",
      beliefs: config.identity.beliefs.length + " beliefs",
    },
    voice: {
      use: config.voice.vocabulario.use.length + " terms",
      avoid: config.voice.vocabulario.avoid.length + " terms",
      antiPatterns: config.voice.antiPatterns.length + " anti-patterns",
    },
    visual: {
      colors: Object.keys(config.visual.tokens.colors).length + " colors",
      fonts: Object.keys(config.visual.tokens.fonts).length + " fonts",
      spacing: Object.keys(config.visual.tokens.spacing).length + " spacings",
    },
    audience: {
      avatares: config.audience.avatares.map((a) => a.nome),
    },
    offer: {
      setores: config.offer.setores.map((s) => s.nome),
      courses: config.offer.courses.map((c) => c.nome),
    },
    content: {
      pilares: config.content.pilares.map((p) => p.nome),
      canais: config.content.canais.map((c) => c.nome),
    },
  }

  console.log("[seed] config summary:")
  console.dir(summary, { depth: 5 })

  if (isDryRun) {
    console.log("[seed] --dry: skipping DB write")
    return
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed brand")
  }

  // Toda escrita passa pela camada de queries para garantir validação Zod
  // + snapshot atômico em brand_versions (via db.batch).
  const existing = await getBrandBySlug("zoryon")

  if (existing) {
    console.log("[seed] updating existing Zoryon brand (id =", existing.id, ")")

    // Preserva seededAt original; bumpa seedVersion para a do mapper atual.
    const previous = brandConfigSchema.safeParse(existing.config)
    const originalSeededAt =
      previous.success && previous.data.meta.seededAt
        ? previous.data.meta.seededAt
        : config.meta.seededAt

    const merged: BrandConfig = {
      ...config,
      meta: {
        ...config.meta,
        seededAt: originalSeededAt,
      },
    }

    const updated = await updateBrandConfig(existing.id, {
      config: merged,
      message: `seed reapply (seedVersion=${merged.meta.seedVersion})`,
    })
    console.log("[seed] updated. id =", updated.id)
  } else {
    console.log("[seed] creating new Zoryon brand")
    const created = await createBrand({
      slug: "zoryon",
      name: "Zoryon",
      isDefault: true,
      config,
    })
    console.log("[seed] created. id =", created.id)
  }

  console.log("[seed] done.")
}

main().catch((err) => {
  console.error("[seed] failed:", err)
  process.exit(1)
})
