"use client"

/**
 * BD Step 1 — Seed input + ângulo tribal opcional.
 *
 * Reusa `SeedInputPanel` (Fase 4). Adiciona select opcional de tribal angle
 * que modula o tom do pipeline (concatenado ao briefing antes de cada step
 * via composeBriefingWithTribalAngle no orchestrator).
 *
 * "Continuar" bloqueia quando seeds.length === 0 — BD exige ao menos 1 seed.
 */

import { useBdWizardStore } from "@/stores/bd-wizard-store"
import { SeedInputPanel } from "@/components/wizard/seed-input-panel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  TRIBAL_ANGLE_IDS,
  type TribalAngleId,
} from "@/lib/ai/shared/tribal-angles"

export function BdStep1Seed() {
  const wizardId = useBdWizardStore((s) => s.wizardId)
  const seeds = useBdWizardStore((s) => s.seeds)
  const setSeeds = useBdWizardStore((s) => s.setSeeds)
  const tribalAngle = useBdWizardStore((s) => s.tribalAngle)
  const setTribalAngle = useBdWizardStore((s) => s.setTribalAngle)
  const goToStep = useBdWizardStore((s) => s.goToStep)

  if (!wizardId) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Semente</h2>
        <p className="text-sm text-white/70">
          Adicione link, vídeo, tema ou insight. BD precisa de pelo menos 1
          seed para rodar o pipeline.
        </p>
      </div>

      <SeedInputPanel
        wizardId={wizardId}
        initialSeeds={seeds}
        onSeedsChange={setSeeds}
      />

      <div className="space-y-2">
        <Label htmlFor="tribal-angle">Ângulo tribal (opcional)</Label>
        <select
          id="tribal-angle"
          value={tribalAngle ?? ""}
          onChange={(e) =>
            setTribalAngle(
              (e.target.value || undefined) as TribalAngleId | undefined
            )
          }
          className="w-full rounded-md border border-white/10 bg-transparent p-2 text-sm"
        >
          <option value="">Nenhum (editorial puro)</option>
          {TRIBAL_ANGLE_IDS.map((a) => (
            <option key={a} value={a} className="bg-[#1a1a2e]">
              {a}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/40">
          Quando definido, o motor BD modula o tom (herege/visionário/tradutor
          /testemunha) mantendo a estrutura jornalística.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => goToStep(2)} disabled={seeds.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
