import "server-only"
import { getBrandBySlug, getBrandConfig, getDefaultBrand } from "./queries"
import type { Brand } from "@/db/schema"
import type { BrandConfig } from "./schema"

// ============================================================================
// ACTIVE BRAND RESOLVER (server-side)
// ============================================================================
// Hoje: retorna sempre a marca default (single-brand).
// Futuro: pode ler de cookie, preference do usuário, ou path.
// Chame getActiveBrand() em server components/actions/routes.
// ============================================================================

export const ACTIVE_BRAND_SLUG_ENV = "ACTIVE_BRAND_SLUG"

export async function getActiveBrand(): Promise<Brand | null> {
  const slugFromEnv = process.env[ACTIVE_BRAND_SLUG_ENV]
  if (slugFromEnv) {
    const brand = await getBrandBySlug(slugFromEnv)
    if (brand) return brand
  }
  return getDefaultBrand()
}

export async function getActiveBrandConfig(): Promise<BrandConfig | null> {
  const brand = await getActiveBrand()
  if (!brand) return null
  return getBrandConfig(brand.id)
}

export async function requireActiveBrand(): Promise<Brand> {
  const brand = await getActiveBrand()
  if (!brand) {
    throw new Error(
      "No active brand found. Run `scripts/seed-zoryon-brand.ts` to seed the default brand."
    )
  }
  return brand
}

export async function requireActiveBrandConfig(): Promise<{
  brand: Brand
  config: BrandConfig
}> {
  const brand = await requireActiveBrand()
  const config = await getBrandConfig(brand.id)
  if (!config) {
    throw new Error(`Brand ${brand.slug} has invalid config in DB`)
  }
  return { brand, config }
}
