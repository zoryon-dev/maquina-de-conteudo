"use client"

import * as React from "react"
import { Zap, Compass, Languages, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TribalAngleId } from "@/lib/ai/shared/tribal-angles"

type AngleOption = {
  value: TribalAngleId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const ANGLE_OPTIONS: AngleOption[] = [
  {
    value: "herege",
    label: "Herege",
    description: "Contradiz crença aceita do nicho",
    icon: Zap,
  },
  {
    value: "visionario",
    label: "Visionário",
    description: "Mostra futuro plausível ancorado em tendências",
    icon: Compass,
  },
  {
    value: "tradutor",
    label: "Tradutor",
    description: "Simplifica conceito técnico com analogias",
    icon: Languages,
  },
  {
    value: "testemunha",
    label: "Testemunha",
    description: "Relata transformação pessoal concreta",
    icon: User,
  },
]

type Props = {
  value?: TribalAngleId
  onChange: (angle: TribalAngleId | undefined) => void
  disabled?: boolean
  className?: string
}

export function TribalAngleSelector({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium text-white">
          Postura tribal <span className="text-white/40 font-normal">(opcional)</span>
        </label>
        <p className="text-xs text-white/60">
          Modula o tom da geração com um dos 4 ângulos de Seth Godin. Mantenha vazio para o tom jornalístico padrão do motor.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Postura tribal"
        className="grid gap-2 md:grid-cols-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          tabIndex={!value ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(undefined)}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
            !value
              ? "border-primary/60 bg-primary/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-white/40" />
          <div className="space-y-1">
            <div className="text-sm font-medium text-white">Neutro (padrão BD)</div>
            <p className="text-xs text-white/60">Tom jornalístico, sem postura tribal</p>
          </div>
        </button>
        {ANGLE_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
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
