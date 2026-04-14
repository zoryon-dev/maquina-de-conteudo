"use server"

// Server actions para extração + persistência de seeds no wizard.
// Next.js proíbe exports não-async em "use server" — tipos/shapes ficam no
// service `content-extractor.service.ts` e são importados pelo cliente direto.

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { contentWizards } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { z } from "zod"
import {
  extractSeedAsBriefing,
  type SeedInput,
  type ExtractedBriefing,
  type StoredSeed,
} from "@/lib/wizard-services/content-extractor.service"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// INPUT VALIDATION (I6)
// ============================================================================

/**
 * Validação zod no boundary da action — garante que o cliente não envia
 * tipos inesperados (ex.: URL inválida em link/youtube, textos vazios em
 * theme/insight). Mensagens em pt-BR pra exibir na UI.
 */
const seedInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("link"), url: z.string().url() }),
  z.object({
    type: z.literal("youtube"),
    url: z
      .string()
      .url()
      .refine(
        (u) => /youtube\.com|youtu\.be/.test(u),
        "URL deve ser do YouTube"
      ),
  }),
  z.object({ type: z.literal("keyword"), value: z.string().trim().min(2).max(200) }),
  z.object({ type: z.literal("theme"), value: z.string().trim().min(5).max(500) }),
  z.object({ type: z.literal("insight"), value: z.string().trim().min(5).max(2000) }),
])

const updateBriefingSchema = z.object({
  wizardId: z.number(),
  seedId: z.string(),
  briefing: z.string().trim().max(20000),
})

// ============================================================================
// EXTRACT + APPEND (C2 + C3 + C7 + I5 + I6)
// ============================================================================

/**
 * Extrai briefing de uma seed (link/youtube/keyword/theme/insight) e persiste
 * no array `content_wizards.seeds` do wizard informado. Ação explícita do
 * usuário — UI dispara via botão "Extrair".
 *
 * Guards:
 *  - Clerk auth (rejeita sem userId)
 *  - Ownership check no SELECT e no UPDATE (defense in depth — I5)
 *  - Zod input validation (I6)
 *  - DB column check defensivo (C7)
 *
 * Concorrência (C2): usa `jsonb || jsonb` atômico em SQL. Dois clicks
 * simultâneos no mesmo wizard resultam nos dois seeds anexados em ordem
 * não-determinística, mas sem perda (antes do fix, read-modify-write
 * descartava uma das escritas).
 */
