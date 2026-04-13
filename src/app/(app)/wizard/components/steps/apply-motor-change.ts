/**
 * Reducer puro: aplica troca de motor, limpando `motorOptions` específicos
 * do motor anterior para não vazar estado ilegal no payload.
 *
 * Extraído de `step-1-inputs.tsx` para permitir testes unitários sem montar
 * o componente React e para manter a UI callback livre de lógica condicional.
 */

import type { WizardMotor } from "@/db/schema"
import type { WizardFormData } from "./step-1-inputs"

export function applyMotorChange(
  data: WizardFormData,
  motor: WizardMotor
): WizardFormData {
  const next: WizardFormData = { ...data, motor }

  // `tribalAngle` e `bdHeadlinePatterns` são opções BD-only. Ao sair de BD,
  // zeramos motorOptions inteiro para não persistir config de motor inativo.
  if (motor !== "brandsdecoded_v4") {
    next.motorOptions = undefined
  }

  return next
}
