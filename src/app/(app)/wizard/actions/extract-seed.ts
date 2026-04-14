"use server"

// Server actions para extração + persistência de seeds no wizard.
// Next.js proíbe exports não-async em "use server" — tipos/shapes ficam no
// service `content-extractor.service.ts` e são importados pelo cliente direto.

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { contentWizards } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  extractSeedAsBriefing,
  type SeedInput,
  type ExtractedBriefing,
  type StoredSeed,
} from "@/lib/wizard-services/content-extractor.service"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Extrai briefing de uma seed (link/youtube/keyword/theme/insight) e persiste
 * no array `content_wizards.seeds` do wizard informado. Ação explícita do
 * usuário — UI dispara via botão "Extrair".
 *
 * Guards:
 *  - Clerk auth (rejeita sem userId)
 *  - Ownership check (wizard.userId === currentUserId)
 *
 * Mutação atômica: lê seeds[], acrescenta a nova, escreve de volta com o
 * mesmo update. Sem locking — concorrência em wizards diferentes é isolada,
 * dois clicks simultâneos no mesmo wizard sofrem last-write-wins (aceitável
 * pro caso de uso).
 */
export async function extractSeedAction(
  wizardId: number,
  seed: SeedInput
): Promise<ActionResult<ExtractedBriefing>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  // Ownership
  const [wiz] = await db
    .select({
      id: contentWizards.id,
      userId: contentWizards.userId,
      seeds: contentWizards.seeds,
    })
    .from(contentWizards)
    .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
    .limit(1)

  if (!wiz) return { success: false, error: "wizard not found" }

  // Extrair
  const extraction = await extractSeedAsBriefing(seed)
  if (!extraction.success) {
    return { success: false, error: extraction.error }
  }

  // Persistir (append — preserva seeds anteriores)
  const currentSeeds: StoredSeed[] = Array.isArray(wiz.seeds) ? wiz.seeds : []
  const storedValue =
    "value" in extraction.data.seed
      ? extraction.data.seed.value
      : extraction.data.seed.url
  const newSeed: StoredSeed = {
    type: extraction.data.seed.type,
    value: storedValue,
    briefing: extraction.data.briefing,
    metadata: extraction.data.metadata,
    extractedAt: new Date().toISOString(),
  }

  await db
    .update(contentWizards)
    .set({ seeds: [...currentSeeds, newSeed], updatedAt: new Date() })
    .where(eq(contentWizards.id, wizardId))

  console.log("[wizard/extract-seed]", {
    wizardId,
    type: newSeed.type,
    briefingLen: newSeed.briefing?.length ?? 0,
    source: extraction.data.metadata.source,
  })

  return { success: true, data: extraction.data }
}

/**
 * Remove seed por índice. Usa splice mutação local + update atômico da coluna.
 * Índice inválido degrada gracefully (splice no-op → array igual).
 */
export async function removeSeedAction(
  wizardId: number,
  index: number
): Promise<ActionResult<{ removed: number }>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const [wiz] = await db
    .select({ seeds: contentWizards.seeds })
    .from(contentWizards)
    .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId)))
    .limit(1)

  if (!wiz) return { success: false, error: "wizard not found" }

  const seeds: StoredSeed[] = Array.isArray(wiz.seeds) ? [...wiz.seeds] : []
  seeds.splice(index, 1)

  await db
    .update(contentWizards)
    .set({ seeds, updatedAt: new Date() })
    .where(eq(contentWizards.id, wizardId))

  console.log("[wizard/remove-seed]", { wizardId, index, remaining: seeds.length })

  return { success: true, data: { removed: index } }
}
