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
import { eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import { buildZoryonConfig } from "../src/lib/brands/seed/zoryon-mapper"
import { brands, brandVersions } from "../src/db/schema"

const BRANDKIT_DIR = resolve(process.cwd(), "src/content/brands/zoryon")

async function readIfExists(filename: string): Promise<string> {
  const path = resolve(BRANDKIT_DIR, filename)
  return readFile(path, "utf-8")
}

async function main() {
  const isDryRun = process.argv.includes("--dry")
  const emitJson = process.argv.includes("--emit-json")

  if (!emitJson) {
    console.log("[seed] reading Zoryon brandkit from", BRANDKIT_DIR)
  }

  const files = {
    businessOverview: await readIfExists("01-business-overview.md"),
    posicionamento: await readIfExists("02-posicionamento-marca.md"),
    avatares: await readIfExists("03-avatares-icps.md"),
    modeloReceita: await readIfExists("04-modelo-receita.md"),
    catalogoServicos: await readIfExists("05-catalogo-servicos.md"),
    estruturaCursos: await readIfExists("06-estrutura-cursos.md"),
    jornadaCliente: await readIfExists("07-jornada-cliente.md"),
    presencaDigital: await readIfExists("08-presenca-digital.md"),
    estrategiaConteudo: await readIfExists("09-estrategia-conteudo.md"),
    voiceGuide: await readIfExists("brand-voice-guide.md"),
    designTokens: await readIfExists("design-tokens.css"),
    logoUrl: "/brands/zoryon/logo-zoryon-white.svg",
    logoAltUrl: "/brands/zoryon/logo-zoryon-white-v2.svg",
  }

  if (!emitJson) {
    console.log("[seed] building config via mapper...")
  }
  const config = buildZoryonConfig(files)

  if (emitJson) {
    process.stdout.write(JSON.stringify(config))
    return
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

  const sql = neon(process.env.DATABASE_URL)
  const db = drizzle({ client: sql })

  const [existing] = await db
    .select()
    .from(brands)
    .where(eq(brands.slug, "zoryon"))
    .limit(1)

  if (existing) {
    console.log("[seed] updating existing Zoryon brand (id =", existing.id, ")")
    await db.insert(brandVersions).values({
      brandId: existing.id,
      config: existing.config,
      message: "pre-seed snapshot",
    })
    const [updated] = await db
      .update(brands)
      .set({ config, name: "Zoryon", isDefault: true, updatedAt: new Date() })
      .where(eq(brands.id, existing.id))
      .returning()
    console.log("[seed] updated. id =", updated.id)
  } else {
    console.log("[seed] creating new Zoryon brand")
    const [created] = await db
      .insert(brands)
      .values({
        slug: "zoryon",
        name: "Zoryon",
        isDefault: true,
        config,
      })
      .returning()
    console.log("[seed] created. id =", created.id)
  }

  console.log("[seed] done.")
}

main().catch((err) => {
  console.error("[seed] failed:", err)
  process.exit(1)
})
