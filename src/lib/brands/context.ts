import "server-only"
import { getBrandBySlug, getBrandConfig, getDefaultBrand } from "./queries"
import { ConfigError, NotFoundError } from "@/lib/errors"
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

/**
 * Resolve a marca ativa. Se ACTIVE_BRAND_SLUG estiver setado mas apontar pra
 * uma slug inexistente, lança ConfigError em vez de cair silenciosamente no
 * default — esse fallback mascarava typos e deploys com env errado.
 */
export async function getActiveBrand(): Promise<Brand | null> {
  const slugFromEnv = process.env[ACTIVE_BRAND_SLUG_ENV]
  if (slugFromEnv) {
    const brand = await getBrandBySlug(slugFromEnv)
    if (!brand) {
      throw new ConfigError(
        `${ACTIVE_BRAND_SLUG_ENV}="${slugFromEnv}" is set but no brand with that slug exists`,
        { envVar: ACTIVE_BRAND_SLUG_ENV, slug: slugFromEnv }
      )
    }
    return brand
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
    throw new NotFoundError(
      "ActiveBrand",
      "no default brand seeded — run `scripts/seed-zoryon-brand.ts`"
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
    // getBrandConfig só retorna null se a brand sumiu entre as duas chamadas
    // (race extrema). Config inválido já lança ConfigError lá dentro.
    throw new NotFoundError("BrandConfig", brand.slug)
  }
  return { brand, config }
}
