/**
 * Schema Zod do wizard — extraído de `route.ts` para permitir testes unitários
 * do contrato sem instanciar o handler do Next.js.
 *
 * `passthrough()` permite campos extras (ex.: novos inputs experimentais)
 * sem precisar atualizar o schema; os campos listados são validados rigorosamente.
 *
 * `superRefine` bloqueia estado ilegal no boundary: `tribalAngle` só faz
 * sentido quando `motor === "brandsdecoded_v4"`. Evita persistir opções
 * inconsistentes com o motor selecionado.
 */

import { z } from "zod"
import { wizardMotorEnum } from "@/db/schema"
import { TRIBAL_ANGLE_IDS } from "@/lib/ai/shared/tribal-angles"
import { HEADLINE_PATTERN_IDS } from "@/lib/ai/shared/headline-library"

export const motorOptionsSchema = z.object({
  tribalAngle: z.enum(TRIBAL_ANGLE_IDS).optional(),
  bdHeadlinePatterns: z.array(z.enum(HEADLINE_PATTERN_IDS)).optional(),
})

export const createWizardSchema = z
  .object({
    contentType: z.enum(["text", "image", "carousel", "video"]).optional(),
    numberOfSlides: z.number().int().min(1).max(20).optional(),
    model: z.string().optional(),
    motor: z.enum(wizardMotorEnum.enumValues).optional(),
    motorOptions: motorOptionsSchema.optional(),
    referenceUrl: z.string().optional(),
    referenceVideoUrl: z.string().optional(),
    videoDuration: z.string().optional(),
    videoIntention: z.string().optional(),
    customVideoIntention: z.string().optional(),
    theme: z.string().optional(),
    context: z.string().optional(),
    objective: z.string().optional(),
    cta: z.string().optional(),
    targetAudience: z.string().optional(),
    ragConfig: z
      .object({
        mode: z.enum(["auto", "manual", "off"]).optional(),
        threshold: z.number().optional(),
        maxChunks: z.number().optional(),
        documents: z.array(z.number()).optional(),
        collections: z.array(z.number()).optional(),
      })
      .optional(),
    negativeTerms: z.array(z.string()).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // Estado ilegal: tribalAngle só faz sentido quando motor="brandsdecoded_v4".
    // Bloqueia no boundary para evitar persistir opções inconsistentes com o motor.
    if (data.motorOptions?.tribalAngle && data.motor !== "brandsdecoded_v4") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motorOptions", "tribalAngle"],
        message: 'tribalAngle requer motor="brandsdecoded_v4"',
      })
    }
  })

export type CreateWizardInput = z.infer<typeof createWizardSchema>
