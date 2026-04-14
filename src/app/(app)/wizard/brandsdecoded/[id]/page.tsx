import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { contentWizards } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { isFeatureEnabled } from "@/lib/features"
import { BdWizard } from "./components/bd-wizard"
import type { Seed } from "@/stores/bd-wizard-store"
import type { BrandsDecodedResult } from "@/lib/ai/motors/brandsdecoded-v4/orchestrator"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!isFeatureEnabled("NEXT_PUBLIC_FEATURE_BD_WIZARD_V1")) {
    notFound()
  }

  const { userId } = await auth()
  if (!userId) notFound()

  const { id } = await params
  const wizardId = Number(id)
  if (!Number.isFinite(wizardId)) notFound()

  const [wiz] = await db
    .select()
    .from(contentWizards)
    .where(
      and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, userId))
    )
    .limit(1)

  if (!wiz || wiz.motor !== "brandsdecoded_v4") notFound()

  const rawSeeds = wiz.seeds
  const seeds: Seed[] = Array.isArray(rawSeeds) ? (rawSeeds as Seed[]) : []
  const generatedResult =
    (wiz.generatedContent as BrandsDecodedResult | null) ?? undefined

  return (
    <BdWizard
      wizardId={wizardId}
      initialSeeds={seeds}
      initialGeneratedResult={generatedResult}
    />
  )
}
