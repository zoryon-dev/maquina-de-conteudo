"use client"

/**
 * BD Step 3 — Geração com progresso.
 *
 * Dispara `generateBdContentAction` ao montar. Exibe pseudo-progress (timer
 * cíclico por stage) — o server action é síncrono e não streama, então o
 * progress é cosmético. Streaming real fica para iteração futura (ver
 * "Decisões deferidas" no spec).
 *
 * On success: armazena resultado + avança pro Step 4. On error: mostra mensagem
 * e oferece "Voltar" para re-editar seeds.
 */

import { useEffect, useRef, useState } from "react"
import { useBdWizardStore } from "@/stores/bd-wizard-store"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateBdContentAction } from "../../actions/bd-wizard-actions"

const STAGES = [
  "triagem",
  "headlines",
  "espinha",
  "copy-blocks",
  "legenda",
] as const

export function BdStep3Generate() {
  const wizardId = useBdWizardStore((s) => s.wizardId)
  const tribalAngle = useBdWizardStore((s) => s.tribalAngle)
  const setGeneratedResult = useBdWizardStore((s) => s.setGeneratedResult)
  const goToStep = useBdWizardStore((s) => s.goToStep)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Trava pra evitar duplo dispatch em React Strict Mode (effect roda 2x em dev).
  const didDispatch = useRef(false)

  useEffect(() => {
    if (!wizardId) return
    if (didDispatch.current) return
    didDispatch.current = true

    let cancelled = false

    // Pseudo-progress (cada stage ~3-8s real, cycle 4s). setState é
    // chamado DENTRO do interval callback (external system boundary),
    // não direto no corpo do effect.
    const timer = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s))
    }, 4000)

    const TIMEOUT_MS = 120_000

    ;(async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo limite excedido (2 min). Tente novamente.")), TIMEOUT_MS)
      )

      try {
        const r = await Promise.race([
          generateBdContentAction(wizardId, tribalAngle),
          timeoutPromise,
        ])
        clearInterval(timer)
        if (cancelled) return
        if (!r.success) {
          setError(r.error)
          return
        }
        setGeneratedResult(r.data)
        goToStep(4)
      } catch (e) {
        clearInterval(timer)
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha inesperada na geração.")
        }
      }
    })()

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [wizardId, tribalAngle, setGeneratedResult, goToStep])

  return (
    <div className="space-y-6 py-12 text-center">
      {!error && (
        <Loader2
          className="h-10 w-10 animate-spin mx-auto text-primary"
          aria-hidden
        />
      )}
      <div>
        <h2 className="text-lg font-semibold">
          {error ? "Falha na geração" : "Gerando conteúdo..."}
        </h2>
        {!error && (
          <p className="text-sm text-white/70 mt-1">
            Stage atual:{" "}
            <code className="rounded bg-white/5 px-2 py-0.5">
              {STAGES[stage]}
            </code>
          </p>
        )}
      </div>

      <ol className="inline-flex flex-col gap-1 text-sm text-left">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={i <= stage ? "text-primary" : "text-white/40"}
          >
            {i <= stage ? "✓" : "·"} {s}
          </li>
        ))}
      </ol>

      {error && (
        <div className="space-y-3">
          <div className="text-sm text-destructive" role="alert">
            Erro: {error}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              didDispatch.current = false
              goToStep(2)
            }}
          >
            Voltar para revisão
          </Button>
        </div>
      )}
    </div>
  )
}
