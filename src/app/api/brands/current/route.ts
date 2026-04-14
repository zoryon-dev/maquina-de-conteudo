/**
 * GET /api/brands/current
 *
 * Retorna o BrandConfig da brand ativa para o user autenticado.
 * Usado pelo Studio no client-side para injetar tokens no preview.
 *
 * Response shape: `{ brand: BrandConfig | null }`
 * - `brand: null` → user autenticado mas sem brand ativa (fallback hardcoded)
 * - 401 → user não autenticado
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getBrandConfig, resolveBrandIdForUser } from "@/lib/brands/queries"
import { toAppError, getErrorMessage } from "@/lib/errors"

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { brand: null, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const brandId = await resolveBrandIdForUser(userId)
    if (brandId == null) {
      return NextResponse.json({ brand: null })
    }

    const brand = await getBrandConfig(brandId)
    return NextResponse.json({ brand })
  } catch (error) {
    const appError = toAppError(error, "BRAND_CURRENT_FAILED")
    console.error("[api/brands/current]", appError.code, appError.message)
    return NextResponse.json(
      { brand: null, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    )
  }
}
