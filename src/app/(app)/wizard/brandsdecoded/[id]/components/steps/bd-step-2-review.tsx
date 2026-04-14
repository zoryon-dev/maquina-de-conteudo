"use client"

/**
 * BD Step 2 — Review do briefing consolidado.
 *
 * Mostra o `consolidatedBriefing` (derivado das seeds via consolidateSeeds)
 * como read-only. Edição acontece por seed no Step 1 — se no futuro houver
 * demanda pra editar o consolidado, adicionar estado dedicado no store.
 */

import { useBdWizardStore } from "@/stores/bd-wizard-store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function BdStep2Review() {
  const consolidatedBriefing = useBdWizardStore(
    (s) => s.consolidatedBriefing
  )
  const goToStep = useBdWizardStore((s) => s.goToStep)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Briefing consolidado</h2>
        <p className="text-sm text-white/70">
          Revise o texto abaixo — é o insumo final que entra no pipeline BD.
          Edição por seed acontece no Step 1.
        </p>
      </div>

      <Textarea
        value={consolidatedBriefing}
        readOnly
        rows={14}
        className="font-mono text-sm"
        aria-label="Briefing consolidado (read-only)"
      />

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => goToStep(1)}>
          Voltar
        </Button>
        <Button onClick={() => goToStep(3)}>Gerar conteúdo</Button>
      </div>
    </div>
  )
}
