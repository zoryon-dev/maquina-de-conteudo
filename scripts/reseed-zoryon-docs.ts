// Reseed de documents da Zoryon v2.
//
// Deleta docs antigos (category='brand' v1 — DOCX) e ingere os 12 MDs de
// negócio de src/content/brands/zoryon/ como documents v2 com embedding Voyage.
//
// Uso:
//   VOYAGE_API_KEY=... DATABASE_URL=... npx tsx scripts/reseed-zoryon-docs.ts --dry
//   VOYAGE_API_KEY=... DATABASE_URL=... npx tsx scripts/reseed-zoryon-docs.ts --yes
//
// --dry: apenas lista o que seria feito (sem DB writes)
// --yes: confirma deleção dos docs antigos (obrigatório se houver v1)

import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local", quiet: true })
loadEnv({ quiet: true })

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { eq, inArray } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { documents, documentEmbeddings } from "../src/db/schema"
import {
  splitDocumentIntoChunks,
  getChunkingOptionsForCategory,
} from "../src/lib/voyage/chunking"
import { generateEmbeddingsBatch } from "../src/lib/voyage/embeddings"

const OWNER_USER_ID = "user_38w4EN5M7ki7vHwSmZN2WQBSmvZ" // jonas.silva@zoryon.dev
const BRANDKIT_DIR = resolve(process.cwd(), "src/content/brands/zoryon")
const CATEGORY = "brand"

// MDs de negócio. Tech/interno/redundante ficam de fora intencionalmente.
const BUSINESS_MDS: { filename: string; title: string }[] = [
  { filename: "00-PROJETO-BASE.md", title: "Zoryon v2 — Projeto Base (contexto + decisões)" },
  { filename: "01-business-overview.md", title: "Zoryon v2 — Business Overview (visão + motores)" },
  { filename: "02-posicionamento-marca.md", title: "Zoryon v2 — Posicionamento e Marca" },
  { filename: "03-avatares-icps.md", title: "Zoryon v2 — Avatares e ICPs" },
  { filename: "04-modelo-receita.md", title: "Zoryon v2 — Modelo de Receita" },
  { filename: "05-catalogo-servicos.md", title: "Zoryon v2 — Catálogo de Serviços (5 setores)" },
  { filename: "06-estrutura-cursos.md", title: "Zoryon v2 — Estrutura de Cursos" },
  { filename: "07-jornada-cliente.md", title: "Zoryon v2 — Jornada do Cliente" },
  { filename: "08-presenca-digital.md", title: "Zoryon v2 — Presença Digital (canais)" },
  { filename: "09-estrategia-conteudo.md", title: "Zoryon v2 — Estratégia de Conteúdo (4 pilares)" },
  { filename: "brand-voice-guide.md", title: "Zoryon v2 — Brand Voice Guide" },
  { filename: "PLANO-MESTRE.md", title: "Zoryon v2 — Plano Mestre (índice estratégico)" },
]

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry")
  const isConfirmed = args.includes("--yes")

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var is required")
  }
  if (!isDryRun && !process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY env var is required (Voyage AI embeddings)")
  }

  const sql = neon(process.env.DATABASE_URL)
  const db = drizzle({ client: sql })

  console.log("[reseed] reading brandkit from", BRANDKIT_DIR)

  // 1. Ler todos os arquivos antes de tocar o DB (fail fast se algum MD falta)
  type ReadFile = { filename: string; title: string; content: string }
  const files: ReadFile[] = []
  for (const { filename, title } of BUSINESS_MDS) {
    const path = resolve(BRANDKIT_DIR, filename)
    const content = await readFile(path, "utf-8")
    files.push({ filename, title, content })
    console.log(`[reseed] ✓ read ${filename} (${content.length} chars)`)
  }

  // 2. Inventariar docs existentes com category='brand'
  const existing = await db
    .select({
      id: documents.id,
      title: documents.title,
      chunksCount: documents.chunksCount,
      fileType: documents.fileType,
    })
    .from(documents)
    .where(eq(documents.category, CATEGORY))

  console.log(
    `[reseed] found ${existing.length} existing docs with category='${CATEGORY}':`
  )
  for (const doc of existing) {
    console.log(
      `  - id=${doc.id} type=${doc.fileType} chunks=${doc.chunksCount} — ${doc.title}`
    )
  }

  if (isDryRun) {
    console.log("[reseed] --dry: no DB changes, exiting")
    console.log(`[reseed] would ingest ${files.length} MDs`)
    return
  }

  if (!isConfirmed && existing.length > 0) {
    console.error(
      "[reseed] Existing v1 docs found. Re-run with --yes to confirm deletion."
    )
    process.exit(1)
  }

  // 3. Deletar v1 (CASCADE de document_embeddings via FK)
  if (existing.length > 0) {
    const ids = existing.map((d) => d.id)
    await db.delete(documents).where(inArray(documents.id, ids))
    console.log(
      `[reseed] deleted ${existing.length} old docs + cascaded embeddings`
    )
  }

  // 4. Ingerir v2
  const chunkOpts = getChunkingOptionsForCategory(CATEGORY)
  let totalChunks = 0
  let totalCharsIn = 0

  for (const { filename, title, content } of files) {
    console.log(`[reseed] ingesting ${filename}...`)
    totalCharsIn += content.length

    // Insere doc sem embedding (flag atualizado depois)
    const [doc] = await db
      .insert(documents)
      .values({
        userId: OWNER_USER_ID,
        title,
        content,
        fileType: "md",
        category: CATEGORY,
        embedded: false,
        embeddingModel: "voyage-4-large",
      })
      .returning()

    // Chunk
    const chunks = await splitDocumentIntoChunks(content, chunkOpts)
    console.log(`  → ${chunks.length} chunks`)

    if (chunks.length === 0) {
      console.warn(`  ⚠ ${filename} produced 0 chunks — skipping embedding`)
      continue
    }

    // Embed via Voyage
    const texts = chunks.map((c) => c.text)
    const embeddings = await generateEmbeddingsBatch(texts)

    // Persist embeddings
    const rows = chunks.map((chunk, i) => ({
      documentId: doc.id,
      embedding: JSON.stringify(embeddings[i]),
      model: "voyage-4-large",
      chunkIndex: chunk.index,
      chunkText: chunk.text,
      startPos: chunk.startPosition,
      endPos: chunk.endPosition,
    }))
    await db.insert(documentEmbeddings).values(rows)

    // Atualizar flag + contagem
    await db
      .update(documents)
      .set({ embedded: true, chunksCount: chunks.length })
      .where(eq(documents.id, doc.id))

    totalChunks += chunks.length
    console.log(`  ✓ ${title} → ${chunks.length} chunks embedded`)
  }

  console.log("\n[reseed] DONE")
  console.log(`  Files ingested:  ${files.length}`)
  console.log(`  Total chars in:  ${totalCharsIn}`)
  console.log(`  Total chunks:    ${totalChunks}`)
  console.log(`  Old docs removed:${existing.length}`)
}

main().catch((err) => {
  console.error("[reseed] failed:", err)
  process.exit(1)
})
