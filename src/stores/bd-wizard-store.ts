/**
 * BD Wizard Zustand Store
 *
 * State machine do wizard BrandsDecoded v4 (rota isolada `/wizard/brandsdecoded/[id]`).
 * Guarda: wizardId, currentStep (1-4), seeds, briefing consolidado, tribal angle
 * opcional, resultado BD gerado e headline selecionada.
 *
 * `consolidatedBriefing` é recomputado automaticamente toda vez que `setSeeds`
 * é chamado — fonte única de verdade pra Step 2 (review) e Step 3 (generate).
 */
import { create } from "zustand"
import type { SeedType } from "@/lib/wizard-services/content-extractor.service"
import { consolidateSeeds } from "@/lib/wizard-services/content-extractor.service"
import type { TribalAngleId } from "@/lib/ai/shared/tribal-angles"
import type { BrandsDecodedResult } from "@/lib/ai/motors/brandsdecoded-v4/orchestrator"

export type Seed = {
  type: SeedType
  value: string
  briefing?: string
  metadata?: Record<string, unknown>
  extractedAt?: string
}

export type BdStep = 1 | 2 | 3 | 4

type BdWizardState = {
  wizardId: number | null
  currentStep: BdStep
  seeds: Seed[]
  consolidatedBriefing: string
  tribalAngle?: TribalAngleId
  generatedResult?: BrandsDecodedResult
  selectedHeadlineId?: number

  setWizardId: (id: number) => void
  goToStep: (step: BdStep) => void
  setSeeds: (seeds: Seed[]) => void
  setTribalAngle: (a?: TribalAngleId) => void
  setGeneratedResult: (r: BrandsDecodedResult) => void
  setSelectedHeadlineId: (id: number) => void
  reset: () => void
}

const initialState: Pick<
  BdWizardState,
  | "wizardId"
  | "currentStep"
  | "seeds"
  | "consolidatedBriefing"
  | "tribalAngle"
  | "generatedResult"
  | "selectedHeadlineId"
> = {
  wizardId: null,
  currentStep: 1,
  seeds: [],
  consolidatedBriefing: "",
  tribalAngle: undefined,
  generatedResult: undefined,
  selectedHeadlineId: undefined,
}

export const useBdWizardStore = create<BdWizardState>((set) => ({
  ...initialState,
  setWizardId: (wizardId) => set({ wizardId }),
  goToStep: (currentStep) => set({ currentStep }),
  setSeeds: (seeds) =>
    set({ seeds, consolidatedBriefing: consolidateSeeds(seeds) }),
  setTribalAngle: (tribalAngle) => set({ tribalAngle }),
  setGeneratedResult: (generatedResult) => set({ generatedResult }),
  setSelectedHeadlineId: (selectedHeadlineId) => set({ selectedHeadlineId }),
  reset: () => set(initialState),
}))
