"use client"

import { useEffect, useState } from "react"
import type { BrandConfig } from "@/lib/brands/schema"

/**
 * Fetcha a brand ativa do usuário via `/api/brands/current`. O flag `alive`
 * evita setState após unmount (edge case em React Strict Mode dev).
 */
export function useBrand(): BrandConfig | undefined {
  const [brand, setBrand] = useState<BrandConfig | undefined>(undefined)

  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    ;(async () => {
      try {
        const r = await fetch("/api/brands/current", { signal: ctl.signal })
        const data = (await r.json().catch(() => null)) as
          | { brand?: BrandConfig | null; error?: string; code?: string }
          | null
        if (!alive) return
        if (!r.ok) {
          console.warn(
            "[useBrand] API returned",
            r.status,
            data?.code,
            data?.error
          )
          return
        }
        if (data?.brand) setBrand(data.brand)
      } catch (err) {
        if (alive) {
          console.error(
            "[useBrand] fetch failed, falling back to template defaults:",
            err
          )
        }
      }
    })()
    return () => {
      alive = false
      ctl.abort()
    }
  }, [])

  return brand
}
