// Schemas e tipos extraídos de `brand.ts` para poderem ser importados por
// client components e testes. O `brand.ts` tem `"use server"` e o Next.js
// proíbe exports não-async nesses arquivos — por isso tudo que não é async
// vive aqui.

import { z, type ZodIssue } from "zod"
import {
  brandIdentitySchema,
  brandVoiceSchema,
  brandVisualSchema,
  brandAudienceSchema,
  brandOfferSchema,
  brandJourneySchema,
  brandContentSchema,
  brandMetaSchema,
  type BrandConfig,
} from "@/lib/brands/schema"

export type BrandActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; issues?: ZodIssue[] }

export const SECTION_SCHEMAS = {
  identity: brandIdentitySchema,
  voice: brandVoiceSchema,
  visual: brandVisualSchema,
  audience: brandAudienceSchema,
  offer: brandOfferSchema,
  journey: brandJourneySchema,
  content: brandContentSchema,
  meta: brandMetaSchema,
} satisfies Record<keyof BrandConfig, z.ZodType>

export type BrandSection = keyof typeof SECTION_SCHEMAS

export type BrandForEdit = {
  id: number
  slug: string
  name: string
  isDefault: boolean
  updatedAt: string
  config: BrandConfig
}

export type BrandVersionRow = {
  id: number
  message: string | null
  createdBy: string | null
  createdAt: string
}
