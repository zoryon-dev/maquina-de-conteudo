"use client"

/**
 * BD Step 4 — Headline picker + save.
 *
 * Grid de 10 headlines (5 IC + 5 NM). Clicar em outra headline dispara
 * `selectHeadlineAndRebuildAction` que re-roda o pipeline (espinha → blocks
 * → legenda) com `forcedHeadlineId`.
 *
 * "Salvar" chama `saveBdCarouselAction` e redireciona para o Visual Studio.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useBdWizardStore } from "@/stores/bd-wizard-store"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"
import {
  selectHeadlineAndRebuildAction,
  saveBdCarouselAction,
} from "../../actions/bd-wizard-actions"

export function BdStep4Result() {
  const router = useRouter()
  const wizardId = useBdWizardStore((s) => s.wizardId)
  const generatedResult = useBdWizardStore((s) => s.generatedResult)
  const selectedHeadlineId = useBdWizardStore((s) => s.selectedHeadlineId)
  const setSelectedHeadlineId = useBdWizardStore(
    (s) => s.setSelectedHeadlineId
  )
  const setGeneratedResult = useBdWizardStore((s) => s.setGeneratedResult)
  const [rebuilding, startRebuild] = useTransition()
  const [saving, startSave] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!wizardId || !generatedResult) return null
  const current =
    selectedHeadlineId ?? generatedResult.selectedHeadline.id

  const handlePick = (id: number) => {
    if (id === current) return
    setError(null)
    startRebuild(async () => {
      const r = await selectHeadlineAndRebuildAction(wizardId, id)
      if (!r.success) {
        setError(r.error)
        return
      }
      setGeneratedResult(r.data)
      setSelectedHeadlineId(id)
    })
  }

  const handleSave = () => {
    setError(null)
    startSave(async () => {
      const r = await saveBdCarouselAction(wizardId)
      if (!r.success) {
        setError(r.error)
        return
      }
      router.push(`/studio/${r.data.libraryItemId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Escolha a headline</h2>
        <p className="text-sm text-white/70">
          10 opções (5 IC + 5 NM). Trocar re-roda apenas espinha/blocks/legenda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {generatedResult.headlines.map((h) => {
          const active = h.id === current
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => handlePick(h.id)}
              disabled={rebuilding || saving}
              aria-pressed={active}
              className={`text-left border rounded-lg p-3 transition disabled:opacity-50 ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  #{h.id} · {h.format}
                  {h.patternId ? ` — ${h.patternId}` : ""}
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="mt-2 text-sm">{h.text}</div>
            </button>
          )
        })}
      </div>

      {rebuilding && (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Recalculando espinha/blocks/legenda...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || rebuilding}>
          {saving ? "Salvando..." : "Ir pro Visual Studio"}
        </Button>
      </div>
    </div>
  )
}
