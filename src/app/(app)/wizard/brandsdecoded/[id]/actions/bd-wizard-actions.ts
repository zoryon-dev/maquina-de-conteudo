"use server"

/**
 * Server Actions do wizard BrandsDecoded v4.
 *
 * - generateBdContentAction: roda pipeline completo (triagem → headlines →
 *   espinha → blocks → legenda). Consolida seeds, resolve brand, busca RAG
 *   (auto-inject + user), chama orchestrator e persiste `generatedContent`.
 * - selectHeadlineAndRebuildAction: re-roda downstream com `forcedHeadlineId`.
 *   Hoje re-executa o pipeline completo (cache de triagem/headlines fica como
 *   otimização futura quando orchestrator expor essas APIs).
 * - saveBdCarouselAction: converte resultado BD em GeneratedContent via
 *   `bdResultToGeneratedContent` e insere em library_items. Retorna
 *   `libraryItemId` para redirect ao Visual Studio.
 *
 * Todas validam auth (Clerk) e ownership (userId === wizard.userId). Erros
 * retornam `ActionResult` discriminated union (sem exceções propagadas).
 */

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { contentWizards, libraryItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  generateWithBrandsDecoded,
  type BrandsDecodedResult,
} from "@/lib/ai/motors/brandsdecoded-v4/orchestrator"
import { generateWizardRagContextWithBrand } from "@/lib/wizard-services/rag.service"
import { resolveBrandIdForUser, getBrandConfig } from "@/lib/brands/queries"
import { brandConfigToPromptVariables } from "@/lib/brands/injection"
import { consolidateSeeds } from "@/lib/wizard-services/content-extractor.service"
import { bdResultToGeneratedContent } from "@/lib/wizard-services/bd-adapter"
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import type { TribalAngleId } from "@/lib/ai/shared/tribal-angles"
import type { StoredSeed } from "@/lib/wizard-services/content-extractor.service"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

async function loadWizardForUser(wizardId: number, userId: string) {
  const [wiz] = await db
    .select()
    .from(contentWizards)
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )
    .limit(1)
  return wiz ?? null
}

function toStoredSeeds(value: unknown): StoredSeed[] {
  if (!Array.isArray(value)) return []
  return value as StoredSeed[]
}

export async function generateBdContentAction(
  wizardId: number,
  tribalAngle?: TribalAngleId,
  numberOfSlides?: number
): Promise<ActionResult<BrandsDecodedResult>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const wiz = await loadWizardForUser(wizardId, userId)
  if (!wiz) return { success: false, error: "wizard not found" }

  try {
    const seeds = toStoredSeeds(wiz.seeds)
    if (seeds.length === 0) {
      return { success: false, error: "adicione pelo menos uma seed" }
    }

    const briefing = consolidateSeeds(seeds)

    const brandId = await resolveBrandIdForUser(userId)
    const brand = brandId ? await getBrandConfig(brandId) : null
    const brandPromptVariables = brand
      ? brandConfigToPromptVariables(brand)
      : undefined

    // RAG unificado (brand auto-inject + user)
    const rag = await generateWizardRagContextWithBrand(
      userId,
      briefing,
      { mode: "auto" },
      brandId ?? undefined
    )

    if (!rag.success) {
      console.warn("[bd-wizard] RAG falhou, gerando sem contexto:", { wizardId, error: rag.error })
    }

    const ragContext =
      rag.success && rag.data?.context ? rag.data.context : ""
    const briefingWithContext = ragContext
      ? `${ragContext}\n\n---\n\n${briefing}`
      : briefing

    const result = await generateWithBrandsDecoded({
      briefing: briefingWithContext,
      brandPromptVariables,
      tribalAngle,
      autoSelectHeadline: true,
      numberOfSlides,
    })

    await db
      .update(contentWizards)
      .set({
        generatedContent: result,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId))

    console.log("[bd-wizard] gen done", {
      wizardId,
      headlines: result.headlines.length,
      blocks: result.blocks.length,
      ragChunks: rag.success && rag.data ? rag.data.chunksIncluded : 0,
    })

    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[bd-wizard] gen failed:", msg)
    return { success: false, error: msg }
  }
}

export async function selectHeadlineAndRebuildAction(
  wizardId: number,
  headlineId: number
): Promise<ActionResult<BrandsDecodedResult>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const wiz = await loadWizardForUser(wizardId, userId)
  if (!wiz) return { success: false, error: "wizard not found" }

  const prev = wiz.generatedContent as BrandsDecodedResult | undefined
  if (!prev?.headlines) {
    return { success: false, error: "nenhuma geração anterior" }
  }

  const headline = prev.headlines.find((h) => h.id === headlineId)
  if (!headline) return { success: false, error: "headline não encontrada" }

  try {
    // Re-rodar pipeline com forcedHeadlineId.
    // (otimização futura: cache triagem+headlines e re-rodar só downstream)
    const seeds = toStoredSeeds(wiz.seeds)
    const briefing = consolidateSeeds(seeds)

    const brandId = await resolveBrandIdForUser(userId)
    const brand = brandId ? await getBrandConfig(brandId) : null
    const brandPromptVariables = brand
      ? brandConfigToPromptVariables(brand)
      : undefined

    const result = await generateWithBrandsDecoded({
      briefing,
      brandPromptVariables,
      autoSelectHeadline: false,
      forcedHeadlineId: headlineId,
    })

    await db
      .update(contentWizards)
      .set({ generatedContent: result, updatedAt: new Date() })
      .where(eq(contentWizards.id, wizardId))

    return { success: true, data: result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[bd-wizard] selectHeadlineAndRebuild falhou:", { wizardId, headlineId, err: msg })
    return { success: false, error: msg }
  }
}

export async function saveBdCarouselAction(
  wizardId: number
): Promise<ActionResult<{ libraryItemId: number }>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  const wiz = await loadWizardForUser(wizardId, userId)
  if (!wiz) return { success: false, error: "wizard not found" }

  const result = wiz.generatedContent as BrandsDecodedResult | undefined
  if (!result) return { success: false, error: "nenhum conteúdo gerado" }

  try {
    const brandId = await resolveBrandIdForUser(userId)
    const generated = bdResultToGeneratedContent(result, {
      model: wiz.model ?? DEFAULT_TEXT_MODEL,
      ragUsed: true,
    })

    const [item] = await db
      .insert(libraryItems)
      .values({
        userId,
        brandId,
        type: "carousel",
        status: "draft",
        title: result.selectedHeadline.text.slice(0, 120),
        content: JSON.stringify(generated),
        metadata: JSON.stringify({
          motor: "brandsdecoded_v4",
          wizardId,
          headlineId: result.selectedHeadline.id,
        }),
      })
      .returning({ id: libraryItems.id })

    if (!item) {
      return { success: false, error: "falha ao persistir library item" }
    }

    try {
      await db
        .update(contentWizards)
        .set({ libraryItemId: item.id, updatedAt: new Date() })
        .where(eq(contentWizards.id, wizardId))
    } catch (linkErr) {
      console.error("[bd-wizard] linkback wizard falhou (não-bloqueante):", { wizardId, libraryItemId: item.id })
    }

    return { success: true, data: { libraryItemId: item.id } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[bd-wizard] saveBdCarousel falhou:", { wizardId, userId, err: msg })
    return { success: false, error: "Falha ao salvar o carrossel. Tente novamente." }
  }
}
