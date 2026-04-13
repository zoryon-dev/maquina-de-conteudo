"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import {
  getBrandBySlug,
  getBrandConfig,
  listBrandVersions,
  restoreBrandVersion,
  updateBrandConfig,
} from "@/lib/brands/queries"
import {
  brandConfigSchema,
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
import { isAppError, getErrorMessage } from "@/lib/errors"
import { isAdmin } from "@/lib/auth/admin"
import { z, type ZodIssue } from "zod"

const ZORYON_SLUG = "zoryon"

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

export async function getBrandForEditAction(): Promise<
  BrandActionResult<BrandForEdit>
> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Não autenticado" }
    if (!isAdmin(userId)) return { success: false, error: "Forbidden" }

    const brand = await getBrandBySlug(ZORYON_SLUG)
    if (!brand) {
      return {
        success: false,
        error: "Marca Zoryon não encontrada — rode o seed primeiro",
      }
    }

    const config = await getBrandConfig(brand.id)
    if (!config) {
      return { success: false, error: "Config da marca está inválido no DB" }
    }

    return {
      success: true,
      data: {
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        isDefault: brand.isDefault,
        updatedAt: brand.updatedAt.toISOString(),
        config,
      },
    }
  } catch (err) {
    console.error("[brand-action:getBrandForEditAction]", err)
    const code = isAppError(err) ? err.code : undefined
    return { success: false, error: getErrorMessage(err), ...(code ? { code } : {}) }
  }
}

export async function updateBrandSectionAction<S extends BrandSection>(
  brandId: number,
  section: S,
  value: BrandConfig[S],
  message?: string
): Promise<BrandActionResult<{ updatedAt: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Não autenticado" }
    if (!isAdmin(userId)) return { success: false, error: "Forbidden" }

    const sectionSchema = SECTION_SCHEMAS[section]
    const parsed = sectionSchema.safeParse(value)
    if (!parsed.success) {
      return {
        success: false,
        error: `Dados inválidos: ${parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")}`,
        code: "VALIDATION_ERROR",
        issues: parsed.error.issues,
      }
    }

    const current = await getBrandConfig(brandId)
    if (!current) {
      return { success: false, error: "Marca não encontrada", code: "NOT_FOUND" }
    }

    const combined = brandConfigSchema.safeParse({
      ...current,
      [section]: parsed.data,
    })
    if (!combined.success) {
      return {
        success: false,
        error: "Config combinado inválido",
        code: "VALIDATION_ERROR",
        issues: combined.error.issues,
      }
    }

    const updated = await updateBrandConfig(brandId, {
      config: combined.data,
      message: message ?? `update via UI (${section})`,
      updatedByUserId: userId,
    })

    revalidatePath("/settings")
    revalidatePath("/", "layout") // tokens visuais podem ter mudado

    return { success: true, data: { updatedAt: updated.updatedAt.toISOString() } }
  } catch (err) {
    console.error("[brand-action:updateBrandSectionAction]", { brandId, section }, err)
    const code = isAppError(err) ? err.code : undefined
    return { success: false, error: getErrorMessage(err), ...(code ? { code } : {}) }
  }
}

export type BrandVersionRow = {
  id: number
  message: string | null
  createdBy: string | null
  createdAt: string
}

export async function listBrandVersionsAction(
  brandId: number
): Promise<BrandActionResult<BrandVersionRow[]>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Não autenticado" }
    if (!isAdmin(userId)) return { success: false, error: "Forbidden" }

    const versions = await listBrandVersions(brandId)
    return {
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        message: v.message,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    }
  } catch (err) {
    console.error("[brand-action:listBrandVersionsAction]", { brandId }, err)
    const code = isAppError(err) ? err.code : undefined
    return { success: false, error: getErrorMessage(err), ...(code ? { code } : {}) }
  }
}

export async function restoreBrandVersionAction(
  brandId: number,
  versionId: number
): Promise<BrandActionResult<{ updatedAt: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Não autenticado" }
    if (!isAdmin(userId)) return { success: false, error: "Forbidden" }

    const updated = await restoreBrandVersion(brandId, versionId, userId)
    revalidatePath("/settings")
    revalidatePath("/", "layout")
    return { success: true, data: { updatedAt: updated.updatedAt.toISOString() } }
  } catch (err) {
    console.error(
      "[brand-action:restoreBrandVersionAction]",
      { brandId, versionId },
      err
    )
    const code = isAppError(err) ? err.code : undefined
    return { success: false, error: getErrorMessage(err), ...(code ? { code } : {}) }
  }
}
