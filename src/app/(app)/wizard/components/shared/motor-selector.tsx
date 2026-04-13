"use client"

import * as React from "react"
import { Sparkles, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"

export type WizardMotor = "tribal_v4" | "brandsdecoded_v4"

type MotorOption = {
  value: WizardMotor
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const MOTOR_OPTIONS: MotorOption[] = [
  {
    value: "tribal_v4",
    label: "Tribal v4",
    description: "4 ângulos tribais (Herege, Visionário, Tradutor, Testemunha) — pertencimento e movimento",
    icon: Sparkles,
  },
  {
    value: "brandsdecoded_v4",
    label: "BrandsDecoded v4",
    description: "Pipeline jornalístico — 8 padrões de headline, espinha dorsal e 18 blocos por carrossel",
    icon: Newspaper,
  },
]

type MotorSelectorProps = {
  value: WizardMotor
  onChange: (motor: WizardMotor) => void
  disabled?: boolean
  className?: string
}

export function MotorSelector({ value, onChange, disabled, className }: MotorSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium text-white">Motor de geração textual</label>
        <p className="text-xs text-white/60">
          Cada motor tem um estilo próprio. Você pode trocar entre wizards.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {MOTOR_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-white/60"
                )}
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-white">{opt.label}</div>
                <p className="text-xs text-white/60">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const MOTOR_OPTIONS_LIST = MOTOR_OPTIONS
