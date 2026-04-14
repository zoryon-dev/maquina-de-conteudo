"use client"

/**
 * BD Wizard — state machine cliente do wizard BrandsDecoded v4.
 *
 * Hidrata store com props do SSR (wizardId, seeds persistidas, resultado
 * gerado anterior se houver) e roteia para o step atual.
 *
 * Se já existe `initialGeneratedResult`, pula direto pro Step 4 (result).
 * Caso contrário, começa no Step 1 (seed input).
 */

import { useEffect } from "react"
import { useBdWizardStore, type Seed, type BdStep } from "@/stores/bd-wizard-store"
import { BdStep1Seed } from "./steps/bd-step-1-seed"
import { BdStep2Review } from "./steps/bd-step-2-review"
import { BdStep3Generate } from "./steps/bd-step-3-generate"
import { BdStep4Result } from "./steps/bd-step-4-result"
import type { BrandsDecodedResult } from "@/lib/ai/motors/brandsdecoded-v4/orchestrator"

export function BdWizard({
  wizardId,
  initialSeeds,
  initialGeneratedResult,
}: {
  wizardId: number
  initialSeeds: Seed[]
  initialGeneratedResult?: BrandsDecodedResult
}) {
  const currentStep = useBdWizardStore((s) => s.currentStep)
  const setWizardId = useBdWizardStore((s) => s.setWizardId)
  const setSeeds = useBdWizardStore((s) => s.setSeeds)
  const setGeneratedResult = useBdWizardStore((s) => s.setGeneratedResult)
  const goToStep = useBdWizardStore((s) => s.goToStep)

  useEffect(() => {
    setWizardId(wizardId)
    setSeeds(initialSeeds)
    if (initialGeneratedResult) {
      setGeneratedResult(initialGeneratedResult)
      goToStep(4)
    }
    // Hidratação é one-shot por mount — props não mudam no runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardId])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <StepIndicator current={currentStep} />
      <div className="mt-6">
        {currentStep === 1 && <BdStep1Seed />}
        {currentStep === 2 && <BdStep2Review />}
        {currentStep === 3 && <BdStep3Generate />}
        {currentStep === 4 && <BdStep4Result />}
      </div>
    </div>
  )
}

const STEP_LABELS: Array<{ step: BdStep; label: string }> = [
  { step: 1, label: "Seed" },
  { step: 2, label: "Review" },
  { step: 3, label: "Gerar" },
  { step: 4, label: "Resultado" },
]

function StepIndicator({ current }: { current: BdStep }) {
  return (
    <ol className="flex gap-2 text-sm" aria-label="Progresso do wizard">
      {STEP_LABELS.map(({ step, label }) => (
        <li
          key={step}
          className={`px-3 py-1 rounded-full transition ${
            step === current
              ? "bg-primary text-black"
              : "bg-white/5 text-white/70"
          }`}
          aria-current={step === current ? "step" : undefined}
        >
          {step}. {label}
        </li>
      ))}
    </ol>
  )
}
