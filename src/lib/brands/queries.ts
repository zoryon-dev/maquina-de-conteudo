import "server-only"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/db"
import { brands, brandVersions, type Brand, type BrandVersion } from "@/db/schema"
import {
  brandConfigSchema,
  safeValidateBrandConfig,
  type BrandConfig,
} from "./schema"

// ============================================================================
// BRAND QUERIES
// ============================================================================
// Camada de acesso a dados para marcas. Todas as leituras/escritas passam por
// aqui. Atualizações criam snapshot automático em brand_versions.
// ============================================================================

export async function getBrandById(brandId: number): Promise<Brand | null> {
  const [row] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1)
  return row ?? null
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const [row] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1)
  return row ?? null
}

export async function getDefaultBrand(): Promise<Brand | null> {
  const [row] = await db
    .select()
    .from(brands)
    .where(eq(brands.isDefault, true))
    .limit(1)
  return row ?? null
}

export async function listBrands(): Promise<Brand[]> {
  return db.select().from(brands).orderBy(desc(brands.isDefault), brands.name)
}

export async function getBrandConfig(brandId: number): Promise<BrandConfig | null> {
  const brand = await getBrandById(brandId)
  if (!brand) return null
  const result = safeValidateBrandConfig(brand.config)
  if (!result.success) {
    console.error("[brands] invalid config in DB for brand", brandId, result.error)
    return null
  }
  return result.data
}

// ============================================================================
// MUTATIONS
// ============================================================================

type CreateBrandInput = {
  slug: string
  name: string
  config: unknown
  ownerUserId?: string | null
  isDefault?: boolean
}

export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  const config = brandConfigSchema.parse(input.config)
  const [created] = await db
    .insert(brands)
    .values({
      slug: input.slug,
      name: input.name,
      config,
      ownerUserId: input.ownerUserId ?? null,
      isDefault: input.isDefault ?? false,
    })
    .returning()
  return created
}

type UpdateBrandInput = {
  config: unknown
  message?: string
  updatedByUserId?: string | null
}

export async function updateBrandConfig(
  brandId: number,
  input: UpdateBrandInput
): Promise<Brand> {
  const config = brandConfigSchema.parse(input.config)

  await db.insert(brandVersions).values({
    brandId,
    config,
    message: input.message ?? null,
    createdBy: input.updatedByUserId ?? null,
  })

  const [updated] = await db
    .update(brands)
    .set({ config, updatedAt: new Date() })
    .where(eq(brands.id, brandId))
    .returning()

  return updated
}

export async function upsertBrandBySlug(input: CreateBrandInput): Promise<Brand> {
  const existing = await getBrandBySlug(input.slug)
  if (existing) {
    return updateBrandConfig(existing.id, {
      config: input.config,
      message: "seed upsert",
      updatedByUserId: input.ownerUserId ?? null,
    })
  }
  return createBrand(input)
}

// ============================================================================
// VERSIONING
// ============================================================================

export async function listBrandVersions(brandId: number): Promise<BrandVersion[]> {
  return db
    .select()
    .from(brandVersions)
    .where(eq(brandVersions.brandId, brandId))
    .orderBy(desc(brandVersions.createdAt))
}

export async function getBrandVersion(versionId: number): Promise<BrandVersion | null> {
  const [row] = await db
    .select()
    .from(brandVersions)
    .where(eq(brandVersions.id, versionId))
    .limit(1)
  return row ?? null
}

export async function restoreBrandVersion(
  brandId: number,
  versionId: number,
  userId?: string | null
): Promise<Brand> {
  const version = await getBrandVersion(versionId)
  if (!version || version.brandId !== brandId) {
    throw new Error("Brand version not found or does not belong to this brand")
  }
  return updateBrandConfig(brandId, {
    config: version.config,
    message: `restore from version ${versionId}`,
    updatedByUserId: userId ?? null,
  })
}
