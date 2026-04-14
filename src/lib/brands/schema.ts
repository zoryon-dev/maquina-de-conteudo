import { z } from "zod"

// Validação do JSONB `brands.config`. Árvore completa do brandkit.
// Toda edição via UI passa por aqui antes de gravar snapshot em brand_versions.
// Campos string/array aceitam vazios para permitir edição incremental.

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case lowercase")

export const brandIdentityValueSchema = z.object({
  name: z.string(),
  description: z.string(),
})

export const brandIdentitySchema = z.object({
  mission: z.string().default(""),
  vision: z.string().default(""),
  values: z.array(brandIdentityValueSchema).default([]),
  positioning: z.string().default(""),
  antiPositioning: z.string().default(""),
  beliefs: z.array(z.string()).default([]),
})

export const brandVoiceAtributosSchema = z.object({
  direto: z.number().min(0).max(100).default(50),
  acessivel: z.number().min(0).max(100).default(50),
  firme: z.number().min(0).max(100).default(50),
  humano: z.number().min(0).max(100).default(50),
  tecnico: z.number().min(0).max(100).default(50),
})

export const brandVoiceSchema = z.object({
  // atributos: valores oficiais do voice guide
  atributos: brandVoiceAtributosSchema.default({
    direto: 80,
    acessivel: 70,
    firme: 75,
    humano: 75,
    tecnico: 30,
  }),
  tom: z.string().default(""),
  vocabulario: z
    .object({
      use: z.array(z.string()).default([]),
      avoid: z.array(z.string()).default([]),
    })
    .default({ use: [], avoid: [] }),
  crencasCombatidas: z.array(z.string()).default([]),
  antiPatterns: z.array(z.string()).default([]),
})

export const brandVisualSchema = z.object({
  tokens: z
    .object({
      colors: z.record(z.string(), z.string()).default({}),
      fonts: z.record(z.string(), z.string()).default({}),
      spacing: z.record(z.string(), z.string()).default({}),
      shadows: z.record(z.string(), z.string()).default({}),
    })
    .default({ colors: {}, fonts: {}, spacing: {}, shadows: {} }),
  logoUrl: z.string().default(""),
  logoAltUrl: z.string().default(""),
})

export const brandAvatarSchema = z.object({
  nome: z.string(),
  faixaSalarial: z.string().default(""),
  estagio: z.string().default(""),
  dores: z.array(z.string()).default([]),
  busca: z.string().default(""),
  onde: z.string().default(""),
  transformacao: z.string().default(""),
})

export const brandAudienceSchema = z.object({
  avatares: z.array(brandAvatarSchema).default([]),
  antiAvatar: z.string().default(""),
})

export const brandSetorSchema = z.object({
  id: z.string(),
  nome: z.string(),
  inclui: z.array(z.string()).default([]),
  problemas: z.array(z.string()).default([]),
  metricas: z.array(z.string()).default([]),
  precoSetup: z.string().default(""),
  precoRecorrencia: z.string().default(""),
})

export const brandCourseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  preco: z.string().default(""),
  modulos: z.array(z.string()).default([]),
  prerequisitos: z.array(z.string()).default([]),
  targetAvatar: z.string().default(""),
})

export const brandOfferSchema = z.object({
  setores: z.array(brandSetorSchema).default([]),
  pricing: z
    .object({
      setupMin: z.number().default(0),
      setupMax: z.number().default(0),
      recMin: z.number().default(0),
      recMax: z.number().default(0),
    })
    .refine((p) => p.setupMin <= p.setupMax, {
      message: "setupMin must be <= setupMax",
    })
    .refine((p) => p.recMin <= p.recMax, {
      message: "recMin must be <= recMax",
    })
    .default({ setupMin: 0, setupMax: 0, recMin: 0, recMax: 0 }),
  courses: z.array(brandCourseSchema).default([]),
})

export const brandJourneyServicoStageSchema = z.object({
  stage: z.string(),
  canal: z.string().default(""),
  acao: z.string().default(""),
  saidas: z.array(z.string()).default([]),
})

export const brandJourneyEducacaoStageSchema = z.object({
  stage: z.string(),
  canal: z.string().default(""),
  acao: z.string().default(""),
})

export const brandJourneySchema = z.object({
  motorServicos: z.array(brandJourneyServicoStageSchema).default([]),
  motorEducacao: z.array(brandJourneyEducacaoStageSchema).default([]),
})

export const brandContentPilarSchema = z.object({
  nome: z.string(),
  objetivo: z.string().default(""),
  logica: z.string().default(""),
  exemplos: z.array(z.string()).default([]),
  cta: z.string().default(""),
  papelFunil: z.string().default(""),
})

export const brandContentCanalSchema = z.object({
  nome: z.string(),
  frequencia: z.string().default(""),
  tom: z.string().default(""),
  prioridade: z.number().default(0),
})

export const brandContentSchema = z.object({
  pilares: z.array(brandContentPilarSchema).default([]),
  canais: z.array(brandContentCanalSchema).default([]),
  /**
   * Template de instrução CTA para o slide BD_CTA.
   * Quando definido, sobrescreve o default "Comenta a palavra abaixo:".
   * Ex: "Comenta uma palavra-chave relacionada ao tema".
   */
  ctaInstructionTemplate: z.string().optional(),
})

export const brandMetaSchema = z.object({
  seedVersion: z.string().default("1.0.0"),
  seededAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  qaEnabled: z.boolean().default(true),
})

export const brandConfigSchema = z.object({
  identity: brandIdentitySchema.default(() => brandIdentitySchema.parse({})),
  voice: brandVoiceSchema.default(() => brandVoiceSchema.parse({})),
  visual: brandVisualSchema.default(() => brandVisualSchema.parse({})),
  audience: brandAudienceSchema.default(() => brandAudienceSchema.parse({})),
  offer: brandOfferSchema.default(() => brandOfferSchema.parse({})),
  journey: brandJourneySchema.default(() => brandJourneySchema.parse({})),
  content: brandContentSchema.default(() => brandContentSchema.parse({})),
  meta: brandMetaSchema.default(() => brandMetaSchema.parse({})),
})

export type BrandConfig = z.infer<typeof brandConfigSchema>
export type BrandIdentity = z.infer<typeof brandIdentitySchema>
export type BrandVoice = z.infer<typeof brandVoiceSchema>
export type BrandVisual = z.infer<typeof brandVisualSchema>
export type BrandAudience = z.infer<typeof brandAudienceSchema>
export type BrandAvatar = z.infer<typeof brandAvatarSchema>
export type BrandOffer = z.infer<typeof brandOfferSchema>
export type BrandSetor = z.infer<typeof brandSetorSchema>
export type BrandCourse = z.infer<typeof brandCourseSchema>
export type BrandJourney = z.infer<typeof brandJourneySchema>
export type BrandJourneyServicoStage = z.infer<typeof brandJourneyServicoStageSchema>
export type BrandJourneyEducacaoStage = z.infer<typeof brandJourneyEducacaoStageSchema>
export type BrandContent = z.infer<typeof brandContentSchema>
export type BrandContentPilar = z.infer<typeof brandContentPilarSchema>
export type BrandContentCanal = z.infer<typeof brandContentCanalSchema>
export type BrandMeta = z.infer<typeof brandMetaSchema>

export function createEmptyBrandConfig(): BrandConfig {
  return brandConfigSchema.parse({})
}

export function validateBrandConfig(input: unknown): BrandConfig {
  return brandConfigSchema.parse(input)
}

export function safeValidateBrandConfig(input: unknown) {
  return brandConfigSchema.safeParse(input)
}