export async function extractSeedAction(
  wizardId: number,
  seed: SeedInput
): Promise<ActionResult<ExtractedBriefing>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  // I6: valida input no boundary
  const parsed = seedInputSchema.safeParse(seed)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input inválido",
    }
  }
  const validatedSeed = parsed.data

  // C7: ownership + DB error handling defensivo (pega coluna seeds ausente)
  let wiz
  try {
    ;[wiz] = await db
      .select({
        id: contentWizards.id,
        userId: contentWizards.userId,
      })
      .from(contentWizards)
      .where(
        and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
      )
      .limit(1)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[wizard/extract-seed] DB error", { wizardId, err: msg })
    if (
      msg.includes("seeds") &&
      (msg.includes("column") || msg.includes("does not exist"))
    ) {
      return {
        success: false,
        error: "Migration de seeds não aplicada — contate suporte.",
      }
    }
    return { success: false, error: "Erro interno ao buscar wizard." }
  }

  if (!wiz) return { success: false, error: "wizard not found" }

  // Extrair
  const extraction = await extractSeedAsBriefing(validatedSeed)
  if (!extraction.success) {
    // Observability: log estruturado antes do early return
    console.error("[wizard/extract-seed] extraction failed", {
      wizardId,
      userId,
      seedType: validatedSeed.type,
      error: extraction.error,
    })
    return { success: false, error: extraction.error }
  }

  // Montar nova seed (C3: id estável via uuid)
  const storedValue =
    "value" in extraction.data.seed
      ? extraction.data.seed.value
      : extraction.data.seed.url
  const newSeed: StoredSeed = {
    id: crypto.randomUUID(),
    type: extraction.data.seed.type,
    value: storedValue,
    briefing: extraction.data.briefing,
    metadata: extraction.data.metadata,
    extractedAt: new Date().toISOString(),
  }

  // C2: append atômico via `jsonb || jsonb`. Sem read-modify-write → sem
  // race condition entre clicks concorrentes no mesmo wizard.
  // I5: ownership também no UPDATE (defense in depth caso a sessão mude
  // entre o SELECT e o UPDATE).
  const newSeedJson = JSON.stringify(newSeed)
  await db
    .update(contentWizards)
    .set({
      seeds: sql`COALESCE(${contentWizards.seeds}, '[]'::jsonb) || ${newSeedJson}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )

  console.log("[wizard/extract-seed]", {
    wizardId,
    seedId: newSeed.id,
    type: newSeed.type,
    briefingLen: newSeed.briefing?.length ?? 0,
    source: extraction.data.metadata.source,
  })

  return { success: true, data: extraction.data }
}

// ============================================================================
// REMOVE BY STABLE ID (C3 + I5)
// ============================================================================

/**
 * Remove seed por `id` estável (uuid gerado no extract). Substitui a remoção
 * por índice — índices no array JSONB não são estáveis em concorrência nem
 * sobrevivem a reordenações.
 *
 * UI deve passar `seed.id` (StoredSeed.id). Agente de UI ajustou o
 * `seed-input-panel.tsx` pra chamar `removeSeedAction(wizardId, seed.id)`.
 */
export async function removeSeedAction(
  wizardId: number,
  seedId: string
): Promise<ActionResult<{ removed: string }>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const [wiz] = await db
    .select({ seeds: contentWizards.seeds })
    .from(contentWizards)
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )
    .limit(1)

  if (!wiz) return { success: false, error: "wizard not found" }

  const seeds: StoredSeed[] = Array.isArray(wiz.seeds)
    ? (wiz.seeds as StoredSeed[])
    : []
  const filtered = seeds.filter((s) => s.id !== seedId)

  if (filtered.length === seeds.length) {
    return { success: false, error: "seed não encontrada" }
  }

  // I5: ownership no UPDATE também.
  await db
    .update(contentWizards)
    .set({ seeds: filtered, updatedAt: new Date() })
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )

  console.log("[wizard/remove-seed]", {
    wizardId,
    seedId,
    remaining: filtered.length,
  })

  return { success: true, data: { removed: seedId } }
}

// ============================================================================
// UPDATE BRIEFING (I1)
// ============================================================================

/**
 * Persiste edição manual de briefing de uma seed. UI já permitia editar no
 * preview local, mas não havia ação server-side — edits ficavam em memória
 * e eram perdidos quando o wizard recarregava. Agora a UI pode chamar
 * explicitamente pra gravar.
 */
export async function updateSeedBriefingAction(
  wizardId: number,
  seedId: string,
  briefing: string
): Promise<ActionResult<{ updated: string }>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const parsed = updateBriefingSchema.safeParse({ wizardId, seedId, briefing })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Input inválido",
    }
  }

  const [wiz] = await db
    .select({ seeds: contentWizards.seeds })
    .from(contentWizards)
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )
    .limit(1)

  if (!wiz) return { success: false, error: "wizard not found" }

  const seeds: StoredSeed[] = Array.isArray(wiz.seeds)
    ? (wiz.seeds as StoredSeed[])
    : []

  const updatedSeeds = seeds.map((s) =>
    s.id === seedId ? { ...s, briefing: briefing.trim() } : s
  )

  // Se nada mudou, a seed não existia.
  if (JSON.stringify(updatedSeeds) === JSON.stringify(seeds)) {
    return { success: false, error: "seed não encontrada" }
  }

  await db
    .update(contentWizards)
    .set({ seeds: updatedSeeds, updatedAt: new Date() })
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )

  console.log("[wizard/update-seed-briefing]", {
    wizardId,
    seedId,
    briefingLen: briefing.trim().length,
  })

  return { success: true, data: { updated: seedId } }
}
