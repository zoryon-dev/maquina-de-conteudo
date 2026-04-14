// NOTE: Este módulo é usado tanto em React Server Components/Server Actions
// quanto em scripts Node (ex: scripts/seed-zoryon-brand.ts). Por isso NÃO
// importamos "server-only" aqui — neon-http já é server-side por natureza
// (depende de DATABASE_URL). Não importe deste arquivo em código client.
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { brands, brandVersions, type Brand, type BrandVersion } from "@/db/schema"
import { ConfigError, NotFoundError } from "@/lib/errors"
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

/**
 * Resolve o brandId default para um usuário.
 *
 * Hoje: ignora userId e retorna a brand marcada como `isDefault=true` (Zoryon).
 * Futuro multi-brand: pode levar em conta ownership/permissions do user.
 *
 * Retorna `null` quando não há brand default configurada — caller decide
 * se prossegue sem brand ou falha.
 */
export async function resolveBrandIdForUser(_userId: string): Promise<number | null> {
  const [row] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.isDefault, true))
    .limit(1)
  return row?.id ?? null
}

export async function listBrands(): Promise<Brand[]> {
  return db.select().from(brands).orderBy(desc(brands.isDefault), brands.name)
}

/**
 * Lê e valida o BrandConfig persistido. Retorna `null` apenas se a brand não
 * existir; se a brand existe mas o JSON está corrompido/incompatível com o
 * schema, lança ConfigError (com `details.issues` do Zod) — silenciar essa
 * falha esconderia bugs de migration/seed.
 */
export async function getBrandConfig(brandId: number): Promise<BrandConfig | null> {
  const brand = await getBrandById(brandId)
  if (!brand) return null
  const result = safeValidateBrandConfig(brand.config)
  if (!result.success) {
    throw new ConfigError(
      `Brand ${brandId} has invalid config in DB`,
      { brandId, issues: result.error.issues }
    )
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

  // Atomicidade: o driver neon-http NÃO suporta transações interativas
  // (db.transaction lança erro), mas suporta `db.batch([...])` que executa
  // todas as queries numa única round-trip transacional. Se qualquer step
  // falhar, nenhum efeito é persistido.
  const [, updatedRows] = await db.batch([
    db.insert(brandVersions).values({
      brandId,
      config,
      message: input.message ?? null,
      createdBy: input.updatedByUserId ?? null,
    }),
    db
      .update(brands)
      .set({ config, updatedAt: new Date() })
      .where(eq(brands.id, brandId))
      .returning(),
  ])

  const updated = updatedRows[0]
  if (!updated) {
    throw new NotFoundError("Brand", String(brandId))
  }
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
    throw new NotFoundError("BrandVersion", `${versionId} (brand=${brandId})`)
  }
  return updateBrandConfig(brandId, {
    config: version.config,
    message: `restore from version ${versionId}`,
    updatedByUserId: userId ?? null,
  })
}
