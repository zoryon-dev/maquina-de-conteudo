"use client"

/**
 * Wizard Entry (Step 0)
 *
 * Primeira tela do wizard unificado. Usuário escolhe:
 *  1. Tipo de conteúdo (text / image / carousel / schedule)
 *  2. Motor (apenas quando carousel) — tribal_v4 ou brandsdecoded_v4
 *
 * BD só habilita com feature flag NEXT_PUBLIC_FEATURE_BD_WIZARD_V1. Flag OFF
 * mantém a UI acessível mas a opção BD fica desabilitada com tooltip.
 *
 * Submit cria wizard via server action e redireciona:
 *  - Tribal: /wizard/[id]
 *  - BD:     /wizard/brandsdecoded/[id]
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { isFeatureEnabled } from "@/lib/features"
import { createNewWizardAction } from "../actions/create-wizard"

type Type = "text" | "image" | "carousel" | "schedule"
type Motor = "tribal_v4" | "brandsdecoded_v4"

const CONTENT_TYPES: { v: Type; label: string }[] = [
  { v: "text", label: "Texto" },
  { v: "image", label: "Imagem" },
  { v: "carousel", label: "Carrossel" },
  { v: "schedule", label: "Agendamento" },
]

export function WizardEntry() {
  const router = useRouter()
  const [type, setType] = useState<Type | null>(null)
  const [motor, setMotor] = useState<Motor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const bdEnabled = isFeatureEnabled("NEXT_PUBLIC_FEATURE_BD_WIZARD_V1")

  const needsMotor = type === "carousel"
  const canSubmit = type !== null && (!needsMotor || motor !== null)

  const handleSubmit = () => {
    if (!type) return
    const resolvedMotor: Motor = needsMotor
      ? (motor ?? "tribal_v4")
      : "tribal_v4"
    setError(null)
    startTransition(async () => {
      const r = await createNewWizardAction({ type, motor: resolvedMotor })
      if (!r.success) {
        setError(r.error)
        return
      }
      router.push(r.data.redirectPath)
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Novo conteúdo</h1>
        <p className="text-sm text-white/70 mt-1">
          Escolha o tipo de peça e, para carrossel, a metodologia.
        </p>
      </header>

      <section>
        <Label className="text-base font-semibold">O que quer criar?</Label>
        <RadioGroup
          value={type ?? ""}
          onValueChange={(v) => {
            setType(v as Type)
            if (v !== "carousel") setMotor(null)
          }}
          className="grid grid-cols-2 gap-3 mt-3"
        >
          {CONTENT_TYPES.map((o) => (
            <label
              key={o.v}
              className="flex items-center gap-2 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/5"
            >
              <RadioGroupItem value={o.v} />
              <span>{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </section>

      {needsMotor && (
        <section>
          <Label className="text-base font-semibold">Qual metodologia?</Label>
          <RadioGroup
            value={motor ?? ""}
            onValueChange={(v) => setMotor(v as Motor)}
            className="grid gap-3 mt-3"
          >
            <label className="flex items-start gap-2 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/5">
              <RadioGroupItem value="tribal_v4" className="mt-1" />
              <div>
                <div className="font-medium">Tribal v4</div>
                <div className="text-sm text-white/70">
                  Narrativas em 4 ângulos tribais (herege / visionário /
                  tradutor / testemunha).
                </div>
              </div>
            </label>
            <label
              aria-disabled={!bdEnabled}
              className={`flex items-start gap-2 border border-white/10 rounded-lg p-3 ${
                bdEnabled
                  ? "cursor-pointer hover:bg-white/5"
                  : "opacity-50 cursor-not-allowed"
              }`}
              title={bdEnabled ? "" : "BD wizard em liberação gradual"}
            >
              <RadioGroupItem
                value="brandsdecoded_v4"
                className="mt-1"
                disabled={!bdEnabled}
              />
              <div>
                <div className="font-medium">BrandsDecoded v4</div>
                <div className="text-sm text-white/70">
                  Pipeline jornalístico com semente única (triagem → headlines
                  → espinha → 18 blocks → legenda).
                </div>
              </div>
            </label>
          </RadioGroup>
        </section>
      )}

      {error && (
        <div className="text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isPending ? "Criando..." : "Continuar"}
        </Button>
      </div>
    </div>
  )
}
